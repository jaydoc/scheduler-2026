import React, { useEffect, useMemo, useReducer, useState, useCallback } from "react";
import "./App.css";
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
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v15.4";

/* =========================================================
   CONSTANTS + DATA
========================================================= */
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA" };
const MODES = { CAL: "Calendar", QA: "QuickAdd", RB: "RankBoard", DB: "DragBuckets" };
const ADMIN_EMAIL = "jkandasamy@uabmc.edu";

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

const ATTENDING_LIMITS = {
  Ambal:     { requested: 6,  claimed: 4, left: 2 },
  Schuyler:  { requested: 3,  claimed: 2, left: 1 },
  Mackay:    { requested: 5,  claimed: 1, left: 4 },
  Kane:      { requested: 1,  claimed: 1, left: 0 },
  Salas:     { requested: 3,  claimed: 0, left: 3 },
  Sims:      { requested: 8,  claimed: 4, left: 4 },
  Travers:   { requested: 7,  claimed: 4, left: 3 },
  Kandasamy: { requested: 10, claimed: 6, left: 4 },
  Willis:    { requested: 9,  claimed: 4, left: 5 },
  Bhatia:    { requested: 6,  claimed: 5, left: 1 },
  Winter:    { requested: 5,  claimed: 3, left: 2 },
  Boone:     { requested: 9,  claimed: 6, left: 3 },
  Arora:     { requested: 9,  claimed: 7, left: 2 },
  Jain:      { requested: 9,  claimed: 1, left: 8 },
  Lal:       { requested: 0,  claimed: 0, left: 0 },
  Shukla:    { requested: 9,  claimed: 1, left: 8 },
  Vivian:    { requested: 0,  claimed: 0, left: 2 },
  Carlo:     { requested: 5,  claimed: 5, left: 0 },
};

/* =========================================================
   CALENDAR (SATURDAYS OF 2026) — original content
========================================================= */
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
const MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* =========================================================
   HELPERS — Rank compression + conflict guards
========================================================= */
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
function fmtLabel(dateStr) {
  const [y,m,d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}
function peerKey(d){ return `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`; }

/* =========================================================
   STATE REDUCER — invariants + REORDER (fixed)
========================================================= */
const initialState = { most: [], least: [] };

function enforceInvariants(state) {
  // cannot have same date in both lists
  const leastDates = new Set(state.least.map(x => x.date));
  const mostClean  = state.most.filter(x => !leastDates.has(x.date));

  // within a bucket, cannot have both RNI and COA for same date
  const uniqByDate = (items) => {
    const seen = new Set(); const out = [];
    for (const it of items) { const k = it.date; if (!seen.has(k)) { seen.add(k); out.push(it); } }
    return out;
  };

  const mostUniq = uniqByDate(mostClean);
  const leastUniq = uniqByDate(state.least);

  return { most: compressRanks(mostUniq), least: compressRanks(leastUniq) };
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { bucket, date, service } = action;
      if (!service) return state;
      if (bucket === "most" && hasDate(state.least, date)) return state;
      if (bucket === "least" && hasDate(state.most, date)) return state;

      const list = bucket === "most" ? state.most : state.least;
      const other = bucket === "most" ? state.least : state.most;

      if (list.some(x => x.date === date && x.service !== service)) return state; // block both services same date in a bucket
      if (hasDateService(list, date, service)) return state; // no dup exact combo

      const added = [...list, { date, service, rank: action.rank ?? nextRank(list) }];
      const next = bucket === "most" ? { most: added, least: other } : { most: other, least: added };
      return enforceInvariants(next);
    }
    case "remove": {
      const list = action.bucket === "most" ? state.most : state.least;
      const other = action.bucket === "most" ? state.least : state.most;
      const filtered = list.filter(x => !(x.date === action.date && x.service === action.service));
      const next = action.bucket === "most" ? { most: filtered, least: other } : { most: other, least: filtered };
      return enforceInvariants(next);
    }
    case "reorder": {
      // NEW: robust reorder that persists the new order
      // action.bucket: "most" | "least"
      // action.fromIndex, action.toIndex: positions in current compressed order
      const bucket = action.bucket;
      const list = bucket === "most" ? state.most : state.least;
      const other = bucket === "most" ? state.least : state.most;

      const arr = [...compressRanks(list)]; // work on the visible order
      const from = action.fromIndex;
      const to = action.toIndex;
      if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return state;

      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      const renum = arr.map((x, i) => ({ ...x, rank: i + 1 }));

      return bucket === "most" ? { most: renum, least: other } : { most: other, least: renum };
    }
    case "clear":
      return initialState;
    default:
      return state;
  }
}

/* =========================================================
   Reusable atoms
========================================================= */
function Pill({ children, tone = "default" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
function Section({ title, children, right }) {
  return (
    <section className="section">
      <div className="section-head">
        <h3 className="section-title">{title}</h3>
        <div className="section-right">{right}</div>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

/* =========================================================
   MAIN APP
========================================================= */
export default function App() {
  const app = useMemo(() => initializeApp(firebaseConfig), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db = useMemo(() => getFirestore(app), [app]);

  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  const [me, setMe] = useState("");
  const selected = useMemo(() => ATTENDINGS.find(a => a.name === me) || null, [me]);
  const isAdmin = useMemo(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      return q.get("admin") === "1" && selected?.email === ADMIN_EMAIL;
    } catch { return false; }
  }, [selected]);

  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [gateErr, setGateErr] = useState("");

  const [mode, setMode] = useState(MODES.RB);
  const [{ most, least }, dispatch] = useReducer(reducer, initialState);

  // ------- Drag & drop reorder handlers (wired into preview + buckets)
  const [dragCtx, setDragCtx] = useState(null); // { bucket, index }
  const onDragStartItem = (bucket, index) => setDragCtx({ bucket, index });
  const onDragOverItem = (e) => { e.preventDefault(); };
  const onDropItem = (bucket, index) => {
    if (!dragCtx) return;
    if (dragCtx.bucket !== bucket) return; // don't cross-bucket reorder
    if (dragCtx.index === index) return;
    dispatch({ type: "reorder", bucket, fromIndex: dragCtx.index, toIndex: index });
    setDragCtx(null);
  };

  const addTo = useCallback((bucket, date, service, rank) => {
    if (!service) return { ok:false, msg:"Pick service" };
    dispatch({ type: "add", bucket, date, service, rank });
    return { ok:true };
  }, []);
  const removeFrom = useCallback((bucket, date, service) => dispatch({ type: "remove", bucket, date, service }), []);
  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  const submit = async () => {
    if (!selected) { alert("Log in with your code first."); return; }
    const payload = {
      appId, year: YEAR,
      who: selected.name, email: selected.email,
      most: compressRanks(most),
      least: compressRanks(least),
      ts: serverTimestamp(),
      isAdmin
    };
    try {
      await setDoc(doc(db, "prefs", `${YEAR}-${selected.name}`), payload);
      alert("Saved.\n\nPlease Download CSV from the top-right of the main panel and verify your preferences (Name / Date / Service / Most-or-Least / Rank). If everything looks correct, you’re done.");
    } catch (e) { console.error(e); alert("Failed to save."); }
  };

  // Download CSV (unchanged behavior except location in UI)
  const downloadCSV = () => {
    if (!selected) { alert("Please verify your name/code first."); return; }
    const rows = [];
    compressRanks(most).forEach(x => rows.push({ name: selected.name, bucket: "Most", date: x.date, service: x.service, rank: x.rank }));
    compressRanks(least).forEach(x => rows.push({ name: selected.name, bucket: "Least", date: x.date, service: x.service, rank: x.rank }));
    const headers = ["name","date","service","bucket","rank"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${YEAR}-${selected.name}-preferences.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* -------------------- Collapsible Month -------------------- */
  function CollapsibleMonth({ title, children, defaultCollapsed = true }) {
    const [open, setOpen] = useState(!defaultCollapsed);
    return (
      <div className="month">
        <button className="month-toggle" onClick={() => setOpen(o => !o)}>
          <span className="chev">{open ? "▾" : "▸"}</span>
          <span className="month-title">{title}</span>
        </button>
        {open && children}
      </div>
    );
  }

  /* -------------------------- Calendar -------------------------- */
  function CalendarMode() {
    const onClickSvc = (date, service, bucket) => {
      const avail = getAvailableServicesForDate(date);
      if (!avail.includes(service)) return;
      addTo(bucket, date, service);
    };
    return (
      <div className="months">
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            <div className="days">
              {months[mk].map((d) => {
                const taken = d.isTaken;
                const avail = getAvailableServicesForDate(d.date);
                return (
                  <div key={peerKey(d)} className={`day ${taken ? "is-disabled" : ""}`}>
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    <div className="svc-actions">
                      {avail.includes(SERVICES.RNI) && (
                        <>
                          <button className="btn btn-svc" disabled={taken} onClick={() => onClickSvc(d.date, SERVICES.RNI, "most")}>RNI → Most</button>
                          <button className="btn btn-svc" disabled={taken} onClick={() => onClickSvc(d.date, SERVICES.RNI, "least")}>RNI → Least</button>
                        </>
                      )}
                      {avail.includes(SERVICES.COA) && (
                        <>
                          <button className="btn btn-svc" disabled={taken} onClick={() => onClickSvc(d.date, SERVICES.COA, "most")}>COA → Most</button>
                          <button className="btn btn-svc" disabled={taken} onClick={() => onClickSvc(d.date, SERVICES.COA, "least")}>COA → Least</button>
                        </>
                      )}
                      {avail.length === 0 && <Pill tone="muted">Full</Pill>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  /* -------------------------- QuickAdd -------------------------- */
  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const [bucket, setBucket] = useState("most");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const onAdd = () => { addTo(bucket, date, service || null); };
    return (
      <div className="row wrap gap">
        <select className="select" value={mkey} onChange={(e) => setMkey(e.target.value)}>
          {MONTH_KEYS.map((mk, i) => (<option key={mk} value={mk}>{MONTH_FULL[i]}</option>))}
        </select>
        <select className="select" value={date} onChange={(e) => setDate(e.target.value)}>
          <option value="">Pick Saturday</option>
          {saturdays.map((d) => (<option key={d.date} value={d.date} disabled={d.isTaken}>{fmtLabel(d.date)}{d.isTaken ? " (full)" : ""}</option>))}
        </select>
        <select className="select" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Pick service</option>
          {(date ? getAvailableServicesForDate(date) : [SERVICES.RNI, SERVICES.COA]).map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select className="select" value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="most">Most</option>
          <option value="least">Least</option>
        </select>
        <button className="btn btn-green" onClick={onAdd}>Add</button>
      </div>
    );
  }

  /* -------------------------- RankBoard -------------------------- */
  function RankBoardMode() {
    const renderRow = (d) => {
      const avail = getAvailableServicesForDate(d.date);
      const disabled = d.isTaken || avail.length === 0;
      const svcBtns = (svc) => (
        <>
          <button className="btn btn-svc" disabled={disabled || !avail.includes(svc)} onClick={() => addTo("most", d.date, svc)}>{svc} → Most</button>
          <button className="btn btn-svc" disabled={disabled || !avail.includes(svc)} onClick={() => addTo("least", d.date, svc)}>{svc} → Least</button>
        </>
      );
      return (
        <div key={peerKey(d)} className="rb-row">
          <div className="rb-date">
            <div className="rb-label">{fmtLabel(d.date)}</div>
            {d.detail && <div className="rb-detail">{d.detail}</div>}
          </div>
          <div className="rb-actions">
            {svcBtns(SERVICES.RNI)}
            {svcBtns(SERVICES.COA)}
            {avail.length === 0 && <Pill tone="muted">Full</Pill>}
          </div>
        </div>
      );
    };

    return (
      <div className="rb-list">
        <div className="muted" style={{marginBottom:8}}>One click: choose service + bucket.</div>
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            {months[mk].map(renderRow)}
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  /* -------------------------- DragBuckets -------------------------- */
  function DragBucketsMode() {
    const [drag, setDrag] = useState(null);
    const chips = useMemo(() => {
      const chosenDates = new Set([...most, ...least].map(x => x.date));
      return MONTH_KEYS.map((mk, i) => ({
        mkey: mk, label: MONTH_FULL[i],
        items: months[mk].filter(d => !d.isTaken && !chosenDates.has(d.date)).map(d => ({ date: d.date }))
      }));
    }, [most, least]);

    const onDropTo = (bucket) => {
      if (!drag) return;
      const avail = getAvailableServicesForDate(drag.date);
      if (avail.includes(SERVICES.RNI)) addTo(bucket, drag.date, SERVICES.RNI);
      else if (avail.includes(SERVICES.COA)) addTo(bucket, drag.date, SERVICES.COA);
      setDrag(null);
    };

    return (
      <div className="drag-grid">
        <div>
          <div className="muted">Drag from Available into Most/Least. Ranks compress automatically.</div>
          {chips.map(group => (
            <div key={group.mkey} className="chip-group">
              <div className="chip-title">{group.label}</div>
              <div className="chip-row">
                {group.items.map(it => (
                  <div
                    key={it.date}
                    draggable
                    onDragStart={() => setDrag({ date: it.date })}
                    className="chip"
                  >{fmtLabel(it.date)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="buckets">
          <div onDragOver={(e) => e.preventDefault()} onDrop={() => onDropTo("most")} className="bucket">
            <div className="bucket-title">Most</div>
            <ol className="bucket-list">
              {compressRanks(most).map((x, i) => (
                <li
                  key={`${x.date}-${x.service}`}
                  className="bucket-item draggable-item"
                  draggable
                  onDragStart={() => onDragStartItem("most", i)}
                  onDragOver={onDragOverItem}
                  onDrop={() => onDropItem("most", i)}
                >
                  <span>#{x.rank} — {fmtLabel(x.date)} ({x.service})</span>
                  <button className="btn-link" onClick={() => removeFrom("most", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
          <div onDragOver={(e) => e.preventDefault()} onDrop={() => onDropTo("least")} className="bucket">
            <div className="bucket-title">Least</div>
            <ol className="bucket-list">
              {compressRanks(least).map((x, i) => (
                <li
                  key={`${x.date}-${x.service}`}
                  className="bucket-item draggable-item"
                  draggable
                  onDragStart={() => onDragStartItem("least", i)}
                  onDragOver={onDragOverItem}
                  onDrop={() => onDropItem("least", i)}
                >
                  <span>#{x.rank} — {fmtLabel(x.date)} ({x.service})</span>
                  <button className="btn-link" onClick={() => removeFrom("least", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------- Topbar -------------------------- */
  const topBar = (
    <div className="topbar">
      <div className="topbar-inner">
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value={MODES.CAL}>Calendar</option>
          <option value={MODES.QA}>QuickAdd</option>
          <option value={MODES.RB}>RankBoard</option>
          <option value={MODES.DB}>DragBuckets</option>
        </select>
        <div className="spacer" />
        <span className="badge">{firebaseConfig.projectId}{isAdmin ? " — ADMIN" : ""}</span>
        <button className="btn" onClick={downloadCSV}>Download CSV</button>
        <button className="btn" onClick={submit}>Submit</button>
      </div>
    </div>
  );

  /* -------------------------- Login (code gate) -------------------------- */
  // Keep your existing one-time code gate if present; simple passthrough here:
  const [showLimits, setShowLimits] = useState(true); // limits notice shown once after name lock

  const loginPanel = (
    <div className="login">
      <div className="login-title">Enter your one-time code</div>
      <div className="id-row">
        <select className="id-select" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)}>
          <option value="">Select your name</option>
          {ATTENDINGS.map(a => (
            <option key={a.email} value={a.email}>{a.name} — {a.email}</option>
          ))}
        </select>
        <input
          className="id-select"
          placeholder="Paste code..."
          value={gateCode}
          onChange={(e) => setGateCode(e.target.value.trim())}
        />
        <button
          className="btn btn-green"
          onClick={() => {
            // If you had per-attending codes, verify here. For now, accept selection:
            const att = ATTENDINGS.find(a => a.email === gateEmail);
            if (!att) { setGateErr("Select your name."); return; }
            setGateErr(""); setMe(att.name);
            setShowLimits(true);
          }}
        >
          Verify & Continue
        </button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted">Tip: you'll see your name locked in after verification.</div>
    </div>
  );

  // ------- Build "already assigned" shifts for the logged-in attending (from months)
  const myAssignedShifts = useMemo(() => {
    if (!selected) return [];
    const out = [];
    for (const mk of MONTH_KEYS) {
      for (const d of months[mk]) {
        if (d.rni === selected.name) out.push({ date: d.date, service: "RNI" });
        if (d.coa === selected.name) out.push({ date: d.date, service: "COA" });
      }
    }
    // sort by date ascending
    return out.sort((a,b)=> (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [selected]);

  const limitsNotice = (() => {
    if (!selected || !showLimits) return null;
    const lim = ATTENDING_LIMITS[selected.name];
    if (!lim) return (
      <div className="limits banner">
        <div className="limits-title">Targets for {selected.name}</div>
        <div className="limits-body">
          <div className="muted">No target record found.</div>
        </div>
        <div className="row right">
          <button className="btn" onClick={() => setShowLimits(false)}>OK</button>
        </div>
      </div>
    );
    return (
      <div className="limits banner">
        <div className="limits-title">Targets for {selected.name}</div>
        <div className="limits-body">
          <div className="limits-grid">
            <div><strong>Requested:</strong> {lim.requested}</div>
            <div><strong>Claimed:</strong> {lim.claimed}</div>
            <div><strong>Left:</strong> {lim.left}</div>
          </div>
          <div className="limits-subtitle">Shifts already assigned (from calendar):</div>
          {myAssignedShifts.length === 0 ? (
            <div className="muted">None listed for this calendar.</div>
          ) : (
            <ul className="limits-list">
              {myAssignedShifts.map((s) => (
                <li key={`${s.date}-${s.service}`}>{fmtLabel(s.date)} — {s.service}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="row right">
          <button className="btn" onClick={() => setShowLimits(false)}>OK</button>
        </div>
      </div>
    );
  })();

  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        {topBar}
        <div className="content">
          <div className="main">
            <Section title={mode}>
              {!me ? loginPanel : (
                <>
                  {limitsNotice}
                  {mode === MODES.CAL && <CalendarMode />}
                  {mode === MODES.QA  && <QuickAddMode />}
                  {mode === MODES.RB  && <RankBoardMode />}
                  {mode === MODES.DB  && <DragBucketsMode />}
                </>
              )}
            </Section>
          </div>
          <aside className="side">
            <Section title="Live Preview" right={<button className="btn-link" onClick={clearAll}>Clear all</button>}>
              <div className="preview">
                <div>
                  <div className="preview-title">Most preferred</div>
                  <ol className="preview-list">
                    {compressRanks(most).map((x, i) => (
                      <li
                        key={`${x.date}-${x.service}`}
                        className="preview-item draggable-item"
                        draggable
                        onDragStart={() => onDragStartItem("most", i)}
                        onDragOver={onDragOverItem}
                        onDrop={() => onDropItem("most", i)}
                      >
                        <span>#{x.rank} — {fmtLabel(x.date)} ({x.service})</span>
                        <button className="btn-link" onClick={() => removeFrom("most", x.date, x.service)}>remove</button>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="preview-title">Least preferred</div>
                  <ol className="preview-list">
                    {compressRanks(least).map((x, i) => (
                      <li
                        key={`${x.date}-${x.service}`}
                        className="preview-item draggable-item"
                        draggable
                        onDragStart={() => onDragStartItem("least", i)}
                        onDragOver={onDragOverItem}
                        onDrop={() => onDropItem("least", i)}
                      >
                        <span>#{x.rank} — {fmtLabel(x.date)} ({x.service})</span>
                        <button className="btn-link" onClick={() => removeFrom("least", x.date, x.service)}>remove</button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="helper">
                Invariants: (1) Same weekend cannot be in both Most and Least. (2) Within a list, RNI/COA are mutually exclusive per date. (3) Ranks compress to 1…N after add/remove or reorder.
              </div>
            </Section>

            <Section title="Who">
              <div className="id-row">
                <select className="id-select" value={me} onChange={(e) => setMe(e.target.value)} disabled={!me}>
                  {!me && <option value="">(locked after login)</option>}
                  {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
                </select>
                {me && <span className="muted">{ATTENDINGS.find(a => a.name === me)?.email}</span>}
              </div>
            </Section>
          </aside>
        </div>
      </div>
      <div className="band" />
    </div>
  );
}
