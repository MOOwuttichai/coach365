// เรื่องของวันนี้: ตัวละคร 3D เดินไปตามตารางของวัน แต่ละด่านคือสิ่งที่ต้องทำ ท้องฟ้าเปลี่ยนตามเวลา ฉากและชื่อตอนเปลี่ยนทุกวัน
// mode: preview = ก่อนวันเริ่ม (เดินดูวันแรกทั้งวัน) · intro = เปิดแอปครั้งแรกของวัน · now = กดดูเอง (เดินถึงด่านต่อไป) · recap = สรุปตอนจบวัน
// หุ่นตัวละครผอมลงตามน้ำหนักที่ลดได้จริง (prog 0 → 1) · Three.js โหลดจาก CDN ครั้งแรก แล้ว service worker เก็บไว้ใช้ออฟไลน์
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

const WORLDS = [
  { th: "ทุ่งหญ้ายามเช้า", ground: 0x86c06c, path: 0xead9a8, kind: "round", leaf: 0x3e8e4e, trunk: 0x7a5232 },
  { th: "ป่าสน", ground: 0x5f9460, path: 0xd9c49a, kind: "pine", leaf: 0x2f6b45, trunk: 0x6b4a2e },
  { th: "ชายหาด", ground: 0xe9d9a9, path: 0xfff4dc, kind: "palm", leaf: 0x3fa35a, trunk: 0x9b7448 },
  { th: "หุบเขาดอกไม้", ground: 0x9ccc74, path: 0xf1e1b8, kind: "flower", leaf: 0x4f9a45, trunk: 0x6b4a2e },
  { th: "เมืองยามเช้า", ground: 0xaeb8ad, path: 0x7f8985, kind: "city", leaf: 0x3e8e4e, trunk: 0x6b4a2e },
  { th: "ทะเลทราย", ground: 0xe3c28b, path: 0xf2deb0, kind: "cactus", leaf: 0x4f9a55, trunk: 0x4f9a55 },
  { th: "ดินแดนหิมะ", ground: 0xeef3f6, path: 0xc9d6df, kind: "pine", leaf: 0x3c6e5a, trunk: 0x5b4636 },
];
const CHAPTERS = ["ทดสอบความตั้งใจ", "วันที่ร่างกายเริ่มจำ", "เดินต่อแม้ไม่มีใครดู", "ด่านแห่งนิสัย", "ฮีโร่ไม่รออารมณ์", "สะสมทีละนิด", "เหล็กไม่โกหก",
  "คนเดิมกำลังหายไป", "วันธรรมดาที่ไม่ธรรมดา", "ไฟยังไม่มอด", "ทางยาวแต่ไม่ไกล", "ชนะใจตัวเองตอนเช้า", "เหงื่อคือหลักฐาน", "ไม่มีวันหยุดของคนตั้งใจ",
  "ก้าวเล็กๆ ที่ไม่หยุด", "ด่านที่ไม่มีใครเห็น", "วันที่อยากเลิก", "สู้กับข้ออ้าง", "ร่างกายใหม่กำลังก่อตัว", "ความต่อเนื่องคือพลัง", "เดินผ่านวันเหนื่อย",
  "ทีละวัน ทีละด่าน", "ฮีโร่ของเรื่องนี้คือคุณ", "คนที่ไม่ยอมแพ้"];
// ป้ายสั้นบนด่าน และเรื่องเล่าของแต่ละด่าน (pre = ก่อนทำ, done = ผ่านแล้ว, miss = ยังไม่ผ่าน)
const SHORT = { wake: "ตื่น", weigh: "ชั่ง + วัดตัว", med: "สมาธิเช้า", posture: "จัดบุคลิก", restAm: "พักก่อนงาน", meal1: "มื้อแรก", meal2: "มื้อว่าง", meal3: "มื้อสุดท้าย",
  kitchen: "ปิดครัว", room: "เก็บห้อง", backup: "สำรองข้อมูล", medNight: "สมาธิก่อนนอน", bed: "นอน" };
const short = (r) => SHORT[r.key] || r.title.replace(/^🔋 /, "").replace("เดินให้ครบ ", "เดิน ").split(" (")[0];
const SCENE = {
  wake: ["ดวงอาทิตย์ขึ้น ฮีโร่ของเราลืมตา ดื่มน้ำแล้วลุกทันที", "ตื่นตรงเวลา ชนะใจตัวเองเป็นด่านแรก", "ด่านแรกยังไม่ผ่าน… ตื่นแล้วต้องกดบอกด้วย"],
  weigh: ["ขึ้นตาชั่ง เก็บตัวเลขไว้เป็นหลักฐานการเดินทาง", "ตัวเลขถูกบันทึกแล้ว อีกไม่นานจะเห็นมันลด", "ไม่ชั่ง = ไม่รู้ว่าเดินมาถึงไหน"],
  med: ["นั่งนิ่ง 10 นาที ฝึกใจให้แข็งก่อนฝึกกาย", "ใจนิ่งแล้ว วันนี้ไม่มีอะไรมาสั่นได้", "ใจยังวิ่งวุ่น… กลับมานั่งได้ทุกเมื่อ"],
  posture: ["ยืดอก เก็บคาง ไหล่ผึ่ง สามท่าเปลี่ยนบุคลิก", "ยืนตรงขึ้นอีกนิด ดูดีขึ้นทันที", "ไหล่ยังห่ออยู่ 10 นาทีก็แก้ได้"],
  train: [(r) => `ด่านใหญ่ของวัน: ${short(r)}`, "ยกเสร็จแล้ว กล้ามกำลังซ่อมให้แข็งกว่าเดิม", "ด่านใหญ่ยังไม่ผ่าน ร่างกายรอคำสั่งอยู่"],
  restAm: ["พักก่อนออกไปลุย กาแฟดำสักแก้ว", "พักพอแล้ว พร้อมลุยงาน", "ยังไม่ได้พักเลย หายใจลึกๆ สักนิด"],
  meal1: ["แวะเติมพลังมื้อแรก โปรตีนมาก่อน", "เติมโปรตีนแล้ว กล้ามขอบคุณ", "มื้อนี้ยังไม่ได้บันทึก"],
  meal2: ["มื้อว่างโปรตีน ไข่ต้มคือเพื่อนแท้", "เติมพลังช่วงบ่ายแล้ว", "มื้อว่างยังไม่ได้บันทึก"],
  meal3: ["มื้อสุดท้ายก่อนประตูครัวปิด", "มื้อสุดท้ายเรียบร้อย", "มื้อสุดท้ายยังไม่ได้บันทึก"],
  kitchen: ["ประตูครัวปิดลง จนถึงเที่ยงพรุ่งนี้", "ครัวปิดสนิท ร่างกายเริ่มเผาไขมัน", "ประตูครัวยังเปิดอยู่…"],
  steps: [(r) => `ถนนวันนี้: ${short(r)}`, "ก้าวครบ ถนนวันนี้ถูกพิชิต", "ถนนยังเหลือ… ทุกก้าวคือไขมันที่หายไป"],
  room: ["เก็บห้อง 10 นาที ห้องโล่ง ใจก็โล่ง", "ห้องเรียบร้อย พรุ่งนี้ตื่นมาสบายตา", "ห้องยังรออยู่ 10 นาทีพอ"],
  backup: ["เก็บสมบัติให้ปลอดภัย สำรองข้อมูลไว้", "ข้อมูลปลอดภัยแล้ว", "ยังไม่ได้สำรองข้อมูล"],
  medNight: ["ปิดวันด้วยลมหายใจ จด 3 บรรทัด", "จิตใจสงบ พร้อมหลับลึก", "ยังไม่ได้นั่งก่อนนอน"],
  bed: ["ดาวขึ้นเต็มฟ้า ได้เวลาพักฟื้นร่างกาย", "หลับฝันดี กล้ามโตตอนนอน", "ยังไม่นอน… พรุ่งนี้อย่ามาโทษใคร"],
};
const TONE = {
  roast: { done: ["ไม่ได้แย่อย่างที่คิดนี่", "เห็นมั้ย ไม่ขี้เกียจก็ทำได้", "ผ่าน! อย่าเพิ่งเหลิง"], miss: ["จะปล่อยให้มันชนะเหรอ", "ข้ออ้างไม่นับนะ", "ด่านนี้หัวเราะเยาะอยู่"],
    now: ["ไปทำซะ อย่ามัวดูการ์ตูน", "ยืนดูเฉยๆ ไม่ผ่านนะ", "ลุก! ด่านนี้รออยู่"], all: "วันนี้ไม่มีอะไรให้ด่า… ทำได้ดีมาก (อย่าชินนะ)",
    some: (m) => `พลาด ${m} ด่าน พรุ่งนี้เอาคืน ไม่งั้นโดนอีก`, preview: "เลื่อนมาหลายรอบแล้ว รอบนี้เดินให้สุดทาง" },
  hype: { done: ["สุดยอด 💪", "ไฟแรงมาก 🔥", "อีกด่านที่พิชิตได้"], miss: ["ยังทัน ลุยต่อ!", "ไม่เป็นไร ด่านหน้าเอาคืน"], now: ["ไปเลย! ด่านนี้ของเรา", "แค่เริ่ม ที่เหลือมันไปเอง"],
    all: "ครบทุกด่าน! ฮีโร่ตัวจริง 🏆", some: (m) => `เหลือ ${m} ด่าน พรุ่งนี้ลุยใหม่ 🔥`, preview: "พรุ่งนี้การเดินทางเริ่มแล้ว 🔥" },
  soft: { done: ["เยี่ยมมาก", "ทำได้ดี"], miss: ["ไม่เป็นไร ค่อยๆ ทำ"], now: ["ถึงเวลาด่านนี้แล้ว"], all: "วันนี้ครบทุกอย่างแล้ว เก่งมาก",
    some: (m) => `วันนี้ทำได้หลายอย่าง เหลือ ${m} อย่าง`, preview: "พรุ่งนี้เริ่มวันแรก" },
};
// ท้องฟ้าตามเวลา (นาทีของวัน → สี)
const SKY = [[0, 0x0b1024], [330, 0x232c55], [400, 0xf2a37e], [480, 0xa8d7ff], [780, 0x8ccbff], [1050, 0xffb46e], [1150, 0x584a86], [1260, 0x141a33], [1440, 0x0b1024]];

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);

export async function openJourney({ mode, rows, day = 1, startTh = "", tone = "roast", why = "", prog = 0, streak = 0, tomorrow = "", voice = true, onAct, onVoice, onClose }) {
  const T = TONE[tone] || TONE.roast, n = rows.length;
  const rng = mulberry32(day * 7919 + (mode === "preview" ? 13 : 0));
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const W = WORLDS[(Math.max(1, day) - 1) % WORLDS.length];
  const chapter = day <= 1 ? "ก้าวแรกของการเดินทาง" : CHAPTERS[(day - 2) % CHAPTERS.length];
  const cur = (() => { const k = rows.findIndex((r) => r.state === "now" || r.state === "up"); return k < 0 ? n - 1 : k; })();
  const missed = rows.filter((r) => !r.done).length;

  // ---------- หน้าจอ ----------
  const ov = document.createElement("div"); ov.className = "jr"; document.body.appendChild(ov); document.body.style.overflow = "hidden";
  ov.innerHTML = `<canvas aria-hidden="true"></canvas>
    <div class="jr-top"><button class="jr-btn" data-a="close" type="button" aria-label="ปิด">✕</button><span class="jr-chip">${mode === "preview" ? `ตัวอย่างวันแรก · ${esc(startTh)}` : `วันที่ ${day}`} · ${W.th}</span><button class="jr-btn" data-a="voice" type="button" aria-label="เสียงพากย์">${voice ? "🔊" : "🔇"}</button></div>
    <div class="jr-title" hidden></div>
    <div class="jr-cap" hidden><div class="jr-eye"></div><p></p><div class="jr-sub"></div></div>
    <div class="jr-bottom"><div class="jr-row"><button class="jr-btn" data-a="skip" type="button">ข้าม ▶▶</button></div></div>`;
  const $ = (s) => ov.querySelector(s), capEl = $(".jr-cap"), titleEl = $(".jr-title"), bottom = $(".jr-bottom");
  const canvas = $("canvas");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
  catch (e) { ov.remove(); document.body.style.overflow = ""; throw e; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  scene.background = new THREE.Color(); scene.fog = new THREE.Fog(0xffffff, 28, 95);
  const resize = () => { const w = ov.clientWidth, h = ov.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 62 : 50; camera.updateProjectionMatrix(); };
  addEventListener("resize", resize); resize();
  // ฟอนต์ไทยของป้ายบนด่าน (รอไม่เกิน 1.2 วิ)
  try { await Promise.race([document.fonts?.load("700 46px 'IBM Plex Sans Thai'"), new Promise((r) => setTimeout(r, 1200))]); } catch (e) {}

  // ---------- เสียง ----------
  const say = (t) => { if (!voice || !("speechSynthesis" in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, "")); u.lang = "th-TH"; u.rate = 1.05; speechSynthesis.speak(u); };
  const chime = (f = 880) => { if (!voice) return; try { const ac = (chime.ac ||= new (window.AudioContext || window.webkitAudioContext)()); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.type = "sine"; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6); o.start(); o.stop(ac.currentTime + 0.65); } catch (e) {} };

  // ---------- พื้น ทาง ด่าน ----------
  const STEP = 5, s1 = rng() * 6, s2 = rng() * 6, s3 = rng() * 6, sx = rng() * 6;
  const height = (x, z) => 0.55 * Math.sin(x * 0.12 + s1) * Math.cos(z * 0.09 + s2) + 0.3 * Math.sin((x + z) * 0.05 + s3);
  const pts = [];
  for (let i = -1; i <= n; i++) { const x = Math.sin(i * 0.85 + sx) * 3.6, z = -i * STEP; pts.push(new THREE.Vector3(x, height(x, z), z)); }
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal"), curveLen = curve.getLength();
  const cpT = rows.map((_, i) => (i + 1) / (pts.length - 1)); // จุดควบคุมที่ i+1 = ด่าน i
  const ground = (t) => { const p = curve.getPoint(t); p.y = height(p.x, p.z); return p; };
  const sideOf = (tg) => new THREE.Vector3(-tg.z, 0, tg.x).normalize();

  const zc = -((n - 1) * STEP) / 2, L = (n + 2) * STEP + 70, Wd = 90;
  const gGeo = new THREE.PlaneGeometry(Wd, L, 45, Math.round(L / 2)); gGeo.rotateX(-Math.PI / 2); gGeo.translate(0, 0, zc);
  const gp = gGeo.attributes.position, gc = [], base = new THREE.Color(W.ground);
  for (let i = 0; i < gp.count; i++) { gp.setY(i, height(gp.getX(i), gp.getZ(i))); const c = base.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.07); gc.push(c.r, c.g, c.b); }
  gGeo.setAttribute("color", new THREE.Float32BufferAttribute(gc, 3)); gGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

  const S = Math.max(60, n * 40), pv = [], pi = [];
  for (let k = 0; k <= S; k++) {
    const t = k / S, p = curve.getPoint(t), sd = sideOf(curve.getTangent(t)).multiplyScalar(0.85);
    for (const sg of [1, -1]) { const x = p.x + sd.x * sg, z = p.z + sd.z * sg; pv.push(x, height(x, z) + 0.06, z); }
    if (k) { const a = (k - 1) * 2; pi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.Float32BufferAttribute(pv, 3)); pGeo.setIndex(pi); pGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(pGeo, new THREE.MeshLambertMaterial({ color: W.path, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })));

  const M = (c, e = 0, side) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, flatShading: true, emissive: e ? c : 0x000000, emissiveIntensity: e, side });
  function makeProp(key) {
    const g = new THREE.Group();
    const add = (geo, mat, x = 0, y = 0, z = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; g.add(m); return m; };
    switch (key) {
      case "wake": add(new THREE.IcosahedronGeometry(0.42, 1), M(0xffc83d, 0.8)); break;
      case "weigh": add(new THREE.BoxGeometry(0.9, 0.12, 0.7), M(0xeeeeee)); add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), M(0x333333), 0, 0.08, 0); break;
      case "med": case "medNight": add(new THREE.CylinderGeometry(0.45, 0.5, 0.18, 12), M(key === "med" ? 0xb57edc : 0x6b74c9)); add(new THREE.OctahedronGeometry(0.2), M(0xfff1a8, 0.9), 0, 0.42, 0); break;
      case "posture": add(new THREE.BoxGeometry(0.6, 1.0, 0.06), M(0xcfe8ff, 0.25)); add(new THREE.BoxGeometry(0.7, 1.1, 0.04), M(0x8a6a4a), 0, 0, -0.04); break;
      case "train": add(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), M(0x8a8f96), 0, 0, 0, Math.PI / 2); for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14), M(0x222831), s * 0.42, 0, 0, Math.PI / 2); break;
      case "restAm": add(new THREE.CylinderGeometry(0.22, 0.18, 0.36, 14), M(0xf4efe6)); add(new THREE.TorusGeometry(0.11, 0.035, 6, 12), M(0xf4efe6), 0.24, 0.02, 0); add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 14), M(0x4a2c1a), 0, 0.17, 0); break;
      case "meal1": case "meal2": case "meal3":
        add(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(0xf6f1e7, 0, THREE.DoubleSide), 0, 0.2, 0);
        add(new THREE.IcosahedronGeometry(0.16, 0), M(0xf2b134), -0.1, 0.24, 0.05); add(new THREE.IcosahedronGeometry(0.14, 0), M(0x5fae4a), 0.12, 0.23, -0.05); add(new THREE.IcosahedronGeometry(0.13, 0), M(0xfaf7ef), 0.02, 0.26, 0.14); break;
      case "kitchen": add(new THREE.BoxGeometry(0.55, 0.45, 0.25), M(0xf2c14e)); add(new THREE.TorusGeometry(0.2, 0.06, 8, 16, Math.PI), M(0x9aa3ab), 0, 0.22, 0); break;
      case "steps": add(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), M(0x8a6a4a), 0, 0.2, 0); add(new THREE.BoxGeometry(0.6, 0.38, 0.03), M(0xff5a4e), 0.3, 0.7, 0); break;
      case "room": add(new THREE.BoxGeometry(0.6, 0.5, 0.6), M(0xc79a5b)); add(new THREE.BoxGeometry(0.64, 0.06, 0.64), M(0xb0854a), 0, 0.27, 0); break;
      case "backup": add(new THREE.IcosahedronGeometry(0.3, 0), M(0xffffff), -0.2, 0, 0); add(new THREE.IcosahedronGeometry(0.36, 0), M(0xffffff), 0.15, 0.08, 0); break;
      case "bed": add(new THREE.BoxGeometry(1.0, 0.25, 0.6), M(0x5b6fd6)); add(new THREE.BoxGeometry(0.3, 0.12, 0.45), M(0xffffff), -0.32, 0.18, 0); add(new THREE.IcosahedronGeometry(0.18, 1), M(0xfff3b0, 0.8), 0.3, 0.75, 0); break;
      default: add(new THREE.OctahedronGeometry(0.35), M(0x7fd1c7, 0.3));
    }
    return g;
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  function makeLabel(r) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 168; const g = c.getContext("2d");
    g.fillStyle = r.done ? "#1e8a4c" : r.state === "late" ? "#c0392b" : r.state === "now" || r.state === "up" ? "#2b55d9" : "rgba(20,26,24,.8)";
    rr(g, 6, 6, 500, 124, 30); g.fill(); g.beginPath(); g.moveTo(236, 129); g.lineTo(256, 160); g.lineTo(276, 129); g.fill();
    g.fillStyle = "#fff"; g.textBaseline = "middle";
    g.globalAlpha = 0.85; g.font = "500 30px 'IBM Plex Mono', monospace"; g.fillText(`${r.done ? "✓ " : ""}${r.t}`, 30, 42); g.globalAlpha = 1;
    const txt = short(r); let fs = 48; do { g.font = `700 ${fs}px 'IBM Plex Sans Thai', 'Kanit', sans-serif`; fs -= 2; } while (g.measureText(txt).width > 450 && fs > 22);
    g.fillText(txt, 30, 92);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(3.0, 0.98, 1); sp.center.set(0.5, 0);
    return sp;
  }
  const pedGeo = new THREE.CylinderGeometry(0.9, 1.0, 0.25, 18), ringGeo = new THREE.TorusGeometry(1.15, 0.06, 6, 40);
  const cps = rows.map((r, i) => {
    const t = cpT[i], p = curve.getPoint(t), sd = sideOf(curve.getTangent(t)), sg = i % 2 ? 1 : -1;
    const x = p.x + sd.x * 2.4 * sg, z = p.z + sd.z * 2.4 * sg, g = new THREE.Group(); g.position.set(x, height(x, z), z); scene.add(g);
    const col = r.done ? 0x2fbf68 : r.state === "late" ? 0xe0533f : r.state === "now" || r.state === "up" ? 0x5b7cff : 0xd8dccf;
    const ped = new THREE.Mesh(pedGeo, M(col, r.done || i === cur ? 0.35 : 0.06)); ped.position.y = 0.12; g.add(ped);
    const prop = makeProp(r.key); prop.position.y = 1.0; g.add(prop);
    const lab = makeLabel(r); lab.position.y = 2.0; g.add(lab);
    let ring = null; if (i === cur && !r.done && mode !== "recap") { ring = new THREE.Mesh(ringGeo, M(0x8fa8ff, 0.9)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.28; g.add(ring); }
    return { g, prop, lab, ring, base: rng() * 6 };
  });

  // ---------- ของตกแต่งตามฉากของวัน ----------
  const samples = curve.getSpacedPoints(n * 8 + 10);
  const clear = (x, z, d) => samples.every((p) => (p.x - x) ** 2 + (p.z - z) ** 2 > d * d) && cps.every(({ g }) => (g.position.x - x) ** 2 + (g.position.z - z) ** 2 > 2.4 ** 2);
  const dummy = new THREE.Object3D();
  function scatter(count, minD, parts) {
    const meshes = parts.map(([geo, mat]) => { const m = new THREE.InstancedMesh(geo, mat, count); scene.add(m); return m; });
    let k = 0, tries = 0;
    while (k < count && tries++ < count * 30) {
      const x = (rng() - 0.5) * (Wd - 8), z = zc + (rng() - 0.5) * (L - 8); if (!clear(x, z, minD)) continue;
      const y = height(x, z), s = 0.7 + rng() * 0.7, ry = rng() * 6.28;
      parts.forEach(([, , place], j) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(s); place?.(dummy, s); dummy.updateMatrix(); meshes[j].setMatrixAt(k, dummy.matrix); });
      k++;
    }
    meshes.forEach((m) => { m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    return meshes;
  }
  const up = (h) => (d, s) => { d.position.y += h * s; };
  const trunk = [new THREE.CylinderGeometry(0.12, 0.18, 1, 6), M(W.trunk), up(0.5)];
  if (W.kind === "round") scatter(70, 3, [trunk, [new THREE.IcosahedronGeometry(0.85, 0), M(W.leaf), up(1.45)]]);
  else if (W.kind === "pine") scatter(80, 3, [trunk, [new THREE.ConeGeometry(0.85, 1.5, 7), M(W.leaf), up(1.4)], [new THREE.ConeGeometry(0.6, 1.1, 7), M(W.leaf), up(2.1)]]);
  else if (W.kind === "palm") scatter(45, 3.2, [[new THREE.CylinderGeometry(0.08, 0.13, 2.6, 6), M(W.trunk), (d, s) => { d.position.y += 1.3 * s; d.rotation.z = 0.12; }], [new THREE.ConeGeometry(1.3, 0.4, 6), M(W.leaf), (d, s) => { d.position.y += 2.65 * s; d.position.x += 0.16 * s; }]]);
  else if (W.kind === "flower") {
    scatter(30, 3, [trunk, [new THREE.IcosahedronGeometry(0.75, 0), M(W.leaf), up(1.35)]]);
    const fl = new THREE.IcosahedronGeometry(0.16, 0), fm = M(0xffffff); const [f] = scatter(260, 1.6, [[fl, fm, (d) => { d.position.y += 0.18; }]]);
    const pal = [0xff7aa8, 0xffd23f, 0xffffff, 0xb07cff, 0xff8c42].map((c) => new THREE.Color(c)); for (let k = 0; k < f.count; k++) f.setColorAt(k, pal[k % pal.length]); if (f.instanceColor) f.instanceColor.needsUpdate = true;
  } else if (W.kind === "city") {
    const [b] = scatter(60, 4.2, [[new THREE.BoxGeometry(1, 1, 1), M(0xffffff), (d) => { const h = 2 + Math.random() * 6; d.scale.set(1.6 + Math.random() * 1.6, h, 1.6 + Math.random() * 1.6); d.position.y += h / 2; }]]);
    const pal = [0xe9e4da, 0xc7d3e0, 0xf0c9a0, 0xa9b8c9, 0xd8a7a0].map((c) => new THREE.Color(c)); for (let k = 0; k < b.count; k++) b.setColorAt(k, pal[k % pal.length]); if (b.instanceColor) b.instanceColor.needsUpdate = true;
    scatter(25, 3, [trunk, [new THREE.IcosahedronGeometry(0.7, 0), M(W.leaf), up(1.3)]]);
  } else if (W.kind === "cactus") scatter(45, 3, [[new THREE.CapsuleGeometry(0.26, 1.0, 3, 8), M(W.leaf), up(0.8)], [new THREE.CapsuleGeometry(0.13, 0.4, 3, 6), M(W.leaf), (d, s) => { d.position.y += 1.05 * s; d.position.x += 0.36 * s; }]]);
  scatter(28, 2.5, [[new THREE.IcosahedronGeometry(0.4, 0), M(0x9aa09a), up(0.12)]]);
  const clouds = [];
  for (let k = 0; k < 9; k++) {
    const c = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, flatShading: true });
    for (let j = 0; j < 3; j++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + rng(), 1), mat); m.position.set(j * 1.6 - 1.6, rng() * 0.5, rng() * 0.8); c.add(m); }
    c.position.set((rng() - 0.5) * 70, 15 + rng() * 6, zc + (rng() - 0.5) * L); scene.add(c); clouds.push({ c, mat, v: 0.3 + rng() * 0.5 });
  }
  const sv = []; for (let k = 0; k < 500; k++) { const a = rng() * 6.28, e = Math.asin(0.15 + rng() * 0.85); sv.push(Math.cos(a) * Math.cos(e) * 150, Math.sin(e) * 150, Math.sin(a) * Math.cos(e) * 150); }
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute("position", new THREE.Float32BufferAttribute(sv, 3));
  const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false })); scene.add(stars);

  // ---------- แสง + ท้องฟ้าตามเวลา ----------
  const hemi = new THREE.HemisphereLight(0xffffff, W.ground, 0.9), sun = new THREE.DirectionalLight(0xffffff, 1.4); scene.add(hemi, sun, sun.target);
  const skyC = SKY.map(([m, c]) => [m, new THREE.Color(c)]), warm = new THREE.Color(0xffb27a), white = new THREE.Color(0xffffff), moon = new THREE.Color(0x8fa6ff);
  function setTime(m, focus) {
    m = ((m % 1440) + 1440) % 1440;
    let c = skyC[0][1]; for (let i = 1; i < skyC.length; i++) if (m <= skyC[i][0]) { const [m0, c0] = skyC[i - 1], [m1, c1] = skyC[i]; c = c0.clone().lerp(c1, (m - m0) / (m1 - m0)); break; }
    scene.background.copy(c); scene.fog.color.copy(c);
    const a = ((m - 375) / (1110 - 375)) * Math.PI, el = Math.sin(a), day = THREE.MathUtils.clamp(el * 2.2, 0, 1), night = THREE.MathUtils.clamp(-el * 3, 0, 1);
    sun.position.set(focus.x + Math.cos(a) * 40, focus.y + Math.max(6, Math.abs(el) * 40), focus.z - 15); sun.target.position.copy(focus);
    sun.color.copy(night > 0 ? moon : warm.clone().lerp(white, day)); sun.intensity = night > 0 ? 0.35 : 0.4 + day * 1.2;
    hemi.intensity = 0.35 + day * 0.6; stars.material.opacity = night; stars.position.copy(focus);
    clouds.forEach(({ mat }) => (mat.opacity = 0.25 + 0.65 * day));
  }
  const mins = rows.map((r) => toMin(r.t));
  function minutesAt(t) {
    if (!n) return 720;
    if (t <= cpT[0]) return mins[0] - 35 * (1 - t / cpT[0]);
    for (let i = 1; i < n; i++) if (t <= cpT[i]) return mins[i - 1] + ((mins[i] - mins[i - 1]) * (t - cpT[i - 1])) / (cpT[i] - cpT[i - 1]);
    return mins[n - 1] + (40 * (t - cpT[n - 1])) / (1 - cpT[n - 1]);
  }

  // ---------- ตัวละคร (ตัวกว้างตามน้ำหนักที่เหลือ ผอมลงเมื่อเข้าใกล้เป้า) ----------
  const fat = 1 + 0.5 * (1 - Math.max(0, Math.min(1, prog)));
  const hero = new THREE.Group(); scene.add(hero);
  const skin = M(0xe0ac82), shirt = M(0x2b55d9), shorts = M(0x1d2430), shoe = M(0xf2f2f2);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.5, 4, 12), shirt); torso.position.y = 1.28; torso.scale.set(fat, 1, fat * 0.9); hero.add(torso);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * fat, 0.32 * fat, 0.26, 12), shorts); hips.position.y = 0.9; hero.add(hips);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), skin); head.position.y = 2.0; hero.add(head);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.04, 6, 20), M(0xff5a4e)); band.rotation.x = Math.PI / 2; band.position.y = 2.07; hero.add(band);
  // หน้า (ด้าน +z) ให้รู้ว่าหันทางไหน
  const ink = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }), eye = new THREE.SphereGeometry(0.035, 8, 6);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(eye, ink); e.position.set(s * 0.085, 2.02, 0.22); hero.add(e); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 10, Math.PI), ink); mouth.position.set(0, 1.94, 0.225); mouth.rotation.z = Math.PI; hero.add(mouth);
  const limb = (len, r, mat, x, y, foot) => { const p = new THREE.Group(); p.position.set(x, y, 0); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), mat); m.position.y = -len / 2 - r; p.add(m); if (foot) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.3), shoe); f.position.set(0, -len - r * 2, 0.06); p.add(f); } hero.add(p); return p; };
  const legs = [limb(0.5, 0.11, shorts, -0.15 * fat, 0.8, true), limb(0.5, 0.11, shorts, 0.15 * fat, 0.8, true)];
  const arms = [limb(0.42, 0.085, skin, -(0.36 * fat + 0.07), 1.62), limb(0.42, 0.085, skin, 0.36 * fat + 0.07, 1.62)];
  arms.forEach((a, k) => (a.rotation.z = (k ? 1 : -1) * 0.12)); // แขนกางออกเล็กน้อย
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.6 * fat, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })); blob.rotation.x = -Math.PI / 2; scene.add(blob);

  // ---------- พลุ ----------
  const CN = 300, cPos = new Float32Array(CN * 3).fill(-999), cVel = new Float32Array(CN * 3), cLife = new Float32Array(CN), cCol = new Float32Array(CN * 3);
  const cGeo = new THREE.BufferGeometry(); cGeo.setAttribute("position", new THREE.BufferAttribute(cPos, 3)); cGeo.setAttribute("color", new THREE.BufferAttribute(cCol, 3));
  scene.add(new THREE.Points(cGeo, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, depthWrite: false })));
  let cNext = 0; const tmpC = new THREE.Color();
  function burst(at, count = 60) { for (let k = 0; k < count; k++) { const j = cNext++ % CN; cPos.set([at.x, at.y + 1.6, at.z], j * 3); cVel.set([(Math.random() - 0.5) * 5, 3 + Math.random() * 3.5, (Math.random() - 0.5) * 5], j * 3); cLife[j] = 1.8; tmpC.setHSL(Math.random(), 0.85, 0.6); cCol.set([tmpC.r, tmpC.g, tmpC.b], j * 3); } }

  // ---------- คำบรรยาย ----------
  function capFor(r) {
    const sc = SCENE[r.key] || [r.title, "ผ่านด่านนี้แล้ว", "ด่านนี้ยังไม่ผ่าน"], pre = typeof sc[0] === "function" ? sc[0](r) : sc[0];
    if (mode === "preview" || r.state === "next" || r.state === "up") return pre;
    if (r.done) return `${sc[1]} · ${pick(T.done)}`;
    if (r.state === "now") return `${pre} · ${pick(T.now)}`;
    return `${sc[2]} · ${pick(T.miss)}`;
  }
  const stateTh = (r) => (mode === "preview" ? "ตัวอย่าง" : r.done ? "✓ ผ่านแล้ว" : r.state === "now" ? "ตอนนี้" : r.state === "up" ? "ต่อไป" : r.state === "late" ? "ยังไม่ผ่าน" : "รออยู่");
  function caption(eye, text, sub = "", speak = true) {
    capEl.hidden = false; capEl.querySelector(".jr-eye").textContent = eye; capEl.querySelector("p").textContent = text; capEl.querySelector(".jr-sub").textContent = sub;
    capEl.classList.remove("in"); void capEl.offsetWidth; capEl.classList.add("in"); if (speak) say(text);
  }
  function showTitle(on) {
    titleEl.hidden = !on; if (!on) return;
    const big = rows.find((r) => r.key === "train");
    titleEl.innerHTML = `<div class="eyebrow">${mode === "preview" ? `ตัวอย่างวันแรก · ${esc(startTh)}` : `วันที่ ${day} · ${W.th}`}</div>`
      + `<h2>${mode === "recap" ? `จบบทที่ ${day}` : `บทที่ ${day}`} · ${chapter}</h2>`
      + `<p>${mode === "recap" ? `ผ่าน ${n - missed}/${n} ด่าน` : why ? `เพราะ “${esc(why)}”` : `${n} ด่านรออยู่${big ? ` · ด่านใหญ่ ${esc(short(big))}` : ""}`}</p>`;
    say(`บทที่ ${day} ${chapter}`);
  }

  // ---------- ลำดับเรื่อง ----------
  const beats = [];
  if (mode !== "now") beats.push({ k: "title", dur: 3.4 });
  if (mode === "intro" || mode === "preview") beats.push({ k: "over", dur: 4.6 });
  if (mode === "recap" || mode === "preview") rows.forEach((r, i) => beats.push({ k: "walk", i }, { k: "stop", i, dur: mode === "preview" ? 1.7 : 1.4 }));
  else for (let i = 0; i <= cur && i < n; i++) beats.push({ k: "walk", i, fast: i < cur }, { k: "stop", i, dur: i < cur ? (rows[i].done ? 0.7 : 1.2) : 0 });
  beats.push({ k: "end" });

  let bi = -1, beat = null, bt = 0, tNow = 0, ghost = 0, phase = 0, cheer = 0, raf = 0, last = performance.now(), closed = false, look = new THREE.Vector3(), faceTo = null;
  function next() {
    bi = Math.min(beats.length - 1, bi + 1); beat = beats[bi]; bt = 0; faceTo = null;
    showTitle(beat.k === "title");
    if (beat.k === "over") { const big = rows.find((r) => r.key === "train"); caption(mode === "preview" ? "พรุ่งนี้ทั้งวัน" : "ทั้งวันนี้", `${n} ด่าน ตั้งแต่ ${rows[0]?.t || ""} ถึง ${rows[n - 1]?.t || ""}${big ? ` · ด่านใหญ่: ${short(big)} ${big.t}` : ""}`); }
    if (beat.k === "stop" && beat.dur > 0) {
      const r = rows[beat.i]; faceTo = cps[beat.i].g.position;
      caption(`${r.t} · ด่าน ${beat.i + 1}/${n} · ${stateTh(r)}`, capFor(r), "", beat.dur >= 1.2);
      if (r.done && mode !== "preview") { burst(cps[beat.i].g.position, mode === "recap" ? 70 : 35); cheer = 0.9; chime(1046); }
    }
    if (beat.k === "end") showEnd();
  }
  function showEnd() {
    const r = rows[cur], btn = (a, t, main) => `<button class="jr-btn${main ? " main" : ""}" data-a="${a}" type="button">${t}</button>`;
    if (mode === "preview") {
      caption("พรุ่งนี้เจอกัน", T.preview, why ? `เพราะ “${why}”` : `${n} ด่าน · ตื่น ${rows[0]?.t || ""}`);
      bottom.innerHTML = `<div class="jr-row">${btn("close", "พร้อมแล้ว 💪", true)}</div>`;
    } else if (mode === "recap" || !r || r.done) {
      setTimeout(() => burst(hero.position, 120), 200); cheer = 1.2; if (!missed) { chime(1046); setTimeout(() => chime(1318), 180); setTimeout(() => chime(1568), 360); }
      caption(mode === "recap" ? `จบวันที่ ${day}` : "ครบแล้ว", missed ? T.some(missed) : T.all, `ผ่าน ${n - missed}/${n} ด่าน · ต่อเนื่อง ${streak} วัน${tomorrow ? ` · พรุ่งนี้: ${tomorrow}` : ""}`);
      bottom.innerHTML = `<div class="jr-row">${btn("close", mode === "recap" ? "ฝันดี 😴" : "ปิด", true)}</div>`;
    } else {
      faceTo = cps[cur].g.position;
      caption(`${r.t} · ด่านต่อไป`, `${capFor(r)}`, `${short(r)} · ${r.state === "now" ? "ถึงเวลาแล้ว" : `อีกไม่นาน (${r.t})`}`);
      bottom.innerHTML = `<div class="jr-row">${r.btn ? btn("go", `▶ ไปทำ: ${esc(short(r))}`, true) : ""}${btn("close", "ปิด")}</div>`;
    }
  }
  function skip() { if (!beat || beat.k === "end") return; const tgt = mode === "recap" || mode === "preview" ? cpT[n - 1] : cpT[cur]; if (tgt != null) tNow = tgt; bi = beats.length - 2; next(); }

  // ---------- วาดทุกเฟรม ----------
  const v = new THREE.Vector3(), camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; bt += dt; // เฟรมแรก now อาจน้อยกว่า last เล็กน้อย
    let moving = false;
    if (beat.k === "title" && bt >= beat.dur) next();
    else if (beat.k === "over") { ghost = ease(Math.min(1, bt / beat.dur)); if (bt >= beat.dur) next(); }
    else if (beat.k === "walk") { const tgt = cpT[beat.i]; if (tNow < tgt) { tNow = Math.min(tgt, tNow + ((beat.fast ? 7 : 3.4) / curveLen) * dt); moving = true; } else next(); }
    else if (beat.k === "stop" && bt >= beat.dur) next();

    // ตัวละคร
    const p = ground(tNow), tg = curve.getTangent(tNow); hero.position.copy(p); blob.position.set(p.x, p.y + 0.04, p.z);
    let yaw = Math.atan2(tg.x, tg.z);
    if (faceTo && !moving) yaw = Math.atan2(faceTo.x - p.x, faceTo.z - p.z);
    let dy = yaw - hero.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); hero.rotation.y += dy * Math.min(1, dt * 8);
    if (moving) phase += dt * (beat.fast ? 13 : 9);
    const sw = moving ? Math.sin(phase) : 0;
    legs[0].rotation.x = sw * 0.65; legs[1].rotation.x = -sw * 0.65; arms[0].rotation.x = -sw * 0.55; arms[1].rotation.x = sw * 0.55;
    if (cheer > 0) { cheer -= dt; const j = Math.abs(Math.sin(cheer * 7)) * 0.35; hero.position.y += j; arms.forEach((a, k) => { a.rotation.x = -2.8; a.rotation.z = (k ? 1 : -1) * 0.35; }); }
    else arms.forEach((a, k) => (a.rotation.z = (k ? 1 : -1) * 0.12));
    hero.position.y += moving ? Math.abs(Math.sin(phase)) * 0.06 : Math.sin(now / 600) * 0.015;

    // กล้อง
    if (beat.k === "title") { const fw = tg.clone().normalize(), sd = sideOf(tg); camGoal.copy(p).addScaledVector(fw, 4.4).addScaledVector(sd, 1.4); camGoal.y = p.y + 2.1; lookGoal.set(p.x, p.y + 1.5, p.z); }
    else if (beat.k === "over") { const gp2 = ground(ghost), gt = curve.getTangent(ghost), sd = sideOf(gt); camGoal.copy(gp2).addScaledVector(gt, -10).addScaledVector(sd, 3.5); camGoal.y = gp2.y + 13; lookGoal.copy(ground(Math.min(1, ghost + 0.06))); }
    else if (faceTo && !moving && !(beat.k === "end" && (mode === "recap" || mode === "preview"))) {
      // หยุดที่ด่าน: กล้องอยู่ข้างหลังตัวละคร มองไปที่ด่าน
      v.set(faceTo.x - p.x, 0, faceTo.z - p.z).normalize(); camGoal.set(p.x - v.x * 5.2 - v.z * 1.2, p.y + 3.4, p.z - v.z * 5.2 + v.x * 1.2);
      lookGoal.set((p.x + faceTo.x) / 2, p.y + 1.5, (p.z + faceTo.z) / 2);
    } else { const sd = sideOf(tg); camGoal.copy(p).addScaledVector(tg, -6.2).addScaledVector(sd, 2.2); camGoal.y = p.y + 4.2; lookGoal.copy(p).addScaledVector(tg, 2.5); lookGoal.y += 1.2;
      if (beat.k === "end") { const a = now / 4000; camGoal.set(p.x + Math.sin(a) * 6, p.y + 3.6, p.z + Math.cos(a) * 6); lookGoal.set(p.x, p.y + 1.3, p.z); } }
    const k = 1 - Math.exp(-dt * (beat.k === "over" ? 4 : 2.6)); if (bi <= 0 && bt < 0.05) { camera.position.copy(camGoal); look.copy(lookGoal); }
    camera.position.lerp(camGoal, k); look.lerp(lookGoal, k); camera.lookAt(look);

    setTime(beat.k === "title" ? minutesAt(0) : beat.k === "over" ? minutesAt(ghost) : minutesAt(tNow), p);
    cps.forEach(({ g, prop, lab, ring, base: b }) => {
      prop.rotation.y += dt * 0.8; prop.position.y = 1.0 + Math.sin(now / 700 + b) * 0.1; if (ring) ring.scale.setScalar(1 + Math.sin(now / 300) * 0.06);
      lab.material.opacity = THREE.MathUtils.clamp((camera.position.distanceTo(g.position) - 4.8) / 2.4, 0, 1); // ป้ายใกล้กล้องจางหาย ไม่บังจอ
    });
    clouds.forEach(({ c, v: cv }) => { c.position.x += cv * dt; if (c.position.x > 40) c.position.x = -40; });
    for (let j = 0; j < CN; j++) { if (cLife[j] <= 0) continue; cLife[j] -= dt; const o = j * 3; cVel[o + 1] -= 9 * dt; cPos[o] += cVel[o] * dt; cPos[o + 1] += cVel[o + 1] * dt; cPos[o + 2] += cVel[o + 2] * dt; if (cLife[j] <= 0) cPos[o + 1] = -999; }
    cGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function close(go) {
    if (closed) return; closed = true;
    cancelAnimationFrame(raf); removeEventListener("resize", resize); if ("speechSynthesis" in window) speechSynthesis.cancel();
    scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
    renderer.dispose(); renderer.forceContextLoss?.(); ov.remove(); document.body.style.overflow = "";
    onClose?.(); if (go) onAct?.(go);
  }
  ov.addEventListener("click", (e) => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (!a) { if (beat && (beat.k === "title" || beat.k === "over")) next(); return; } // แตะจอ = ข้ามช่วงเปิดเรื่อง
    if (a === "close") close();
    if (a === "go") close(rows[cur]?.key);
    if (a === "skip") skip();
    if (a === "voice") { voice = !voice; e.target.closest("[data-a]").textContent = voice ? "🔊" : "🔇"; if (!voice && "speechSynthesis" in window) speechSynthesis.cancel(); onVoice?.(voice); }
  });
  next();
  raf = requestAnimationFrame(frame);
  return { close };
}
