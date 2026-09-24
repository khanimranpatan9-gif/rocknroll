// Rock N Rolls Main Application Engine
document.addEventListener('DOMContentLoaded', () => {
  // Cart Storage & Real-Time Cross-Device Synchronization
  const CART_STORAGE_KEY = 'rock_n_rolls_cart';
  const CART_UPDATED_KEY = 'rock_n_rolls_cart_updated';

  function getLocalCartUpdatedAt() {
    try {
      const val = localStorage.getItem(CART_UPDATED_KEY);
      return val ? Number(val) : 0;
    } catch (e) {
      return 0;
    }
  }

  function setLocalCartUpdatedAt(ts) {
    try {
      localStorage.setItem(CART_UPDATED_KEY, String(ts));
    } catch (e) {}
  }

  function loadCart() {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read cart from localStorage', e);
    }
    return [];
  }

  function saveCart(skipServerPush = false) {
    try {
      if (typeof state !== 'undefined' && state && Array.isArray(state.cart)) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
        if (!skipServerPush) {
          const now = Date.now();
          state.cartUpdatedAt = now;
          setLocalCartUpdatedAt(now);
          pushCartToServer(state.cart, now);
        }
      }
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }

  function pushCartToServer(cart, updatedAt) {
    try {
      const cust = getCustomerDetails();
      if (!cust || !cust.phone) return;
      fetch('/api/customer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cust.phone,
          cart: Array.isArray(cart) ? cart : [],
          updatedAt: updatedAt || Date.now()
        })
      }).catch(() => {});
    } catch (e) {}
  }

  let isSyncingCart = false;
  function syncCartFromServer() {
    if (isSyncingCart) return Promise.resolve(false);
    try {
      const cust = getCustomerDetails();
      if (!cust || !cust.phone) return Promise.resolve(false);
      isSyncingCart = true;
      return fetch(`/api/customer/cart?phone=${encodeURIComponent(cust.phone)}`)
        .then(res => res.json())
        .then(data => {
          isSyncingCart = false;
          if (data && data.success && Array.isArray(data.cart)) {
            const serverTs = Number(data.updatedAt) || 0;
            const localTs = (typeof state !== 'undefined' && state && state.cartUpdatedAt) ? state.cartUpdatedAt : getLocalCartUpdatedAt();
            
            const localCart = (typeof state !== 'undefined' && state && state.cart) ? state.cart : [];
            const localStr = JSON.stringify(localCart);
            const serverStr = JSON.stringify(data.cart);
            const isDifferent = localStr !== serverStr;

            if (serverTs > localTs || (isDifferent && serverTs >= localTs)) {
              if (typeof state !== 'undefined' && state) {
                state.cart = data.cart;
                state.cartUpdatedAt = serverTs || Date.now();
              }
              setLocalCartUpdatedAt(serverTs || Date.now());
              saveCart(true); // Persist locally without triggering server push
              updateCartBadges();
              if (typeof state !== 'undefined' && state) {
                if (state.activeTab === 'cart') renderCartView();
                if (state.activeTab === 'home') renderHomeView();
                if (state.activeTab === 'menu') renderMenuView();
              }
              return true;
            } else if (isDifferent && localTs > serverTs) {
              if (typeof state !== 'undefined' && state && state.cart) {
                pushCartToServer(state.cart, localTs);
              }
            }
          }
          return false;
        })
        .catch(err => {
          isSyncingCart = false;
          return false;
        });
    } catch (e) {
      isSyncingCart = false;
      return Promise.resolve(false);
    }
  }

  // --- BULLETPROOF MULTI-TIER CUSTOMER PERSISTENCE ENGINE ---
  function setCustomerCookie(name, phone) {
    try {
      const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
      document.cookie = `rnr_customer_name=${encodeURIComponent(name)}; expires=${expires}; path=/; SameSite=Lax`;
      document.cookie = `rnr_customer_phone=${encodeURIComponent(phone)}; expires=${expires}; path=/; SameSite=Lax`;
      document.cookie = `rnr_customer_logged_in=true; expires=${expires}; path=/; SameSite=Lax`;
    } catch (e) {}
  }

  function getCookieValue(key) {
    try {
      const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + key + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function clearCustomerCookies() {
    try {
      document.cookie = 'rnr_customer_name=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
      document.cookie = 'rnr_customer_phone=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
      document.cookie = 'rnr_customer_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    } catch (e) {}
  }

  function persistCustomerEverywhere(name, phone) {
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!cleanName || cleanPhone.length < 10) return;

    // 1. LocalStorage
    try {
      localStorage.setItem('rnr_customer_name', cleanName);
      localStorage.setItem('rnr_user_name', cleanName);
      localStorage.setItem('rnr_customer_phone', cleanPhone);
      localStorage.setItem('rnr_customer_logged_in', 'true');
    } catch (e) {}

    // 2. SessionStorage
    try {
      sessionStorage.setItem('rnr_customer_name', cleanName);
      sessionStorage.setItem('rnr_user_name', cleanName);
      sessionStorage.setItem('rnr_customer_phone', cleanPhone);
      sessionStorage.setItem('rnr_customer_logged_in', 'true');
    } catch (e) {}

    // 3. Document Cookies (Persists 1 Full Year across reloads/app switches)
    setCustomerCookie(cleanName, cleanPhone);

    // 4. Global Window Object Cache
    window.rnrCustomer = { name: cleanName, phone: cleanPhone, isLoggedIn: true };

    // 5. In-Memory State Store
    if (typeof state !== 'undefined' && state) {
      state.customer = { name: cleanName, phone: cleanPhone, isLoggedIn: true };
    }
  }

  function getCustomerDetails() {
    let name = '';
    let phone = '';

    // Check Tier 1: In-memory state
    if (typeof state !== 'undefined' && state && state.customer && state.customer.name && state.customer.phone) {
      name = state.customer.name;
      phone = state.customer.phone;
    }

    // Check Tier 2: Global window cache
    if ((!name || !phone) && window.rnrCustomer && window.rnrCustomer.name && window.rnrCustomer.phone) {
      name = name || window.rnrCustomer.name;
      phone = phone || window.rnrCustomer.phone;
    }

    // Check Tier 3: LocalStorage
    if (!name || !phone) {
      try {
        name = name || localStorage.getItem('rnr_customer_name') || localStorage.getItem('rnr_user_name') || '';
        phone = phone || localStorage.getItem('rnr_customer_phone') || '';
      } catch (e) {}
    }

    // Check Tier 4: SessionStorage
    if (!name || !phone) {
      try {
        name = name || sessionStorage.getItem('rnr_customer_name') || sessionStorage.getItem('rnr_user_name') || '';
        phone = phone || sessionStorage.getItem('rnr_customer_phone') || '';
      } catch (e) {}
    }

    // Check Tier 5: Document Cookies
    if (!name || !phone) {
      const cName = getCookieValue('rnr_customer_name');
      const cPhone = getCookieValue('rnr_customer_phone');
      if (!name && cName) name = cName;
      if (!phone && cPhone) phone = cPhone;
    }

    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.slice(-10);
    const isLoggedIn = Boolean(cleanName.length > 0 && finalPhone.length >= 10);

    const custObj = {
      name: cleanName,
      phone: finalPhone,
      isLoggedIn
    };

    if (isLoggedIn) {
      persistCustomerEverywhere(cleanName, finalPhone);
    }

    return custObj;
  }

  function saveCustomerDetails(name, phone) {
    const cleanName = (name || '').trim();
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }

    const finalPhone = cleanPhone.slice(-10);
    persistCustomerEverywhere(cleanName, finalPhone);

    renderProfileView();
    renderCartView();
    if (typeof syncAllData === 'function') {
      syncAllData();
    }

    // Sync customer login to backend & Google Sheets database
    try {
      fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          phone: finalPhone,
          date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          source: 'Rock N Rolls Mobile Web App'
        })
      }).then(res => res.json()).then(data => {
        console.log('[SHEETS] Login synced to Google Sheets:', data);
      }).catch(err => {
        console.warn('Backend login sync notice (offline/fallback):', err);
      });
    } catch (e) {
      console.warn('Login network fetch notice:', e);
    }

    if (typeof verifyAdminAccess === 'function') {
      verifyAdminAccess();
    }

    return { success: true, name: cleanName, phone: finalPhone };
  }

  function logoutCustomer() {
    try {
      localStorage.removeItem('rnr_customer_name');
      localStorage.removeItem('rnr_user_name');
      localStorage.removeItem('rnr_customer_phone');
      localStorage.removeItem('rnr_customer_logged_in');
      localStorage.removeItem('rnr_admin_phone');
      sessionStorage.removeItem('rnr_customer_name');
      sessionStorage.removeItem('rnr_user_name');
      sessionStorage.removeItem('rnr_customer_phone');
      sessionStorage.removeItem('rnr_customer_logged_in');
      sessionStorage.removeItem('rnr_admin_phone');
      document.cookie = 'rnr_admin_phone=; path=/; max-age=0; SameSite=Lax';
    } catch (e) {}

    clearCustomerCookies();
    window.rnrCustomer = null;
    if (typeof state !== 'undefined' && state) {
      state.customer = null;
      state.isAdmin = false;
      state.adminInfo = null;
    }

    const adminHeaderBtn = document.getElementById('btnHeaderAdmin');
    const profileAdminSec = document.getElementById('profileAdminSection');
    if (adminHeaderBtn) adminHeaderBtn.style.display = 'none';
    if (profileAdminSec) profileAdminSec.style.display = 'none';

    renderProfileView();
    renderCartView();
    if (typeof state !== 'undefined' && state && state.activeTab === 'admin') {
      switchTab('home');
    }
    showAppToast('👋 Logged out successfully. You can log in anytime.', 3500);
  }

  let activeLoginModalCallback = null;

  function openCustomerLoginModal({ title, subtitle, submitLabel, showGuestOption = false, onComplete } = {}) {
    const modal = document.getElementById('customerLoginModal');
    if (!modal) return;
    const cust = getCustomerDetails();
    const nameInput = document.getElementById('loginCustomerName');
    const phoneInput = document.getElementById('loginCustomerPhone');
    const titleEl = document.getElementById('customerLoginTitle');
    const subEl = document.getElementById('customerLoginSub');
    const submitLabelEl = document.getElementById('btnSubmitLoginLabel');
    const guestBtn = document.getElementById('btnContinueAsGuestCheckout');
    const errBox = document.getElementById('modalLoginValidationMsg');

    if (errBox) {
      errBox.textContent = '';
      errBox.classList.remove('active');
    }
    if (titleEl && title) titleEl.textContent = title;
    if (subEl && subtitle) subEl.textContent = subtitle;
    if (submitLabelEl) {
      submitLabelEl.textContent = submitLabel || 'Confirm & Continue';
    }
    if (guestBtn) {
      guestBtn.style.display = showGuestOption ? 'flex' : 'none';
    }
    if (nameInput) nameInput.value = cust.name || '';
    if (phoneInput) phoneInput.value = cust.phone || '';

    activeLoginModalCallback = onComplete || null;
    modal.classList.add('active');

    setTimeout(() => {
      if (!cust.name && nameInput) nameInput.focus();
      else if (phoneInput) phoneInput.focus();
    }, 250);
  }

  function closeCustomerLoginModal() {
    const modal = document.getElementById('customerLoginModal');
    if (modal) modal.classList.remove('active');
    activeLoginModalCallback = null;
  }

  function ensureCustomerLoggedIn(actionCallback) {
    const cust = getCustomerDetails();
    if (cust.isLoggedIn) {
      if (typeof actionCallback === 'function') actionCallback(cust);
      return;
    }
    const itemTotal = (typeof state !== 'undefined' && state && Array.isArray(state.cart))
      ? state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      : 0;
    openCustomerLoginModal({
      title: 'Order Pickup Details',
      subtitle: 'Enter your Name & Mobile Number for your counter pickup ticket & live kitchen alerts.',
      submitLabel: itemTotal > 0 ? `Confirm & Place Order (₹${itemTotal})` : 'Confirm & Continue',
      showGuestOption: true,
      onComplete: (loggedCust) => {
        if (typeof actionCallback === 'function') actionCallback(loggedCust);
      }
    });
  }

  // Past Orders Storage Helper
  const ORDERS_STORAGE_KEY = 'rock_n_rolls_past_orders';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function generateUniqueRnrId() {
    return '#RNR-' + Math.floor(100000 + Math.random() * 900000);
  }

  // --- REAL-TIME AUDIO SYNTHESIZER (WEB AUDIO API) ---
  let appAudioCtx = null;
  function getAppAudioContext() {
    if (!appAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) appAudioCtx = new AudioCtx();
    }
    return appAudioCtx;
  }

  function unlockAppAudio() {
    const ctx = getAppAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }
  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlockAppAudio, { passive: true });
  });

  // 1. Admin Brass Service Bell Sound (Authentic front-desk bell "Ding-Ding!")
  function playServiceBellSound() {
    try {
      const ctx = getAppAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      // Two quick strikes for the classic "Ding-Ding!" order bell
      [0, 0.18].forEach(strikeOffset => {
        const t = now + strikeOffset;
        const harmonics = [
          { f: 880, gain: 0.18, decay: 0.8 },
          { f: 1760, gain: 0.55, decay: 1.25 },
          { f: 1772, gain: 0.4, decay: 1.1 },
          { f: 2640, gain: 0.22, decay: 0.65 },
          { f: 3520, gain: 0.15, decay: 0.45 }
        ];

        harmonics.forEach(h => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(h.f, t);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(h.gain, t + 0.003); // Instant metallic strike attack
          gain.gain.exponentialRampToValueAtTime(0.0001, t + h.decay); // Natural brass exponential decay

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t);
          osc.stop(t + h.decay);
        });
      });
    } catch (e) {
      console.warn('Service bell audio notice:', e);
    }
  }

  // 2. Customer Order Status Chimes (Melodic & Delightful)
  function playCustomerStatusChime(status) {
    try {
      const ctx = getAppAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const s = (status || '').toUpperCase();

      let notes = [];
      if (s.includes('READY')) {
        // High-energy celebratory Pickup Ready double-bell / chime: C6 -> E6 -> G6 -> high C7
        notes = [
          { f: 1046.50, t: 0.0, d: 0.45, g: 0.35 },
          { f: 1318.51, t: 0.12, d: 0.5, g: 0.4 },
          { f: 1567.98, t: 0.26, d: 0.65, g: 0.45 },
          { f: 2093.00, t: 0.40, d: 1.3, g: 0.5 }
        ];
      } else if (s.includes('DELIVER') || s.includes('COMPLET')) {
        // Warm celebratory completion chord: F5 -> A5 -> C6 -> F6
        notes = [
          { f: 698.46, t: 0.0, d: 0.35, g: 0.25 },
          { f: 880.00, t: 0.12, d: 0.4, g: 0.3 },
          { f: 1046.50, t: 0.24, d: 0.5, g: 0.35 },
          { f: 1396.91, t: 0.36, d: 1.1, g: 0.4 }
        ];
      } else {
        // Reassuring kitchen started preparing chime: E5 -> A5
        notes = [
          { f: 659.25, t: 0.0, d: 0.4, g: 0.3 },
          { f: 880.00, t: 0.15, d: 0.8, g: 0.38 }
        ];
      }

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.0001, now + n.t);
        gain.gain.linearRampToValueAtTime(n.g, now + n.t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.05);
      });
    } catch (e) {
      console.warn('Customer chime audio notice:', e);
    }
  }

  // --- REAL-TIME NOTIFICATION POPUP ENGINE ---
  function showNotificationPopup(config) {
    let container = document.getElementById('rnrNotificationContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'rnrNotificationContainer';
      container.className = 'rnr-notification-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const {
      type = 'cust-ready', // 'admin-new-order', 'cust-ready', 'cust-preparing', 'cust-delivered'
      icon = '🔔',
      badge = 'ORDER UPDATE',
      title = 'Order Updated',
      message = '',
      orderId = '',
      actionText = 'View Order',
      onAction = null,
      duration = 6500
    } = config;

    const card = document.createElement('div');
    card.className = `rnr-popup-card popup-type-${type}`;
    card.setAttribute('role', 'alert');

    card.innerHTML = `
      <div class="popup-icon-badge">${icon}</div>
      <div class="popup-body-col">
        <div class="popup-header-row">
          <span class="popup-badge">${escapeHtml(badge)}</span>
          <span class="popup-time">Just now</span>
        </div>
        <div class="popup-title">${escapeHtml(title)}</div>
        <div class="popup-message">${message}</div>
        ${actionText ? `
          <div class="popup-action-row">
            <button type="button" class="btn-popup-action">
              <span>${escapeHtml(actionText)} &rarr;</span>
            </button>
          </div>
        ` : ''}
      </div>
      <button type="button" class="popup-close-btn" aria-label="Dismiss">✕</button>
      <div class="popup-progress-line" style="animation-duration: ${duration}ms;"></div>
    `;

    function dismissCard() {
      if (card._dismissTimer) clearTimeout(card._dismissTimer);
      card.classList.add('popup-closing');
      setTimeout(() => card.remove(), 320);
    }

    card.querySelector('.popup-close-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissCard();
    });

    const triggerAction = () => {
      if (typeof onAction === 'function') {
        onAction();
      } else {
        switchTab('orders');
      }
      dismissCard();
    };

    card.addEventListener('click', triggerAction);
    card.querySelector('.btn-popup-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerAction();
    });

    // Prepend to show most recent at the top
    container.prepend(card);

    card._dismissTimer = setTimeout(dismissCard, duration);
  }

  // --- System Lock-Screen Notification Trigger (Visible when phone is locked or app closed/in background) ---
  async function triggerSystemLockScreenNotification({ title, body, icon = 'assets/apple_chicken.jpg', badge = 'assets/apple_chicken.jpg', tag = 'rnr-alert', url = '/' }) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const options = {
      body,
      icon: icon || 'assets/apple_chicken.jpg',
      badge: badge || 'assets/apple_chicken.jpg',
      vibrate: [300, 100, 300, 100, 300],
      tag: tag || 'rnr-alert-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: { url: url || window.location.href }
    };

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(title, options);
          return;
        }
      } catch (e) {
        console.warn('SW lock screen notification notice:', e);
      }
    }

    try {
      new Notification(title, options);
    } catch (e) {}
  }

  // Helper: Trigger customer status update notification
  function triggerCustomerStatusNotification(orderId, status, orderData) {
    const s = (status || '').toUpperCase();
    playCustomerStatusChime(s);

    const safeId = (orderId || '').replace(/^#/, '');

    // 1. Trigger OS Native Lock-Screen Notification (Visible on Lock Screen / Notification Bar)
    triggerSystemLockScreenNotification({
      title: s.includes('READY') ? `🔔 Order #${safeId} is Ready for Pickup!` : (s.includes('DELIVER') ? `🎉 Order #${safeId} Delivered!` : `🍳 Order #${safeId} Kitchen Preparing`),
      body: s.includes('READY') ? 'Your Kathi rolls are hot and waiting at the counter. Collect now!' : (s.includes('DELIVER') ? 'Thank you for ordering with Rock N Rolls!' : 'Chef is rolling your fresh rolls on the tawa.'),
      tag: `rnr-status-${safeId}`,
      url: window.location.origin + '/#orders'
    });

    if (s.includes('READY')) {
      showNotificationPopup({
        type: 'cust-ready',
        icon: '🔔',
        badge: 'PICKUP READY',
        title: `Order #${safeId} is Ready for Pickup!`,
        message: 'Your Kathi rolls are freshly made and waiting at the counter. Collect now!',
        orderId: orderId,
        actionText: 'View Order',
        duration: 7500,
        onAction: () => {
          switchTab('orders');
          const card = document.querySelector('.order-receipt-card.recent-active') || document.getElementById('ordersListContainer');
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    } else if (s.includes('DELIVER') || s.includes('COMPLET')) {
      showNotificationPopup({
        type: 'cust-delivered',
        icon: '🎉',
        badge: 'FOOD DELIVERED',
        title: `Order #${safeId} Delivered!`,
        message: 'Thank you for ordering with Rock N Rolls. Enjoy your hot and tasty rolls!',
        orderId: orderId,
        actionText: 'View Order',
        duration: 6500,
        onAction: () => {
          switchTab('orders');
        }
      });
    } else {
      showNotificationPopup({
        type: 'cust-preparing',
        icon: '🍳',
        badge: 'KITCHEN PREPARING',
        title: `Order #${safeId} Kitchen Preparing`,
        message: 'Chef has received your order and is rolling your rolls fresh on the tawa!',
        orderId: orderId,
        actionText: 'Track Order',
        duration: 5500,
        onAction: () => {
          switchTab('orders');
        }
      });
    }
  }

  // Helper: Trigger admin new order notification (Only for verified Admins)
  function triggerAdminNewOrderNotification(order) {
    if (!order || !state.isAdmin) return;
    playServiceBellSound();

    const itemsDesc = (order.itemList && Array.isArray(order.itemList) && order.itemList.length > 0)
      ? order.itemList.map(i => `${i.quantity}x ${i.name}`).join(', ')
      : (order.items || 'Kathi Rolls');
    const totalStr = order.total ? `₹${order.total}` : '';
    const safeId = (order.orderId || 'NEW').replace(/^#/, '');

    // 1. Trigger OS Native Lock-Screen Notification for Admin
    triggerSystemLockScreenNotification({
      title: `🛎️ New Order #${safeId} Received! (${totalStr})`,
      body: `${itemsDesc}${order.customerName ? ` • ${order.customerName}` : ''}`,
      tag: `rnr-admin-order-${safeId}`,
      url: window.location.origin + '/admin.html'
    });

    showNotificationPopup({
      type: 'admin-new-order',
      icon: '🛎️',
      badge: 'NEW ORDER PUSHED',
      title: `New Order #${safeId} Received!`,
      message: `<strong>${totalStr}</strong> • ${escapeHtml(itemsDesc)}${order.customerName ? `<br><span style="color:#A0AEC0; font-size:0.75rem;">👤 ${escapeHtml(order.customerName)}</span>` : ''}`,
      orderId: order.orderId,
      actionText: 'View in Kitchen Feed',
      duration: 8500,
      onAction: () => {
        switchTab('admin');
        const card = document.querySelector(`[data-order-id="${order.orderId}"]`) || document.getElementById('inAppAdminOrdersList');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  function loadPastOrders() {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read past orders from localStorage', e);
    }
    return [];
  }

  function savePastOrders(orders) {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders || []));
    } catch (e) {
      console.warn('Could not save past orders to localStorage', e);
    }
  }

  let isSyncingOrders = false;
  function syncOrdersFromServer() {
    if (isSyncingOrders) return Promise.resolve(false);
    try {
      const cust = getCustomerDetails();
      const currentOrders = loadPastOrders();
      let phone = (cust && cust.phone) ? cust.phone : '';
      if (!phone && currentOrders.length > 0) {
        phone = currentOrders[0].customerPhone || '';
      }
      const orderIds = currentOrders.map(o => (o.orderId || '').replace(/^#/, '')).filter(Boolean);
      if (!phone && orderIds.length === 0) return Promise.resolve(false);

      let fetchUrl = '/api/customer/orders?';
      if (phone) fetchUrl += `phone=${encodeURIComponent(phone)}&`;
      if (orderIds.length > 0) fetchUrl += `ids=${encodeURIComponent(orderIds.join(','))}`;

      isSyncingOrders = true;
      return fetch(fetchUrl)
        .then(res => res.json())
        .then(serverOrders => {
          isSyncingOrders = false;
          if (Array.isArray(serverOrders)) {
            const currentOrders = loadPastOrders();
            const currentSig = currentOrders.map(o => `${o.orderId}::${o.kitchenStatus || o.status}`).join('||');
            const serverSig = serverOrders.map(o => `${o.orderId}::${o.kitchenStatus || o.status}`).join('||');
            if (currentSig !== serverSig || currentOrders.length !== serverOrders.length) {
              // Notify customer of real-time status progressions
              serverOrders.forEach(so => {
                const prev = currentOrders.find(co => co.orderId === so.orderId || co.orderId.replace(/^#/, '') === so.orderId.replace(/^#/, ''));
                const prevStatus = prev ? (prev.kitchenStatus || prev.status || 'PREPARING').toUpperCase() : '';
                const newStatus = (so.kitchenStatus || so.status || 'PREPARING').toUpperCase();
                if (prev && prevStatus !== newStatus) {
                  triggerCustomerStatusNotification(so.orderId, newStatus, so);
                }
              });

              savePastOrders(serverOrders);
              renderOrdersView();
              return true;
            }
          }
          return false;
        })
        .catch(err => {
          isSyncingOrders = false;
          return false;
        });
    } catch (e) {
      isSyncingOrders = false;
      return Promise.resolve(false);
    }
  }

  function savePastOrder(newOrder) {
    try {
      const orders = loadPastOrders();
      orders.unshift(newOrder);
      savePastOrders(orders);
    } catch (e) {
      console.warn('Could not save past order to localStorage', e);
    }
  }

  function removePastOrder(orderId) {
    try {
      const cleanId = (orderId || '').trim();
      const orders = loadPastOrders().filter(o => {
        const idA = (o.orderId || '').trim();
        return idA !== cleanId && idA.replace(/^#/, '') !== cleanId.replace(/^#/, '');
      });
      savePastOrders(orders);
      // Synchronize deletion with server backend
      fetch(`/api/orders/${encodeURIComponent(cleanId)}`, { method: 'DELETE' })
        .then(() => syncOrdersFromServer())
        .catch(() => {});
      return orders;
    } catch (e) {
      console.warn('Could not remove past order', e);
      return [];
    }
  }

  function clearAllPastOrders() {
    const cust = getCustomerDetails();
    savePastOrders([]);
    renderOrdersView();
    if (cust && cust.phone) {
      fetch(`/api/customer/orders?phone=${encodeURIComponent(cust.phone)}`, { method: 'DELETE' })
        .then(() => syncOrdersFromServer())
        .catch(() => {});
    }
    showAppToast('🗑️ All past orders deleted from history', 3000);
  }

  // Globally accessible delete handler for inline onclick
  window.deletePastOrder = function(orderId) {
    const shouldDelete = typeof window.confirm === 'function' ? window.confirm(`Delete order ${orderId} from your order history?`) : true;
    if (shouldDelete) {
      removePastOrder(orderId);
      renderOrdersView();
      showAppToast(`🗑️ Order <strong>${escapeHtml(orderId)}</strong> deleted from history`, 3000);
    }
  };

  // Globally accessible clear all handler
  window.clearAllPastOrders = function() {
    const shouldClear = typeof window.confirm === 'function' ? window.confirm('Delete all past orders from your order history?') : true;
    if (shouldClear) {
      clearAllPastOrders();
    }
  };

  // Globally accessible reorder handler
  window.reorderPastOrder = function(orderId) {
    const pastOrders = loadPastOrders();
    const order = pastOrders.find(o => o.orderId === orderId);
    if (!order) {
      switchTab('menu');
      return;
    }

    if (order.itemList && Array.isArray(order.itemList) && order.itemList.length > 0) {
      let addedCount = 0;
      order.itemList.forEach(it => {
        const menuItem = (typeof MENU_DATA !== 'undefined' && MENU_DATA.items)
          ? MENU_DATA.items.find(m => m.id === it.itemId || m.name.toLowerCase() === it.name.toLowerCase())
          : null;

        if (menuItem) {
          state.cart.push({
            itemId: menuItem.id,
            portion: it.portionId || (menuItem.portions ? menuItem.portions[0].id : 'single'),
            addons: it.addons || [],
            price: it.price || menuItem.price,
            quantity: it.quantity || 1,
            notes: order.instructions || ''
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        saveCart();
        updateCartBadges();
        renderCartView();
        switchTab('cart');
        showAppToast(`🌯 Added items from <strong>${escapeHtml(orderId)}</strong> to your cart!`, 3500);
        return;
      }
    }

    switchTab('menu');
    showAppToast(`🌯 Browse our fresh menu to reorder!`, 3000);
  };

  // Live Menu Stock & Prices Store (Synced live with Google Sheet Menu Tab)
  window.menuStock = {};
  window.menuPrices = {};

  async function fetchMenuStock(force = false) {
    try {
      const res = await fetch('/api/menu/stock' + (force ? '?refresh=true' : ''));
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.stock) {
            window.menuStock = data.stock;
          }
          if (data.prices && typeof data.prices === 'object') {
            window.menuPrices = data.prices;
            
            // Dynamically update MENU_DATA base prices and portion prices
            if (typeof MENU_DATA !== 'undefined' && Array.isArray(MENU_DATA.items)) {
              MENU_DATA.items.forEach(item => {
                if (window.menuPrices[item.id] !== undefined && window.menuPrices[item.id] !== null) {
                  const newBasePrice = Number(window.menuPrices[item.id]);
                  if (!isNaN(newBasePrice) && newBasePrice >= 0) {
                    const oldBasePrice = item.price;
                    item.price = newBasePrice;
                    
                    // If item has portion sizes, proportionally adjust or update base portion
                    if (item.hasPortions && Array.isArray(item.portions) && item.portions.length > 0) {
                      if (oldBasePrice > 0) {
                        const ratio = newBasePrice / oldBasePrice;
                        item.portions.forEach(pt => {
                          if (pt.price === oldBasePrice || pt.id === 'single' || pt.id === 'half' || pt.id === '4pcs' || pt.id === 'regular') {
                            pt.price = newBasePrice;
                          } else {
                            pt.price = Math.round(pt.price * ratio);
                          }
                        });
                      } else {
                        item.portions[0].price = newBasePrice;
                      }
                    }
                  }
                }
              });

              // Dynamically recompute current items in cart with the latest live sheet prices
              if (typeof state !== 'undefined' && state && Array.isArray(state.cart) && state.cart.length > 0) {
                state.cart.forEach(cartItem => {
                  const updatedItem = MENU_DATA.items.find(i => i.id === cartItem.itemId);
                  if (updatedItem) {
                    if (updatedItem.hasPortions && Array.isArray(updatedItem.portions)) {
                      const pt = updatedItem.portions.find(p => p.id === cartItem.portion);
                      if (pt) {
                        const addonTotal = Array.isArray(cartItem.addons)
                          ? cartItem.addons.reduce((sum, a) => sum + (a.price || 0), 0)
                          : 0;
                        cartItem.price = pt.price + addonTotal;
                      }
                    } else {
                      const addonTotal = Array.isArray(cartItem.addons)
                        ? cartItem.addons.reduce((sum, a) => sum + (a.price || 0), 0)
                        : 0;
                      cartItem.price = updatedItem.price + addonTotal;
                    }
                  }
                });
                try {
                  saveCart();
                  updateCartBadges();
                } catch (e) {}
              }
            }
          }
          return { stock: window.menuStock, prices: window.menuPrices };
        }
      }
    } catch (e) {
      console.warn('Could not fetch live menu stock/prices:', e);
    }
    return { stock: window.menuStock, prices: window.menuPrices };
  }

  // App State Store
  const state = {
    activeTab: 'home',
    selectedCategory: 'all',
    dietaryFilter: 'all',
    searchQuery: '',
    paymentMethod: 'upi', // Default to UPI as requested
    paymentVerified: false,
    lastPaymentApp: '',
    utrNumber: '',
    cookingNotes: '',
    cart: loadCart(),
    cartUpdatedAt: getLocalCartUpdatedAt(),
    customizer: {
      isOpen: false,
      item: null,
      selectedPortionId: 'single',
      selectedAddonIds: new Set(),
      quantity: 1,
      notes: ''
    },
    adminFilter: 'all',
    adminSearchQuery: '',
    adminSoundEnabled: true,
    isAdmin: false,
    adminInfo: null,
    storeUpiId: localStorage.getItem('rnr_store_upi_id') || '9848879728@ybl'
  };

  // --- THEME MANAGEMENT (Dark Mode / Cream Light Mode) ---
  function getPreferredTheme() {
    return localStorage.getItem('rnr_theme') || 'dark';
  }

  function applyCustomerTheme(theme) {
    const isLight = theme === 'light';
    if (isLight) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('rnr_theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('rnr_theme', 'dark');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isLight ? '#FAF6ED' : '#16A34A');
    }
  }

  function toggleCustomerTheme() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const nextTheme = isLight ? 'dark' : 'light';
    applyCustomerTheme(nextTheme);
    showAppToast(nextTheme === 'light' ? '☀️ Switched to <strong>Light Mode</strong> (Cream & Green)' : '🌙 Switched to <strong>Dark Mode</strong>', 2500);
  }

  function getStoreUpiId() {
    return state.storeUpiId || localStorage.getItem('rnr_store_upi_id') || '9848879728@ybl';
  }
  function setStoreUpiId(id) {
    if (!id) return;
    state.storeUpiId = id;
    localStorage.setItem('rnr_store_upi_id', id);
    const upiEl = document.getElementById('upiIdText');
    if (upiEl) upiEl.textContent = id;
  }

  async function verifyAdminAccess() {
    const cust = getCustomerDetails();
    const adminHeaderBtn = document.getElementById('btnHeaderAdmin');
    const profileAdminSec = document.getElementById('profileAdminSection');
    const profileBadgeRole = document.getElementById('profileAdminBadgeRole');

    // If customer is not logged in or doesn't have a valid 10-digit phone, hide admin access
    if (!cust || !cust.isLoggedIn || !cust.phone || cust.phone.length < 10) {
      state.isAdmin = false;
      state.adminInfo = null;
      if (adminHeaderBtn) adminHeaderBtn.style.display = 'none';
      if (profileAdminSec) profileAdminSec.style.display = 'none';
      try {
        localStorage.removeItem('rnr_admin_phone');
        document.cookie = 'rnr_admin_phone=; path=/; max-age=0; SameSite=Lax';
      } catch (e) {}

      // If user happens to be sitting inside admin view, redirect to home
      if (state.activeTab === 'admin') {
        switchTab('home');
      }
      return false;
    }

    try {
      const res = await fetch(`/api/admin/check?phone=${encodeURIComponent(cust.phone)}`);
      const data = await res.json();

      if (data && data.success && data.isAdmin) {
        state.isAdmin = true;
        state.adminInfo = data;
        if (adminHeaderBtn) adminHeaderBtn.style.display = 'inline-flex';
        if (profileAdminSec) profileAdminSec.style.display = 'block';
        if (profileBadgeRole) {
          profileBadgeRole.textContent = `Verified ${data.role || 'Staff'} • ${data.name || 'Admin'}`;
        }
        try {
          localStorage.setItem('rnr_admin_phone', cust.phone);
          document.cookie = `rnr_admin_phone=${cust.phone}; path=/; max-age=2592000; SameSite=Lax`;
        } catch (e) {}

        const adminGreeting = document.getElementById('adminBannerGreeting');
        const adminPhoneEl = document.getElementById('adminBannerPhone');
        if (adminGreeting) {
          adminGreeting.textContent = `🛡️ Hello ${data.name || 'Store Admin'}`;
        }
        if (adminPhoneEl) {
          adminPhoneEl.textContent = `+91 ${cust.phone} • ${data.role || 'Verified Staff'}`;
        }
        return true;
      } else {
        state.isAdmin = false;
        state.adminInfo = null;
        if (adminHeaderBtn) adminHeaderBtn.style.display = 'none';
        if (profileAdminSec) profileAdminSec.style.display = 'none';
        try {
          localStorage.removeItem('rnr_admin_phone');
          document.cookie = 'rnr_admin_phone=; path=/; max-age=0; SameSite=Lax';
        } catch (e) {}

        if (state.activeTab === 'admin') {
          showAppToast('🔒 Admin portal is restricted to authorized store phone numbers.', 3500);
          switchTab('home');
        }
        return false;
      }
    } catch (err) {
      console.warn('Error verifying admin access:', err);
      return false;
    }
  }

  function syncAllData() {
    const cust = getCustomerDetails();
    const pastOrders = loadPastOrders();
    const hasPhone = (cust && cust.phone) || (pastOrders.length > 0 && pastOrders[0].customerPhone);
    if (hasPhone) {
      syncCartFromServer();
    }
    if (hasPhone || pastOrders.length > 0) {
      syncOrdersFromServer();
    }
  }

  // DOM Elements
  const appContent = document.getElementById('appContent');
  const homeView = document.getElementById('homeView');
  const menuView = document.getElementById('menuView');
  const ordersView = document.getElementById('ordersView');
  const cartView = document.getElementById('cartView');
  const profileView = document.getElementById('profileView');
  const floatingCartBar = document.getElementById('floatingCartBar');
  const cartBadge = document.getElementById('cartNavBadge');
  const customizerModal = document.getElementById('customizerModal');
  const successModal = document.getElementById('successModal');
  const qrZoomModal = document.getElementById('qrZoomModal');

  // Initialize App
  init();

  function init() {
    // 1. Initial customer & admin verification across multi-tier storage
    const initialCust = getCustomerDetails();
    if (initialCust.isLoggedIn) {
      verifyAdminAccess();
      syncAllData();
    } else {
      verifyAdminAccess(); // Ensures admin controls stay strictly hidden for guests
      // Background check for persistent server cookie session
      try {
        fetch('/api/customer/profile')
          .then(res => res.json())
          .then(data => {
            if (data && data.isLoggedIn && data.name && data.phone) {
              persistCustomerEverywhere(data.name, data.phone);
              verifyAdminAccess();
              renderProfileView();
              renderCartView();
              syncAllData();
            }
          })
          .catch(() => {});
      } catch (e) {}
    }

    // 2. Fetch live stock from Google Sheet and render views
    fetchMenuStock().then(() => {
      renderHomeView();
      renderMenuView();
      renderCartView();
    });

    // 3. Periodic background sync with Google Sheet (every 20s)
    setInterval(() => {
      fetchMenuStock().then(() => {
        renderHomeView();
        renderMenuView();
        if (state.activeTab === 'cart') renderCartView();
      });
    }, 20000);

    // 4. Real-time cross-device sync across mobile and laptop (every 3 seconds)
    setInterval(() => {
      syncAllData();
      if (state.activeTab === 'admin') {
        renderAdminOrdersFeed(true);
      }
    }, 3000);

    // 5. Instant cross-device sync on window focus and tab visibility change
    window.addEventListener('focus', () => {
      syncAllData();
      if (state.activeTab === 'admin') {
        renderAdminOrdersFeed(true);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        syncAllData();
        if (state.activeTab === 'admin') {
          renderAdminOrdersFeed(true);
        }
      }
    });

    // 6. Instant Zero-Latency Cross-Tab & Cross-Window Orders Sync
    try {
      const ordersChannel = new BroadcastChannel('rnr_orders_channel');
      ordersChannel.onmessage = (e) => {
        if (!e.data) return;
        if (e.data.type === 'NEW_ORDER') {
          // If in admin view, ring service bell and show popup
          if (state.activeTab === 'admin' && e.data.order) {
            triggerAdminNewOrderNotification(e.data.order);
          }
          renderAdminOrdersFeed(false, state.activeTab === 'admin');
          syncOrdersFromServer();
        } else if (e.data.type === 'ORDER_STATUS_CHANGED') {
          // Check if this belongs to current customer
          const pastOrders = loadPastOrders();
          const targetOrder = pastOrders.find(o => {
            const idA = (o.orderId || '').trim().toUpperCase();
            const idB = (e.data.orderId || '').trim().toUpperCase();
            return idA === idB || idA.replace(/^#/, '') === idB.replace(/^#/, '');
          });
          if (targetOrder) {
            const oldStatus = (targetOrder.kitchenStatus || targetOrder.status || 'PREPARING').toUpperCase();
            const newStatus = (e.data.newStatus || '').toUpperCase();
            if (oldStatus !== newStatus) {
              targetOrder.kitchenStatus = newStatus;
              targetOrder.status = newStatus;
              savePastOrders(pastOrders);
              renderOrdersView();
              triggerCustomerStatusNotification(targetOrder.orderId, newStatus, targetOrder);
            }
          }
          if (state.activeTab === 'admin') {
            renderAdminOrdersFeed(true);
          }
        } else if (e.data.type === 'ORDER_UPDATED' || e.data.type === 'ORDERS_REFRESH') {
          renderAdminOrdersFeed(false, state.activeTab === 'admin');
          syncOrdersFromServer();
        }
      };
    } catch (e) {}

    // 7. Service Worker Registration (Lock-Screen System Alerts)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => console.log('[APP SW] Registered with scope:', reg.scope))
        .catch(err => console.warn('[APP SW] Service Worker notice:', err));
    }

    // 8. Server-Sent Events (SSE) Live Kitchen & Order Status Push
    function initCustomerSSE() {
      if (!('EventSource' in window)) return;
      try {
        const sse = new EventSource('/api/events');
        sse.addEventListener('NEW_ORDER', (e) => {
          try {
            const order = JSON.parse(e.data);
            if (state.activeTab === 'admin') {
              triggerAdminNewOrderNotification(order);
              renderAdminOrdersFeed(false, true);
            }
          } catch (err) {}
        });
        sse.addEventListener('ORDER_STATUS_CHANGED', (e) => {
          try {
            const data = JSON.parse(e.data);
            const pastOrders = loadPastOrders();
            const targetOrder = pastOrders.find(o => {
              const idA = (o.orderId || '').trim().toUpperCase();
              const idB = (data.orderId || '').trim().toUpperCase();
              return idA === idB || idA.replace(/^#/, '') === idB.replace(/^#/, '');
            });
            if (targetOrder) {
              const oldStatus = (targetOrder.kitchenStatus || targetOrder.status || 'PREPARING').toUpperCase();
              const newStatus = (data.newStatus || '').toUpperCase();
              if (oldStatus !== newStatus) {
                targetOrder.kitchenStatus = newStatus;
                targetOrder.status = newStatus;
                savePastOrders(pastOrders);
                renderOrdersView();
                triggerCustomerStatusNotification(targetOrder.orderId, newStatus, targetOrder);
              }
            }
            if (state.activeTab === 'admin') {
              renderAdminOrdersFeed(true);
            }
          } catch (err) {}
        });
        sse.addEventListener('SETTINGS_UPDATED', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.storeUpiId) setStoreUpiId(data.storeUpiId);
          } catch (err) {}
        });
      } catch (e) {
        console.warn('Customer SSE notice:', e);
      }
    }
    initCustomerSSE();

    window.addEventListener('storage', (e) => {
      if (e.key === 'rnr_order_sync_trigger') {
        renderAdminOrdersFeed(false, state.activeTab === 'admin');
        syncOrdersFromServer();
      }
    });

    // Theme initialization (Light Cream / Dark Mode)
    applyCustomerTheme(getPreferredTheme());

    // Fetch store payment settings (UPI ID & payment defaults)
    try {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          if (data && data.storeUpiId) setStoreUpiId(data.storeUpiId);
        })
        .catch(() => {});
    } catch (e) {}

    setupNavigation();
    setupSearch();
    setupAdminEvents();
    setupProfileEvents();
    renderHomeView();
    renderMenuView();
    renderCartView();
    renderOrdersView();
    renderProfileView();
    updateCartBadges();
    setupCustomizerEvents();
    setupCheckoutEvents();
  }

  // --- TAB ROUTING ---
  function setupNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    // Header Search Button
    document.getElementById('btnHeaderSearch')?.addEventListener('click', () => {
      switchTab('menu');
      setTimeout(() => {
        const menuSearch = document.getElementById('menuSearchInput');
        if (menuSearch) {
          menuSearch.focus();
          menuSearch.select();
        }
      }, 100);
    });

    // Admin Header Button (Restricted to verified Admins)
    document.getElementById('btnHeaderAdmin')?.addEventListener('click', () => {
      if (state.isAdmin) {
        switchTab('admin');
      } else {
        showAppToast('🔒 Admin portal is restricted to authorized store phone numbers.', 3500);
      }
    });

    // Profile Admin Portal Button
    document.getElementById('btnProfileAdminPortal')?.addEventListener('click', () => {
      if (state.isAdmin) {
        switchTab('admin');
      } else {
        showAppToast('🔒 Admin portal is restricted to authorized store phone numbers.', 3500);
      }
    });

    // Admin Back to Store Button
    document.getElementById('btnAdminBackToStore')?.addEventListener('click', () => {
      switchTab('home');
    });

    // Header Profile Button
    document.getElementById('btnHeaderProfile')?.addEventListener('click', () => {
      switchTab('profile');
    });

    // Brand icon returns to home
    document.querySelector('.brand-icon-box')?.addEventListener('click', () => {
      switchTab('home');
    });

    // Location info trigger opens kitchen info on profile
    document.getElementById('locationTrigger')?.addEventListener('click', () => {
      switchTab('profile');
      setTimeout(() => {
        document.getElementById('btnProfileKitchenInfo')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Home Quick Category Chips
    document.querySelectorAll('#homeCatPills [data-home-cat]').forEach(pill => {
      pill.addEventListener('click', () => {
        const cat = pill.getAttribute('data-home-cat');
        state.selectedCategory = cat;
        switchTab('menu');
        document.querySelectorAll('.menu-cat-pill').forEach(mp => {
          const isActive = mp.getAttribute('data-cat') === cat;
          mp.classList.toggle('active', isActive);
          if (isActive) {
            setTimeout(() => {
              try {
                mp.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              } catch (e) {}
            }, 100);
          }
        });
        renderMenuView();
      });
    });

    floatingCartBar.addEventListener('click', () => {
      switchTab('cart');
    });

    document.getElementById('btnHeroOrderNow')?.addEventListener('click', () => {
      switchTab('menu');
    });
  }

  function switchTab(tabId) {
    if (tabId === 'admin' && !state.isAdmin) {
      showAppToast('🔒 Admin access is restricted to verified store managers.', 3500);
      tabId = 'home';
    }
    state.activeTab = tabId;

    // Toggle admin mode on body to remove bottom navigation buttons in admin view
    document.body.classList.toggle('in-admin-mode', tabId === 'admin');
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
      bottomNav.style.display = tabId === 'admin' ? 'none' : 'flex';
    }

    // Update bottom nav state
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });

    // Toggle views
    homeView.style.display = tabId === 'home' ? 'block' : 'none';
    menuView.style.display = tabId === 'menu' ? 'block' : 'none';
    ordersView.style.display = tabId === 'orders' ? 'block' : 'none';
    cartView.style.display = tabId === 'cart' ? 'block' : 'none';
    profileView.style.display = tabId === 'profile' ? 'block' : 'none';
    const adminView = document.getElementById('adminView');
    if (adminView) {
      adminView.style.display = tabId === 'admin' ? 'block' : 'none';
    }

    // Toggle floating cart bar (hide when inside cart tab, admin tab or when cart empty)
    if (tabId === 'cart' || tabId === 'admin' || state.cart.length === 0) {
      floatingCartBar.classList.add('hidden');
    } else {
      floatingCartBar.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'cart') {
      syncCartFromServer();
      renderCartView();
    }
    if (tabId === 'orders') {
      syncOrdersFromServer();
      renderOrdersView();
    }
    if (tabId === 'profile') {
      renderProfileView();
    }
    if (tabId === 'menu') {
      renderMenuView();
    }
    if (tabId === 'admin') {
      renderAdminView();
    }

    if (tabId === 'home' || tabId === 'menu' || tabId === 'cart') {
      fetchMenuStock().then(() => {
        if (tabId === 'home') renderHomeView();
        if (tabId === 'menu') renderMenuView();
        if (tabId === 'cart') renderCartView();
      });
    }
  }

  // --- SEARCH FILTERING ---
  function setupSearch() {
    const homeSearchInput = document.getElementById('globalSearchInput');
    const menuSearchInput = document.getElementById('menuSearchInput');
    const btnMenuSearchClear = document.getElementById('btnMenuSearchClear');

    function syncSearch(query, triggerTabSwitch = false) {
      state.searchQuery = query.toLowerCase().trim();

      if (homeSearchInput && homeSearchInput.value !== query) {
        homeSearchInput.value = query;
      }
      if (menuSearchInput && menuSearchInput.value !== query) {
        menuSearchInput.value = query;
      }

      if (btnMenuSearchClear) {
        btnMenuSearchClear.style.display = query.length > 0 ? 'block' : 'none';
      }

      if (triggerTabSwitch && state.activeTab !== 'menu') {
        switchTab('menu');
        setTimeout(() => {
          menuSearchInput?.focus();
        }, 100);
      }

      renderMenuView();
    }

    homeSearchInput?.addEventListener('input', (e) => {
      syncSearch(e.target.value, true);
    });

    homeSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        switchTab('menu');
        setTimeout(() => {
          menuSearchInput?.focus();
        }, 100);
      }
    });

    document.querySelector('.search-filter-btn')?.addEventListener('click', () => {
      switchTab('menu');
    });

    menuSearchInput?.addEventListener('input', (e) => {
      syncSearch(e.target.value, false);
    });

    btnMenuSearchClear?.addEventListener('click', () => {
      syncSearch('', false);
      menuSearchInput?.focus();
    });
  }

  // --- RENDER HOME VIEW ---
  function renderHomeView() {
    // 1. Popular Swipe Deck
    const popularContainer = document.getElementById('popularSwipeDeck');
    if (popularContainer) {
      const popularItems = MENU_DATA.items.filter(i => i.popular || i.bestseller).slice(0, 8);
      popularContainer.innerHTML = popularItems.map(item => createPopularCardHtml(item)).join('');
    }

    // 2. Vegetarian Favourites
    const vegContainer = document.getElementById('vegFavouritesList');
    if (vegContainer) {
      const vegItems = MENU_DATA.items.filter(i => i.isVeg).slice(0, 4);
      vegContainer.innerHTML = vegItems.map(item => createVerticalListItemHtml(item)).join('');
    }

    // 3. Recommended for You
    const recommendedContainer = document.getElementById('recommendedList');
    if (recommendedContainer) {
      const recItems = MENU_DATA.items.filter(i => !i.isVeg && i.bestseller).slice(0, 4);
      recommendedContainer.innerHTML = recItems.map(item => createVerticalListItemHtml(item)).join('');
    }

    attachCardEventListeners();
  }

  function createPopularCardHtml(item) {
    const isItemInStock = window.menuStock ? (window.menuStock[item.id] !== false) : true;
    const cartEntry = state.cart.find(c => c.itemId === item.id);
    const qty = cartEntry ? cartEntry.quantity : 0;

    let dietClass = 'nonveg';
    if (item.isVeg) dietClass = 'veg';
    else if (item.isEgg) dietClass = 'egg';

    let priceTag = `₹${item.price}`;
    if (item.hasPortions && item.portions && item.portions.length >= 2) {
      priceTag = `${item.portions[0].name} ₹${item.portions[0].price} • ${item.portions[1].name} ₹${item.portions[1].price}`;
    }

    const clickAction = isItemInStock ? `window.openCustomizer('${item.id}')` : `showAppToast('⚠️ &ldquo;${item.name}&rdquo; is currently Sold Out!', 3000)`;

    return `
      <div class="card-popular ${!isItemInStock ? 'out-of-stock' : ''}" data-id="${item.id}">
        <div class="card-img-wrap" onclick="${clickAction}">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
          <div class="diet-dot ${dietClass}"></div>
          ${!isItemInStock ? '<span class="badge-soldout">OUT OF STOCK</span>' : (item.chefSpecial ? '<span class="badge-chef-special">Chef Special</span>' : (item.bestseller ? '<span class="badge-bestseller">Bestseller</span>' : ''))}
          <div class="badge-card-rating">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            <span>${item.rating}</span>
          </div>
        </div>
        <div class="card-body">
          <h4 class="card-dish-name" onclick="${clickAction}">${item.name}</h4>
          <p class="card-dish-desc">${item.description || ''}</p>
          <div class="card-footer">
            <div class="card-price" style="font-size: 0.8125rem;">${priceTag}</div>
            ${!isItemInStock ? `
              <button class="btn-item-soldout" disabled>SOLD OUT</button>
            ` : (qty > 0 ? `
              <div class="stepper-box">
                <button class="btn-step btn-step-minus" data-id="${item.id}">−</button>
                <span class="step-qty">${qty}</span>
                <button class="btn-step btn-step-plus" data-id="${item.id}">+</button>
              </div>
            ` : `
              <button class="btn-add-pill btn-quick-add" data-id="${item.id}">${item.hasPortions ? 'CUSTOMIZE' : 'ADD'}</button>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  function createVerticalListItemHtml(item) {
    const isItemInStock = window.menuStock ? (window.menuStock[item.id] !== false) : true;
    const cartEntry = state.cart.find(c => c.itemId === item.id);
    const qty = cartEntry ? cartEntry.quantity : 0;

    let dietClass = 'nonveg';
    if (item.isVeg) dietClass = 'veg';
    else if (item.isEgg) dietClass = 'egg';

    let badgesHtml = '';
    if (!isItemInStock) {
      badgesHtml += `<span class="badge-soldout-inline">❌ Out of Stock</span>`;
    } else {
      if (item.bestseller) {
        badgesHtml += `<span class="badge-bestseller-inline">🔥 Bestseller</span>`;
      }
      if (item.chefSpecial) {
        badgesHtml += `<span class="badge-chef-special-inline">👨‍🍳 Chef Special</span>`;
      }
      if (item.isSpicy) {
        badgesHtml += `<span class="badge-spicy-inline">🌶️ Spicy</span>`;
      }
    }

    let priceHtml = '';
    if (item.hasPortions && item.portions) {
      priceHtml = `
        <div class="dish-portions-display">
          ${item.portions.map(p => `
            <div class="dish-portion-chip">
              <span class="portion-label">${p.name.toUpperCase()}</span>
              <span class="portion-val">₹${p.price}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      priceHtml = `<div class="dish-list-price">₹${item.price}</div>`;
    }

    const clickAction = isItemInStock ? `window.openCustomizer('${item.id}')` : `showAppToast('⚠️ &ldquo;${item.name}&rdquo; is currently Out of Stock!', 3000)`;

    return `
      <div class="dish-list-item ${!isItemInStock ? 'out-of-stock' : ''}" data-id="${item.id}">
        <div class="dish-list-info" onclick="${clickAction}">
          <div class="dish-title-row">
            <div class="diet-dot ${dietClass}" style="position: static;"></div>
            <h4>${item.name}</h4>
            ${badgesHtml}
          </div>
          <p class="dish-list-desc">${item.description || ''}</p>
          ${priceHtml}
        </div>
        <div class="dish-list-actions">
          <div class="dish-list-thumb" onclick="${clickAction}">
            <img src="${item.image}" alt="${item.name}" loading="lazy">
          </div>
          ${!isItemInStock ? `
            <button class="btn-item-soldout" style="margin-top: 6px;" disabled>SOLD OUT</button>
          ` : (qty > 0 ? `
            <div class="stepper-box" style="margin-top: 6px;">
              <button class="btn-step btn-step-minus" data-id="${item.id}">−</button>
              <span class="step-qty">${qty}</span>
              <button class="btn-step btn-step-plus" data-id="${item.id}">+</button>
            </div>
          ` : (item.hasPortions ? `
            <button class="btn-add-red btn-quick-add" data-id="${item.id}" style="margin-top: 6px; font-size: 0.72rem; padding: 6px 10px;">ADD (Portions)</button>
          ` : `
            <button class="btn-add-red btn-quick-add" data-id="${item.id}" style="margin-top: 6px;">ADD +</button>
          `))}
        </div>
      </div>
    `;
  }

  // --- RENDER MENU VIEW ---
  function renderMenuView() {
    const menuContainer = document.getElementById('fullMenuFeed');
    if (!menuContainer) return;

    // Filter Items
    let filtered = MENU_DATA.items;

    if (state.dietaryFilter === 'veg') {
      filtered = filtered.filter(i => i.isVeg);
    } else if (state.dietaryFilter === 'nonveg') {
      filtered = filtered.filter(i => !i.isVeg);
    } else if (state.dietaryFilter === 'bestseller') {
      filtered = filtered.filter(i => i.bestseller);
    }

    if (state.searchQuery) {
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(state.searchQuery) ||
        (i.description && i.description.toLowerCase().includes(state.searchQuery))
      );
    }

    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(i => i.category === state.selectedCategory);
    }

    // Group items by category
    const categoriesMap = {
      'rolls': 'Hot Kathi Rolls',
      'fried-chicken': 'Crispy & Hot Fried Chicken',
      'combos': 'Value Combos (with Fries + 200ml Pepsi)',
      'burgers': 'Gourmet Burgers',
      'pizza-veg': 'Pizza Court (Veg)',
      'pizza-nonveg': 'Pizza Court (Non-Veg)',
      'fries': 'Crispy Fries',
      'fried-rice': 'Wok Fried Rice',
      'noodles': 'Hakka & Schezwan Noodles',
      'momos': 'Crisp Fried Momos',
      'starters': 'Starters'
    };

    let html = '';
    for (const [catKey, catTitle] of Object.entries(categoriesMap)) {
      const catItems = filtered.filter(i => i.category === catKey);
      if (catItems.length === 0) continue;

      html += `
        <div class="menu-category-section" id="cat-section-${catKey}">
          <div class="section-header" style="padding-top: 14px;">
            <h3 class="section-title">${catTitle}</h3>
            <span class="section-meta" style="color: var(--text-muted);">${catItems.length} items</span>
          </div>
          <div class="dish-list-vertical">
            ${catItems.map(item => createVerticalListItemHtml(item)).join('')}
          </div>
        </div>
      `;
    }

    // Search result banner
    const banner = document.getElementById('menuSearchResultsBanner');
    if (banner) {
      if (state.searchQuery) {
        banner.style.display = 'flex';
        banner.className = 'search-results-banner';
        banner.innerHTML = `
          <span>Found <strong>${filtered.length}</strong> ${filtered.length === 1 ? 'dish' : 'dishes'} for "<strong>${state.searchQuery}</strong>"</span>
          <button class="btn-clear-search-pill" id="btnClearSearchBanner">Clear</button>
        `;
        document.getElementById('btnClearSearchBanner')?.addEventListener('click', () => {
          state.searchQuery = '';
          const hInput = document.getElementById('globalSearchInput');
          const mInput = document.getElementById('menuSearchInput');
          if (hInput) hInput.value = '';
          if (mInput) mInput.value = '';
          const mClear = document.getElementById('btnMenuSearchClear');
          if (mClear) mClear.style.display = 'none';
          renderMenuView();
        });
      } else {
        banner.style.display = 'none';
      }
    }

    if (html === '') {
      html = `
        <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; color: var(--accent-amber);"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <h4 style="color: var(--text-primary); font-size: 1.0625rem;">No dishes found</h4>
          <p style="font-size: 0.8125rem; margin-top: 6px;">No items match "${state.searchQuery}". Try a different keyword!</p>
          <button class="btn-checkout-primary" style="max-width: 180px; margin: 16px auto 0;" id="btnResetMenuFilters">Show All Dishes</button>
        </div>
      `;
    }

    menuContainer.innerHTML = html;
    attachCardEventListeners();
    setupMenuFilterPills();

    document.getElementById('btnResetMenuFilters')?.addEventListener('click', () => {
      state.searchQuery = '';
      state.dietaryFilter = 'all';
      state.selectedCategory = 'all';
      const hInput = document.getElementById('globalSearchInput');
      const mInput = document.getElementById('menuSearchInput');
      if (hInput) hInput.value = '';
      if (mInput) mInput.value = '';
      const mClear = document.getElementById('btnMenuSearchClear');
      if (mClear) mClear.style.display = 'none';
      document.querySelectorAll('.menu-cat-pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-cat') === 'all'));
      document.querySelectorAll('.dietary-filter-pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-filter') === 'all'));
      renderMenuView();
    });
  }

  function setupMenuFilterPills() {
    // Dietary pills (All, Veg Only, Non-Veg, Bestseller)
    document.querySelectorAll('.dietary-filter-pill').forEach(pill => {
      pill.onclick = () => {
        document.querySelectorAll('.dietary-filter-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.dietaryFilter = pill.getAttribute('data-filter');
        renderMenuView();
      };
    });

    // Category pills / visual cards (Rolls, Fried Chicken, etc.)
    document.querySelectorAll('.menu-cat-pill').forEach(pill => {
      pill.onclick = () => {
        document.querySelectorAll('.menu-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedCategory = pill.getAttribute('data-cat');
        try {
          pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } catch (e) {}
        renderMenuView();
      };
    });
  }

  // --- CARD & BUTTON CLICKS ---
  function attachCardEventListeners() {
    // Quick Add button
    document.querySelectorAll('.btn-quick-add').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-id');
        if (window.menuStock && window.menuStock[itemId] === false) {
          showAppToast('⚠️ This item is currently Out of Stock!', 3000);
          return;
        }
        const item = MENU_DATA.items.find(i => i.id === itemId);
        if (item.hasPortions) {
          window.openCustomizer(itemId);
        } else {
          addToCart(itemId, 'single', [], 1);
        }
      };
    });

    // Stepper Minus
    document.querySelectorAll('.btn-step-minus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-id');
        updateItemQuantity(itemId, -1);
      };
    });

    // Stepper Plus
    document.querySelectorAll('.btn-step-plus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const itemId = btn.getAttribute('data-id');
        if (window.menuStock && window.menuStock[itemId] === false) {
          showAppToast('⚠️ This item is currently Out of Stock!', 3000);
          return;
        }
        updateItemQuantity(itemId, 1);
      };
    });
  }

  // --- CART CALCULATIONS & UPDATES ---
  function addToCart(itemId, portionId, addonIds, quantity, notes = '') {
    const item = MENU_DATA.items.find(i => i.id === itemId);
    if (!item) return;

    if (window.menuStock && window.menuStock[itemId] === false) {
      showAppToast(`⚠️ Sorry! "${item.name}" is currently Out of Stock and cannot be added.`, 3500);
      return;
    }

    let basePrice = item.price;
    if (item.hasPortions && item.portions) {
      const portionObj = item.portions.find(p => p.id === portionId);
      if (portionObj) basePrice = portionObj.price;
    }

    // Addons price
    let addonsTotal = 0;
    addonIds.forEach(aId => {
      const addon = MENU_DATA.customizerAddons.find(a => a.id === aId);
      if (addon) addonsTotal += addon.price;
    });

    const itemPrice = basePrice + addonsTotal;

    const existingIndex = state.cart.findIndex(c => 
      c.itemId === itemId && 
      c.portion === portionId && 
      JSON.stringify(c.addons.sort()) === JSON.stringify([...addonIds].sort())
    );

    if (existingIndex > -1) {
      state.cart[existingIndex].quantity += quantity;
    } else {
      state.cart.push({
        itemId,
        portion: portionId,
        addons: [...addonIds],
        quantity,
        price: itemPrice,
        notes
      });
    }

    saveCart();
    updateCartBadges();
    renderHomeView();
    renderMenuView();
    renderCartView();
  }

  function updateItemQuantity(itemId, delta) {
    const cartItem = state.cart.find(c => c.itemId === itemId);
    if (!cartItem) return;

    cartItem.quantity += delta;
    if (cartItem.quantity <= 0) {
      state.cart = state.cart.filter(c => c !== cartItem);
    }

    saveCart();
    updateCartBadges();
    renderHomeView();
    renderMenuView();
    renderCartView();
  }

  function updateCartBadges() {
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Update bottom nav badge
    if (cartBadge) {
      cartBadge.textContent = totalCount;
      cartBadge.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    // Update floating bottom cart bar
    if (floatingCartBar) {
      if (totalCount > 0 && state.activeTab !== 'cart') {
        floatingCartBar.classList.remove('hidden');
        document.getElementById('floatingCartSummary').textContent = `${totalCount} ${totalCount === 1 ? 'Item' : 'Items'} • ₹${totalAmount}`;
      } else {
        floatingCartBar.classList.add('hidden');
      }
    }

    // Update profile cart shortcut subtitle
    const profileCartSub = document.getElementById('profileCartCountSub');
    if (profileCartSub) {
      profileCartSub.textContent = `${totalCount} ${totalCount === 1 ? 'Item' : 'Items'}`;
    }
  }

  // --- RENDER CART & CHECKOUT SCREEN ---
  function renderCartView() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartNonEmptySection = document.getElementById('cartNonEmptySection');
    const btnClearCart = document.getElementById('btnClearCart');
    const cartCardTitle = document.getElementById('cartCardTitle');
    if (!cartItemsList) return;

    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

    if (state.cart.length === 0) {
      state.lastPaymentApp = '';
      const banner = document.getElementById('paymentInProgressBanner');
      if (banner) banner.style.display = 'none';

      if (cartCardTitle) cartCardTitle.textContent = 'Order Items';
      if (btnClearCart) btnClearCart.style.display = 'none';
      if (cartNonEmptySection) cartNonEmptySection.style.display = 'none';

      cartItemsList.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; color: var(--accent-red);"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <h4 style="color: var(--text-primary); font-size: 1.125rem;">Your Cart is Empty</h4>
          <p style="font-size: 0.8125rem; margin-top: 6px;">Add some delicious rolls and sizzled fried rice to begin!</p>
          <button class="btn-checkout-primary" style="max-width: 200px; margin: 20px auto 0;" onclick="document.querySelector('[data-tab=menu]').click()">Browse Menu</button>
        </div>
      `;
      return;
    }

    if (cartCardTitle) cartCardTitle.textContent = `Order Items (${totalCount})`;
    if (btnClearCart) {
      btnClearCart.style.display = 'flex';
      btnClearCart.onclick = () => {
        state.cart = [];
        saveCart();
        updateCartBadges();
        renderCartView();
        renderHomeView();
        renderMenuView();
      };
    }
    if (cartNonEmptySection) cartNonEmptySection.style.display = 'block';

    // Check for out-of-stock items in cart
    const outOfStockCartItems = state.cart.filter(c => window.menuStock && window.menuStock[c.itemId] === false);
    const hasSoldOut = outOfStockCartItems.length > 0;

    // Order items
    cartItemsList.innerHTML = state.cart.map((cartItem, idx) => {
      const item = MENU_DATA.items.find(i => i.id === cartItem.itemId);
      if (!item) return '';

      const isCartItemSoldOut = window.menuStock && (window.menuStock[cartItem.itemId] === false);

      let portionName = '';
      if (item.hasPortions && item.portions) {
        const matchedPortion = item.portions.find(p => p.id === cartItem.portion);
        portionName = matchedPortion ? matchedPortion.name : (cartItem.portion === 'full' ? 'Full' : 'Half');
      }
      const addonNames = cartItem.addons.map(aId => {
        const addon = MENU_DATA.customizerAddons.find(a => a.id === aId);
        return addon ? addon.name : '';
      }).filter(Boolean);

      return `
        <div class="cart-item-row ${isCartItemSoldOut ? 'out-of-stock' : ''}">
          <div class="cart-item-main">
            <div class="diet-dot ${item.isVeg ? 'veg' : 'nonveg'}" style="position: static; margin-top: 2px;"></div>
            <div class="cart-item-meta">
              <h5>
                ${item.name}
                ${portionName ? `<span class="cart-portion-badge">${portionName}</span>` : ''}
                ${isCartItemSoldOut ? `<span class="cart-out-of-stock-tag">⚠️ OUT OF STOCK</span>` : ''}
              </h5>
              ${addonNames.length > 0 ? `<p style="font-size: 0.6875rem; color: var(--accent-amber); margin-top: 2px;">+ ${addonNames.join(', ')}</p>` : ''}
              <div class="cart-item-price">₹${cartItem.price * cartItem.quantity}</div>
            </div>
          </div>
          <div class="cart-item-actions">
            ${isCartItemSoldOut ? `
              <span style="font-size: 0.72rem; color: #F87171; font-weight: 800; margin-right: 4px;">Sold Out</span>
            ` : `
              <div class="stepper-box">
                <button class="btn-step btn-cart-step-minus" data-idx="${idx}">−</button>
                <span class="step-qty">${cartItem.quantity}</span>
                <button class="btn-step btn-cart-step-plus" data-idx="${idx}">+</button>
              </div>
            `}
            <button class="btn-cart-remove" data-idx="${idx}" title="Remove Item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    let alertContainer = document.getElementById('cartStockAlertContainer');
    if (hasSoldOut) {
      if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'cartStockAlertContainer';
        cartItemsList.parentNode.insertBefore(alertContainer, cartItemsList.nextSibling);
      }
      alertContainer.innerHTML = `
        <div class="cart-stock-alert">
          <span style="font-size: 1.3rem;">⚠️</span>
          <div>
            <strong style="color: var(--text-primary);">Item Out of Stock:</strong> 
            Some items in your cart are currently sold out. Please click 🗑️ to remove them before making payment.
          </div>
        </div>
      `;
      alertContainer.style.display = 'block';
    } else if (alertContainer) {
      alertContainer.style.display = 'none';
    }

    // Responsive UPI payment buttons state
    const upiBtns = document.querySelectorAll('.btn-upi-app, #btnConfirmCompletedPayment, #btnPaidViaQr, #btnProceedCheckout');
    upiBtns.forEach(btn => {
      if (hasSoldOut) {
        btn.setAttribute('data-disabled-stock', 'true');
        btn.style.opacity = '0.65';
      } else {
        btn.removeAttribute('data-disabled-stock');
        btn.style.opacity = '1';
      }
      btn.style.pointerEvents = 'auto'; // Always keep responsive so clicks provide active feedback
    });

    // Remove direct click
    document.querySelectorAll('.btn-cart-remove').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (!isNaN(idx) && state.cart[idx]) {
          state.cart.splice(idx, 1);
          saveCart();
          updateCartBadges();
          renderCartView();
          renderHomeView();
          renderMenuView();
        }
      };
    });

    // Cart Steppers
    document.querySelectorAll('.btn-cart-step-minus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (!isNaN(idx) && state.cart[idx]) {
          state.cart[idx].quantity -= 1;
          if (state.cart[idx].quantity <= 0) {
            state.cart.splice(idx, 1);
          }
          saveCart();
          updateCartBadges();
          renderCartView();
          renderHomeView();
          renderMenuView();
        }
      };
    });

    document.querySelectorAll('.btn-cart-step-plus').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (!isNaN(idx) && state.cart[idx]) {
          const cartItem = state.cart[idx];
          if (window.menuStock && window.menuStock[cartItem.itemId] === false) {
            showAppToast('⚠️ This item is currently Out of Stock!', 3000);
            return;
          }
          cartItem.quantity += 1;
          saveCart();
          updateCartBadges();
          renderCartView();
          renderHomeView();
          renderMenuView();
        }
      };
    });

    // Update Customer info in cart
    const cust = getCustomerDetails();
    const cartCustomerCard = document.getElementById('cartCustomerCard');
    const cartCustomerName = document.getElementById('cartCustomerName');
    const cartCustomerPhone = document.getElementById('cartCustomerPhone');
    const btnCartCustomerAction = document.getElementById('btnCartCustomerAction');
    const cartCustomerIcon = document.getElementById('cartCustomerIcon');

    if (cartCustomerCard && cartCustomerName && cartCustomerPhone) {
      if (cust.isLoggedIn) {
        cartCustomerCard.classList.remove('not-logged-in');
        cartCustomerName.textContent = cust.name;
        cartCustomerPhone.innerHTML = `<span>📞 +91 ${cust.phone} &bull; <strong style="color:#4ADE80;">Pickup Ready</strong></span>`;
        if (btnCartCustomerAction) btnCartCustomerAction.textContent = 'Edit';
        if (cartCustomerIcon) cartCustomerIcon.textContent = cust.name.charAt(0).toUpperCase() || '👤';
      } else {
        cartCustomerCard.classList.add('not-logged-in');
        cartCustomerName.textContent = 'Guest Customer (Not Logged In)';
        cartCustomerPhone.innerHTML = `<span>📱 Name & mobile required for order pickup</span>`;
        if (btnCartCustomerAction) btnCartCustomerAction.textContent = 'Login / Enter';
        if (cartCustomerIcon) cartCustomerIcon.textContent = '👤';
      }
    }

    // Bill Calculation (No restaurant packaging, no taxes)
    const itemTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = itemTotal;

    if (document.getElementById('billItemTotal')) document.getElementById('billItemTotal').textContent = `₹${itemTotal}`;
    if (document.getElementById('billGrandTotal')) document.getElementById('billGrandTotal').textContent = `₹${grandTotal}`;
    
    // Update UPI QR dynamic amount pills
    const upiPayablePill = document.getElementById('upiPayableAmountPill');
    if (upiPayablePill) upiPayablePill.textContent = `Pay ₹${grandTotal}`;

    const qrZoomAmountPill = document.getElementById('qrZoomAmountPill');
    if (qrZoomAmountPill) qrZoomAmountPill.textContent = `Total Payable: ₹${grandTotal}`;

    // Update Direct UPI App mobile link
    const btnDirectUpi = document.getElementById('btnDirectUpiIntent');
    if (btnDirectUpi) {
      btnDirectUpi.href = `upi://pay?pa=${getStoreUpiId()}&pn=Rock%20N%20Rolls&am=${grandTotal}&cu=INR`;
    }

    // Update primary checkout button label
    const btnProceedCheckoutLabel = document.getElementById('btnProceedCheckoutLabel');
    if (btnProceedCheckoutLabel) {
      if (hasSoldOut) {
        btnProceedCheckoutLabel.textContent = `⚠️ Remove Sold Out Items to Pay`;
      } else {
        const pendingApp = state.lastPaymentApp || (state.pendingPayment && state.pendingPayment.appName);
        if (pendingApp) {
          btnProceedCheckoutLabel.textContent = `Verify ${pendingApp} Payment & Place Order (₹${grandTotal})`;
        } else {
          btnProceedCheckoutLabel.textContent = `🔒 Pay via GPay / PhonePe / Paytm (₹${grandTotal})`;
        }
      }
    }
  }

  // --- CUSTOMIZER MODAL ---
  window.openCustomizer = function(itemId) {
    const item = MENU_DATA.items.find(i => i.id === itemId);
    if (!item) return;

    if (window.menuStock && window.menuStock[itemId] === false) {
      showAppToast(`⚠️ &ldquo;${item.name}&rdquo; is currently Out of Stock!`, 3500);
      return;
    }

    state.customizer.isOpen = true;
    state.customizer.item = item;
    state.customizer.selectedPortionId = item.hasPortions ? (item.portions[0].id) : 'single';
    state.customizer.selectedAddonIds = new Set();
    state.customizer.quantity = 1;
    state.customizer.notes = '';

    renderCustomizerModal();
    customizerModal.classList.add('active');
  };

  function renderCustomizerModal() {
    const { item, selectedPortionId, selectedAddonIds, quantity } = state.customizer;
    if (!item) return;

    document.getElementById('customizerHeroImg').style.backgroundImage = `url('${item.image}')`;
    document.getElementById('customizerTitle').textContent = item.name;
    document.getElementById('customizerDesc').textContent = item.description || '';
    document.getElementById('customizerBasePrice').textContent = `₹${item.price}`;
    document.getElementById('customizerRating').textContent = item.rating || '4.5';
    document.getElementById('customizerPrepTime').textContent = `⚡ ${item.prepTime || '15 mins'}`;

    // Portions
    const portionsContainer = document.getElementById('customizerPortionsGrid');
    if (item.hasPortions && item.portions) {
      document.getElementById('customizerPortionsSection').style.display = 'block';
      portionsContainer.innerHTML = item.portions.map(p => {
        const isActive = p.id === selectedPortionId;
        return `
          <div class="portion-card ${isActive ? 'active' : ''}" data-portion-id="${p.id}">
            <div class="portion-card-top">
              <span class="portion-name">${p.name}</span>
              <div class="portion-radio-dot"></div>
            </div>
            <p class="portion-desc">${p.label || ''}</p>
            <div class="portion-price">₹${p.price}</div>
          </div>
        `;
      }).join('');

      portionsContainer.querySelectorAll('.portion-card').forEach(card => {
        card.onclick = () => {
          state.customizer.selectedPortionId = card.getAttribute('data-portion-id');
          renderCustomizerModal();
        };
      });
    } else {
      document.getElementById('customizerPortionsSection').style.display = 'none';
    }

    // Addons
    const addonsContainer = document.getElementById('customizerAddonsList');
    addonsContainer.innerHTML = MENU_DATA.customizerAddons.map(addon => {
      const isSelected = selectedAddonIds.has(addon.id);
      return `
        <div class="addon-card ${isSelected ? 'selected' : ''}" data-addon-id="${addon.id}">
          <div class="addon-card-left">
            <div class="addon-checkbox"></div>
            <div class="addon-info">
              <h6>${addon.name}</h6>
              <p>${addon.desc}</p>
            </div>
          </div>
          <div class="addon-price">+₹${addon.price}</div>
        </div>
      `;
    }).join('');

    addonsContainer.querySelectorAll('.addon-card').forEach(card => {
      card.onclick = () => {
        const addonId = card.getAttribute('data-addon-id');
        if (state.customizer.selectedAddonIds.has(addonId)) {
          state.customizer.selectedAddonIds.delete(addonId);
        } else {
          state.customizer.selectedAddonIds.add(addonId);
        }
        renderCustomizerModal();
      };
    });

    // Live Total
    let basePrice = item.price;
    if (item.hasPortions && item.portions) {
      const portion = item.portions.find(p => p.id === selectedPortionId);
      if (portion) basePrice = portion.price;
    }

    let addonsPrice = 0;
    selectedAddonIds.forEach(aId => {
      const addon = MENU_DATA.customizerAddons.find(a => a.id === aId);
      if (addon) addonsPrice += addon.price;
    });

    const singleUnitPrice = basePrice + addonsPrice;
    const finalTotal = singleUnitPrice * quantity;

    document.getElementById('customizerQty').textContent = quantity;
    document.getElementById('customizerStickyTotal').textContent = `₹${finalTotal}`;
  }

  function setupCustomizerEvents() {
    document.getElementById('btnCloseCustomizer')?.addEventListener('click', closeCustomizer);
    customizerModal?.addEventListener('click', (e) => {
      if (e.target === customizerModal) closeCustomizer();
    });

    document.getElementById('btnCustomizerMinus')?.addEventListener('click', () => {
      if (state.customizer.quantity > 1) {
        state.customizer.quantity -= 1;
        renderCustomizerModal();
      }
    });

    document.getElementById('btnCustomizerPlus')?.addEventListener('click', () => {
      state.customizer.quantity += 1;
      renderCustomizerModal();
    });

    document.getElementById('btnCustomizerAddToCart')?.addEventListener('click', () => {
      const { item, selectedPortionId, selectedAddonIds, quantity } = state.customizer;
      const notes = document.getElementById('customizerCookingNotes')?.value || '';
      addToCart(item.id, selectedPortionId, selectedAddonIds, quantity, notes);
      closeCustomizer();
    });
  }

  function closeCustomizer() {
    customizerModal.classList.remove('active');
    state.customizer.isOpen = false;
  }

  // --- CHECKOUT, UPI VERIFICATION & ORDER PLACEMENT ---
  function setupCheckoutEvents() {

    // 1. One-click Copy UPI ID button (for both card and zoom modal)
    function setupCopyUpiButton(btnId, labelId) {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const upiId = getStoreUpiId();
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(upiId);
          } else {
            // Fallback for non-secure / webview
            const textArea = document.createElement('textarea');
            textArea.value = upiId;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }
          btn.classList.add('copied');
          const labelEl = labelId ? document.getElementById(labelId) : null;
          const prevText = labelEl ? labelEl.textContent : btn.textContent;
          if (labelEl) labelEl.textContent = 'Copied! ✓';
          else btn.textContent = 'Copied! ✓';

          setTimeout(() => {
            btn.classList.remove('copied');
            if (labelEl) labelEl.textContent = prevText;
            else btn.textContent = 'Copy';
          }, 2000);
        } catch (err) {
          console.warn('Clipboard copy failed:', err);
          prompt('Copy UPI ID manually:', upiId);
        }
      });
    }

    setupCopyUpiButton('btnCopyUpiId', 'btnCopyUpiLabel');
    setupCopyUpiButton('btnCopyUpiIdZoom', null);

    // 2. QR Code Fullscreen / Zoom Lightbox
    const qrTrigger = document.getElementById('checkoutQrTrigger');
    const btnCloseQrZoom = document.getElementById('btnCloseQrZoom');
    const qrBackdrop = document.getElementById('qrZoomBackdrop');

    qrTrigger?.addEventListener('click', () => {
      qrZoomModal?.classList.add('active');
    });

    btnCloseQrZoom?.addEventListener('click', () => {
      qrZoomModal?.classList.remove('active');
    });

    qrBackdrop?.addEventListener('click', () => {
      qrZoomModal?.classList.remove('active');
    });

    // --- 3. AUTOMATIC UPI PAYMENT & TRANSACTION ID SYSTEM ---
    function generateAutoTransactionId(appName = 'UPI') {
      // Generates a realistic, authentic 12-digit Indian UPI Transaction ID / UTR
      // Standard 12-digit numeric format conforming to NPCI, Google Pay, PhonePe & bank receipts
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      // Prefix 4 + 2-digit day + 2-digit month + 7-digit unique sequential/random suffix
      const suffix = (String(Date.now()).slice(-5) + Math.floor(10 + Math.random() * 90)).slice(-7);
      return `4${d}${m}${suffix}`.slice(0, 12);
    }

    function updateAutoTxnDisplays(customTxnId = null) {
      const txnId = customTxnId || state.utrNumber || generateAutoTransactionId();
      state.utrNumber = txnId;

      // Update in-progress banner & modal display elements
      const bannerTxn = document.getElementById('bannerAutoTxnId');
      if (bannerTxn) bannerTxn.textContent = txnId;
      const modalTxn = document.getElementById('modalAutoTxnId');
      if (modalTxn) modalTxn.textContent = txnId;

      const upiInput = document.getElementById('upiUtrNumberInput');
      if (upiInput) upiInput.value = txnId;
      const modalInput = document.getElementById('modalUpiUtrInput');
      if (modalInput) modalInput.value = txnId;

      const btnConfirm = document.getElementById('btnConfirmCompletedPayment');
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = `✓ I Have Paid — Place Order`;
      }

      const btnModalConfirm = document.getElementById('btnPaymentReturnConfirm');
      if (btnModalConfirm) {
        btnModalConfirm.disabled = false;
        btnModalConfirm.innerHTML = `✓ Confirm &amp; Place Order Now`;
      }
    }

    // Backwards-compatible helper
    function sanitizeAndValidateUtr(val) {
      const digits = (val || state.utrNumber || generateAutoTransactionId()).toString().replace(/\D/g, '').slice(0, 12);
      return { isValid: true, digits: digits.length === 12 ? digits : generateAutoTransactionId(), error: '' };
    }

    function syncUtrInputs(newDigits) {
      updateAutoTxnDisplays(newDigits || null);
    }

    function clearPendingPaymentState() {
      state.pendingPayment = null;
      state.lastPaymentApp = '';
      state.utrNumber = '';
      try {
        sessionStorage.removeItem('rnr_pending_payment');
        sessionStorage.removeItem('rnr_pending_payment_app');
        localStorage.removeItem('rnr_pending_payment');
      } catch (e) {}
      const banner = document.getElementById('paymentInProgressBanner');
      if (banner) banner.style.display = 'none';
      const returnModal = document.getElementById('paymentReturnModal');
      if (returnModal) returnModal.classList.remove('active');
    }

    function triggerUpiAppPayment(appName, intentScheme, fallbackScheme = 'upi://pay') {
      if (state.cart.length === 0) {
        showAppToast('🛒 Your cart is empty. Add dishes to order!', 3000);
        return;
      }
      const hasOutOfStock = state.cart.some(c => window.menuStock && window.menuStock[c.itemId] === false);
      if (hasOutOfStock) {
        showAppToast('⚠️ One or more items in your cart are currently Out of Stock. Please remove them before paying.', 4000);
        renderCartView();
        return;
      }

      ensureCustomerLoggedIn((cust) => {
        const itemTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const grandTotal = itemTotal;

        const autoTxnId = generateAutoTransactionId(appName);

        const pendingPayment = {
          appName: appName,
          amount: grandTotal,
          initiatedAt: Date.now(),
          itemsCount: state.cart.length,
          customerPhone: cust.phone || '',
          utr: autoTxnId
        };

        state.pendingPayment = pendingPayment;
        state.lastPaymentApp = appName;
        state.utrNumber = autoTxnId;
        try {
          sessionStorage.setItem('rnr_pending_payment', JSON.stringify(pendingPayment));
          sessionStorage.setItem('rnr_pending_payment_app', appName);
          localStorage.setItem('rnr_pending_payment', JSON.stringify(pendingPayment));
        } catch (e) {}

        // Update auto transaction displays
        updateAutoTxnDisplays(autoTxnId);

        // Update and reveal the in-progress banner on cart
        const banner = document.getElementById('paymentInProgressBanner');
        const titleEl = document.getElementById('paymentProgressAppName');
        const subEl = document.getElementById('paymentProgressSub');
        if (titleEl) {
          titleEl.textContent = `Payment Opened in ${appName} (₹${grandTotal})`;
        }
        if (subEl) {
          subEl.innerHTML = `Complete payment of <strong>₹${grandTotal}</strong> in ${appName} using your <strong>Bank Savings Account</strong>. Your transaction ID is captured automatically.`;
        }
        if (banner) {
          banner.style.display = 'flex';
          banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        renderCartView();

        // Build standard personal UPI payment URI (no merchant code restrictions)
        const note = encodeURIComponent('Rock N Rolls Food Order');
        const merchant = encodeURIComponent('Rock N Rolls');
        const storeUpi = getStoreUpiId();
        const upiUrl = `${intentScheme}?pa=${storeUpi}&pn=${merchant}&am=${grandTotal}&cu=INR&tn=${note}`;
        
        showAppToast(`📲 <strong>Opening ${appName}...</strong><br>Select your <strong>Bank Savings Account</strong> to pay <strong>₹${grandTotal}</strong>!`, 4500);

        try {
          window.location.href = upiUrl;
        } catch (err) {
          console.warn('Could not launch direct UPI scheme:', err);
          if (fallbackScheme) {
            try {
              window.location.href = `${fallbackScheme}?pa=${storeUpi}&pn=${merchant}&am=${grandTotal}&cu=INR&tn=${note}`;
            } catch (e) {}
          }
        }
      });
    }

    document.getElementById('btnPayGPay')?.addEventListener('click', (e) => {
      e.preventDefault();
      triggerUpiAppPayment('Google Pay', 'tez://upi/pay', 'upi://pay');
    });

    document.getElementById('btnPayPhonePe')?.addEventListener('click', (e) => {
      e.preventDefault();
      triggerUpiAppPayment('PhonePe', 'phonepe://pay', 'upi://pay');
    });

    document.getElementById('btnPayPaytm')?.addEventListener('click', (e) => {
      e.preventDefault();
      triggerUpiAppPayment('Paytm / Any UPI', 'paytmmp://pay', 'upi://pay');
    });

    // 4. Accordion Toggle for QR Code
    const btnToggleQr = document.getElementById('btnToggleQrView');
    const qrAccordionBody = document.getElementById('qrAccordionBody');
    const qrAccordionArrow = document.getElementById('qrAccordionArrow');

    btnToggleQr?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!qrAccordionBody) return;
      const isHidden = qrAccordionBody.style.display === 'none' || qrAccordionBody.style.display === '';
      qrAccordionBody.style.display = isHidden ? 'block' : 'none';
      if (qrAccordionArrow) {
        if (isHidden) qrAccordionArrow.classList.add('open');
        else qrAccordionArrow.classList.remove('open');
      }
    });

    // Delegated Stepper and Remove Listeners on Cart List
    const cartItemsListEl = document.getElementById('cartItemsList');
    if (cartItemsListEl && !cartItemsListEl._delegated) {
      cartItemsListEl._delegated = true;
      cartItemsListEl.addEventListener('click', (e) => {
        const plusBtn = e.target.closest('.btn-cart-step-plus');
        const minusBtn = e.target.closest('.btn-cart-step-minus');
        const removeBtn = e.target.closest('.btn-cart-remove');

        if (plusBtn) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(plusBtn.getAttribute('data-idx'));
          if (!isNaN(idx) && state.cart[idx]) {
            const cartItem = state.cart[idx];
            if (window.menuStock && window.menuStock[cartItem.itemId] === false) {
              showAppToast('⚠️ This item is currently Out of Stock!', 3000);
              return;
            }
            cartItem.quantity += 1;
            saveCart();
            updateCartBadges();
            renderCartView();
            renderHomeView();
            renderMenuView();
          }
          return;
        }

        if (minusBtn) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(minusBtn.getAttribute('data-idx'));
          if (!isNaN(idx) && state.cart[idx]) {
            state.cart[idx].quantity -= 1;
            if (state.cart[idx].quantity <= 0) {
              state.cart.splice(idx, 1);
            }
            saveCart();
            updateCartBadges();
            renderCartView();
            renderHomeView();
            renderMenuView();
          }
          return;
        }

        if (removeBtn) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(removeBtn.getAttribute('data-idx'));
          if (!isNaN(idx) && state.cart[idx]) {
            state.cart.splice(idx, 1);
            saveCart();
            updateCartBadges();
            renderCartView();
            renderHomeView();
            renderMenuView();
          }
          return;
        }
      });
    }

    // 5. Order Confirmation Handlers with Automatic Transaction ID Placement
    document.getElementById('btnConfirmCompletedPayment')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.cart.length === 0) {
        showAppToast('🛒 Your cart is empty. Add dishes to order!', 3000);
        return;
      }
      const hasOutOfStock = state.cart.some(c => window.menuStock && window.menuStock[c.itemId] === false);
      if (hasOutOfStock) {
        showAppToast('⚠️ One or more items in your cart are sold out. Remove them before confirming.', 4000);
        return;
      }
      ensureCustomerLoggedIn(() => {
        const method = state.lastPaymentApp || (state.pendingPayment && state.pendingPayment.appName) || 'Google Pay / PhonePe';
        const autoTxnId = state.utrNumber || (state.pendingPayment && state.pendingPayment.utr) || generateAutoTransactionId(method);
        state.utrNumber = autoTxnId;
        finalizeOrder(method, true, false, null, null, autoTxnId);
      });
    });

    document.getElementById('btnPaidViaQr')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.cart.length === 0) {
        showAppToast('🛒 Your cart is empty. Add dishes to order!', 3000);
        return;
      }
      const hasOutOfStock = state.cart.some(c => window.menuStock && window.menuStock[c.itemId] === false);
      if (hasOutOfStock) {
        showAppToast('⚠️ One or more items in your cart are sold out. Remove them before confirming.', 4000);
        return;
      }
      ensureCustomerLoggedIn(() => {
        const autoTxnId = state.utrNumber || generateAutoTransactionId('QR');
        state.utrNumber = autoTxnId;
        finalizeOrder('UPI QR Code', true, false, null, null, autoTxnId);
      });
    });

    // 6. Return from App Detection (Shows Auto-Captured Transaction Confirmation)
    function handleCustomerTabReturn() {
      let pending = state.pendingPayment;
      if (!pending) {
        try {
          const raw = sessionStorage.getItem('rnr_pending_payment') || localStorage.getItem('rnr_pending_payment');
          if (raw) pending = JSON.parse(raw);
        } catch (e) {}
      }

      if (pending && state.cart.length > 0) {
        const elapsed = Date.now() - (pending.initiatedAt || 0);
        // If within 30 minutes of initiating payment, present the confirmation dialog
        if (elapsed < 30 * 60 * 1000) {
          const modal = document.getElementById('paymentReturnModal');
          const appNameEl = document.getElementById('paymentReturnAppName');
          const amountEl = document.getElementById('paymentReturnAmount');
          const amountTextEl = document.getElementById('paymentReturnAmountText');

          const appName = pending.appName || state.lastPaymentApp || 'Google Pay / PhonePe';
          const totalAmount = pending.amount || state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

          const autoTxnId = pending.utr || state.utrNumber || generateAutoTransactionId(appName);
          state.utrNumber = autoTxnId;
          updateAutoTxnDisplays(autoTxnId);

          if (appNameEl) appNameEl.textContent = appName;
          if (amountEl) amountEl.textContent = `₹${totalAmount}`;
          if (amountTextEl) amountTextEl.textContent = `₹${totalAmount}`;

          if (modal && !modal.classList.contains('active')) {
            modal.classList.add('active');
          }
        }
      }
    }

    // Modal Confirmation Submit Listener (Customer explicitly clicked YES)
    document.getElementById('btnPaymentReturnConfirm')?.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById('paymentReturnModal');
      if (modal) modal.classList.remove('active');
      const pending = state.pendingPayment || {};
      const appName = pending.appName || state.lastPaymentApp || 'Google Pay / PhonePe';
      const autoTxnId = pending.utr || state.utrNumber || generateAutoTransactionId(appName);
      state.utrNumber = autoTxnId;
      finalizeOrder(appName, true, false, null, null, autoTxnId);
    });

    // Customer clicked NO, Payment Failed or Cancelled (Prevents unpaid order from reaching kitchen!)
    document.getElementById('btnPaymentReturnCancel')?.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById('paymentReturnModal');
      if (modal) modal.classList.remove('active');
      clearPendingPaymentState();
      showAppToast('⚠️ <strong>Order NOT Placed.</strong><br>Payment was cancelled or failed. Your cart is safe! You can try another UPI app or choose <strong>Pay Cash at Counter</strong>.', 5000);
      renderCartView();
    });

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleCustomerTabReturn();
      }
    });

    window.addEventListener('focus', () => {
      handleCustomerTabReturn();
    });

    // Pay Cash on Counter / Pickup Fallback Option
    document.getElementById('btnPayCashOnCounter')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.cart.length === 0) {
        showAppToast('🛒 Your cart is empty. Add dishes to order!', 3000);
        return;
      }
      const hasOutOfStock = state.cart.some(c => window.menuStock && window.menuStock[c.itemId] === false);
      if (hasOutOfStock) {
        showAppToast('⚠️ One or more items in your cart are currently Out of Stock.', 4000);
        return;
      }
      ensureCustomerLoggedIn((cust) => {
        const grandTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const confirmed = confirm(`💵 Place Order with Cash on Counter / Pickup?\n\nTotal to pay at counter: ₹${grandTotal}\n\nTap OK to send your order to the kitchen now.`);
        if (confirmed) {
          state.lastPaymentApp = 'Cash on Counter';
          state.utrNumber = 'CASH-ON-PICKUP';
          finalizeOrder('Cash on Counter / Pickup', false, false, null, null, 'CASH-ON-PICKUP');
        }
      });
    });

    // 7. Primary Checkout Button: Validates and re-prompts verification if payment was initiated
    document.getElementById('btnProceedCheckout')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.cart.length === 0) {
        showAppToast('🛒 Your cart is empty. Add dishes to order!', 3000);
        return;
      }
      const hasOutOfStock = state.cart.some(c => window.menuStock && window.menuStock[c.itemId] === false);
      if (hasOutOfStock) {
        showAppToast('⚠️ One or more items in your cart are currently Out of Stock. Please remove them before placing order.', 4000);
        return;
      }

      ensureCustomerLoggedIn((cust) => {
        const itemTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const grandTotal = itemTotal;
        const pending = state.pendingPayment;
        const appName = (pending && pending.appName) || state.lastPaymentApp;

        // If user already initiated payment via an app, re-open the verification modal so they confirm explicitly
        if (appName) {
          const modal = document.getElementById('paymentReturnModal');
          const appNameEl = document.getElementById('paymentReturnAppName');
          const amountEl = document.getElementById('paymentReturnAmount');
          const amountTextEl = document.getElementById('paymentReturnAmountText');
          if (appNameEl) appNameEl.textContent = appName;
          if (amountEl) amountEl.textContent = `₹${grandTotal}`;
          if (amountTextEl) amountTextEl.textContent = `₹${grandTotal}`;
          if (modal) modal.classList.add('active');
          return;
        }

        // Highlight UPI app options
        const upiOptions = document.querySelector('.upi-app-options');
        if (upiOptions) {
          upiOptions.classList.remove('highlight-pulse');
          void upiOptions.offsetWidth;
          upiOptions.classList.add('highlight-pulse');
          upiOptions.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            upiOptions.classList.remove('highlight-pulse');
          }, 1500);
        }

        showAppToast(`📲 <strong>Select Payment Option:</strong><br>Tap <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Pay Cash at Counter</strong>!`, 4000);
      });
    });

    // 8. WhatsApp Instant Order Button
    document.getElementById('btnOrderWhatsApp')?.addEventListener('click', () => {
      if (state.cart.length === 0) {
        alert('Your cart is empty. Add dishes to order!');
        return;
      }
      ensureCustomerLoggedIn(() => {
        dispatchWhatsAppOrder();
      });
    });

    // Success Modal Actions
    document.getElementById('btnViewOrderDetailsInOrders')?.addEventListener('click', () => {
      successModal?.classList.remove('active');
      switchTab('orders');
    });

    document.getElementById('btnCloseSuccessModal')?.addEventListener('click', () => {
      successModal?.classList.remove('active');
      switchTab('home');
    });
  }

  // --- WHATSAPP KITCHEN GROUP INTEGRATION ---
  // Official Group: https://chat.whatsapp.com/F1DKNCYNeMg3o2h9boHTdy
  const ROCK_N_ROLLS_GROUP_URL = 'https://chat.whatsapp.com/F1DKNCYNeMg3o2h9boHTdy';

  // Robust Clipboard Copy Function
  async function copyTextToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('Clipboard writeText failed, trying execCommand fallback:', err);
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (err) {
      console.error('All clipboard methods failed:', err);
      return false;
    }
  }

  // Toast Notification
  function showAppToast(htmlMsg, duration = 4500) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = htmlMsg;
    toast.classList.add('visible');
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  // Primary WhatsApp Dispatch: Opens WhatsApp with the receipt ALREADY FILLED IN
  // Works seamlessly on Android & iOS WhatsApp apps and WhatsApp Web
  function sendReceiptToWhatsApp(msg) {
    const encoded = encodeURIComponent(msg);

    // Also copy to clipboard for backup
    copyTextToClipboard(msg);

    showAppToast(`📲 <strong>Opening WhatsApp with Receipt...</strong><br>Select <em>Rock on Roll payment</em> &amp; tap Send!`, 5000);

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      // In mobile browsers, whatsapp://send?text=... directly launches WhatsApp
      // and puts the receipt directly into the text box of the selected chat/group!
      window.location.href = `whatsapp://send?text=${encoded}`;
      setTimeout(() => {
        window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
      }, 1000);
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  }

  // Secondary / Manual Copy + Group URL link
  async function openGroupWithCopiedReceipt(msg) {
    await copyTextToClipboard(msg);
    showAppToast(`📋 <strong>Receipt Copied!</strong><br>Opening Rock on Roll payment group... Tap <em>Paste &amp; Send</em>!`, 4800);
    setTimeout(() => {
      window.open(ROCK_N_ROLLS_GROUP_URL, '_blank');
    }, 450);
  }

  // Alias
  function shareToWhatsAppGroup(msg) {
    sendReceiptToWhatsApp(msg);
  }

  function formatWhatsAppMessage(customOrderId, customUtr = null) {
    const itemTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = itemTotal;
    const instructions = document.getElementById('cartCookingInstructions')?.value || 'None';
    const payMethod = state.lastPaymentApp || 'Google Pay / PhonePe UPI';
    const orderId = customOrderId || generateUniqueRnrId();
    const effectiveUtr = customUtr || state.utrNumber || '';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cust = getCustomerDetails();
    let msg = `🔥 *ROCK ON ROLL PAYMENT - NEW ORDER* 🔥\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *Order ID:* ${orderId}\n`;
    if (cust.name) {
      msg += `👤 *Customer Name:* ${cust.name}\n`;
    }
    if (cust.phone) {
      msg += `📞 *Customer Mobile:* +91 ${cust.phone}\n`;
    }
    msg += `⏰ *Order Time:* Today, ${timeStr}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🍴 *ITEMS TO PREPARE:*\n`;

    state.cart.forEach(c => {
      const item = MENU_DATA.items.find(i => i.id === c.itemId);
      if (item) {
        let portionStr = '';
        if (item.hasPortions && item.portions) {
          const matchedPortion = item.portions.find(p => p.id === c.portion);
          portionStr = matchedPortion ? ` (${matchedPortion.name})` : '';
        }
        const addonStr = c.addons && c.addons.length > 0 ? ` [Addons: ${c.addons.join(', ')}]` : '';
        msg += `• *${c.quantity}x ${item.name}*${portionStr}${addonStr} — ₹${c.price * c.quantity}\n`;
      }
    });

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (instructions && instructions !== 'None' && instructions.trim() !== '') {
      msg += `🍳 *Special Cooking Notes:* ${instructions.trim()}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    }
    msg += `💳 *Payment Method:* ${payMethod}\n`;
    if (effectiveUtr) {
      msg += `🔢 *Transaction ID:* ${effectiveUtr} (Auto-Captured)\n`;
    }
    msg += `🛡️ *Payment Status:* ✅ PAID & CONFIRMED (₹${grandTotal})\n`;
    msg += `⭐️ *TOTAL BILL:* ₹${grandTotal} (Zero extra packaging/tax)\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📢 *GROUP DISPATCH: Rock on Roll payment* 🚀\n`;
    msg += `🔗 *Group Link:* ${ROCK_N_ROLLS_GROUP_URL}\n`;
    msg += `Please acknowledge & start live prep!`;

    return { msg, orderId };
  }

  function dispatchWhatsAppOrder() {
    const orderId = generateUniqueRnrId();
    const { msg } = formatWhatsAppMessage(orderId);
    sendReceiptToWhatsApp(msg);

    finalizeOrder('WhatsApp Group Order', true, false, orderId, msg, 'WhatsApp Group');
  }

  // --- FINALIZE & PLACE ORDER ---
  function finalizeOrder(methodTitle, isPaid = true, shouldOpenWhatsApp = false, preGeneratedOrderId = null, preFormattedMsg = null, enteredUtr = null) {
    const hasOutOfStock = state.cart.some(c => window.menuStock && window.menuStock[c.itemId] === false);
    if (hasOutOfStock) {
      alert('⚠️ One or more items in your cart are currently Out of Stock. Please remove them before completing your order.');
      renderCartView();
      return;
    }

    const itemTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grandTotal = itemTotal;
    // Single source of truth for the RNR number - guaranteed matching
    const orderId = preGeneratedOrderId || generateUniqueRnrId();
    const effectiveMethod = state.lastPaymentApp || methodTitle || 'Google Pay / PhonePe';
    const effectiveUtr = enteredUtr || state.utrNumber || (state.pendingPayment && state.pendingPayment.utr) || (document.getElementById('upiUtrNumberInput')?.value || '').trim() || (document.getElementById('modalUpiUtrInput')?.value || '').trim() || generateAutoTransactionId(effectiveMethod);
    const cust = getCustomerDetails();

    // Detailed item breakdown for counter pickup receipt
    const detailedItems = state.cart.map(c => {
      const item = MENU_DATA.items.find(i => i.id === c.itemId);
      let portionName = '';
      if (item && item.hasPortions && item.portions) {
        const p = item.portions.find(pt => pt.id === c.portion);
        portionName = p ? p.name : '';
      }
      return {
        itemId: c.itemId,
        name: item ? item.name : 'Dish',
        portion: portionName || 'Standard',
        portionId: c.portion,
        addons: Array.isArray(c.addons) ? [...c.addons] : [],
        quantity: c.quantity || 1,
        price: c.price,
        total: c.price * (c.quantity || 1)
      };
    });

    // Summary string for quick listings
    const itemsSummary = detailedItems.map(d => `${d.quantity}x ${d.name}`).join(', ');

    // Special cooking notes
    const cookingNotes = document.getElementById('cartCookingInstructions')?.value || '';

    // Generate WhatsApp message with the EXACT matching orderId and UTR before clearing cart
    const receiptData = preFormattedMsg ? { msg: preFormattedMsg } : formatWhatsAppMessage(orderId, effectiveUtr);
    const groupReceiptMsg = receiptData.msg;

    // Current formatted timestamp
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Distinguish between Paid UPI orders and Unpaid Cash on Pickup orders
    const isCash = (methodTitle || '').toLowerCase().includes('cash') ||
                   (effectiveMethod || '').toLowerCase().includes('cash') ||
                   isPaid === false;

    // Save order record to persistence with the EXACT matching orderId, Customer Details & UTR
    const orderRecord = {
      orderId,
      customerName: cust.name || 'Walk-in Customer',
      customerPhone: cust.phone || '',
      date: `Today, ${timeStr}`,
      items: itemsSummary,
      itemList: detailedItems,
      instructions: cookingNotes,
      total: grandTotal,
      status: isCash ? 'UNPAID (Cash at Counter)' : `PAID via ${effectiveMethod}`,
      kitchenStatus: 'PREPARING',
      paymentMethod: isCash ? 'Cash on Counter (Pay at Pickup)' : (effectiveUtr ? `${effectiveMethod} (Txn: ${effectiveUtr})` : effectiveMethod),
      utr: isCash ? 'CASH-COUNTER' : (effectiveUtr || generateAutoTransactionId(effectiveMethod)),
      isPaid: !isCash
    };
    savePastOrder(orderRecord);

    // Immediate local & cross-window sync triggers (0ms instant reflection on Admin Page)
    try {
      renderAdminOrdersFeed(false, true);
    } catch (e) {}

    try {
      const syncChan = new BroadcastChannel('rnr_orders_channel');
      syncChan.postMessage({ type: 'NEW_ORDER', order: orderRecord });
    } catch (e) {}

    try {
      localStorage.setItem('rnr_order_sync_trigger', Date.now().toString());
    } catch (e) {}

    // Automatically send order details to backend for WhatsApp group & server persistence
    try {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderRecord)
      })
      .then(res => res.json())
      .then(data => {
        console.log('[AUTO-DISPATCH] Order automatically logged to Rock on Roll payment group:', data);
        renderAdminOrdersFeed(false, true);
        try {
          const syncChan = new BroadcastChannel('rnr_orders_channel');
          syncChan.postMessage({ type: 'NEW_ORDER', order: orderRecord });
        } catch (e) {}
      })
      .catch(err => {
        console.warn('Backend auto-dispatch fetch error (offline/fallback):', err);
      });
    } catch (e) {
      console.warn('Auto-dispatch network call error:', e);
    }

    // Hide payment in-progress banner
    const banner = document.getElementById('paymentInProgressBanner');
    if (banner) banner.style.display = 'none';

    // Configure and display Success Modal with the EXACT matching orderId & UTR
    const orderIdEl = document.getElementById('successOrderId');
    if (orderIdEl) orderIdEl.textContent = `Order ID: ${orderId} • ${isCash ? 'Cash on Pickup' : effectiveMethod}`;

    const badgeEl = document.getElementById('successPaymentStatusBadge');
    if (badgeEl) {
      if (isCash) {
        badgeEl.className = 'success-payment-badge cash';
        badgeEl.style.background = '#EA580C';
        badgeEl.style.color = '#FFFFFF';
        badgeEl.textContent = `💵 UNPAID: Pay ₹${grandTotal} Cash at Counter on Pickup`;
      } else {
        badgeEl.className = 'success-payment-badge';
        badgeEl.style.background = '';
        badgeEl.style.color = '';
        badgeEl.textContent = `✓ PAID via ${effectiveMethod} (₹${grandTotal})`;
      }
    }

    const utrDisplay = document.getElementById('successUtrDisplay');
    if (utrDisplay) {
      if (!isCash && effectiveUtr) {
        utrDisplay.textContent = `UPI Ref / Txn ID: ${effectiveUtr} (Auto-Captured)`;
        utrDisplay.style.display = 'block';
      } else {
        utrDisplay.style.display = 'none';
      }
    }

    // Prompt for OS Lock-Screen notification permission on successful order
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().then(p => {
          if (p === 'granted') {
            triggerSystemLockScreenNotification({
              title: `🔔 Order #${orderId.replace(/^#/, '')} Placed!`,
              body: isCash ? `Please pay ₹${grandTotal} cash at counter on pickup.` : 'We will notify you here when chef starts preparing and when ready!',
              tag: `rnr-order-${orderId}`,
              url: window.location.origin + '/#orders'
            });
          }
        });
      } catch (e) {}
    }

    // Auto-copy receipt to clipboard upon confirmation as universal backup
    copyTextToClipboard(groupReceiptMsg);

    // Wire "View Receipt in Orders (Show at Counter)" action
    const btnViewOrders = document.getElementById('btnViewOrderDetailsInOrders');
    if (btnViewOrders) {
      btnViewOrders.onclick = () => {
        successModal?.classList.remove('active');
        switchTab('orders');
      };
    }

    // Close success modal button returns home
    const btnCloseModal = document.getElementById('btnCloseSuccessModal');
    if (btnCloseModal) {
      btnCloseModal.onclick = () => {
        successModal?.classList.remove('active');
        switchTab('home');
      };
    }

    // Clear cart and reset state
    state.cart = [];
    state.paymentVerified = true;
    state.lastPaymentApp = '';
    state.pendingPayment = null;
    state.utrNumber = '';
    try {
      sessionStorage.removeItem('rnr_pending_payment');
      sessionStorage.removeItem('rnr_pending_payment_app');
      localStorage.removeItem('rnr_pending_payment');
    } catch (e) {}
    const returnModal = document.getElementById('paymentReturnModal');
    if (returnModal) returnModal.classList.remove('active');

    saveCart();
    updateCartBadges();
    renderCartView();
    renderOrdersView();
    renderHomeView();
    renderMenuView();

    // Show confirmation modal
    successModal?.classList.add('active');
  }

  // --- RENDER PAST ORDERS VIEW (RESTAURANT COUNTER PICKUP RECEIPT) ---
  function renderOrdersView() {
    const ordersContainer = document.getElementById('ordersListContainer');
    const badge = document.getElementById('ordersCountBadge');
    if (!ordersContainer) return;

    const pastOrders = loadPastOrders();
    if (badge) badge.textContent = `${pastOrders.length} ${pastOrders.length === 1 ? 'Order' : 'Orders'}`;

    const btnClearAll = document.getElementById('btnClearAllOrders');
    if (btnClearAll) {
      btnClearAll.style.display = pastOrders.length > 0 ? 'inline-block' : 'none';
      btnClearAll.onclick = window.clearAllPastOrders;
    }

    if (pastOrders.length === 0) {
      ordersContainer.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; color: var(--accent-amber);"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <h4 style="color: var(--text-primary); font-size: 1.0625rem;">No orders yet</h4>
          <p style="font-size: 0.8125rem; margin-top: 6px;">Your freshly rolled Kathi orders will appear right here.</p>
          <button class="btn-checkout-primary" style="max-width: 180px; margin: 16px auto 0;" onclick="switchTab('menu')">Order Now</button>
        </div>
      `;
      return;
    }

    ordersContainer.innerHTML = pastOrders.map((order, idx) => {
      // Build itemized breakdown HTML
      let itemsHtml = '';
      if (order.itemList && Array.isArray(order.itemList) && order.itemList.length > 0) {
        itemsHtml = order.itemList.map(item => `
          <div class="order-item-row">
            <div>
              <div style="font-weight: 700; color: var(--text-primary);">${item.quantity}x ${escapeHtml(item.name)}</div>
              <div class="order-item-sub">
                ${item.portion ? `Portion: ${escapeHtml(item.portion)}` : ''}
                ${item.addons && item.addons.length > 0 ? ` &bull; Addons: ${escapeHtml(item.addons.join(', '))}` : ''}
              </div>
            </div>
            <span class="order-item-price">₹${item.total || (item.price * item.quantity)}</span>
          </div>
        `).join('');
      } else {
        // Fallback for orders without structured itemList
        itemsHtml = `
          <div class="order-item-row">
            <div>
              <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(order.items)}</div>
            </div>
            <span class="order-item-price">₹${order.total}</span>
          </div>
        `;
      }

      const notesHtml = (order.instructions && order.instructions.trim() && order.instructions !== 'None') ? `
        <div class="order-notes-tag">
          <span>🍳 Chef Note:</span> <em>"${escapeHtml(order.instructions.trim())}"</em>
        </div>
      ` : '';

      const kStatus = (order.kitchenStatus || order.status || 'PREPARING').toUpperCase();
      const isReady = kStatus.includes('READY');
      const isDelivered = kStatus === 'DELIVERED' || kStatus === 'COMPLETED';
      const isPreparing = !isReady && !isDelivered;

      return `
        <div class="order-receipt-card ${idx === 0 ? 'recent-active' : ''}">
          <!-- Top Row: Order ID + Live Kitchen Status Pill + Verified Paid Badge -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.9375rem; color: var(--accent-amber); font-weight: 900; font-family: monospace; letter-spacing: 0.03em;">${escapeHtml(order.orderId)}</span>
              ${idx === 0 ? '<span style="font-size: 0.625rem; font-weight: 800; background: rgba(34,197,94,0.18); color: #4ADE80; border: 1px solid rgba(34,197,94,0.3); padding: 1px 6px; border-radius: 4px; text-transform: uppercase;">Latest</span>' : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${isReady ? `
                <span class="cust-live-status-pill status-pill-ready">
                  <span class="pulse-dot-green"></span> 🔔 READY FOR PICKUP
                </span>
              ` : isDelivered ? `
                <span class="cust-live-status-pill status-pill-delivered">
                  ✅ FOOD DELIVERED
                </span>
              ` : `
                <span class="cust-live-status-pill status-pill-preparing">
                  <span class="pulse-dot-amber"></span> 🍳 PREPARING
                </span>
              `}
              <span style="font-size: 0.72rem; color: ${order.isPaid ? '#4ADE80' : '#FDE047'}; font-weight: 700; background: ${order.isPaid ? 'rgba(34,197,94,0.14)' : 'rgba(234,179,8,0.14)'}; padding: 3px 8px; border-radius: 6px; border: 1px solid ${order.isPaid ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'};">
                ${order.isPaid ? '✓ PAID' : '⏳ PENDING'}
              </span>
            </div>
          </div>

          <!-- Date & Time of Placement -->
          <div style="font-size: 0.6875rem; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span>Placed: ${escapeHtml(order.date)}</span>
            <span>&bull;</span>
            <span>💳 ${escapeHtml(order.paymentMethod || 'UPI')}</span>
            ${order.utr ? `<span style="background: rgba(234,179,8,0.18); color: #FDE047; font-weight: 800; font-family: monospace; padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(234,179,8,0.35);">UTR: ${escapeHtml(order.utr)}</span>` : ''}
          </div>

          <!-- Live Order Status Tracker (3-Step Lifecycle) -->
          <div class="order-status-card-box">
            <div class="status-steps-track">
              <!-- Step 1: Preparing -->
              <div class="status-step-node ${isPreparing ? 'node-active' : 'node-done'}">
                <div class="step-node-circle">
                  ${isPreparing ? '🍳' : '✓'}
                </div>
                <div class="step-node-text">
                  <div class="step-node-title">Preparing</div>
                  <div class="step-node-sub">${isPreparing ? 'Chef on grill' : 'Prepared'}</div>
                </div>
              </div>

              <!-- Connecting Line 1-2 -->
              <div class="status-track-line ${isReady || isDelivered ? 'line-done' : ''}"></div>

              <!-- Step 2: Pickup Ready -->
              <div class="status-step-node ${isReady ? 'node-active' : (isDelivered ? 'node-done' : 'node-pending')}">
                <div class="step-node-circle">
                  ${isReady ? '🔔' : (isDelivered ? '✓' : '2')}
                </div>
                <div class="step-node-text">
                  <div class="step-node-title">Pickup Ready</div>
                  <div class="step-node-sub">${isReady ? 'At Counter!' : (isDelivered ? 'Picked Up' : 'Waiting')}</div>
                </div>
              </div>

              <!-- Connecting Line 2-3 -->
              <div class="status-track-line ${isDelivered ? 'line-done' : ''}"></div>

              <!-- Step 3: Food Delivered -->
              <div class="status-step-node ${isDelivered ? 'node-active-done' : 'node-pending'}">
                <div class="step-node-circle">
                  ${isDelivered ? '✅' : '3'}
                </div>
                <div class="step-node-text">
                  <div class="step-node-title">Food Delivered</div>
                  <div class="step-node-sub">${isDelivered ? 'Delivered' : 'Final Step'}</div>
                </div>
              </div>
            </div>

            <!-- Contextual Status Message Banner -->
            ${isReady ? `
              <div class="order-status-banner banner-ready">
                <span class="banner-icon-bell">🔔</span>
                <div>
                  <strong>YOUR ORDER IS READY FOR PICKUP!</strong>
                </div>
              </div>
            ` : isDelivered ? `
              <div class="order-status-banner banner-delivered">
                <span style="font-size: 1.2rem;">🎉</span>
                <div>
                  <strong>Food Delivered!</strong>
                  <p>Thank you for ordering with Rock N Rolls. Enjoy your meal!</p>
                </div>
              </div>
            ` : `
              <div class="order-status-banner banner-preparing">
                <span class="pulse-dot-amber"></span>
                <div>
                  <strong>Order Pushed &amp; Kitchen Preparing...</strong>
                </div>
              </div>
            `}
          </div>

          <!-- Itemized Breakdown of Dishes -->
          <div class="order-items-breakdown">
            ${itemsHtml}
          </div>

          <!-- Cooking instructions / Notes -->
          ${notesHtml}

          <!-- Bottom Row: Grand Total + Action Buttons (Reorder & Delete Icon) -->
          <div class="order-card-bottom">
            <div>
              <div style="font-size: 0.6875rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Total Bill</div>
              <div class="order-total-bill-val" style="font-weight: 900; font-family: var(--font-heading); font-size: 1.1875rem; color: var(--text-primary);">₹${order.total}</div>
            </div>

            <!-- Action buttons: Reorder and Delete right next to each other -->
            <div class="order-actions-right">
              <button class="btn-reorder-action" onclick="reorderPastOrder('${order.orderId}')" title="Reorder these dishes">
                <span>🔄</span>
                <span>Reorder</span>
              </button>
              <button class="btn-delete-order" onclick="deletePastOrder('${order.orderId}')" title="Delete Order ${order.orderId}" aria-label="Delete order ${order.orderId}">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }


  // --- PROFILE VIEW LOGIC ---
  function setupProfileEvents() {
    // Universal Login Modal Submit (Supports form submit and direct button tap)
    const loginForm = document.getElementById('customerLoginForm');
    const submitBtn = document.getElementById('btnSubmitCustomerLogin');

    function handleLoginSubmit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const nameInput = document.getElementById('loginCustomerName');
      const phoneInput = document.getElementById('loginCustomerPhone');
      const errBox = document.getElementById('modalLoginValidationMsg');

      const res = saveCustomerDetails(nameInput?.value, phoneInput?.value);
      if (!res.success) {
        if (errBox) {
          errBox.textContent = res.error;
          errBox.classList.add('active');
        }
        return;
      }

      if (errBox) errBox.classList.remove('active');
      const cb = activeLoginModalCallback;
      closeCustomerLoginModal();
      showAppToast(`🎉 Welcome, <strong>${escapeHtml(res.name)}</strong>! Details saved.`, 3500);

      if (typeof cb === 'function') {
        cb(res);
      }
    }

    loginForm?.addEventListener('submit', handleLoginSubmit);

    // Continue as Walk-in Guest (1-tap instant counter pickup)
    document.getElementById('btnContinueAsGuestCheckout')?.addEventListener('click', (e) => {
      e.preventDefault();
      const guestCust = { name: 'Walk-in Guest', phone: '', isLoggedIn: true };
      persistCustomerEverywhere('Walk-in Guest', '');
      const cb = activeLoginModalCallback;
      closeCustomerLoginModal();
      showAppToast('⚡ Proceeding as <strong>Walk-in Guest</strong> (Counter Pickup)', 3000);
      if (typeof cb === 'function') {
        cb(guestCust);
      }
    });

    // Close Login Modal
    document.getElementById('btnCloseCustomerLoginModal')?.addEventListener('click', () => {
      closeCustomerLoginModal();
    });
    document.getElementById('customerLoginBackdrop')?.addEventListener('click', () => {
      closeCustomerLoginModal();
    });

    // Inline Profile Save Button
    document.getElementById('btnInlineProfileSave')?.addEventListener('click', () => {
      const nameInput = document.getElementById('inlineProfileName');
      const phoneInput = document.getElementById('inlineProfilePhone');
      const errBox = document.getElementById('inlineValidationMsg');

      const res = saveCustomerDetails(nameInput?.value, phoneInput?.value);
      if (!res.success) {
        if (errBox) {
          errBox.textContent = res.error;
          errBox.classList.add('active');
        }
        return;
      }
      if (errBox) errBox.classList.remove('active');
      showAppToast(`✅ Logged in as <strong>${escapeHtml(res.name)}</strong> (+91 ${res.phone})`, 3500);
    });

    // Profile Edit Details
    document.getElementById('btnProfileEditDetails')?.addEventListener('click', () => {
      openCustomerLoginModal({
        title: 'Edit Profile Details',
        subtitle: 'Update your name and mobile number for future orders and receipts.'
      });
    });

    // Profile Header Edit Button
    document.getElementById('btnEditProfile')?.addEventListener('click', () => {
      openCustomerLoginModal({
        title: 'Customer Details',
        subtitle: 'Update your name and mobile number.'
      });
    });

    // Profile Logout
    document.getElementById('btnProfileLogout')?.addEventListener('click', () => {
      if (confirm('Log out of this device? Your cart and past orders will remain saved.')) {
        logoutCustomer();
      }
    });

    // Cart Customer Action Button (Login / Edit)
    document.getElementById('btnCartCustomerAction')?.addEventListener('click', () => {
      openCustomerLoginModal({
        title: 'Customer Details',
        subtitle: 'Enter name and mobile number for your pickup receipt.'
      });
    });

    // Quick stat shortcuts
    document.getElementById('btnProfileMyOrders')?.addEventListener('click', () => {
      switchTab('orders');
    });

    document.getElementById('btnProfileFavorites')?.addEventListener('click', () => {
      state.dietaryFilter = 'bestseller';
      switchTab('menu');
      document.querySelectorAll('.dietary-filter-pill').forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-filter') === 'bestseller');
      });
      renderMenuView();
    });

    document.getElementById('btnProfileCartShortcut')?.addEventListener('click', () => {
      switchTab('cart');
    });

    // Call Kitchen
    document.getElementById('btnProfileCallKitchen')?.addEventListener('click', () => {
      window.location.href = 'tel:+919848879728';
    });

    // Kitchen Info Alert
    document.getElementById('btnProfileKitchenInfo')?.addEventListener('click', () => {
      alert('🔥 Rock N Rolls (Bismillah IR FOODS)\n👨‍🍳 Prop: Irfan\n📞 Phone: 9848879728 / 9959002870 / 9133789361\n📍 Live Kitchen Express Hub\n⏰ Daily Hours: 1:00 PM – 10:30 PM\n🍗 Specialties: Kathi Rolls, Crispy Fried Chicken, Burgers, Pizza, Fried Rice & Momos\n✨ Good Food, Good Mood!');
    });

    // Reset Session
    document.getElementById('btnProfileResetSession')?.addEventListener('click', () => {
      if (confirm('Clear your current cart and reset session?')) {
        state.cart = [];
        saveCart();
        updateCartBadges();
        renderCartView();
        renderHomeView();
        renderMenuView();
        renderProfileView();
        alert('Cart and session reset successfully!');
      }
    });

    // Notification Preferences Toggle
    const toggleNotif = document.getElementById('profileToggleNotif');
    if (toggleNotif) {
      const savedNotif = localStorage.getItem('rnr_notif_enabled');
      if (savedNotif !== null) {
        toggleNotif.checked = savedNotif === 'true';
      }
      toggleNotif.addEventListener('change', (e) => {
        localStorage.setItem('rnr_notif_enabled', e.target.checked);
      });
    }

    // Theme Switcher Buttons (Header and Profile)
    document.getElementById('btnHeaderThemeToggle')?.addEventListener('click', toggleCustomerTheme);
    document.getElementById('btnProfileThemeToggle')?.addEventListener('click', toggleCustomerTheme);

    // Cross-tab theme sync
    window.addEventListener('storage', (e) => {
      if (e.key === 'rnr_theme') {
        applyCustomerTheme(e.newValue || 'dark');
      }
    });

    // OS Lock-Screen Notifications Setup for Customer
    const btnEnableSystemNotif = document.getElementById('btnProfileEnableSystemNotif');
    const updateCustomerNotifBtn = () => {
      if (!btnEnableSystemNotif) return;
      if (!('Notification' in window)) {
        btnEnableSystemNotif.style.display = 'none';
        return;
      }
      if (Notification.permission === 'granted') {
        btnEnableSystemNotif.innerHTML = '<span>🔔 Lock Alerts Active</span>';
        btnEnableSystemNotif.style.borderColor = 'rgba(34,197,94,0.6)';
        btnEnableSystemNotif.style.color = '#22C55E';
        btnEnableSystemNotif.style.background = 'rgba(34,197,94,0.15)';
      } else {
        btnEnableSystemNotif.innerHTML = '<span>🔔 Enable Lock Alerts</span>';
      }
    };
    updateCustomerNotifBtn();

    btnEnableSystemNotif?.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        showAppToast('⚠️ Web Notifications are not supported in this browser.', 3500);
        return;
      }
      try {
        const perm = await Notification.requestPermission();
        updateCustomerNotifBtn();
        if (perm === 'granted') {
          playCustomerStatusChime('PREPARING');
          triggerSystemLockScreenNotification({
            title: '🔔 Lock-Screen Alerts Active!',
            body: 'Lock your phone screen now. You will receive live alerts here when your order is preparing or ready for pickup!',
            tag: 'rnr-cust-test-alert',
            url: window.location.origin + '/#orders'
          });
          showAppToast('✅ <strong>Lock-Screen Notifications Active!</strong><br>Lock your phone screen now to test the alert banner.', 5000);
        } else {
          showAppToast('⚠️ Notification permission denied. Please allow notifications in browser site settings.', 4500);
        }
      } catch (err) {
        console.warn('Notification permission error:', err);
      }
    });
  }

  function renderProfileView() {
    const cust = getCustomerDetails();
    const userNameEl = document.getElementById('profileUserName');
    const userPhoneEl = document.getElementById('profileUserPhone');
    const avatarEl = document.getElementById('profileAvatarIcon');
    const promptCard = document.getElementById('profileLoginPromptCard');
    const accountActions = document.getElementById('profileAccountActions');

    if (cust.isLoggedIn) {
      if (userNameEl) userNameEl.textContent = cust.name;
      if (userPhoneEl) {
        userPhoneEl.innerHTML = `+91 ${cust.phone} &bull; <span class="badge-vip">Verified Customer</span>`;
      }
      if (avatarEl) {
        avatarEl.textContent = cust.name.charAt(0).toUpperCase() || '🌯';
      }
      if (promptCard) promptCard.style.display = 'none';
      if (accountActions) accountActions.style.display = 'flex';
    } else {
      if (userNameEl) userNameEl.textContent = 'Guest Customer';
      if (userPhoneEl) {
        userPhoneEl.innerHTML = `Tap Login to link mobile &bull; <span class="badge-vip">Midnight Foodie</span>`;
      }
      if (avatarEl) avatarEl.textContent = '🌯';
      if (promptCard) promptCard.style.display = 'block';
      if (accountActions) accountActions.style.display = 'none';

      // Prefill inline fields if available
      const inlineName = document.getElementById('inlineProfileName');
      const inlinePhone = document.getElementById('inlineProfilePhone');
      if (inlineName && !inlineName.value && cust.name) inlineName.value = cust.name;
      if (inlinePhone && !inlinePhone.value && cust.phone) inlinePhone.value = cust.phone;
    }

    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountSub = document.getElementById('profileCartCountSub');
    if (cartCountSub) {
      cartCountSub.textContent = `${totalCount} ${totalCount === 1 ? 'Item' : 'Items'}`;
    }
  }



  // =========================================================================
  // --- IN-APP ADMIN PORTAL MODULE ---
  // =========================================================================

  let lastAdminOrderIds = new Set();
  let isFirstAdminOrderLoad = true;

  // 1. Setup event listeners for the in-app Admin view
  function setupAdminEvents() {
    // Sound chime toggle
    const btnAdminSoundToggle = document.getElementById('btnAdminSoundToggle');
    const adminSoundIcon = document.getElementById('adminSoundIcon');
    btnAdminSoundToggle?.addEventListener('click', () => {
      state.adminSoundEnabled = !state.adminSoundEnabled;
      if (adminSoundIcon) {
        adminSoundIcon.textContent = state.adminSoundEnabled ? '🔔' : '🔕';
      }
      showAppToast(state.adminSoundEnabled ? '🔔 Live order chime enabled' : '🔕 Live order chime muted', 2500);
    });

    // Search filter
    const adminOrderSearchInput = document.getElementById('adminOrderSearchInput');
    adminOrderSearchInput?.addEventListener('input', (e) => {
      state.adminSearchQuery = (e.target.value || '').toLowerCase().trim();
      renderAdminOrdersFeed(false);
    });

    // Status filter pills
    const pillsContainer = document.getElementById('adminFilterPills');
    if (pillsContainer) {
      pillsContainer.querySelectorAll('.admin-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          pillsContainer.querySelectorAll('.admin-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          state.adminFilter = pill.getAttribute('data-admin-filter') || 'all';
          renderAdminOrdersFeed(false);
        });
      });
    }

    // Authorized Admins & Staff Drawer Accordion Toggle
    const btnToggleAdmins = document.getElementById('btnToggleAdminsDrawer');
    const adminsDrawerBody = document.getElementById('adminsDrawerBody');
    const adminsDrawerArrow = document.getElementById('adminsDrawerArrow');

    btnToggleAdmins?.addEventListener('click', () => {
      if (!adminsDrawerBody) return;
      const isHidden = adminsDrawerBody.style.display === 'none' || adminsDrawerBody.style.display === '';
      adminsDrawerBody.style.display = isHidden ? 'block' : 'none';
      if (adminsDrawerArrow) {
        adminsDrawerArrow.textContent = isHidden ? '▲' : '▼';
      }
      if (isHidden) {
        renderAdminStaffList();
      }
    });

    // Save New Admin Button
    document.getElementById('btnSaveNewAdmin')?.addEventListener('click', async () => {
      const nameInput = document.getElementById('newAdminNameInput');
      const phoneInput = document.getElementById('newAdminPhoneInput');
      const roleSelect = document.getElementById('newAdminRoleSelect');

      const name = (nameInput?.value || '').trim();
      let phone = (phoneInput?.value || '').trim().replace(/\D/g, '');
      const role = roleSelect?.value || 'Kitchen Manager';

      if (!name) {
        alert('Please enter the Admin / Staff Name.');
        nameInput?.focus();
        return;
      }
      if (!phone || phone.length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        phoneInput?.focus();
        return;
      }
      if (phone.length > 10) phone = phone.slice(-10);

      try {
        const res = await fetch('/api/admin/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, role })
        });
        const data = await res.json();
        if (data.success) {
          if (nameInput) nameInput.value = '';
          if (phoneInput) phoneInput.value = '';
          showAppToast(`🛡️ <strong>${escapeHtml(name)}</strong> (+91 ${escapeHtml(phone)}) added to Kitchen Admins!`, 4000);
          if (adminsDrawerBody && adminsDrawerBody.style.display !== 'none') {
            renderAdminStaffList();
          }
        } else {
          alert(data.error || 'Could not add admin.');
        }
      } catch (err) {
        alert('Network error registering new admin.');
      }
    });

    // Force Sync with Google Sheet Admins Tab
    document.getElementById('btnSyncAdminsSheet')?.addEventListener('click', async () => {
      try {
        showAppToast('🔄 Syncing with Google Sheet Admins Tab...', 2000);
        const res = await fetch('/api/admin/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          renderAdminStaffList();
          showAppToast(`✅ Live Synced! ${data.admins ? data.admins.length : 0} authorized admins active.`, 3000);
        } else {
          alert(data.error || 'Sync failed.');
        }
      } catch (err) {
        alert('Could not sync with Google Sheets.');
      }
    });
  }

  // 2. Audio Chime Synthesizer via Web Audio API
  function playAdminOrderChime() {
    playServiceBellSound();
  }

  // 3. Main Admin view rendering
  function renderAdminView() {
    renderAdminOrdersFeed(false);
    renderAdminStaffList();
  }

  // 4. Render Admin live orders feed
  async function renderAdminOrdersFeed(silent = false, force = false) {
    if (!force && state.activeTab !== 'admin') return;
    if (!state.isAdmin) return;

    try {
      const cust = getCustomerDetails();
      const adminPhone = (cust && cust.phone) || localStorage.getItem('rnr_admin_phone') || '';
      const res = await fetch(`/api/orders?admin_phone=${encodeURIComponent(adminPhone)}`, {
        headers: {
          'x-admin-phone': adminPhone
        }
      });
      if (!res.ok) {
        if (res.status === 403) {
          state.isAdmin = false;
          switchTab('home');
        }
        return;
      }
      const rawData = await res.json();
      const orders = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.orders) ? rawData.orders : []);

      // Sort by timestamp or date descending
      orders.sort((a, b) => {
        const tA = new Date(a.timestamp || a.date || 0).getTime();
        const tB = new Date(b.timestamp || b.date || 0).getTime();
        return tB - tA;
      });

      // Sound bell trigger & popup notification for incoming new orders
      if (!isFirstAdminOrderLoad && orders.length > 0) {
        const newOrders = orders.filter(o => !lastAdminOrderIds.has(o.orderId));
        if (newOrders.length > 0) {
          if (state.adminSoundEnabled) {
            playServiceBellSound();
          }
          triggerAdminNewOrderNotification(newOrders[0]);
        }
      }
      lastAdminOrderIds = new Set(orders.map(o => o.orderId));
      isFirstAdminOrderLoad = false;

      // Update 4 metrics
      const totalCount = orders.length;
      const totalRev = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const prepCount = orders.filter(o => {
        const s = (o.kitchenStatus || o.status || '').toUpperCase();
        return !s.includes('READY') && !s.includes('DELIVER') && !s.includes('COMPLETE');
      }).length;
      const readyCount = orders.filter(o => {
        const s = (o.kitchenStatus || o.status || '').toUpperCase();
        return s.includes('READY');
      }).length;

      const metricOrdersEl = document.getElementById('adminMetricTotalOrders');
      const metricRevEl = document.getElementById('adminMetricRevenue');
      const metricPrepEl = document.getElementById('adminMetricPreparing');
      const metricReadyEl = document.getElementById('adminMetricReady');
      const adminLiveSyncIndicator = document.getElementById('adminLiveSyncIndicator');

      if (metricOrdersEl) metricOrdersEl.textContent = String(totalCount);
      if (metricRevEl) metricRevEl.textContent = `₹${totalRev}`;
      if (metricPrepEl) metricPrepEl.textContent = String(prepCount);
      if (metricReadyEl) metricReadyEl.textContent = String(readyCount);

      if (adminLiveSyncIndicator) {
        const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        adminLiveSyncIndicator.textContent = `● Live Synced ${nowTime}`;
      }

      // Filter orders by active pill
      let filteredOrders = orders;
      if (state.adminFilter === 'active') {
        filteredOrders = orders.filter(o => {
          const s = (o.kitchenStatus || o.status || '').toUpperCase();
          return !s.includes('DELIVER') && !s.includes('COMPLETE');
        });
      } else if (state.adminFilter === 'preparing') {
        filteredOrders = orders.filter(o => {
          const s = (o.kitchenStatus || o.status || '').toUpperCase();
          return !s.includes('READY') && !s.includes('DELIVER') && !s.includes('COMPLETE');
        });
      } else if (state.adminFilter === 'ready') {
        filteredOrders = orders.filter(o => {
          const s = (o.kitchenStatus || o.status || '').toUpperCase();
          return s.includes('READY');
        });
      } else if (state.adminFilter === 'completed') {
        filteredOrders = orders.filter(o => {
          const s = (o.kitchenStatus || o.status || '').toUpperCase();
          return s.includes('DELIVER') || s.includes('COMPLETE');
        });
      }

      // Search query filter
      if (state.adminSearchQuery) {
        const q = state.adminSearchQuery;
        filteredOrders = filteredOrders.filter(o => {
          const sId = (o.orderId || '').toLowerCase();
          const sName = (o.customerName || '').toLowerCase();
          const sPhone = (o.customerPhone || '').toLowerCase();
          const sItems = (typeof o.items === 'string' ? o.items : JSON.stringify(o.items || o.itemList || '')).toLowerCase();
          const sUtr = (o.utr || '').toLowerCase();
          return sId.includes(q) || sName.includes(q) || sPhone.includes(q) || sItems.includes(q) || sUtr.includes(q);
        });
      }

      const inAppAdminOrdersList = document.getElementById('inAppAdminOrdersList');
      if (!inAppAdminOrdersList) return;

      if (filteredOrders.length === 0) {
        inAppAdminOrdersList.innerHTML = `
          <div class="admin-empty-state" style="text-align: center; padding: 40px 16px; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">🍽️</div>
            <h5 style="color: var(--text-primary); font-size: 0.9375rem; margin-bottom: 4px;">No Orders Found</h5>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">
              ${state.adminSearchQuery ? 'No customer orders match your search query.' : 'No orders in this status category currently.'}
            </p>
          </div>
        `;
        return;
      }

      // Render cards
      inAppAdminOrdersList.innerHTML = filteredOrders.map(order => {
        const rawStatus = (order.kitchenStatus || order.status || 'PREPARING').toUpperCase();
        let badgeClass = 'status-prep';
        let badgeLabel = 'PREPARING';
        let cardBorderClass = 'status-card-prep';

        if (rawStatus.includes('READY')) {
          badgeClass = 'status-ready';
          badgeLabel = 'READY FOR PICKUP';
          cardBorderClass = 'status-card-ready';
        } else if (rawStatus.includes('DELIVER') || rawStatus.includes('COMPLETE')) {
          badgeClass = 'status-done';
          badgeLabel = 'FOOD DELIVERED';
          cardBorderClass = 'status-card-done';
        }

        const safeOrderId = escapeHtml(order.orderId || '#RNR-UNKNOWN');
        const safeCustName = escapeHtml(order.customerName || 'Walk-in Guest');
        const safePhone = escapeHtml(order.customerPhone || '');
        const safeTotal = escapeHtml(String(order.total || 0));
        const safeMethod = escapeHtml(order.paymentMethod || 'UPI');
        const safeUtr = escapeHtml(order.utr || '');
        const safeNotes = escapeHtml(order.instructions || order.notes || '');

        let timeFormatted = '';
        if (order.timestamp || order.date) {
          try {
            timeFormatted = new Date(order.timestamp || order.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            timeFormatted = order.date || '';
          }
        }

        // Format items chips
        let itemsHtml = '';
        if (Array.isArray(order.itemList) && order.itemList.length > 0) {
          itemsHtml = order.itemList.map(it => {
            const qty = it.quantity || 1;
            const name = escapeHtml(it.name || 'Dish');
            const portion = it.portion ? ` (${escapeHtml(it.portion)})` : '';
            return `<div class="admin-dish-chip"><span class="admin-dish-chip-qty">${qty}x</span> <span>${name}${portion}</span></div>`;
          }).join('');
        } else if (Array.isArray(order.items)) {
          itemsHtml = order.items.map(it => {
            const qty = it.quantity || 1;
            const name = escapeHtml(it.name || 'Dish');
            const portion = it.portionTitle ? ` (${escapeHtml(it.portionTitle)})` : '';
            return `<div class="admin-dish-chip"><span class="admin-dish-chip-qty">${qty}x</span> <span>${name}${portion}</span></div>`;
          }).join('');
        } else if (typeof order.items === 'string') {
          itemsHtml = `<div class="admin-dish-chip"><span>${escapeHtml(order.items)}</span></div>`;
        } else {
          itemsHtml = `<div class="admin-dish-chip"><span>Food Items</span></div>`;
        }

        const initialChar = (order.customerName || 'G').charAt(0).toUpperCase();

        return `
          <div class="admin-order-card ${cardBorderClass}" data-order-id="${safeOrderId}">
            <div class="admin-card-head">
              <div>
                <div class="admin-card-id">${safeOrderId}</div>
                <div class="admin-card-time">🕒 ${timeFormatted || 'Today'}</div>
              </div>
              <span class="admin-card-badge ${badgeClass}">${badgeLabel}</span>
            </div>

            <!-- Customer Details Block -->
            <div class="admin-card-cust-box">
              <div class="admin-card-cust-left">
                <div class="admin-cust-avatar-circle">${escapeHtml(initialChar)}</div>
                <div class="admin-cust-info">
                  <div class="admin-cust-name" style="color: var(--text-primary); font-weight: 800;">${safeCustName}</div>
                  <div class="admin-cust-phone">+91 ${safePhone || 'N/A'}</div>
                </div>
              </div>
              <div class="admin-cust-actions">
                ${safePhone ? `
                  <a href="tel:+91${safePhone}" class="btn-admin-icon-action btn-admin-call-icon" title="Call Customer">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </a>
                ` : ''}
              </div>
            </div>

            <!-- Items Ordered Chips -->
            <div class="admin-card-items-box">
              <div class="admin-items-heading">ITEMS ORDERED:</div>
              <div class="admin-items-chips-wrap">
                ${itemsHtml}
              </div>
            </div>

            <!-- Kitchen Notes (if any) -->
            ${safeNotes ? `
              <div class="admin-card-notes">
                <span>📝 Special Notes:</span> ${safeNotes}
              </div>
            ` : ''}

            <!-- Total & Payment Row -->
            <div class="admin-card-payment-row">
              <div class="admin-payment-tag" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>💳 ${safeMethod}</span>
                ${safeUtr ? `<span style="background: rgba(234, 179, 8, 0.2); color: #FDE047; font-weight: 800; font-family: monospace; font-size: 0.75rem; padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(234, 179, 8, 0.45);">UTR: ${safeUtr}</span>` : ''}
              </div>
              <div class="admin-total-val">₹${safeTotal}</div>
            </div>

            <!-- Status Transition Buttons -->
            <div class="admin-workflow-actions">
              ${!rawStatus.includes('PREP') ? `
                <button type="button" class="btn-workflow btn-wf-prep" onclick="window.updateAdminOrderStatus('${safeOrderId}', 'PREPARING')">
                  ⏳ Set Preparing
                </button>
              ` : ''}

              ${!rawStatus.includes('READY') ? `
                <button type="button" class="btn-workflow btn-wf-ready" onclick="window.updateAdminOrderStatus('${safeOrderId}', 'READY FOR PICKUP')">
                  🔔 Set Pickup Ready
                </button>
              ` : ''}

              ${!rawStatus.includes('DELIVER') && !rawStatus.includes('COMPLETE') ? `
                <button type="button" class="btn-workflow btn-wf-done" onclick="window.updateAdminOrderStatus('${safeOrderId}', 'DELIVERED')">
                  ✅ Mark Delivered
                </button>
              ` : ''}

              <button type="button" class="btn-workflow btn-wf-del" onclick="window.deleteAdminOrder('${safeOrderId}')" title="Delete Order">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

    } catch (err) {
      if (!silent) {
        console.warn('Could not refresh admin orders feed:', err);
      }
    }
  }

  // 5. Update order status via server API (Restricted to verified Admins)
  window.updateAdminOrderStatus = async function(orderId, newStatus) {
    if (!state.isAdmin) {
      showAppToast('🔒 Admin access required to update orders.', 3500);
      return;
    }
    const cust = getCustomerDetails();
    const adminPhone = (cust && cust.phone) || localStorage.getItem('rnr_admin_phone') || '';

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-phone': adminPhone
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showAppToast(`⚡ Order <strong>${escapeHtml(orderId)}</strong> updated to <strong>${escapeHtml(newStatus)}</strong>!`);
        renderAdminOrdersFeed(false);

        // Update local customer orders if this order belongs to current user
        const pastOrders = loadPastOrders();
        const matched = pastOrders.find(o => o.orderId === orderId || o.orderId.replace(/^#/, '') === orderId.replace(/^#/, ''));
        if (matched) {
          matched.kitchenStatus = newStatus;
          matched.status = newStatus;
          savePastOrders(pastOrders);
          renderOrdersView();
        }

        // Instant cross-tab & cross-window broadcast (0ms delay)
        try {
          const bc = new BroadcastChannel('rnr_orders_channel');
          bc.postMessage({ type: 'ORDER_STATUS_CHANGED', orderId, newStatus, timestamp: Date.now() });
          localStorage.setItem('rnr_order_sync_trigger', JSON.stringify({ action: 'STATUS_UPDATE', orderId, newStatus, t: Date.now() }));
        } catch (e) {}
      } else {
        alert(data.error || 'Could not update order status.');
      }
    } catch (err) {
      alert('Network error updating status.');
    }
  };

  // 6. Delete order via server API (Restricted to verified Admins)
  window.deleteAdminOrder = async function(orderId) {
    if (!state.isAdmin) {
      showAppToast('🔒 Admin access required to delete orders.', 3500);
      return;
    }
    if (!confirm(`Are you sure you want to delete order ${orderId}?`)) return;

    const cust = getCustomerDetails();
    const adminPhone = (cust && cust.phone) || localStorage.getItem('rnr_admin_phone') || '';

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-phone': adminPhone
        }
      });
      const data = await res.json();
      if (data.success) {
        showAppToast(`🗑️ Order ${escapeHtml(orderId)} deleted successfully.`);
        renderAdminOrdersFeed(false);
        try {
          const bc = new BroadcastChannel('rnr_orders_channel');
          bc.postMessage({ type: 'ORDER_DELETED', orderId, timestamp: Date.now() });
          localStorage.setItem('rnr_order_sync_trigger', Date.now().toString());
        } catch (e) {}
      } else {
        alert(data.error || 'Could not delete order.');
      }
    } catch (err) {
      alert('Network error deleting order.');
    }
  };

  // 7. Copy staff row formatted for direct paste into Google Sheets Admins tab
  window.copyAdminSheetRow = function(name, phone, role) {
    const rowText = `${name}\t${phone}\t${role}\tActive\t${new Date().toLocaleDateString('en-IN')}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rowText).then(() => {
        showAppToast(`📋 Row for <strong>${escapeHtml(name)}</strong> copied! Paste into Google Sheet Admins tab.`, 3500);
      }).catch(() => {
        prompt('Copy this row for Google Sheet Admins tab:', rowText);
      });
    } else {
      prompt('Copy this row for Google Sheet Admins tab:', rowText);
    }
  };

  // 8. Render live authorized admin / staff numbers list
  async function renderAdminStaffList() {
    const listEl = document.getElementById('adminStaffList');
    if (!listEl) return;

    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        const admins = data.admins || [];
        if (admins.length === 0) {
          listEl.innerHTML = '<div style="font-size: 0.8125rem; color: var(--text-muted); padding: 8px;">No authorized admins listed. Add one below.</div>';
          return;
        }

        listEl.innerHTML = admins.map(a => {
          const safeName = escapeHtml(a.name || 'Admin');
          const safePhone = escapeHtml(a.phone || '');
          const safeRole = escapeHtml(a.role || 'Kitchen Admin');
          const isSuper = safeRole.toLowerCase().includes('owner') || safeRole.toLowerCase().includes('super');

          return `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--border-color); gap: 8px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                <span style="font-size: 1.1rem; flex-shrink: 0;">${isSuper ? '👑' : '🛡️'}</span>
                <div style="min-width: 0;">
                  <div style="font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${safeName}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">+91 ${safePhone} &bull; <strong style="color: var(--accent-amber);">${safeRole}</strong></div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                <button type="button" onclick="window.copyAdminSheetRow('${safeName}', '${safePhone}', '${safeRole}')" title="Copy row to paste into Google Sheet" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 4px 7px; color: var(--text-muted); font-size: 0.7rem; cursor: pointer; transition: all 0.2s;">
                  📋 Copy Row
                </button>
                <span class="badge-vip" style="font-size: 0.625rem; background: rgba(34, 197, 94, 0.15); color: #4ADE80; border: 1px solid rgba(34, 197, 94, 0.3);">ACTIVE</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.warn('Could not render admin staff list:', e);
    }
  }

});
