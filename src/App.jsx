import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

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
    // allow injected compile-time/global config if present
    if (typeof __firebase_config !== "undefined" && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch {}
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG) {
    return window.FALLBACK_FIREBASE_CONFIG;
  }
  return LOCAL_FALLBACK;
})();
const appId =
  typeof __app_id !== "undefined"
    ? __app_id
    : "attending-scheduler-v-single-rank-1.0";
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA" };

// Admin locked to you
const ADMIN_EMAIL = "jkandasamy@uabmc.edu";

/* =========================================================
   ATTENDINGS + LIMITS
========================================================= */
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

/* One-time login codes */
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

/* Optional display of target counts */
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
   CALENDAR DATA
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
const MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* =========================================================
   HELPERS
========================================================= */
const fmtLabel = (dateStr) => {
  const [, m, d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${parseInt(d,10)}`;
};

const getAvailableServicesForDate = (date) => {
  for (const mk of MONTH_KEYS) {
    const entry = months[mk].find(d => d.date === date);
    if (entry) {
      const out = [];
      if (!entry.rni) out.push(SERVICES.RNI);
      if (!entry.coa) out.push(SERVICES.COA);
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
      // block both services on same weekend
      if (state.rankings.some(r => r.date === date)) return state;
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
    case "load_from_draft": {
      const list = Array.isArray(action.rankings) ? action.rankings : [];
      const cleaned = list.filter(x => x && x.date && x.service);
      return { rankings: compressRanks(cleaned) };
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
  <span className="drag-handle" aria-hidden="true" title="Drag to reorder">
    <span className="dot-row">
      <span className="dot" /><span className="dot" />
    </span>
    <span className="dot-row">
      <span className="dot" /><span className="dot" />
    </span>
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
          <button className="btn btn-blue" onClick={() => onPick(SERVICES.COA)}>COA</button>
        )}
      </div>
      <button
        className="btn-link"
        style={{marginTop:4, fontSize:11}}
        onClick={onClose}
      >
        cancel
      </button>
    </div>
  );
}

/* =========================================================
   MODES
========================================================= */
const MODES = {
  CAL: "calendar",
  QA:  "quick",
  RB:  "rank",
  DB:  "drag",
};

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

  // --- Persistent drafts: load from Firestore when name is set ---
  useEffect(() => {
    if (!db || !selected) return;
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, "prefs_draft", `${YEAR}-${selected.name}`);
        const snap = await getDoc(ref);
        if (!snap.exists() || cancelled) return;
        const data = snap.data();
        if (Array.isArray(data.rankings)) {
          dispatch({ type: "load_from_draft", rankings: data.rankings });
        }
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    })();
    return () => { cancelled = true; };
  }, [db, selected]);

  // --- Persistent drafts: auto-save rankings whenever they change ---
  useEffect(() => {
    if (!db || !selected) return;
    (async () => {
      try {
        const ref = doc(db, "prefs_draft", `${YEAR}-${selected.name}`);
        await setDoc(ref, { rankings, ts: serverTimestamp() }, { merge: true });
      } catch (e) {
        console.error("Failed to save draft", e);
      }
    })();
  }, [db, selected, rankings]);

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
    const proceed2 = window.confirm("If your CSV looks correct, click OK to save to the server.");
    if (!proceed2) return;
    try {
      await setDoc(
        doc(db, "prefs_single", `${YEAR}-${selected.name}`),
        {
          appId,
          year: YEAR,
          who: selected.name,
          email: selected.email,
          rankings: compressRanks(rankings),
          ts: serverTimestamp(),
        },
        { merge: true }
      );
      alert("Saved to Firestore.");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  // Already assigned shifts for logged-in attending
  const alreadyAssigned = useMemo(() => {
    if (!selected) return [];
    const out = [];
    for (const mk of MONTH_KEYS) {
      for (const d of months[mk]) {
        if (d.rni === selected.name) out.push({ date: d.date, service: "RNI" });
        if (d.coa === selected.name) out.push({ date: d.date, service: "COA" });
      }
    }
    return out.sort((a,b) => a.date.localeCompare(b.date));
  }, [selected]);

  const limitsSummary = useMemo(() => {
    if (!selected) return null;
    const lim = ATTENDING_LIMITS[selected.name];
    if (!lim) return null;
    return {
      requested: lim.requested,
      claimed:   lim.claimed,
      left:      lim.left,
      chosenNow: rankings.length,
    };
  }, [selected, rankings.length]);

  // ---- Modes implementations (Calendar / QuickAdd / RankBoard / DragBuckets) ----
  // Calendar
  const CalendarMode = () => (
    <div className="months">
      {MONTH_KEYS.map((mk, idx) => (
        <div className="month" key={mk}>
          <details className="month-details" open={mode !== MODES.CAL ? false : true}>
            <summary className="month-header">
              <span className="month-title">{MONTH_FULL[idx]}</span>
            </summary>
            <div className="days">
              {months[mk].map((d) => {
                const key = `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`;
                const avail = getAvailableServicesForDate(d.date);
                return (
                  <div className="day" key={key}>
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    <div className="svc-row">
                      {d.rni && (
                        <Pill>RNI: {d.rni}</Pill>
                      )}
                      {d.coa && (
                        <Pill>COA: {d.coa}</Pill>
                      )}
                      {d.isTaken && <Pill>Full weekend</Pill>}
                    </div>
                    <div className="svc-actions">
                      {avail.includes(SERVICES.RNI) && (
                        <button
                          className="btn btn-svc"
                          onClick={() => add(d.date, SERVICES.RNI)}
                        >
                          RNI → Rank
                        </button>
                      )}
                      {avail.includes(SERVICES.COA) && (
                        <button
                          className="btn btn-svc"
                          onClick={() => add(d.date, SERVICES.COA)}
                        >
                          COA → Rank
                        </button>
                      )}
                      {avail.length === 0 && (
                        <span className="pill pill-muted">Full</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      ))}
    </div>
  );

  // QuickAdd
  const QuickAddMode = () => {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);

    const chosen = saturdays.find(d => d.date === date);
    const avail = date ? getAvailableServicesForDate(date) : [];

    return (
      <div className="quick-add">
        <div className="qa-row">
          <label>
            Month
            <select
              className="qa-select"
              value={mkey}
              onChange={e => setMkey(e.target.value)}
            >
              {MONTH_KEYS.map((mk, i) => (
                <option key={mk} value={mk}>{MONTH_FULL[i]}</option>
              ))}
            </select>
          </label>
          <label>
            Saturday
            <select
              className="qa-select"
              value={date}
              onChange={e => setDate(e.target.value)}
            >
              <option value="">Pick Saturday</option>
              {saturdays.map(d => (
                <option key={d.date} value={d.date}>
                  {d.day} ({fmtLabel(d.date)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Service
            <select
              className="qa-select"
              value={service}
              onChange={e => setService(e.target.value)}
              disabled={!date}
            >
              <option value="">Pick service</option>
              {avail.includes(SERVICES.RNI) && <option value={SERVICES.RNI}>RNI</option>}
              {avail.includes(SERVICES.COA) && <option value={SERVICES.COA}>COA</option>}
            </select>
          </label>
          <button
            className="btn btn-green"
            disabled={!date || !service}
            onClick={() => {
              add(date, service);
            }}
          >
            Add to Rankings
          </button>
        </div>
        {chosen && (
          <div className="qa-note">
            You are adding: <b>{fmtLabel(chosen.date)}</b> — <b>{service}</b>
          </div>
        )}
      </div>
    );
  };

  // RankBoard (grid style)
  const RankBoardMode = () => (
    <div className="rankboard">
      <div className="rb-instructions">
        Click directly on <b>RNI</b> or <b>COA</b> to add to your ranked list on the right (#1 = most preferred).
      </div>
      <div className="rb-grid">
        {MONTH_KEYS.map((mk, idx) => (
          <div className="rb-month" key={mk}>
            <div className="rb-month-title">{MONTH_FULL[idx]}</div>
            {months[mk].map(d => {
              const key = `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`;
              const avail = getAvailableServicesForDate(d.date);
              return (
                <div className="rb-row" key={key}>
                  <div className="rb-date">
                    <span>{fmtLabel(d.date)}</span>
                    {d.detail && <span className="rb-detail">({d.detail})</span>}
                  </div>
                  <div className="rb-actions">
                    {avail.includes(SERVICES.RNI) ? (
                      <button
                        className="pill pill-click"
                        onClick={() => add(d.date, SERVICES.RNI)}
                      >
                        RNI
                      </button>
                    ) : (
                      <span className="pill pill-muted">RNI full</span>
                    )}
                    {avail.includes(SERVICES.COA) ? (
                      <button
                        className="pill pill-click"
                        onClick={() => add(d.date, SERVICES.COA)}
                      >
                        COA
                      </button>
                    ) : (
                      <span className="pill pill-muted">COA full</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // DragBuckets
  const DragBucketsMode = () => {
    const [popover, setPopover] = useState(null); // {x,y,date} | null
    const openPopover = (e, date) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPopover({ x: rect.right, y: rect.top, date });
    };
    const closePopover = () => setPopover(null);

    const onPickService = (svc) => {
      if (!popover) return;
      add(popover.date, svc);
      setPopover(null);
    };

    const availableChips = [];
    for (const mk of MONTH_KEYS) {
      for (const d of months[mk]) {
        availableChips.push({ date: d.date });
      }
    }
    const chosenKeys = new Set(rankings.map(r => `${r.date}`));
    const remaining = availableChips.filter(c => !chosenKeys.has(c.date));

    return (
      <div className="dragbuckets">
        <div className="db-left">
          <div className="db-title">Available weekends</div>
          <div className="db-months">
            {MONTH_KEYS.map((mk, idx) => (
              <div className="db-month" key={mk}>
                <div className="db-month-title">{MONTH_FULL[idx]}</div>
                <div className="db-chip-row">
                  {months[mk].map(d => {
                    if (chosenKeys.has(d.date)) return null;
                    const key = d.date;
                    return (
                      <button
                        key={key}
                        className="db-chip"
                        onClick={(e) => openPopover(e, d.date)}
                      >
                        {fmtLabel(d.date)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="db-right">
          <div className="db-title">Drag to re-order your ranked weekends</div>
          <ol className="preview-list">
            {compressRanks(rankings).map((r, idx) => (
              <li
                key={`${r.date}-${r.service}`}
                className="preview-item draggable-item"
                draggable
                onDragStart={onDragStartItem(idx)}
                onDragOver={onDragOverItem(idx)}
                onDrop={onDropItem(idx)}
              >
                <DragHandle />
                <span>#{r.rank} — {fmtLabel(r.date)} ({r.service})</span>
                <button
                  className="btn-link"
                  onClick={() => remove(r.date, r.service)}
                >
                  remove
                </button>
              </li>
            ))}
            {rankings.length === 0 && (
              <li className="preview-item">
                <span className="muted">No preferences yet. Click a weekend on the left to pick a service.</span>
              </li>
            )}
          </ol>
        </div>
        {popover && (
          <InlineServicePopover
            x={popover.x}
            y={popover.y}
            date={popover.date}
            onPick={onPickService}
            onClose={closePopover}
          />
        )}
      </div>
    );
  };

  // ---- Command-style mode switcher ----
  const ModeTabs = () => (
    <div className="mode-tabs">
      <button
        className={mode === MODES.CAL ? "tab active" : "tab"}
        onClick={() => setMode(MODES.CAL)}
      >
        Calendar
      </button>
      <button
        className={mode === MODES.QA ? "tab active" : "tab"}
        onClick={() => setMode(MODES.QA)}
      >
        QuickAdd
      </button>
      <button
        className={mode === MODES.RB ? "tab active" : "tab"}
        onClick={() => setMode(MODES.RB)}
      >
        RankBoard
      </button>
      <button
        className={mode === MODES.DB ? "tab active" : "tab"}
        onClick={() => setMode(MODES.DB)}
      >
        DragBuckets
      </button>
    </div>
  );

  // Login panel
  const loginPanel = (
    <div className="login">
      <div className="login-title">Enter your one-time code</div>
      <div className="id-row">
        <select
          className="id-select"
          value={gateEmail}
          onChange={(e) => setGateEmail(e.target.value)}
        >
          <option value="">Select your name</option>
          {ATTENDINGS.map((a) => (
            <option key={a.email} value={a.email}>
              {a.name} — {a.email}
            </option>
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
            const ok =
              code && gateCode && gateCode.toUpperCase() === code.toUpperCase();
            if (!ok) {
              setGateErr("Invalid code or attendee.");
              return;
            }
            const att = ATTENDINGS.find((a) => a.email === gateEmail);
            setGateErr("");
            setMe(att.name);
          }}
        >
          Verify & Continue
        </button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted">
        Tip: you’ll see your name locked in after verification.
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        <div className="topbar">
          <div className="topbar-inner">
            <div className="section-title">UAB/COA Weekend Attending Scheduler 2026</div>
            <div className="spacer" />
            <span className="badge">{firebaseConfig.projectId}</span>
            <button className="btn" onClick={submit}>
              Submit
            </button>
            <button className="btn btn-green" onClick={downloadCSV}>
              Download CSV
            </button>
          </div>
        </div>

        <div className="content">
          <div className="main">
            {!me ? (
              <div className="section">
                <div className="section-head">
                  <h3 className="section-title">Login</h3>
                </div>
                <div className="section-body">{loginPanel}</div>
              </div>
            ) : (
              <>
                {limitsSummary && (
                  <div className="section">
                    <div className="section-head">
                      <h3 className="section-title">Your targets & current assignments</h3>
                    </div>
                    <div className="section-body">
                      <div className="muted" style={{marginBottom:8}}>
                        Requested: <b>{limitsSummary.requested}</b> &nbsp;|&nbsp;
                        Claimed (assigned): <b>{limitsSummary.claimed}</b> &nbsp;|&nbsp;
                        Left: <b>{limitsSummary.left}</b> &nbsp;|&nbsp;
                        You’ve ranked now: <b>{limitsSummary.chosenNow}</b>
                      </div>
                      <div>
                        <div style={{fontWeight:600, marginBottom:4}}>
                          Already assigned to you (from calendar):
                        </div>
                        <ul style={{margin:0, paddingLeft:18}}>
                          {alreadyAssigned.length === 0 && <li>None yet.</li>}
                          {alreadyAssigned.map((x) => (
                            <li key={`${x.date}-${x.service}`}>
                              {fmtLabel(x.date)} — {x.service}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="section">
                  <div className="section-head">
                    <h3 className="section-title">Modes</h3>
                  </div>
                  <div className="section-body">
                    <ModeTabs />
                  </div>
                </div>

                <div className="section">
                  <div className="section-head">
                    <h3 className="section-title">
                      {mode === MODES.CAL && "Calendar"}
                      {mode === MODES.QA  && "QuickAdd"}
                      {mode === MODES.RB  && "RankBoard"}
                      {mode === MODES.DB  && "DragBuckets"}
                    </h3>
                  </div>
                  <div className="section-body">
                    {mode === MODES.CAL && <CalendarMode />}
                    {mode === MODES.QA  && <QuickAddMode />}
                    {mode === MODES.RB  && <RankBoardMode />}
                    {mode === MODES.DB  && <DragBucketsMode />}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Rankings side panel (always visible) */}
          <aside className="side">
            <div className="section">
              <div className="section-head">
                <h3 className="section-title">Rankings (#1 = most preferred)</h3>
                <div className="section-right">
                  <button className="btn-link" onClick={clearAll}>
                    Clear all
                  </button>
                </div>
              </div>
              <div className="section-body">
                <ol className="preview-list">
                  {compressRanks(rankings).map((r, idx) => (
                    <li
                      key={`${r.date}-${r.service}`}
                      className="preview-item draggable-item"
                      draggable
                      onDragStart={onDragStartItem(idx)}
                      onDragOver={onDragOverItem(idx)}
                      onDrop={onDropItem(idx)}
                    >
                      <DragHandle />
                      <span>#{r.rank} — {fmtLabel(r.date)} ({r.service})</span>
                      <button
                        className="btn-link"
                        onClick={() => remove(r.date, r.service)}
                      >
                        remove
                      </button>
                    </li>
                  ))}
                  {rankings.length === 0 && (
                    <li className="preview-item">
                      <span className="muted">No preferences yet. Add from any mode.</span>
                    </li>
                  )}
                </ol>
              </div>
            </div>

            <div className="section">
              <div className="section-head">
                <h3 className="section-title">Who</h3>
              </div>
              <div className="section-body">
                <div className="id-row">
                  <select
                    className="id-select"
                    value={me}
                    onChange={(e) => setMe(e.target.value)}
                    disabled={!me}
                  >
                    {!me && <option value="">(locked after login)</option>}
                    {ATTENDINGS.map((a) => (
                      <option key={a.email} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {me && (
                    <span className="muted">
                      {ATTENDINGS.find((a) => a.name === me)?.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="section">
                <div className="section-head">
                  <h3 className="section-title">Admin</h3>
                </div>
                <div className="section-body">
                  <div className="muted">
                    Admin view enabled (query Firestore collection <code>prefs_single</code> for all submissions).
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
      <div className="band" />
    </div>
  );
}
