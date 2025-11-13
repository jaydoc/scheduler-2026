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
   FIREBASE (fallbacks kept)
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
    : "attending-scheduler-v-single-rank-1.1";

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

/* Per-attending targets + current counts */
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
   CALENDAR DATA (assigned shifts source)
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

const MONTH_KEYS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
   STATE (single bucket)
========================================================= */
const initialState = { prefs: [] }; // [{date, service, rank}]

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service } = action;
      if (!date || !service) return state;

      // Enforce: cannot pick both services for the same date.
      const filtered = state.prefs.filter((x) => x.date !== date);

      // Already have exact (date, service)? do nothing
      if (state.prefs.some((x) => x.date === date && x.service === service)) {
        return state;
      }

      const next = [
        ...filtered,
        {
          date,
          service,
          rank:
            (filtered.length
              ? Math.max(...filtered.map((y) => y.rank))
              : 0) + 1,
        },
      ];
      return { prefs: compressRanks(next) };
    }

    case "remove": {
      const { date, service } = action;
      const next = state.prefs.filter(
        (x) => !(x.date === date && x.service === service)
      );
      return { prefs: compressRanks(next) };
    }

    case "reorder": {
      // Robust reorder with visible indices
      const { fromIndex, toIndex } = action;
      const arr = compressRanks(state.prefs);
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
      return { prefs: renum };
    }

    case "clear":
      return initialState;

    default:
      return state;
  }
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

  // Login gate via codes
  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [me, setMe] = useState("");
  const [gateErr, setGateErr] = useState("");

  const selectedAtt = useMemo(
    () => ATTENDINGS.find((a) => a.name === me) || null,
    [me]
  );

  // ATTENDING_LIMITS panel visibility
  const [showLimits, setShowLimits] = useState(false);

  // Mode selection (4 modes)
  const MODES = ["Calendar", "QuickAdd", "RankBoard", "DragBuckets"];
  const [mode, setMode] = useState("Calendar");

  // Single-bucket state
  const [{ prefs }, dispatch] = useReducer(reducer, initialState);

  // Drag context (shared rankings list)
  const dragIndexRef = useRef(null);

  const onDragStartItem = (index) => (e) => {
    dragIndexRef.current = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  };

  const onDragOverItem = (index) => (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const onDropItem = (index) => (e) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    const to = index;
    if (from != null && from !== to) {
      dispatch({ type: "reorder", fromIndex: from, toIndex: to });
    }
    dragIndexRef.current = null;
  };

  const onDragEndItem = () => {
    dragIndexRef.current = null;
  };

  // Helpers to add/remove picks
  const addPref = useCallback((date, service) => {
    const avail = getAvailableServicesForDate(date);
    if (!avail.includes(service)) return; // block invalid service
    dispatch({ type: "add", date, service });
  }, []);

  const removePref = useCallback((date, service) => {
    dispatch({ type: "remove", date, service });
  }, []);

  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // Already assigned (from months) for the logged-in attending
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
      chosenNow: prefs.length,
    };
  }, [me, prefs.length]);

  // CSV download (name, date, service, rank)
  const downloadCSV = () => {
    if (!selectedAtt) {
      alert("Please verify your name/code first.");
      return;
    }
    const rows = [];
    const ordered = prefs.slice().sort((a, b) => a.rank - b.rank);
    for (const x of ordered) {
      rows.push({
        name: selectedAtt.name,
        date: x.date,
        service: x.service,
        rank: x.rank,
      });
    }
    const headers = ["name", "date", "service", "rank"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${YEAR}-${selectedAtt.name}-preferences.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Submit flow with CSV prompt
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);

  const submit = async () => {
    if (!selectedAtt) {
      alert("Log in with your code first.");
      return;
    }
    setShowSubmitPrompt(true);
  };

  const reallySubmit = async () => {
    if (!selectedAtt) return;
    const payload = {
      appId,
      year: YEAR,
      who: selectedAtt.name,
      email: selectedAtt.email,
      prefs: prefs.slice().sort((a, b) => a.rank - b.rank),
      ts: serverTimestamp(),
    };
    try {
      await setDoc(
        doc(db, "prefs_single", `${YEAR}-${selectedAtt.name}`),
        payload
      );
      setShowSubmitPrompt(false);
      alert("Saved to Firestore.");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  /* ------------------ Mode UIs ------------------ */

  const CalendarMode = () => (
    <div>
      {MONTH_KEYS.map((mk, i) => (
        <div key={mk} className="month-block">
          <div className="month-head">{MONTH_FULL[i]}</div>
          <div className="month-grid">
            {months[mk].map((d) => {
              const avail = getAvailableServicesForDate(d.date);
              const full = avail.length === 0;
              return (
                <div key={d.date} className="week-card">
                  <div className="week-day">{d.day}</div>
                  <div className="week-label">{fmtLabel(d.date)}</div>
                  {d.detail && (
                    <div className="week-detail">{d.detail}</div>
                  )}
                  <div className="week-slots">
                    {avail.includes(SERVICES.RNI) && (
                      <button
                        className="btn btn-svc"
                        onClick={() => addPref(d.date, SERVICES.RNI)}
                      >
                        RNI → Rank
                      </button>
                    )}
                    {avail.includes(SERVICES.COA) && (
                      <button
                        className="btn btn-svc"
                        onClick={() => addPref(d.date, SERVICES.COA)}
                      >
                        COA → Rank
                      </button>
                    )}
                    {full && (
                      <span className="pill rb-badge">Full</span>
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

  const QuickAddMode = () => {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");

    const saturdays = months[mkey];
    useEffect(() => {
      setDate("");
      setService("");
    }, [mkey]);

    const onAdd = () => {
      if (!date || !service) return;
      addPref(date, service);
    };

    return (
      <div>
        <div className="qa-row" style={{ marginBottom: 8 }}>
          <div className="qa-field">
            <span className="qa-label">Month</span>
            <select
              className="select"
              value={mkey}
              onChange={(e) => setMkey(e.target.value)}
            >
              {MONTH_KEYS.map((k, i) => (
                <option key={k} value={k}>
                  {MONTH_FULL[i]}
                </option>
              ))}
            </select>
          </div>
          <div className="qa-field">
            <span className="qa-label">Date</span>
            <select
              className="select"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            >
              <option value="">Select…</option>
              {saturdays.map((d) => (
                <option key={d.date} value={d.date}>
                  {fmtLabel(d.date)}
                </option>
              ))}
            </select>
          </div>
          <div className="qa-field">
            <span className="qa-label">Service</span>
            <select
              className="select"
              value={service}
              onChange={(e) => setService(e.target.value)}
              disabled={!date}
            >
              <option value="">Select…</option>
              {date &&
                getAvailableServicesForDate(date).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <button className="btn btn-green" onClick={onAdd}>
          Add to Ranking
        </button>
      </div>
    );
  };

  const RankBoardMode = () => (
    <div>
      {MONTH_KEYS.map((mk, i) => (
        <div key={mk} className="month-block">
          <div className="month-head">{MONTH_FULL[i]}</div>
          {months[mk].map((d) => {
            const avail = getAvailableServicesForDate(d.date);
            const full = avail.length === 0;
            return (
              <div key={d.date} className="rb-row">
                <div className="rb-date">
                  <div className="rb-date-main">{fmtLabel(d.date)}</div>
                  {d.detail && (
                    <div className="rb-detail">{d.detail}</div>
                  )}
                </div>
                <div className="rb-actions">
                  {avail.includes(SERVICES.RNI) && (
                    <button
                      className="btn btn-svc"
                      onClick={() => addPref(d.date, SERVICES.RNI)}
                    >
                      RNI
                    </button>
                  )}
                  {avail.includes(SERVICES.COA) && (
                    <button
                      className="btn btn-svc"
                      onClick={() => addPref(d.date, SERVICES.COA)}
                    >
                      COA
                    </button>
                  )}
                  {full && (
                    <span className="rb-badge">Full</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  const DragBucketsMode = () => (
    <div className="drag-layout">
      <div className="drag-source-panel">
        <div className="drag-source-head">
          <span>Available weekends</span>
        </div>
        {MONTH_KEYS.map((mk, i) => (
          <div key={mk} className="drag-month-row">
            <div className="drag-month-title">{MONTH_FULL[i]}</div>
            <div className="drag-month-chips">
              {months[mk].map((d) => {
                const avail = getAvailableServicesForDate(d.date);
                return (
                  <React.Fragment key={d.date}>
                    {avail.map((svc) => (
                      <button
                        key={`${d.date}-${svc}`}
                        className="chip"
                        onClick={() => addPref(d.date, svc)}
                      >
                        <span className="chip-label">
                          {fmtLabel(d.date)}
                        </span>
                        <span className="chip-service">{svc}</span>
                      </button>
                    ))}
                    {avail.length === 0 && (
                      <span className="chip">
                        <span className="chip-label">
                          {fmtLabel(d.date)}
                        </span>
                        <span className="chip-service">Full</span>
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="drag-bucket">
        <div className="drag-bucket-head">
          Your rankings (same list as on the right)
        </div>
        <div className="drag-bucket-body">
          <ol className="preview-list">
            {compressRanks(prefs).map((x, i) => (
              <li
                key={`${x.date}-${x.service}`}
                className="row draggable-item"
                draggable
                onDragStart={onDragStartItem(i)}
                onDragOver={onDragOverItem(i)}
                onDrop={onDropItem(i)}
                onDragEnd={onDragEndItem}
                title="Drag to reorder"
              >
                <span className="row-choice">#{x.rank}</span>
                <span className="row-label">
                  {fmtLabel(x.date)} ({x.service})
                </span>
                <button
                  className="btn-link row-x"
                  onClick={() => removePref(x.date, x.service)}
                >
                  remove
                </button>
              </li>
            ))}
            {prefs.length === 0 && (
              <div className="empty">
                No preferences yet. Click a chip on the left to add.
              </div>
            )}
          </ol>
        </div>
      </div>
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
              code &&
              gateCode &&
              gateCode.toUpperCase() === code.toUpperCase();
            if (!ok) {
              setGateErr("Invalid code or attendee.");
              return;
            }
            const att = ATTENDINGS.find((a) => a.email === gateEmail);
            setGateErr("");
            setMe(att.name);
            setShowLimits(true); // show targets once after login
          }}
        >
          Verify &amp; Continue
        </button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted">
        Tip: you’ll see your name locked in after verification.
      </div>
    </div>
  );

  /* ------------------ RENDER ------------------ */

  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        <div className="topbar">
          <div className="topbar-inner">
            <div className="section-title">
              UAB/COA Weekend Attending Scheduler 2026
            </div>
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
          <div className="main-left">
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
                      <h3 className="section-title">
                        Your targets &amp; current assignments
                      </h3>
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
                      <div
                        className="muted"
                        style={{ marginBottom: 8 }}
                      >
                        Requested:{" "}
                        <b>{limitsSummary.requested}</b>
                        {"  "} | Claimed (assigned):{" "}
                        <b>{limitsSummary.claimed}</b>
                        {"  "} | Left: <b>{limitsSummary.left}</b>
                        {"  "} | You’ve ranked now:{" "}
                        <b>{limitsSummary.chosenNow}</b>
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          Already assigned to you (calendar):
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {alreadyAssigned.length === 0 && (
                            <li>None yet.</li>
                          )}
                          {alreadyAssigned.map((x) => (
                            <li
                              key={`${x.date}-${x.service}`}
                            >
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
                    <div className="modes-row">
                      {MODES.map((m) => (
                        <button
                          key={m}
                          className={`mode-pill ${
                            mode === m ? "active" : ""
                          }`}
                          onClick={() => setMode(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {mode === "Calendar" && <CalendarMode />}
                      {mode === "QuickAdd" && <QuickAddMode />}
                      {mode === "RankBoard" && <RankBoardMode />}
                      {mode === "DragBuckets" && <DragBucketsMode />}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right side: global Rankings + Who */}
          <div className="main-right">
            <div className="section">
              <div className="section-head">
                <h3 className="section-title">
                  Rankings (#1 = most preferred)
                </h3>
                <div className="section-right">
                  <button className="btn-link" onClick={clearAll}>
                    Clear all
                  </button>
                </div>
              </div>
              <div className="section-body">
                <ol className="preview-list">
                  {compressRanks(prefs).map((x, i) => (
                    <li
                      key={`${x.date}-${x.service}`}
                      className="row draggable-item"
                      draggable
                      onDragStart={onDragStartItem(i)}
                      onDragOver={onDragOverItem(i)}
                      onDrop={onDropItem(i)}
                      onDragEnd={onDragEndItem}
                      title="Drag to reorder"
                    >
                      <span className="row-choice">
                        #{x.rank}
                      </span>
                      <span className="row-label">
                        {fmtLabel(x.date)} ({x.service})
                      </span>
                      <button
                        className="btn-link row-x"
                        onClick={() =>
                          removePref(x.date, x.service)
                        }
                      >
                        remove
                      </button>
                    </li>
                  ))}
                  {prefs.length === 0 && (
                    <li className="row">
                      <span className="row-label">
                        <span className="muted">
                          No preferences yet. Use any mode on the
                          left to add.
                        </span>
                      </span>
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
                    {!me && (
                      <option value="">
                        (locked after login)
                      </option>
                    )}
                    {ATTENDINGS.map((a) => (
                      <option key={a.email} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  {me && (
                    <span className="muted">
                      {
                        ATTENDINGS.find(
                          (a) => a.name === me
                        )?.email
                      }
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showSubmitPrompt && (
          <div className="modal">
            <div className="modal-card">
              <div className="modal-title">
                Review before submitting
              </div>
              <p style={{ marginTop: 8 }}>
                Please <b>download your CSV</b> and quickly verify
                that your name, dates, services, and ranks are
                correct.
              </p>
              <div
                className="row right gap"
                style={{ marginTop: 8 }}
              >
                <button
                  className="btn"
                  onClick={() => setShowSubmitPrompt(false)}
                >
                  Cancel
                </button>
                <button className="btn" onClick={downloadCSV}>
                  Download CSV
                </button>
                <button
                  className="btn btn-green"
                  onClick={reallySubmit}
                >
                  Submit to Firestore
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="band" />
    </div>
  );
}
