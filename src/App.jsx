import React, { useEffect, useMemo, useReducer, useState, useCallback, useRef } from "react";
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
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v16.0";

/* =========================================================
   CONSTANTS + DATA (unchanged content)
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

/* =========================================================
   CALENDAR DATA (same structure)
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
   HELPERS
========================================================= */
const fmtLabel = (dateStr) => {
  const [_, m, d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${parseInt(d,10)}`;
};
const getAvailableServicesForDate = (date) => {
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
};

/* =========================================================
   STATE (single Rankings list)
   Invariants:
   - Only one entry per DATE total (choose either RNI or COA).
   - No duplicate date+service.
   - Ranks compress to 1..N on every change.
========================================================= */
const initialState = { rankings: [] };

function compressRanks(list) {
  const sorted = [...list].sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999));
  return sorted.map((x, i) => ({ ...x, rank: i+1 }));
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service } = action;
      if (!service) return state;
      if (state.rankings.some(r => r.date === date)) return state; // block both services on same weekend
      if (state.rankings.some(r => r.date === date && r.service === service)) return state;
      const next = [...state.rankings, { date, service, rank: (state.rankings.length + 1) }];
      return { rankings: compressRanks(next) };
    }
    case "remove": {
      const next = state.rankings.filter(r => !(r.date === action.date && r.service === action.service));
      return { rankings: compressRanks(next) };
    }
    case "reorder": {
      const { fromIndex, toIndex } = action;
      if (fromIndex === toIndex) return state;
      const arr = [...state.rankings];
      if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) return state;
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return { rankings: compressRanks(arr) };
    }
    case "clear":
      return initialState;
    default:
      return state;
  }
}

/* =========================================================
   Small atoms
========================================================= */
const Pill = ({children}) => <span className="pill">{children}</span>;

const DragHandle = () => (
  <span
    style={{
      width: 18, height: 22, display:"inline-flex", alignItems:"center",
      justifyContent:"center", marginRight: 8, cursor:"grab", color:"#94a3b8",
      userSelect:"none"
    }}
    aria-label="drag"
    title="Drag to reorder"
  >
    ⋮⋮
  </span>
);

/* Simple inline popover used by DragBuckets to pick a service near cursor */
function InlineServicePopover({ x, y, date, onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  const avail = getAvailableServicesForDate(date);
  return (
    <div
      ref={ref}
      style={{
        position:"fixed", top: y + 8, left: x + 8, zIndex: 9999,
        background:"#fff", border:"1px solid #e5e7eb", borderRadius: 10,
        padding: 8, boxShadow:"0 10px 30px rgba(0,0,0,0.12)"
      }}
    >
      <div style={{fontWeight:700, fontSize:12, marginBottom:6}}>
        {fmtLabel(date)} — Pick service
      </div>
      <div style={{display:"flex", gap:8}}>
        {avail.includes(SERVICES.RNI) && (
          <button className="btn btn-green" onClick={() => onPick(SERVICES.RNI)}>RNI</button>
        )}
        {avail.includes(SERVICES.COA) && (
          <button className="btn btn-amber" onClick={() => onPick(SERVICES.COA)}>COA</button>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */
export default function App() {
  const app = useMemo(() => initializeApp(firebaseConfig), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db   = useMemo(() => getFirestore(app), [app]);

  // Auth (anon)
  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  // Name gate via codes
  const [me, setMe] = useState("");
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode]   = useState("");
  const [gateErr, setGateErr]     = useState("");

  const selected = useMemo(() => ATTENDINGS.find(a => a.name === me) || null, [me]);
  const isAdmin = useMemo(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      return q.get("admin") === "1" && selected?.email === ADMIN_EMAIL;
    } catch { return false; }
  }, [selected]);

  // Modes
  const [mode, setMode] = useState(MODES.RB);

  // Rankings state (single list)
  const [{ rankings }, dispatch] = useReducer(reducer, initialState);

  const add = useCallback((date, service) => dispatch({ type: "add", date, service }), []);
  const remove = useCallback((date, service) => dispatch({ type: "remove", date, service }), []);
  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // ---- Drag & drop reorder (ONLY for rankings list) ----
  const dragIndex = useRef(null);
  const onDragStartItem = (i) => (e) => {
    dragIndex.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOverItem = (i) => (e) => {
    // Needed so drop fires in most browsers
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDropItem = (i) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    const to = i;
    if (from != null && to != null) {
      dispatch({ type: "reorder", fromIndex: from, toIndex: to });
    }
    dragIndex.current = null;
  };

  // CSV download (unchanged)
  const downloadCSV = () => {
    if (!selected) { alert("Verify your name/code first."); return; }
    const rows = compressRanks(rankings).map(r => ({
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
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // Submit (unchanged prompt flow)
  const submit = async () => {
    if (!selected) { alert("Log in with your code first."); return; }
    const proceed = window.confirm(
      "Please click OK to download and verify your CSV preview of rankings.\n" +
      "After reviewing, click OK again on the next prompt to save to the server."
    );
    if (!proceed) return;
    downloadCSV();
    const sure = window.confirm("Have you verified the CSV is accurate?\nClick OK to save to the server.");
    if (!sure) return;

    const payload = {
      appId,
      title: "UAB/COA Weekend Attending Scheduler 2026",
      year: YEAR,
      who: selected.name,
      email: selected.email,
      rankings: compressRanks(rankings),
      ts: serverTimestamp(),
      isAdmin
    };
    try {
      await setDoc(doc(db, "prefs", `${YEAR}-${selected.name}`), payload);
      alert("Saved to Firestore.");
    } catch (e) { console.error(e); alert("Failed to save."); }
  };

  /* ---------- shared bits (unchanged) ---------- */
  function CollapsibleMonth({ title, children, defaultCollapsed = true }) {
    const [open, setOpen] = useState(!defaultCollapsed);
    return (
      <div className="month">
        <button className="month-toggle" onClick={()=> setOpen(o=> !o)}>
          <span className="chev">{open ? "▾" : "▸"}</span>
          <span className="month-title">{title}</span>
        </button>
        {open && children}
      </div>
    );
  }
  const peerKey = (d) => `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`;

  /* ---------- Modes with one-click service buttons (unchanged) ---------- */
  function CalendarMode() {
    return (
      <div className="months">
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            <div className="days">
              {months[mk].map((d) => {
                const avail = getAvailableServicesForDate(d.date);
                const disabled = d.isTaken || avail.length === 0;
                const alreadyHasThisDate = rankings.some(r => r.date === d.date);
                const block = disabled || alreadyHasThisDate;
                return (
                  <div key={peerKey(d)} className={`day ${disabled ? "is-disabled" : ""}`}>
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    <div className="svc-actions">
                      {avail.includes(SERVICES.RNI) && (
                        <button className="btn btn-svc" disabled={block} onClick={()=> add(d.date, SERVICES.RNI)}>
                          RNI → Rank
                        </button>
                      )}
                      {avail.includes(SERVICES.COA) && (
                        <button className="btn btn-svc" disabled={block} onClick={()=> add(d.date, SERVICES.COA)}>
                          COA → Rank
                        </button>
                      )}
                      {avail.length === 0 && <Pill>Full</Pill>}
                      {alreadyHasThisDate && <Pill>Picked</Pill>}
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

  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const onAdd = () => add(date, service || null);
    return (
      <div className="row wrap gap">
        <select className="select" value={mkey} onChange={(e)=> setMkey(e.target.value)}>
          {MONTH_KEYS.map((mk, i)=> (<option key={mk} value={mk}>{MONTH_FULL[i]}</option>))}
        </select>
        <select className="select" value={date} onChange={(e)=> setDate(e.target.value)}>
          <option value="">Pick Saturday</option>
          {saturdays.map((d) => (
            <option key={d.date} value={d.date} disabled={d.isTaken}>
              {fmtLabel(d.date)}{d.isTaken ? " (full)" : ""}
            </option>
          ))}
        </select>
        <select className="select" value={service} onChange={(e)=> setService(e.target.value)}>
          <option value="">Pick service</option>
          {(date ? getAvailableServicesForDate(date) : [SERVICES.RNI, SERVICES.COA]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-green" onClick={onAdd}>Add</button>
      </div>
    );
  }

  function RankBoardMode() {
    const Row = (d) => {
      const avail = getAvailableServicesForDate(d.date);
      const disabled = d.isTaken || avail.length === 0 || rankings.some(r => r.date === d.date);
      return (
        <div key={peerKey(d)} className="rb-row">
          <div>
            <div className="rb-label">{fmtLabel(d.date)}</div>
            {d.detail && <div className="rb-detail">{d.detail}</div>}
          </div>
          <div className="rb-actions">
            {avail.includes(SERVICES.RNI) && (
              <button className="btn btn-svc" disabled={disabled} onClick={()=> add(d.date, SERVICES.RNI)}>RNI → Rank</button>
            )}
            {avail.includes(SERVICES.COA) && (
              <button className="btn btn-svc" disabled={disabled} onClick={()=> add(d.date, SERVICES.COA)}>COA → Rank</button>
            )}
            {avail.length===0 && <Pill>Full</Pill>}
            {rankings.some(r => r.date === d.date) && <Pill>Picked</Pill>}
          </div>
        </div>
      );
    };
    return (
      <div className="rb-list">
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            {months[mk].map(Row)}
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  function DragBucketsMode() {
    // Inline popover for service selection near pointer
    const [pop, setPop] = useState(null); // { x, y, date }
    const chosenDates = new Set(rankings.map(r => r.date));
    const groups = MONTH_KEYS.map((mk, i) => ({
      key: mk,
      title: MONTH_FULL[i],
      items: months[mk].filter(d => !d.isTaken && !chosenDates.has(d.date))
    }));

    const onDragStartChip = (date) => (e) => {
      e.dataTransfer.setData("text/plain", date);
      e.dataTransfer.effectAllowed = "move";
    };
    const onDropIntoRankings = (e) => {
      e.preventDefault();
      const date = e.dataTransfer.getData("text/plain");
      if (!date) return;
      const avail = getAvailableServicesForDate(date);
      // If both open, pop a picker near cursor
      if (avail.length > 1) {
        setPop({ x: e.clientX, y: e.clientY, date });
      } else if (avail.length === 1) {
        add(date, avail[0]);
      }
    };

    return (
      <div className="drag-grid">
        <div>
          {groups.map(g => (
            <div key={g.key} className="chip-group">
              <div className="chip-title">{g.title}</div>
              <div className="chip-row">
                {g.items.map(d => (
                  <div
                    key={d.date}
                    draggable
                    onDragStart={onDragStartChip(d.date)}
                    className="chip"
                    title="Drag into Rankings"
                  >
                    {fmtLabel(d.date)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rankings bucket (drop target) */}
        <div
          className="bucket"
          onDragOver={(e)=> { e.preventDefault(); e.dataTransfer.dropEffect="move"; }}
          onDrop={onDropIntoRankings}
        >
          <div className="bucket-title">Rankings (drag to reorder)</div>
          <ol className="bucket-list">
            {compressRanks(rankings).map((r, idx) => (
              <li
                key={`${r.date}-${r.service}`}
                className="bucket-item"
                draggable
                onDragStart={onDragStartItem(idx)}
                onDragOver={onDragOverItem(idx)}
                onDrop={onDropItem(idx)}
                style={{
                  display:"flex", alignItems:"center", gap: 8, padding:"8px 6px",
                  border:"1px solid #e5e7eb", borderRadius: 10, marginBottom: 6, background:"#fff"
                }}
                title="Drag to reorder"
              >
                <DragHandle/>
                <span style={{fontWeight:700, minWidth: 28}}>#{r.rank}</span>
                <span style={{flex:1}}>{fmtLabel(r.date)} ({r.service})</span>
                <button className="btn-link" onClick={()=> remove(r.date, r.service)}>remove</button>
              </li>
            ))}
          </ol>
        </div>

        {pop && (
          <InlineServicePopover
            x={pop.x}
            y={pop.y}
            date={pop.date}
            onPick={(svc)=> { add(pop.date, svc); setPop(null); }}
            onClose={()=> setPop(null)}
          />
        )}
      </div>
    );
  }

  /* ---------- Topbar + Right pane ---------- */
  const loginPanel = (
    <div className="login">
      <div className="login-title">Enter your one-time code</div>
      <div className="id-row">
        <select className="id-select" value={gateEmail} onChange={(e)=> setGateEmail(e.target.value)}>
          <option value="">Select your name</option>
          {ATTENDINGS.map(a => <option key={a.email} value={a.email}>{a.name} — {a.email}</option>)}
        </select>
        <input
          className="id-select"
          placeholder="Paste code (e.g., UAB26-XXXXXX)"
          value={gateCode}
          onChange={(e)=> setGateCode(e.target.value.trim())}
        />
        <button
          className="btn btn-green"
          onClick={()=> {
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
    </div>
  );

  return (
    <div className="page">
      <div className="band"/>
      <div className="container">
        <div className="topbar">
          <div className="topbar-inner">
            <strong>UAB/COA Weekend Attending Scheduler 2026</strong>
            <div className="spacer"/>
            <select className="select" value={mode} onChange={(e)=> setMode(e.target.value)}>
              <option value={MODES.CAL}>Calendar</option>
              <option value={MODES.QA}>QuickAdd</option>
              <option value={MODES.RB}>RankBoard</option>
              <option value={MODES.DB}>DragBuckets</option>
            </select>
            <span className="badge" style={{marginLeft:8}}>
              {firebaseConfig.projectId}{isAdmin ? " — ADMIN" : ""}
            </span>
            <button className="btn" style={{marginLeft:8}} onClick={submit}>Submit</button>
          </div>
        </div>

        <div className="content">
          <div className="main">
            <section className="section">
              <div className="section-head">
                <h3 className="section-title">{mode}</h3>
                <div className="section-right">
                  <button className="btn btn-green" onClick={downloadCSV}>Download CSV</button>
                </div>
              </div>
              <div className="section-body">
                {!me ? (
                  loginPanel
                ) : (
                  <>
                    {mode === MODES.CAL && <CalendarMode/>}
                    {mode === MODES.QA  && <QuickAddMode/>}
                    {mode === MODES.RB  && <RankBoardMode/>}
                    {mode === MODES.DB  && <DragBucketsMode/>}
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="side">
            <section className="section">
              <div className="section-head">
                <h3 className="section-title">Rankings (1 = most preferred)</h3>
                <div className="section-right">
                  <button className="btn-link" onClick={clearAll}>Clear all</button>
                </div>
              </div>
              <div className="section-body">
                <ol className="preview-list" style={{margin:0, padding:0, listStyle:"none"}}>
                  {compressRanks(rankings).map((r, idx)=> (
                    <li
                      key={`${r.date}-${r.service}`}
                      draggable
                      onDragStart={onDragStartItem(idx)}
                      onDragOver={onDragOverItem(idx)}
                      onDrop={onDropItem(idx)}
                      style={{
                        display:"flex", alignItems:"center", gap:8, padding:"8px 6px",
                        border:"1px solid #e5e7eb", borderRadius:10, marginBottom:6, background:"#fff"
                      }}
                      title="Drag to reorder"
                    >
                      <DragHandle/>
                      <span style={{fontWeight:700, minWidth:28}}>#{r.rank}</span>
                      <span style={{flex:1}}>{fmtLabel(r.date)} ({r.service})</span>
                      <button className="btn-link" onClick={()=> remove(r.date, r.service)}>remove</button>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <h3 className="section-title">Who</h3>
              </div>
              <div className="section-body">
                <div className="id-row">
                  <select className="id-select" value={me} onChange={(e)=> setMe(e.target.value)} disabled={!me}>
                    {!me && <option value="">(locked after login)</option>}
                    {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
                  </select>
                  {me && <span className="muted">{ATTENDINGS.find(a => a.name === me)?.email}</span>}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
      <div className="band"/>
    </div>
  );
}
