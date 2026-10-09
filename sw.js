const CACHE = "coach365-v19";
const SHELL = ["./", "index.html", "style.css", "app.js", "food.js", "meals.js", "exercises.js", "posecheck.js", "workout.js", "extras.js", "hiit.js", "barcode.js", "journey.js", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png"];
// ไฟล์ใหญ่จากภายนอกที่ไม่เปลี่ยน (ฟอนต์, AI ตรวจท่า, SDK) → ใช้ cache ก่อน
const CACHE_FIRST = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "storage.googleapis.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
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
  // no-cache = ถามเว็บทุกครั้ง (ไม่เปลี่ยนได้ 304 เร็ว) กันได้ไฟล์เก่าค้างใน cache เบราว์เซอร์ 10 นาทีหลังขึ้นเวอร์ชันใหม่
  const req = e.request.mode === "navigate" ? new Request(e.request.url, { cache: "no-cache", credentials: "same-origin" }) : new Request(e.request, { cache: "no-cache" });
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; }
    // เว็บตอบ 404/5xx (เว็บล่มหรือบัญชีมีปัญหา): ใช้ของเดิมใน cache แอปยังใช้ได้ ไม่ขึ้นหน้า error
    return caches.match(e.request).then((hit) => hit || (e.request.mode === "navigate" ? caches.match("index.html").then((h) => h || res) : res));
  }).catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
