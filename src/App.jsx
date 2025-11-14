import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";

/* =========================================================
   FIREBASE (keeps your original fallbacks & window fallback)
========================================================= */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

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

const appId =
  typeof __app_id !== "undefined"
    ? __app_id
    : "attending-scheduler-v-single-rank-1.0";

/* =========================================================
   CONSTANTS / DATA
========================================================= */
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA" };

const ATTENDINGS = [
  { name: "Ambal", email: "nambalav@uab.edu" },
  { name: "Arora", email: "nitinarora@uabmc.edu" },
  { name: "Bhatia", email: "ksbhatia@uabmc.edu" },
  { name: "Boone", email: "boone@uabmc.edu" },
  { name: "Carlo", email: "wcarlo@uabmc.edu" },
  { name: "Jain", email: "viraljain@uabmc.edu" },
  { name: "Kandasamy", email: "jkandasamy@uabmc.edu" },
  { name: "Kane", email: "akane@uabmc.edu" },
  { name: "Mackay", email: "mackay@uabmc.edu" },
  { name: "Schuyler", email: "aschuyler@uabmc.edu" },
  { name: "Shukla", email: "vshukla@uabmc.edu" },
  { name: "Sims", email: "bsims@uabmc.edu" },
  { name: "Travers", email: "cptravers@uabmc.edu" },
  { name: "Willis", email: "kentwillis@uabmc.edu" },
  { name: "Winter", email: "lwinter@uabmc.edu" },
  { name: "Salas", email: "asalas@uabmc.edu" },
  { name: "Lal", email: "clal@uabmc.edu" },
  { name: "Vivian", email: "vvalcarceluaces@uabmc.edu" },
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

/* Per-attending targets + currently claimed counts */
const ATTENDING_LIMITS = {
  Ambal: { requested: 6, claimed: 4, left: 2 },
  Schuyler: { requested: 3, claimed: 2, left: 1 },
  Mackay: { requested: 5, claimed: 1, left: 4 },
  Kane: { requested: 1, claimed: 1, left: 0 },
  Salas: { requested: 3, claimed: 0, left: 3 },
  Sims: { requested: 8, claimed: 4, left: 4 },
  Travers: { requested: 7, claimed: 4, left: 3 },
  Kandasamy: { requested: 10, claimed: 6, left: 4 },
  Willis: { requested: 9, claimed: 4, left: 5 },
  Bhatia: { requested: 6, claimed: 5, left: 1 },
  Winter: { requested: 5, claimed: 3, left: 2 },
  Boone: { requested: 9, claimed: 6, left: 3 },
  Arora: { requested: 9, claimed: 7, left: 2 },
  Jain: { requested: 9, claimed: 1, left: 8 },
  Lal: { requested: 0, claimed: 0, left: 0 },
  Shukla: { requested: 9, claimed: 1, left: 8 },
  Vivian: { requested: 0, claimed: 0, left: 2 },
  Carlo: { requested: 5, claimed: 5, left: 0 },
};

/* =========================================================
   CALENDAR DATA (source of "already assigned shifts")
========================================================= */
const months = {
  "01": [
    { day: "10", date: "2026-01-10", rni: null, coa: null },
    { day: "17-19", date: "2026-01-17", rni: null, coa: null, detail: "MLK Day" },
    { day: "24", date: "2026-01-24", rni: null, coa: null },
    { day: "31", date: "2026-01-31", rni: null, coa: null },
  ],
  "02": [
    { day: "7", date: "2026-02-07", rni: "Boone", coa: null },
    { day: "14", date: "2026-02-14", rni: "Boone", coa: null },
    { day: "21", date: "2026-02-21", rni: "Willis", coa: null },
    { day: "28", date: "2026-02-28", rni: "Willis", coa: null },
  ],
  "03": [
    { day: "7", date: "2026-03-07", rni: "Ambal", coa: "Arora", isTaken: true },
    { day: "14", date: "2026-03-14", rni: null, coa: "Winter" },
    { day: "21", date: "2026-03-21", rni: "Ambal", coa: "Arora", isTaken: true },
    { day: "28", date: "2026-03-28", rni: null, coa: "Arora" },
  ],
  "04": [
    { day: "4", date: "2026-04-04", rni: "Sims", coa: null },
    { day: "11", date: "2026-04-11", rni: null, coa: null },
    { day: "18", date: "2026-04-18", rni: "Sims", coa: null },
    { day: "25", date: "2026-04-25", rni: null, coa: null, detail: "PAS Meeting Coverage" },
  ],
  "05": [
    { day: "2", date: "2026-05-02", rni: null, coa: null },
    { day: "9", date: "2026-05-09", rni: "Arora", coa: null },
    { day: "16", date: "2026-05-16", rni: "Arora", coa: null },
    { day: "23-25", date: "2026-05-23", rni: null, coa: null, detail: "Memorial Day" },
    { day: "30", date: "2026-05-30", rni: "Arora", coa: null },
  ],
  "06": [
    { day: "6", date: "2026-06-06", rni: "Schuyler", coa: "Winter", isTaken: true },
    { day: "13", date: "2026-06-13", rni: "Boone", coa: null },
    { day: "19-21", date: "2026-06-19", rni: "Schuyler", coa: "Winter", isTaken: true, detail: "Juneteenth Day" },
    { day: "27", date: "2026-06-27", rni: "Boone", coa: null },
  ],
  "07": [
    { day: "4-6", date: "2026-07-04", rni: "Jain", coa: "Carlo", isTaken: true, detail: "4th of July" },
    { day: "11", date: "2026-07-11", rni: null, coa: "Willis" },
    { day: "18", date: "2026-07-18", rni: null, coa: null },
    { day: "25", date: "2026-07-25", rni: "Shukla", coa: "Willis", isTaken: true },
  ],
  "08": [
    { day: "1", date: "2026-08-01", rni: "Boone", coa: null },
    { day: "8", date: "2026-08-08", rni: "Sims", coa: "Carlo", isTaken: true },
    { day: "15", date: "2026-08-15", rni: "Boone", coa: null },
    { day: "22", date: "2026-08-22", rni: "Sims", coa: null },
    { day: "29", date: "2026-08-29", rni: null, coa: "Carlo" },
  ],
  "09": [
    { day: "5-7", date: "2026-09-05", rni: "Mackay", coa: null, detail: "Labor Day" },
    { day: "12", date: "2026-09-12", rni: null, coa: null },
    { day: "19", date: "2026-09-19", rni: null, coa: null },
    { day: "26", date: "2026-09-26", rni: null, coa: null },
  ],
  "10": [
    { day: "3", date: "2026-10-03", rni: "Kandasamy", coa: "Carlo", isTaken: true },
    { day: "10", date: "2026-10-10", rni: "Travers", coa: "Bhatia", isTaken: true },
    { day: "17", date: "2026-10-17", rni: "Kandasamy", coa: null },
    { day: "24", date: "2026-10-24", rni: "Travers", coa: "Bhatia", isTaken: true },
    { day: "31", date: "2026-10-31", rni: "Kandasamy", coa: "Carlo", isTaken: true },
  ],
  "11": [
    { day: "7", date: "2026-11-07", rni: "Ambal", coa: null },
    { day: "14", date: "2026-11-14", rni: "Bhatia", coa: null },
    { day: "21", date: "2026-11-21", rni: "Ambal", coa: null },
    { day: "26-28", date: "2026-11-26", rni: "Bhatia", coa: null, detail: "Thanksgiving" },
  ],
  "12": [
    { day: "5", date: "2026-12-05", rni: "Travers", coa: "Kandasamy", isTaken: true },
    { day: "12", date: "2026-12-12", rni: null, coa: null },
    { day: "19", date: "2026-12-19", rni: "Travers", coa: "Kandasamy", isTaken: true },
    { day: "24-28", date: "2026-12-24", rni: "Bhatia", coa: "Arora", isTaken: true, detail: "Christmas" },
    { day: "31-Jan 4", date: "2026-12-31", rni: "Kane", coa: "Kandasamy", isTaken: true, detail: "New Year's Eve" },
  ],
};

const MONTH_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* =========================================================
   HELPERS
========================================================= */
function fmtLabel(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

function getAvailableServicesForDate(date) {
  for (const mk of MONTH_KEYS) {
    const entry = months[mk].find((d) => d.date === date);
    if (entry) {
      const out = [];
      if (!entry.rni) out.push(SERVICES.RNI);
      if (!entry.coa) out.push(SERVICES.COA);
      return out;
    }
  }
  return [SERVICES.RNI, SERVICES.COA];
}

function compressRanks(list) {
  return list
    .slice()
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

/* =========================================================
   PILL + DRAG HANDLE
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
      if (ref.current &&
          !ref.current.contains(e.target)) {
        onClose();
      }
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
      <div style={{
        fontWeight:700, fontSize:12, marginBottom:6}}>
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
   SINGLE-BUCKET PREFERENCES STATE (rank #1 = MOST preferred)
========================================================= */
const initialState = { rankings: [] }; // [{date, service, rank}]

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service } = action;
      if (!date || !service) return state;

      // Enforce: cannot pick both services for the same date.
      const filtered = state.rankings.filter((x) => x.date !== date);

      // Already have exact (date, service)?
      if (state.rankings.some((x) => x.date === date && x.service === service)) {
        return state;
      }

      const next = [
        ...filtered,
        { date, service, rank: (filtered.length ? Math.max(...filtered.map(y => y.rank)) : 0) + 1 },
      ];
      return { rankings: compressRanks(next) };
    }

    case "remove": {
      const { date, service } = action;
      const next = state.rankings.filter(
        (x) => !(x.date === date && x.service === service)
      );
      return { rankings: compressRanks(next) };
    }

    case "reorder": {
      const { fromIndex, toIndex } = action;
      const arr = compressRanks(state.rankings);
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= arr.length ||
        toIndex >= arr.length
      ) {
        return state;
      }
      const moved = arr[fromIndex];
      const rest = arr.filter((_, i) => i !== fromIndex);
      rest.splice(toIndex, 0, moved);
      const renum = rest.map((x, i) => ({ ...x, rank: i + 1 }));
      return { rankings: renum };
    }

    case "clear":
      return initialState;

    case "load_from_draft": {
      const list = Array.isArray(action.rankings) ? action.rankings : [];
      const cleaned = list.filter(x => x && x.date && x.service);
      return { rankings: compressRanks(cleaned) };
    }

    default:
      return state;
  }
}

/* =========================================================
   MAIN APP
========================================================= */
const MODES = {
  CAL: "calendar",
  QA:  "quick",
  RB:  "rank",
  DB:  "drag",
};

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

  // Login gate via codes
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [me, setMe]             = useState("");
  const [gateErr, setGateErr]   = useState("");

  const selected = useMemo(
    () => ATTENDINGS.find((a) => a.name === me) || null,
    [me]
  );

  const [mode, setMode] = useState(MODES.CAL);

  // ATTENDING_LIMITS panel visibility
  const [showLimits, setShowLimits] = useState(false);

  // Single-bucket ranking state
  const [{ rankings }, dispatch] = useReducer(reducer, initialState);

  // Drag context for robust reorder
  const dragIndex = useRef(null);
  const onDragStartItem = (index) => () => {
    dragIndex.current = index;
  };
  const onDragOverItem = (index) => (e) => {
    e.preventDefault();
  };
  const onDropItem = (index) => () => {
    const from = dragIndex.current;
    const to   = index;
    if (from == null || from === to) return;
    dispatch({ type: "reorder", fromIndex: from, toIndex: to });
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

  // --- Persistent drafts: save whenever rankings change ---
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

  // Add helpers
  const add = useCallback((date, service) => {
    const avail = getAvailableServicesForDate(date);
    if (!avail.includes(service)) return;
    dispatch({ type: "add", date, service });
  }, []);

  const remove = useCallback((date, service) => {
    dispatch({ type: "remove", date, service });
  }, []);

  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // Build list of already-assigned shifts for the logged-in attending from months[]
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
      claimed: lim.claimed,
      left: lim.left,
      chosenNow: rankings.length,
    };
  }, [selected, rankings.length]);

  // CSV download
  const downloadCSV = () => {
    if (!selected) {
      alert("Verify your name/code first.");
      return;
    }
    const rows = [];
    const ordered = compressRanks(rankings);
    for (const r of ordered) {
      rows.push({
        name: selected.name,
        date: r.date,
        service: r.service,
        rank: r.rank,
      });
    }
    const headers = ["name","date","service","rank"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => esc(r[h])).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${YEAR}-${selected.name}-preferences.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Submit flow: prompt to download/verify CSV first
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const submit = () => {
    if (!selected) {
      alert("Log in with your code first.");
      return;
    }
    setShowSubmitPrompt(true);
  };
  const reallySubmit = async () => {
    if (!selected) return;
    const payload = {
      appId,
      year: YEAR,
      who: selected.name,
      email: selected.email,
      rankings: compressRanks(rankings),
      ts: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "prefs_single", `${YEAR}-${selected.name}`), payload);
      setShowSubmitPrompt(false);
      alert("Saved to Firestore.");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  // ---- Modes implementations (Calendar / QuickAdd / RankBoard / DragBuckets) ----
  // Calendar
  const CalendarMode = () => (
    <div className="months">
      {MONTH_KEYS.map((mk, i) => (
        <div key={mk} className="month">
          <div className="month-toggle">
            <span className="month-title">{MONTH_FULL[i]}</span>
          </div>
          <div className="days">
            {months[mk].map((d) => {
              const avail = getAvailableServicesForDate(d.date);
              const already = rankings.find(r => r.date === d.date);
              return (
                <div
                  key={`${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`}
                  className="day"
                >
                  <div className="day-top">
                    <span className="day-label">{d.day}</span>
                    <span className="day-date">({fmtLabel(d.date)})</span>
                  </div>
                  {d.detail && <div className="day-detail">{d.detail}</div>}
                  <div className="pill-row">
                    {d.rni && (
                      <Pill>RNI: {d.rni}</Pill>
                    )}
                    {d.coa && (
                      <Pill>COA: {d.coa}</Pill>
                    )}
                    {d.isTaken && <Pill>Full weekend</Pill>}
                    {already && (
                      <Pill>Rank #{already.rank}</Pill>
                    )}
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
    const avail = date ? getAvailableServicesForDate(date) : [];

    const chosen = date && service
      ? { date, service }
      : null;

    return (
      <div className="qa-layout">
        <div className="qa-form">
          <label>
            Month
            <select
              className="qa-select"
              value={mkey}
              onChange={e => setMkey(e.target.value)}
            >
              {MONTH_KEYS.map((mk, idx) => (
                <option key={mk} value={mk}>
                  {MONTH_FULL[idx]}
                </option>
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
                  {d.day} — {fmtLabel(d.date)}
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

  // RankBoard (click inside calendar-style grid)
  const RankBoardMode = () => (
    <div className="months">
      {MONTH_KEYS.map((mk, i) => (
        <div key={mk} className="month">
          <div className="month-toggle">
            <span className="month-title">{MONTH_FULL[i]}</span>
          </div>
          <div className="days">
            {months[mk].map((d) => {
              const avail = getAvailableServicesForDate(d.date);
              const r = rankings.find(x => x.date === d.date);
              return (
                <div key={d.date} className="day">
                  <div className="day-top">
                    <span className="day-label">{d.day}</span>
                    <span className="day-date">({fmtLabel(d.date)})</span>
                  </div>
                  {d.detail && <div className="day-detail">{d.detail}</div>}
                  <div className="pill-row">
                    {d.rni && <Pill>RNI: {d.rni}</Pill>}
                    {d.coa && <Pill>COA: {d.coa}</Pill>}
                    {r && <Pill>Rank #{r.rank}</Pill>}
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
        </div>
      ))}
    </div>
  );

  // DragBuckets
  const DragBucketsMode = () => {
    const [popover, setPopover] = useState(null); // {x,y,date} | null
    const openPopover = (e, date) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPopover({ x: rect.left, y: rect.bottom, date });
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
                <span className="muted">No ranked weekends yet. Click a date to pick a service.</span>
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
            setShowLimits(true);
          }}
        >
          Verify & Continue
        </button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted">
        Tip: you'll see your name locked in after verification.
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
                {showLimits && limitsSummary && (
                  <div className="section">
                    <div className="section-head">
                      <h3 className="section-title">Your targets & current assignments</h3>
                      <div className="section-right">
                        <button
                          className="btn btn-amber"
                          onClick={() => setShowLimits(false)}
                        >
                          OK
                        </button>
                      </div>
                    </div>
                    <div className="section-body">
                      <div className="limits-summary">
                        <div className="limit-item">
                          <span className="limit-label">Requested weekends:</span>
                          <span className="limit-value">{limitsSummary.requested}</span>
                        </div>
                        <div className="limit-item">
                          <span className="limit-label">Already claimed:</span>
                          <span className="limit-value">{limitsSummary.claimed}</span>
                        </div>
                        <div className="limit-item">
                          <span className="limit-label">Left to fill:</span>
                          <span className="limit-value">{limitsSummary.left}</span>
                        </div>
                        <div className="limit-item">
                          <span className="limit-label">Currently ranked:</span>
                          <span className="limit-value">{limitsSummary.chosenNow}</span>
                        </div>
                      </div>
                      {alreadyAssigned.length > 0 && (
                        <div className="assigned-list">
                          <div className="assigned-title">Your already assigned shifts:</div>
                          <ul>
                            {alreadyAssigned.map((a, i) => (
                              <li key={i}>
                                {fmtLabel(a.date)} — {a.service}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="section">
                  <div className="section-head">
                    <h3 className="section-title">Select weekends</h3>
                  </div>
                  <div className="section-body">
                    <ModeTabs />
                    {mode === MODES.CAL && <CalendarMode />}
                    {mode === MODES.QA && <QuickAddMode />}
                    {mode === MODES.RB && <RankBoardMode />}
                    {mode === MODES.DB && <DragBucketsMode />}
                  </div>
                </div>

                <div className="section">
                  <div className="section-head">
                    <h3 className="section-title">Your ranked preferences</h3>
                    <button className="btn-link" onClick={clearAll}>
                      Clear all
                    </button>
                  </div>
                  <div className="section-body">
                    <ol className="preview-list">
                      {compressRanks(rankings).map((r) => (
                        <li key={`${r.date}-${r.service}`} className="preview-item">
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
                          <span className="muted">No preferences yet. Use the modes above to select weekends.</span>
                        </li>
                      )}
                    </ol>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showSubmitPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Ready to submit?</h3>
            <p>Please download your CSV first to keep a copy of your preferences.</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn btn-green" onClick={reallySubmit}>
                Submit Now
              </button>
              <button className="btn" onClick={() => setShowSubmitPrompt(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}