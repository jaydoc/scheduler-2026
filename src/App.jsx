import React, { useEffect, useMemo, useReducer, useState, useCallback, useRef } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

/* =========================================================
   FIREBASE (keeps your existing fallbacks)
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
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v16.0";

/* =========================================================
   CONSTANTS + DATA (unchanged calendar + codes)
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

const ATTENDING_CODES = {
  "nambalav@uab.edu": "UAB26-7KQ2T9",
  "nitinarora@uabmc.edu": "UAB26-M3ZP5H",
  "ksbhatia@uabmc.edu": "UAB26-X8D4N2",
  "boone@uabmc.edu": "UAB26-R6C9JW",
  "wcarlo@uabmc.edu": "UAB26-P2L7VQ",
  "viraljain@uabmc.edu": "UAB26-HT5M8A",
  "jkandasamy@uabmc.edu": "UAB26-B9Y3KC",
  "akane@uabmc.edu": "UAB26-W4N6UE",
  "mackay@uabmc.edu": "UAB26-J2F8RD",
  "aschuyler@uabmc.edu": "UAB26-Z7T3LM",
  "vshukla@uabmc.edu": "UAB26-Q5R9BX",
  "bsims@uabmc.edu": "UAB26-N6V2PG",
  "cptravers@uabmc.edu": "UAB26-C8H5TY",
  "kentwillis@uabmc.edu": "UAB26-L3K9SD",
  "lwinter@uabmc.edu": "UAB26-D7M4QE",
  "asalas@uabmc.edu": "UAB26-V2P7RJ",
  "clal@uabmc.edu": "UAB26-K9S3TU",
  "vvalcarceluaces@uabmc.edu": "UAB26-A4N8GY",
};

/* ===== Calendar (Saturdays only; unchanged content shape) ===== */
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
   HELPERS
========================================================= */
function fmtLabel(dateStr) {
  const [y,m,d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}
function servicesOpenFor(date) {
  for (const mk of MONTH_KEYS) {
    const hit = months[mk].find(d => d.date === date);
    if (hit) {
      const out = [];
      if (!hit.rni) out.push(SERVICES.RNI);
      if (!hit.coa) out.push(SERVICES.COA);
      return out;
    }
  }
  return [SERVICES.RNI, SERVICES.COA];
}

/* =========================================================
   SINGLE LIST MODEL: rankings[]
   Invariants:
   - #1 is most preferred; higher rank number = lower preference
   - A date may appear at most once (i.e., you cannot select RNI and COA for same weekend)
   - No duplicates of same (date, service)
   - Ranks compress to 1..N after any add/remove/reorder
========================================================= */
const initialState = { rankings: [] }; // [{date, service, rank}]
function compressRanks(list) {
  return list
    .slice()
    .sort((a,b) => (a.rank ?? 1) - (b.rank ?? 1))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}
function hasDate(list, date) {
  return list.some(x => x.date === date);
}
function hasDateService(list, date, service) {
  return list.some(x => x.date === date && x.service === service);
}
function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service } = action;
      if (!service) return state;
      // block: cannot add if date already present (prevents picking other service on same weekend)
      if (hasDate(state.rankings, date)) return state;
      if (hasDateService(state.rankings, date, service)) return state;
      const next = [...state.rankings, { date, service, rank: (state.rankings.length + 1) }];
      return { rankings: compressRanks(next) };
    }
    case "remove": {
      const next = state.rankings.filter(x => !(x.date === action.date && x.service === action.service));
      return { rankings: compressRanks(next) };
    }
    case "reorder": {
      // action.fromIndex, action.toIndex (0-based in current compressed order)
      const ordered = compressRanks(state.rankings);
      const item = ordered[action.fromIndex];
      if (!item) return state;
      const arr = ordered.slice();
      arr.splice(action.fromIndex, 1);
      arr.splice(action.toIndex, 0, item);
      return { rankings: compressRanks(arr) };
    }
    case "clear": return initialState;
    default: return state;
  }
}

/* =========================================================
   UI atoms
========================================================= */
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
function Pill({ children, tone = "default" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/* =========================================================
   APP
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

  // login gate by code (unchanged behavior)
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [gateErr, setGateErr] = useState("");

  const [mode, setMode] = useState(MODES.RB); // default to RankBoard alt
  const [{ rankings }, dispatch] = useReducer(reducer, initialState);

  // ---- add/remove helpers
  const add = useCallback((date, service) => {
    const open = servicesOpenFor(date);
    if (!open.includes(service)) return; // invalid click blocked
    dispatch({ type: "add", date, service });
  }, []);
  const remove = useCallback((date, service) => dispatch({ type: "remove", date, service }), []);
  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // ---- CSV download
  const downloadCSV = useCallback(() => {
    if (!selected) { alert("Please verify your name/code first."); return; }
    const rows = rankings.map(r => ({
      name: selected.name,
      date: r.date,
      service: r.service,
      rank: r.rank
    }));
    const headers = ["name","date","service","rank"];
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
  }, [rankings, selected]);

  // ---- Submit with “Download & Verify first” confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const openConfirm = () => {
    if (!selected) { alert("Please log in with your code first."); return; }
    setConfirmOpen(true);
  };
  const actuallySubmit = async () => {
    setConfirmOpen(false);
    const payload = {
      appId, year: YEAR,
      who: selected.name, email: selected.email,
      rankings: rankings.slice().sort((a,b)=>a.rank-b.rank),
      ts: serverTimestamp(),
      isAdmin
    };
    try {
      await setDoc(doc(db, "prefs_single_rank", `${YEAR}-${selected.name}`), payload);
      alert("Saved to Firestore.");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  /* -------------------- Collapsible wrapper -------------------- */
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

  /* -------------------- Inline near-cursor service picker -------------------- */
  const [svcPick, setSvcPick] = useState(null); // {x,y,date,onChoose}
  const pickerRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!svcPick) return;
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setSvcPick(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [svcPick]);

  function showSvcPickerAt(ev, date, onChoose) {
    const open = servicesOpenFor(date);
    if (open.length <= 1) { onChoose(open[0]); return; }
    const rectX = ev.clientX, rectY = ev.clientY;
    setSvcPick({ x: rectX + 6, y: rectY + 6, date, onChoose });
  }

  /* -------------------- Calendar (one-click service, no modal) -------------------- */
  function CalendarMode() {
    return (
      <div className="months">
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            <div className="days">
              {months[mk].map((d) => {
                const open = servicesOpenFor(d.date);
                const taken = d.isTaken || open.length === 0;
                const onClick = (ev, svc) => {
                  if (taken) return;
                  add(d.date, svc);
                };
                const onSmartClick = (ev) => {
                  if (taken) return;
                  showSvcPickerAt(ev, d.date, (svc) => add(d.date, svc));
                };
                return (
                  <div key={`${d.date}-${d.rni??"x"}-${d.coa??"x"}`} className={`day ${taken ? "is-disabled" : ""}`}>
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    <div className="svc-actions">
                      {/* “Smart” button (auto-picks if only one open, else near-cursor chooser) */}
                      <button className="btn btn-svc" disabled={taken} onClick={onSmartClick}>
                        Pick service → Add
                      </button>
                      {/* Direct service buttons (reduce clicks) */}
                      {open.includes(SERVICES.RNI) && (
                        <button className="btn btn-svc" disabled={taken} onClick={(e)=>onClick(e,SERVICES.RNI)}>RNI</button>
                      )}
                      {open.includes(SERVICES.COA) && (
                        <button className="btn btn-svc" disabled={taken} onClick={(e)=>onClick(e,SERVICES.COA)}>COA</button>
                      )}
                      {open.length === 0 && <Pill tone="muted">Full</Pill>}
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

  /* -------------------- QuickAdd (single list) -------------------- */
  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const onAdd = () => {
      if (!date) return;
      if (!service) {
        const open = servicesOpenFor(date);
        if (open.length === 1) add(date, open[0]);
        return;
      }
      add(date, service);
    };
    return (
      <div className="row wrap gap">
        <select className="select" value={mkey} onChange={(e) => setMkey(e.target.value)}>
          {MONTH_KEYS.map((mk, i) => (<option key={mk} value={mk}>{MONTH_FULL[i]}</option>))}
        </select>
        <select className="select" value={date} onChange={(e) => setDate(e.target.value)}>
          <option value="">Pick Saturday</option>
          {saturdays.map((d) => (
            <option key={d.date} value={d.date} disabled={servicesOpenFor(d.date).length===0}>
              {fmtLabel(d.date)}{servicesOpenFor(d.date).length===0 ? " (full)" : ""}
            </option>
          ))}
        </select>
        <select className="select" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Pick service</option>
          {(date ? servicesOpenFor(date) : [SERVICES.RNI, SERVICES.COA]).map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <button className="btn btn-green" onClick={onAdd}>Add</button>
      </div>
    );
  }

  /* -------------------- RankBoard (compact list; one-click per service) -------------------- */
  function RankBoardMode() {
    return (
      <div className="rb-list">
        <div className="muted" style={{marginBottom:8}}>Click a service to add. #1 is most preferred. Drag in the Rankings panel to reorder.</div>
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            {months[mk].map((d) => {
              const open = servicesOpenFor(d.date);
              const disabled = d.isTaken || open.length === 0;
              return (
                <div key={`${d.date}-${d.rni??"x"}-${d.coa??"x"}`} className="rb-row">
                  <div className="rb-date">
                    <div className="rb-label">{fmtLabel(d.date)}</div>
                    {d.detail && <div className="rb-detail">{d.detail}</div>}
                  </div>
                  <div className="rb-actions">
                    {open.includes(SERVICES.RNI) && <button className="btn btn-svc" disabled={disabled} onClick={()=>add(d.date,SERVICES.RNI)}>RNI</button>}
                    {open.includes(SERVICES.COA) && <button className="btn btn-svc" disabled={disabled} onClick={()=>add(d.date,SERVICES.COA)}>COA</button>}
                    {open.length===0 && <Pill tone="muted">Full</Pill>}
                  </div>
                </div>
              );
            })}
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  /* -------------------- DragBuckets
     - Chips in left pane
     - Drag to Rankings bucket
     - If both services open, near-cursor picker appears exactly where dropped
  -------------------- */
  function DragBucketsMode() {
    const [dragging, setDragging] = useState(null); // {date}
    const availableByMonth = useMemo(() => {
      const takenDates = new Set(rankings.map(r => r.date)); // hide already chosen
      return MONTH_KEYS.map((mk, i) => ({
        mkey: mk, label: MONTH_FULL[i],
        items: months[mk]
          .filter(d => !d.isTaken && !takenDates.has(d.date) && servicesOpenFor(d.date).length>0)
          .map(d => ({ date: d.date }))
      }));
    }, [rankings]);

    const onDropToRankings = (ev) => {
      ev.preventDefault();
      if (!dragging) return;
      // show near-cursor picker if both open
      const open = servicesOpenFor(dragging.date);
      if (open.length === 1) add(dragging.date, open[0]);
      else showSvcPickerAt(ev, dragging.date, (svc)=> add(dragging.date, svc));
      setDragging(null);
    };

    return (
      <div className="drag-grid">
        <div>
          <div className="muted">Drag a date chip into Rankings. If both services are open you’ll get a picker near your cursor.</div>
          {availableByMonth.map(group => (
            <div key={group.mkey} className="chip-group">
              <div className="chip-title">{group.label}</div>
              <div className="chip-row">
                {group.items.map(it => (
                  <div
                    key={it.date}
                    draggable
                    onDragStart={() => setDragging({ date: it.date })}
                    onDragEnd={() => setDragging(null)}
                    className="chip"
                    title="Drag into Rankings"
                  >
                    {fmtLabel(it.date)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="bucket"
          style={{ background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:12, padding:12, minHeight:200 }}
          onDragOver={(e)=>e.preventDefault()}
          onDrop={onDropToRankings}
        >
          <div className="bucket-title" style={{fontWeight:700, marginBottom:8}}>Rankings (drag to reorder)</div>
          <RankingsList rankings={rankings} remove={remove} reorder={(a,b)=>dispatch({type:"reorder", fromIndex:a, toIndex:b})} />
        </div>
      </div>
    );
  }

  /* -------------------- Rankings list (shared, draggable reorder) -------------------- */
  function RankingsList({ rankings, remove, reorder }) {
    const [dragIdx, setDragIdx] = useState(null);
    const onDragStart = (i) => setDragIdx(i);
    const onDrop = (i) => {
      if (dragIdx === null) return;
      reorder(dragIdx, i);
      setDragIdx(null);
    };
    const ordered = rankings.slice().sort((a,b)=>a.rank-b.rank);

    return (
      <ol className="bucket-list" style={{ listStyle:"none", margin:0, padding:0 }}>
        {ordered.map((x, i) => (
          <li
            key={`${x.date}-${x.service}`}
            className="bucket-item"
            draggable
            onDragStart={()=>onDragStart(i)}
            onDragOver={(e)=>e.preventDefault()}
            onDrop={()=>onDrop(i)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px dashed #e5e7eb" }}
            title="Drag to change rank"
          >
            <span>#{i+1} — {fmtLabel(x.date)} ({x.service})</span>
            <button className="btn-link" onClick={()=>remove(x.date, x.service)}>remove</button>
          </li>
        ))}
      </ol>
    );
  }

  /* -------------------- Top bar -------------------- */
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
        <button className="btn" onClick={()=>downloadCSV()}>Download CSV</button>
        <button className="btn btn-green" onClick={openConfirm}>Submit</button>
      </div>
    </div>
  );

  /* -------------------- Login (code gate) -------------------- */
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
          placeholder="Paste code (e.g., UAB26-XXXXXX)"
          value={gateCode}
          onChange={(e) => setGateCode(e.target.value.trim())}
        />
        <button
          className="btn btn-green"
          onClick={() => {
            const code = ATTENDING_CODES[gateEmail];
            const ok = code && gateCode && gateCode.toUpperCase() === code.toUpperCase();
            if (!ok) { setGateErr("Invalid code or attendee."); return; }
            const att = ATTENDINGS.find(a => a.email === gateEmail);
            setGateErr(""); setMe(att.name);
          }}
        >
          Verify & Continue
        </button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted">Tip: your name selector locks after verification.</div>
    </div>
  );

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
                  {mode === MODES.CAL && <CalendarMode />}
                  {mode === MODES.QA  && <QuickAddMode />}
                  {mode === MODES.RB  && <RankBoardMode />}
                  {mode === MODES.DB  && <DragBucketsMode />}
                </>
              )}
            </Section>
          </div>
          <aside className="side">
            <Section
              title="Rankings (single list)"
              right={<button className="btn-link" onClick={clearAll}>Clear all</button>}
            >
              <RankingsList
                rankings={rankings}
                remove={remove}
                reorder={(a,b)=>dispatch({type:"reorder", fromIndex:a, toIndex:b})}
              />
              <div className="helper" style={{marginTop:8}}>
                #1 is most preferred. You can’t select both services on the same weekend. Drag to reorder; ranks renumber automatically.
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

      {/* near-cursor service picker */}
      {svcPick && (
        <div
          ref={pickerRef}
          style={{
            position:"fixed", left:svcPick.x, top:svcPick.y, zIndex:1000,
            background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, padding:8,
            boxShadow:"0 10px 24px rgba(0,0,0,.12)"
          }}
        >
          <div style={{fontWeight:700, marginBottom:6}}>{fmtLabel(svcPick.date)}</div>
          {servicesOpenFor(svcPick.date).map(s => (
            <button key={s} className="btn btn-svc" onClick={()=>{ svcPick.onChoose(s); setSvcPick(null); }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* confirm before submit: nudge to download & verify */}
      {confirmOpen && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-title" style={{fontWeight:700, marginBottom:8}}>Download & verify your CSV</div>
            <p className="muted" style={{marginBottom:12}}>
              Please <strong>download the CSV</strong> and verify your name, dates, services, and ranks are correct.
              When you’re satisfied, click <strong>Submit to Firestore</strong>.
            </p>
            <div className="row right gap">
              <button className="btn" onClick={()=>downloadCSV()}>Download CSV</button>
              <button className="btn btn-green" onClick={actuallySubmit}>Submit to Firestore</button>
              <button className="btn" onClick={()=>setConfirmOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
