const CACHE = "coach365-v13";
const SHELL = ["./", "index.html", "style.css", "app.js", "food.js", "meals.js", "exercises.js", "posecheck.js", "workout.js", "extras.js", "hiit.js", "barcode.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];
// ไฟล์ใหญ่จากภายนอกที่ไม่เปลี่ยน (ฟอนต์, AI ตรวจท่า, SDK) → ใช้ cache ก่อน
const CACHE_FIRST = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "storage.googleapis.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (CACHE_FIRST.includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  // ไฟล์แอป: ใช้เวอร์ชันใหม่จากเน็ตก่อน ถ้าออฟไลน์ใช้ของใน cache
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
