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
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v16-single-rank";

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
   CALENDAR (SATURDAYS OF 2026)
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
   HELPERS — Single list (prefs) + invariants
   - Single list of {date, service, rank}
   - Only one service per date total (no duplicates; no RNI+COA same date)
   - Ranks compress to 1..N after any add/remove
   - Higher rank number = MORE preferred
========================================================= */
function compressRanks(list) {
  const byRank = [...list].sort((a,b) => (a.rank??999) - (b.rank??999));
  return byRank.map((x, i) => ({ ...x, rank: i + 1 })); // 1..N; largest N = most preferred
}
function nextRank(list) { return list.length ? Math.max(...list.map(x => x.rank ?? 0)) + 1 : 1; }
function hasDate(list, date) { return list.some(x => x.date === date); }
function hasExact(list, date, service) { return list.some(x => x.date === date && x.service === service); }
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
  return [SERVICES.RNI, SERVICES.COA];
}
function fmt(dateStr) {
  const [y,m,d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}

/* =========================================================
   STATE (single list)
========================================================= */
const initialState = { prefs: [] };
function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service, rank } = action;
      if (!service) return state;
      // Invariant 1: one service per date total
      if (hasDate(state.prefs, date)) return state;
      // Invariant 2: no duplicates
      if (hasExact(state.prefs, date, service)) return state;
      const added = [...state.prefs, { date, service, rank: rank ?? nextRank(state.prefs) }];
      return { prefs: compressRanks(added) };
    }
    case "remove": {
      const filtered = state.prefs.filter(x => !(x.date === action.date && x.service === action.service));
      return { prefs: compressRanks(filtered) };
    }
    case "clear":
      return initialState;
    default:
      return state;
  }
}

/* =========================================================
   UI atoms
========================================================= */
function Section({ title, right, children }) {
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
function Pill({ children, tone="default" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/* =========================================================
   APP
========================================================= */
export default function App() {
  // Firebase init
  const app = useMemo(() => initializeApp(firebaseConfig), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db   = useMemo(() => getFirestore(app), [app]);

  // Auth anon
  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (u) setUid(u.uid); else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  // Name/code gate
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

  // Mode + prefs
  const [mode, setMode] = useState(MODES.RB);
  const [{ prefs }, dispatch] = useReducer(reducer, initialState);

  // Add/remove helpers
  const addPref = useCallback((date, service) => {
    if (!service) return;
    const avail = getAvailableServicesForDate(date);
    if (!avail.includes(service)) return;
    dispatch({ type: "add", date, service });
  }, []);
  const removePref = useCallback((date, service) => dispatch({ type: "remove", date, service }), []);
  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // CSV download (name, date, service, rank) — higher number = more preferred
  const downloadCSV = () => {
    if (!selected) { alert("Please verify your name/code first."); return; }
    const rows = [...prefs].sort((a,b) => a.rank - b.rank).map(r => ({
      name: selected.name,
      date: r.date,
      service: r.service,
      rank: r.rank
    }));
    const headers = ["name","date","service","rank"];
    const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
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

  // Submit flow: ask to download CSV & verify first
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmitClick = () => {
    if (!selected) { alert("Log in with your code first."); return; }
    setShowSubmitPrompt(true);
  };
  const proceedSave = async () => {
    setIsSaving(true);
    const payload = {
      appId, year: YEAR,
      who: selected.name,
      email: selected.email,
      prefs: compressRanks(prefs),
      meaning: "Higher rank number = more preferred",
      ts: serverTimestamp(),
      isAdmin
    };
    try {
      await setDoc(doc(db, "prefs_single", `${YEAR}-${selected.name}`), payload);
      alert("Saved to Firestore.");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
      setShowSubmitPrompt(false);
    }
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

  /* -------------------- Common utils -------------------- */
  const peerKey = (d) => `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`;

  /* -------------------- Calendar (one-click service add) -------------------- */
  function CalendarMode() {
    const onClickSvc = (d, svc) => {
      if (d.isTaken) return;
      addPref(d.date, svc);
    };
    return (
      <div className="months">
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            <div className="days">
              {months[mk].map((d) => {
                const avail = getAvailableServicesForDate(d.date);
                return (
                  <div key={peerKey(d)} className={`day ${d.isTaken ? "is-disabled" : ""}`}>
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmt(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    <div className="svc-actions">
                      {avail.includes(SERVICES.RNI) && (
                        <button className="btn btn-svc" onClick={() => onClickSvc(d, SERVICES.RNI)}>RNI → Rank+</button>
                      )}
                      {avail.includes(SERVICES.COA) && (
                        <button className="btn btn-svc" onClick={() => onClickSvc(d, SERVICES.COA)}>COA → Rank+</button>
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

  /* -------------------- QuickAdd -------------------- */
  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const saturdays = months[mkey];
    return (
      <div className="row wrap gap">
        <select className="select" value={mkey} onChange={(e)=>setMkey(e.target.value)}>
          {MONTH_KEYS.map((mk,i)=>(<option key={mk} value={mk}>{MONTH_FULL[i]}</option>))}
        </select>
        <select className="select" value={date} onChange={(e)=>setDate(e.target.value)}>
          <option value="">Pick Saturday</option>
          {saturdays.map(d=>(
            <option key={d.date} value={d.date} disabled={d.isTaken}>
              {fmt(d.date)}{d.isTaken ? " (full)" : ""}
            </option>
          ))}
        </select>
        <select className="select" value={service} onChange={(e)=>setService(e.target.value)}>
          <option value="">Pick service</option>
          {(date ? getAvailableServicesForDate(date) : [SERVICES.RNI, SERVICES.COA]).map(s=>(
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-green" onClick={()=>addPref(date, service)}>Add</button>
      </div>
    );
  }

  /* -------------------- RankBoard (compact list, one-click add) -------------------- */
  function RankBoardMode() {
    const Row = (d) => {
      const avail = getAvailableServicesForDate(d.date);
      return (
        <div key={peerKey(d)} className="rb-row">
          <div>
            <div className="rb-label">{fmt(d.date)}</div>
            {d.detail && <div className="rb-detail">{d.detail}</div>}
          </div>
          <div className="rb-actions">
            {avail.includes(SERVICES.RNI) && (
              <button className="btn btn-svc" onClick={()=>addPref(d.date, SERVICES.RNI)}>RNI → Rank+</button>
            )}
            {avail.includes(SERVICES.COA) && (
              <button className="btn btn-svc" onClick={()=>addPref(d.date, SERVICES.COA)}>COA → Rank+</button>
            )}
            {avail.length === 0 && <Pill tone="muted">Full</Pill>}
          </div>
        </div>
      );
    };
    return (
      <div className="rb-list">
        <div className="muted" style={{marginBottom:8}}>Higher rank number = more preferred. Click a service to add.</div>
        {MONTH_KEYS.map((mk,i)=>(
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            {months[mk].map(Row)}
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  /* -------------------- DragBuckets (choose service when both open) -------------------- */
  function DragBucketsMode() {
    const [drag, setDrag] = useState(null);           // { date }
    const [svcPick, setSvcPick] = useState(null);     // { date, target: "add" }
    const [svcChoice, setSvcChoice] = useState("");

    const chips = useMemo(() => {
      const chosenDates = new Set(prefs.map(x => x.date));
      return MONTH_KEYS.map((mk, i) => ({
        mkey: mk,
        label: MONTH_FULL[i],
        items: months[mk]
          .filter(d => !d.isTaken && !chosenDates.has(d.date))
          .map(d => ({ date: d.date }))
      }));
    }, [prefs]);

    const dropToAdd = () => {
      if (!drag) return;
      const avail = getAvailableServicesForDate(drag.date);
      if (avail.length === 0) return;
      if (avail.length === 1) {
        addPref(drag.date, avail[0]);
      } else {
        setSvcPick({ date: drag.date, target: "add" });
      }
      setDrag(null);
    };

    const confirmSvc = () => {
      if (!svcPick || !svcChoice) return;
      addPref(svcPick.date, svcChoice);
      setSvcPick(null); setSvcChoice("");
    };

    return (
      <div className="drag-grid">
        <div>
          <div className="muted">Drag an available Saturday into the bucket to add a preference. (If both services open, you’ll be asked to choose.)</div>
          {chips.map(group=>(
            <div key={group.mkey} className="chip-group">
              <div className="chip-title">{group.label}</div>
              <div className="chip-row">
                {group.items.map(it=>(
                  <div
                    key={it.date}
                    draggable
                    onDragStart={()=>setDrag({ date: it.date })}
                    className="chip"
                  >{fmt(it.date)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bucket"
             onDragOver={(e)=>e.preventDefault()}
             onDrop={dropToAdd}
        >
          <div className="bucket-title">Your Ranked Preferences (higher rank number = more preferred)</div>
          <ol className="bucket-list">
            {compressRanks(prefs).map(x=>(
              <li key={`${x.date}-${x.service}`} className="bucket-item">
                <span>#{x.rank} — {fmt(x.date)} ({x.service})</span>
                <button className="btn-link" onClick={()=>removePref(x.date, x.service)}>remove</button>
              </li>
            ))}
          </ol>
        </div>

        {svcPick && (
          <div className="modal">
            <div className="modal-card">
              <div className="modal-title">{fmt(svcPick.date)}</div>
              <select className="select" value={svcChoice} onChange={(e)=>setSvcChoice(e.target.value)}>
                <option value="">Pick service</option>
                {getAvailableServicesForDate(svcPick.date).map(s=>(
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <div className="row right gap" style={{marginTop:8}}>
                <button className="btn" onClick={()=>{ setSvcPick(null); setSvcChoice(""); }}>Cancel</button>
                <button className="btn btn-green" onClick={confirmSvc}>Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* -------------------- Topbar -------------------- */
  const topBar = (
    <div className="topbar">
      <div className="topbar-inner">
        <select className="select" value={mode} onChange={(e)=>setMode(e.target.value)}>
          <option value={MODES.CAL}>Calendar</option>
          <option value={MODES.QA}>QuickAdd</option>
          <option value={MODES.RB}>RankBoard</option>
          <option value={MODES.DB}>DragBuckets</option>
        </select>
        <div className="spacer" />
        <span className="badge">{firebaseConfig.projectId}{isAdmin ? " — ADMIN" : ""}</span>
        <button className="btn" onClick={handleSubmitClick}>Submit</button>
      </div>
    </div>
  );

  /* -------------------- Login (code gate) -------------------- */
  const loginPanel = (
    <div className="login">
      <div className="login-title">Enter your one-time code</div>
      <div className="id-row">
        <select className="id-select" value={gateEmail} onChange={(e)=>setGateEmail(e.target.value)}>
          <option value="">Select your name</option>
          {ATTENDINGS.map(a=>(
            <option key={a.email} value={a.email}>{a.name} — {a.email}</option>
          ))}
        </select>
        <input
          className="id-select"
          placeholder="Paste code (e.g., UAB26-XXXXXX)"
          value={gateCode}
          onChange={(e)=>setGateCode(e.target.value.trim())}
        />
        <button
          className="btn btn-green"
          onClick={()=>{
            const code = ATTENDING_CODES[gateEmail];
            const ok = code && gateCode && gateCode.toUpperCase() === code.toUpperCase();
            if (!ok) { setGateErr("Invalid code or attendee."); return; }
            const att = ATTENDINGS.find(a => a.email === gateEmail);
            setGateErr(""); setMe(att.name);
          }}
        >Verify & Continue</button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted">Tip: your name locks after verification.</div>
    </div>
  );

  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        {topBar}
        <div className="content">
          <div className="main">
            <Section title={mode} right={selected && <button className="btn btn-green" onClick={downloadCSV}>Download CSV</button>}>
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
            <Section title="Live Preview" right={<button className="btn-link" onClick={clearAll}>Clear all</button>}>
              <div className="preview">
                <div>
                  <div className="preview-title">Your ranked preferences</div>
                  <ol className="preview-list">
                    {compressRanks(prefs).map(x=>(
                      <li key={`${x.date}-${x.service}`} className="preview-item">
                        <span>#{x.rank} — {fmt(x.date)} ({x.service})</span>
                        <button className="btn-link" onClick={()=>removePref(x.date, x.service)}>remove</button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="helper">
                Rules: Only one pick per weekend (no RNI+COA on same date). Higher rank number = more preferred. Ranks re-compress after removals.
              </div>
            </Section>

            <Section title="Who">
              <div className="id-row">
                <select className="id-select" value={me} onChange={(e)=>setMe(e.target.value)} disabled={!me}>
                  {!me && <option value="">(locked after login)</option>}
                  {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
                </select>
                {me && <span className="muted">{ATTENDINGS.find(a=>a.name===me)?.email}</span>}
              </div>
            </Section>
          </aside>
        </div>
      </div>
      <div className="band" />

      {/* Submit prompt: ask to download CSV & verify before saving */}
      {showSubmitPrompt && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-title">Review your preferences</div>
            <p className="muted" style={{marginBottom:8}}>
              Please <strong>download the CSV</strong> and quickly verify that your name, dates, services, and ranks are correct.
              When you’re satisfied, click <strong>Proceed to Save</strong>.
            </p>
            <div className="row right gap">
              <button className="btn" onClick={()=>setShowSubmitPrompt(false)}>Cancel</button>
              <button className="btn" onClick={downloadCSV}>Download CSV</button>
              <button className="btn btn-green" disabled={isSaving} onClick={proceedSave}>
                {isSaving ? "Saving..." : "Proceed to Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
