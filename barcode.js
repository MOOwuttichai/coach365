// สแกนบาร์โค้ดอาหารสำเร็จรูป → แคลอรี่/โปรตีนจาก Open Food Facts (ฐานข้อมูลเปิด ส่งไปแค่เลขบาร์โค้ด)
// ไม่พบหรือไม่มีข้อมูลโภชนาการ → กรอกจากฉลากครั้งเดียว แอปจำสินค้าไว้ (S.barcodes) สแกนครั้งหน้าขึ้นทันที
export function openBarcode({ onAdd, onPhoto }) {
  const C = window.Coach, S = C.S, esc = C.esc;
  const saved = (S.barcodes = S.barcodes || {});
  const ov = document.createElement("div"); ov.className = "pc bc"; document.body.appendChild(ov); document.body.style.overflow = "hidden";
  let stream = null, timer = null, busy = false, prod = null, grams = null;
  const canScan = "BarcodeDetector" in window && !!navigator.mediaDevices?.getUserMedia;

  function close() {
    clearInterval(timer); stream?.getTracks().forEach((t) => t.stop());
    ov.remove(); document.body.style.overflow = "";
  }
  const top = `<div class="row between" style="padding:10px 16px"><b>สแกนบาร์โค้ด</b><button class="btn ghost small" type="button" data-a="close">ปิด</button></div>`;
  const manual = `<div class="row" style="gap:8px"><input id="bcCode" type="text" inputmode="numeric" placeholder="หรือพิมพ์เลขใต้บาร์โค้ด" style="flex:1"><button class="btn" type="button" data-a="find">ค้นหา</button></div>`;

  function scanView(msg = "") {
    ov.innerHTML = `${top}<div style="padding:0 16px;display:flex;flex-direction:column;gap:12px">
      ${canScan ? `<video id="bcVid" playsinline muted autoplay style="width:100%;border-radius:16px;background:#000;aspect-ratio:4/3;object-fit:cover"></video><p class="small muted" style="margin:0">หันกล้องไปที่บาร์โค้ดบนห่อ ให้เส้นอยู่กลางจอ ห่างประมาณ 15 ซม.</p>`
        : `<p class="small">มือถือนี้สแกนอัตโนมัติไม่ได้ พิมพ์เลขใต้บาร์โค้ด (13 หลัก) แทนได้</p>`}
      ${msg ? `<div class="callout small">${msg}</div>` : ""}${manual}</div>`;
    if (canScan) startCam();
  }
  async function startCam() {
    try {
      stream = stream || await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
      const v = ov.querySelector("#bcVid"); v.srcObject = stream; await v.play().catch(() => {});
      const det = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
      clearInterval(timer);
      timer = setInterval(async () => {
        if (busy || !v.videoWidth) return; busy = true;
        try { const r = await det.detect(v); if (r[0]?.rawValue) { clearInterval(timer); try { navigator.vibrate?.(60); } catch (e) {} await lookup(r[0].rawValue); } }
        catch (e) {} finally { busy = false; }
      }, 300);
    } catch (e) { scanView("เปิดกล้องไม่ได้ อนุญาตกล้องในตั้งค่าแอป หรือพิมพ์เลขแทน"); }
  }

  async function lookup(code) {
    code = String(code).replace(/\D/g, ""); if (code.length < 8) { C.toast("เลขบาร์โค้ดสั้นไป"); return; }
    clearInterval(timer);
    if (saved[code]) { prod = { code, ...saved[code], mine: true }; return resultView(); }
    ov.innerHTML = `${top}<p style="padding:16px">กำลังค้นหา ${code}…</p>`;
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_th,brands,nutriments,serving_quantity,product_quantity`);
      const d = await r.json(), p = d.product, n = p?.nutriments || {};
      const kcal100 = n["energy-kcal_100g"] ?? (n.energy_100g != null ? n.energy_100g / 4.184 : null);
      if (d.status !== 1 || kcal100 == null) return labelView(code, p?.product_name_th || p?.product_name || "");
      prod = { code, th: [p.product_name_th || p.product_name, p.brands?.split(",")[0]].filter(Boolean).join(" · ") || code,
        kcal100: Math.round(kcal100), p100: Math.round((n.proteins_100g || 0) * 10) / 10, serving: Number(p.serving_quantity) || null, pack: Number(p.product_quantity) || null };
      resultView();
    } catch (e) { labelView(code, "", "ค้นหาออนไลน์ไม่ได้ (เน็ตหลุด?) กรอกจากฉลากแทนได้"); }
  }

  function resultView() {
    // perPack = กรอกจากฉลากเป็น "ทั้งห่อ" (เก็บเป็น 100 หน่วย) ไม่มีน้ำหนักกรัมจริง
    const opts = prod.perPack ? [["ทั้งห่อ", 100], ["ครึ่งห่อ", 50]]
      : [prod.pack && ["ทั้งห่อ", prod.pack], prod.serving && prod.serving !== prod.pack && ["1 หน่วยบริโภค", prod.serving], ["100 ก.", 100]].filter(Boolean);
    grams = grams ?? opts[0][1];
    const k = Math.round((prod.kcal100 * grams) / 100), pr = Math.round((prod.p100 * grams) / 100);
    ov.innerHTML = `${top}<div style="padding:0 16px;display:flex;flex-direction:column;gap:12px">
      <h2 style="margin:0">${esc(prod.th)}</h2>
      <div class="small muted">${prod.mine ? "สินค้าที่คุณบันทึกไว้" : "ข้อมูลจาก Open Food Facts"} · ${prod.perPack ? `ทั้งห่อ ${prod.kcal100} kcal · โปรตีน ${prod.p100} ก.` : `ต่อ 100 ก.: ${prod.kcal100} kcal · โปรตีน ${prod.p100} ก.`}</div>
      <div class="chips">${opts.map(([t, g]) => `<button type="button" class="chip ${g === grams ? "on" : ""}" data-g="${g}">${t}${prod.perPack || t === "100 ก." ? "" : ` (${g} ก.)`}</button>`).join("")}</div>
      ${prod.perPack ? "" : `<label class="f">หรือใส่กรัมเอง<input id="bcG" type="number" inputmode="decimal" value="${grams}"></label>`}
      <div class="callout"><b class="num">${k} kcal · โปรตีน ${pr} ก.</b></div>
      <div class="row"><button class="btn" type="button" data-a="add">บันทึกมื้อนี้</button><button class="btn ghost" type="button" data-a="again">สแกนใหม่</button></div></div>`;
  }

  function labelView(code, name, msg = "ไม่พบข้อมูลโภชนาการของสินค้านี้ กรอกจากฉลากครั้งเดียว ครั้งหน้าสแกนแล้วขึ้นเลย") {
    ov.innerHTML = `${top}<div style="padding:0 16px;display:flex;flex-direction:column;gap:12px">
      <div class="callout small">${msg}</div>
      <label class="f">ชื่อสินค้า<input id="lbName" type="text" value="${esc(name)}"></label>
      <div class="row" style="gap:8px"><label class="f" style="flex:1">kcal ทั้งห่อ<input id="lbK" type="number" inputmode="decimal"></label><label class="f" style="flex:1">โปรตีน (ก.) ทั้งห่อ<input id="lbP" type="number" inputmode="decimal"></label></div>
      <div class="small muted">ฉลากไทยบอก "ต่อหนึ่งหน่วยบริโภค" ให้คูณจำนวนหน่วยบริโภคต่อห่อ</div>
      <div class="row"><button class="btn" type="button" data-a="label" data-code="${code}">บันทึก + จำสินค้านี้</button>${onPhoto ? `<button class="btn ghost" type="button" data-a="photo">📷 ถ่ายฉลากให้ AI อ่าน</button>` : ""}</div>
      <button class="btn ghost" type="button" data-a="again">สแกนใหม่</button></div>`;
  }

  ov.addEventListener("click", (e) => {
    const g = e.target.closest("[data-g]"); if (g) { grams = Number(g.dataset.g); resultView(); return; }
    const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
    if (a === "close") close();
    if (a === "find") lookup(ov.querySelector("#bcCode").value);
    if (a === "again") { prod = null; grams = null; scanView(); }
    if (a === "photo") { close(); onPhoto(); }
    if (a === "add") {
      const k = Math.round((prod.kcal100 * grams) / 100), pr = Math.round((prod.p100 * grams) / 100);
      if (!prod.mine) { saved[prod.code] = { th: prod.th, kcal100: prod.kcal100, p100: prod.p100, serving: prod.serving, pack: prod.pack }; C.save(); }
      close(); onAdd([{ th: prod.perPack ? `${prod.th}${grams === 50 ? " (ครึ่งห่อ)" : ""}` : `${prod.th} (${grams} ก.)`, kcal: k, p: pr }], "บาร์โค้ด");
    }
    if (a === "label") {
      const th = ov.querySelector("#lbName").value.trim() || "สินค้าบาร์โค้ด", k = Number(ov.querySelector("#lbK").value), pr = Number(ov.querySelector("#lbP").value) || 0;
      if (!k) { C.toast("ใส่ kcal ก่อน"); return; }
      saved[e.target.dataset.code] = { th, kcal100: k, p100: pr, serving: null, pack: 100, perPack: true }; C.save();
      close(); onAdd([{ th, kcal: k, p: pr }], "บาร์โค้ด (ฉลาก)");
    }
  });
  ov.addEventListener("change", (e) => { if (e.target.id === "bcG") { const v = Number(e.target.value); if (v > 0) { grams = v; resultView(); } } });
  ov.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "bcCode") lookup(e.target.value); });
  scanView();
}
