import React, { useEffect, useMemo, useState, useCallback } from "react";

/* ========= Firebase (modular) ========= */
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

/* =========================================================
   FIREBASE CONFIG (keeps your original fallbacks)
========================================================= */
const LOCAL_FALLBACK = {
  apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
  authDomain: "attending-schedule-2026.firebaseapp.com",
  projectId: "attending-schedule-2026",
  storageBucket: "attending-schedule-2026.firebasestorage.app",
  messagingSenderId: "777996986623",
  appId: "1:777996986623:web:0a8697cccb63149d9744ca",
  measurementId: "G-TJXCM9P7W2",
};
const firebaseConfig = (() => {
  try {
    if (typeof __firebase_config !== "undefined" && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch {}
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG) {
    return window.FALLBACK_FIREBASE_CONFIG;
  }
  return LOCAL_FALLBACK;
})();
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v13.0";

/* =========================================================
   CONSTANTS + DATA
========================================================= */
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA" };
const MODES = { CAL: "Calendar", QA: "QuickAdd", RB: "RankBoard", DB: "DragBuckets" };

/* ATTENDINGS (from your snippet) */
const ATTENDINGS = [
  { name: "Ambal",    email: "nambalav@uab.edu" },
  { name: "Arora",    email: "nitinarora@uabmc.edu" },
  { name: "Bhatia",   email: "ksbhatia@uabmc.edu" },
  { name: "Boone",    email: "boone@uabmc.edu" },
  { name: "Carlo",    email: "wcarlo@uabmc.edu" },
  { name: "Jain",     email: "viraljain@uabmc.edu" },
  { name: "Kandasamy",email: "jkandasamy@uabmc.edu" },
  { name: "Kane",     email: "akane@uabmc.edu" },
  { name: "Mackay",   email: "mackay@uabmc.edu" },
  { name: "Schuyler", email: "aschuyler@uabmc.edu" },
  { name: "Shukla",   email: "vshukla@uabmc.edu" },
  { name: "Sims",     email: "bsims@uabmc.edu" },
  { name: "Travers",  email: "cptravers@uabmc.edu" },
  { name: "Willis",   email: "kentwillis@uabmc.edu" },
  { name: "Winter",   email: "lwinter@uabmc.edu" },
  { name: "Salas",    email: "asalas@uabmc.edu" },
  { name: "Lal",      email: "clal@uabmc.edu" },
  { name: "Vivian",   email: "vvalcarceluaces@uabmc.edu" },
];

/* Saturdays of 2026 (your provided structure) */
const months = {
  "01": [
    { day: "10",       date: "2026-01-10", rni: null,      coa: null },
    { day: "17-19",    date: "2026-01-17", rni: null,      coa: null, detail: "MLK Day" },
    { day: "24",       date: "2026-01-24", rni: null,      coa: null },
    { day: "31",       date: "2026-01-31", rni: null,      coa: null },
  ],
  "02": [
    { day: "7",        date: "2026-02-07", rni: "Boone",   coa: null },
    { day: "14",       date: "2026-02-14", rni: "Boone",   coa: null },
    { day: "21",       date: "2026-02-21", rni: "Willis",  coa: null },
    { day: "28",       date: "2026-02-28", rni: "Willis",  coa: null },
  ],
  "03": [
    { day: "7",        date: "2026-03-07", rni: "Ambal",   coa: "Arora", isTaken: true },
    { day: "14",       date: "2026-03-14", rni: null,      coa: "Winter" },
    { day: "21",       date: "2026-03-21", rni: "Ambal",   coa: "Arora", isTaken: true },
    { day: "28",       date: "2026-03-28", rni: null,      coa: "Arora" },
  ],
  "04": [
    { day: "4",        date: "2026-04-04", rni: "Sims",    coa: null },
    { day: "11",       date: "2026-04-11", rni: null,      coa: null },
    { day: "18",       date: "2026-04-18", rni: "Sims",    coa: null },
    { day: "25",       date: "2026-04-25", rni: null,      coa: null, detail: "PAS Meeting Coverage" },
  ],
  "05": [
    { day: "2",        date: "2026-05-02", rni: null,      coa: null },
    { day: "9",        date: "2026-05-09", rni: "Arora",   coa: null },
    { day: "16",       date: "2026-05-16", rni: "Arora",   coa: null },
    { day: "23-25",    date: "2026-05-23", rni: null,      coa: null, detail: "Memorial Day" },
    { day: "30",       date: "2026-05-30", rni: "Arora",   coa: null },
  ],
  "06": [
    { day: "6",        date: "2026-06-06", rni: "Schuyler", coa: "Winter", isTaken: true },
    { day: "13",       date: "2026-06-13", rni: "Boone",    coa: null },
    { day: "19-21",    date: "2026-06-19", rni: "Schuyler", coa: "Winter", isTaken: true, detail: "Juneteenth Day" },
    { day: "27",       date: "2026-06-27", rni: "Boone",    coa: null },
  ],
  "07": [
    { day: "4-6",      date: "2026-07-04", rni: "Jain",     coa: "Carlo", isTaken: true, detail: "4th of July" },
    { day: "11",       date: "2026-07-11", rni: null,       coa: "Willis" },
    { day: "18",       date: "2026-07-18", rni: null,       coa: null },
    { day: "25",       date: "2026-07-25", rni: "Shukla",   coa: "Willis", isTaken: true },
  ],
  "08": [
    { day: "1",        date: "2026-08-01", rni: "Boone",    coa: null },
    { day: "8",        date: "2026-08-08", rni: "Sims",     coa: "Carlo", isTaken: true },
    { day: "15",       date: "2026-08-15", rni: "Boone",    coa: null },
    { day: "22",       date: "2026-08-22", rni: "Sims",     coa: null },
    { day: "29",       date: "2026-08-29", rni: null,       coa: "Carlo" },
  ],
  "09": [
    { day: "5-7",      date: "2026-09-05", rni: "Mackay",   coa: null, detail: "Labor Day" },
    { day: "12",       date: "2026-09-12", rni: null,       coa: null },
    { day: "19",       date: "2026-09-19", rni: null,       coa: null },
    { day: "26",       date: "2026-09-26", rni: null,       coa: null },
  ],
  "10": [
    { day: "3",        date: "2026-10-03", rni: "Kandasamy", coa: "Carlo",  isTaken: true },
    { day: "10",       date: "2026-10-10", rni: "Travers",   coa: "Bhatia", isTaken: true },
    { day: "17",       date: "2026-10-17", rni: "Kandasamy", coa: null },
    { day: "24",       date: "2026-10-24", rni: "Travers",   coa: "Bhatia", isTaken: true },
    { day: "31",       date: "2026-10-31", rni: "Kandasamy", coa: "Carlo",  isTaken: true },
  ],
  "11": [
    { day: "7",        date: "2026-11-07", rni: "Ambal",   coa: null },
    { day: "14",       date: "2026-11-14", rni: "Bhatia",  coa: null },
    { day: "21",       date: "2026-11-21", rni: "Ambal",   coa: null },
    { day: "26-28",    date: "2026-11-26", rni: "Bhatia",  coa: null, detail: "Thanksgiving" },
  ],
  "12": [
    { day: "5",        date: "2026-12-05", rni: "Travers",   coa: "Kandasamy", isTaken: true },
    { day: "12",       date: "2026-12-12", rni: null,        coa: null },
    { day: "19",       date: "2026-12-19", rni: "Travers",   coa: "Kandasamy", isTaken: true },
    { day: "24-28",    date: "2026-12-24", rni: "Bhatia",    coa: "Arora",     isTaken: true, detail: "Christmas" },
    { day: "31-Jan 4", date: "2026-12-31", rni: "Kane",      coa: "Kandasamy", isTaken: true, detail: "New Year’s Eve" },
  ],
};
const MONTH_KEYS  = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* =========================================================
   PURE HELPERS — rank compression + conflict guards
========================================================= */
const compressRanks = (list) =>
  [...list].sort((a,b)=>(a.rank??999)-(b.rank??999)).map((x,i)=>({...x, rank: i+1}));

const hasDate = (list, date) => list.some(x => x.date === date);
const hasDateService = (list, date, service) => list.some(x => x.date === date && x.service === service);

function getAvailableServicesForDate(date) {
  for (const mk of MONTH_KEYS) {
    const d = months[mk].find(x => x.date === date);
    if (d) {
      const out = [];
      if (!d.rni) out.push(SERVICES.RNI);
      if (!d.coa) out.push(SERVICES.COA);
      return out;
    }
  }
  return [SERVICES.RNI, SERVICES.COA]; // default allow if unknown
}

/* =========================================================
   UI atoms
========================================================= */
const Pill = ({ children }) => (
  <span className="px-2 py-0.5 rounded-full bg-slate-100 border text-slate-700 text-xs mr-1">{children}</span>
);

const Section = ({ title, right, children }) => (
  <section className="mb-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</h3>
      {right}
    </div>
    <div className="rounded-xl border bg-white p-3 shadow-sm">{children}</div>
  </section>
);

/* =========================================================
   MAIN APP
========================================================= */
export default function App() {
  // Firebase
  const app  = useMemo(() => initializeApp(firebaseConfig), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db   = useMemo(() => getFirestore(app), [app]);

  // Anonymous auth
  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUid(u.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  // Name gate
  const [me, setMe] = useState("");
  const selected = ATTENDINGS.find(a => a.name === me) || null;

  // Global UI
  const [mode, setMode] = useState(MODES.CAL);
  const [most, setMost] = useState([]);   // [{date, service, rank}]
  const [least, setLeast] = useState([]); // same shape

  /* ------------ Central guard: applied by ALL modes ------------- */
  const blockIfConflicts = useCallback((target, date, service) => {
    // Rule A: same date cannot exist in BOTH lists, regardless of service
    if (target === "most"  && hasDate(least, date)) return { ok:false, msg:"That weekend is already in Least." };
    if (target === "least" && hasDate(most,  date)) return { ok:false, msg:"That weekend is already in Most." };

    // Rule B: inside a single list, RNI and COA are mutually exclusive for the same weekend
    const bucket = target === "most" ? most : least;
    if (bucket.some(x => x.date === date && x.service !== service)) {
      return { ok:false, msg:"RNI and COA are mutually exclusive on the same weekend within a list." };
    }

    // Rule C: no duplicates (same date+service) within a list
    if (hasDateService(bucket, date, service)) return { ok:false, msg:"Already added." };

    return { ok:true };
  }, [most, least]);

  /* ------------ Central add/remove with rank compression ---------- */
  const nextRank = (list) => list.length ? Math.max(...list.map(x => x.rank ?? 0)) + 1 : 1;

  const addTo = useCallback((target, date, serviceMaybe) => {
    const available = getAvailableServicesForDate(date);
    const service = serviceMaybe || (available.length === 1 ? available[0] : null);
    if (!service) return { ok:false, msg:"Pick a service (RNI or COA)." };

    const guard = blockIfConflicts(target, date, service);
    if (!guard.ok) return guard;

    const push = (list) => compressRanks([...list, { date, service, rank: nextRank(list) }]);
    if (target === "most") setMost(prev => push(prev));
    else setLeast(prev => push(prev));

    return { ok:true };
  }, [blockIfConflicts]);

  const removeFrom = useCallback((target, date, service) => {
    const rm = (list) => compressRanks(list.filter(x => !(x.date === date && x.service === service)));
    if (target === "most") setMost(prev => rm(prev));
    else setLeast(prev => rm(prev));
  }, []);

  const clearAll = () => { setMost([]); setLeast([]); };

  /* ------------ Save/Submit ------------- */
  const submit = async () => {
    if (!selected) { alert("Pick your name first."); return; }
    const payload = {
      appId, year: YEAR, who: selected.name, email: selected.email,
      most: compressRanks(most),
      least: compressRanks(least),
      ts: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "prefs", `${YEAR}-${selected.name}`), payload);
      alert("Saved.");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  /* ------------ Shared Live Preview (always visible) ------------- */
  const Preview = () => (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <h4 className="font-semibold mb-1">Most preferred</h4>
        <ol className="space-y-1">
          {compressRanks(most).map(x => (
            <li key={`m-${x.date}-${x.service}`} className="flex items-center justify-between">
              <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
              <button className="text-xs text-rose-600" onClick={() => removeFrom("most", x.date, x.service)}>remove</button>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h4 className="font-semibold mb-1">Least preferred</h4>
        <ol className="space-y-1">
          {compressRanks(least).map(x => (
            <li key={`l-${x.date}-${x.service}`} className="flex items-center justify-between">
              <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
              <button className="text-xs text-rose-600" onClick={() => removeFrom("least", x.date, x.service)}>remove</button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  /* ------------ Mode: Calendar ------------- */
  function CalendarMode() {
    const [active, setActive] = useState(null); // {date}
    const [svc, setSvc] = useState("");

    const openPicker = (date) => {
      const avail = getAvailableServicesForDate(date);
      if (avail.length === 1) {
        const res = addTo("most", date, avail[0]);
        if (!res.ok) alert(res.msg);
      } else {
        setActive({ date });
      }
    };

    const confirm = (bucket) => {
      const res = addTo(bucket, active.date, svc || null);
      if (!res.ok) alert(res.msg);
      setActive(null); setSvc("");
    };

    return (
      <div>
        <p className="text-sm text-slate-600 mb-3">
          Click a weekend → choose service (auto if only one) → choose list. Clearing compresses ranks 1…N.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MONTH_KEYS.map((mk, i) => (
            <div key={mk} className="rounded-xl border p-3">
              <div className="font-semibold mb-2">{MONTH_FULL[i]}</div>
              <div className="grid grid-cols-2 gap-2">
                {months[mk].map((d) => {
                  const taken = d.isTaken;
                  const avail = getAvailableServicesForDate(d.date);
                  return (
                    <button
                      key={d.date}
                      disabled={taken || avail.length === 0}
                      onClick={() => openPicker(d.date)}
                      className={`text-left border rounded-lg p-2 ${taken || avail.length===0 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}`}
                    >
                      <div className="text-sm font-medium">
                        {d.day} <span className="text-slate-500">({d.date})</span>
                      </div>
                      {d.detail && <div className="text-[11px] text-slate-500">{d.detail}</div>}
                      <div className="mt-1 text-[11px]">
                        {avail.length===0 && <Pill>Full</Pill>}
                        {avail.includes(SERVICES.RNI) && <Pill>RNI open</Pill>}
                        {avail.includes(SERVICES.COA) && <Pill>COA open</Pill>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {active && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-4 w-full max-w-md">
              <div className="font-semibold mb-2">{active.date}</div>
              <div className="flex gap-2 mb-3">
                <select value={svc} onChange={(e)=>setSvc(e.target.value)} className="border rounded px-2 py-1">
                  <option value="">Pick service</option>
                  {getAvailableServicesForDate(active.date).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1 bg-slate-100 rounded" onClick={()=>{setActive(null);setSvc("");}}>Cancel</button>
                <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={()=>confirm("most")}>Add to Most</button>
                <button className="px-3 py-1 bg-amber-600 text-white rounded" onClick={()=>confirm("least")}>Add to Least</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ------------ Mode: QuickAdd ------------- */
  function QuickAddMode() {
    const [mkey, setMkey] = useState("01"); // starts at January
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const [bucket, setBucket] = useState("most");

    useEffect(()=>{ setDate(""); setService(""); }, [mkey]);

    const onAdd = () => {
      const res = addTo(bucket, date, service || null);
      if (!res.ok) alert(res.msg);
    };

    const saturdays = months[mkey];

    return (
      <div>
        <p className="text-sm text-slate-600 mb-3">
          Month → Saturday → Service → Add to “Most” or “Least”. Defaults to next rank; ranks normalize after each edit.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <select className="border rounded px-2 py-1" value={mkey} onChange={(e)=>setMkey(e.target.value)}>
            {MONTH_KEYS.map((mk,i)=><option key={mk} value={mk}>{MONTH_FULL[i]}</option>)}
          </select>
          <select className="border rounded px-2 py-1" value={date} onChange={(e)=>setDate(e.target.value)}>
            <option value="">Pick Saturday</option>
            {saturdays.map(d => (
              <option key={d.date} value={d.date} disabled={d.isTaken}>
                {d.date}{d.isTaken ? " (full)" : ""}
              </option>
            ))}
          </select>
          <select className="border rounded px-2 py-1" value={service} onChange={(e)=>setService(e.target.value)}>
            <option value="">Pick service</option>
            {(date ? getAvailableServicesForDate(date) : [SERVICES.RNI, SERVICES.COA]).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="border rounded px-2 py-1" value={bucket} onChange={(e)=>setBucket(e.target.value)}>
            <option value="most">Most</option>
            <option value="least">Least</option>
          </select>
          <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={onAdd}>Add</button>
        </div>
      </div>
    );
  }

  /* ------------ Mode: RankBoard ------------- */
  function RankBoardMode() {
    const [toLeast, setToLeast] = useState(false);

    const handleClick = (date, shift) => {
      const bucket = shift || toLeast ? "least" : "most";
      const avail = getAvailableServicesForDate(date);
      const service = avail.length === 1 ? avail[0] : null;
      const res = addTo(bucket, date, service);
      if (!res.ok) alert(res.msg);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-600">
            Click adds to Most; Shift+Click (or toggle) adds to Least. Badges show availability; invalid clicks are blocked.
          </p>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={toLeast} onChange={(e)=>setToLeast(e.target.checked)} />
            Send clicks to Least
          </label>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MONTH_KEYS.map((mk,i)=>(
            <div key={mk} className="rounded-xl border p-3">
              <div className="font-semibold mb-2">{MONTH_FULL[i]}</div>
              <div className="grid grid-cols-2 gap-2">
                {months[mk].map(d=>{
                  const avail = getAvailableServicesForDate(d.date);
                  const disabled = d.isTaken || avail.length===0;
                  return (
                    <button
                      key={d.date}
                      disabled={disabled}
                      onClick={(e)=>handleClick(d.date, e.shiftKey)}
                      className={`text-left border rounded-lg p-2 ${disabled ? "opacity-50 cursor-not-allowed":"hover:bg-slate-50"}`}
                    >
                      <div className="text-sm font-medium">
                        {d.day} <span className="text-slate-500">({d.date})</span>
                      </div>
                      {d.detail && <div className="text-[11px] text-slate-500">{d.detail}</div>}
                      <div className="mt-1 text-[11px]">
                        {avail.length===0 && <Pill>Full</Pill>}
                        {avail.includes(SERVICES.RNI) && <Pill>RNI</Pill>}
                        {avail.includes(SERVICES.COA) && <Pill>COA</Pill>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ------------ Mode: DragBuckets ------------- */
  function DragBucketsMode() {
    const [drag, setDrag] = useState(null); // {date}

    const chips = useMemo(() => {
      const chosen = new Set([...most, ...least].map(x => x.date));
      return MONTH_KEYS.map((mk,i)=>({
        mk, label: MONTH_FULL[i],
        items: months[mk].filter(d => !d.isTaken && !chosen.has(d.date)).map(d => ({ date: d.date }))
      }));
    }, [most, least]);

    const dropTo = (bucket) => {
      if (!drag) return;
      const avail = getAvailableServicesForDate(drag.date);
      const service = avail.length === 1 ? avail[0] : null;
      const res = addTo(bucket, drag.date, service);
      if (!res.ok) alert(res.msg);
      setDrag(null);
    };

    return (
      <div className="grid lg:grid-cols-[1fr_1fr] gap-3">
        {/* Left: available chips grouped by month */}
        <div>
          <p className="text-sm text-slate-600 mb-2">
            Drag chips into Most/Least. Removing or moving re-assigns ranks 1…N.
          </p>
          <div className="space-y-3">
            {chips.map(g=>(
              <div key={g.mk}>
                <div className="font-semibold mb-1">{g.label}</div>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {g.items.map(it=>(
                    <div
                      key={it.date}
                      draggable
                      onDragStart={()=>setDrag({ date: it.date })}
                      className="shrink-0 px-3 py-1 rounded-full border bg-white cursor-grab"
                    >
                      {it.date}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: buckets */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div
            onDragOver={(e)=>e.preventDefault()}
            onDrop={()=>dropTo("most")}
            className="rounded-xl border bg-slate-50 p-3 min-h-[160px]"
          >
            <div className="font-semibold mb-2">Most</div>
            <ol className="space-y-1">
              {compressRanks(most).map(x=>(
                <li key={`dm-${x.date}-${x.service}`} className="flex items-center justify-between">
                  <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
                  <button className="text-xs text-rose-600" onClick={()=>removeFrom("most", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
          <div
            onDragOver={(e)=>e.preventDefault()}
            onDrop={()=>dropTo("least")}
            className="rounded-xl border bg-slate-50 p-3 min-h-[160px]"
          >
            <div className="font-semibold mb-2">Least</div>
            <ol className="space-y-1">
              {compressRanks(least).map(x=>(
                <li key={`dl-${x.date}-${x.service}`} className="flex items-center justify-between">
                  <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
                  <button className="text-xs text-rose-600" onClick={()=>removeFrom("least", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  /* ------------ Top bar (single row; never wraps) ------------- */
  const TopBar = () => (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2 flex-nowrap overflow-x-auto">
        {/* Jump */}
        <select className="border rounded px-2 py-1 whitespace-nowrap" value={mode} onChange={(e)=>setMode(e.target.value)}>
          <option value={MODES.CAL}>Calendar</option>
          <option value={MODES.QA}>QuickAdd</option>
          <option value={MODES.RB}>RankBoard</option>
          <option value={MODES.DB}>DragBuckets</option>
        </select>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Firebase badge */}
        <span className="text-[11px] px-2 py-1 rounded-full border bg-slate-50 whitespace-nowrap">
          {firebaseConfig.projectId}
        </span>

        {/* Submit */}
        <button className="px-3 py-1 rounded bg-emerald-600 text-white whitespace-nowrap" onClick={submit}>
          Submit
        </button>
      </div>
    </div>
  );

  /* ------------ Render ------------- */
  return (
    <div className="min-h-screen bg-slate-100">
      <TopBar />

      <div className="max-w-6xl mx-auto px-3 py-4 grid lg:grid-cols-[2fr_1fr] gap-4">
        <div>
          {/* Mode instructions */}
          <Section title="Instructions">
            {mode === MODES.CAL && <div className="text-sm text-slate-600">Calendar: Click a weekend → choose service (auto if only one) → choose list. Clearing compresses ranks 1…N.</div>}
            {mode === MODES.QA  && <div className="text-sm text-slate-600">QuickAdd: Month → Saturday → Service → Add to Most/Least. Starts from January. Ranks normalize on each edit.</div>}
            {mode === MODES.RB  && <div className="text-sm text-slate-600">RankBoard: Click = Most; Shift+Click (or toggle) = Least. Badges indicate availability; invalid clicks are blocked.</div>}
            {mode === MODES.DB  && <div className="text-sm text-slate-600">DragBuckets: Drag chips by month into Most/Least. Removing/moving reassigns ranks 1…N.</div>}
          </Section>

          {/* Name gate wraps the interactive mode; preview remains visible in sidebar */}
          {!selected ? (
            <Section title="Who">
              <div className="flex items-center gap-2">
                <select className="border rounded px-2 py-1" value={me} onChange={(e)=>setMe(e.target.value)}>
                  <option value="">Select your name</option>
                  {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
                </select>
                <span className="text-sm text-slate-600">Pick your name to start adding preferences.</span>
              </div>
            </Section>
          ) : (
            <Section title={mode}>
              {mode === MODES.CAL && <CalendarMode />}
              {mode === MODES.QA  && <QuickAddMode />}
              {mode === MODES.RB  && <RankBoardMode />}
              {mode === MODES.DB  && <DragBucketsMode />}
            </Section>
          )}
        </div>

        {/* Sidebar: always-on live preview + name selector */}
        <div>
          <Section title="Live Preview" right={<button className="text-xs" onClick={clearAll}>Clear all</button>}>
            <Preview />
            <div className="mt-3 text-[11px] text-slate-500">
              Enforced rules: (1) same weekend cannot be in both Most and Least; (2) within a list, RNI/COA are mutually exclusive; (3) auto-pick service if only one is open.
            </div>
          </Section>

          <Section title="Who">
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1" value={me} onChange={(e)=>setMe(e.target.value)}>
                <option value="">Select</option>
                {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
              </select>
              {selected && <span className="text-sm text-slate-600">{selected.email}</span>}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
