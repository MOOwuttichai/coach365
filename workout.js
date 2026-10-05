// โหมดเล่นเวทเต็มจอ: ทีละท่า ทีละเซ็ต พักอัตโนมัติ เทียบครั้งก่อน PR และสรุป
// พักระหว่างเซ็ต (วินาที) ตามช่วงของแผน 2 ปี: ปี 2 สร้างกล้ามพักนานขึ้น เซ็ตหนัก 5×5 พัก 2.5 นาที
const REST_BY_PHASE = { 1: 75, 2: 90, 3: 90, 4: 90, 5: 90, 6: 120, 7: 150, 8: 150 };
const BAR_KG = () => Number(window.Coach.S.barKg ?? 10);
const PLATES = [20, 15, 10, 5, 2.5, 1.25];

// "3×10–12" → {sets:3, lo:10, hi:12}   "3×30 วิ" → {sets:3, secs:30}   "3×เกือบหมดแรง" → {sets:3, amrap:true}   "3×8/ข้าง" → {sets:3, lo:8, hi:8, side:true}
export function parseSets(s) {
  const m = s.match(/^(\d+)×(.+)$/); if (!m) return { sets: 1, lo: null, hi: null, label: s };
  const n = Number(m[1]), rest = m[2].trim();
  if (/วิ/.test(rest)) return { sets: n, secs: parseInt(rest, 10), side: /ข้าง/.test(rest), label: s };
  if (/หมดแรง/.test(rest)) return { sets: n, amrap: true, label: s };
  const r = rest.match(/(\d+)(?:[–-](\d+))?/);
  return { sets: n, lo: Number(r[1]), hi: Number(r[2] || r[1]), side: /ข้าง/.test(rest), label: s };
}
const e1rm = (w, r) => (w && r ? w * (1 + r / 30) : 0);
export function bestSet(sets) { return (sets || []).filter((s) => s.done && s.r).reduce((b, s) => (e1rm(s.w || 0, s.r) > e1rm(b?.w || 0, b?.r || 0) ? s : b), null); }

export function plates(total) {
  let side = (total - BAR_KG()) / 2; if (side <= 0) return "แค่บาร์";
  const out = [];
  for (const p of PLATES) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return out.length ? out.join(" + ") + " ต่อข้าง" + (side > 0.01 ? ` (ขาด ${side.toFixed(2)})` : "") : "แค่บาร์";
}

export function openWorkout({ sessionKey, phase, deload = false, onFinish }) {
  const C = window.Coach, S = C.S, dk = C.iso(C.today());
  const ses = SESSIONS[sessionKey];
  const log = (S.logs[dk] = S.logs[dk] || {}); log.lifts = log.lifts || {};
  const start = log.wStart?.[sessionKey] || Date.now();
  (log.wStart = log.wStart || {})[sessionKey] = start; C.save();
  const REST = REST_BY_PHASE[phase] || 75;
  let cur = 0, rest = null, raf = 0, wake = null;

  // ประวัติท่า: ทุกวันที่เคยเล่น (ล่าสุดก่อน)
  // ไม่นับวัน deload เป็นประวัติสำหรับแนะนำน้ำหนัก/PR
  const history = (id) => Object.keys(S.logs).filter((k) => k < dk && !S.logs[k].deload && S.logs[k].lifts?.[id]?.sets?.some((s) => s.done)).sort().reverse().map((k) => ({ date: k, sets: S.logs[k].lifts[id].sets.filter((s) => s.done) }));
  const dlW = (w) => (w == null ? null : Math.max(0, Math.round((w * 0.6) * 2) / 2));
  const prBefore = (id) => history(id).reduce((m, h) => Math.max(m, ...h.sets.map((s) => e1rm(s.w, s.r))), 0);

  function ensure(id, spec) {
    const l = (log.lifts[id] = log.lifts[id] || {});
    if (!l.sets) {
      const prev = history(id)[0]?.sets || [];
      const migrate = l.w != null || l.r != null ? [{ w: l.w, r: l.r, done: !!l.done }] : [];
      const n = deload ? Math.min(2, spec.sets) : spec.sets;
      l.sets = migrate.length ? migrate : Array.from({ length: n }, (_, i) => { const pw = prev[i]?.w ?? prev[prev.length - 1]?.w ?? null; return { w: deload ? dlW(pw) : pw, r: null, done: false }; });
    }
    return l;
  }
  // แนะนำน้ำหนัก: ครั้งก่อนทำครบเรปบนทุกเซ็ต → เพิ่ม · deload → 60%
  function suggest(id, spec, eq) {
    const prev = history(id)[0]; if (!prev || spec.secs || spec.amrap) return null;
    const w = prev.sets[0]?.w; if (w == null) return null;
    if (deload) return { w: dlW(w), why: `Deload 60% ของ ${w} กก. ทำสบายๆ ไม่ต้องสุด` };
    const allTop = prev.sets.length >= spec.sets && prev.sets.every((s) => s.r >= spec.hi);
    return allTop ? { w: w + (eq === "bb" ? 2.5 : 1), why: `ครั้งก่อนทำครบ ${spec.hi} ทุกเซ็ต` } : { w, why: prev.sets.every((s) => s.r >= spec.lo) ? "น้ำหนักเดิม เพิ่มครั้งให้ถึงเรปบน" : "น้ำหนักเดิม เน้นท่าถูก" };
  }

  const ov = document.createElement("div"); ov.className = "wk"; document.body.appendChild(ov); document.body.style.overflow = "hidden";
  navigator.wakeLock?.request("screen").then((l) => (wake = l)).catch(() => {});
  const beep = (f = 880, d = 0.15) => { try { const ac = (beep.ac ||= new (window.AudioContext || window.webkitAudioContext)()); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; o.connect(g); g.connect(ac.destination); g.gain.value = 0.25; o.start(); o.stop(ac.currentTime + d); } catch (e) {} };
  const buzz = (p) => { try { navigator.vibrate?.(p); } catch (e) {} };
  const fmtT = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  function render() {
    const [id, setsStr] = ses.items[cur], ex = EXERCISES[id], spec = parseSets(setsStr), l = ensure(id, spec);
    const prev = history(id)[0], sug = suggest(id, spec, ex.eq), pr = prBefore(id);
    const doneCount = ses.items.filter(([x]) => log.lifts[x]?.sets?.length && log.lifts[x].sets.every((s) => s.done)).length;
    const unit = spec.secs ? "วิ" : "ครั้ง";
    ov.innerHTML = `
      <div class="wk-top">
        <button class="btn ghost small" data-a="close" type="button">ปิด</button>
        <div class="wk-title"><b>${deload ? "🔋 " : ""}${ses.name}</b><span class="num small muted" id="wkClock">${fmtT(Date.now() - start)}</span></div>
        <span class="small muted">ท่า ${cur + 1}/${ses.items.length}</span>
      </div>
      <div class="wk-prog">${ses.items.map((_, i) => `<i class="${i < cur ? "past" : i === cur ? "now" : ""}"></i>`).join("")}</div>
      <div class="wk-body">
        ${Figures.html(id)}
        <h2>${ex.th}</h2>
        <div class="small muted">${ex.name} · ${ex.muscles} · <b>${spec.label}</b>${spec.side ? " (ทำครบแล้วสลับข้าง)" : ""}</div>
        ${sug ? `<div class="wk-sug">💡 แนะนำ <b class="num">${sug.w} กก.</b> · ${sug.why}${ex.eq === "bb" ? ` · ใส่แผ่น ${plates(sug.w)}` : ""}</div>` : `<div class="wk-sug muted">ครั้งแรกของท่านี้ เริ่มเบาที่ทำได้ ${spec.hi || 10} ${unit}สบายๆ แล้วค่อยเพิ่ม</div>`}
        <table class="wk-sets"><thead><tr><th>เซ็ต</th><th>ครั้งก่อน</th><th>${ex.eq === "none" ? "" : "กก."}</th><th>${unit}</th><th></th></tr></thead><tbody>
        ${l.sets.map((s, i) => `<tr class="${s.done ? "done" : ""}" data-i="${i}">
          <td class="num">${i + 1}</td>
          <td class="num muted small">${prev?.sets[i] ? `${prev.sets[i].w ?? "–"} × ${prev.sets[i].r ?? "–"}` : "–"}</td>
          <td>${ex.eq === "none" ? "" : `<input type="number" inputmode="decimal" step="0.5" data-f="w" value="${s.w ?? ""}" placeholder="${prev?.sets[i]?.w ?? ""}">`}</td>
          <td>${spec.secs ? `<button class="btn ghost small" type="button" data-hold="${spec.secs}" data-i="${i}">${s.r ? s.r + " วิ" : "⏱ " + spec.secs + " วิ"}</button>` : `<input type="number" inputmode="numeric" data-f="r" value="${s.r ?? ""}" placeholder="${spec.amrap ? "สุด" : spec.lo === spec.hi ? spec.lo : spec.lo + "–" + spec.hi}">`}</td>
          <td><button class="wk-ck ${s.done ? "on" : ""}" type="button" data-ck="${i}" aria-label="เซ็ตเสร็จ">✓</button></td></tr>`).join("")}
        </tbody></table>
        <div class="row"><button class="btn ghost small" type="button" data-a="addset">+ เพิ่มเซ็ต</button>${l.sets.length > 1 ? `<button class="btn ghost small" type="button" data-a="delset">− ลบเซ็ตสุดท้าย</button>` : ""}${ex.check ? `<button class="btn ghost small" type="button" data-a="pose">🎥 ตรวจท่า</button>` : ""}</div>
        ${pr ? `<div class="small muted">สถิติสูงสุดของคุณ (e1RM) ${pr.toFixed(1)} กก.</div>` : ""}
        ${history(id).length ? `<details class="wk-how"><summary>📈 กราฟความก้าวหน้า</summary>${window.exChart ? window.exChart(id) : ""}</details>` : ""}
        <details class="wk-how"><summary>วิธีทำ + จุดที่มักผิด</summary><ol>${ex.cues.map((c) => `<li>${c}</li>`).join("")}</ol><div class="small"><b>ระวัง:</b> ${ex.mistake}</div>
          ${history(id).length ? `<div class="small" style="margin-top:8px"><b>ประวัติ:</b> ${history(id).slice(0, 5).map((h) => { const b = bestSet(h.sets); return `${h.date.slice(5)} ${b ? `${b.w ?? "–"}×${b.r}` : ""}`; }).join(" · ")}</div>` : ""}</details>
      </div>
      <div class="wk-nav">
        <button class="btn ghost" type="button" data-a="prev" ${cur === 0 ? "disabled" : ""}>◀</button>
        ${cur < ses.items.length - 1 ? `<button class="btn" type="button" data-a="next">ท่าถัดไป ▶</button>` : `<button class="btn" type="button" data-a="finish">🏁 จบเวิร์กเอาต์ (${doneCount}/${ses.items.length} ท่า)</button>`}
      </div>
      <div class="wk-rest" id="wkRest" hidden><div class="eyebrow">พัก</div><b class="num" id="wkRestT"></b><div class="row"><button class="btn ghost small" type="button" data-a="rest-15">−15</button><button class="btn ghost small" type="button" data-a="rest+15">+15</button><button class="btn small" type="button" data-a="skip">ข้าม ▶</button></div></div>`;
    ov.scrollTop = 0;
  }

  function startRest(sec) {
    rest = { end: Date.now() + sec * 1000 }; $("wkRest").hidden = false; tickRest();
  }
  function tickRest() {
    if (!rest) return;
    const left = rest.end - Date.now();
    $("wkRestT").textContent = fmtT(left);
    if (left <= 0) { rest = null; $("wkRest").hidden = true; beep(880, .2); setTimeout(() => beep(1175, .3), 200); buzz([60, 40, 60]); C.toast("พักพอแล้ว เซ็ตต่อไป 💪"); return; }
    raf = setTimeout(tickRest, 250);
  }
  const $ = (id) => ov.querySelector("#" + id);
  let hold = null;
  function startHold(i, secs, btn) {
    if (hold) return;
    const end = Date.now() + secs * 1000; beep(660, .1);
    hold = setInterval(() => {
      const left = end - Date.now();
      if (left <= 0) { clearInterval(hold); hold = null; beep(880, .3); buzz(80); const l = log.lifts[ses.items[cur][0]]; l.sets[i].r = secs; l.sets[i].done = true; C.save(); render(); startRest(REST); return; }
      btn.textContent = `${Math.ceil(left / 1000)} วิ`;
    }, 200);
  }

  ov.addEventListener("input", (e) => {
    const tr = e.target.closest("tr[data-i]"); if (!tr) return;
    const l = log.lifts[ses.items[cur][0]], s = l.sets[tr.dataset.i];
    s[e.target.dataset.f] = e.target.value === "" ? null : Number(e.target.value); C.save();
  });
  ov.addEventListener("click", async (e) => {
    const t = e.target.closest("button"); if (!t) return;
    const id = ses.items[cur][0], l = log.lifts[id];
    if (t.dataset.hold) { startHold(Number(t.dataset.i), Number(t.dataset.hold), t); return; }
    if (t.dataset.ck != null) {
      const i = Number(t.dataset.ck), s = l.sets[i], tr = t.closest("tr");
      if (!s.done) {
        // ไม่ได้กรอก → ใช้ค่าที่ placeholder แนะนำ
        const wi = tr.querySelector('[data-f="w"]'), ri = tr.querySelector('[data-f="r"]');
        if (wi && s.w == null && wi.placeholder) s.w = Number(wi.placeholder);
        if (ri && s.r == null) s.r = Number(ri.placeholder.split("–").pop()) || null;
        s.done = true; buzz(30);
        const pr = prBefore(id), now = e1rm(s.w, s.r);
        if (!deload && pr && now > pr) { C.celebrate(`🏆 สถิติใหม่ ${ex(id).th}: ${s.w} × ${s.r}`); }
        C.save(); render();
        const allDone = l.sets.every((x) => x.done);
        if (!allDone || cur < ses.items.length - 1) startRest(REST);
      } else { s.done = false; C.save(); render(); }
      return;
    }
    const a = t.dataset.a;
    if (a === "close") close(false);
    if (a === "addset") { const last = l.sets[l.sets.length - 1]; l.sets.push({ w: last?.w ?? null, r: null, done: false }); C.save(); render(); }
    if (a === "delset") { l.sets.pop(); C.save(); render(); }
    if (a === "prev") { cur--; render(); }
    if (a === "next") { cur++; render(); }
    if (a === "skip") { rest = null; clearTimeout(raf); $("wkRest").hidden = true; }
    if (a === "rest-15" && rest) rest.end -= 15000;
    if (a === "rest+15" && rest) rest.end += 15000;
    if (a === "pose") { const { openPoseCheck } = await import("./posecheck.js"); openPoseCheck({ kind: EXERCISES[id].check, title: EXERCISES[id].th, onDone: (n) => { if (n) { const s = l.sets.find((x) => !x.done) || l.sets[l.sets.length - 1]; s.r = n; C.save(); render(); } } }); }
    if (a === "finish") finish();
  });
  const ex = (id) => EXERCISES[id];

  function finish() {
    const dur = Date.now() - start;
    let vol = 0, setsDone = 0; const prs = [];
    ses.items.forEach(([id]) => { const l = log.lifts[id]; if (!l?.sets) return; const pr = prBefore(id); l.sets.filter((s) => s.done).forEach((s) => { setsDone++; vol += (s.w || 0) * (s.r || 0); if (!deload && pr && e1rm(s.w, s.r) > pr && !prs.includes(id)) prs.push(id); }); l.done = l.sets.every((s) => s.done); const b = bestSet(l.sets); if (b) { l.w = b.w; l.r = b.r; } });
    if (sessionKey === "P") log.posture = true; else { log.workout = true; if (deload) log.deload = true; }
    (log.workouts = log.workouts || []).push({ session: sessionKey, dur: Math.round(dur / 1000), vol, sets: setsDone, prs, deload });
    delete log.wStart[sessionKey]; C.save();
    ov.innerHTML = `<div class="wk-sum">
      <div class="eyebrow">เสร็จแล้ว</div><h2>${ses.name} 🎉</h2>
      <div class="stats">
        <div class="stat good"><span class="eyebrow">เวลา</span><b>${fmtT(dur)}</b></div>
        <div class="stat"><span class="eyebrow">เซ็ตที่ทำ</span><b>${setsDone}</b></div>
        <div class="stat"><span class="eyebrow">ปริมาณรวม</span><b>${C.fmt(vol)}</b><span class="small muted">กก. × ครั้ง</span></div>
        <div class="stat ${prs.length ? "good" : ""}"><span class="eyebrow">สถิติใหม่</span><b>${prs.length}</b></div>
      </div>
      ${prs.length ? `<div class="callout">🏆 ${prs.map((id) => EXERCISES[id].th).join(", ")}</div>` : ""}
      <p class="muted">${deload ? "Deload เสร็จ ร่างกายกำลังซ่อม สัปดาห์หน้ากลับไปน้ำหนักเต็ม จะรู้สึกแรงขึ้น" : vol > 0 ? "ครั้งหน้าดูช่อง 💡 แนะนำ แอปจะบอกเองว่าควรเพิ่มน้ำหนักหรือยัง" : "ครั้งแรกผ่านไปแล้ว ครั้งหน้าจะมีตัวเลขให้เทียบ"}</p>
      <button class="btn big" type="button" data-a="done">ปิด</button></div>`;
    ov.querySelector('[data-a="done"]').addEventListener("click", () => close(true));
    beep(880, .15); setTimeout(() => beep(1175, .15), 180); setTimeout(() => beep(1568, .3), 360); buzz([50, 50, 50, 50, 120]);
  }
  function close(finished) {
    clearTimeout(raf); clearInterval(hold); clearInterval(clock); wake?.release?.().catch(() => {});
    ov.remove(); document.body.style.overflow = "";
    onFinish?.(finished);
  }
  const clock = setInterval(() => { const c = $("wkClock"); if (c) c.textContent = fmtT(Date.now() - start); }, 1000);
  render();
}
