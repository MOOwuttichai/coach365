// Coach 365 — ข้อมูลทั้งหมดเก็บใน localStorage ของเครื่อง
(() => {
  const START = new Date(2026, 9, 9), START_TH = "ศุกร์ 9 ต.ค."; // วันที่ 1 ของแผน 2 ปี
  const DAY = 86400000;
  // สัปดาห์นับแบบจันทร์–อาทิตย์ (สัปดาห์ 0 = สัปดาห์ที่มีวันเริ่ม) ให้แผนอาหาร รายการซื้อของ deload ตรงกับวัน meal prep อาทิตย์
  const START_OFF = (START.getDay() + 6) % 7;
  const weekIdx = (d) => Math.floor((Math.max(0, Math.round((d - START) / DAY)) + START_OFF) / 7);
  const SAVE_GOAL = 100000, PASSIVE_GOAL_DAY = 300;
  const GOAL_END = new Date(2027, 9, 8); // เป้าเงินออม 1 ปี
  const STEPS = [5000, 7000, 9000, 10000, 11000, 12000, 12000, 12000, 12000, 12000, 12000, 12000];
  const BASE_DAYS = 730;
  // แผน 2 ปี: ปี 1 ลดไขมันจนลีน (รักษา/สร้างกล้ามไปด้วย) → ปี 2 สร้างกล้าม
  // [เดือนเริ่ม, เดือนจบ, ชื่อ, โหมดอาหาร, โปรแกรมเวท, โน้ต, น้ำหนักเปลี่ยน %/สัปดาห์ (ลบ = ลด)]
  const PHASES = [
    [1, 3, "ปี 1 · วางฐาน", "cut", "AB", "Full body 3 วัน เน้นท่าถูก สร้างนิสัย ช่วงนี้ลดได้เร็วสุดของแผน", -0.9],
    [4, 6, "ปี 1 · ลดไขมัน", "cut", "UL", "Upper/Lower 4 วัน น้ำหนักบาร์ห้ามลด = กล้ามไม่หาย", -0.8],
    [7, 9, "ปี 1 · ลดไขมัน + คมขึ้น", "cut", "UL", "+HIIT 10 นาที วันพักกลางสัปดาห์ (ไม่บังคับ) เริ่มเห็นเส้นท้องบน", -0.7],
    [10, 12, "ปี 1 · ลีน", "cut", "UL", "ลดช้าลงเพื่อรักษากล้าม เป้าไขมัน 10–15% เห็นกล้ามท้อง", -0.5],
    [13, 14, "ปี 2 · เปลี่ยนเข้าโหมดสร้าง", "maintain", "UL", "กินระดับรักษาน้ำหนัก น้ำหนักนิ่ง แรงขึ้น", 0],
    [15, 21, "ปี 2 · สร้างกล้าม", "bulk", "PPL", "Push/Pull/Legs 5 วัน น้ำหนักขึ้น 0.3–0.5 กก./เดือน ไม่เกินนี้", 0.17],
    [22, 23, "ปี 2 · ตัดไขมันสั้น", "minicut", "PPL2", "6–8 สัปดาห์ กลับไปไขมัน 10–12% โชว์กล้ามที่สร้างมา", -0.6],
    [24, 24, "ปี 2 · รักษาระดับ", "maintain", "PPL2", "รูปร่างเป้าหมาย: ไขมัน 10–12% กล้ามชัด", 0],
  ];
  // สัปดาห์พักไดเอท (นับจาก 0): กินระดับรักษาน้ำหนัก 1 สัปดาห์ท้ายเดือน 3, 6, 9 ช่วยให้ลดต่อได้ทั้งปีโดยไม่พัง
  const DIET_BREAKS = [12, 25, 38];
  const KEY = "coach365";
  const CHECKS = [["if", "ปิดครัวตามเวลา (IF)"], ["protein", "โปรตีนถึงเป้า"], ["workout", "ออกกำลังกายตอนเช้า"], ["posture", "จัดบุคลิก 10 นาที"], ["meditate", "นั่งสมาธิ เช้า + ก่อนนอน"], ["rest", "พักผ่อนครบ 3 ชม."], ["room", "เก็บห้อง 10 นาที"], ["sleep", "นอนก่อน 23:15"]];

  // ตารางตามชีวิตจริง: งาน 09:00–18:00 บ้านห่างที่ทำงาน 15 นาที ถึงบ้าน 22:00 นอน 23:00
  // วันทำงาน ตื่น 06:30 → สมาธิ → บุคลิก → ออกกำลังกาย 40 นาที → อาบน้ำ → พัก 45 นาที → ออก 08:45
  // เสาร์–อาทิตย์ ตื่น 07:30 (สายกว่า 1 ชม. นาฬิกาชีวิตไม่เพี้ยน)
  const MORNING = { WD: { wake: "06:30", med: "06:35", post: "06:45", train: "06:55" }, WE: { wake: "07:30", med: "07:35", post: "07:45", train: "07:55" } };
  const morningOf = (d) => MORNING[d.getDay() === 0 || d.getDay() === 6 ? "WE" : "WD"];
  const BED = "23:00";
  // rest: นาที = นับเป็นเวลาพักผ่อน · days: daily / weekday / WE (ส.–อา.) / SA / SU / M1
  const REMINDERS = [
    { id: "wake", time: "06:30", days: "weekday", msg: "ตื่น! ดื่มน้ำ 500 มล. → เข้าห้องน้ำ → ชั่งน้ำหนัก" },
    { id: "wakeWE", time: "07:30", days: "WE", msg: "ตื่น! ดื่มน้ำ 500 มล. → เข้าห้องน้ำ → ชั่งน้ำหนัก" },
    { id: "meditate", time: "06:35", days: "weekday", msg: "นั่งสมาธิ 10 นาที (เปิดตัวจับเวลาในแอป)" },
    { id: "meditateWE", time: "07:35", days: "WE", msg: "นั่งสมาธิ 10 นาที (เปิดตัวจับเวลาในแอป)" },
    { id: "posture", time: "06:45", days: "weekday", msg: "จัดบุคลิก 10 นาที (ท่าในแท็บเวท)" },
    { id: "postureWE", time: "07:45", days: "WE", msg: "จัดบุคลิก 10 นาที (ท่าในแท็บเวท)" },
    { id: "train", time: "06:55", days: "weekday", msg: "ออกกำลังกาย 40 นาที: วอร์ม 5 นาที แล้วเวท/เดินตามแอป" },
    { id: "trainWE", time: "07:55", days: "WE", msg: "ออกกำลังกายตอนเช้า: เดินยาว หรือเวทถ้ามีในโปรแกรม" },
    { id: "shower", time: "07:35", days: "weekday", msg: "อาบน้ำ แต่งตัว เตรียมกระเป๋า + ขวดน้ำ 1 ลิตร" },
    { id: "restAm", time: "08:00", days: "weekday", msg: "พักก่อนไปทำงาน 45 นาที นั่งสบายๆ กาแฟดำ/ชาไม่หวานได้ ไม่ต้องรีบ", rest: 45 },
    { id: "leave", time: "08:45", days: "weekday", msg: "ออกจากบ้าน ถึงที่ทำงานก่อน 9 โมง" },
    { id: "move", time: "10:00,11:00,14:00,15:00,16:30,17:00", days: "weekday", msg: "ลุกเดิน 3 นาที + ดื่มน้ำ 1 แก้ว ยืดอก เก็บคาง" },
    { id: "meal1", time: "12:00", days: "daily", msg: "มื้อแรก: โปรตีนก่อน ถ่ายรูปบันทึกในแอป" },
    { id: "rest1", time: "12:30", days: "daily", msg: "พัก 30 นาที ออกจากจอ หลับตา/เดินเบาๆ", rest: 30 },
    { id: "snack", time: "16:00", days: "daily", msg: "มื้อว่างโปรตีน: ไข่ต้ม + นมถั่วเหลืองไม่หวาน" },
    { id: "meal2", time: "18:15", days: "daily", msg: "มื้อสุดท้าย แล้วปิดครัว" },
    { id: "walk", time: "18:45", days: "daily", msg: "เดิน 1 ชม. ให้ครบก้าววันนี้" },
    { id: "rest2", time: "20:00", days: "daily", msg: "เวลาพักผ่อนของตัวเอง 1 ชม. 45 นาที ไม่ทำงาน", rest: 105 },
    { id: "log", time: "22:00", days: "daily", msg: "ถึงบ้าน: บันทึกวันนี้ในแอป + เก็บห้อง 10 นาที" },
    { id: "rest3", time: "22:15", days: "daily", msg: "พักผ่อน 30 นาที อาบน้ำ หรี่ไฟ ไม่เล่นมือถือบนเตียง", rest: 30 },
    { id: "meditate2", time: "22:45", days: "daily", msg: "สมาธิก่อนนอน 5 นาที + จด 3 บรรทัด แล้ววางมือถือ" },
    { id: "sleep", time: "23:00", days: "daily", msg: "ได้เวลานอน (ตื่น 06:30 = นอน 7.5 ชม.)" },
    { id: "side", time: "09:30", days: "SA", msg: "งานเสริม 3 ชั่วโมง: หาลูกค้า / ทำงาน / พอร์ต" },
    { id: "weigh", time: "07:30", days: "SU", msg: "ชั่งน้ำหนัก วัดรอบเอว (อาทิตย์แรกของเดือน: วัดรอบคอ + ถ่ายรูป)" },
    { id: "prep", time: "14:00", days: "SU", msg: "Meal prep: อกไก่ + ไข่ต้มทั้งสัปดาห์" },
    { id: "weekly", time: "20:30", days: "SU", msg: "โค้ชสรุปสัปดาห์พร้อมแล้ว เปิดแอปดู แล้วเลือกโฟกัส 1 ข้อสำหรับสัปดาห์หน้า" },
    { id: "money", time: "09:00", days: "M1", msg: "โอนเงินออม + ลงทุน แล้วบันทึกในแอป" },
  ];

  // ---------- สไตล์โค้ช: สุภาพ / ปลุกใจ / ด่า ----------
  // หัวข้อแจ้งเตือน = คำพูดโค้ชตามสไตล์ (สุ่มใหม่ทุกวันที่เปิดแอป) · เนื้อความ = สิ่งที่ต้องทำ (r.msg)
  // ด่าที่พฤติกรรม ไม่ด่าที่ตัวคน · {why} = เหตุผลที่เริ่ม (ตั้งในแท็บตั้งค่า) ยังไม่ตั้ง = ไม่สุ่มบรรทัดนั้น
  const TONES = [["roast", "ด่า 😤"], ["hype", "ปลุกใจ 🔥"], ["soft", "สุภาพ"]];
  const KIND = { wakeWE: "wake", meditateWE: "meditate", postureWE: "posture", trainWE: "train", restAm: "rest", rest1: "rest", rest2: "rest", rest3: "rest" };
  const LINES = {
    roast: {
      wake: ["ปลุกรอบเดียวพอ ลุก!", "กดเลื่อนปลุกอีกที = คนเดิมอีกวัน", "หมอนไม่ได้ช่วยลดไขมัน ลุก", "ไขมันชอบคนนอนต่อ อย่าให้มันชนะ", "เมื่อคืนสัญญากับตัวเองว่าไง? ลุก", "จำได้มั้ย {why} ลุก!"],
      meditate: ["นั่งเฉยๆ 10 นาทียังไม่ไหว จะไหวอะไร", "หลับตาหายใจ ไม่ได้ให้ไปวิ่งมาราธอน", "ใจลอยทั้งวันเพราะข้ามตรงนี้แหละ"],
      posture: ["คอยื่นเหมือนเต่ามาหลายปีแล้วนะ", "ไหล่ห่อแบบนี้ ใส่อะไรก็ไม่หล่อ", "อกผาย ไหล่ผึ่ง 10 นาที ไม่มีข้ออ้าง"],
      train: ["ข้ออ้างไม่เผาแคลอรี่ ลุกไปทำ", "เวลาออกกำลังกาย ไม่ใช่เวลาไถฟีด", "ไม่ต้องรออารมณ์ แค่ไปทำ", "วันนี้โดด พรุ่งนี้ก็โดด รู้ตัวดี", "40 นาที แลกกับ 2 ปีข้างหน้า ไปเดี๋ยวนี้", "\"เดี๋ยวค่อยเริ่ม\" พูดมากี่รอบแล้ว", "ร่างกายรอคำสั่งอยู่ สั่งให้ลุก", "{why} แค่นี้ยังไม่ลุกอีก?"],
      shower: ["อาบน้ำ แต่งตัว วางมือถือก่อน", "ไถมือถือในห้องน้ำ = ไปทำงานสาย"],
      rest: ["พักคือพัก ไม่ใช่ไถ TikTok", "พักให้จริง แล้วกลับมาลุยต่อ"],
      leave: ["ออกบ้าน! สายแล้วอย่าโทษรถติด", "กระเป๋า ขวดน้ำ ครบยัง ออกได้แล้ว"],
      move: ["ก้นติดเก้าอี้แล้วมั้ง ลุก!", "นั่งนิ่งเป็นรูปปั้นมาชั่วโมงแล้ว", "นั่งทั้งวัน ไขมันได้ใจ ลุกเดิน 3 นาที", "ก้าวไม่เดินมาหาเองหรอก ลุก"],
      meal1: ["โปรตีนก่อน ข้าวทีหลัง ไม่ใช่ซัดแต่แป้ง", "ถ่ายรูปก่อนกิน ไม่ถ่าย = กินมั่ว", "หิวแค่ไหนก็ถ่ายรูปก่อน 3 วิ"],
      snack: ["ไข่ต้ม ไม่ใช่ขนมหน้าเคาน์เตอร์เซเว่น", "มื้อว่างโปรตีน ไม่ใช่ชานมไข่มุก"],
      meal2: ["มื้อสุดท้าย กินเสร็จครัวปิด ห้ามแอบ", "หลังมื้อนี้ ตู้เย็นคือเขตหวงห้าม"],
      walk: ["ก้าวไม่ครบ อย่ามาบ่นว่าไม่ลด", "เดิน 1 ชม. ง่ายกว่าอธิบายว่าทำไมไม่ลด", "ขาไม่ได้มีไว้เดินไปตู้เย็นอย่างเดียว"],
      log: ["บันทึกวันนี้ ไม่จด = หลอกตัวเอง", "ห้องรก ใจก็รก 10 นาทีพอ"],
      meditate2: ["วางมือถือ คลิปพวกนั้นไม่ได้ทำให้ผอม", "จด 3 บรรทัด แล้ววางมือถือไกลเตียง"],
      sleep: ["นอน! อดนอน = หิวทั้งวันพรุ่งนี้", "นอนดึกคืนนี้ = โดดเวทพรุ่งนี้ เห็นมาแล้ว", "ปิดจอ พรุ่งนี้ตื่นไม่มีต่อรอง", "อีกคลิปเดียว… โกหก นอนเลย"],
      side: ["เงินไม่วิ่งมาหาเอง ลงมือ 3 ชม.", "งานเสริมวันนี้ = อิสระปีหน้า"],
      weigh: ["ขึ้นตาชั่ง กลัวตัวเลขไม่ทำให้มันลด", "คนไม่กล้าชั่ง คือคนหลอกตัวเอง"],
      prep: ["ไม่ prep วันนี้ อาทิตย์หน้าได้สั่งของทอดแน่", "2 ชม. วันนี้ จบอาหารทั้งอาทิตย์"],
      weekly: ["สรุปสัปดาห์มาแล้ว กล้าเปิดดูมั้ย", "ผลงานสัปดาห์นี้รอตรวจอยู่"],
      money: ["โอนเงินออมก่อนมันหายไปกับของไร้สาระ"],
      _: ["อย่าทำเป็นไม่เห็นแจ้งเตือนนี้", "ตัวเองในอีก 2 ปีกำลังดูอยู่", "ขี้เกียจ 5 นาที เสียใจทั้งปี", "{why} ลืมแล้วเหรอ"],
    },
    hype: {
      wake: ["เช้าใหม่ ร่างกายใหม่ ลุกเลย ☀️", "ลุกตรงเวลา = ชนะไปแล้วหนึ่ง", "ลุกเลย วันนี้ของเรา 💪", "{why} ✨ เริ่มวันกัน"],
      meditate: ["หายใจลึกๆ ใจนิ่ง วันนี้ชนะ 🧘", "10 นาทีที่ทำให้ทั้งวันดีขึ้น"],
      posture: ["อกผาย ไหล่ผึ่ง บุคลิกเปลี่ยนชีวิต", "ยืนตรงขึ้นอีกนิด ดูดีขึ้นทันที"],
      train: ["เวลาของเราแล้ว ลุยเลย 💪", "ทุกเซ็ตวันนี้ คือกล้ามปีหน้า", "แค่ 5 นาทีแรก ที่เหลือมันไปเอง", "ตัวเองปีหน้าจะขอบคุณวันนี้ 🔥", "{why} 🔥 ไปกัน!"],
      shower: ["สดชื่นแล้วไปลุยงานต่อ 🚿"],
      rest: ["พักให้เต็มที่ ร่างกายกำลังซ่อม 😌"],
      leave: ["ไปทำงานกัน วันนี้ดีแน่ 💼"],
      move: ["ลุกยืดตัวหน่อย ร่างกายจะขอบคุณ", "ทุกก้าวคือไขมันที่หายไป 🚶"],
      meal1: ["เติมโปรตีน สร้างกล้าม 🍗", "กินดีวันนี้ หุ่นดีปีหน้า"],
      snack: ["โปรตีนเติมพลังช่วงบ่าย 🥚"],
      meal2: ["มื้อสุดท้ายของวัน แล้วปิดครัว 🔒"],
      walk: ["เดินชิลๆ 1 ชม. ไขมันละลาย 🚶", "ก้าวครบ = ชนะอีกวัน"],
      log: ["จดไว้ เห็นความก้าวหน้า 📈"],
      meditate2: ["ปิดวันอย่างสงบ 🌙"],
      sleep: ["นอนคือช่วงที่กล้ามโต 😴", "พรุ่งนี้ตื่นมาสดชื่น นอนเลย"],
      side: ["ลงทุนกับตัวเอง 3 ชม. 🚀"],
      weigh: ["ตัวเลขคือข้อมูล ไม่ใช่คำตัดสิน 📊"],
      prep: ["prep วันนี้ สบายทั้งอาทิตย์ 🍱"],
      weekly: ["มาดูว่าสัปดาห์นี้ไปได้ไกลแค่ไหน 📈"],
      money: ["เงินออมโตขึ้นอีกแล้ว 💰"],
      _: ["วันละนิด 2 ปีเปลี่ยนชีวิต", "ต่อเนื่องชนะทุกอย่าง 🔥"],
    },
  };
  // ทวง: เด้งซ้ำเมื่อถึงเวลาแล้วยังไม่ได้ทำ ทำในแอปแล้ว = ยกเลิกให้เอง (ไม่โดนด่า)
  const trainStarted = (l) => !!(l.workout || l.walkAm || l.hiit || Object.keys(l.wStart || {}).some((k) => k !== "P"));
  const NAGS = [
    { at: (d) => addMin(morningOf(d).wake, 20), done: (l) => l.sleepH != null || l.weight != null, body: "ตื่นแล้วกด \"ตื่นแล้ว\" ในแอป + ชั่งน้ำหนักก่อนกินดื่ม",
      soft: "ตื่นหรือยัง?", hype: "ตื่นยัง? มาเริ่มวันกัน ☀️", roast: ["ยังนอนอยู่จริงดิ?", "20 นาทีแล้ว ตาชั่งรอ ไม่ใช่หมอน", "นอนต่ออีกนิด… แล้วก็แพ้อีกวัน"] },
    { at: (d) => addMin(morningOf(d).train, 15), done: trainStarted, body: "ยังไม่ได้เริ่มออกกำลังกาย เปิดแอปกด ▶ เริ่มเลย ทำแค่ท่าแรกก่อนก็ได้",
      soft: "ได้เวลาออกกำลังกายแล้ว", hype: "เริ่มแค่ท่าแรก ที่เหลือมันไปเอง 💪", roast: ["15 นาทีแล้ว ยังไม่เริ่ม?", "รออารมณ์อยู่เหรอ มันไม่มาหรอก", "ไถมือถืออยู่ใช่มั้ย วางแล้วไปเริ่ม"] },
    { at: (d) => addMin(morningOf(d).train, 35), done: trainStarted, body: "ยังเป็นศูนย์ ทำ 10 นาทีก็ยังดีกว่าศูนย์ (เปิดแอป → ▶ เริ่มเลย)",
      soft: "ยังไม่ได้ออกกำลังกายวันนี้", hype: "10 นาทีก็นับ ลุยกัน 🔥", roast: ["ศูนย์ ยังเป็นศูนย์", "วันนี้จะเป็นอีกวัน \"เดี๋ยวค่อยเริ่ม\" เหรอ", "คนเดิมชนะอีกแล้ว ยอมเหรอ?"] },
    { at: () => "17:00", done: (l) => !!l.food?.length, body: "วันนี้ยังไม่ได้บันทึกอาหารสักมื้อ ถ่ายรูปหรือกด \"กินตามแผน\" ได้เลย",
      soft: "ยังไม่ได้บันทึกอาหาร", hype: "จดมื้อเที่ยงหน่อย เห็นตัวเลขชัดขึ้น 📈", roast: ["กินอะไรไปบ้าง ทำไมไม่จด", "ไม่จด = กินมั่ว รู้ตัวดี"] },
    { at: () => "22:20", done: (l) => l.steps != null, body: "ยังไม่ได้ใส่ก้าววันนี้ ดูตัวเลขในมือถือแล้วกดใส่ในแอป",
      soft: "ใส่ก้าววันนี้หน่อย", hype: "วันนี้เดินไปเท่าไร มาดูกัน 🚶", roast: ["ก้าววันนี้เท่าไร ไม่กล้าใส่เหรอ", "ไม่ใส่ก้าว = ไม่ได้เดินใช่มั้ย"] },
    { at: () => "23:20", done: (l) => !!(l.bedAt || l.sleep), body: "เลย 23:00 แล้ว วางมือถือ กด \"นอนแล้ว\" แล้วนอนเลย",
      soft: "ได้เวลานอนแล้ว", hype: "นอนตอนนี้ พรุ่งนี้สดชื่น 😴", roast: ["ยังไม่นอนอีก! พรุ่งนี้อย่ามาโทษใคร", "อีกคลิปเดียว… โกหก นอน", "นอนดึก = พรุ่งนี้โดดเวท เห็นมาแล้ว"] },
  ];
  // หายไปไหน: ไม่เปิดแอปกี่วันแล้ว (เปิดแอป = เลื่อนออกไปเอง) [วันที่ไม่เปิด, เวลา, ด่า, สุภาพ/ปลุกใจ, เนื้อความ]
  const AWAY = [
    [1, "20:30", "วันนี้ไม่เปิดแอปเลยนะ แอบไปกินอะไรมา", "วันนี้ยังไม่ได้บันทึก", "เปิดแอปบันทึก 1 นาทีพอ ไม่ต้องสมบูรณ์"],
    [2, "08:00", "2 วันแล้ว จะหายเหมือนรอบก่อนๆ เหรอ", "2 วันแล้วที่ไม่ได้เปิดแอป", "ห้ามพลาด 2 วันติด เปิดแอปแล้วทำแค่ 1 อย่างวันนี้"],
    [3, "12:00", "3 วัน… ไขมันกำลังจัดปาร์ตี้", "คิดถึงนะ กลับมาต่อกัน", "ไม่ต้องชดเชย ไม่ต้องเริ่มใหม่ แค่ทำวันนี้ต่อ"],
    [5, "19:00", "5 วันแล้ว ที่สัญญาไว้หายไปไหน", "5 วันแล้ว กลับมาเมื่อไรก็ได้", "เปิดแอป ชั่งน้ำหนัก แล้วไปต่อจากตรงนี้"],
    [7, "19:00", "หายไปอาทิตย์นึง กลับมาตอนนี้ยังทัน", "ยังรออยู่นะ", "ไม่ต้องรอวันจันทร์ ไม่ต้องรอต้นเดือน เริ่มต่อวันนี้"],
  ];
  // ในแอป (สไตล์ด่า): ขึ้นบนการ์ดหลักเมื่อช้ากว่าเวลาเกิน 15 นาที
  const JABS = ["ช้าไป {m} แล้ว ยังไม่ทำอีก", "เปิดแอปมาดูเฉยๆ ไม่นับนะ", "อ่านจบแล้วกดปุ่มเลย ไม่ต้องคิด", "{m} ที่เสียไป ไม่ได้คืนนะ", "รู้อยู่แล้วว่าต้องทำ แล้วรออะไร"];
  const NAG_ID = (d, k) => 100000 + (idx(d) + 100) * 10 + k; // ไอดีตามวัน: ยกเลิกเฉพาะของวันนั้นได้
  let nagOff = new Set(); // ทวงของวันนี้ที่ยกเลิกไปแล้ว

  // ---------- state ----------
  // profile: ส่วนสูง/อายุใช้คำนวณแคลอรี่และไขมัน · goalW 75 เป็นค่าเริ่ม หลังวัดเอว/คอ แอปจะบอกน้ำหนักที่ไขมันถึงเป้าจริง · startW ว่าง = ใช้ที่ชั่งวันเริ่ม
  // kcalAdj = ปรับแคลอรี่จากผลจริงรายสัปดาห์ · cutExtend = สัปดาห์ที่ลดต่อเพราะยังไม่ลีนพอก่อนเริ่มปี 2
  const def = () => ({ logs: {}, money: [], passiveMonthly: 0, rem: Object.fromEntries(REMINDERS.map((r) => [r.id, true])), fired: {},
    profile: { height: 168, age: 23, goalW: 75, goalBf: 12, startW: null }, kcalAdj: 0, cutExtend: 0, tone: "roast", nag: true, why: "" });
  let S = def();
  function normalize() {
    // ช่องที่ยังว่างใช้ค่าตัวจริง (อายุ 23 สูง 168 หนัก 110) ค่าที่กรอกเองไม่ทับ
    const P0 = def().profile; S.profile = Object.assign({}, P0, S.profile); for (const k in P0) if (S.profile[k] == null) S.profile[k] = P0[k];
    if (!S.planVer3) { if (S.profile.goalW === 60) S.profile.goalW = P0.goalW; S.planVer3 = true; } // 60 กก. ต่ำเกินไปสำหรับ 168 ซม. ที่มีกล้ามเยอะ
    // ย้ายจากแผน 3 ปีเดิม (เริ่ม 28 ก.ย.): เลขสัปดาห์เลื่อน รีเซ็ตรอบ deload
    if (S.planVer !== 2) { delete S.deloadAnchor; delete S.stallDismissed; S.planVer = 2; }
  }
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(def(), JSON.parse(raw)); } catch (e) {}
  normalize();
  let cache = {}; // ค่าที่คำนวณจาก logs (น้ำหนักตั้งต้น เส้นเป้า) ล้างทุกครั้งที่บันทึก
  const save = () => { cache = {}; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("บันทึกไม่ได้: พื้นที่เครื่องเต็มหรือถูกบล็อก"); } syncNags(); };

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const idx = (d) => Math.round((d - START) / DAY);
  const fmt = (n, dp = 0) => (n == null || n === "" || isNaN(n) ? "–" : Number(n).toLocaleString("th-TH", { minimumFractionDigits: dp, maximumFractionDigits: dp }));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addMin = (t, m) => { const [h, mi] = t.split(":").map(Number); const x = h * 60 + mi + m; return `${pad(Math.floor(x / 60) % 24)}:${pad(x % 60)}`; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  // คำพูดโค้ชตามสไตล์ที่เลือก (ไม่มี = null → ใช้ "Coach 365")
  function lines(kind, tone = S.tone) {
    const T = LINES[tone]; if (!T) return null;
    const why = String(S.why || "").trim();
    return (T[kind] || T._).filter((s) => why || !s.includes("{why}")).map((s) => s.replace("{why}", `“${why}”`));
  }
  const coachTitle = (rid) => { const a = lines(KIND[rid] || rid); return a?.length ? pick(a) : "Coach 365"; };
  const nagTitle = (n) => (S.tone === "roast" ? pick(n.roast) : n[S.tone] || n.soft);
  let toastT;
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2200); }

  // ---------- ร่างกาย: น้ำหนักตั้งต้น เป้า แคลอรี่ ----------
  const total = () => BASE_DAYS + (S.cutExtend || 0) * 7;
  const y1End = () => 365 + (S.cutExtend || 0) * 7;
  // วันตามแผนหลัก: ช่วงลดต่อ (cutExtend) ใช้แผนวันสุดท้ายของปี 1 แล้วปี 2 เลื่อนออกไป
  const planDay = (i) => (i >= 365 && i < y1End() ? 364 : i >= y1End() ? i - (S.cutExtend || 0) * 7 : i);
  const phaseOf = (j) => { const m = Math.min(24, Math.floor(j / 30.4) + 1); return PHASES.find(([a, b]) => m >= a && m <= b) || PHASES[PHASES.length - 1]; };
  // น้ำหนักวันเริ่ม: ตั้งเองในโปรไฟล์ หรือที่ชั่งล่าสุดก่อน/วันเริ่ม หรือครั้งแรกหลังวันเริ่ม
  function startW() {
    if (cache.sw != null) return cache.sw;
    const s = iso(START), ks = Object.keys(S.logs).filter((k) => S.logs[k].weight != null).sort();
    const k = ks.filter((x) => x <= s).pop() ?? ks.find((x) => x > s);
    return (cache.sw = Number(S.profile.startW) || S.logs[k]?.weight || 110);
  }
  const goalW = () => Number(S.profile.goalW) || 75;
  // น้ำ: 32 มล./กก. นับเป็นแก้ว 250 มล. (110 กก. ≈ 14 แก้ว 3.5 ลิตร) ลดตามน้ำหนัก ไม่ต่ำกว่า 8 ไม่เกิน 16
  const waterGoal = () => Math.min(16, Math.max(8, Math.round(((trendWeight() ?? startW()) * 32) / 250)));
  // เฉลี่ยน้ำหนัก 7 วันล่าสุด (ตัดผลน้ำ/เกลือรายวัน)
  function trendWeight() {
    const t = today(), ws = [];
    for (let k = 0; k < 7; k++) { const w = S.logs[iso(new Date(t - k * DAY))]?.weight; if (w != null) ws.push(w); }
    return ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : lastWeight();
  }
  // พลังงานที่ใช้ต่อวันโดยประมาณ: Mifflin-St Jeor (ชาย) × 1.45 (งานนั่งโต๊ะ + เดิน + เวท)
  const tdee = (w) => (10 * w + 6.25 * (Number(S.profile.height) || 170) - 5 * (Number(S.profile.age) || 25) + 5) * 1.45;
  // 1 กก./สัปดาห์ ≈ 1,100 kcal/วัน · ไม่ต่ำกว่า 1,500 kcal
  function targetFor(mode, rate, w) {
    w = w ?? trendWeight() ?? startW();
    const base = tdee(w) + (mode === "bulk" ? 250 : mode === "cut" || mode === "minicut" ? (rate / 100) * w * 1100 : 0);
    const kcal = Math.round(Math.max(1500, base + (S.kcalAdj || 0)) / 50) * 50;
    return { ...TARGETS[mode], kcal, kcalMin: kcal - 100, kcalMax: kcal + 100, tdee: Math.round(tdee(w) / 50) * 50 };
  }
  // เส้นน้ำหนักเป้ารายสัปดาห์: ปี 1 ลดตามอัตราของช่วง (ไม่ต่ำกว่าเป้า สัปดาห์พักไดเอทคงที่) ปี 2 ตามอัตราของช่วง
  function path() {
    if (cache.path) return cache.path;
    const gw = goalW(), weeks = Math.ceil(total() / 7);
    let w = startW(); const pts = [w];
    for (let k = 0; k < weeks; k++) {
      const j = planDay(Math.min(total() - 1, k * 7 + 3)), y1 = j < 365;
      const r = y1 && DIET_BREAKS.includes(k) ? 0 : phaseOf(j)[6];
      w *= 1 + r / 100;
      if (y1 && r < 0) w = Math.max(gw, w);
      pts.push(w);
    }
    return (cache.path = pts);
  }
  function goalAt(day) {
    const pts = path(), x = Math.max(0, Math.min(total(), day)) / 7, k = Math.floor(x);
    return k >= pts.length - 1 ? pts[pts.length - 1] : pts[k] + (pts[k + 1] - pts[k]) * (x - k);
  }

  function plan(d) {
    const i = Math.max(0, Math.min(total() - 1, idx(d))), j = planDay(i);
    const extra = i >= 365 && i < y1End(); // ลดต่อเพราะยังไม่ลีนพอ
    const month = Math.min(24, Math.floor(j / 30.4) + 1), year = j < 365 ? 1 : 2;
    const pi = PHASES.findIndex(([a, b]) => month >= a && month <= b), P = PHASES[pi] || PHASES[PHASES.length - 1];
    const phase = pi + 1, prog = P[4];
    const wd = (d.getDay() + 6) % 7; // 0 = จันทร์
    const week = Math.floor((i + START_OFF) / 7);
    const dietBreak = !extra && year === 1 && DIET_BREAKS.includes(week);
    const mode = dietBreak ? "dietbreak" : P[3], rate = dietBreak ? 0 : P[6];
    let session = null, activity;
    // A/B สลับตามจำนวนวันเวท (จ/พ/ศ) ที่ผ่านมาตั้งแต่วันเริ่ม วันเวทแรกได้ A เสมอไม่ว่าเริ่มวันไหน
    if (prog === "AB") { if ([0, 2, 4].includes(wd)) { let n = 0; for (let k = 0; k < i; k++) if ([0, 2, 4].includes((START_OFF + k) % 7)) n++; session = n % 2 === 0 ? "A" : "B"; } }
    else if (prog === "UL") session = { 0: "U1", 1: "L1", 3: "U2", 4: "L2" }[wd] || null;
    else if (prog === "PPL") session = { 0: "PUSH", 1: "PULL", 2: "LEGS", 4: "U2", 5: "L2" }[wd] || null;
    else session = { 0: "PUSH2", 1: "PULL2", 2: "LEGS2", 4: "U1", 5: "L1" }[wd] || null;
    if (session) activity = "เวท " + SESSIONS[session].name;
    else activity = wd === 6 ? "เดินยาว + Meal prep" : wd === 5 ? "เดินยาว 60–90 นาที" : "เดิน 20 นาที + ยืด";
    // วันนี้/ที่ผ่านมาใช้น้ำหนักจริง วันในอนาคตใช้น้ำหนักตามเส้นเป้า
    const target = targetFor(mode, rate, iso(d) > iso(today()) ? goalAt(i) : null);
    const N = S.deloadEvery || 7, deload = ((week - (S.deloadAnchor || 0)) % N + N) % N === N - 1;
    const cycleWeek = (((week - (S.deloadAnchor || 0)) % N) + N) % N + 1;
    const phaseNote = deload ? "สัปดาห์ Deload: น้ำหนัก 60% แค่ 2 เซ็ต ทำท่าให้สวย ให้ร่างกายซ่อม"
      : dietBreak ? "สัปดาห์พักไดเอท: กินระดับรักษาน้ำหนัก (เพิ่มข้าว) เวทเต็มที่ น้ำหนักขึ้น 0.5–1 กก. เป็นน้ำในกล้าม ไม่ใช่ไขมัน"
      : extra ? "ไขมันยังเกิน 15% ลดต่อแบบช้าก่อนเริ่มสร้างกล้าม" : P[5];
    return { day: i + 1, dayOfYear: j + 1 - (year - 1) * 365, month, year, phase, phaseName: extra ? `ปี 1 · ลีน (ลดต่อ +${S.cutExtend} สัปดาห์)` : P[2], phaseNote, mode, rate, modeTh: target.th, target, session, activity, deload, dietBreak, extra, prog, cycleWeek, cycleLen: N, week,
      steps: year === 1 ? STEPS[Math.min(11, month - 1)] : 10000, window: month === 1 ? "12:00–22:00" : mode === "bulk" ? "10:00–20:00" : "12:00–20:00", goal: goalAt(i) };
  }

  // ---------- tabs ----------
  function show(tab) {
    document.querySelectorAll(".tabbar button").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === tab));
    document.querySelectorAll("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== tab));
    if (tab === "today") { renderStats(); renderHero(); }
    if (tab === "food") window.Food?.render();
    if (tab === "train") renderTrain();
    if (tab === "money") renderMoney();
    if (tab === "settings") renderSettings();
    scrollTo(0, 0);
  }
  document.querySelectorAll(".tabbar button").forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));

  // ---------- header ----------
  function renderHeader() {
    const t = today(), p = plan(t), i = idx(t);
    TARGET = p.target;
    $("dayLabel").textContent = i < 0 ? (i === -1 ? "วันซ้อมมือ · พรุ่งนี้เริ่ม" : `อีก ${-i} วันเริ่ม`) : p.extra ? `ปี 1 · ลดต่อวันที่ ${i - 364}` : `ปี ${p.year} · วันที่ ${p.dayOfYear}`;
    $("phaseLabel").textContent = `${p.phaseName} · เดือน ${p.month}/24${p.dietBreak ? " · พักไดเอท" : ""}${p.deload ? " · 🔋 DELOAD" : ""}`;
    const last = lastWeight(), sw = startW(), gw = goalW();
    const pct = last == null ? 0 : p.year === 1 ? (sw > gw ? Math.max(0, Math.min(1, (sw - last) / (sw - gw))) : 1) : Math.max(0, Math.min(1, p.dayOfYear / 365));
    const C = 2 * Math.PI * 26;
    $("goalRing").innerHTML = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--sunk)" stroke-width="7"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--good)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle" font-size="14" font-family="IBM Plex Mono,monospace" fill="var(--ink)">${Math.round(pct * 100)}%</text></svg>`;
  }

  // ---------- today ----------
  $("checks").innerHTML = CHECKS.map(([k, l]) => `<label class="chk"><input type="checkbox" id="c-${k}"> ${l}</label>`).join("");
  $("logDate").value = iso(today());
  $("logDate").addEventListener("change", () => { $("saveStatus").textContent = ""; renderToday(); });

  const todayLog = () => (S.logs[iso(today())] = S.logs[iso(today())] || {});
  const hmNow = () => { const n = new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };
  const buzz = (p = 30) => { try { navigator.vibrate?.(p); } catch (e) {} };
  function celebrate(msg) { buzz([40, 60, 40]); toast(msg); const h = $("hero"); h.classList.add("pop"); setTimeout(() => h.classList.remove("pop"), 600); }

  // มื้อตามแผนของวันนี้ (จาก meals.js)
  function plannedMeal(slot) {
    const wk = WEEKS[weekIdx(today()) % 2], row = wk[(today().getDay() + 6) % 7];
    return mealRef(row[slot]);
  }
  function addMeal(items, src, photoId = null) {
    const l = todayLog(); l.food = l.food || [];
    l.food.push({ time: hmNow(), photoId, items: items.map((x) => ({ th: x.th, kcal: Math.round(x.kcal), p: Math.round(x.p) })), src });
    afterMeal(l);
  }
  function afterMeal(l) {
    const p = l.food.reduce((a, m) => a + m.items.reduce((b, i) => b + i.p, 0), 0);
    l.protein = p >= TARGET.protein;
    const closeAt = plan(today()).window.split("–")[1];
    if (hmNow() > closeAt) { l.if = false; toast(`กินหลัง ${closeAt} แล้ว IF วันนี้ไม่ผ่าน พรุ่งนี้เอาใหม่`); }
    save(); refresh();
  }
  function closeKitchen() { const l = todayLog(); l.if = true; l.kitchenClosed = hmNow(); save(); celebrate("ปิดครัวแล้ว เจอกันพรุ่งนี้เที่ยง 🔒"); }

  // ---------- การนอน: เป้า 7–8 ชม. ----------
  // เข้านอน: กด "นอนแล้ว" บันทึกเวลา (หลังเที่ยงคืนถึงตี 5 นับเป็นคืนของเมื่อวาน) ตื่น: กด "ตื่นแล้ว" แอปคำนวณชั่วโมงให้
  const yLog = () => S.logs[iso(new Date(today() - DAY))] || {};
  function goBed() {
    const late = new Date().getHours() < 5, k = iso(late ? new Date(today() - DAY) : today()), l = (S.logs[k] = S.logs[k] || {});
    l.bedAt = hmNow(); if (!late && l.bedAt <= "23:15") l.sleep = true;
    save(); celebrate(l.sleep ? "ฝันดี พรุ่งนี้เจอกัน 😴" : "ดึกไปหน่อย คืนพรุ่งนี้เข้านอนเร็วขึ้นนะ 😴"); refresh();
  }
  function sleepEst() {
    const b = yLog().bedAt, n = new Date(); if (!b || n.getHours() < 4 || n.getHours() >= 10) return null;
    const [h, m] = b.split(":").map(Number); let mins = n.getHours() * 60 + n.getMinutes() - (h * 60 + m); if (mins <= 0) mins += 1440;
    return Math.min(12, Math.max(3, Math.round(mins / 30) / 2));
  }
  function setSleep(h) { todayLog().sleepH = h; save(); celebrate(h >= 7 ? `นอน ${h} ชม. พอดี ร่างกายพร้อม 💪` : `นอน ${h} ชม. น้อยไป คืนนี้เข้านอนเร็วขึ้น 30 นาที`); refresh(); }
  function sleepAvg(n = 3) { const hs = []; for (let k = 0; k < n; k++) { const v = S.logs[iso(new Date(today() - k * DAY))]?.sleepH; if (v != null) hs.push(v); } return hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : null; }

  // ---------- สิ่งที่ต้องทำต่อไป ----------
  function actions() {
    const l = todayLog(), p = plan(today()), wd = today().getDay(), meals = l.food?.length || 0, target = p.steps;
    const A = [];
    const est = sleepEst(), bed = yLog().bedAt, M = morningOf(today()), workday = wd >= 1 && wd <= 5;
    A.push({ t: M.wake, title: "ตื่นแล้ว ☀️ เมื่อคืนนอนกี่ชั่วโมง", sub: est ? `เข้านอน ${bed} ตื่นตอนนี้ ≈ ${est} ชม. · เป้า 7–8 ชม.` : "เป้า 7–8 ชม. ต่อคืน กดเลือกชั่วโมงด้านล่าง", done: l.sleepH != null,
      btn: est ? `ใช่ ${est} ชม. ✓` : "ใส่ชั่วโมง", act: est ? () => setSleep(est) : () => $("qSleep").scrollIntoView({ behavior: "smooth", block: "center" }), alt: est ? "แก้เอง" : null, altAct: () => $("qSleep").scrollIntoView({ behavior: "smooth", block: "center" }) });
    const tired = l.sleepH != null && l.sleepH < 6 ? " · นอนน้อย วันนี้ลดท่าละ 1 เซ็ต ไม่ต้องฝืน" : "";
    A.push({ t: M.med, title: "นั่งสมาธิเช้า 10 นาที", sub: "หายใจเข้า 4 ออก 6 แค่นั่งเฉยๆ ใจนิ่งทั้งวัน", done: (l.medAm ?? l.meditateMin ?? 0) >= 10, btn: "เริ่มเลย", act: () => startMed(10) });
    A.push({ t: M.post, title: "จัดบุคลิก 10 นาที", sub: "3 ท่า แก้คอยื่น ไหล่ห่อ", done: !!l.posture, btn: "▶ เริ่มเลย", act: () => startWorkout("P"), alt: "ทำแล้ว", altAct: () => setFlag("posture", "บุคลิกดีขึ้นทุกวัน 👍") });
    if (p.session) A.push({ t: M.train, title: (p.deload ? "🔋 Deload: " : "เวท ") + SESSIONS[p.session].name, sub: l.wStart?.[p.session] ? "ค้างไว้อยู่ กดเล่นต่อได้เลย" : p.deload ? "สัปดาห์พักฟื้น น้ำหนัก 60% 2 เซ็ต เสร็จใน 20 นาที" : "วอร์ม 5 นาที + 5 ท่า 30–35 นาที แอปจับเวลาพักและบอกน้ำหนักให้" + tired, done: !!l.workout, btn: l.wStart?.[p.session] ? "▶ เล่นต่อ" : "▶ เริ่มเลย", act: () => startWorkout(p.session), alt: "ดูท่าก่อน", altAct: () => { $("sessionPick").value = ""; show("train"); } });
    else if (wd >= 2 && wd <= 4) A.push({ t: M.train, title: p.month >= 7 ? "HIIT 10 นาที" : "เดิน 20 นาที (หรือ HIIT 10 นาที)", sub: (p.month >= 7 ? "แรงกระแทกต่ำ ไม่ต้องกระโดด แอปบอกท่าและจับเวลาให้" : "วันพักเวท เดินเช้า 20 นาที อยากลอง HIIT ก็ได้") + (tired ? " · นอนน้อย เดินแทน HIIT" : ""), done: !!l.walkAm || !!l.hiit, btn: p.month >= 7 ? "▶ เริ่ม HIIT" : "เดินแล้ว", act: p.month >= 7 ? startHiit : () => setFlag("walkAm", "เยี่ยม 🚶"), alt: p.month >= 7 ? "เดินแทน" : "▶ HIIT", altAct: p.month >= 7 ? () => setFlag("walkAm", "เยี่ยม 🚶") : startHiit });
    else A.push({ t: M.train, title: p.activity, sub: "วันพักเวท ออกไปเดินตอนเช้า แดดเช้าช่วยให้คืนนี้หลับง่าย", done: !!l.walkAm, btn: "เดินแล้ว", act: () => setFlag("walkAm", "เยี่ยม 🚶") });
    if (workday) A.push({ t: "08:00", title: "พักก่อนไปทำงาน 45 นาที", sub: "อาบน้ำแต่งตัวเสร็จแล้ว นั่งพักสบายๆ ไม่ต้องรีบ ออกจากบ้าน 08:45", done: !!l.restAm, btn: "พักแล้ว ☕", act: () => setFlag("restAm", "พร้อมไปทำงานแล้ว 💼") });
    const meal = (t, slot, title, need) => {
      const m = plannedMeal(slot);
      A.push({ t, title, sub: `ตามแผน: ${m.th} (${m.kcal} kcal)`, done: meals >= need, btn: "กินตามแผน ✓", act: () => { addMeal([m], "ตามแผน"); celebrate(`บันทึก ${m.th} แล้ว`); }, alt: "ถ่ายรูป", altAct: () => { show("food"); $("photoIn").click(); } });
    };
    meal("12:00", 1, "มื้อแรก", 1);
    meal("16:00", 2, "มื้อว่างโปรตีน", 2);
    meal("18:15", 3, "มื้อสุดท้าย", 3);
    A.push({ t: "18:40", title: "ปิดครัว", sub: `ไม่กินอีกจนถึงพรุ่งนี้เที่ยง (IF ${p.window})`, done: !!l.if, btn: "ปิดครัวแล้ว 🔒", act: closeKitchen });
    A.push({ t: "18:45", title: `เดินให้ครบ ${fmt(target)} ก้าว`, sub: "ลงรถก่อน 1–2 ป้าย หรือเดินรอบย่าน", done: (l.steps || 0) >= target, btn: "ครบแล้ว", act: () => setSteps(target, `${fmt(target)} ก้าว เก่งมาก 🔥`), alt: "ใส่ตัวเลข", altAct: () => $("qSteps").scrollIntoView({ behavior: "smooth", block: "center" }) });
    A.push({ t: "22:00", title: "เก็บห้อง 10 นาที", sub: "ผ้าแห้งพับเก็บ ของวางที่เดิม", done: !!l.room, btn: "เก็บแล้ว", act: () => setFlag("room", "ห้องสะอาด สมองโล่ง ✨") });
    // วันแรก + ทุกอาทิตย์: วัดตัว (อาทิตย์แรกของเดือนวัดรอบคอด้วย ใช้คำนวณไขมัน)
    const full = p.day === 1 || wd === 0, neck = p.day === 1 || (wd === 0 && today().getDate() <= 7);
    if (full || l.weight == null) A.push({ t: p.day === 1 || wd === 0 ? M.wake : "22:05",
      title: neck ? "ชั่งน้ำหนัก + วัดรอบเอว + รอบคอ" : full ? "ชั่งน้ำหนัก + วัดรอบเอว" : "ชั่งน้ำหนัก",
      sub: full ? `หลังเข้าห้องน้ำ ก่อนกินดื่ม · เอววัดระดับสะดือ หายใจออกปกติ ไม่แขม่ว${neck ? " · คอวัดใต้ลูกกระเดือก" : ""}` : "ตอนเช้าก่อนกินแม่นสุด แต่ตอนไหนก็ได้ดีกว่าไม่ชั่ง",
      done: l.weight != null && (!full || l.waist != null) && (!neck || l.neck != null), btn: "ใส่ตัวเลข",
      act: () => (full ? $("logForm") : $("qWeight")).scrollIntoView({ behavior: "smooth", block: "center" }) });
    A.push({ t: "22:45", title: "สมาธิก่อนนอน 5 นาที", sub: "แล้ววางมือถือไกลเตียง", done: (l.medNight ?? ((l.meditateMin || 0) >= 15 ? 5 : 0)) >= 5, btn: "เริ่มเลย", act: () => startMed(5) });
    const avg = sleepAvg();
    if (!FSP() && (!S.lastBackup || (today() - parse(S.lastBackup)) / DAY >= 7)) A.push({ t: "22:10", title: "สำรองข้อมูล (สัปดาห์ละครั้ง)", sub: "กดแล้วเก็บไฟล์ไว้ใน Drive หรือส่งเข้า LINE ตัวเอง กันมือถือหาย", done: false, btn: "ส่งออกเลย", act: () => $("exportJson").click() });
    const nextWake = morningOf(new Date(today().getTime() + DAY)).wake;
    A.push({ t: BED, title: `นอน (ตื่น ${nextWake} = ${nextWake === "06:30" ? "7.5" : "8.5"} ชม.)`, sub: avg != null && avg < 7 ? `3 คืนล่าสุดนอนเฉลี่ย ${avg.toFixed(1)} ชม. คืนนี้เข้านอนเร็วขึ้นได้ยิ่งดี` : "ห้องมืด เย็น มือถือไกลเตียง นอนพอ = หิวน้อย กล้ามไม่หาย",
      done: !!l.sleep || !!l.bedAt, btn: "นอนแล้ว 😴", act: goBed });
    return A.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  }
  let heroActs = [];
  function renderHero() {
    const A = actions(), now = hmNow(), i = idx(today());
    const done = A.filter((a) => a.done).length;
    $("scoreText").textContent = `${done} / ${A.length}`;
    let a = A.find((x) => !x.done && x.t <= now) || A.find((x) => !x.done);
    heroActs = a ? [a.act, a.altAct] : [];
    const h = $("hero");
    if (i >= total()) { h.innerHTML = `<div class="eyebrow">ครบ 2 ปี</div><h2>จบแผนแล้ว 🏆</h2><p>ตอนนี้คือคนใหม่แล้ว รักษาโปรแกรม PPL โปรตีน 140 ก. และเดินวันละ 10,000 ก้าวต่อไป</p>`; heroActs = []; return; }
    if (i < 0) {
      // วันก่อนเริ่ม = วันซ้อมมือ: ลองทุกปุ่มได้ น้ำหนักที่ชั่งวันนี้ใช้เป็นน้ำหนักตั้งต้น เวทที่ลองเล่นใช้เป็น "ครั้งก่อน"
      const needH = !S.profile.height, l = todayLog();
      const steps = [
        needH ? ["ใส่ส่วนสูง/อายุ", () => { show("settings"); $("p-height").focus(); }] : null,
        l.weight == null ? ["ชั่งน้ำหนัก", () => $("qWeight").scrollIntoView({ behavior: "smooth", block: "center" })] : null,
        !l.food?.length ? ["ถ่ายรูปมื้อเที่ยง", () => { show("food"); $("photoIn").click(); }] : null,
        !l.workout ? ["▶ ลองเวท A เบาๆ", () => startWorkout("A")] : null,
        ["ตั้งแจ้งเตือน", () => show("settings")],
      ].filter(Boolean).slice(0, 2);
      h.innerHTML = `<div class="eyebrow">วันซ้อมมือ · เริ่มจริง${i === -1 ? "พรุ่งนี้" : ` อีก ${-i} วัน`} (${START_TH})</div><h2>ลองกดทุกอย่างได้เลย</h2>`
        + (S.tone === "roast" ? `<p class="jab">😤 เลื่อนวันเริ่มมาหลายรอบแล้ว ${START_TH} ห้ามเลื่อนอีก</p>` : "")
        + `<p>วันนี้ไม่นับในแผน ลองบันทึกอาหาร ชั่งน้ำหนัก เล่นเวทเบาๆ ให้คุ้นมือ น้ำหนักที่ชั่งวันนี้จะใช้เป็นน้ำหนักเริ่มต้น${i === -1 ? ` · พรุ่งนี้ ${morningOf(new Date(today().getTime() + DAY)).wake} ชั่ง + วัดเอว/คอ ก่อนกินดื่ม คืนนี้นอน ${BED}` : ""}</p>`
        + `<div class="row">${steps.map(([t], k) => `<button class="btn ${k ? "ghost" : ""}" type="button" data-hero="${k}">${t}</button>`).join("")}</div>`;
      heroActs = steps.map((s) => s[1]);
      return;
    }
    // หลังเที่ยงคืน ยังไม่ได้กดนอน: ชวนนอนก่อน (นับเป็นคืนของเมื่อวาน)
    if (now < "05:00" && !yLog().bedAt) {
      h.innerHTML = `<div class="eyebrow">${now} · เลยเวลานอนแล้ว</div><h2>วางมือถือ แล้วนอนเลย 😴</h2><p>ตื่น ${morningOf(today()).wake} ยังได้นอนอีก ${Math.max(0, ((([h, m]) => h * 60 + m)(morningOf(today()).wake.split(":").map(Number)) - (Number(now.slice(0, 2)) * 60 + Number(now.slice(3)))) / 60).toFixed(1)} ชม. นอนน้อยทำให้หิวง่ายและแรงตก</p><div class="row"><button class="btn" type="button" data-hero="0">นอนแล้ว 😴</button></div>`;
      heroActs = [goBed]; return;
    }
    if (!a) { h.innerHTML = `<div class="eyebrow">วันที่ ${i + 1}</div><h2>วันนี้ครบทุกอย่างแล้ว 🎉</h2><p>ไม่ต้องทำอะไรเพิ่ม ไปพักได้เลย</p>`; return; }
    const late = a.t <= now, upcoming = !late;
    // สไตล์ด่า: ช้ากว่าเวลาเกิน 15 นาที โค้ชแซะ (ประโยคเปลี่ยนทุกครึ่งชั่วโมง ไม่กระพริบทุกนาที)
    const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)), lateMin = late ? toMin(now) - toMin(a.t) : 0;
    const lateTxt = lateMin >= 60 ? `${Math.floor(lateMin / 60)} ชม.${lateMin % 60 ? ` ${lateMin % 60} นาที` : ""}` : `${lateMin} นาที`;
    const jab = S.tone === "roast" && lateMin >= 15 ? JABS[(Math.floor(lateMin / 30) + a.title.length) % JABS.length].replace("{m}", lateTxt) : "";
    h.innerHTML = `<div class="eyebrow">${upcoming ? `ต่อไป ${a.t}` : `ตอนนี้ · ${a.t}`} · เหลืออีก ${A.length - done} อย่าง</div><h2>${a.title}</h2>${jab ? `<p class="jab">😤 ${jab}</p>` : ""}<p>${a.sub}</p>
      <div class="row"><button class="btn" type="button" data-hero="0">${a.btn}</button>${a.alt ? `<button class="btn ghost" type="button" data-hero="1">${a.alt}</button>` : ""}</div>`;
  }
  $("hero").addEventListener("click", (e) => { const b = e.target.closest("[data-hero]"); if (b) heroActs[b.dataset.hero]?.(); });

  function setFlag(k, msg) { todayLog()[k] = true; save(); celebrate(msg); refresh(); }
  function setSteps(n, msg) { todayLog().steps = n; save(); if (msg) celebrate(msg); refresh(); }

  // ---------- ชิปเช็กลิสต์ (แตะเพื่อสลับ) ----------
  const CHIP = { if: "ปิดครัว", protein: "โปรตีนครบ", workout: "ออกกำลังกาย", posture: "บุคลิก", meditate: "สมาธิ", rest: "พัก 3 ชม.", room: "เก็บห้อง", sleep: "นอนตรงเวลา" };
  function renderChips() {
    const l = todayLog();
    $("chips").innerHTML = Object.entries(CHIP).map(([k, t]) => `<button type="button" class="chip ${l[k] ? "on" : ""}" data-chip="${k}" aria-pressed="${!!l[k]}">${l[k] ? "✓ " : ""}${t}</button>`).join("");
  }
  $("chips").addEventListener("click", (e) => {
    const k = e.target.closest("[data-chip]")?.dataset.chip; if (!k) return;
    const l = todayLog(); l[k] = !l[k]; if (k === "meditate" && l[k] && !(l.meditateMin >= 15)) l.meditateMin = 15;
    save(); buzz(); refresh();
  });

  // ---------- ใส่น้ำหนัก / ก้าว แบบเร็ว ----------
  let qw = null;
  function renderQuick() {
    const l = todayLog();
    qw = l.weight ?? lastWeight() ?? startW();
    $("qWeight").textContent = qw.toFixed(1);
    $("qWeightOk").textContent = l.weight != null ? "บันทึกแล้ว ✓" : "ใช้เลขนี้";
    $("qWeightOk").classList.toggle("ghost", l.weight != null);
    const p = plan(today()), cur = l.steps || 0;
    $("qStepsNow").textContent = cur ? `· ${fmt(cur)} / ${fmt(p.steps)}` : `· เป้า ${fmt(p.steps)}`;
    const opts = [...new Set([3000, 5000, 7000, p.steps, 12000])].sort((a, b) => a - b);
    const sh = l.sleepH;
    $("qSleepNow").textContent = sh != null ? `· ${sh} ชม.${sh >= 7 ? " ✓" : ""}` : "· เป้า 7–8 ชม.";
    $("qSleep").innerHTML = [5, 6, 6.5, 7, 7.5, 8, 9].map((n) => `<button type="button" class="chip ${sh === n ? "on" : ""}" data-sleep="${n}">${n === 9 ? "9+" : n}</button>`).join("");
    $("qSteps").innerHTML = opts.map((n) => `<button type="button" class="chip ${cur === n ? "on" : ""}" data-steps="${n}">${n === p.steps ? "ครบเป้า " : ""}${fmt(n)}</button>`).join("") + `<button type="button" class="chip" data-steps="custom">อื่นๆ…</button>`;
  }
  document.querySelector(".quick").addEventListener("click", (e) => {
    const w = e.target.closest("[data-w]")?.dataset.w;
    if (w) { qw = Math.round((qw + Number(w)) * 10) / 10; $("qWeight").textContent = qw.toFixed(1); buzz(10); return; }
    if (e.target.id === "qWeightOk") { const l = todayLog(); l.weight = qw; save(); const sw = startW(); celebrate(idx(today()) > 0 && qw < sw ? `บันทึก ${qw.toFixed(1)} กก. ลดไป ${(sw - qw).toFixed(1)} แล้ว` : `บันทึก ${qw.toFixed(1)} กก.`); refresh(); return; }
    const sl = e.target.closest("[data-sleep]")?.dataset.sleep; if (sl) { setSleep(Number(sl)); return; }
    const s = e.target.closest("[data-steps]")?.dataset.steps; if (!s) return;
    if (s === "custom") { $("f-steps").scrollIntoView({ behavior: "smooth", block: "center" }); $("f-steps").focus(); return; }
    setSteps(Number(s), Number(s) >= plan(today()).steps ? "ครบเป้าวันนี้ 🔥" : null);
  });

  function refresh() { renderHeader(); renderHero(); renderChips(); renderQuick(); renderMedToday(); renderStats(); if ($("logDate").value === iso(today())) renderToday(); if (!document.querySelector('[data-view="food"]').hidden) window.Food?.render(); window.Extras?.light(); pushWidget(); }

  // ---------- วิดเจ็ตหน้าจอโฮม (แอป Android) ----------
  // เขียนสรุปวันนี้ + แผน 14 วันข้างหน้าลง Preferences ให้วิดเจ็ตอ่าน (ปิดแอปหลายวันวิดเจ็ตยังบอกโปรแกรมวันนั้นได้)
  let widgetLast = "";
  // ปุ่มบนวิดเจ็ต (+น้ำ / ปิดครัว) กดได้โดยไม่ต้องเปิดแอป: native เก็บไว้ใน "widgetPending" แอปมารวมให้ตอนเปิด
  async function applyWidgetPending() {
    const P = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.Preferences; if (!P) return;
    try {
      const { value } = await P.get({ key: "widgetPending" }); if (!value) return;
      await P.remove({ key: "widgetPending" });
      const q = JSON.parse(value); if (q.date !== iso(today())) return;
      const l = todayLog(), msg = [];
      if (q.water) { l.water = (l.water || 0) + q.water; msg.push(`น้ำ +${q.water} แก้ว`); }
      if (q.kitchen && !l.if) { l.if = true; l.kitchenClosed = q.kitchen; msg.push(`ปิดครัว ${q.kitchen}`); }
      save(); refresh(); if (msg.length) toast("จากวิดเจ็ต: " + msg.join(" · "));
    } catch (e) {}
  }
  function pushWidget() {
    const P = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.Preferences; if (!P) return;
    try {
      const t = today(), l = todayLog(), A = idx(t) < 0 || idx(t) >= total() ? [] : actions();
      const eaten = (l.food || []).reduce((a, m) => a + m.items.reduce((b, x) => b + x.kcal, 0), 0);
      const prot = (l.food || []).reduce((a, m) => a + m.items.reduce((b, x) => b + x.p, 0), 0);
      const days = {};
      for (let k = 0; k < 14; k++) {
        const d = new Date(t.getTime() + k * DAY), i = idx(d), p = plan(d);
        days[iso(d)] = { label: i < 0 ? "วันซ้อมมือ" : i >= total() ? "ครบ 2 ปี 🏆" : p.extra ? `ปี 1 · ลดต่อวันที่ ${i - 364}` : `ปี ${p.year} · วันที่ ${p.dayOfYear}`,
          phase: p.phaseName + (p.deload ? " · Deload" : p.dietBreak ? " · พักไดเอท" : ""), act: p.activity, kcal: p.target.kcal, prot: p.target.protein, steps: p.steps, win: p.window };
      }
      // acts: วิดเจ็ตเลือก "ทำอะไรต่อ" ตามเวลาปัจจุบันเอง (อันแรกที่ยังไม่ทำและถึงเวลาแล้ว)
      const snap = { v: 1, date: iso(t), acts: A.map((x) => [x.t, x.title.replace(/<[^>]*>/g, ""), x.done ? 1 : 0]),
        eaten, prot, steps: l.steps || 0, weight: l.weight ?? lastWeight(), water: l.water || 0, wgoal: waterGoal(), kitchen: !!l.if, days };
      const json = JSON.stringify(snap); if (json === widgetLast) return; widgetLast = json;
      P.set({ key: "widget", value: JSON.stringify({ ...snap, updated: hmNow() }) }).catch(() => {});
    } catch (e) {}
  }

  function renderToday() {
    const d = parse($("logDate").value), p = plan(d);
    $("targets").innerHTML = [
      ["ก้าวเดิน", fmt(p.steps)], ["หน้าต่างกิน", p.window], ["ออกกำลังกาย", p.activity], ["แคลอรี่ / โปรตีน", `${fmt(p.target.kcal)} / ${p.target.protein} ก.`],
    ].map(([a, b]) => `<div class="tgt"><span class="eyebrow">${a}</span><b>${b}</b></div>`).join("") + `<div class="tgt" style="grid-column:1/-1"><span class="eyebrow">${p.phaseName} · น้ำหนักเป้าตอนนี้ ${p.goal.toFixed(1)} กก.</span><b style="font-size:15px">${p.phaseNote}</b></div>`;
    const e = S.logs[iso(d)] || {};
    ["weight", "waist", "neck", "steps", "spend"].forEach((k) => ($("f-" + k).value = e[k] ?? ""));
    $("f-note").value = e.note || "";
    CHECKS.forEach(([k]) => ($("c-" + k).checked = !!e[k]));
  }
  // ---------- ตารางวันนี้ ----------
  function renderSchedule() {
    const now = new Date(), d = today(), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const items = [];
    REMINDERS.forEach((r) => { if (dueToday(r, d)) r.time.split(",").forEach((t, i) => { if (r.id !== "move" || i === 0) items.push({ t, msg: r.id === "move" ? "ลุกเดิน 3 นาที + ดื่มน้ำ 1 แก้ว ทุกชั่วโมง (10:00–17:00)" : r.msg, rest: r.rest }); }); });
    if (d.getDay() >= 1 && d.getDay() <= 5) items.push({ t: "09:00", msg: "ทำงาน (ถึง 18:00)" });
    items.sort((a, b) => (a.t < b.t ? -1 : 1));
    let cur = -1; items.forEach((it, i) => { if (it.t <= hm) cur = i; });
    const rest = items.reduce((a, i) => a + (i.rest || 0), 0);
    $("restTotal").textContent = `· พักผ่อนรวม ${Math.floor(rest / 60)} ชม.${rest % 60 ? " " + (rest % 60) + " นาที" : ""}`;
    $("schedule").innerHTML = items.map((it, i) => `<div class="srow ${i === cur ? "now" : ""} ${it.rest ? "rest" : ""}"><span class="num">${it.t}</span><span>${it.msg}${it.rest ? ` <span class="pill">พัก ${it.rest} นาที</span>` : ""}</span></div>`).join("");
  }

  // ---------- สมาธิ ----------
  let med = null;
  function medBell(freq = 528) {
    try {
      const ac = (medBell.ac ||= new (window.AudioContext || window.webkitAudioContext)());
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = freq; o.type = "sine"; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 3.5);
      o.start(); o.stop(ac.currentTime + 3.6);
    } catch (e) {}
  }
  function renderMedToday() { const m = S.logs[iso(today())]?.meditateMin || 0; $("medToday").textContent = `วันนี้ ${m} นาที`; }
  async function startMed(min) {
    stopMed(false);
    const end = Date.now() + min * 60000;
    let lock = null; try { lock = await navigator.wakeLock?.request("screen"); } catch (e) {}
    med = { min, end, lock, timer: setInterval(tickMed, 250) };
    $("breath").classList.add("on"); $("medStop").hidden = false;
    $("medCard").scrollIntoView({ behavior: "smooth", block: "center" });
    document.querySelectorAll("[data-med]").forEach((b) => (b.hidden = true));
    medBell(); tickMed();
  }
  function tickMed() {
    if (!med) return;
    const left = med.end - Date.now();
    if (left <= 0) { stopMed(true); return; }
    const phase = ((med.min * 60000 - left) % 10000) < 4000 ? "หายใจเข้า…" : "หายใจออก…";
    $("medLabel").textContent = `${phase}  ${Math.floor(left / 60000)}:${pad(Math.floor((left % 60000) / 1000))}`;
  }
  function stopMed(done) {
    if (!med) return;
    clearInterval(med.timer); med.lock?.release?.().catch(() => {});
    const used = done ? med.min : Math.floor((med.min * 60000 - (med.end - Date.now())) / 60000);
    med = null;
    $("breath").classList.remove("on"); $("medStop").hidden = true;
    document.querySelectorAll("[data-med]").forEach((b) => (b.hidden = false));
    $("medLabel").textContent = "หายใจเข้า 4 วินาที · ออก 6 วินาที · นับลมหายใจ 1 ถึง 10 แล้วเริ่มใหม่";
    if (used > 0) {
      const k = iso(today()), l = (S.logs[k] = S.logs[k] || {});
      l.meditateMin = (l.meditateMin || 0) + used;
      const hr = new Date().getHours(); if (hr < 12) l.medAm = (l.medAm || 0) + used; else if (hr >= 20) l.medNight = (l.medNight || 0) + used;
      if (l.meditateMin >= 15) l.meditate = true;
      save(); refresh();
    }
    if (done) { medBell(); medBell(396); celebrate(`ครบ ${used} นาที ใจนิ่งขึ้นแล้ว 🧘`); }
  }
  $("medBtns").addEventListener("click", (e) => { const m = e.target.dataset.med; if (m) startMed(Number(m)); });
  $("medStop").addEventListener("click", () => stopMed(false));

  const num = (id) => { const v = $(id).value; return v === "" ? null : Number(v); };
  function saveForm(quiet) {
    const k = $("logDate").value, prev = S.logs[k] || {};
    const e = Object.assign({}, prev, { weight: num("f-weight"), waist: num("f-waist"), neck: num("f-neck"), steps: num("f-steps"), spend: num("f-spend"), note: $("f-note").value.trim() });
    S.logs[k] = e; save(); renderHeader(); renderStats(); window.Extras?.light();
    if (k === iso(today())) { renderHero(); renderChips(); renderQuick(); }
    $("saveStatus").textContent = "บันทึกแล้ว " + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    if (!quiet) toast("บันทึกแล้ว");
  }
  let formT;
  $("logForm").addEventListener("input", () => { clearTimeout(formT); formT = setTimeout(() => saveForm(true), 600); });
  $("logForm").addEventListener("submit", (ev) => { ev.preventDefault(); clearTimeout(formT); saveForm(false); });

  // ---------- train ----------
  const sessionOpts = Object.entries(SESSIONS).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join("");
  $("sessionPick").innerHTML = `<option value="">ตามแผนวันนี้</option>` + sessionOpts;
  $("sessionPick").addEventListener("change", renderTrain);

  function lastLift(exId, beforeDate) {
    const keys = Object.keys(S.logs).filter((k) => k < beforeDate && !S.logs[k].deload).sort().reverse();
    for (const k of keys) { const l = S.logs[k].lifts?.[exId]; if (l && (l.w || l.r)) return { date: k, ...l }; }
    return null;
  }
  const eqName = { bb: "บาร์เบล", db: "ดัมเบล", none: "ตัวเปล่า" };

  function exCard(id, sets, withLog) {
    const ex = EXERCISES[id], dk = iso(today());
    const cur = S.logs[dk]?.lifts?.[id] || {};
    const last = withLog ? lastLift(id, dk) : null;
    const yt = "https://www.youtube.com/results?search_query=" + encodeURIComponent(ex.name + " proper form");
    return `<article class="ex ${cur.done ? "done" : ""}" data-id="${id}">
      ${Figures.html(id)}
      <div>
        <h3>${ex.th}<span class="eqtag">${eqName[ex.eq]}</span></h3>
        <div class="small muted">${ex.name} · ${ex.muscles}</div>
        ${sets ? `<div class="sets">${sets}</div>` : ""}
        ${withLog ? `<div class="last">${last ? `ครั้งก่อน (${last.date.slice(5)}): ${last.w ?? "–"} กก. × ${last.r ?? "–"}` : "ยังไม่มีสถิติ เริ่มเบาๆ เน้นท่าถูก"}</div>
        <div class="setsum">${cur.sets?.length ? cur.sets.map((s) => `<span class="pill ${s.done ? "ok" : ""}">${s.done ? "✓ " : ""}${s.w ?? "–"}×${s.r ?? "–"}</span>`).join("") : `<span class="small muted">วันนี้ยังไม่ได้เล่น</span>`}</div>` : ""}
        <div class="row" style="gap:6px;margin-top:8px">${ex.check ? `<button class="btn ghost small" type="button" data-check="${id}">🎥 ตรวจท่า</button>` : ""}<button class="btn ghost small" type="button" data-chart="${id}">📈 กราฟ</button></div>
        <div class="exchart-box"></div>
      </div>
      <details><summary>วิธีทำ</summary><ol>${ex.cues.map((c) => `<li>${c}</li>`).join("")}</ol>
        <div class="small"><b>ระวัง:</b> ${ex.mistake}</div>
        <div class="small"><a href="${yt}" target="_blank" rel="noopener">ดูวิดีโอตัวอย่างบน YouTube ↗</a></div></details>
    </article>`;
  }

  function renderTrain() {
    const p = plan(today());
    const pick = $("sessionPick").value || p.session;
    if (!pick) {
      $("sessionTitle").textContent = "วันนี้พักเวท";
      $("sessionNote").textContent = `${p.activity} · เลือกโปรแกรมด้านบนถ้าอยากเล่นชดเชย`;
      $("exList").innerHTML = "";
    } else {
      const s = SESSIONS[pick];
      $("sessionTitle").textContent = s.name;
      $("sessionNote").textContent = `${p.phaseName}: ${p.phaseNote} · ทำครบจำนวนครั้งสูงสุดทุกเซ็ต ครั้งหน้าเพิ่ม 1–2.5 กก.`;
      $("exList").innerHTML = s.items.map(([id, sets]) => exCard(id, sets, true)).join("");
    }
    $("finishCard").hidden = !pick;
    $("startBtn").hidden = !pick;
    renderDeload(p);
    const l = todayLog(), inProgress = !!l.wStart?.[pick];
    $("startBtn").textContent = (pick === "P" ? l.posture : l.workout) ? "▶ เล่นอีกรอบ" : inProgress ? "▶ เล่นต่อ (ค้างไว้)" : "▶ เริ่มเวิร์กเอาต์";
    $("finishBtn").textContent = pick === "P" ? "✅ จัดบุคลิกไปแล้ว บันทึกว่าเสร็จ" : "✅ เล่นไปแล้วโดยไม่ได้เปิดแอป บันทึกว่าเสร็จ";
    renderWkHistory();
    if (!$("library").innerHTML) $("library").innerHTML = Object.keys(EXERCISES).map((id) => exCard(id, "", false)).join("");
    Figures.start();
  }
  async function poseCheck(kind, title, card) {
    try {
      const { openPoseCheck } = await import("./posecheck.js");
      openPoseCheck({ kind, title, onDone: (n) => {
        if (!card || !n) return;
        const r = card.querySelector('[data-f="r"]');
        if (r) { r.value = n; r.dispatchEvent(new Event("change", { bubbles: true })); toast(`บันทึก ${n} ครั้งแล้ว`); }
      } });
    } catch (e) { toast("เปิดระบบตรวจท่าไม่ได้ ตรวจอินเทอร์เน็ต"); }
  }
  document.querySelector('[data-view="train"]').addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-check]"); if (!b) return;
    const ex = EXERCISES[b.dataset.check];
    poseCheck(ex.check, ex.th, b.closest("#exList .ex"));
  });
  $("postureBtn").addEventListener("click", () => poseCheck("posture", "ตรวจบุคลิกท่ายืน", null));

  // ---------- Deload ----------
  // ตัน = ท่าหลักไม่มีท่าไหนแรงขึ้นเลยใน 3 เซสชันล่าสุด (ไม่นับสัปดาห์ deload)
  function stalled() {
    const e1 = (s) => (s.w && s.r ? s.w * (1 + s.r / 30) : 0);
    const days = Object.keys(S.logs).filter((k) => S.logs[k].workout && !S.logs[k].deload).sort();
    if (days.length < 4) return false;
    const mains = ["goblet", "rdl", "row", "floorpress", "ohp"];
    let anyProgress = false;
    mains.forEach((id) => {
      const hist = days.map((k) => { const sets = (S.logs[k].lifts?.[id]?.sets || []).filter((s) => s.done); return sets.length ? Math.max(...sets.map(e1)) : null; }).filter((v) => v != null);
      if (hist.length < 4) return;
      const last3 = hist.slice(-3), before = Math.max(...hist.slice(0, -3));
      if (Math.max(...last3) > before + 0.5) anyProgress = true;
    });
    return !anyProgress;
  }
  function renderDeload(p) {
    const box = $("deloadCard"), w = p.week;
    const nextIn = p.deload ? 0 : p.cycleLen - p.cycleWeek;
    const isStall = !p.deload && stalled() && S.stallDismissed !== w;
    box.innerHTML = p.deload
      ? `<div class="row between"><b>🔋 สัปดาห์ Deload (สัปดาห์ ${p.cycleWeek}/${p.cycleLen} ของรอบ)</b><button class="btn ghost small" type="button" data-dl="skip">ยังแรงดี ข้ามไปก่อน</button></div><p class="small" style="margin:6px 0 0">น้ำหนัก 60% ของครั้งก่อน 2 เซ็ต ครบเรปสบายๆ ไม่ต้องล้า สัปดาห์หน้ากลับมาเต็มที่ ร่างกายจะแรงขึ้นกว่าเดิม</p>`
      : `<div class="row between"><span class="small">รอบ ${p.cycleLen} สัปดาห์ · สัปดาห์ที่ ${p.cycleWeek} · Deload ในอีก ${nextIn} สัปดาห์</span><button class="btn ghost small" type="button" data-dl="now">รู้สึกล้าจัด เริ่ม Deload สัปดาห์นี้</button></div>` +
        (isStall ? `<div class="callout" style="margin-top:8px"><b>⚠️ น้ำหนักบาร์ไม่ขึ้นมา 3 ครั้งติด</b> สัญญาณว่าพักไม่พอ แนะนำ Deload สัปดาห์นี้ แล้วเช็กการนอนกับโปรตีน <div class="row" style="margin-top:8px"><button class="btn small" type="button" data-dl="now">เริ่ม Deload</button><button class="btn ghost small" type="button" data-dl="dismiss">สัปดาห์นี้ลองต่ออีกที</button></div></div>` : "");
    box.hidden = !p.session && !p.deload;
  }
  $("deloadCard").addEventListener("click", (e) => {
    const a = e.target.dataset.dl; if (!a) return;
    const p = plan(today()), N = p.cycleLen;
    if (a === "now") { S.deloadAnchor = p.week - (N - 1); toast("สัปดาห์นี้เป็น Deload แล้ว 🔋"); }
    if (a === "skip") { S.deloadAnchor = p.week + 1; toast("ข้าม Deload รอบนี้ รอบใหม่เริ่มสัปดาห์หน้า"); }
    if (a === "dismiss") S.stallDismissed = p.week;
    save(); renderTrain(); refresh();
  });
  $("deloadEvery").value = S.deloadEvery || 7;
  $("deloadEvery").addEventListener("change", () => { S.deloadEvery = Math.min(8, Math.max(6, Number($("deloadEvery").value) || 7)); $("deloadEvery").value = S.deloadEvery; save(); renderTrain(); refresh(); });

  async function startHiit() {
    try { const { openHiit } = await import("./hiit.js"); openHiit({ onDone: (d) => { refresh(); if (d) celebrate("HIIT เสร็จ 🔥"); } }); }
    catch (e) { toast("เปิด HIIT ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่"); }
  }
  $("hiitBtn").addEventListener("click", startHiit);

  // ---------- แจ้งเตือนแบบแอป (Android ผ่าน Capacitor) ----------
  function native() { return window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.LocalNotifications : null; }
  const atTime = (d, hm) => { const [h, m] = hm.split(":").map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
  // แจ้งเตือนครั้งเดียวล่วงหน้า 7 วัน: นับถอยหลังก่อนวันเริ่ม + ทวง (เฉพาะที่ยังไม่ทำ) + หายไปไหน
  function oneShots() {
    const out = [], now = new Date(), t0 = today(), roast = S.tone === "roast";
    const add = (id, when, title, body) => { if (when > now) out.push({ id, title, body, schedule: { at: when, allowWhileIdle: true } }); };
    for (let k = 0; k < 7; k++) {
      const d = new Date(t0.getTime() + k * DAY), i = idx(d), l = S.logs[iso(d)] || {};
      if (i >= total()) break;
      if (i < 0) add(NAG_ID(d, 8), atTime(d, "21:00"),
        i === -1 ? (roast ? "พรุ่งนี้วันที่ 1 รอบนี้ห้ามเลื่อน" : "พรุ่งนี้วันที่ 1 แล้ว 🔥") : roast ? `อีก ${-i} วันเริ่ม ข้ออ้างหมดแล้วนะ` : `อีก ${-i} วันเริ่ม เตรียมตัวกัน 💪`,
        i === -1 ? `คืนนี้เตรียมตาชั่ง สายวัด นอน ${BED} · พรุ่งนี้ ${morningOf(START).wake} ชั่ง + วัดเอว/คอ + ถ่ายรูป ก่อนกินดื่ม` : "เตรียมให้พร้อมก่อนวันแรก: ตาชั่ง สายวัด อกไก่ ไข่ ผัก · ลองกดทุกปุ่มในแอปได้เลย");
      if (S.nag === false) continue;
      // ก่อนวันเริ่มทวงแค่เรื่องนอนคืนก่อนวันแรก
      NAGS.forEach((n, j) => { if ((i >= 0 || (i === -1 && j === NAGS.length - 1)) && !n.done(l)) add(NAG_ID(d, j), atTime(d, n.at(d)), nagTitle(n), n.body); });
    }
    if (S.nag !== false) AWAY.forEach(([n, t, rt, st, body], j) => add(900001 + j, atTime(new Date(t0.getTime() + n * DAY), t), roast ? rt : st, body));
    return out;
  }
  async function scheduleNative(ask = true) {
    const LN = native(); if (!LN) return false;
    try {
      const perm = await (ask ? LN.requestPermissions() : LN.checkPermissions()); if (perm.display !== "granted") return false;
      const pending = await LN.getPending(); if (pending.notifications?.length) await LN.cancel(pending);
      const list = []; let id = 1;
      const WD = { SA: [7], SU: [1], WE: [1, 7], weekday: [2, 3, 4, 5, 6] };
      REMINDERS.forEach((r) => {
        if (S.rem[r.id] === false) return;
        r.time.split(",").forEach((t) => {
          const [hour, minute] = t.split(":").map(Number);
          // แต่ละวันได้คำพูดโค้ชคนละประโยค
          const one = (on) => list.push({ id: id++, title: coachTitle(r.id), body: r.msg, schedule: { on: { ...on, hour, minute }, repeats: true, allowWhileIdle: true } });
          if (r.days === "daily") one({});
          else if (r.days === "M1") one({ day: 1 });
          else WD[r.days].forEach((weekday) => one({ weekday }));
        });
      });
      list.push(...oneShots());
      await LN.schedule({ notifications: list });
      nagOff = new Set(); S.notifDay = iso(today()); save();
      return list.length;
    } catch (e) { return false; }
  }
  // ทำแล้ว = ยกเลิกการทวงของวันนี้ (เรียกจาก save ทุกครั้ง)
  function syncNags() {
    const LN = native(); if (!LN || S.nag === false) return;
    const d = today(), l = S.logs[iso(d)] || {};
    const ids = NAGS.map((n, j) => (n.done(l) ? NAG_ID(d, j) : null)).filter((x) => x != null && !nagOff.has(x));
    if (!ids.length) return;
    ids.forEach((x) => nagOff.add(x));
    LN.cancel({ notifications: ids.map((id) => ({ id })) }).catch(() => {});
  }
  // วันละครั้งตอนเปิดแอป: สุ่มคำพูดใหม่ เลื่อนทวง 7 วัน และดัน "หายไปไหน" ออกไป
  let notifTry = "";
  function reschedDaily() { const k = iso(today()); if (native() && S.notifDay !== k && notifTry !== k) { notifTry = k; scheduleNative(false); } }

  async function startWorkout(key) {
    try {
      const { openWorkout } = await import("./workout.js");
      openWorkout({ sessionKey: key, phase: plan(today()).phase, deload: plan(today()).deload, onFinish: (done) => { renderTrain(); refresh(); if (done) setTimeout(() => show("today"), 400); } });
    } catch (e) { toast("เปิดโหมดเล่นเวทไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่"); }
  }
  $("startBtn").addEventListener("click", () => startWorkout($("sessionPick").value || plan(today()).session));
  function renderWkHistory() {
    const rows = Object.keys(S.logs).sort().reverse().flatMap((k) => (S.logs[k].workouts || []).map((w) => ({ date: k, ...w }))).slice(0, 8);
    const box = $("wkHistory"); box.hidden = !rows.length;
    if (!rows.length) return;
    const fmtT = (s) => `${Math.floor(s / 60)} นาที`;
    box.innerHTML = `<h2>เวิร์กเอาต์ล่าสุด</h2><div class="tbl"><table><tbody>${rows.map((w) => `<tr><td class="num">${w.date.slice(5)}</td><td>${w.deload ? "🔋 " : ""}${SESSIONS[w.session]?.name || w.session}</td><td class="num">${fmtT(w.dur)}</td><td class="num">${w.sets} เซ็ต</td><td class="num">${fmt(w.vol)} กก.</td><td>${w.prs?.length ? "🏆" + w.prs.length : ""}</td></tr>`).join("")}</tbody></table></div>`;
  }
  $("barKg").value = S.barKg ?? "";
  $("barKg").addEventListener("change", () => { S.barKg = Number($("barKg").value) || 10; save(); toast("บันทึกน้ำหนักบาร์แล้ว"); });
  // ปุ่มเดียวจบเซสชัน: ติ๊กทุกท่า ใช้น้ำหนัก/ครั้งจากครั้งก่อนถ้าไม่ได้กรอก
  $("finishBtn").addEventListener("click", () => {
    const pick = $("sessionPick").value || plan(today()).session; if (!pick) return;
    const dk = iso(today()), l = todayLog(), lifts = (l.lifts = l.lifts || {});
    SESSIONS[pick].items.forEach(([id]) => {
      const cur = (lifts[id] = lifts[id] || {}), prev = lastLift(id, dk);
      if (cur.w == null && prev?.w != null) cur.w = prev.w;
      if (cur.r == null && prev?.r != null) cur.r = prev.r;
      cur.done = true;
      if (!cur.sets?.length) cur.sets = [{ w: cur.w ?? null, r: cur.r ?? null, done: true }]; else cur.sets.forEach((s) => (s.done = true));
    });
    if (pick === "P") l.posture = true; else l.workout = true;
    save(); renderTrain(); refresh();
    celebrate(pick === "P" ? "บุคลิกดีขึ้นทุกวัน 👍" : "จบเซสชันแล้ว เก่งมาก 💪");
    setTimeout(() => show("today"), 900);
  });

  $("exList").addEventListener("change", (ev) => {
    const card = ev.target.closest(".ex"); if (!card) return;
    const dk = iso(today()), id = card.dataset.id;
    const log = (S.logs[dk] = S.logs[dk] || {});
    const lifts = (log.lifts = log.lifts || {});
    const l = (lifts[id] = lifts[id] || {});
    const f = ev.target.dataset.f;
    if (f === "done") l.done = ev.target.checked; else l[f] = ev.target.value === "" ? null : Number(ev.target.value);
    card.classList.toggle("done", !!l.done);
    const items = SESSIONS[$("sessionPick").value || plan(today()).session]?.items || [];
    if (items.length && items.every(([x]) => lifts[x]?.done)) { log.workout = true; celebrate("จบเซสชันแล้ว เก่งมาก 💪"); }
    save(); renderHero(); renderChips();
  });

  // ---------- money ----------
  $("m-date").value = iso(today());
  $("passiveMonthly").value = S.passiveMonthly || "";
  $("passiveMonthly").addEventListener("change", () => { S.passiveMonthly = Number($("passiveMonthly").value) || 0; save(); renderMoney(); });
  $("moneyForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const amt = Number($("m-amount").value); if (!amt) return;
    S.money.push({ id: Date.now().toString(36), date: $("m-date").value, type: $("m-type").value, amount: Math.abs(amt), note: $("m-note").value.trim() });
    save(); $("m-amount").value = ""; $("m-note").value = ""; renderMoney(); toast("เพิ่มรายการแล้ว");
  });
  $("moneyList").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-del]"); if (!b) return;
    if (b.dataset.armed) { S.money = S.money.filter((m) => m.id !== b.dataset.del); save(); renderMoney(); }
    else { b.dataset.armed = "1"; b.textContent = "ยืนยันลบ"; }
  });
  const TYPE = { save: "ออม", invest: "ลงทุน", side: "งานเสริม", passive: "passive", withdraw: "ถอน" };

  function renderMoney() {
    const total = S.money.reduce((a, m) => a + (m.type === "withdraw" ? -m.amount : m.amount), 0);
    const pct = Math.max(0, Math.min(1, total / SAVE_GOAL));
    $("saveBar").style.width = (pct * 100).toFixed(1) + "%";
    const t = today();
    const monthsLeft = Math.max(1, (GOAL_END.getFullYear() - t.getFullYear()) * 12 + GOAL_END.getMonth() - t.getMonth());
    const need = Math.max(0, SAVE_GOAL - total) / monthsLeft;
    const ym = iso(t).slice(0, 7);
    const sideThis = S.money.filter((m) => m.type === "side" && m.date.startsWith(ym)).reduce((a, m) => a + m.amount, 0);
    const p = plan(t);
    const sideTarget = p.month <= 3 ? 2000 : p.month <= 6 ? 5000 : 8000;
    $("moneyStats").innerHTML =
      `<div class="stat ${pct >= Math.max(0, idx(t)) / 365 ? "good" : "warn"}"><span class="eyebrow">เก็บแล้ว</span><b>${fmt(total)}</b><span class="small muted">${(pct * 100).toFixed(0)}% ของ 100,000</span></div>` +
      `<div class="stat"><span class="eyebrow">ต้องเก็บต่อเดือน</span><b>${fmt(need)}</b><span class="small muted">อีก ${monthsLeft} เดือน</span></div>` +
      `<div class="stat ${sideThis >= sideTarget ? "good" : sideThis >= sideTarget / 2 ? "warn" : "bad"}"><span class="eyebrow">งานเสริมเดือนนี้</span><b>${fmt(sideThis)}</b><span class="small muted">เป้าเดือนนี้ ${fmt(sideTarget)}</span></div>`;
    const perDay = (S.passiveMonthly || 0) / 30;
    $("passiveStats").innerHTML =
      `<div class="stat ${perDay >= PASSIVE_GOAL_DAY ? "good" : perDay >= 100 ? "warn" : ""}"><span class="eyebrow">ต่อวัน</span><b>${fmt(perDay)}</b><span class="small muted">เป้า 300/วัน = 9,000/เดือน</span></div>` +
      `<div class="stat"><span class="eyebrow">ถึงเป้าแล้ว</span><b>${Math.min(100, (perDay / PASSIVE_GOAL_DAY) * 100).toFixed(0)}%</b></div>`;
    const rows = [...S.money].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30);
    $("moneyList").innerHTML = rows.length ? rows.map((m) => `<tr><td class="num">${m.date.slice(5)}</td><td>${TYPE[m.type]}</td><td class="small muted">${esc(m.note)}</td><td class="num ${m.type === "withdraw" ? "no" : "ok"}">${m.type === "withdraw" ? "−" : "+"}${fmt(m.amount)}</td><td><button class="btn ghost small" style="padding:2px 8px" data-del="${m.id}">ลบ</button></td></tr>`).join("") : `<tr><td class="muted">ยังไม่มีรายการ เริ่มจากเงินออมเดือนนี้</td></tr>`;
  }

  // ---------- stats ----------
  let chartFull = false;
  $("chartToggle").addEventListener("click", () => { chartFull = !chartFull; renderStats(); });
  const entries = () => Object.keys(S.logs).sort().map((k) => ({ date: k, ...S.logs[k] }));
  function lastWeight() { const w = entries().filter((e) => e.weight != null); return w.length ? w[w.length - 1].weight : null; }

  function renderStats() {
    const es = entries(), ws = es.filter((e) => e.weight != null && idx(parse(e.date)) >= 0), t = today();
    // มุมมอง: ปีปัจจุบัน หรือทั้ง 2 ปี (ปี 1 ยาวขึ้นถ้ามีช่วงลดต่อ)
    const yr = plan(t).year, full = chartFull, e1 = y1End(), TT = total(), gw = goalW(), sw = startW();
    const d0 = full || yr === 1 ? 0 : e1, d1 = full ? TT : yr === 1 ? e1 : TT;
    const W = 640, H = 260, L = 44, R = 16, T = 14, B = 34;
    const goals = []; for (let d = d0; d <= d1; d += 5) goals.push(goalAt(d));
    const inView = ws.filter((e) => idx(parse(e.date)) >= d0 && idx(parse(e.date)) <= d1).map((e) => e.weight);
    const showGoal = full || yr === 1; // เส้นเป้าที่ตั้ง (เช่น 60 กก.) แสดงในมุมมองปี 1 และทั้ง 2 ปี
    const y0 = Math.floor((Math.min(...goals, ...inView, ...(showGoal ? [gw] : [])) - 3) / 2) * 2;
    const y1 = Math.ceil((Math.max(...goals, ...inView) + 3) / 2) * 2;
    const x = (i) => L + ((W - L - R) * (i - d0)) / (d1 - d0), y = (v) => T + ((H - T - B) * (y1 - v)) / (y1 - y0);
    let s = "";
    const step = y1 - y0 > 32 ? 8 : y1 - y0 > 16 ? 4 : 2;
    for (let v = y0; v <= y1; v += step) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">${v}</text>`;
    if (full) [[0, "เริ่ม", "start"], [e1, "ปี 1 จบ", "middle"], [TT, "ปี 2 จบ", "end"]].forEach(([d, label, anchor]) => (s += `<text x="${x(d)}" y="${H - 12}" text-anchor="${anchor}" font-size="11" fill="var(--muted)">${label}</text>`));
    else for (let m = 0; m <= 12; m += 3) s += `<text x="${x(d0 + (m * 365) / 12)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="var(--muted)">${m ? "เดือน " + (m + (yr - 1) * 12) : yr === 1 ? "เริ่ม" : "ปี " + yr}</text>`;
    if (showGoal) s += `<line x1="${L}" x2="${W - R}" y1="${y(gw)}" y2="${y(gw)}" stroke="var(--good)" stroke-width="1.5" stroke-dasharray="2 4"/><text x="${W - R}" y="${y(gw) - 6}" text-anchor="end" font-size="11" fill="var(--good)">เป้า ${fmt(gw, gw % 1 ? 1 : 0)} กก.</text>`;
    s += `<path d="${goals.map((g, i) => (i ? "L" : "M") + x(d0 + i * 5).toFixed(1) + " " + y(g).toFixed(1)).join(" ")}" fill="none" stroke="var(--target)" stroke-width="2" stroke-dasharray="6 5"/>`;
    const pts = [[0, sw], ...ws.map((e) => [Math.min(TT, idx(parse(e.date))), e.weight])].filter((p) => p[0] >= d0 && p[0] <= d1);
    if (pts.length > 1) s += `<path d="${pts.map((p, i) => (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1)).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>`;
    const lp = pts[pts.length - 1];
    if (lp) s += `<circle cx="${x(lp[0])}" cy="${y(lp[1])}" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>`;
    $("chart").innerHTML = s;
    $("chartToggle").textContent = full ? "ดูเฉพาะปีนี้" : "ดูทั้ง 2 ปี";

    const last = lastWeight(), tgtNow = goalAt(idx(t));
    const wk = es.filter((e) => (t - parse(e.date)) / DAY < 7 && e.steps != null);
    const avg = wk.length ? wk.reduce((a, e) => a + e.steps, 0) / wk.length : null;
    let streak = 0, d = new Date(t); if (!S.logs[iso(d)]) d = new Date(d - DAY);
    while (S.logs[iso(d)] && (S.logs[iso(d)].if || S.logs[iso(d)].workout)) { streak++; d = new Date(d - DAY); }
    const pt = plan(t).steps;
    $("bodyStats").innerHTML =
      `<div class="stat ${last == null ? "" : last <= tgtNow + 0.5 ? "good" : last <= tgtNow + 2 ? "warn" : "bad"}"><span class="eyebrow">ล่าสุด</span><b>${fmt(last, 1)}</b><span class="small muted">เป้าตอนนี้ ${fmt(tgtNow, 1)}</span></div>` +
      `<div class="stat ${last != null && last < sw ? "good" : ""}"><span class="eyebrow">จากวันแรก</span><b>${last == null ? "–" : (last <= sw ? "−" : "+") + fmt(Math.abs(sw - last), 1)}</b><span class="small muted">กก. · ${plan(t).modeTh}</span></div>` +
      `<div class="stat ${avg == null ? "" : avg >= pt ? "good" : avg >= pt * 0.8 ? "warn" : "bad"}"><span class="eyebrow">ก้าวเฉลี่ย 7 วัน</span><b>${fmt(avg)}</b><span class="small muted">เป้า ${fmt(pt)}</span></div>` +
      `<div class="stat ${streak >= 3 ? "good" : ""}"><span class="eyebrow">ต่อเนื่อง</span><b>${streak} วัน</b><span class="small muted">ห้ามพลาด 2 วันติด</span></div>`;
    const ck = (v) => `<span class="pill ${v ? "ok" : "no"}">${v ? "✓" : "✗"}</span>`;
    const kcal = (e) => (e.food?.length ? e.food.reduce((a, m) => a + m.items.reduce((b, i) => b + i.kcal, 0), 0) : null);
    $("history").innerHTML = es.slice(-30).reverse().map((e) => `<tr><td class="num">${e.date.slice(5)}</td><td class="num">${fmt(e.weight, 1)}</td><td class="num">${fmt(e.waist, 1)}</td><td class="num">${fmt(e.steps)}</td><td class="num">${fmt(kcal(e))}</td><td>${ck(e.if)}</td><td>${ck(e.protein)}</td><td>${ck(e.workout)}</td></tr>`).join("") || `<tr><td colspan="8" class="muted">ยังไม่มีบันทึก</td></tr>`;
  }

  // ---------- reminders ----------
  const dayText = { daily: "ทุกวัน", weekday: "จ–ศ", WE: "ส.–อา.", SA: "เสาร์", SU: "อาทิตย์", M1: "วันที่ 1 ทุกเดือน" };
  function notifSupported() { return "Notification" in window && "serviceWorker" in navigator; }
  function renderSettings() {
    const st = native() ? "แอป Android: แจ้งเตือนตามเวลาจริงแม้ปิดแอป (กดปุ่มด้านล่างถ้ายังไม่เด้ง)" : !notifSupported() ? "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน (iPhone ต้องติดตั้งลงหน้าจอโฮมก่อน)" :
      Notification.permission === "granted" ? "เปิดแล้ว: แอปจะเตือนตามเวลาขณะที่แอปยังเปิดค้างหรืออยู่เบื้องหลัง" :
      Notification.permission === "denied" ? "ถูกบล็อกไว้ ไปเปิดในการตั้งค่าเว็บไซต์ของเบราว์เซอร์" : "ยังไม่ได้เปิด";
    $("notifState").textContent = st;
    renderProfile();
    $("enableNotif").hidden = !native() && (!notifSupported() || Notification.permission === "granted");
    $("reminderList").innerHTML = REMINDERS.map((r) => `<label class="rem"><span class="t">${r.time.split(",")[0]}${r.time.includes(",") ? "+" : ""}</span><span class="m">${r.msg}<br><span class="small muted">${dayText[r.days]}${r.time.includes(",") ? " · " + r.time.replace(/,/g, ", ") : ""}</span></span><input type="checkbox" data-rem="${r.id}" ${S.rem[r.id] !== false ? "checked" : ""}></label>`).join("");
    $("toneChips").innerHTML = TONES.map(([k, t]) => `<button type="button" class="chip ${S.tone === k ? "on" : ""}" data-tone="${k}" aria-pressed="${S.tone === k}">${t}</button>`).join("");
    $("toneSample").innerHTML = `<b>${esc(coachTitle("train"))}</b><br>${esc(REMINDERS.find((r) => r.id === "train").msg)}`;
    $("nagOn").checked = S.nag !== false;
    if (document.activeElement !== $("whyIn")) $("whyIn").value = S.why || "";
  }
  $("reminderList").addEventListener("change", (ev) => { const id = ev.target.dataset.rem; if (id) { S.rem[id] = ev.target.checked; save(); scheduleNative(); } });
  $("toneChips").addEventListener("click", (e) => { const k = e.target.closest("[data-tone]")?.dataset.tone; if (!k) return; S.tone = k; save(); buzz(); renderSettings(); renderHero(); scheduleNative(); });
  $("toneSample").addEventListener("click", renderSettings); // แตะเพื่อสุ่มประโยคใหม่
  $("nagOn").addEventListener("change", () => { S.nag = $("nagOn").checked; save(); scheduleNative(); toast(S.nag ? "เปิดทวงแล้ว ไม่ทำ = โดน" : "ปิดทวงแล้ว"); });
  $("whyIn").addEventListener("change", () => { S.why = $("whyIn").value.trim().slice(0, 60); save(); renderSettings(); scheduleNative(); toast(S.why ? "โค้ชจำไว้แล้ว จะเอามาทวงตอนขี้เกียจ" : "ลบเหตุผลแล้ว"); });
  $("enableNotif").addEventListener("click", async () => {
    if (native()) { const n = await scheduleNative(); toast(n ? `ตั้งแจ้งเตือนในเครื่องแล้ว ${n} รายการ` : "ไม่ได้รับอนุญาต เปิดในการตั้งค่าแอป"); renderSettings(); return; }
    const p = await Notification.requestPermission(); renderSettings(); if (p === "granted") notify("เปิดแจ้งเตือนแล้ว", "Coach 365 จะเตือนตามตาราง");
  });
  if (native()) scheduleNative();
  $("testNotif").addEventListener("click", async () => {
    const title = coachTitle("train"), body = "ตัวอย่างสไตล์โค้ชที่เลือก · ถ้าเห็นข้อความนี้ แสดงว่าแจ้งเตือนใช้ได้", LN = native();
    if (LN) {
      try { await LN.schedule({ notifications: [{ id: 999999, title, body, schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true } }] }); toast("อีก 3 วินาทีจะเด้ง"); }
      catch (e) { toast("ยังไม่ได้รับอนุญาต กด \"เปิดการแจ้งเตือน\" ก่อน"); }
      return;
    }
    if (notifSupported() && Notification.permission === "granted") notify(title, body); else toast(`ยังไม่ได้เปิดแจ้งเตือน · ตัวอย่าง: ${title}`);
  });

  async function notify(title, body) {
    try { const reg = await navigator.serviceWorker.ready; reg.showNotification(title, { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: title }); }
    catch (e) { try { new Notification(title, { body }); } catch (e2) {} }
  }
  function dueToday(r, d) {
    const wd = d.getDay();
    return r.days === "daily" || (r.days === "weekday" && wd >= 1 && wd <= 5) || (r.days === "WE" && (wd === 0 || wd === 6)) || (r.days === "SA" && wd === 6) || (r.days === "SU" && wd === 0) || (r.days === "M1" && d.getDate() === 1);
  }
  function tick() {
    if (!notifSupported() || Notification.permission !== "granted") return;
    const now = new Date(), hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`, dk = iso(now);
    REMINDERS.forEach((r) => {
      if (S.rem[r.id] === false || !dueToday(r, now)) return;
      r.time.split(",").forEach((t) => {
        const key = r.id + "@" + t;
        if (t <= hm && hm < addMin(t, 10) && S.fired[key] !== dk) { S.fired[key] = dk; save(); notify(coachTitle(r.id), r.msg); }
      });
    });
    // ทวง (เว็บ): เด้งได้เฉพาะตอนแอปเปิดค้าง/อยู่เบื้องหลัง
    const i = idx(today()), l = S.logs[dk] || {};
    if (S.nag !== false) NAGS.forEach((n, j) => {
      const t = n.at(now), key = "nag" + j;
      if ((i >= 0 || (i === -1 && j === NAGS.length - 1)) && t <= hm && hm < addMin(t, 10) && S.fired[key] !== dk && !n.done(l)) { S.fired[key] = dk; save(); notify(nagTitle(n), n.body); }
    });
  }
  setInterval(tick, 30000); tick();

  // ---------- .ics ----------
  function buildICS() {
    const byday = { daily: "", weekday: ";BYDAY=MO,TU,WE,TH,FR", WE: ";BYDAY=SA,SU", SA: ";BYDAY=SA", SU: ";BYDAY=SU" };
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Coach365//TH", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Coach 365", "X-WR-TIMEZONE:Asia/Bangkok",
      "BEGIN:VTIMEZONE", "TZID:Asia/Bangkok", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0700", "TZOFFSETTO:+0700", "TZNAME:ICT", "END:STANDARD", "END:VTIMEZONE"];
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const startDay = today() > START ? today() : START, endDay = new Date(START.getTime() + (total() - 1) * DAY);
    const until = `${endDay.getFullYear()}${pad(endDay.getMonth() + 1)}${pad(endDay.getDate())}T235959Z`;
    REMINDERS.filter((r) => S.rem[r.id] !== false).forEach((r) => {
      r.time.split(",").forEach((t) => {
        const rule = r.days === "M1" ? "FREQ=MONTHLY;BYMONTHDAY=1" : "FREQ=" + (r.days === "daily" ? "DAILY" : "WEEKLY") + byday[r.days];
        const ds = `${startDay.getFullYear()}${pad(startDay.getMonth() + 1)}${pad(startDay.getDate())}T${t.replace(":", "")}00`;
        L.push("BEGIN:VEVENT", `UID:coach365-${r.id}-${t.replace(":", "")}@coach365`, `DTSTAMP:${stamp}`, `DTSTART;TZID=Asia/Bangkok:${ds}`, "DURATION:PT10M",
          `RRULE:${rule};UNTIL=${until}`, `SUMMARY:${r.msg}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${r.msg}`, "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
      });
    });
    L.push("END:VCALENDAR");
    return L.join("\r\n");
  }
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  $("icsBtn").addEventListener("click", () => { download("coach365-reminders.ics", buildICS(), "text/calendar"); toast("ดาวน์โหลดแล้ว เปิดไฟล์เพื่อเพิ่มลงปฏิทิน"); });

  // ---------- backup ----------
  const backupJson = () => JSON.stringify({ ...S, ai: { model: S.ai?.model } });
  $("exportJson").addEventListener("click", () => { download(`coach365-backup-${iso(today())}.json`, backupJson(), "application/json"); S.lastBackup = iso(today()); save(); renderBackup(); refresh(); });
  // สำรองอัตโนมัติ (แอป Android): วันละครั้งลง Documents/Coach365 ไฟล์ละสัปดาห์ (ลบแอปแล้วไฟล์ยังอยู่ กู้คืนด้วยปุ่มนำเข้า)
  function FSP() { return window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.Filesystem : null; }
  async function autoBackup() {
    const FS = FSP(), k = iso(today()); if (!FS || S.lastBackup === k) return;
    const mon = new Date(today().getTime() - ((today().getDay() + 6) % 7) * DAY), name = `Coach365/coach365-backup-${iso(mon)}`;
    try {
      await FS.mkdir({ path: "Coach365", directory: "DOCUMENTS", recursive: true }).catch(() => {});
      S.lastBackup = k; S.backupErr = null; save();
      const data = backupJson(), w = (path) => FS.writeFile({ path, data, directory: "DOCUMENTS", encoding: "utf8" });
      // ไฟล์ของสัปดาห์นี้อาจสร้างโดยแอปก่อนลงใหม่ (เขียนทับไม่ได้) → ใช้ชื่อใหม่
      await w(name + ".json").catch(() => w(`${name}-${Date.now().toString(36)}.json`));
    } catch (e) { S.lastBackup = null; S.backupErr = String(e?.message || e).slice(0, 120); save(); }
    renderBackup();
  }
  function renderBackup() {
    const d = S.lastBackup ? Math.round((today() - parse(S.lastBackup)) / DAY) : null;
    $("backupState").innerHTML = FSP() ? (S.backupErr ? `⚠️ สำรองอัตโนมัติไม่สำเร็จ (${esc(S.backupErr)}) กดส่งออกเองไปก่อน` : `✅ สำรองอัตโนมัติทุกวันที่ <b>Documents/Coach365</b> ล่าสุด ${S.lastBackup ? S.lastBackup.slice(5) : "–"} · ลงแอปใหม่ กด "นำเข้า" แล้วเลือกไฟล์ล่าสุด`)
      : d == null || d >= 7 ? `⚠️ ${d == null ? "ยังไม่เคยสำรอง" : `สำรองล่าสุด ${d} วันก่อน`} กด "ส่งออก (JSON)" แล้วเก็บไฟล์ไว้ใน Drive/LINE` : `✅ สำรองล่าสุด ${d === 0 ? "วันนี้" : `${d} วันก่อน`}`;
  }

  // ---------- AI key ----------
  // AI ประเมินอาหาร: Gemini (ค่าเริ่ม มีโควตาฟรี) หรือ Claude · key แยกตามเจ้า เก็บในเครื่องเท่านั้น
  const MODEL_UP = { "claude-opus-5": "claude-opus-5-5", "claude-sonnet-5": "claude-sonnet-5-5" };
  const aiProvider = (m = S.ai?.model) => (String(m || "gemini").startsWith("claude") ? "claude" : "gemini");
  const aiKey = () => { const p = aiProvider(); return S.ai?.keys?.[p] || (p === "claude" ? S.ai?.key : "") || ""; };
  S.ai = S.ai || {}; S.ai.keys = S.ai.keys || {};
  if (S.ai.key && !S.ai.keys.claude) S.ai.keys.claude = S.ai.key; delete S.ai.key;
  if (MODEL_UP[S.ai.model]) S.ai.model = MODEL_UP[S.ai.model];
  if (!S.ai.model || (aiProvider() === "claude" && !S.ai.keys.claude)) S.ai.model = "gemini-flash-latest";
  save();
  function renderAi() {
    const p = aiProvider($("aiModel").value);
    $("aiKey").value = S.ai.keys[p] || ""; $("aiKey").placeholder = p === "gemini" ? "AIza..." : "sk-ant-...";
    $("aiHow").innerHTML = p === "gemini"
      ? `สร้าง key ฟรีที่ <b>aistudio.google.com/apikey</b> (ล็อกอิน Google → Create API key) แล้ววางที่นี่ ใช้ฟรีได้วันละหลายสิบรูป · รูปจะถูกส่งไปที่ Google (โควตาฟรี Google อาจใช้ข้อมูลไปปรับปรุงบริการ)`
      : `สร้าง key ที่ console.anthropic.com (ต้องเติมเครดิต) แล้ววางที่นี่`;
  }
  $("aiModel").value = S.ai.model; renderAi();
  $("aiModel").addEventListener("change", () => { S.ai.model = $("aiModel").value; save(); renderAi(); });
  $("aiSave").addEventListener("click", () => { S.ai.model = $("aiModel").value; S.ai.keys[aiProvider()] = $("aiKey").value.trim(); save(); toast(aiKey() ? "บันทึก API key แล้ว ลองถ่ายรูปอาหารได้เลย" : "บันทึกแล้ว"); });
  $("aiClear").addEventListener("click", () => { delete S.ai.keys[aiProvider()]; $("aiKey").value = ""; save(); toast("ลบ key แล้ว"); });
  $("exportCsv").addEventListener("click", () => {
    const head = ["date", "weight", "waist", "neck", "steps", "sleepH", "bedAt", "meditateMin", "spend", ...CHECKS.map((c) => c[0]), "note"];
    const rows = entries().map((e) => head.map((h) => (h === "note" ? `"${String(e.note || "").replace(/"/g, '""')}"` : e[h] ?? "")).join(","));
    download(`coach365-logs-${iso(today())}.csv`, "﻿" + [head.join(","), ...rows].join("\n"), "text/csv");
  });
  $("importJson").addEventListener("change", async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try { const d = JSON.parse(await f.text()); if (!d.logs) throw 0; const keys = S.ai?.keys; S = Object.assign(def(), d); S.ai = { model: d.ai?.model || S.ai?.model, keys: keys || {} }; normalize(); save(); renderProfile(); renderAll(); toast("นำเข้าข้อมูลแล้ว"); }
    catch (e) { toast("ไฟล์ไม่ถูกต้อง ใช้ไฟล์ที่ส่งออกจากแอปนี้"); }
    ev.target.value = "";
  });

  // ---------- ข้อมูลร่างกาย (แท็บตั้งค่า) ----------
  const PROF = ["height", "age", "goalW", "goalBf", "startW"];
  function renderProfile() {
    PROF.forEach((k) => { if (document.activeElement !== $("p-" + k)) $("p-" + k).value = S.profile[k] ?? ""; });
    const T = plan(today()).target;
    $("p-info").innerHTML = `ร่างกายใช้พลังงานวันละประมาณ <b class="num">${fmt(T.tdee)}</b> kcal (ที่ ${fmt(trendWeight() ?? startW(), 1)} กก.) · เป้าวันนี้ <b class="num">${fmt(T.kcal)}</b> kcal / โปรตีน ${T.protein} ก.`
      + (S.kcalAdj ? ` · ปรับจากผลจริงแล้ว ${S.kcalAdj > 0 ? "+" : ""}${S.kcalAdj} kcal <button class="btn ghost small" type="button" id="adjReset">กลับไปใช้ค่าคำนวณ</button>` : "")
      + (S.profile.height ? "" : `<br><b>ยังไม่ได้ใส่ส่วนสูง</b> ตอนนี้ใช้ค่ากลาง 170 ซม. / 25 ปี`);
  }
  document.querySelector('[data-view="settings"]').addEventListener("change", (e) => {
    const k = e.target.id?.startsWith("p-") && e.target.id.slice(2); if (!PROF.includes(k)) return;
    const v = Number(e.target.value), ok = e.target.value !== "" && Number.isFinite(v) && v > 0;
    S.profile[k] = ok ? v : def().profile[k];
    save(); renderProfile(); refresh(); toast("บันทึกข้อมูลร่างกายแล้ว");
  });
  $("p-info").addEventListener("click", (e) => { if (e.target.id === "adjReset") { S.kcalAdj = 0; save(); renderProfile(); refresh(); toast("กลับไปใช้แคลอรี่ที่คำนวณแล้ว"); } });

  function renderAll() { renderHeader(); renderToday(); renderMoney(); renderStats(); renderSchedule(); renderProfile(); refresh(); }
  // แอปค้างในพื้นหลังข้ามคืน: พอเปิดกลับมาให้ฟอร์มวันที่เป็นวันนี้ (ไม่งั้นจะบันทึกลงเมื่อวาน)
  let shownDay = iso(today());
  function rollover() {
    const k = iso(today()); if (k === shownDay) return;
    shownDay = k; ["logDate", "foodDate", "m-date"].forEach((id) => ($(id).value = k));
    renderAll(); window.Food?.render();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { rollover(); applyWidgetPending(); reschedDaily(); } });
  setInterval(() => { rollover(); renderSchedule(); renderHero(); applyWidgetPending(); pushWidget(); reschedDaily(); }, 60000);
  renderAll(); applyWidgetPending(); renderBackup(); autoBackup();
  window.Coach = { get S() { return S; }, aiKey, aiProvider, save, iso, today, toast, fmt, esc, START, weekIdx, waterGoal, pushWidget, addMeal, afterMeal, closeKitchen, plannedMeal, refresh, celebrate, plan, goalAt, PHASES, DIET_BREAKS,
    total, y1End, startW, goalW, trendWeight, lastWeight, targetFor, show, renderProfile };
  const fromHash = () => { const h = location.hash.slice(1); if (["today", "food", "train", "money", "settings"].includes(h)) show(h); };
  addEventListener("hashchange", fromHash); addEventListener("DOMContentLoaded", fromHash);

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
