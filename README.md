# 🌯 Rock N Rolls — Online Ordering & Kitchen Admin System

A complete, production-grade food ordering web application with an automated **WhatsApp Kitchen Admin Dispatch Bot** and **Digital Counter Pickup Receipts**.

---

## 🚀 Quick Start on ANY System

### Prerequisites
1. **Node.js** (v18 or higher): Download from [https://nodejs.org](https://nodejs.org)

### Method 1: 1-Click Launch (Windows)
Double-click:
```
START_ROCK_N_ROLLS.bat
```
*(Automatically installs dependencies, starts the backend server, launches the keep-alive tunnel, and opens both customer and kitchen admin views in your browser.)*

### Method 2: Manual Terminal Commands (Windows / Mac / Linux)
```bash
# 1. Install dependencies
npm install

# 2. Start the restaurant backend server
npm start

# 3. In a second terminal, start the mobile keep-alive tunnel (optional for phone access)
npm run tunnel
```

---

## 📱 URLs & Portals

- **Customer Ordering App:** `http://localhost:8080/`
  - High-conversion mobile-first web app with authentic photos, portion customization, spicy sliders, and instant UPI payments (PhonePe, GPay, Paytm, BHIM QR).
  - Generates unique `#RNR-XXXXXX` counter pickup receipts.
  - No access to private admin groups.

- **Kitchen Admin & WhatsApp Bot Portal:** `http://localhost:8080/admin`
  - Real-time incoming order dashboard with audio chime alerts.
  - Displays matching `#RNR-XXXXXX` number, item breakdown, addons, cooking notes, and payment proof.
  - **🤖 100% WhatsApp Auto-Poster:** Scan the on-screen QR code once with WhatsApp (Linked Devices) to auto-post all customer receipts into the **"Rock on Roll payment"** WhatsApp group with zero clicks.
  - Manual dispatch fallback buttons: `📲 Copy & Open Group`, `Share`, `Copy`, `Delete`.

---

## 📂 Project Architecture

```
rock-n-rolls/
├── index.html              # Customer ordering web app (Cart, Checkout, Orders Tab)
├── admin.html              # Kitchen live orders portal & WhatsApp bot activator
├── server.js               # Node.js HTTP server (/api/orders, /api/bot/status)
├── whatsapp-bot.js         # Baileys WhatsApp Web engine for 100% auto-posting
├── tunnel.js               # Persistent keepalive tunnel monitor with auto-reconnect
├── START_ROCK_N_ROLLS.bat  # 1-Click launcher for other systems
├── package.json            # Node.js dependencies and run scripts
├── css/                    # CSS tokens and design system
│   ├── style.css
│   ├── tokens.css
│   └── reset.css
├── js/                     # Application logic
│   └── app.js
├── assets/                 # HD food dish images, logos, and QR codes
└── data/                   # Persistent storage
    └── orders.json         # All customer orders logged with matching RNR numbers
```

---

## 🔒 Security & WhatsApp Group Isolation
- The WhatsApp group (`https://chat.whatsapp.com/F1DKNCYNeMg3o2h9boHTdy`) is **strictly for restaurant staff/admins**.
- Customers never see or access this group.
- Customers get a digital pickup ticket in their **"Orders" tab** showing `#RNR-XXXXXX` to present at the counter.
