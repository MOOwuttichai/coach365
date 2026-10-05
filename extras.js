// ฟีเจอร์เสริม: กราฟต่อท่า รูปเทียบก่อน-หลัง สรุปสัปดาห์ ปฏิทินความสม่ำเสมอ น้ำ แนวโน้ม + ปรับแคลอรี่รายสัปดาห์ ไขมันในร่างกาย รายการซื้อของ
(() => {
  const C = window.Coach, $ = (id) => document.getElementById(id), DAY = 86400000;
  const e1rm = (w, r) => (w && r ? w * (1 + r / 30) : 0);
  const logs = () => C.S.logs;
  const days = () => Object.keys(logs()).sort();

  // ---------- กราฟความก้าวหน้าต่อท่า (ใช้ทั้งใน player และคลังท่า) ----------
  window.exChart = function (id, opts = {}) {
    const pts = days().filter((k) => !logs()[k].deload).map((k) => {
      const sets = (logs()[k].lifts?.[id]?.sets || []).filter((s) => s.done && s.r);
      if (!sets.length) return null;
      const best = sets.reduce((b, s) => (e1rm(s.w || 0, s.r) > e1rm(b.w || 0, b.r) ? s : b));
      return { k, e: e1rm(best.w || 0, best.r), w: best.w || 0, r: best.r, vol: sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), reps: sets.reduce((a, s) => a + s.r, 0) };
    }).filter(Boolean);
    if (pts.length < 2) return `<p class="small muted">${pts.length ? "เล่นอีก 1 ครั้งจะเริ่มเห็นกราฟ" : "ยังไม่มีข้อมูล"}</p>`;
    const bodyweight = pts.every((p) => !p.w);
    const val = (p) => (bodyweight ? p.reps : p.e), label = bodyweight ? "ครั้งรวมต่อวัน" : "ความแข็งแรง (e1RM กก.)";
    const W = 640, H = 200, L = 44, R = 16, T = 16, B = 30;
    const vs = pts.map(val), lo = Math.min(...vs) * 0.9, hi = Math.max(...vs) * 1.08 || 1;
    const x = (i) => L + ((W - L - R) * i) / (pts.length - 1), y = (v) => T + ((H - T - B) * (hi - v)) / (hi - lo || 1);
    let s = "";
    for (let g = 0; g <= 4; g++) { const v = lo + ((hi - lo) * g) / 4; s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${v.toFixed(bodyweight ? 0 : 1)}</text>`; }
    const path = pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(val(p)).toFixed(1)).join(" ");
    s += `<path d="${path} L${x(pts.length - 1)} ${H - B} L${x(0)} ${H - B} Z" fill="var(--accent)" opacity=".12"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts.forEach((p, i) => { s += `<circle cx="${x(i)}" cy="${y(val(p))}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`; if (i === 0 || i === pts.length - 1 || pts.length <= 6) s += `<text x="${x(i)}" y="${H - 10}" text-anchor="${i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}" font-size="11" fill="var(--muted)">${p.k.slice(5)}</text>`; });
    const first = val(pts[0]), last = val(pts[pts.length - 1]), gain = ((last - first) / first) * 100;
    const lastP = pts[pts.length - 1];
    return `<div class="exchart"><div class="row between"><span class="small muted">${label}</span><b class="num ${gain >= 0 ? "ok" : "no"}">${gain >= 0 ? "+" : ""}${gain.toFixed(0)}% ใน ${pts.length} ครั้ง</b></div><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="กราฟความก้าวหน้า">${s}</svg>${opts.compact ? "" : `<div class="small muted">ล่าสุด ${lastP.w || "ตัวเปล่า"} × ${lastP.r} · ปริมาณ ${C.fmt(lastP.vol)}</div>`}</div>`;
  };
  // ปุ่ม 📈 ในคลังท่า
  document.querySelector('[data-view="train"]').addEventListener("click", (e) => {
    const b = e.target.closest("[data-chart]"); if (!b) return;
    const box = b.closest(".ex").querySelector(".exchart-box"); box.innerHTML = box.innerHTML ? "" : window.exChart(b.dataset.chart);
  });

  // ---------- น้ำ ----------
  function renderWater() {
    const l = C.S.logs[C.iso(C.today())] || {}, n = l.water || 0;
    $("water").innerHTML = `<span class="eyebrow">น้ำวันนี้ <span class="num">${n}/8 แก้ว</span></span><div class="cups">${Array.from({ length: 8 }, (_, i) => `<button type="button" class="cup ${i < n ? "on" : ""}" data-cup="${i + 1}" aria-label="แก้วที่ ${i + 1}">💧</button>`).join("")}</div>`;
  }
  $("water").addEventListener("click", (e) => {
    const c = e.target.closest("[data-cup]"); if (!c) return;
    const l = (C.S.logs[C.iso(C.today())] = C.S.logs[C.iso(C.today())] || {}), n = Number(c.dataset.cup);
    l.water = l.water === n ? n - 1 : n; C.save(); renderWater(); if (l.water === 8) C.celebrate("น้ำครบ 8 แก้ว 💧");
  });

  // ---------- ปฏิทินความสม่ำเสมอ 8 สัปดาห์ ----------
  function score(l) { if (!l) return 0; return ["if", "workout", "protein", "meditate"].filter((k) => l[k]).length + ((l.steps || 0) >= 5000 ? 1 : 0); }
  function renderHeat() {
    const t = C.today(), start = new Date(t - DAY * (7 * 8 - 1)); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    let cells = "", d = new Date(start);
    while (d <= t) {
      const k = C.iso(d), s = score(logs()[k]);
      cells += `<i class="h${s}" title="${k.slice(5)}: ${s}/5"></i>`; d = new Date(d.getTime() + DAY);
    }
    const streak = (() => { let n = 0, x = new Date(t); if (score(logs()[C.iso(x)]) < 2) x = new Date(x - DAY); while (score(logs()[C.iso(x)]) >= 2) { n++; x = new Date(x - DAY); } return n; })();
    $("heat").innerHTML = `<div class="row between"><h2>ความสม่ำเสมอ</h2><b class="num">🔥 ${streak} วันติด</b></div><div class="heat">${cells}</div><div class="small muted">แต่ละช่อง = 1 วัน สีเข้มขึ้นตามจำนวนที่ทำได้ (IF · เวท · โปรตีน · สมาธิ · เดิน 5,000+)</div>`;
  }

  // ---------- น้ำหนักเฉลี่ย 7 วัน + อัตราต่อสัปดาห์ + ปรับแคลอรี่รายสัปดาห์ ----------
  // ช่วงที่ควรเป็น = อัตราของช่วงในแผน (%/สัปดาห์) ± ระยะยอมรับ · ตอนลดยอมให้เร็วกว่าเป้าได้มากกว่าช้ากว่า
  const band = (r) => (r < 0 ? [r - 0.35, r + 0.25] : r > 0 ? [r - 0.1, r + 0.1] : [-0.2, 0.2]);
  let adjDelta = 0;
  function renderTrend() {
    const ws = days().filter((k) => logs()[k].weight != null).map((k) => ({ k, w: logs()[k].weight }));
    if (ws.length < 3) { $("trend").innerHTML = `<p class="small muted">ชั่งน้ำหนักครบ 3 วันจะเริ่มคำนวณแนวโน้ม</p>`; return; }
    const avg = (arr) => arr.reduce((a, x) => a + x.w, 0) / arr.length;
    const last7 = ws.slice(-7), prev7 = ws.slice(-14, -7);
    const a7 = avg(last7), rate = prev7.length >= 3 ? (a7 - avg(prev7)) / ((new Date(last7[last7.length - 1].k) - new Date(prev7[prev7.length - 1].k)) / DAY) * 7 : null;
    const p = C.plan(C.today()), mode = p.mode, gw = C.goalW(), S = C.S;
    const [lo, hi] = band(p.rate).map((r) => (r * a7) / 100), cutting = mode === "cut" || mode === "minicut";
    const cls = rate == null || mode === "dietbreak" ? "" : rate >= lo && rate <= hi ? "good" : "warn";
    // เกินช่วงด้านไหน → ปรับ 100 kcal · ไม่ปรับใน 3 สัปดาห์แรก (น้ำออกเยอะ) สัปดาห์พักไดเอท+สัปดาห์ถัดไป
    // และ 2 สัปดาห์แรกหลังเปลี่ยนช่วง (น้ำ/ไกลโคเจนขึ้นลง) · ปรับแล้วรอดูผล 2 สัปดาห์
    const ago = (n) => C.plan(new Date(C.today().getTime() - n * DAY));
    const canAdj = rate != null && mode !== "dietbreak" && !ago(7).dietBreak && ago(14).mode === mode && p.day > 21 && (S.adjNext ?? 0) <= p.week;
    const floor = canAdj && cutting && rate > hi && p.target.kcal <= 1550; // ถึงพื้น 1,500 แล้ว ให้เดินเพิ่มแทน
    adjDelta = !canAdj ? 0 : rate > hi ? -100 : rate < lo ? 100 : 0;
    if (floor || Math.abs((S.kcalAdj || 0) + adjDelta) > 500) adjDelta = 0;
    let msg;
    if (rate == null) msg = "ชั่งต่ออีก 1 สัปดาห์จะเริ่มบอกแนวโน้มได้";
    else if (mode === "dietbreak") msg = "สัปดาห์พักไดเอท น้ำหนักขึ้น 0.5–1 กก. ได้ เป็นน้ำกับไกลโคเจนในกล้าม สัปดาห์หน้าจะลงเอง";
    else if (cutting) msg = rate > hi ? `ลงช้ากว่าแผน${rate >= 0 ? " (นิ่ง/ขึ้น)" : ""} เช็กน้ำมันแฝงในอาหารร้าน ของว่าง และเครื่องดื่มหวาน` : rate < lo ? "ลงเร็วเกินไป เสี่ยงเสียกล้าม กินเพิ่มอีกนิด" : "ลงตามแผน รักษาโปรตีนกับน้ำหนักบาร์ไว้ กล้ามจะไม่หาย";
    else if (mode === "bulk") msg = rate > hi ? "ขึ้นเร็วไป จะเป็นไขมันมากกว่ากล้าม" : rate < lo ? "ยังไม่ขึ้นตามแผน ช่วงสร้างกล้ามต้องกินให้ถึงเป้า" : "กำลังดี กล้ามขึ้นช้าแต่ชัวร์ ดูน้ำหนักบาร์ที่เพิ่มเป็นหลัก";
    else msg = rate > hi ? "น้ำหนักขึ้น ควรนิ่ง" : rate < lo ? "น้ำหนักลง ช่วงนี้ควรนิ่ง" : "น้ำหนักนิ่งตามแผน ร่างกายกำลังปรับตัว";
    if (cutting && rate != null && rate < -0.05 && a7 > gw) { const d = new Date(C.today().getTime() + ((a7 - gw) / -rate) * 7 * DAY); msg += ` · ถ้าเป็นแบบนี้ต่อไป ถึง ${gw} กก. ประมาณ <b>${d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</b>`; }
    const how = adjDelta < 0 ? (cutting ? "เช่น ข้าวมื้อเย็นลดครึ่งทัพพี + เลิกเครื่องดื่มหวาน 1 แก้ว · หรือจะเดินเพิ่มวันละ 2,000 ก้าวแทนก็ได้ เลือกอย่างเดียว" : "เช่น ข้าวลด 1 ทัพพีต่อวัน")
      : "เช่น ข้าวเพิ่ม 1 ทัพพี หรือนมจืด 1 กล่อง";
    const adj = adjDelta ? `<div class="callout small" style="margin-top:8px"><b>ปรับประจำสัปดาห์:</b> ${adjDelta > 0 ? "เพิ่ม" : "ลด"} 100 kcal/วัน (${C.fmt(p.target.kcal)} → ${C.fmt(p.target.kcal + adjDelta)}) ${how}
      <div class="row" style="margin-top:8px"><button class="btn small" type="button" data-adj="apply">ปรับเป้า ${adjDelta > 0 ? "+" : "−"}100 kcal</button><button class="btn ghost small" type="button" data-adj="skip">ยังก่อน ดูอีกสัปดาห์</button></div></div>`
      : floor ? `<div class="callout small" style="margin-top:8px">แคลอรี่ถึงขั้นต่ำแล้ว อย่าลดอาหารอีก ให้เพิ่มเดินวันละ 2,000 ก้าว และเช็กการนอน</div>` : "";
    $("trend").innerHTML = `<div class="stats"><div class="stat good"><span class="eyebrow">เฉลี่ย 7 วัน</span><b>${a7.toFixed(1)}</b><span class="small muted">เป้าตอนนี้ ${p.goal.toFixed(1)}</span></div>`
      + `<div class="stat ${cls}"><span class="eyebrow">ต่อสัปดาห์</span><b>${rate == null ? "–" : (rate > 0 ? "+" : "") + rate.toFixed(2)}</b><span class="small muted">ควรอยู่ ${lo.toFixed(2)} ถึง ${hi > 0 ? "+" : ""}${hi.toFixed(2)}</span></div>`
      + `<div class="stat"><span class="eyebrow">เป้ากินตอนนี้</span><b>${C.fmt(p.target.kcal)}</b><span class="small muted">kcal${S.kcalAdj ? ` · ปรับแล้ว ${S.kcalAdj > 0 ? "+" : ""}${S.kcalAdj}` : ""}</span></div></div>`
      + `<p class="small" style="margin:6px 0 0">${msg}</p>${adj}`;
  }
  $("trend").addEventListener("click", (e) => {
    const a = e.target.dataset.adj; if (!a) return;
    const S = C.S, w = C.plan(C.today()).week;
    if (a === "apply") { S.kcalAdj = (S.kcalAdj || 0) + adjDelta; S.adjNext = w + 2; C.toast(`เป้าแคลอรี่ ${adjDelta > 0 ? "+" : "−"}100 แล้ว ดูผลอีก 2 สัปดาห์`); }
    else { S.adjNext = w + 1; C.toast("โอเค สัปดาห์หน้าดูใหม่"); }
    C.save(); C.refresh();
  });

  // ---------- แผน 2 ปี ----------
  const PROG = { AB: "Full body 3 วัน", UL: "Upper/Lower 4 วัน", PPL: "Push/Pull/Legs 5 วัน", PPL2: "PPL หนัก 5 วัน" };
  function renderRoadmap() {
    const p = C.plan(C.today()), ext = C.S.cutExtend || 0;
    const abs = (j) => (j >= 365 ? j + ext * 7 : j); // วันตามแผนหลัก → วันจริง (รวมช่วงลดต่อ)
    $("roadmap").innerHTML = C.PHASES.map(([a, b, name, mode, prog, note, rate], i) => {
      const s = abs(Math.round((a - 1) * 30.4)), e = abs(Math.round(b * 30.4)), T = C.targetFor(mode, rate, C.goalAt(s));
      return `<div class="rm ${i + 1 === p.phase ? "now" : i + 1 < p.phase ? "past" : ""}">
      <div class="rm-h"><b>${name}</b><span class="num small muted">เดือน ${a}${b > a ? "–" + b : ""}</span></div>
      <div class="small">${note}</div>
      <div class="small muted">${T.th} · ~${C.fmt(T.kcal)} kcal · โปรตีน ${T.protein} ก. · เวท ${PROG[prog]} · ${C.goalAt(s).toFixed(0)} → ${C.goalAt(e).toFixed(0)} กก.</div></div>`;
    }).join("") + `<ul class="plainlist small muted" style="margin-top:6px">
      <li>🍚 พักไดเอท 1 สัปดาห์ท้ายเดือน 3, 6, 9: กินระดับรักษาน้ำหนัก ช่วยให้ลดต่อได้ทั้งปีโดยไม่พัง</li>
      <li>🚦 เริ่มปี 2 (สร้างกล้าม) เมื่อไขมัน ≤ 15% ถ้ายังไม่ถึง แอปจะให้ลดต่อทีละ 4 สัปดาห์${ext ? ` (ตอนนี้ลดต่อแล้ว +${ext} สัปดาห์)` : ""}</li>
      <li>⚖️ kcal ในตารางคิดจากน้ำหนักตามเส้นเป้า ของจริงแอปคำนวณจากน้ำหนักที่ชั่ง และปรับให้ทุกสัปดาห์</li>
      <li>📏 ปลายปี 2 จะหนักกว่าปลายปี 1 เล็กน้อยเพราะเป็นกล้ามที่สร้างมา ดูรอบเอว ไขมัน % และรูปเทียบเป็นหลัก</li></ul>`;
  }

  // ---------- ไขมันในร่างกาย + น้ำหนักที่ลีนจริง ----------
  // สูตร US Navy (ผู้ชาย, ซม.): คลาดเคลื่อน ±3–4% จากเครื่องสแกน แต่ดูแนวโน้มได้ดีถ้าวัดแบบเดิมทุกครั้ง
  const navyBf = (h, waist, neck) => (h && waist && neck && waist - neck > 5 ? 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450 : null);
  const waistFor = (h, neck, bf) => neck + 10 ** ((1.0324 + 0.15456 * Math.log10(h) - 495 / (bf + 450)) / 0.19077);
  // น้ำหนักตอนไขมันเหลือ bf%: จำลองลดทีละ 0.5 กก. สัดส่วนที่เสียเนื้อเยื่อไม่ใช่ไขมัน (น้ำ ไกลโคเจน กล้าม)
  // ตามสมการ Forbes 10.4 / (10.4 + มวลไขมัน) ซึ่งยิ่งผอมยิ่งเสียมาก · คิดครึ่งเดียวเพราะเล่นเวท + โปรตีนถึง
  function weightAt(w, lean, bf) {
    let fat = w - lean;
    while (w > 35 && fat / w > bf / 100) { const p = (0.5 * 10.4) / (10.4 + fat); w -= 0.5; lean -= 0.5 * p; fat -= 0.5 * (1 - p); }
    return w;
  }
  const firstOf = (key) => { const ks = days().filter((d) => logs()[d][key] != null), s = C.iso(new Date(C.START.getTime() - 7 * DAY)); return logs()[ks.find((d) => d >= s) ?? ks[0]]?.[key]; };
  const latestOf = (key) => { const k = days().filter((d) => logs()[d][key] != null).pop(); return k ? { k, v: logs()[k][key] } : null; };
  let bcGoal = null;
  function renderBodyComp() {
    const box = $("bodycomp"), S = C.S, h = Number(S.profile.height), gw = C.goalW(), gbf = Number(S.profile.goalBf) || 12, p = C.plan(C.today());
    const head = (sub) => `<div class="row between"><h2>ไขมันในร่างกาย</h2><span class="small muted">${sub}</span></div>`;
    if (!h) { box.innerHTML = head("") + `<p class="small" style="margin:0">ใส่ส่วนสูงก่อน แอปถึงจะคำนวณไขมัน และบอกได้ว่าน้ำหนักเท่าไรคุณถึงจะลีนแบบเห็นกล้าม</p><div class="row"><button class="btn small" type="button" data-bc="profile">ใส่ส่วนสูง/อายุ</button></div>`; return; }
    const m = h / 100, look = [21.5 * m * m, 23 * m * m]; // ลีนเห็นกล้าม (ไขมัน ~10–12%) กล้ามระดับนักกีฬาทั่วไป ≈ BMI 21.5–23
    const lookTxt = `คนสูง ${h} ซม. ที่ไขมัน ~10–12% และกล้ามระดับในรูปที่อยากได้ มักหนัก <b>${look[0].toFixed(0)}–${look[1].toFixed(0)} กก.</b>`;
    const wa = latestOf("waist"), ne = latestOf("neck"), bf = navyBf(h, wa?.v, ne?.v);
    if (bf == null) {
      box.innerHTML = head("ยังไม่ได้วัด") + `<p class="small" style="margin:0">วัดรอบเอว (ระดับสะดือ) กับรอบคอ (ใต้ลูกกระเดือก) ตอนเช้าก่อนกิน แล้วใส่ในช่อง "บันทึกเพิ่มเติม" แอปจะคำนวณไขมันให้</p>
        <div class="callout small">${lookTxt} · เป้าตอนนี้ ${gw} กก.${gw < look[0] - 1.5 ? " ซึ่งต่ำกว่าช่วงนี้ อาจต้องเสียกล้ามถึงจะถึง รอผลวัดไขมันก่อนตัดสินใจ" : ""}</div>`;
      return;
    }
    const w = C.trendWeight() ?? C.startW(), lean = w * (1 - bf / 100), b0 = navyBf(h, firstOf("waist"), firstOf("neck"));
    const at = (x) => weightAt(w, lean, x), pos = (v) => ((Math.min(40, Math.max(5, v)) - 5) / 35) * 100;
    bcGoal = Math.round(at(gbf));
    const low = bf > 15 && gw < at(10) - 1.5, high = bf > 15 && gw > at(15) + 1.5;
    const verdict = bf <= 15 ? `✅ ไขมันอยู่ในช่วงเป้า 10–15% แล้ว${bf <= gbf ? " ลีนแบบเห็นกล้ามท้อง" : " อีกนิดเดียว"}`
      : low ? `⚠️ เป้า ${gw} กก. ต่ำกว่าน้ำหนักที่คุณน่าจะมีตอนไขมันเหลือ 10% (~${at(10).toFixed(0)} กก.) ถ้าจะลงถึง ${gw} ต้องเสียกล้ามอีกราว ${(at(10) - gw).toFixed(0)} กก. จะดูผอมแห้ง ไม่ใช่ลุคในรูป`
      : high ? `⚠️ ที่ ${gw} กก. ไขมันน่าจะยังเกิน 15% กล้ามท้องยังไม่ชัด`
      : `✅ เป้า ${gw} กก. สอดคล้องกับไขมัน 10–15% ของคุณ`;
    const fix = low || high ? `<div class="row" style="margin-top:8px"><button class="btn small" type="button" data-bc="goal">ใช้ ${bcGoal} กก. เป็นเป้า (ไขมัน ${gbf}%)</button></div>` : "";
    let gate = "";
    if ((p.year === 1 && p.month >= 11) || p.extra) {
      gate = bf > 15
        ? `<div class="callout small"><b>🚦 ยังไม่ลีนพอเริ่มสร้างกล้าม</b> ไขมัน ~${bf.toFixed(0)}% (ควร ≤ 15%) ลดต่ออีก 4 สัปดาห์แบบช้า แล้วค่อยเริ่มปี 2<div class="row" style="margin-top:8px"><button class="btn small" type="button" data-bc="extend">ลดต่อ +4 สัปดาห์</button>${S.cutExtend ? `<button class="btn ghost small" type="button" data-bc="unextend">ยกเลิก 4 สัปดาห์</button>` : ""}</div></div>`
        : `<div class="callout small"><b>🚦 ลีนพอแล้ว พร้อมเริ่มปี 2 สร้างกล้าม</b>${p.extra ? `<div class="row" style="margin-top:8px"><button class="btn small" type="button" data-bc="starty2">เริ่มปี 2 สัปดาห์นี้</button></div>` : ""}</div>`;
    }
    box.innerHTML = head(`วัด ${wa.k.slice(5)} · คอ ${ne.k.slice(5)}`)
      + `<div class="stats"><div class="stat ${bf <= 15 ? "good" : "warn"}"><span class="eyebrow">ไขมัน</span><b>${bf.toFixed(1)}%</b><span class="small muted">${b0 != null && Math.abs(b0 - bf) >= 0.1 ? `เริ่ม ${b0.toFixed(1)}%` : `เป้า ${gbf}%`}</span></div>`
      + `<div class="stat"><span class="eyebrow">ไขมัน / ไม่ใช่ไขมัน</span><b>${(w - lean).toFixed(1)} / ${lean.toFixed(1)}</b><span class="small muted">กก.</span></div>`
      + `<div class="stat ${wa.v <= waistFor(h, ne.v, 15) ? "good" : ""}"><span class="eyebrow">เอวเป้า (ไขมัน ${gbf}%)</span><b>${waistFor(h, ne.v, gbf).toFixed(0)} ซม.</b><span class="small muted">ตอนนี้ ${wa.v}</span></div></div>`
      + `<div class="bfscale" role="img" aria-label="ไขมัน ${bf.toFixed(1)}% ช่วงเป้า 10–15%"><i class="band" style="left:${pos(10)}%;width:${pos(15) - pos(10)}%"></i>${b0 != null ? `<i class="dot first" style="left:${pos(b0)}%"></i>` : ""}<i class="dot" style="left:${pos(bf)}%"></i></div>`
      + `<div class="bfaxis"><span>5%</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span><span>35</span><span>40%</span></div>`
      + (bf > 15 ? `<p class="small" style="margin:0">ถ้าเล่นเวทและโปรตีนถึงตลอด คุณจะไขมัน 15% ที่ ≈ <b>${at(15).toFixed(0)}</b> กก. · 12% ≈ <b>${at(12).toFixed(0)}</b> · 10% ≈ <b>${at(10).toFixed(0)}</b> กก.</p>` : "")
      + `<div class="callout small">${verdict}${fix}</div>${gate}`
      + `<p class="small muted" style="margin:0">ประมาณด้วยสูตร US Navy จากส่วนสูง รอบเอว รอบคอ คลาดเคลื่อน ±3–4% ดูแนวโน้มสำคัญกว่าตัวเลข วัดเวลาเดิม จุดเดิมทุกครั้ง</p>`;
  }
  $("bodycomp").addEventListener("click", (e) => {
    const a = e.target.closest("[data-bc]")?.dataset.bc; if (!a) return;
    const S = C.S, i = Math.round((C.today() - C.START) / DAY);
    if (a === "profile") { C.show("settings"); $("p-height").focus(); return; }
    if (a === "goal") { S.profile.goalW = bcGoal; C.toast(`ตั้งเป้า ${bcGoal} กก. แล้ว`); }
    if (a === "extend") { S.cutExtend = (S.cutExtend || 0) + 4; C.toast("ลดต่ออีก 4 สัปดาห์ ปี 2 เลื่อนออกไปแล้ว"); }
    if (a === "unextend") S.cutExtend = Math.max(0, (S.cutExtend || 0) - 4);
    if (a === "starty2") { S.cutExtend = Math.max(0, Math.floor((i - 365) / 7)); C.celebrate("เริ่มปี 2 สร้างกล้าม 💪"); }
    C.save(); C.renderProfile(); C.refresh();
  });

  // ---------- โค้ชสรุปสัปดาห์ ----------
  function renderWeekly() {
    const t = C.today(), last7 = Array.from({ length: 7 }, (_, i) => C.iso(new Date(t - DAY * i))), L = last7.map((k) => logs()[k]).filter(Boolean);
    if (!L.length) { $("weekly").hidden = true; return; }
    $("weekly").hidden = false;
    const n = (k) => L.filter((l) => l[k]).length, steps = L.filter((l) => l.steps).map((l) => l.steps), spend = L.reduce((a, l) => a + (l.spend || 0), 0);
    const kcal = L.map((l) => (l.food || []).reduce((a, m) => a + m.items.reduce((b, i) => b + i.kcal, 0), 0)).filter(Boolean);
    const lines = [];
    const need = { AB: 3, UL: 4, PPL: 5, PPL2: 5 }[C.plan(t).prog] || 3;
    lines.push(n("workout") >= need ? `✅ เวท ${n("workout")} ครั้ง ครบตามแผน` : `⚠️ เวท ${n("workout")}/${need} ครั้ง ${n("workout") === 0 ? "สัปดาห์นี้ยังไม่ได้เริ่ม เริ่มพรุ่งนี้เช้า 1 เซสชันพอ" : "ขาดอีก " + (need - n("workout"))}`);
    lines.push(n("if") >= 5 ? `✅ ปิดครัวตรงเวลา ${n("if")}/7 วัน` : `⚠️ ปิดครัวตรงเวลาแค่ ${n("if")}/7 วัน ตัวนี้มีผลกับน้ำหนักมากที่สุด`);
    lines.push(n("protein") >= 5 ? `✅ โปรตีนถึงเป้า ${n("protein")} วัน` : `⚠️ โปรตีนถึงเป้า ${n("protein")}/7 วัน เพิ่มไข่ต้ม 2 ฟองต่อวันง่ายสุด`);
    if (steps.length) { const a = steps.reduce((x, y) => x + y, 0) / steps.length; lines.push(a >= 5000 ? `✅ เดินเฉลี่ย ${C.fmt(a)} ก้าว` : `⚠️ เดินเฉลี่ย ${C.fmt(a)} ก้าว ลองลงรถก่อน 1 ป้าย`); }
    const T = C.plan(t).target;
    if (kcal.length) { const a = kcal.reduce((x, y) => x + y, 0) / kcal.length; lines.push(a >= T.kcalMin && a <= T.kcalMax ? `✅ กินเฉลี่ย ${C.fmt(a)} kcal อยู่ในเป้า (${T.th})` : a < T.kcalMin ? `⚠️ กินเฉลี่ย ${C.fmt(a)} kcal น้อยกว่าเป้า ${C.fmt(T.kcalMin - a)} ช่วง${T.th}ต้องกินให้ถึง ไม่งั้นกล้ามไม่ขึ้น` : `⚠️ กินเฉลี่ย ${C.fmt(a)} kcal เกินเป้า ${C.fmt(a - T.kcalMax)}`); }
    if (spend) lines.push(spend <= T.budget * 7 ? `✅ ค่ากิน ${C.fmt(spend)} บาท อยู่ในงบ` : `⚠️ ค่ากิน ${C.fmt(spend)} บาท เกินงบ ${C.fmt(spend - T.budget * 7)}`);
    const med = L.reduce((a, l) => a + (l.meditateMin || 0), 0); if (med) lines.push(`🧘 สมาธิรวม ${med} นาที`);
    const good = lines.filter((x) => x.startsWith("✅")).length;
    $("weekly").innerHTML = `<h2>โค้ชสรุป 7 วันล่าสุด</h2><ul class="plainlist">${lines.map((x) => `<li>${x}</li>`).join("")}</ul><p class="small" style="margin:0">${good >= 4 ? "สัปดาห์นี้ดีมาก รักษาแบบนี้ไว้ อย่าเพิ่มอะไรใหม่" : good >= 2 ? "ผ่านครึ่ง สัปดาห์หน้าโฟกัสแค่ข้อ ⚠️ อันแรกพอ" : "สัปดาห์นี้หลุด ไม่เป็นไร กฎคือห้ามพลาด 2 สัปดาห์ติด เริ่มใหม่พรุ่งนี้"}</p>`;
  }

  // ---------- รูปเทียบก่อน-หลัง ----------
  const dbP = new Promise((res, rej) => { const r = indexedDB.open("coach365-photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("p"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await dbP; return new Promise((res, rej) => { const t = db.transaction("p", mode); const q = fn(t.objectStore("p")); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
  async function shrink(file, max = 900) { const bmp = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return new Promise((r) => c.toBlob(r, "image/jpeg", 0.82)); }
  const POSES = [["front", "หน้า"], ["side", "ข้าง"], ["back", "หลัง"]];
  let bodyUrls = [];
  async function renderBody() {
    const B = (C.S.body = C.S.body || []); // [{date, front, side, back}]
    bodyUrls.splice(0).forEach(URL.revokeObjectURL);
    const t = C.today(), latest = B[B.length - 1], due = !latest || (t - new Date(latest.date)) / DAY >= 28;
    const month = C.iso(t).slice(0, 7);
    let cur = B.find((b) => b.date.startsWith(month));
    const shot = async (b, pose) => { if (!b?.[pose]) return ""; const blob = await tx("readonly", (s) => s.get(b[pose])).catch(() => null); if (!blob) return ""; const u = URL.createObjectURL(blob); bodyUrls.push(u); return u; };
    const first = B[0];
    const cards = await Promise.all(POSES.map(async ([pose, th]) => {
      const a = await shot(first, pose), b = await shot(cur || latest, pose);
      return `<div class="bodycol"><div class="eyebrow">${th}</div><div class="bodypair">${a ? `<img src="${a}" alt="${th} เริ่มต้น">` : `<div class="noimg">–</div>`}${b && b !== a ? `<img src="${b}" alt="${th} ล่าสุด">` : `<label class="noimg add" title="ถ่ายรูป${th}">📷<input type="file" accept="image/*" capture="environment" data-pose="${pose}" hidden></label>`}</div></div>`;
    }));
    $("body").innerHTML = `<div class="row between"><h2>รูปเทียบก่อน-หลัง</h2><span class="small muted">${B.length ? `ถ่ายมาแล้ว ${B.length} เดือน` : "ถ่ายทุกต้นเดือน"}</span></div>
      <p class="small muted" style="margin:0">${due ? "ได้เวลาถ่ายรูปเดือนนี้ ที่เดิม แสงเดิม เช็ดกระจกก่อน 😄 (เก็บในเครื่องนี้เท่านั้น)" : "รูปซ้าย = เดือนแรก · รูปขวา = ล่าสุด"}</p>
      <div class="bodygrid">${cards.join("")}</div>${B.length > 1 ? `<div class="small muted">น้ำหนัก: ${first.weight ?? "–"} → ${(cur || latest).weight ?? "–"} กก. · รอบเอว: ${first.waist ?? "–"} → ${(cur || latest).waist ?? "–"} ซม.</div>` : ""}`;
  }
  $("body").addEventListener("change", async (e) => {
    const pose = e.target.dataset.pose, f = e.target.files?.[0]; if (!pose || !f) return;
    const B = (C.S.body = C.S.body || []), month = C.iso(C.today()).slice(0, 7);
    let rec = B.find((b) => b.date.startsWith(month)); if (!rec) { rec = { date: C.iso(C.today()) }; B.push(rec); }
    const id = "body-" + rec.date + "-" + pose, blob = await shrink(f); await tx("readwrite", (s) => s.put(blob, id));
    rec[pose] = id; const l = C.S.logs[C.iso(C.today())] || {}; rec.weight = l.weight ?? rec.weight; rec.waist = l.waist ?? rec.waist;
    C.save(); C.celebrate("เก็บรูปแล้ว เดือนหน้ามาเทียบกัน 📸"); renderBody();
  });

  // ---------- รายการซื้อของแบบติ๊ก ----------
  function renderShopChecks() {
    const key = "w" + C.weekIdx(C.today());
    const done = (C.S.shop = C.S.shop || {})[key] || [];
    const box = $("shopChecks"); if (!box) return;
    box.innerHTML = `<div class="eyebrow">ติ๊กตอนซื้อ (รีเซ็ตทุกสัปดาห์)</div><div class="chips">${SHOPPING.filter((s) => s[1]).map((s, i) => `<button type="button" class="chip ${done.includes(i) ? "on" : ""}" data-shop="${i}">${done.includes(i) ? "✓ " : ""}${s[0]} ${s[1]}</button>`).join("")}</div>`;
    box.onclick = (e) => { const i = e.target.closest("[data-shop]")?.dataset.shop; if (i == null) return; const arr = (C.S.shop[key] = C.S.shop[key] || []); const n = Number(i); const at = arr.indexOf(n); at >= 0 ? arr.splice(at, 1) : arr.push(n); C.save(); renderShopChecks(); };
  }

  window.Extras = { light() { renderWater(); renderHeat(); renderTrend(); renderWeekly(); renderBodyComp(); renderRoadmap(); }, renderBody, renderShopChecks, renderRoadmap };
  window.Extras.light(); renderBody(); renderShopChecks();
})();
