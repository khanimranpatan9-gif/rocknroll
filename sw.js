// Rock N Rolls - High-Priority Service Worker for Lock-Screen Push & Order Notifications
const CACHE_NAME = 'rnr-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming System Push Notifications (from Web Push server or background trigger)
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Rock N Rolls Kitchen Alert',
    body: 'New order update available!',
    icon: '/assets/apple_chicken.jpg',
    badge: '/assets/apple_chicken.jpg',
    url: '/',
    tag: 'rnr-order-' + Date.now()
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/assets/apple_chicken.jpg',
    badge: data.badge || '/assets/apple_chicken.jpg',
    vibrate: [300, 100, 300, 100, 300, 100, 400],
    tag: data.tag || 'rnr-order-tag',
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Handle client-directed System Lock-Screen Notifications via postMessage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const finalOptions = Object.assign({
      icon: '/assets/apple_chicken.jpg',
      badge: '/assets/apple_chicken.jpg',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      renotify: true
    }, options);

    event.waitUntil(
      self.registration.showNotification(title, finalOptions)
    );
  }
});

// Notification Click Handler: Wakes up phone & navigates straight to Order / Kitchen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes('admin.html') && targetUrl.includes('admin.html')) {
            return client.focus();
          } else if (!client.url.includes('admin.html') && !targetUrl.includes('admin.html')) {
            return client.focus();
          }
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
