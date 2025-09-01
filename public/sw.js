const CACHE_NAME = 'phoenix-rise-wellness-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/assets/images/icon.png',
  '/assets/images/favicon.png',
  '/assets/images/splash-icon.png',
  '/assets/images/adaptive-icon.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Phoenix Rise SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Phoenix Rise SW: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Phoenix Rise SW: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Phoenix Rise SW: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Phoenix Rise SW: Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Phoenix Rise SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Phoenix Rise SW: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('Phoenix Rise SW: Serving from cache', event.request.url);
          return cachedResponse;
        }

        console.log('Phoenix Rise SW: Fetching from network', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('Phoenix Rise SW: Fetch failed', error);
            
            // Return offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/offline.html').then((offlinePage) => {
                return offlinePage || caches.match('/');
              });
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Phoenix Rise SW: Background sync', event.tag);
  
  if (event.tag === 'wellness-data-sync') {
    event.waitUntil(syncWellnessData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Phoenix Rise SW: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Time for your wellness check-in!',
    icon: '/assets/images/icon-192.png',
    badge: '/assets/images/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open-app',
        title: 'Open Phoenix Rise',
        icon: '/assets/images/icon-72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/assets/images/icon-72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Phoenix Rise Wellness', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Phoenix Rise SW: Notification clicked', event.action);
  
  event.notification.close();

  if (event.action === 'open-app') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Helper function to sync wellness data
async function syncWellnessData() {
  try {
    console.log('Phoenix Rise SW: Syncing wellness data...');
    
    // Get stored offline data
    const cache = await caches.open(CACHE_NAME);
    const offlineData = await cache.match('/offline-wellness-data');
    
    if (offlineData) {
      const data = await offlineData.json();
      
      // Sync with server (implement your sync logic here)
      const response = await fetch('/api/sync-wellness-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // Clear offline data after successful sync
        await cache.delete('/offline-wellness-data');
        console.log('Phoenix Rise SW: Wellness data synced successfully');
      }
    }
  } catch (error) {
    console.error('Phoenix Rise SW: Sync failed', error);
  }
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('Phoenix Rise SW: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});