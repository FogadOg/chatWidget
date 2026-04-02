const CACHE_NAME = 'companin-static-v1';
const PRECACHE_URLS = [
  '/',
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evt) => {
  // Cache-first strategy for same-origin requests
  if (evt.request.method !== 'GET') return;
  const url = new URL(evt.request.url);
  if (url.origin === self.location.origin) {
    evt.respondWith(
      caches.match(evt.request).then((cached) => cached || fetch(evt.request))
    );
  }
});

let API_URL = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('companin-offline', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('message-queue')) {
        db.createObjectStore('message-queue', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('message-queue', 'readonly');
    const req = tx.objectStore('message-queue').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueued(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('message-queue', 'readwrite');
    const req = tx.objectStore('message-queue').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function sendQueuedToApi() {
  if (!API_URL) {
    // fallback: notify clients to flush via page context
    const clients = await self.clients.matchAll();
    for (const client of clients) client.postMessage({ type: 'FLUSH_QUEUE' });
    return;
  }

  const queued = await getQueued();
  const results = [];

  for (const item of queued.sort((a, b) => (a.seq || 0) - (b.seq || 0))) {
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      if (!resp.ok) throw new Error('Bad response');

      let serverData = null;
      try { serverData = await resp.json(); } catch {}

      await removeQueued(item.id);
      results.push({ id: item.id, success: true, serverMessage: serverData?.data || null });
    } catch (_err) {
      results.push({ id: item.id, success: false });
      // stop on first failure to preserve order
      break;
    }
  }

  // Notify clients of the result mapping so they can reconcile pending messages
  const clients = await self.clients.matchAll();
  for (const client of clients) client.postMessage({ type: 'QUEUE_FLUSH_RESULT', results });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'companin-send-queue') {
    event.waitUntil(sendQueuedToApi());
  }
});

self.addEventListener('message', (evt) => {
  const data = evt.data || {};
  if (!data || !data.type) return;

  if (data.type === 'SET_API') {
    API_URL = data.apiUrl || null;
  }

  if (data.type === 'SEND_QUEUE_NOW') {
    evt.waitUntil(sendQueuedToApi());
  }
});
