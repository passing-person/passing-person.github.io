/* sw.js - one-time cleanup worker */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1) Cache Storage 비우기
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));

    // 2) 현재 SW가 잡고 있는 페이지들 가져오기
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // 3) 자기 자신 등록 해제
    await self.registration.unregister();

    // 4) 열려 있는 페이지 강제 새로고침
    for (const client of clientList) {
      try {
        await client.navigate(client.url);
      } catch (_) {
        // 일부 브라우저에서 navigate가 실패할 수 있으니 무시
      }
    }
  })());
});

// fetch를 가로채지 않음
self.addEventListener('fetch', () => {});