import React, { useEffect, useMemo, useReducer, useState, useCallback } from "react";
// Firebase SDK (v9+ modular)
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

/**********************************
  FIREBASE CONFIG (keeps your original fallbacks)
**********************************/
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
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v14.0";

/**********************************
  CONSTANTS + DATA
**********************************/
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA" };
const MODES = { CAL: "Calendar", QA: "QuickAdd", RB: "RankBoard", DB: "DragBuckets" };

// ATTENDINGS (subset you provided — can be extended or fetched later)
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

// Calendar data (Saturdays of 2026) — copied from your snippet
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

/**********************************
  HELPERS — Rank compression + conflict guards
**********************************/
function compressRanks(list) {
  const sorted = [...list].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }));
}
function hasDate(list, date) { return list.some((x) => x.date === date); }
function hasDateService(list, date, service) { return list.some((x) => x.date === date && x.service === service); }
function nextRank(list) { return list.length ? Math.max(...list.map((x) => x.rank ?? 0)) + 1 : 1; }
function getAvailableServicesForDate(date) {
  for (const mk of MONTH_KEYS) {
    const hit = months[mk].find((d) => d.date === date);
    if (hit) {
      const out = [];
      if (!hit.rni) out.push(SERVICES.RNI);
      if (!hit.coa) out.push(SERVICES.COA);
      return out;
    }
  }
  return [SERVICES.RNI, SERVICES.COA];
}

/**********************************
  SINGLE SOURCE OF TRUTH (Reducer with hard invariants)
**********************************/
const initialState = { most: [], least: [] };
function enforceInvariants(state) {
  // 1) No date may exist in both lists (regardless of service)
  const leastDates = new Set(state.least.map(x => x.date));
  const mostClean = state.most.filter(x => !leastDates.has(x.date));

  // 2) Within a list, a date may have only ONE service (RNI XOR COA)
  const uniqBy = (items) => {
    const seen = new Set();
    const out = [];
    for (const it of items) {
      const key = `${it.date}`; // date only
      if (!seen.has(key)) { seen.add(key); out.push(it); }
    }
    return out;
  };
  const mostUniq = uniqBy(mostClean);
  const leastUniq = uniqBy(state.least);

  // 3) Re-compress ranks
  return { most: compressRanks(mostUniq), least: compressRanks(leastUniq) };
}

function reducer(state, action) {
  switch (action.type) {
    case "add": { // {bucket, date, service, rank?}
      const { bucket, date } = action;
      const service = action.service;
      // hard guards before mutate
      if (bucket === "most" && hasDate(state.least, date)) return state;
      if (bucket === "least" && hasDate(state.most, date)) return state;

      const list = bucket === "most" ? state.most : state.least;
      const other = bucket === "most" ? state.least : state.most;
      if (list.some(x => x.date === date && x.service !== service)) return state; // XOR within list
      if (hasDateService(list, date, service)) return state; // no duplicate

      const next = {
        most: bucket === "most" ? [...list, { date, service, rank: action.rank ?? nextRank(list) }] : state.most,
        least: bucket === "least" ? [...list, { date, service, rank: action.rank ?? nextRank(list) }] : state.least,
      };
      // put other list back
      if (bucket === "most") next.least = other; else next.most = other;
      return enforceInvariants(next);
    }
    case "remove": { // {bucket, date, service}
      const list = action.bucket === "most" ? state.most : state.least;
      const other = action.bucket === "most" ? state.least : state.most;
      const filtered = list.filter(x => !(x.date === action.date && x.service === action.service));
      const next = action.bucket === "most" ? { most: filtered, least: other } : { most: other, least: filtered };
      return enforceInvariants(next);
    }
    case "clear":
      return initialState;
    default:
      return state;
  }
}

/**********************************
  UI atoms
**********************************/
function Pill({ children }) {
  return (<span className="px-2 py-0.5 rounded-full bg-slate-100 border text-slate-700 text-xs mr-1">{children}</span>);
}
function Section({ title, children, right }) {
  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</h3>
        {right}
      </div>
      <div className="rounded-xl border bg-white p-3 shadow-sm">{children}</div>
    </section>
  );
}

/**********************************
  MAIN APP
**********************************/
export default function App() {
  // Firebase init once
  const app = useMemo(() => initializeApp(firebaseConfig), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db = useMemo(() => getFirestore(app), [app]);

  // Auth (anonymous is enough for now)
  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  // Name gate
  const [me, setMe] = useState("");
  const [selected, setSelected] = useState(null);
  useEffect(() => { setSelected(ATTENDINGS.find(a => a.name === me) || null); }, [me]);

  // Global UI state
  const [mode, setMode] = useState(MODES.CAL);
  const [{ most, least }, dispatch] = useReducer(reducer, initialState);

  // Helpers exposed to children
  const addTo = useCallback((bucket, date, service, rank) => {
    const avail = getAvailableServicesForDate(date);
    let s = service;
    if (!s) { if (avail.length === 1) s = avail[0]; else return { ok: false, msg: "Pick a service" }; }
    dispatch({ type: "add", bucket, date, service: s, rank });
    return { ok: true };
  }, []);
  const removeFrom = useCallback((bucket, date, service) => dispatch({ type: "remove", bucket, date, service }), []);
  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // Live preview across modes (always shown)
  const preview = (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <h4 className="font-semibold mb-1">Most preferred</h4>
        <ol className="space-y-1">
          {compressRanks(most).map((x) => (
            <li key={`${x.date}-${x.service}`} className="flex items-center justify-between">
              <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
              <button className="text-xs text-rose-600" onClick={() => removeFrom("most", x.date, x.service)}>remove</button>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <h4 className="font-semibold mb-1">Least preferred</h4>
        <ol className="space-y-1">
          {compressRanks(least).map((x) => (
            <li key={`${x.date}-${x.service}`} className="flex items-center justify-between">
              <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
              <button className="text-xs text-rose-600" onClick={() => removeFrom("least", x.date, x.service)}>remove</button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  /**************
    SAVE / SUBMIT
  **************/
  const submit = async () => {
    if (!selected) { alert("Pick your name first."); return; }
    const payload = { appId, year: YEAR, who: selected.name, email: selected.email, most: compressRanks(most), least: compressRanks(least), ts: serverTimestamp() };
    try {
      await setDoc(doc(db, "prefs", `${YEAR}-${selected.name}`), payload);
      alert("Saved to Firestore.");
    } catch (e) {
      console.error(e); alert("Failed to save.");
    }
  };

  /**************
    MODE: Calendar
  **************/
  function CalendarMode() {
    const [active, setActive] = useState(null); // {date}
    const [svc, setSvc] = useState("");

    const onPickDay = (d) => {
      const avail = getAvailableServicesForDate(d.date);
      if (avail.length === 1) { const res = addTo("most", d.date, avail[0]); if (!res.ok) alert(res.msg); return; }
      setActive({ date: d.date });
    };
    const confirm = (bucket) => { const res = addTo(bucket, active.date, svc || null); if (!res.ok) alert(res.msg); setActive(null); setSvc(""); };

    return (
      <div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MONTH_KEYS.map((mk, i) => (
            <div key={mk} className="rounded-xl border p-3">
              <div className="font-semibold mb-2">{MONTH_FULL[i]}</div>
              <div className="grid grid-cols-2 gap-2">
                {months[mk].map((d) => {
                  const taken = d.isTaken;
                  const avail = getAvailableServicesForDate(d.date);
                  return (
                    <button key={d.date} disabled={taken} onClick={() => onPickDay(d)} className={`text-left border rounded-lg p-2 ${taken ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}`}>
                      <div className="text-sm font-medium">{d.day} <span className="text-slate-500">({d.date})</span></div>
                      {d.detail && <div className="text-[11px] text-slate-500">{d.detail}</div>}
                      <div className="mt-1 text-[11px]">
                        {avail.length === 0 && <Pill>Full</Pill>}
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
                <select value={svc} onChange={(e) => setSvc(e.target.value)} className="border rounded px-2 py-1">
                  <option value="">Pick service</option>
                  {getAvailableServicesForDate(active.date).map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-3 py-1 bg-slate-100 rounded" onClick={() => { setActive(null); setSvc(""); }}>Cancel</button>
                <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={() => confirm("most")}>Add to Most</button>
                <button className="px-3 py-1 bg-amber-600 text-white rounded" onClick={() => confirm("least")}>Add to Least</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /**************
    MODE: QuickAdd
  **************/
  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const [bucket, setBucket] = useState("most");

    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);

    const onAdd = () => { const res = addTo(bucket, date, service || null); if (!res.ok) alert(res.msg); };

    return (
      <div className="flex flex-wrap gap-2 mb-3">
        <select className="border rounded px-2 py-1" value={mkey} onChange={(e) => setMkey(e.target.value)}>
          {MONTH_KEYS.map((mk, i) => (<option key={mk} value={mk}>{MONTH_FULL[i]}</option>))}
        </select>
        <select className="border rounded px-2 py-1" value={date} onChange={(e) => setDate(e.target.value)}>
          <option value="">Pick Saturday</option>
          {saturdays.map((d) => (<option key={d.date} value={d.date} disabled={d.isTaken}>{d.date}{d.isTaken ? " (full)" : ""}</option>))}
        </select>
        <select className="border rounded px-2 py-1" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Pick service</option>
          {(date ? getAvailableServicesForDate(date) : [SERVICES.RNI, SERVICES.COA]).map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select className="border rounded px-2 py-1" value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="most">Most</option>
          <option value="least">Least</option>
        </select>
        <button className="px-3 py-1 bg-emerald-600 text-white rounded" onClick={onAdd}>Add</button>
      </div>
    );
  }

  /**************
    MODE: RankBoard (click = Most, Shift+Click or toggle = Least)
  **************/
  function RankBoardMode() {
    const [toLeast, setToLeast] = useState(false);
    const handleClick = (date, e) => {
      const bucket = e.shiftKey || toLeast ? "least" : "most";
      const avail = getAvailableServicesForDate(date);
      const service = avail.length === 1 ? avail[0] : null;
      const res = addTo(bucket, date, service);
      if (!res.ok) alert(res.msg);
    };
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-slate-600">Click → Most; Shift+Click/toggle → Least. Badges show availability; invalid clicks blocked.</p>
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={toLeast} onChange={(e) => setToLeast(e.target.checked)} />Send clicks to Least</label>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MONTH_KEYS.map((mk, i) => (
            <div key={mk} className="rounded-xl border p-3">
              <div className="font-semibold mb-2">{MONTH_FULL[i]}</div>
              <div className="grid grid-cols-2 gap-2">
                {months[mk].map((d) => {
                  const taken = d.isTaken;
                  const avail = getAvailableServicesForDate(d.date);
                  return (
                    <button key={d.date} disabled={taken || avail.length === 0} onClick={(e) => handleClick(d.date, e)} className={`text-left border rounded-lg p-2 ${taken || avail.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}`}>
                      <div className="text-sm font-medium">{d.day} <span className="text-slate-500">({d.date})</span></div>
                      {d.detail && <div className="text-[11px] text-slate-500">{d.detail}</div>}
                      <div className="mt-1 text-[11px]">
                        {avail.length === 0 && <Pill>Full</Pill>}
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

  /**************
    MODE: DragBuckets (basic HTML5 drag/drop)
  **************/
  function DragBucketsMode() {
    const [drag, setDrag] = useState(null); // {date}
    const chips = useMemo(() => {
      const chosenDates = new Set([...most, ...least].map(x => x.date));
      return MONTH_KEYS.map((mk, i) => ({ mkey: mk, label: MONTH_FULL[i], items: months[mk].filter(d => !d.isTaken && !chosenDates.has(d.date)).map(d => ({ date: d.date })) }));
    }, [most, least]);
    const onDropTo = (bucket) => {
      if (!drag) return; const avail = getAvailableServicesForDate(drag.date); const service = avail.length === 1 ? avail[0] : null; const res = addTo(bucket, drag.date, service); if (!res.ok) alert(res.msg); setDrag(null);
    };
    return (
      <div className="grid lg:grid-cols-[1fr_1fr] gap-3">
        <div>
          <div className="space-y-3">
            {chips.map(group => (
              <div key={group.mkey}>
                <div className="font-semibold mb-1">{group.label}</div>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {group.items.map(it => (
                    <div key={it.date} draggable onDragStart={() => setDrag({ date: it.date })} className="shrink-0 px-3 py-1 rounded-full border bg-white cursor-grab">{it.date}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div onDragOver={(e) => e.preventDefault()} onDrop={() => onDropTo("most")} className="rounded-xl border bg-slate-50 p-3 min-h-[160px]">
            <div className="font-semibold mb-2">Most</div>
            <ol className="space-y-1">
              {compressRanks(most).map(x => (
                <li key={`${x.date}-${x.service}`} className="flex items-center justify-between">
                  <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
                  <button className="text-xs text-rose-600" onClick={() => removeFrom("most", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
          <div onDragOver={(e) => e.preventDefault()} onDrop={() => onDropTo("least")} className="rounded-xl border bg-slate-50 p-3 min-h-[160px]">
            <div className="font-semibold mb-2">Least</div>
            <ol className="space-y-1">
              {compressRanks(least).map(x => (
                <li key={`${x.date}-${x.service}`} className="flex items-center justify-between">
                  <span className="text-sm">#{x.rank} — {x.date} ({x.service})</span>
                  <button className="text-xs text-rose-600" onClick={() => removeFrom("least", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  /**************
    TOP BAR + LAYOUT (no wrapping; no CSV preview; single row)
  **************/
  const topBar = (
    <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2 flex-nowrap whitespace-nowrap overflow-x-auto">
        <select className="border rounded px-2 py-1" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value={MODES.CAL}>Calendar</option>
          <option value={MODES.QA}>QuickAdd</option>
          <option value={MODES.RB}>RankBoard</option>
          <option value={MODES.DB}>DragBuckets</option>
        </select>
        <span className="ml-auto text-[11px] px-2 py-1 rounded-full border bg-slate-50">{firebaseConfig.projectId}</span>
        <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={submit}>Submit</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {topBar}
      <div className="max-w-6xl mx-auto px-3 py-4 grid lg:grid-cols-[2fr_1fr] gap-4">
        <div>
          <Section title={mode}>
            {!selected ? (
              <div className="max-w-xl mx-auto p-3">
                <p className="text-sm text-slate-600 mb-2">Pick your name to start.</p>
                <select className="border rounded px-2 py-1 w-full" value={me} onChange={(e) => setMe(e.target.value)}>
                  <option value="">Select your name</option>
                  {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
                </select>
              </div>
            ) : (
              <>
                {mode === MODES.CAL && <CalendarMode />}
                {mode === MODES.QA  && <QuickAddMode />}
                {mode === MODES.RB  && <RankBoardMode />}
                {mode === MODES.DB  && <DragBucketsMode />}
              </>
            )}
          </Section>
        </div>
        <div>
          <Section title="Live Preview" right={<button className="text-xs" onClick={clearAll}>Clear all</button>}>
            {preview}
            <div className="mt-3 text-[11px] text-slate-500">
              Hard invariants across all modes: (1) Same date cannot be in both Most and Least. (2) Within a list, RNI/COA are mutually exclusive per weekend. (3) Ranks always compress to 1…N.
            </div>
          </Section>
          <Section title="Who">
            <div className="flex items-center gap-2">
              <select className="border rounded px-2 py-1" value={me} onChange={(e) => setMe(e.target.value)}>
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
