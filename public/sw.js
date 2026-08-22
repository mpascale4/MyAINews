// Service Worker for MyNewsAI Push Notifications
const CACHE_NAME = 'mynewsai-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: '🔥 Nuova Notizia Rilevante',
    body: 'È arrivata una notizia ad alta rilevanza AI per i tuoi interessi.',
    icon: '/icon.png',
    badge: '/icon.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const title = data.title || '🔥 MyNewsAI Notifica';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    image: data.image || undefined,
    data: data.data || { url: '/' },
    tag: data.tag || 'high-relevance-news',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: '📖 Leggi notizia' },
      { action: 'dismiss', title: 'Chiudi' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
