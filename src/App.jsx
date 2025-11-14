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

/* One-time login codes (you asked for these previously) */
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

/* Modes */
const MODES = {
  CAL: "Calendar",
  QA: "QuickAdd",
  RB: "RankBoard",
  DB: "DragBuckets",
};

/* Admin email */
const ADMIN_EMAIL = "jkandasamy@uabmc.edu";

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
    { day: "31-Jan 4", date: "2026-12-31", rni: "Kane", coa: "Kandasamy", isTaken: true, detail: "New Year’s Eve" },
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
   SINGLE-BUCKET PREFERENCES STATE (rank #1 = MOST preferred)
========================================================= */
const initialState = { rankings: [] }; // [{date, service, rank}]

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
      // Work on the visibly ordered list so indices line up with what the user sees
      const arr = compressRanks(state.rankings);
      if (fromIndex < 0 || fromIndex >= arr.length || toIndex < 0 || toIndex >= arr.length) return state;
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      // Re-number ranks in the new order (1..N)
      const renumbered = arr.map((x, i) => ({ ...x, rank: i + 1 }));
      return { rankings: renumbered };
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
  >
    ⋮⋮
  </span>
);

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

  // Login gate via codes
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [me, setMe] = useState("");
  const [gateErr, setGateErr] = useState("");

  const selected = useMemo(
    () => ATTENDINGS.find((a) => a.name === me) || null,
    [me]
  );

  // Admin flag (unchanged)
  const isAdmin = useMemo(() => {
    const selectedEmail = selected?.email;
    try {
      const q = new URLSearchParams(window.location.search);
      return q.get("admin") === "1" && selectedEmail === ADMIN_EMAIL;
    } catch {
      return false;
    }
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
    e.preventDefault(); // required for drop to fire
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

  // Calendar collapse state
  const [openMonths, setOpenMonths] = useState(() => new Set(MONTH_KEYS));

  const toggleMonth = (mk) => {
    setOpenMonths(prev => {
      const next = new Set(prev);
      if (next.has(mk)) next.delete(mk);
      else next.add(mk);
      return next;
    });
  };

  // Build list of already-assigned shifts for the logged-in attending from months[]
  const alreadyAssigned = useMemo(() => {
    if (!me) return [];
    const out = [];
    for (const mk of MONTH_KEYS) {
      for (const d of months[mk]) {
        if (d.rni === me) out.push({ date: d.date, service: "RNI" });
        if (d.coa === me) out.push({ date: d.date, service: "COA" });
      }
    }
    return out.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [me]);

  // Limits summary
  const limitsSummary = useMemo(() => {
    if (!me) return null;
    const lim = ATTENDING_LIMITS[me];
    if (!lim) return null;
    return {
      requested: lim.requested,
      claimed: lim.claimed,
      left: lim.left,
      chosenNow: rankings.length,
    };
  }, [me, rankings.length]);

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
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map(r => headers.map(h => esc(r[h])).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${YEAR}-${selected.name}-preferences.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Submit flow: ask to download CSV & verify first, then proceed
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const submit = async () => {
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

  /* ---------- Modes ---------- */

  function CalendarMode() {
    const chosenDates = new Set(rankings.map(r => r.date));
    return (
      <div className="months">
        {MONTH_KEYS.map((mk, i) => {
          const isOpen = openMonths.has(mk);
          return (
            <section key={mk} className="month">
              <button className="month-toggle" onClick={()=> toggleMonth(mk)}>
                <span className="month-title">{MONTH_FULL[i]}</span>
                <span className="month-chevron">{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen && (
                <div className="days">
                  {months[mk].map((d) => {
                    const avail = getAvailableServicesForDate(d.date);
                    const alreadyHasThisDate = chosenDates.has(d.date);
                    const block = d.isTaken || avail.length === 0;
                    return (
                      <div key={d.date} className="day">
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
              )}
            </section>
          );
        })}
      </div>
    );
  }

  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);

    const onAdd = () => {
      if (!date || !service) return;
      add(date, service);
    };

    return (
      <div className="quickadd">
        <div className="qa-row">
          <label>Month</label>
          <select value={mkey} onChange={(e)=> setMkey(e.target.value)}>
            {MONTH_KEYS.map((mk, i) => (
              <option key={mk} value={mk}>{MONTH_FULL[i]}</option>
            ))}
          </select>
        </div>
        <div className="qa-row">
          <label>Saturday</label>
          <select value={date} onChange={(e)=> setDate(e.target.value)}>
            <option value="">— pick a Saturday —</option>
            {saturdays.map(d => (
              <option key={d.date} value={d.date}>
                {d.day} ({fmtLabel(d.date)})
              </option>
            ))}
          </select>
        </div>
        <div className="qa-row">
          <label>Service</label>
          <select value={service} onChange={(e)=> setService(e.target.value)}>
            <option value="">— choose —</option>
            {getAvailableServicesForDate(date).map(svc => (
              <option key={svc} value={svc}>{svc}</option>
            ))}
          </select>
        </div>
        <div className="qa-row right">
          <button className="btn btn-green" onClick={onAdd}>Add to rankings</button>
        </div>
      </div>
    );
  }

  function RankBoardMode() {
    const chosenDates = new Set(rankings.map(r => r.date));
    return (
      <div className="rankboard">
        {MONTH_KEYS.map((mk, i) => (
          <section key={mk} className="rb-month">
            <div className="rb-month-title">{MONTH_FULL[i]}</div>
            <div className="rb-days">
              {months[mk].map(d => {
                const avail = getAvailableServicesForDate(d.date);
                const alreadyHasThisDate = chosenDates.has(d.date);
                const block = d.isTaken || avail.length === 0;
                return (
                  <div key={d.date} className="rb-day">
                    <div className="rb-top">
                      <span>{d.day}</span>
                      <span className="rb-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="rb-detail">{d.detail}</div>}
                    <div className="rb-actions">
                      {avail.map(svc => (
                        <button
                          key={svc}
                          className="btn btn-svc-sm"
                          disabled={block}
                          onClick={()=> add(d.date, svc)}
                        >
                          {svc} → Rank
                        </button>
                      ))}
                      {avail.length === 0 && <Pill>Full</Pill>}
                      {alreadyHasThisDate && <Pill>Picked</Pill>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function InlineServicePopover({ x, y, date, onPick, onClose }) {
    if (!date) return null;
    const avail = getAvailableServicesForDate(date);
    if (avail.length <= 1) return null;
    return (
      <div className="popover" style={{ top: y, left: x }}>
        <div className="popover-title">Pick service</div>
        <div className="popover-body">
          {avail.map(svc => (
            <button key={svc} className="btn btn-svc" onClick={()=> onPick(svc)}>
              {svc}
            </button>
          ))}
          <button className="btn-link" onClick={onClose}>cancel</button>
        </div>
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
          onChange={(e)=> setGateCode(e.target.value.trim())}
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
        <header className="topbar">
          <div className="topbar-inner">
            <div className="section-title">UAB/COA Weekend Attending Scheduler 2026</div>
            <div className="spacer" />
            <span className="badge">{firebaseConfig.projectId}</span>
            <button className="btn" onClick={submit}>Submit</button>
            <button className="btn btn-green" onClick={downloadCSV}>Download CSV</button>
          </div>
        </header>

        <div className="content">
          <main className="main">
            {!me ? (
              <section className="section">
                <div className="section-head">
                  <h3 className="section-title">Login</h3>
                </div>
                <div className="section-body">{loginPanel}</div>
              </section>
            ) : (
              <>
                <section className="section">
                  <div className="section-head">
                    <h3 className="section-title">Your targets & current assignments</h3>
                  </div>
                  <div className="section-body">
                    {limitsSummary && (
                      <div className="muted" style={{marginBottom:8}}>
                        Requested: <b>{limitsSummary.requested}</b> · Claimed (assigned):{" "}
                        <b>{limitsSummary.claimed}</b> · Left:{" "}
                        <b>{limitsSummary.left}</b> · You’ve ranked now:{" "}
                        <b>{limitsSummary.chosenNow}</b>
                      </div>
                    )}
                    <div>
                      <div style={{fontWeight:600, marginBottom:4}}>Already assigned to you (from calendar):</div>
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
                </section>

                <section className="section">
                  <div className="section-head">
                    <h3 className="section-title">Modes</h3>
                  </div>
                  <div className="section-body modes-row">
                    {Object.entries(MODES).map(([key, label]) => (
                      <button
                        key={key}
                        className={
                          "mode-pill" + (mode === label ? " mode-pill-active" : "")
                        }
                        onClick={()=> setMode(label)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="section">
                  <div className="section-head">
                    <h3 className="section-title">{mode}</h3>
                  </div>
                  <div className="section-body">
                    {mode === MODES.CAL && <CalendarMode />}
                    {mode === MODES.QA && <QuickAddMode />}
                    {mode === MODES.RB && <RankBoardMode />}
                    {mode === MODES.DB && <DragBucketsMode />}
                  </div>
                </section>
              </>
            )}
          </main>

          {/* Rankings (single bucket) — with robust drag-to-reorder */}
          <aside className="side">
            <section className="section">
              <div className="section-head">
                <h3 className="section-title">Rankings (#1 = most preferred)</h3>
                <div className="section-right">
                  <button className="btn-link" onClick={clearAll}>Clear all</button>
                </div>
              </div>
              <div className="section-body">
                <ol className="preview-list">
                  {compressRanks(rankings).map((x, i) => (
                    <li
                      key={`${x.date}-${x.service}`}
                      className="preview-item draggable-item"
                      draggable
                      onDragStart={onDragStartItem(i)}
                      onDragOver={onDragOverItem(i)}
                      onDrop={onDropItem(i)}
                      title="Drag to reorder"
                    >
                      <DragHandle/>
                      <span>#{x.rank} — {fmtLabel(x.date)} ({x.service})</span>
                      <button
                        className="btn-link"
                        onClick={() => remove(x.date, x.service)}
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
            </section>

            {/* Who (locked after login) */}
            <section className="section">
              <div className="section-head">
                <h3 className="section-title">Who</h3>
              </div>
              <div className="section-body">
                <div className="id-row">
                  <select className="id-select" value={me} onChange={(e)=> setMe(e.target.value)} disabled>
                    {
                      ATTENDINGS.map((a) => (
                        <option key={a.email} value={a.name}>
                          {a.name}
                        </option>
                      ))
                    }
                  </select>
                  {me && (
                    <span className="muted">
                      {ATTENDINGS.find((a) => a.name === me)?.email}
                    </span>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
      <div className="band" />

      {/* Submit prompt (download CSV & verify first) */}
      {showSubmitPrompt && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-title">Review before submitting</div>
            <p style={{marginTop:8}}>
              Please <b>download your CSV</b> and quickly verify that your name, dates,
              services, and ranks are correct.
            </p>
            <div className="row right gap" style={{marginTop:8}}>
              <button className="btn" onClick={() => setShowSubmitPrompt(false)}>Cancel</button>
              <button className="btn" onClick={downloadCSV}>Download CSV</button>
              <button className="btn btn-green" onClick={reallySubmit}>Submit to Firestore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
