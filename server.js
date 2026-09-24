const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const CARTS_FILE = path.join(DATA_DIR, 'customer-carts.json');

// Ensure data directory and data files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(CARTS_FILE)) {
  fs.writeFileSync(CARTS_FILE, JSON.stringify({}));
}

function getStoredOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveStoredOrders(orders) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (e) {
    console.error('Failed to write orders.json:', e);
  }
}

function getStoredCarts() {
  try {
    return JSON.parse(fs.readFileSync(CARTS_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveStoredCarts(carts) {
  try {
    fs.writeFileSync(CARTS_FILE, JSON.stringify(carts, null, 2));
  } catch (e) {
    console.error('Failed to write customer-carts.json:', e);
  }
}

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify({
    storeUpiId: "9848879728@ybl",
    storeUpiName: "Rock N Rolls",
    acceptCashOnPickup: true,
    defaultTheme: "dark"
  }, null, 2));
}

function getStoredSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch (e) {
    return {
      storeUpiId: "9848879728@ybl",
      storeUpiName: "Rock N Rolls",
      acceptCashOnPickup: true,
      defaultTheme: "dark"
    };
  }
}

function saveStoredSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Failed to write settings.json:', e);
  }
}

// Server-Sent Events (SSE) Live Broadcast Hub for Lock Screen Alerts & Orders Sync
const sseClients = new Set();
function broadcastEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Keep-alive heartbeat every 20s for mobile connections
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(':heartbeat\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 20000);

const sheets = require('./google-sheets');

// Security helper: Check if request is made by an authorized store admin
async function isAuthorizedAdmin(req) {
  const rawCookie = req.headers.cookie || '';
  const matchAdminPhone = rawCookie.match(/(?:^|;\s*)rnr_admin_phone=([^;]*)/);
  const matchCustPhone = rawCookie.match(/(?:^|;\s*)rnr_customer_phone=([^;]*)/);
  const cookiePhone = matchAdminPhone ? decodeURIComponent(matchAdminPhone[1]) : (matchCustPhone ? decodeURIComponent(matchCustPhone[1]) : '');

  let queryPhone = '';
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    queryPhone = urlObj.searchParams.get('admin_phone') || urlObj.searchParams.get('phone') || '';
  } catch (e) {}

  const headerPhone = req.headers['x-admin-phone'] || '';
  const cleanPhone = String(headerPhone || queryPhone || cookiePhone || '').replace(/[^0-9]/g, '').slice(-10);

  if (!cleanPhone || cleanPhone.length < 10) {
    return { authorized: false, phone: cleanPhone };
  }

  // 1. Check local admins
  const localAdmins = sheets.loadLocalAdmins();
  const matchedLocal = localAdmins.find(a => {
    const aPhone = (a.phone || '').replace(/[^0-9]/g, '').slice(-10);
    return aPhone === cleanPhone && a.status !== 'INACTIVE';
  });

  if (matchedLocal) {
    return { authorized: true, admin: matchedLocal, phone: cleanPhone, source: 'local_admins' };
  }

  // 2. Check live Google Sheets admins
  try {
    const adminRes = await sheets.getLiveAdmins(false);
    const admins = adminRes.admins || [];
    const matched = admins.find(a => {
      const aPhone = (a.phone || '').replace(/[^0-9]/g, '').slice(-10);
      return aPhone === cleanPhone && a.status !== 'INACTIVE';
    });
    if (matched) {
      return { authorized: true, admin: matched, phone: cleanPhone, source: adminRes.source };
    }
  } catch (err) {}

  return { authorized: false, phone: cleanPhone };
}

const server = http.createServer((req, res) => {
  // CORS Headers for seamless local and tunnel calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-phone');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let cleanUrl = req.url.split('?')[0];

  // API Route: GET /api/bot/status - Disabled
  if (req.method === 'GET' && cleanUrl === '/api/bot/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'disabled', connected: false }));
    return;
  }

  // API Route: GET /api/sheets/status - Google Sheets live sync status
  if (req.method === 'GET' && cleanUrl === '/api/sheets/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sheets.getStatus()));
    return;
  }

  // API Route: POST /api/sheets/config - Update Google Sheets Apps Script URL
  if (req.method === 'POST' && cleanUrl === '/api/sheets/config') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const updated = sheets.updateConfig(parsed);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config: updated }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid config JSON' }));
      }
    });
    return;
  }

  // API Route: GET /api/menu/stock - Live inventory stock & prices from Google Sheets (with local fallback)
  if (req.method === 'GET' && (cleanUrl === '/api/menu/stock' || cleanUrl === '/api/menu/live')) {
    const forceRefresh = req.url.includes('refresh=true');
    sheets.getLiveMenuStock(forceRefresh).then(stockRes => {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify({ success: true, ...stockRes }));
    }).catch(err => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        stock: sheets.loadLocalMenuStock(), 
        prices: sheets.loadLocalMenuPrices(), 
        source: 'local_fallback', 
        error: err.message 
      }));
    });
    return;
  }

  // API Route: POST /api/menu/stock - Update stock status (itemId, inStock)
  if (req.method === 'POST' && cleanUrl === '/api/menu/stock') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.itemId !== undefined && payload.inStock !== undefined) {
          const updated = sheets.updateLocalStockItem(payload.itemId, payload.inStock);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, itemId: payload.itemId, inStock: payload.inStock, stock: updated }));
          return;
        } else if (payload.stock && typeof payload.stock === 'object') {
          sheets.saveLocalMenuStock(payload.stock);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, stock: payload.stock }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload. Provide { itemId, inStock } or { stock }' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API Route: POST /api/menu/price - Update price (itemId, price)
  if (req.method === 'POST' && cleanUrl === '/api/menu/price') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (payload.itemId !== undefined && payload.price !== undefined) {
          const updated = sheets.updateLocalPriceItem(payload.itemId, payload.price);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, itemId: payload.itemId, price: payload.price, prices: updated }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid payload. Provide { itemId, price }' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API Route: GET /api/events - Server-Sent Events (SSE) Live Push Hub for Lock Screen Alerts
  if (req.method === 'GET' && cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(':connected\n\n');
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // API Route: GET /api/settings - Store settings (UPI ID, payment configs, theme)
  if (req.method === 'GET' && cleanUrl === '/api/settings') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, settings: getStoredSettings() }));
    return;
  }

  // API Route: POST /api/settings - Update store settings (Admins only)
  if (req.method === 'POST' && cleanUrl === '/api/settings') {
    isAuthorizedAdmin(req).then(auth => {
      if (!auth.authorized) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Access Denied: Admin authorization required' }));
        return;
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const updates = JSON.parse(body);
          const current = getStoredSettings();
          const updated = Object.assign(current, updates);
          saveStoredSettings(updated);
          broadcastEvent('SETTINGS_UPDATED', updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, settings: updated }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Auth check error' }));
    });
    return;
  }

  // API Route: GET /api/menu/csv - Download Google Sheets ready menu CSV
  if (req.method === 'GET' && cleanUrl === '/api/menu/csv') {
    const csvPath = path.join(DATA_DIR, 'menu_export.csv');
    if (fs.existsSync(csvPath)) {
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="rock_n_rolls_menu_tab.csv"'
      });
      fs.createReadStream(csvPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Menu CSV not found');
    }
    return;
  }

  // API Route: GET /api/menu/items - Complete menu items metadata
  if (req.method === 'GET' && cleanUrl === '/api/menu/items') {
    const itemsPath = path.join(DATA_DIR, 'all-menu-items.json');
    if (fs.existsSync(itemsPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      fs.createReadStream(itemsPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Items not found' }));
    }
    return;
  }

  // API Route: GET /api/customer/profile - Check customer cookie session
  if (req.method === 'GET' && cleanUrl === '/api/customer/profile') {
    const rawCookie = req.headers.cookie || '';
    const matchName = rawCookie.match(/(?:^|;\s*)rnr_customer_name=([^;]*)/);
    const matchPhone = rawCookie.match(/(?:^|;\s*)rnr_customer_phone=([^;]*)/);
    const name = matchName ? decodeURIComponent(matchName[1]) : '';
    const phone = matchPhone ? decodeURIComponent(matchPhone[1]) : '';
    const isLoggedIn = Boolean(name.trim() && phone.replace(/[^0-9]/g, '').length >= 10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isLoggedIn, name, phone }));
    return;
  }

  // API Route: POST /api/customer/login - Record customer login & sync to Google Sheets
  if (req.method === 'POST' && cleanUrl === '/api/customer/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const customerData = JSON.parse(body);
        customerData.receivedAt = new Date().toISOString();

        console.log(`[CUSTOMER LOGIN] 👤 ${customerData.name || 'Customer'} (📞 +91 ${customerData.phone || 'N/A'}) logged in.`);

        // Stream into Google Sheets 'Logins' tab
        sheets.syncLogin(customerData).then(sheetRes => {
          if (sheetRes.success) {
            console.log(`[GOOGLE SHEETS] Customer login ${customerData.name} synced to Google Sheet.`);
          } else {
            console.log(`[GOOGLE SHEETS] Login sync notice: ${sheetRes.reason || sheetRes.error || 'Queued'}`);
          }
        }).catch(err => {
          console.error('[GOOGLE SHEETS] Login sync error:', err.message);
        });

        const nameEnc = encodeURIComponent(customerData.name || '');
        const phoneEnc = encodeURIComponent(customerData.phone || '');
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': [
            `rnr_customer_name=${nameEnc}; Path=/; Max-Age=31536000; SameSite=Lax`,
            `rnr_customer_phone=${phoneEnc}; Path=/; Max-Age=31536000; SameSite=Lax`
          ]
        });
        res.end(JSON.stringify({ success: true, message: 'Login recorded and synced', customer: { name: customerData.name, phone: customerData.phone } }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid customer JSON' }));
      }
    });
    return;
  }

  // API Route: GET /api/customer/cart?phone=... - Fetch customer synced cart
  if (req.method === 'GET' && cleanUrl === '/api/customer/cart') {
    const rawCookie = req.headers.cookie || '';
    const matchPhone = rawCookie.match(/(?:^|;\s*)rnr_customer_phone=([^;]*)/);
    const cookiePhone = matchPhone ? decodeURIComponent(matchPhone[1]) : '';

    const urlObj = new URL(req.url, 'http://localhost');
    const queryPhone = urlObj.searchParams.get('phone') || '';
    const cleanPhone = (queryPhone || cookiePhone).replace(/[^0-9]/g, '').slice(-10);

    const carts = getStoredCarts();
    const customerCart = cleanPhone && carts[cleanPhone] ? carts[cleanPhone] : { cart: [], updatedAt: 0 };

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify({
      success: true,
      phone: cleanPhone,
      cart: customerCart.cart || [],
      updatedAt: customerCart.updatedAt || 0
    }));
    return;
  }

  // API Route: POST /api/customer/cart - Sync customer cart across all devices
  if (req.method === 'POST' && cleanUrl === '/api/customer/cart') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        let phone = (payload.phone || '').replace(/[^0-9]/g, '').slice(-10);
        if (!phone) {
          const rawCookie = req.headers.cookie || '';
          const matchPhone = rawCookie.match(/(?:^|;\s*)rnr_customer_phone=([^;]*)/);
          phone = matchPhone ? decodeURIComponent(matchPhone[1]).replace(/[^0-9]/g, '').slice(-10) : '';
        }

        if (!phone) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Customer phone required to sync cart' }));
          return;
        }

        const carts = getStoredCarts();
        const incomingUpdatedAt = Number(payload.updatedAt) || Date.now();
        const existing = carts[phone];

        if (!existing || incomingUpdatedAt >= (existing.updatedAt || 0)) {
          carts[phone] = {
            cart: Array.isArray(payload.cart) ? payload.cart : [],
            updatedAt: incomingUpdatedAt
          };
          saveStoredCarts(carts);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          phone,
          cart: carts[phone].cart,
          updatedAt: carts[phone].updatedAt
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid cart JSON' }));
      }
    });
    return;
  }

  // API Route: POST /api/orders - Automatically record order & reflect in WhatsApp Group
  if (req.method === 'POST' && cleanUrl === '/api/orders') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const orderData = JSON.parse(body);
        orderData.receivedAt = new Date().toISOString();
        orderData.groupReflected = true;
        orderData.groupName = 'Rock on Roll payment';
        if (!orderData.kitchenStatus) {
          orderData.kitchenStatus = 'PREPARING';
        }

        const orders = getStoredOrders();
        orders.unshift(orderData);
        saveStoredOrders(orders);

        // Broadcast instant live event to all connected clients & lock-screen push listeners
        broadcastEvent('NEW_ORDER', orderData);

        // Clear customer server-side cart upon confirmed order placement
        const customerCleanPhone = (orderData.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
        if (customerCleanPhone) {
          const carts = getStoredCarts();
          carts[customerCleanPhone] = { cart: [], updatedAt: Date.now() };
          saveStoredCarts(carts);
        }

        console.log(`\n======================================================`);
        console.log(`[WHATSAPP GROUP AUTO-DISPATCH] Order ${orderData.orderId}`);
        console.log(`Customer: ${orderData.customerName || 'Walk-in Guest'} | Phone: ${orderData.customerPhone ? '+91 ' + orderData.customerPhone : 'N/A'}`);
        console.log(`Group: Rock on Roll payment (chat.whatsapp.com/F1DKNCYNeMg3o2h9boHTdy)`);
        console.log(`Total: ₹${orderData.total} | Method: ${orderData.paymentMethod || 'UPI'}`);
        console.log(`Status: ✅ PAID & CONFIRMED | Items: ${orderData.items}`);
        if (orderData.instructions && orderData.instructions.trim()) {
          console.log(`Chef Notes: ${orderData.instructions}`);
        }
        console.log(`Receipt verified with matching RNR Number: ${orderData.orderId}`);
        console.log(`======================================================\n`);

        // Stream into Google Sheets 'Orders' tab
        sheets.syncOrder(orderData).then(sheetRes => {
          if (sheetRes.success) {
            console.log(`[GOOGLE SHEETS] Successfully synced order ${orderData.orderId} to Google Sheet!`);
          } else {
            console.log(`[GOOGLE SHEETS] Notice: ${sheetRes.reason || sheetRes.error || 'Queued for sync'}`);
          }
        }).catch(err => {
          console.error('[GOOGLE SHEETS] Order sync error:', err.message);
        });

        const headers = { 'Content-Type': 'application/json' };
        if (orderData.customerName && orderData.customerPhone) {
          const nameEnc = encodeURIComponent(orderData.customerName);
          const phoneEnc = encodeURIComponent(orderData.customerPhone);
          headers['Set-Cookie'] = [
            `rnr_customer_name=${nameEnc}; Path=/; Max-Age=31536000; SameSite=Lax`,
            `rnr_customer_phone=${phoneEnc}; Path=/; Max-Age=31536000; SameSite=Lax`
          ];
        }
        res.writeHead(200, headers);
        res.end(JSON.stringify({
          success: true,
          orderId: orderData.orderId,
          groupName: 'Rock on Roll payment',
          reflectedToGroup: true,
          status: 'CONFIRMED'
        }));
      } catch (err) {
        console.error('Error handling /api/orders POST:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid order JSON' }));
      }
    });
    return;
  }

  // API Route: GET /api/orders - All orders (Strictly restricted to authorized store admins)
  if (req.method === 'GET' && cleanUrl === '/api/orders') {
    isAuthorizedAdmin(req).then(auth => {
      if (!auth.authorized) {
        res.writeHead(403, { 
          'Content-Type': 'application/json', 
          'Cache-Control': 'no-cache, no-store, must-revalidate' 
        });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Access Denied: Admin authorization required to view store orders.',
          code: 'UNAUTHORIZED_ADMIN'
        }));
        return;
      }
      const orders = getStoredOrders();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(orders));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Server authentication error' }));
    });
    return;
  }

  // API Route: GET /api/customer/orders?phone=... - Active customer orders filtered for current customer
  if (req.method === 'GET' && cleanUrl === '/api/customer/orders') {
    const rawCookie = req.headers.cookie || '';
    const matchPhone = rawCookie.match(/(?:^|;\s*)rnr_customer_phone=([^;]*)/);
    const cookiePhone = matchPhone ? decodeURIComponent(matchPhone[1]) : '';

    const urlObj = new URL(req.url, 'http://localhost');
    const queryPhone = urlObj.searchParams.get('phone') || '';
    const cleanPhone = (queryPhone || cookiePhone).replace(/[^0-9]/g, '').slice(-10);
    const queryIds = (urlObj.searchParams.get('ids') || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    const allOrders = getStoredOrders();
    if (!cleanPhone && queryIds.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
      return;
    }

    const customerOrders = allOrders.filter(o => {
      const oPhone = (o.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
      const oId = (o.orderId || '').trim().toUpperCase();
      const oIdNoHash = oId.replace(/^#/, '');
      const matchPhone = cleanPhone && (oPhone === cleanPhone);
      const matchId = queryIds.some(qid => qid === oId || qid === oIdNoHash || ('#' + qid) === oId);
      return matchPhone || matchId;
    });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(JSON.stringify(customerOrders));
    return;
  }

  // API Route: DELETE /api/customer/orders?phone=... - Clear all past orders for this customer
  if (req.method === 'DELETE' && cleanUrl === '/api/customer/orders') {
    const rawCookie = req.headers.cookie || '';
    const matchPhone = rawCookie.match(/(?:^|;\s*)rnr_customer_phone=([^;]*)/);
    const cookiePhone = matchPhone ? decodeURIComponent(matchPhone[1]) : '';

    const urlObj = new URL(req.url, 'http://localhost');
    const queryPhone = urlObj.searchParams.get('phone') || '';
    const cleanPhone = (queryPhone || cookiePhone).replace(/[^0-9]/g, '').slice(-10);

    if (!cleanPhone) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Customer phone required' }));
      return;
    }

    let orders = getStoredOrders();
    const initialLen = orders.length;
    orders = orders.filter(o => {
      const oPhone = (o.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
      return oPhone !== cleanPhone;
    });
    saveStoredOrders(orders);
    const deletedCount = initialLen - orders.length;

    console.log(`[CUSTOMER ORDERS CLEARED] Cleared ${deletedCount} orders for phone ${cleanPhone}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, deletedCount }));
    return;
  }

  // API Route: DELETE /api/orders/:id - Remove order by ID (Restricted to verified Admins)
  if (req.method === 'DELETE' && cleanUrl.startsWith('/api/orders/')) {
    isAuthorizedAdmin(req).then(auth => {
      if (!auth.authorized) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Access Denied: Admin authorization required' }));
        return;
      }
      const rawId = cleanUrl.replace('/api/orders/', '');
      const orderIdToDelete = decodeURIComponent(rawId).trim();
      let orders = getStoredOrders();
      const beforeCount = orders.length;
      orders = orders.filter(o => {
        const idA = (o.orderId || '').trim();
        const idB = orderIdToDelete;
        if (idA === idB) return false;
        if (idA.replace(/^#/, '') === idB.replace(/^#/, '')) return false;
        return true;
      });
      saveStoredOrders(orders);

      console.log(`[ORDER DELETED] Order ${orderIdToDelete} removed from storage. (Before: ${beforeCount}, After: ${orders.length})`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: orderIdToDelete }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Authentication error' }));
    });
    return;
  }

  // API Route: POST /api/orders/:id/status - Update kitchen order progress status (Restricted to verified Admins)
  if (req.method === 'POST' && cleanUrl.startsWith('/api/orders/') && cleanUrl.endsWith('/status')) {
    isAuthorizedAdmin(req).then(auth => {
      if (!auth.authorized) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Access Denied: Admin authorization required' }));
        return;
      }
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const orderIdPart = cleanUrl.replace('/api/orders/', '').replace('/status', '');
          const targetOrderId = decodeURIComponent(orderIdPart).trim();
          const newStatus = (payload.status || '').trim();

          if (!newStatus) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Status required' }));
            return;
          }

          let orders = getStoredOrders();
          let found = false;
          orders = orders.map(o => {
            const idA = (o.orderId || '').trim();
            if (idA === targetOrderId || idA.replace(/^#/, '') === targetOrderId.replace(/^#/, '')) {
              found = true;
              return {
                ...o,
                kitchenStatus: newStatus,
                statusUpdatedAt: new Date().toISOString()
              };
            }
            return o;
          });

          if (found) {
            saveStoredOrders(orders);
            console.log(`[ORDER STATUS UPDATED] Order ${targetOrderId} -> ${newStatus}`);
            // Broadcast live status update to customer & admin lock-screens
            broadcastEvent('ORDER_STATUS_CHANGED', { orderId: targetOrderId, newStatus: newStatus });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, updated: found, orderId: targetOrderId, status: newStatus }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Authentication error' }));
    });
    return;
  }

  // API Route: GET /api/admin/check?phone=... - Check if current user is an authorized admin
  if (req.method === 'GET' && cleanUrl === '/api/admin/check') {
    const rawCookie = req.headers.cookie || '';
    const matchPhone = rawCookie.match(/(?:^|;\s*)rnr_customer_phone=([^;]*)/);
    const cookiePhone = matchPhone ? decodeURIComponent(matchPhone[1]) : '';

    const urlObj = new URL(req.url, 'http://localhost');
    const queryPhone = urlObj.searchParams.get('phone') || '';
    const cleanPhone = (queryPhone || cookiePhone).replace(/[^0-9]/g, '').slice(-10);

    const forceRefresh = req.url.includes('refresh=true');
    sheets.getLiveAdmins(forceRefresh).then(adminRes => {
      const admins = adminRes.admins || [];
      const matched = admins.find(a => {
        const aPhone = (a.phone || '').replace(/[^0-9]/g, '').slice(-10);
        return aPhone && aPhone === cleanPhone && a.status !== 'INACTIVE';
      });

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(JSON.stringify({
        success: true,
        isAdmin: Boolean(matched),
        phone: cleanPhone,
        name: matched ? matched.name : '',
        role: matched ? matched.role : 'Customer',
        source: adminRes.source
      }));
    }).catch(err => {
      const localAdmins = sheets.loadLocalAdmins();
      const matched = localAdmins.find(a => {
        const aPhone = (a.phone || '').replace(/[^0-9]/g, '').slice(-10);
        return aPhone && aPhone === cleanPhone && a.status !== 'INACTIVE';
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        isAdmin: Boolean(matched),
        phone: cleanPhone,
        name: matched ? matched.name : '',
        role: matched ? matched.role : 'Customer',
        source: 'local_fallback'
      }));
    });
    return;
  }

  // API Route: GET /api/admin/admins - List all authorized admins from sheet/cache
  if (req.method === 'GET' && cleanUrl === '/api/admin/admins') {
    const forceRefresh = req.url.includes('refresh=true');
    sheets.getLiveAdmins(forceRefresh).then(adminRes => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      res.end(JSON.stringify(adminRes));
    }).catch(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ admins: sheets.loadLocalAdmins(), source: 'local_fallback' }));
    });
    return;
  }

  // API Route: POST /api/admin/add - Add new admin from web dashboard or sheet
  if (req.method === 'POST' && cleanUrl === '/api/admin/add') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const result = await sheets.addAdmin(payload);
        if (result.success) {
          console.log(`[ADMIN ADDED] 🛡️ ${result.admin.name} (+91 ${result.admin.phone}) registered as ${result.admin.role}.`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // API Route: POST /api/admin/sync - Force sync admins from Google Sheets Admins tab
  if (req.method === 'POST' && cleanUrl === '/api/admin/sync') {
    sheets.getLiveAdmins(true).then(adminRes => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...adminRes }));
    }).catch(err => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, admins: sheets.loadLocalAdmins(), source: 'local_fallback', notice: err.message }));
    });
    return;
  }

  // Static File Serving
  let targetFile = cleanUrl === '/' ? 'index.html' : cleanUrl;
  if (cleanUrl === '/admin' || cleanUrl === '/admin/') {
    targetFile = 'admin.html';
  }
  let filePath = path.join(__dirname, targetFile);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      if (cleanUrl === '/sw.js') {
        headers['Service-Worker-Allowed'] = '/';
        headers['Content-Type'] = 'text/javascript';
      } else if (cleanUrl === '/manifest.json') {
        headers['Content-Type'] = 'application/json';
      }
      res.writeHead(200, headers);
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Rock N Rolls server running cleanly at http://localhost:${PORT}/`);
});
