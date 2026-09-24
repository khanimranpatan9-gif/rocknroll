/**
 * ==============================================================================
 * ROCK N ROLLS - GOOGLE SHEETS LIVE DATABASE & MENU INVENTORY ENGINE
 * Target Sheet: https://docs.google.com/spreadsheets/d/1V1zicwU14KNkEKdYMM0hGMYnpxvQ59S8FLye6y0MOd8/edit
 * ==============================================================================
 * 
 * FEATURES:
 * 1. LIVE ORDERS TAB: Real-time receipt auto-logging from customer checkouts.
 * 2. LIVE LOGINS TAB: Real-time customer profile logging.
 * 3. LIVE MENU & INVENTORY TAB: 49 dishes with prices, categories & TRUE/FALSE
 *    in-stock dropdowns. When you change TRUE to FALSE, the dish immediately
 *    shows "OUT OF STOCK" in the customer app!
 * 
 * HOW TO ACTIVATE / UPDATE:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1V1zicwU14KNkEKdYMM0hGMYnpxvQ59S8FLye6y0MOd8/edit
 * 2. Click Extensions -> Apps Script
 * 3. Replace all code in Code.gs with this entire file and click Save (💾).
 * 4. In the toolbar dropdown at top, select "setupMenuTab" and click "Run" (▶).
 *    (This will immediately create the "Menu" tab with all 49 dishes & TRUE/FALSE dropdowns!)
 * 5. Click Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy.
 */

// Custom Menu in Google Sheet Toolbar
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("🌯 Rock N Rolls")
      .addItem("⚡ Create / Reset Menu Tab", "setupMenuTab")
      .addItem("🛡️ Create / Reset Admins Tab", "setupAdminsTab")
      .addToUi();
  } catch (e) {}
}

// ==============================================================================
// 1B. SETUP ADMINS TAB (Authorized Admin Phone Numbers)
// ==============================================================================
function setupAdminsTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let adminSheet = ss.getSheetByName("Admins");
  
  if (!adminSheet) {
    adminSheet = ss.insertSheet("Admins");
  } else {
    adminSheet.clear();
  }

  // Header Row
  adminSheet.appendRow([
    "Admin Name",
    "Mobile Number",
    "Role",
    "Status",
    "Added Date"
  ]);

  // Header Styling (Dark Indigo background, Gold text)
  const headerRange = adminSheet.getRange(1, 1, 1, 5);
  headerRange.setBackground("#312E81");
  headerRange.setFontColor("#FDE047");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setFontSize(11);
  adminSheet.setFrozenRows(1);

  // Initial Admin Users
  const initialAdmins = [
    ["Imran Khan", "'8500677368", "Super Admin", "ACTIVE", "2026-09-23"],
    ["Irfan", "'9848879728", "Store Owner", "ACTIVE", "2026-09-23"]
  ];

  initialAdmins.forEach(row => {
    adminSheet.appendRow(row);
  });

  adminSheet.autoResizeColumns(1, 5);

  return {
    success: true,
    message: "Admins tab initialized successfully with authorized phone numbers."
  };
}

// ==============================================================================
// 1. SETUP MENU & INVENTORY TAB (All 49 dishes with TRUE/FALSE stock dropdown)
// ==============================================================================
function setupMenuTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let menuSheet = ss.getSheetByName("Menu");
  
  if (!menuSheet) {
    menuSheet = ss.insertSheet("Menu");
  } else {
    menuSheet.clear();
  }

  // Header Row
  menuSheet.appendRow([
    "Item ID",
    "Category",
    "Item Name",
    "Price (₹)",
    "In Stock",
    "Diet",
    "Tags",
    "Description"
  ]);

  // Header Styling (Dark slate background, amber text, centered)
  const headerRange = menuSheet.getRange(1, 1, 1, 8);
  headerRange.setBackground("#1E293B");
  headerRange.setFontColor("#F59E0B");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setFontSize(11);
  menuSheet.setFrozenRows(1);

  // All 49 Menu Items
  const menuRows = [
  [
    "egg-roll",
    "rolls",
    "Egg Roll",
    50,
    "TRUE",
    "Egg",
    "Crispy, Egg Special",
    "Crisp flaky layered paratha wrapped with golden fluffy spiced egg omelette and tangy lime onions."
  ],
  [
    "veg-gobi-roll",
    "rolls",
    "Veg Gobi Roll",
    50,
    "TRUE",
    "Veg",
    "100% Veg, Crispy Gobi",
    "Crispy spiced cauliflower florets, fresh mint chutney & crunchy sliced red onions wrapped in warm layered paratha."
  ],
  [
    "egg-gobi-roll",
    "rolls",
    "Egg Gobi Roll",
    60,
    "TRUE",
    "Egg",
    "Egg + Gobi, Street Style",
    "Loaded egg layer filled with crunchy spiced roasted gobi, green chutney, lime juice and chaat masala."
  ],
  [
    "veg-paneer-roll",
    "rolls",
    "Veg Paneer Roll",
    80,
    "TRUE",
    "Veg",
    "100% Veg, Tandoori Paneer",
    "Soft paneer cubes simmered in aromatic tandoori marinade wrapped in soft handmade flaky paratha."
  ],
  [
    "egg-paneer-roll",
    "rolls",
    "Egg Paneer Roll",
    90,
    "TRUE",
    "Egg",
    "Egg + Paneer, Rich Protein",
    "Double delight: fluffy egg crepe combined with succulent spiced cottage cheese and charred bell peppers."
  ],
  [
    "egg-chicken-roll",
    "rolls",
    "Egg Chicken Roll",
    80,
    "TRUE",
    "Non-Veg",
    "Bestseller, Fire Sizzled",
    "Tender spiced shredded chicken tossed with roasted onions, special green chutney, wrapped in fresh layered paratha with a golden pan-fried egg."
  ],
  [
    "egg-double-chicken-roll",
    "rolls",
    "Egg Double Chicken Roll",
    100,
    "TRUE",
    "Non-Veg",
    "Chef Special, Double Loaded",
    "Heavy loaded charred chicken chunks, double fluffy egg layer, special spices, and mint garlic sauce."
  ],
  [
    "mini-box-chicken",
    "fried-chicken",
    "Mini Box (6 Pcs)",
    260,
    "TRUE",
    "Non-Veg",
    "6 Pcs, Crispy Fried, Popular",
    "6 pieces of crunchy, golden bone-in fried chicken seasoned with our signature savory spice rub."
  ],
  [
    "medium-bucket-chicken",
    "fried-chicken",
    "Medium Bucket Chicken",
    490,
    "TRUE",
    "Non-Veg",
    "Sharing Bucket, Crispy Fried",
    "Crunchy golden fried chicken bucket loaded with juicy, tender chicken pieces. Perfect for sharing!"
  ],
  [
    "large-bucket-chicken",
    "fried-chicken",
    "Large Bucket Chicken",
    700,
    "TRUE",
    "Non-Veg",
    "Family Feast, Chef Special",
    "Giant party feast bucket packed with hot, sizzling and extra crunchy bone-in fried chicken."
  ],
  [
    "hot-crispy-leg-piece",
    "fried-chicken",
    "Hot Crispy Leg Piece (2 Pcs)",
    120,
    "TRUE",
    "Non-Veg",
    "2 Pcs Drumsticks, Hot & Crispy",
    "Two prime juicy chicken drumsticks coated in fiery crispy batter and fried golden."
  ],
  [
    "apple-chicken",
    "fried-chicken",
    "Apple Chicken",
    80,
    "TRUE",
    "Non-Veg",
    "Specialty, Juicy Cuts",
    "Crispy lollipop-style chicken drummettes seasoned with Indo-Chinese spices and served piping hot."
  ],
  [
    "hot-wings",
    "fried-chicken",
    "Hot Wings (6 Pcs)",
    130,
    "TRUE",
    "Non-Veg",
    "Spicy 🔥, 6 Pcs Wings",
    "6 crispy deep-fried chicken wings coated with zesty red chili seasoning and black pepper glaze."
  ],
  [
    "popcorn-chicken",
    "fried-chicken",
    "Pop Corn",
    120,
    "TRUE",
    "Non-Veg",
    "Boneless, Crunchy Pops",
    "Bite-sized boneless crunchy tender chicken pops served with creamy mayo dip."
  ],
  [
    "chicken-strips",
    "fried-chicken",
    "Chicken Strips",
    70,
    "TRUE",
    "Non-Veg",
    "Boneless, Crispy Tenders",
    "100% tender boneless chicken breast fillets breaded in golden crumbs and fried to perfection."
  ],
  [
    "combo-2pcs-chicken",
    "combos",
    "2 Pcs Hot & Crispy Chicken Combo",
    170,
    "TRUE",
    "Non-Veg",
    "Value Meal, Fries + Pepsi 🥤",
    "2 Pcs Hot & Crispy Chicken served with golden salted French Fries and chilled 200ml Pepsi bottle."
  ],
  [
    "combo-crispy-wrap",
    "combos",
    "Crispy Chicken Wrap Combo",
    170,
    "TRUE",
    "Non-Veg",
    "Wrap Combo, Fries + Pepsi 🥤",
    "Golden Crispy Chicken Wrap packed with veggies & mayo, bundled with French Fries and 200ml Pepsi."
  ],
  [
    "combo-3-apple-chicken",
    "combos",
    "3 Apple Chicken Combo",
    170,
    "TRUE",
    "Non-Veg",
    "Apple Chicken, Fries + Pepsi 🥤",
    "3 Pcs of crispy spiced Apple Chicken drummettes served alongside French Fries and 200ml chilled Pepsi."
  ],
  [
    "hot-crispy-chicken-burger",
    "burgers",
    "Hot & Crispy Chicken Burger",
    89,
    "TRUE",
    "Non-Veg",
    "Bestseller, Crispy Fillet",
    "Thick crunchy fried chicken fillet with crisp iceberg lettuce, creamy burger mayo in toasted sesame buns."
  ],
  [
    "mega-king-burger",
    "burgers",
    "Mega King Burger",
    120,
    "TRUE",
    "Non-Veg",
    "Chef Special, Double Loaded",
    "Double-decker chicken patty tower loaded with melted cheese slice, tangy burger glaze and fresh salad."
  ],
  [
    "malaysian-egg-wrapper-burger",
    "burgers",
    "Malaysian Egg Wrapper Burger",
    140,
    "TRUE",
    "Egg",
    "Street Special, Egg Wrapped",
    "Authentic Malaysian Ramly style burger: spiced chicken patty encased in a savory folded egg wrap with pepper sauce."
  ],
  [
    "veg-burger",
    "burgers",
    "Veg Burger",
    70,
    "TRUE",
    "Veg",
    "100% Veg, Crispy Patty",
    "Crispy golden potato & veggie patty topped with ripe tomatoes, crunchy lettuce and herb mayonnaise."
  ],
  [
    "egg-burger",
    "burgers",
    "Egg Burger",
    70,
    "TRUE",
    "Egg",
    "Egg Special, Juicy",
    "Spiced golden pan-fried egg patty topped with sliced onions, greens and tangy burger dressing."
  ],
  [
    "veg-pizza",
    "pizza-veg",
    "Veg Pizza",
    179,
    "TRUE",
    "Veg",
    "100% Veg, Fresh Crust",
    "Hand-stretched pizza base topped with marinara sauce, crisp bell peppers, onions, tomatoes and melted mozzarella."
  ],
  [
    "golden-corn-pizza",
    "pizza-veg",
    "Golden Corn Pizza",
    210,
    "TRUE",
    "Veg",
    "Sweet Corn, Cheesy",
    "Sweet American golden corn kernels layered generously over rich molten mozzarella and Italian seasoning."
  ],
  [
    "veggie-mushroom-pizza",
    "pizza-veg",
    "Veggie Mushroom Pizza",
    210,
    "TRUE",
    "Veg",
    "100% Veg, Button Mushroom",
    "Sautéed fresh button mushrooms, caramelized red onions, aromatic herbs and strings of mozzarella."
  ],
  [
    "onion-capsicum-pizza",
    "pizza-veg",
    "Onion Capsicum Pizza",
    210,
    "TRUE",
    "Veg",
    "100% Veg, Crunchy",
    "Classic combination of crunchy green capsicum, sliced red onions, herbed tomato sauce and mozzarella cheese."
  ],
  [
    "cheese-pizza",
    "pizza-veg",
    "Cheese Pizza",
    250,
    "TRUE",
    "Veg",
    "Extra Cheesy, Bestseller",
    "Loaded double layers of stringy, gooey mozzarella and cheddar cheese over rich Italian tomato sauce."
  ],
  [
    "periperi-spicy-pizza",
    "pizza-veg",
    "Peri Peri Spicy Pizza",
    210,
    "TRUE",
    "Veg",
    "Spicy 🔥, Peri Peri",
    "Fiery African peri-peri seasoned garden vegetables, red paprika, sliced jalapeños and spicy mozzarella."
  ],
  [
    "chicken-pizza",
    "pizza-nonveg",
    "Chicken Pizza",
    230,
    "TRUE",
    "Non-Veg",
    "Bestseller, Juicy Chicken",
    "Succulent herb-spiced chicken chunks, bell peppers, diced onions and bubbling melted mozzarella cheese."
  ],
  [
    "peri-peri-chicken-pizza",
    "pizza-nonveg",
    "Peri Peri Chicken Pizza",
    240,
    "TRUE",
    "Non-Veg",
    "Spicy 🔥, Peri Peri",
    "Fiery peri-peri marinated chicken tikka pieces, hot jalapeños, chili flakes and molten mozzarella."
  ],
  [
    "chicken-margarita-pizza",
    "pizza-nonveg",
    "Chicken Margarita Pizza",
    240,
    "TRUE",
    "Non-Veg",
    "Classic Basil, Italian Style",
    "Juicy roasted chicken on classic Italian tomato basil sauce, olive oil glaze and fresh melted mozzarella."
  ],
  [
    "chicken-salami-pizza",
    "pizza-nonveg",
    "Chicken Salami Pizza",
    280,
    "TRUE",
    "Non-Veg",
    "Chef Special, Smoked Salami",
    "Premium sliced smoked chicken salami rounds, aromatic dried oregano, garlic oil and rich mozzarella."
  ],
  [
    "chicken-sausage-pizza",
    "pizza-nonveg",
    "Chicken Sausage Pizza",
    240,
    "TRUE",
    "Non-Veg",
    "Chicken Sausage, Loaded",
    "Juicy sliced chicken frankfurter sausages, sautéed onions, green peppers and golden melted cheese."
  ],
  [
    "french-fries",
    "fries",
    "French Fries",
    70,
    "TRUE",
    "Veg",
    "Crispy, Classic",
    "Crispy golden potato fingers tossed in sea salt, served hot with tangy tomato ketchup."
  ],
  [
    "peri-peri-fries",
    "fries",
    "Peri Peri Fries",
    90,
    "TRUE",
    "Veg",
    "Spicy 🔥, Peri Peri",
    "Golden crispy french fries shaken in spicy peri-peri masala dust. Hot, tangy & addictive!"
  ],
  [
    "cheese-fries",
    "fries",
    "Cheese Fries",
    100,
    "TRUE",
    "Veg",
    "Loaded Cheese, Cheesy Melt",
    "Hot crispy fries drenched under thick, warm creamy melted yellow cheddar cheese sauce."
  ],
  [
    "egg-fried-rice",
    "fried-rice",
    "Egg Fried Rice",
    50,
    "TRUE",
    "Egg",
    "Wok Tossed",
    "Wok-tossed basmati rice with scrambled egg, roasted garlic and fresh spring onions."
  ],
  [
    "gobi-fried-rice",
    "fried-rice",
    "Gobi Fried Rice",
    60,
    "TRUE",
    "Veg",
    "100% Veg",
    "Crispy wok cauliflower florets with aromatic garlic fried rice and spicy pepper seasoning."
  ],
  [
    "paneer-fried-rice",
    "fried-rice",
    "Paneer Fried Rice",
    70,
    "TRUE",
    "Veg",
    "100% Veg, Fresh Paneer",
    "Golden paneer cubes tossed with crunchy bell peppers, garlic soy glaze, and fragrant basmati rice."
  ],
  [
    "chicken-fried-rice",
    "fried-rice",
    "Chicken Fried Rice",
    70,
    "TRUE",
    "Non-Veg",
    "Bestseller, High Flame Wok",
    "Aromatic basmati rice tossed in high-flame wok with tender chicken cubes, egg scramble & spring onions."
  ],
  [
    "egg-noodles",
    "noodles",
    "Egg Noodles",
    50,
    "TRUE",
    "Egg",
    "Street Style",
    "Classic street-style wok noodles tossed with spiced egg ribbons, shredded cabbage & carrots."
  ],
  [
    "gobi-noodles",
    "noodles",
    "Gobi Noodles",
    50,
    "TRUE",
    "Veg",
    "100% Veg",
    "Tangy street noodles packed with crunchy spiced cauliflower florets, chili garlic & soy sauce."
  ],
  [
    "paneer-noodles",
    "noodles",
    "Paneer Noodles",
    60,
    "TRUE",
    "Veg",
    "100% Veg, Soft Paneer",
    "Soft paneer slivers stir-fried with rich garlic, soy glaze, spring onions & chili coated noodles."
  ],
  [
    "chicken-schezwan-noodles",
    "noodles",
    "Chicken Schezwan Noodles",
    70,
    "TRUE",
    "Non-Veg",
    "Spicy Schezwan 🔥, Bestseller",
    "Fiery red schezwan sauce wok noodles loaded with succulent chicken cubes, garlic, and fresh greens."
  ],
  [
    "veg-fried-momos",
    "momos",
    "Veg Fried Momos",
    80,
    "TRUE",
    "Veg",
    "100% Veg, Crispy Fried",
    "Golden crispy deep-fried dumplings stuffed with finely minced vegetables, served with fiery red chutney & mayo dip."
  ],
  [
    "chicken-fried-momos",
    "momos",
    "Chicken Fried Momos",
    100,
    "TRUE",
    "Non-Veg",
    "Juicy Chicken, Crispy Fried",
    "Golden crispy deep-fried dumplings stuffed with juicy seasoned chicken mince, served with fiery red chutney & mayo dip."
  ],
  [
    "chilli-chicken",
    "starters",
    "Chilli Chicken",
    120,
    "TRUE",
    "Non-Veg",
    "Chef Special 👨‍🍳, Spicy 🔥",
    "Crispy fried chicken chunks tossed in spicy dark soy, fresh green chilies, capsicum, and spring onions."
  ],
  [
    "chicken-pakoda",
    "starters",
    "Chicken Pakoda",
    100,
    "TRUE",
    "Non-Veg",
    "Street Style Fritters, Hot & Crispy",
    "Crispy, gram-flour coated street style spicy chicken fritters served piping hot with sliced onions & lemon."
  ]
];

  menuSheet.getRange(2, 1, menuRows.length, 8).setValues(menuRows);

  // Set Data Validation: Native TRUE / FALSE Dropdown on Column E (In Stock)
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["TRUE", "FALSE"], true)
    .setAllowInvalid(false)
    .setHelpText("Select TRUE for In Stock or FALSE for Out of Stock")
    .build();
  menuSheet.getRange(2, 5, menuRows.length, 1).setDataValidation(rule);

  // Set Text Alignments
  menuSheet.getRange(2, 1, menuRows.length, 1).setHorizontalAlignment("left");
  menuSheet.getRange(2, 2, menuRows.length, 1).setHorizontalAlignment("center");
  menuSheet.getRange(2, 3, menuRows.length, 1).setHorizontalAlignment("left");
  menuSheet.getRange(2, 4, menuRows.length, 1).setHorizontalAlignment("right");
  menuSheet.getRange(2, 5, menuRows.length, 1).setHorizontalAlignment("center");
  menuSheet.getRange(2, 6, menuRows.length, 1).setHorizontalAlignment("center");

  // Format Column Widths for readability
  menuSheet.setColumnWidth(1, 150); // Item ID
  menuSheet.setColumnWidth(2, 130); // Category
  menuSheet.setColumnWidth(3, 220); // Item Name
  menuSheet.setColumnWidth(4, 90);  // Price (₹)
  menuSheet.setColumnWidth(5, 120); // In Stock (TRUE/FALSE Dropdown)
  menuSheet.setColumnWidth(6, 100); // Diet
  menuSheet.setColumnWidth(7, 200); // Tags
  menuSheet.setColumnWidth(8, 300); // Description

  return { 
    success: true, 
    count: menuRows.length, 
    message: "Menu tab created with " + menuRows.length + " items and TRUE/FALSE dropdowns." 
  };
}

// ==============================================================================
// 2. HTTP POST HANDLER (Live Webhook)
// ==============================================================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Empty payload" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Setup Menu Tab Action
    if (data.type === "setup_menu" || data.type === "menu_init") {
      const res = setupMenuTab();
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Setup Admins Tab Action
    if (data.type === "setup_admins" || data.type === "admin_init") {
      const res = setupAdminsTab();
      return ContentService.createTextOutput(JSON.stringify(res))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Add / Sync Admin
    if (data.type === "add_admin" || data.type === "admin") {
      let adminSheet = ss.getSheetByName("Admins");
      if (!adminSheet) {
        setupAdminsTab();
        adminSheet = ss.getSheetByName("Admins");
      }
      const cleanPhone = (data.phone || '').replace(/[^0-9]/g, '').slice(-10);
      adminSheet.appendRow([
        data.name || "Admin",
        "'" + cleanPhone,
        data.role || "Kitchen Admin",
        data.status || "ACTIVE",
        new Date().toISOString().slice(0, 10)
      ]);
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        type: "add_admin", 
        name: data.name,
        phone: cleanPhone,
        message: "Admin appended to Admins sheet successfully" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Get Live Stock
    if (data.type === "get_stock" || data.type === "get_menu") {
      const menuSheet = ss.getSheetByName("Menu");
      let stockData = {};
      if (menuSheet) {
        const d = menuSheet.getDataRange().getValues();
        for (let i = 1; i < d.length; i++) {
          const id = String(d[i][0]).trim();
          const inStockVal = String(d[i][4]).trim().toUpperCase();
          if (id) stockData[id] = (inStockVal === "TRUE" || inStockVal === "1");
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true, stock: stockData }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Order Sync (Appends to Orders sheet)
    if (data.type === "order" || data.orderId) {
      let ordersSheet = ss.getSheetByName("Orders");
      if (!ordersSheet) {
        ordersSheet = ss.insertSheet("Orders");
        ordersSheet.appendRow([
          "Order ID", "Date & Time", "Customer Name", "Mobile Number",
          "Items Ordered", "Total Bill (₹)", "Payment Method", "Payment Status",
          "Chef Notes / Instructions", "Logged At (UTC)"
        ]);
        const headerRange = ordersSheet.getRange(1, 1, 1, 10);
        headerRange.setBackground("#F59E0B");
        headerRange.setFontColor("#1A1202");
        headerRange.setFontWeight("bold");
        headerRange.setHorizontalAlignment("center");
        ordersSheet.setFrozenRows(1);
      }

      const phoneStr = data.customerPhone ? ("'" + data.customerPhone) : "";
      ordersSheet.appendRow([
        data.orderId || "",
        data.date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        data.customerName || "Walk-in Customer",
        phoneStr,
        data.items || "",
        data.total || 0,
        data.paymentMethod || "UPI",
        data.status || "PAID",
        data.instructions || "None",
        new Date().toISOString()
      ]);

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        type: "order", 
        orderId: data.orderId,
        message: "Order appended to Orders sheet successfully" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Customer Login Sync (Appends to Logins sheet)
    if (data.type === "login" || data.type === "customer") {
      let loginsSheet = ss.getSheetByName("Logins");
      if (!loginsSheet) {
        loginsSheet = ss.insertSheet("Logins");
        loginsSheet.appendRow([
          "Customer Name", "Mobile Number", "Login Date & Time", "Platform / Source", "Logged At (UTC)"
        ]);
        const headerRange = loginsSheet.getRange(1, 1, 1, 5);
        headerRange.setBackground("#10B981");
        headerRange.setFontColor("#FFFFFF");
        headerRange.setFontWeight("bold");
        headerRange.setHorizontalAlignment("center");
        loginsSheet.setFrozenRows(1);
      }

      const phoneStr = (data.phone || data.customerPhone) ? ("'" + (data.phone || data.customerPhone)) : "";
      loginsSheet.appendRow([
        data.name || data.customerName || "Customer",
        phoneStr,
        data.date || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        data.source || "Rock N Rolls Web App",
        new Date().toISOString()
      ]);

      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        type: "login", 
        name: data.name,
        message: "Customer login appended to Logins sheet successfully" 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown data type" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// ==============================================================================
// 3. HTTP GET HANDLER (Status, Live Stock & Authorized Admins Query)
// ==============================================================================
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

  if (action === "setup_menu") {
    const res = setupMenuTab();
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "setup_admins") {
    const res = setupAdminsTab();
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Add Admin via GET
  if (action === "add_admin") {
    let adminSheet = ss.getSheetByName("Admins");
    if (!adminSheet) {
      setupAdminsTab();
      adminSheet = ss.getSheetByName("Admins");
    }
    const aName = (e.parameter.name || "Admin").trim();
    const cleanPhone = (e.parameter.phone || "").replace(/[^0-9]/g, "").slice(-10);
    const aRole = (e.parameter.role || "Kitchen Admin").trim();
    const aStatus = (e.parameter.status || "ACTIVE").trim().toUpperCase();

    if (cleanPhone.length >= 10) {
      adminSheet.appendRow([
        aName,
        "'" + cleanPhone,
        aRole,
        aStatus,
        new Date().toISOString().slice(0, 10)
      ]);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        type: "add_admin",
        name: aName,
        phone: cleanPhone,
        message: "Admin appended to Admins sheet successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Valid 10-digit mobile number required"
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Read Menu Stock & Live Prices
  const menuSheet = ss.getSheetByName("Menu");
  let stockData = {};
  let priceData = {};
  if (menuSheet) {
    const d = menuSheet.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
      const id = String(d[i][0]).trim();
      const priceVal = parseFloat(String(d[i][3]).replace(/[^0-9.]/g, ''));
      const inStockVal = String(d[i][4]).trim().toUpperCase();
      if (id) {
        stockData[id] = (inStockVal === "TRUE" || inStockVal === "1");
        if (!isNaN(priceVal) && priceVal >= 0) {
          priceData[id] = priceVal;
        }
      }
    }
  }

  // Read Authorized Admins List
  let adminsList = [
    { name: "Imran Khan", phone: "8500677368", role: "Super Admin" },
    { name: "Irfan", phone: "9848879728", role: "Store Owner" }
  ];
  try {
    const adminSheet = ss.getSheetByName("Admins");
    if (adminSheet) {
      const d = adminSheet.getDataRange().getValues();
      if (d.length > 1) {
        adminsList = [];
        for (let j = 1; j < d.length; j++) {
          const aName = String(d[j][0] || '').trim();
          const aPhone = String(d[j][1] || '').replace(/[^0-9]/g, '').slice(-10);
          const aRole = String(d[j][2] || 'Admin').trim();
          const aStatus = String(d[j][3] || 'ACTIVE').trim().toUpperCase();
          if (aPhone && (aStatus === 'ACTIVE' || aStatus === 'TRUE' || !aStatus)) {
            adminsList.push({ name: aName, phone: aPhone, role: aRole });
          }
        }
      }
    }
  } catch (err) {}

  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "Rock N Rolls Google Sheets Live Database",
    sheetUrl: "https://docs.google.com/spreadsheets/d/1V1zicwU14KNkEKdYMM0hGMYnpxvQ59S8FLye6y0MOd8/edit",
    stock: stockData,
    prices: priceData,
    admins: adminsList,
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
