// บันทึกอาหาร: รูปเก็บใน IndexedDB, รายการอาหารเก็บใน S.logs[date].food
(() => {
  const C = window.Coach; // มาจาก app.js
  const $ = (id) => document.getElementById(id);

  // ---------- IndexedDB สำหรับรูป ----------
  const dbP = new Promise((res, rej) => {
    const r = indexedDB.open("coach365-photos", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("p");
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => { const db = await dbP; return new Promise((res, rej) => { const t = db.transaction("p", mode); const q = fn(t.objectStore("p")); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
  const putPhoto = (id, blob) => tx("readwrite", (s) => s.put(blob, id));
  const getPhoto = (id) => tx("readonly", (s) => s.get(id));
  const delPhoto = (id) => tx("readwrite", (s) => s.delete(id));

  async function shrink(file, max = 1024) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob(r, "image/jpeg", 0.8));
  }
  const b64 = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(String(f.result).split(",")[1]); f.readAsDataURL(blob); });

  // ---------- สถานะร่างมื้อ ----------
  let draft = null; // {photoId, blob, items:[{th,kcal,p,note}], ai:{...}}
  const newDraft = () => ({ photoId: null, blob: null, items: [], ai: null });

  function dayFood(dk) { const l = C.S.logs[dk] || (C.S.logs[dk] = {}); return l.food || (l.food = []); }
  const sum = (arr) => arr.reduce((a, m) => { m.items.forEach((i) => { a.kcal += i.kcal; a.p += i.p; }); return a; }, { kcal: 0, p: 0 });

  // ---------- แสดงผล ----------
  const urls = [];
  async function render() {
    const dk = $("foodDate").value;
    const meals = dayFood(dk), t = sum(meals);
    const bar = (v, max, cls) => `<div class="bar"><span class="${cls}" style="width:${Math.min(100, (v / max) * 100).toFixed(1)}%"></span></div>`;
    const kcls = t.kcal > TARGET.kcalMax ? "over" : "";
    $("foodSum").innerHTML = `
      <div><div class="row between"><span>แคลอรี่</span><b class="num">${C.fmt(t.kcal)} / ${C.fmt(TARGET.kcal)}</b></div>${bar(t.kcal, TARGET.kcal, kcls)}<div class="small muted">ช่วงเป้า ${C.fmt(TARGET.kcalMin)}–${C.fmt(TARGET.kcalMax)} · เหลือ ${C.fmt(Math.max(0, TARGET.kcal - t.kcal))}</div></div>
      <div><div class="row between"><span>โปรตีน</span><b class="num">${C.fmt(t.p)} / ${TARGET.protein} ก.</b></div>${bar(t.p, TARGET.protein, "")}</div>`;
    urls.splice(0).forEach(URL.revokeObjectURL);
    const rows = await Promise.all(meals.map(async (m, i) => {
      let img = "";
      if (m.photoId) { const b = await getPhoto(m.photoId).catch(() => null); if (b) { const u = URL.createObjectURL(b); urls.push(u); img = `<img src="${u}" alt="">`; } }
      const s = sum([m]);
      return `<article class="meal">${img || '<div class="noimg">🍽</div>'}<div><div class="row between"><b>${m.time}</b><span class="num">${C.fmt(s.kcal)} kcal · ${C.fmt(s.p)} ก.</span></div>
        <div class="small">${m.items.map((x) => C.esc(x.th)).join(", ")}</div>${m.src ? `<div class="small muted">${C.esc(m.src)}</div>` : ""}
        <button class="btn ghost small" type="button" data-delmeal="${i}">ลบ</button></div></article>`;
    }));
    $("mealList").innerHTML = rows.join("") || `<p class="muted small">ยังไม่มีบันทึกวันนี้ กดปุ่มมื้อตามแผนด้านบน หรือถ่ายรูป</p>`;
    renderPlanToday();
    renderDraft();
  }

  function renderDraft() {
    const box = $("draft");
    if (!draft || (!draft.blob && !draft.items.length)) { box.hidden = true; return; }
    box.hidden = false;
    const s = sum([draft]);
    if (draft.blob && !draft.url) draft.url = URL.createObjectURL(draft.blob);
    $("draftImg").innerHTML = draft.url ? `<img src="${draft.url}" alt="รูปอาหาร">` : "";
    $("draftAi").innerHTML = draft.ai ? `<div class="callout small"><b>AI ประเมิน:</b> ${C.fmt(draft.ai.kcal_low)}–${C.fmt(draft.ai.kcal_high)} kcal (ความมั่นใจ${{ low: "ต่ำ", medium: "ปานกลาง", high: "สูง" }[draft.ai.confidence] || ""})<br>${C.esc(draft.ai.notes_th)}</div>` : "";
    $("draftItems").innerHTML = draft.items.map((x, i) => `<div class="ditem">
        <input type="text" value="${C.esc(x.th)}" data-i="${i}" data-f="th" aria-label="ชื่ออาหาร">
        <input type="number" value="${Math.round(x.kcal)}" data-i="${i}" data-f="kcal" aria-label="แคลอรี่" inputmode="numeric"><span class="small muted">kcal</span>
        <input type="number" value="${Math.round(x.p)}" data-i="${i}" data-f="p" aria-label="โปรตีน" inputmode="numeric"><span class="small muted">ก.</span>
        <button class="btn ghost small" type="button" data-rm="${i}" aria-label="ลบรายการ">✕</button></div>`).join("") || `<p class="small muted">ยังไม่มีรายการ: ให้ AI ประเมิน หรือเพิ่มจากเมนู/วัตถุดิบด้านล่าง</p>`;
    $("draftTotal").textContent = `รวม ${C.fmt(s.kcal)} kcal · โปรตีน ${C.fmt(s.p)} ก.`;
    $("aiBtn").hidden = !draft.blob;
  }

  // ---------- เพิ่มรายการ ----------
  function addItem(it) { if (!draft) draft = newDraft(); draft.items.push(it); renderDraft(); $("draft").scrollIntoView({ behavior: "smooth", block: "nearest" }); }

  $("photoIn").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    draft = draft || newDraft();
    if (draft.url) URL.revokeObjectURL(draft.url);
    draft.blob = await shrink(f); draft.url = null; draft.ai = null;
    renderDraft();
    if (C.S.ai?.key) aiEstimate();
    else C.toast("ใส่ API key ในแท็บตั้งค่าเพื่อให้ AI ประเมินจากรูป หรือเลือกเมนูเอง");
  });

  $("draftItems").addEventListener("input", (e) => {
    const i = e.target.dataset.i, f = e.target.dataset.f; if (i == null) return;
    draft.items[i][f] = f === "th" ? e.target.value : Number(e.target.value) || 0;
    const s = sum([draft]); $("draftTotal").textContent = `รวม ${C.fmt(s.kcal)} kcal · โปรตีน ${C.fmt(s.p)} ก.`;
  });
  $("draftItems").addEventListener("click", (e) => { const i = e.target.dataset.rm; if (i != null) { draft.items.splice(i, 1); renderDraft(); } });
  $("draftCancel").addEventListener("click", () => { draft = null; renderDraft(); });
  $("draftSave").addEventListener("click", async () => {
    if (!draft.items.length) { C.toast("เพิ่มอย่างน้อย 1 รายการ"); return; }
    const dk = $("foodDate").value;
    let photoId = null;
    if (draft.blob) { photoId = dk + "-" + Date.now().toString(36); await putPhoto(photoId, draft.blob); }
    const src = draft.ai ? "ประเมินโดย AI + แก้เอง" : "";
    if (dk === C.iso(C.today())) C.addMeal(draft.items, src, photoId);
    else {
      dayFood(dk).push({ time: "--:--", photoId, items: draft.items.map((x) => ({ th: x.th, kcal: Math.round(x.kcal), p: Math.round(x.p) })), src });
      C.S.logs[dk].protein = sum(dayFood(dk)).p >= TARGET.protein; C.save();
    }
    draft = null; C.celebrate("บันทึกมื้อแล้ว 🍽"); render();
  });
  $("mealList").addEventListener("click", async (e) => {
    const i = e.target.dataset.delmeal; if (i == null) return;
    if (!e.target.dataset.armed) { e.target.dataset.armed = "1"; e.target.textContent = "ยืนยันลบ"; return; }
    const m = dayFood($("foodDate").value).splice(i, 1)[0];
    if (m?.photoId) delPhoto(m.photoId).catch(() => {});
    C.save(); C.refresh(); render();
  });

  // มื้อตามแผนวันนี้: กดปุ่มเดียว
  function renderPlanToday() {
    const dk = $("foodDate").value, isToday = dk === C.iso(C.today());
    const box = $("planToday"); if (!isToday) { box.innerHTML = ""; return; }
    const meals = dayFood(dk), l = C.S.logs[dk] || {};
    const slots = [["12:00", 1, "มื้อแรก"], ["16:00", 2, "ว่าง"], ["18:15", 3, "มื้อสุดท้าย"]];
    box.innerHTML = `<div class="eyebrow">แผนวันนี้ · แตะปุ่มเดียวถ้ากินตามแผน</div>` + slots.map(([t, slot, name], i) => {
      const m = C.plannedMeal(slot), done = meals.length > i;
      return `<button type="button" class="planbtn ${done ? "done" : ""}" data-slot="${slot}" ${done ? "disabled" : ""}><span class="num muted">${t}</span><span><b>${done ? "✓ " : ""}${m.th}</b><br><span class="small muted">${name} · ${m.kcal} kcal · โปรตีน ${m.p} ก.</span></span></button>`;
    }).join("") + `<button type="button" class="planbtn ${l.if ? "done" : ""}" id="closeKitchen" ${l.if ? "disabled" : ""}><span class="num muted">🔒</span><span><b>${l.if ? "✓ ปิดครัวแล้ว" : "ปิดครัว"}</b><br><span class="small muted">กดหลังมื้อสุดท้าย แล้วไม่กินอีกจนพรุ่งนี้</span></span></button>`;
    // แผนอาหารคงที่ ~1,600–1,800 kcal แต่เป้าเปลี่ยนตามน้ำหนักและช่วง (พักไดเอท/สร้างกล้ามต้องกินเพิ่ม)
    // ช่วงลดไขมัน: อาหารร้านมีน้ำมันแฝง 100–200 kcal จึงเตือนให้เติมเมื่อขาดเยอะจริงเท่านั้น
    const planK = [1, 2, 3].reduce((a, s) => a + C.plannedMeal(s).kcal, SNACKS.x.kcal), gap = TARGET.kcal - planK;
    const cutting = ["cut", "minicut"].includes(C.plan(C.today()).mode);
    if (gap >= (cutting ? 350 : 150)) box.innerHTML += `<div class="callout small">แผนวันนี้ ~${C.fmt(planK)} kcal เป้า ${C.fmt(TARGET.kcal)} → เติม ${fill(gap)}</div>`;
    else if (gap <= (cutting ? -150 : -250)) box.innerHTML += `<div class="callout small">แผนวันนี้ ~${C.fmt(planK)} kcal เกินเป้า ${C.fmt(-gap)} → ข้าวลด ${Math.max(1, Math.min(3, Math.round(-gap / 80)))} ทัพพี หรือข้ามถั่วลิสง</div>`;
  }
  // เติมให้ถึงเป้าด้วยของที่มีในรายการซื้ออยู่แล้ว
  function fill(gap) {
    const out = [];
    [["ข้าวเพิ่ม", "ทัพพี", 80, 3], ["นมจืด", "กล่อง", 90, 2], ["กล้วยหอม", "ลูก", 105, 2], ["ไข่ต้ม", "ฟอง", 78, 2]].forEach(([n, u, k, max]) => {
      const q = Math.min(max, Math.floor(gap / k)); if (q > 0) { out.push(`${n} ${q} ${u}`); gap -= q * k; }
    });
    return out.join(" + ") || "ข้าวเพิ่ม 1 ทัพพี";
  }
  $("planToday").addEventListener("click", (e) => {
    if (e.target.closest("#closeKitchen")) { C.closeKitchen(); render(); return; }
    const slot = e.target.closest("[data-slot]")?.dataset.slot; if (!slot) return;
    const m = C.plannedMeal(Number(slot));
    C.addMeal([m], "ตามแผน"); C.celebrate(`บันทึก ${m.th} แล้ว`); render();
  });
  $("foodDate").addEventListener("change", render);

  // เมนูร้าน / วัตถุดิบ
  $("menuPick").innerHTML = `<option value="">เลือกเมนูร้าน…</option>` + MENU.map((m, i) => `<option value="${i}">${m.th} · ${m.kcal} kcal</option>`).join("");
  $("ingPick").innerHTML = INGREDIENTS.map((g, i) => `<option value="${i}">${g.th} (ต่อ ${g.per} ${g.unit})</option>`).join("");
  const syncIngUnit = () => { const g = INGREDIENTS[$("ingPick").value]; $("ingUnit").textContent = g.unit; $("ingQty").value = g.per; };
  $("ingPick").addEventListener("change", syncIngUnit); syncIngUnit();
  $("menuAdd").addEventListener("click", () => {
    const m = MENU[$("menuPick").value]; if (!m) return;
    const q = Number($("menuQty").value) || 1;
    addItem({ th: m.th + (q !== 1 ? ` ×${q}` : ""), kcal: m.kcal * q, p: m.p * q });
  });
  $("ingAdd").addEventListener("click", () => {
    const g = INGREDIENTS[$("ingPick").value], q = Number($("ingQty").value) || 0; if (!q) return;
    addItem({ th: `${g.th} ${q} ${g.unit}`, kcal: (g.kcal * q) / g.per, p: (g.p * q) / g.per });
  });
  $("customAdd").addEventListener("click", () => {
    const th = $("cName").value.trim(), kcal = Number($("cKcal").value) || 0, p = Number($("cP").value) || 0;
    if (!th || !kcal) { C.toast("ใส่ชื่อและแคลอรี่"); return; }
    addItem({ th, kcal, p }); $("cName").value = $("cKcal").value = $("cP").value = "";
  });

  // ---------- แผนอาหาร / สูตร ----------
  const curWeek = () => C.weekIdx(C.today()) % 2;
  let shownWeek = curWeek();
  function renderPlan() {
    const wdToday = (new Date().getDay() + 6) % 7;
    const isCur = shownWeek === curWeek();
    $("weekPlan").innerHTML = `<div class="row" style="margin-bottom:8px">${["A", "B"].map((n, i) => `<button class="btn ${i === shownWeek ? "" : "ghost"} small" type="button" data-week="${i}">สัปดาห์ ${n}${i === curWeek() ? " (สัปดาห์นี้)" : ""}</button>`).join("")}</div>
      <div class="days">` +
      WEEKS[shownWeek].map(([d, a, b, c, note], i) => {
        const ms = [a, b, c].map(mealRef), x = SNACKS.x;
        const k = ms.reduce((s, m) => s + m.kcal, x.kcal), p = ms.reduce((s, m) => s + m.p, x.p);
        const line = (t, m, code) => `<div class="pl"><span class="num muted">${t}</span><button class="linkbtn" type="button" data-plan="${code}">${m.th}</button><span class="num small muted">${m.kcal}</span></div>`;
        return `<div class="day ${isCur && i === wdToday ? "today" : ""}"><div class="row between"><b>${d}</b><span class="num small">${C.fmt(k)} kcal · ${C.fmt(p)} ก.</span></div>
          ${line("12:00", ms[0], a)}${line("16:00", ms[1], b)}${line("18:15", ms[2], c)}${note ? `<div class="small muted">${note}</div>` : ""}</div>`;
      }).join("") + `</div><p class="small muted">ทุกวันบวก "${SNACKS.x.th}" (${SNACKS.x.kcal} kcal) แล้ว · อาหารร้านมีน้ำมันแฝงอีกประมาณ 100–200 kcal · หิวมากเพิ่มข้าว 1 ทัพพี (+80) · แตะชื่อเมนูเพื่อบันทึกว่ากินแล้ว</p>`;

    $("recipes").innerHTML = Object.entries(RECIPES).map(([id, r]) => `<details class="recipe" id="rc-${id}"><summary><b>${r.th}</b> <span class="small muted">· ${r.kcal} kcal · โปรตีน ${r.p} ก. · ~${r.cost}฿/ที่ · ${r.time}${r.makes > 1 ? ` · ได้ ${r.makes} ที่` : ""}</span></summary>
      <div class="small muted">${r.use}</div>
      <h4>วัตถุดิบ</h4><ul>${r.ing.map((x) => `<li>${x}</li>`).join("")}</ul>
      <h4>วิธีทำ</h4><ol>${r.steps.map((x) => `<li>${x}</li>`).join("")}</ol>
      ${r.tip ? `<p class="small"><b>เคล็ดลับ:</b> ${r.tip}</p>` : ""}
      <button class="btn ghost small" type="button" data-plan="r:${id}">บันทึกว่ากิน 1 ที่</button></details>`).join("");

    $("orders").innerHTML = Object.entries(ORDER).map(([id, o]) => `<div class="order"><div class="row between"><b>${o.th}</b><span class="small muted num">~${o.kcal} kcal · ${o.p} ก. · ${o.cost}฿</span></div><div class="say">“${o.say}”</div><button class="btn ghost small" type="button" data-plan="o:${id}">บันทึกว่ากิน</button></div>`).join("");

    const total = SHOPPING.reduce((a, s) => a + s[2], 0);
    $("shopping").innerHTML = `<div class="tbl"><table><tbody>${SHOPPING.map(([n, q, c]) => `<tr><td>${n}</td><td class="small muted">${q}</td><td class="num">${c}฿</td></tr>`).join("")}<tr><td><b>รวมต่อสัปดาห์</b></td><td></td><td class="num"><b>${C.fmt(total)}฿</b></td></tr></tbody></table></div>
      <p class="small muted">≈ ${C.fmt(total / 7)} บาท/วัน · ราคาจากตลาด/ห้างทั่วไป ต่างตามพื้นที่ · ซื้ออกไก่แพ็กใหญ่ที่แม็คโคร/โลตัสถูกกว่า</p>
      <div id="shopChecks"></div>
      <div class="callout small"><b>Meal prep วันอาทิตย์ (ประมาณ 1.5 ชม.):</b><ol>
        <li>หุงข้าว 3 ถ้วยตวงสาร (ได้ข้าวสุกประมาณ 1.4 กก.) + วางมันเทศบนตะแกรงนึ่ง</li>
        <li>หมักอกไก่สำหรับย่าง ระหว่างนั้นต้มไข่ 12 ฟอง</li>
        <li>ผัดกะเพรา 3 กล่อง → ผัดข้าว 3 กล่อง (ใช้ข้าวที่หุงเสร็จแล้วพักให้เย็น) → ย่างไก่ 2 กล่อง</li>
        <li>จัด 8 กล่อง: ตู้เย็นช่องธรรมดาสำหรับ จ–พ, <b>ช่องฟรีซ</b>สำหรับ พฤ–ศ (อาหารสุกเก็บตู้เย็นได้ 3–4 วัน)</li>
      </ol></div>`;
  }
  document.querySelector('[data-view="food"]').addEventListener("click", (e) => {
    const wk = e.target.closest("[data-week]")?.dataset.week;
    if (wk != null) { shownWeek = Number(wk); renderPlan(); return; }
    const code = e.target.closest("[data-plan]")?.dataset.plan; if (!code) return;
    const m = mealRef(code);
    addItem({ th: m.th, kcal: m.kcal, p: m.p });
  });

  // ---------- AI ประเมินจากรูป ----------
  const SCHEMA = {
    type: "object", additionalProperties: false,
    required: ["items", "kcal_low", "kcal_high", "confidence", "notes_th"],
    properties: {
      items: { type: "array", items: { type: "object", additionalProperties: false, required: ["name_th", "portion_th", "kcal", "protein_g"], properties: { name_th: { type: "string" }, portion_th: { type: "string" }, kcal: { type: "number" }, protein_g: { type: "number" } } } },
      kcal_low: { type: "number" }, kcal_high: { type: "number" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      notes_th: { type: "string" },
    },
  };
  const PROMPT = `คุณเป็นนักกำหนดอาหารที่เชี่ยวชาญอาหารไทยและอาหารร้านในประเทศไทย ประเมินอาหารในรูปนี้
- แยกแต่ละอย่างที่เห็น (ข้าว กับข้าว ไข่ เครื่องดื่ม ฯลฯ) พร้อมปริมาณโดยประมาณเป็นภาษาไทย เช่น "ข้าวสวย ~200 ก."
- ประเมินแคลอรี่และโปรตีนต่อรายการ นับน้ำมันที่ใช้ปรุงและน้ำตาลในน้ำจิ้ม/เครื่องดื่มด้วย
- ใช้ภาชนะ ช้อน มือ หรือสิ่งของในรูปเป็นตัวเทียบขนาด
- ให้ช่วงแคลอรี่รวมต่ำสุด-สูงสุดที่เป็นไปได้ และระดับความมั่นใจตามจริง
- notes_th: สิ่งที่มองไม่เห็นในรูปแต่มีผลต่อแคลอรี่ (เช่น น้ำมันใต้ข้าว ซอส) และคำแนะนำสั้นๆ 1 ประโยค สำหรับคนที่กำลังลดน้ำหนักและต้องการโปรตีนสูง`;

  async function aiEstimate() {
    const key = C.S.ai?.key; if (!key || !draft?.blob) return;
    const btn = $("aiBtn"); btn.disabled = true; btn.textContent = "AI กำลังดูรูป…";
    try {
      const { default: Anthropic } = await import("https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm");
      const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
      const model = C.S.ai.model || "claude-opus-5-5";
      const params = {
        model, max_tokens: 16000,
        output_config: { format: { type: "json_schema", schema: SCHEMA } },
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: await b64(draft.blob) } },
          { type: "text", text: PROMPT },
        ] }],
      };
      // Opus 5.5 / Sonnet 5.5: ถ้าโมเดลปฏิเสธ ให้ระบบสลับไปโมเดลสำรองอัตโนมัติ
      const res = model === "claude-opus-5-5" || model === "claude-sonnet-5-5"
        ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
        : await client.messages.create(params);
      if (res.stop_reason === "refusal") throw new Error("AI ไม่ประเมินรูปนี้ ลองถ่ายใหม่ให้เห็นอาหารชัดๆ");
      const text = res.content.find((b) => b.type === "text")?.text;
      const out = JSON.parse(text);
      draft.ai = out;
      draft.items = out.items.map((x) => ({ th: `${x.name_th} (${x.portion_th})`, kcal: x.kcal, p: x.protein_g }));
      renderDraft();
    } catch (e) {
      const msg = e?.status === 401 ? "API key ไม่ถูกต้อง ตรวจที่แท็บตั้งค่า"
        : e?.status === 429 ? "เรียกถี่เกินไป รอสักครู่แล้วลองใหม่"
        : e?.status === 400 && /credit/i.test(e?.message || "") ? "เครดิต API หมด เติมที่ console.anthropic.com"
        : e instanceof SyntaxError ? "อ่านผล AI ไม่ได้ ลองใหม่อีกครั้ง"
        : e?.message || "เชื่อมต่อ AI ไม่ได้ ตรวจอินเทอร์เน็ต";
      C.toast(msg);
    } finally { btn.disabled = false; btn.textContent = "ให้ AI ประเมินอีกครั้ง"; }
  }
  $("aiBtn").addEventListener("click", aiEstimate);
  $("scanBtn").addEventListener("click", async () => {
    try {
      const { openBarcode } = await import("./barcode.js");
      openBarcode({ onAdd: (items, src) => { C.addMeal(items, src); C.celebrate(`บันทึก ${items[0].th} แล้ว`); render(); }, onPhoto: () => $("photoIn").click() });
    } catch (e) { C.toast("เปิดสแกนบาร์โค้ดไม่ได้ ตรวจอินเทอร์เน็ต"); }
  });

  $("foodDate").value = C.iso(C.today());
  renderPlan();
  window.Food = { render };
})();
