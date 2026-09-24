const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'google-sheets-config.json');
const QUEUE_FILE = path.join(DATA_DIR, 'pending-sheets-sync.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');

// Ensure data folder and queue file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(QUEUE_FILE)) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify([]));
}
if (!fs.existsSync(ADMINS_FILE)) {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify([
    { name: "Imran Khan", phone: "8500677368", role: "Super Admin", status: "ACTIVE" },
    { name: "Irfan", phone: "9848879728", role: "Store Owner", status: "ACTIVE" }
  ], null, 2));
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[SHEETS] Could not load google-sheets-config.json:', e.message);
  }
  return {
    spreadsheetId: '1V1zicwU14KNkEKdYMM0hGMYnpxvQ59S8FLye6y0MOd8',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1V1zicwU14KNkEKdYMM0hGMYnpxvQ59S8FLye6y0MOd8/edit?gid=0#gid=0',
    appsScriptUrl: '',
    enabled: true,
    totalSyncedOrders: 0,
    totalSyncedLogins: 0,
    lastSyncTime: null
  };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (e) {
    console.error('[SHEETS] Could not save config:', e);
  }
}

function loadQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    }
  } catch (e) {
    return [];
  }
  return [];
}

function saveQueue(q) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
  } catch (e) {
    console.error('[SHEETS] Could not save pending queue:', e);
  }
}

// POST payload to Apps Script Web App with redirect following (Apps Script responds with 302 redirect)
function postJson(targetUrl, payload) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const postData = JSON.stringify(payload);

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const client = parsedUrl.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        // Apps Script returns 302 Found redirect to echo endpoint which only accepts GET
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(getJson(res.headers.location));
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            resolve({ raw: body, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Google Sheets sync request timed out (15s)'));
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Queue an item for later sync if offline or unconfigured
function enqueuePending(item) {
  const queue = loadQueue();
  queue.push({
    ...item,
    queuedAt: new Date().toISOString()
  });
  saveQueue(queue);
  console.log(`[SHEETS QUEUE] Item queued (${queue.length} pending).`);
}

// Flush pending items
async function flushPendingQueue() {
  const config = loadConfig();
  if (!config.appsScriptUrl || !config.enabled) return;

  const queue = loadQueue();
  if (queue.length === 0) return;

  console.log(`[SHEETS] Attempting to flush ${queue.length} queued records to Google Sheet...`);
  const remaining = [];

  for (const item of queue) {
    try {
      await postJson(config.appsScriptUrl, item);
      if (item.type === 'order') config.totalSyncedOrders = (config.totalSyncedOrders || 0) + 1;
      if (item.type === 'login') config.totalSyncedLogins = (config.totalSyncedLogins || 0) + 1;
      config.lastSyncTime = new Date().toISOString();
      console.log(`[SHEETS] Flushed queued item: ${item.orderId || item.name}`);
    } catch (err) {
      console.warn(`[SHEETS] Failed to flush queued item, will retry later:`, err.message);
      remaining.push(item);
    }
  }

  saveQueue(remaining);
  saveConfig(config);
}

// Public Methods
async function syncOrder(orderData) {
  const config = loadConfig();
  const payload = {
    type: 'order',
    orderId: orderData.orderId,
    customerName: orderData.customerName || 'Walk-in Customer',
    customerPhone: orderData.customerPhone || '',
    date: orderData.date || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    items: orderData.items,
    total: orderData.total,
    paymentMethod: orderData.paymentMethod || 'UPI',
    utr: orderData.utr || '',
    status: orderData.status || 'PAID',
    instructions: orderData.instructions || 'None'
  };

  if (!config.appsScriptUrl || !config.enabled) {
    enqueuePending(payload);
    return { success: false, queued: true, reason: 'Google Sheets Apps Script URL not configured yet. Queued for auto-sync.' };
  }

  try {
    const res = await postJson(config.appsScriptUrl, payload);
    config.totalSyncedOrders = (config.totalSyncedOrders || 0) + 1;
    config.lastSyncTime = new Date().toISOString();
    saveConfig(config);
    console.log(`[SHEETS SYNC] ✅ Order ${orderData.orderId} streamed into Google Sheet!`);
    return { success: true, response: res };
  } catch (err) {
    console.warn(`[SHEETS SYNC] Network issue streaming order ${orderData.orderId}:`, err.message);
    enqueuePending(payload);
    return { success: false, queued: true, error: err.message };
  }
}

async function syncLogin(customerData) {
  const config = loadConfig();
  const payload = {
    type: 'login',
    name: customerData.name || customerData.customerName || 'Customer',
    phone: customerData.phone || customerData.customerPhone || '',
    date: customerData.date || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    source: customerData.source || 'Rock N Rolls Mobile Web App'
  };

  if (!config.appsScriptUrl || !config.enabled) {
    enqueuePending(payload);
    return { success: false, queued: true, reason: 'Google Sheets Apps Script URL not configured yet. Queued for auto-sync.' };
  }

  try {
    const res = await postJson(config.appsScriptUrl, payload);
    config.totalSyncedLogins = (config.totalSyncedLogins || 0) + 1;
    config.lastSyncTime = new Date().toISOString();
    saveConfig(config);
    console.log(`[SHEETS SYNC] ✅ Customer login (${payload.name}) streamed into Google Sheet!`);
    return { success: true, response: res };
  } catch (err) {
    console.warn(`[SHEETS SYNC] Network issue streaming customer login:`, err.message);
    enqueuePending(payload);
    return { success: false, queued: true, error: err.message };
  }
}

const MENU_STOCK_FILE = path.join(DATA_DIR, 'menu-stock.json');
const MENU_PRICES_FILE = path.join(DATA_DIR, 'menu-prices.json');

let cachedMenuStock = null;
let cachedMenuPrices = null;
let lastMenuStockFetch = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

function loadLocalMenuStock() {
  try {
    if (fs.existsSync(MENU_STOCK_FILE)) {
      return JSON.parse(fs.readFileSync(MENU_STOCK_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[SHEETS] Could not load menu-stock.json:', e.message);
  }
  return {};
}

function saveLocalMenuStock(stockMap) {
  try {
    fs.writeFileSync(MENU_STOCK_FILE, JSON.stringify(stockMap, null, 2));
    cachedMenuStock = stockMap;
    lastMenuStockFetch = Date.now();
  } catch (e) {
    console.error('[SHEETS] Could not save menu-stock.json:', e.message);
  }
}

function loadLocalMenuPrices() {
  try {
    if (fs.existsSync(MENU_PRICES_FILE)) {
      return JSON.parse(fs.readFileSync(MENU_PRICES_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[SHEETS] Could not load menu-prices.json:', e.message);
  }
  return {};
}

function saveLocalMenuPrices(priceMap) {
  try {
    fs.writeFileSync(MENU_PRICES_FILE, JSON.stringify(priceMap, null, 2));
    cachedMenuPrices = priceMap;
  } catch (e) {
    console.error('[SHEETS] Could not save menu-prices.json:', e.message);
  }
}

function fetchGoogleSheetMenuGViz(sheetId) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Menu`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonStart = data.indexOf('{');
          const jsonEnd = data.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = data.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);
            resolve(parsed);
          } else {
            reject(new Error('Invalid GViz response format'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function getLiveMenuStock(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedMenuStock && cachedMenuPrices && (now - lastMenuStockFetch < CACHE_TTL_MS)) {
    return { 
      stock: cachedMenuStock, 
      prices: cachedMenuPrices, 
      source: 'cache', 
      cached: true, 
      lastUpdated: new Date(lastMenuStockFetch).toISOString() 
    };
  }

  const config = loadConfig();
  const localStock = loadLocalMenuStock();
  const localPrices = loadLocalMenuPrices();
  const sheetId = config.spreadsheetId || '1V1zicwU14KNkEKdYMM0hGMYnpxvQ59S8FLye6y0MOd8';

  try {
    const gvizData = await fetchGoogleSheetMenuGViz(sheetId);
    if (gvizData && gvizData.table && Array.isArray(gvizData.table.rows) && gvizData.table.rows.length > 0) {
      const stockMap = { ...localStock };
      const priceMap = { ...localPrices };
      let itemsFound = 0;

      for (const row of gvizData.table.rows) {
        if (!row.c || !Array.isArray(row.c)) continue;
        const rawId = row.c[0] ? (row.c[0].v !== undefined ? row.c[0].v : row.c[0].f) : null;
        if (!rawId) continue;
        const itemId = String(rawId).trim();
        if (itemId.toLowerCase() === 'item id') continue;

        // Extract Price (Column D, index 3)
        const priceCell = row.c[3] ? (row.c[3].v !== undefined ? row.c[3].v : row.c[3].f) : undefined;
        if (priceCell !== undefined && priceCell !== null) {
          const parsedPrice = parseFloat(String(priceCell).replace(/[^0-9.]/g, ''));
          if (!isNaN(parsedPrice) && parsedPrice >= 0) {
            priceMap[itemId] = parsedPrice;
          }
        }

        // Extract In Stock status (Column E, index 4)
        const cellVal = row.c[4] ? (row.c[4].v !== undefined ? row.c[4].v : row.c[4].f) : undefined;
        let inStock = true;
        if (cellVal !== undefined && cellVal !== null) {
          if (typeof cellVal === 'boolean') {
            inStock = cellVal;
          } else {
            const s = String(cellVal).trim().toUpperCase();
            if (s === 'FALSE' || s === '0' || s === 'NO' || s === 'OUT OF STOCK') {
              inStock = false;
            } else {
              inStock = true;
            }
          }
        }
        stockMap[itemId] = inStock;
        itemsFound++;
      }

      if (itemsFound > 0) {
        cachedMenuStock = stockMap;
        cachedMenuPrices = priceMap;
        lastMenuStockFetch = now;
        saveLocalMenuStock(stockMap);
        saveLocalMenuPrices(priceMap);
        return { 
          stock: stockMap, 
          prices: priceMap,
          source: 'google_sheets', 
          cached: false, 
          itemCount: itemsFound, 
          lastUpdated: new Date(now).toISOString() 
        };
      }
    }
  } catch (err) {
    console.warn('[SHEETS] Live stock/price fetch from Google Sheets notice:', err.message);
  }

  cachedMenuStock = localStock;
  cachedMenuPrices = localPrices;
  lastMenuStockFetch = now;
  return { 
    stock: localStock, 
    prices: localPrices,
    source: 'local_fallback', 
    cached: false, 
    itemCount: Object.keys(localStock).length, 
    lastUpdated: new Date(now).toISOString() 
  };
}

function updateLocalStockItem(itemId, inStock) {
  const stock = loadLocalMenuStock();
  stock[itemId] = Boolean(inStock);
  saveLocalMenuStock(stock);
  return stock;
}

function updateLocalPriceItem(itemId, price) {
  const prices = loadLocalMenuPrices();
  const p = parseFloat(price);
  if (!isNaN(p) && p >= 0) {
    prices[itemId] = p;
    saveLocalMenuPrices(prices);
  }
  return prices;
}

function getStatus() {
  const config = loadConfig();
  const queue = loadQueue();
  return {
    ...config,
    isConfigured: Boolean(config.appsScriptUrl && config.appsScriptUrl.trim().length > 10),
    pendingQueueCount: queue.length
  };
}

function updateConfig(newFields) {
  const config = loadConfig();
  if (newFields.appsScriptUrl !== undefined) {
    config.appsScriptUrl = (newFields.appsScriptUrl || '').trim();
  }
  if (newFields.enabled !== undefined) {
    config.enabled = Boolean(newFields.enabled);
  }
  saveConfig(config);

  // If a URL was provided, attempt to flush pending items immediately
  if (config.appsScriptUrl) {
    flushPendingQueue().catch(err => {
      console.warn('[SHEETS] Queue flush attempt notice:', err.message);
    });
  }

  return getStatus();
}

function loadLocalAdmins() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('[SHEETS] Could not load admins.json:', e.message);
  }
  return [
    { name: "Imran Khan", phone: "8500677368", role: "Super Admin", status: "ACTIVE" },
    { name: "Irfan", phone: "9848879728", role: "Store Owner", status: "ACTIVE" }
  ];
}

function saveLocalAdmins(admins) {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
  } catch (e) {
    console.error('[SHEETS] Could not save admins.json:', e);
  }
}

function getJson(targetUrl) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const req = client.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(getJson(res.headers.location));
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body, statusCode: res.statusCode });
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('GET request timed out (10s)'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

function fetchGoogleSheetAdminsGViz(sheetId) {
  return new Promise((resolve, reject) => {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Admins`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonStart = data.indexOf('{');
          const jsonEnd = data.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = data.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);
            resolve(parsed);
          } else {
            reject(new Error('Invalid GViz response format'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

let cachedAdmins = null;
let lastAdminsFetch = 0;
const ADMINS_CACHE_TTL = 15000; // 15 seconds cache

async function getLiveAdmins(forceRefresh = false) {
  const now = Date.now();
  const localAdmins = loadLocalAdmins();

  if (!forceRefresh && cachedAdmins && (now - lastAdminsFetch < ADMINS_CACHE_TTL)) {
    return {
      admins: cachedAdmins,
      source: 'memory_cache',
      cached: true
    };
  }

  const config = loadConfig();
  const sheetId = config.spreadsheetId || '1V1zicwU14KNkEKdYMM0hGMYnpxvQ59S8FLye6y0MOd8';

  // 1. Try reading directly from Google Sheet 'Admins' tab via GViz
  try {
    const gvizData = await fetchGoogleSheetAdminsGViz(sheetId);
    if (gvizData && gvizData.table && Array.isArray(gvizData.table.rows) && gvizData.table.rows.length > 0) {
      const colA = gvizData.table.cols && gvizData.table.cols[0] ? (gvizData.table.cols[0].label || '') : '';
      // If colA is 'Order ID', GViz redirected to default tab because 'Admins' does not exist yet
      if (!colA.toLowerCase().includes('order')) {
        const parsedAdmins = [];
        for (const row of gvizData.table.rows) {
          if (!row.c || !Array.isArray(row.c)) continue;
          const nameVal = row.c[0] ? (row.c[0].v !== undefined ? row.c[0].v : row.c[0].f) : '';
          const phoneVal = row.c[1] ? (row.c[1].v !== undefined ? row.c[1].v : row.c[1].f) : '';
          const roleVal = row.c[2] ? (row.c[2].v !== undefined ? row.c[2].v : row.c[2].f) : 'Kitchen Admin';
          const statusVal = row.c[3] ? (row.c[3].v !== undefined ? row.c[3].v : row.c[3].f) : 'ACTIVE';

          const cleanPhone = String(phoneVal || '').replace(/[^0-9]/g, '').slice(-10);
          const cleanName = String(nameVal || '').trim();
          const cleanRole = String(roleVal || 'Kitchen Admin').trim();
          const cleanStatus = String(statusVal || 'ACTIVE').trim().toUpperCase();

          if (cleanName.toLowerCase() === 'admin name' || cleanName.toLowerCase() === 'name') continue;

          if (cleanPhone.length >= 10 && cleanStatus !== 'INACTIVE') {
            parsedAdmins.push({
              name: cleanName || 'Admin',
              phone: cleanPhone,
              role: cleanRole,
              status: cleanStatus
            });
          }
        }

        if (parsedAdmins.length > 0) {
          cachedAdmins = parsedAdmins;
          lastAdminsFetch = now;
          saveLocalAdmins(parsedAdmins);
          return {
            admins: parsedAdmins,
            source: 'google_sheets_gviz',
            cached: false
          };
        }
      }
    }
  } catch (err) {
    // Admins tab might not be published or available via GViz yet
  }

  // 2. Try Apps Script Web App get_admins endpoint
  if (config.enabled && config.appsScriptUrl) {
    try {
      const fetchUrl = config.appsScriptUrl + (config.appsScriptUrl.includes('?') ? '&' : '?') + 'action=get_admins';
      const parsed = await getJson(fetchUrl);
      if (parsed && Array.isArray(parsed.admins) && parsed.admins.length > 0) {
        cachedAdmins = parsed.admins;
        lastAdminsFetch = now;
        saveLocalAdmins(parsed.admins);
        return {
          admins: parsed.admins,
          source: 'google_sheets_script',
          cached: false
        };
      }
    } catch (err) {
      console.warn('[SHEETS] Apps Script admins fetch notice:', err.message);
    }
  }

  cachedAdmins = localAdmins;
  lastAdminsFetch = now;
  return { admins: localAdmins, source: 'local_fallback', cached: false };
}

function isAuthorizedAdmin(phone) {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length < 10) return false;

  const admins = cachedAdmins || loadLocalAdmins();
  return admins.some(a => {
    const aPhone = (a.phone || '').replace(/[^0-9]/g, '').slice(-10);
    return aPhone === cleanPhone && (a.status !== 'INACTIVE');
  });
}

async function addAdmin(adminData) {
  const cleanName = (adminData.name || '').trim();
  const cleanPhone = (adminData.phone || '').replace(/[^0-9]/g, '').slice(-10);
  const role = (adminData.role || 'Kitchen Admin').trim();
  const status = (adminData.status || 'ACTIVE').trim().toUpperCase();

  if (!cleanName || cleanPhone.length < 10) {
    return { success: false, error: 'Valid Name and 10-digit Mobile Number required.' };
  }

  const admins = loadLocalAdmins();
  const existingIdx = admins.findIndex(a => {
    const aPhone = (a.phone || '').replace(/[^0-9]/g, '').slice(-10);
    return aPhone === cleanPhone;
  });

  const newAdmin = { name: cleanName, phone: cleanPhone, role, status };

  if (existingIdx >= 0) {
    admins[existingIdx] = newAdmin;
  } else {
    admins.push(newAdmin);
  }

  saveLocalAdmins(admins);
  cachedAdmins = admins;
  lastAdminsFetch = Date.now();

  let sheetsSync = { synced: false, error: null };

  // Try streaming into Google Sheets Apps Script if available
  const config = loadConfig();
  if (config.enabled && config.appsScriptUrl) {
    try {
      const syncRes = await postJson(config.appsScriptUrl, {
        type: 'add_admin',
        name: cleanName,
        phone: cleanPhone,
        role,
        status
      });

      if (syncRes && syncRes.success) {
        sheetsSync = { synced: true, message: syncRes.message || 'Row appended to Google Sheet' };
        console.log(`[SHEETS SYNC] ✅ Admin ${cleanName} (+91 ${cleanPhone}) appended to Google Sheet Admins tab!`);
      } else {
        // Fallback to GET action=add_admin
        try {
          const fallbackUrl = `${config.appsScriptUrl}${config.appsScriptUrl.includes('?') ? '&' : '?'}action=add_admin&name=${encodeURIComponent(cleanName)}&phone=${encodeURIComponent(cleanPhone)}&role=${encodeURIComponent(role)}&status=${encodeURIComponent(status)}`;
          const getRes = await getJson(fallbackUrl);
          if (getRes && getRes.success) {
            sheetsSync = { synced: true, message: getRes.message || 'Row appended via GET' };
            console.log(`[SHEETS SYNC] ✅ Admin ${cleanName} appended to Google Sheet via GET fallback!`);
          } else {
            sheetsSync = { synced: false, error: (syncRes && syncRes.error) || 'Apps Script needs deployment update' };
          }
        } catch (e) {
          sheetsSync = { synced: false, error: (syncRes && syncRes.error) || e.message };
        }
      }
    } catch (err) {
      console.warn('[SHEETS] Admin sync to Google Sheets notice:', err.message);
      sheetsSync = { synced: false, error: err.message };
    }
  }

  return { success: true, admin: newAdmin, totalAdmins: admins.length, sheetsSync };
}

module.exports = {
  syncOrder,
  syncLogin,
  getStatus,
  updateConfig,
  flushPendingQueue,
  loadConfig,
  getLiveMenuStock,
  saveLocalMenuStock,
  loadLocalMenuStock,
  updateLocalStockItem,
  loadLocalMenuPrices,
  saveLocalMenuPrices,
  updateLocalPriceItem,
  getLiveAdmins,
  loadLocalAdmins,
  saveLocalAdmins,
  isAuthorizedAdmin,
  addAdmin
};

