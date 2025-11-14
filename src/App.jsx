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
  collection,
  getDocs,
  deleteDoc,
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
  { name: "Ambal", fullName: "Namasivayam Ambalavanan", email: "nambalav@uab.edu" },
  { name: "Arora", fullName: "Nitin Arora", email: "nitinarora@uabmc.edu" },
  { name: "Bhatia", fullName: "Kulsajan Bhatia", email: "ksbhatia@uabmc.edu" },
  { name: "Boone", fullName: "Neal Boone", email: "boone@uabmc.edu" },
  { name: "Carlo", fullName: "Waldemar Carlo", email: "wcarlo@uabmc.edu" },
  { name: "Jain", fullName: "Viral Jain", email: "viraljain@uabmc.edu" },
  { name: "Kandasamy", fullName: "Jegen Kandasamy", email: "jkandasamy@uabmc.edu", isAdmin: true },
  { name: "Kane", fullName: "Andrea Kane", email: "akane@uabmc.edu" },
  { name: "Mackay", fullName: "Amy Mackay", email: "mackay@uabmc.edu" },
  { name: "Schuyler", fullName: "Amelia Schuyler", email: "aschuyler@uabmc.edu" },
  { name: "Shukla", fullName: "Vivek Shukla", email: "vshukla@uabmc.edu" },
  { name: "Sims", fullName: "Brian Sims", email: "bsims@uabmc.edu" },
  { name: "Travers", fullName: "Colm Travers", email: "cptravers@uabmc.edu" },
  { name: "Willis", fullName: "Kent Willis", email: "kentwillis@uabmc.edu" },
  { name: "Winter", fullName: "Lindy Winter", email: "lwinter@uabmc.edu" },
  { name: "Salas", fullName: "Ariel Salas", email: "asalas@uabmc.edu" },
  { name: "Lal", fullName: "Vivek Lal", email: "clal@uabmc.edu" },
  { name: "Vivian", fullName: "Vivian Valcarce", email: "vvalcarceluaces@uabmc.edu" },
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

function InlineServicePopover({ x, y, date, onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
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
      <button className="btn-link" style={{marginTop:4, fontSize:11}} onClick={onClose}>
        cancel
      </button>
    </div>
  );
}

const initialState = { rankings: [] };

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service } = action;
      if (!date || !service) return state;
      const filtered = state.rankings.filter((x) => x.date !== date);
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
      const next = state.rankings.filter((x) => !(x.date === date && x.service === service));
      return { rankings: compressRanks(next) };
    }
    case "reorder": {
      const { fromIndex, toIndex } = action;
      const arr = compressRanks(state.rankings);
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= arr.length || toIndex >= arr.length) {
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

  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [me, setMe] = useState("");
  const [gateErr, setGateErr] = useState("");

  const selected = useMemo(() => ATTENDINGS.find((a) => a.name === me) || null, [me]);
  const [mode, setMode] = useState(MODES.CAL);
  const [showLimits, setShowLimits] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [allocatedSchedule, setAllocatedSchedule] = useState(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const [dismissedInstructions, setDismissedInstructions] = useState({});
  const [{ rankings }, dispatch] = useReducer(reducer, initialState);

  const dragIndex = useRef(null);
  const onDragStartItem = (index) => () => { dragIndex.current = index; };
  const onDragOverItem = (index) => (e) => { e.preventDefault(); };
  const onDropItem = (index) => () => {
    const from = dragIndex.current;
    const to = index;
    if (from == null || from === to) return;
    dispatch({ type: "reorder", fromIndex: from, toIndex: to });
    dragIndex.current = null;
  };

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

  const add = useCallback((date, service) => {
    const avail = getAvailableServicesForDate(date);
    if (!avail.includes(service)) return;
    dispatch({ type: "add", date, service });
  }, []);

  const remove = useCallback((date, service) => {
    dispatch({ type: "remove", date, service });
  }, []);

  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // Admin functions
  const loadAllSubmissions = async () => {
    if (!db) return;
    setLoadingSubmissions(true);
    try {
      const snapshot = await getDocs(collection(db, "prefs_single"));
      const submissions = [];
      snapshot.forEach((doc) => {
        submissions.push({ id: doc.id, ...doc.data() });
      });
      setAllSubmissions(submissions);
    } catch (e) {
      console.error("Failed to load submissions", e);
      alert("Failed to load submissions");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const downloadAllSubmissionsCSV = () => {
    if (allSubmissions.length === 0) {
      alert("No submissions to download");
      return;
    }
    const rows = [];
    for (const sub of allSubmissions) {
      const rankings = Array.isArray(sub.rankings) ? sub.rankings : [];
      for (const r of rankings) {
        rows.push({
          name: sub.who,
          email: sub.email,
          date: r.date,
          service: r.service,
          rank: r.rank,
        });
      }
    }
    const headers = ["name", "email", "date", "service", "rank"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${YEAR}-all-submissions.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const resetUserData = async (userName) => {
    if (!db) return;
    const confirmed = window.confirm(
      `Are you sure you want to reset all data for ${userName}? This will delete their draft and submission.`
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "prefs_draft", `${YEAR}-${userName}`));
      await deleteDoc(doc(db, "prefs_single", `${YEAR}-${userName}`));
      alert(`Successfully reset data for ${userName}`);
      loadAllSubmissions();
    } catch (e) {
      console.error("Failed to reset user data", e);
      alert("Failed to reset user data");
    }
  };

  // Fair allocation algorithm
  const runAllocationAlgorithm = () => {
    if (allSubmissions.length === 0) {
      alert("No submissions to allocate");
      return;
    }

    // Build preference map: {attendingName: [{date, service, rank}, ...]}
    const preferenceMap = {};
    allSubmissions.forEach((sub) => {
      const rankings = Array.isArray(sub.rankings) ? sub.rankings : [];
      preferenceMap[sub.who] = rankings.sort((a, b) => a.rank - b.rank);
    });

    // Get all slots that need filling
    const slotsToFill = [];
    for (const mk of MONTH_KEYS) {
      for (const d of months[mk]) {
        if (!d.rni) slotsToFill.push({ date: d.date, service: "RNI" });
        if (!d.coa) slotsToFill.push({ date: d.date, service: "COA" });
      }
    }

    // Track assignments: {attendingName: count}
    const assignmentCounts = {};
    ATTENDINGS.forEach((a) => {
      assignmentCounts[a.name] = ATTENDING_LIMITS[a.name]?.claimed || 0;
    });

    // Final schedule
    const schedule = {};

    // Algorithm: Process each slot, assign to the person with highest preference who can take it
    const usedSlots = new Set();
    
    // Sort attendings by how many slots they still need (those needing more get priority)
    const sortedAttendings = [...ATTENDINGS].sort((a, b) => {
      const aNeeded = (ATTENDING_LIMITS[a.name]?.requested || 0) - assignmentCounts[a.name];
      const bNeeded = (ATTENDING_LIMITS[b.name]?.requested || 0) - assignmentCounts[b.name];
      return bNeeded - aNeeded;
    });

    // Iterate multiple rounds to ensure fair distribution
    let maxRounds = 50;
    let round = 0;
    
    while (round < maxRounds) {
      let assignedThisRound = false;
      
      for (const attending of sortedAttendings) {
        const name = attending.name;
        const limit = ATTENDING_LIMITS[name];
        if (!limit) continue;
        
        const needed = limit.requested - assignmentCounts[name];
        if (needed <= 0) continue;
        
        const prefs = preferenceMap[name] || [];
        
        // Find their highest-ranked available preference
        for (const pref of prefs) {
          const slotKey = `${pref.date}-${pref.service}`;
          if (usedSlots.has(slotKey)) continue;
          
          // Check if this slot is actually available
          const isAvailable = slotsToFill.some(
            (s) => s.date === pref.date && s.service === pref.service
          );
          if (!isAvailable) continue;
          
          // Assign this slot
          if (!schedule[pref.date]) schedule[pref.date] = {};
          schedule[pref.date][pref.service] = name;
          usedSlots.add(slotKey);
          assignmentCounts[name]++;
          assignedThisRound = true;
          break;
        }
      }
      
      if (!assignedThisRound) break;
      round++;
    }

    // Check for unfilled slots
    const unfilledSlots = slotsToFill.filter((slot) => {
      const slotKey = `${slot.date}-${slot.service}`;
      return !usedSlots.has(slotKey);
    });

    setAllocatedSchedule({
      schedule,
      assignmentCounts,
      unfilledSlots,
      stats: {
        totalSlots: slotsToFill.length,
        filledSlots: usedSlots.size,
        unfilledSlots: unfilledSlots.length,
      },
    });
    setShowAllocationModal(true);
  };

  const saveAllocation = async () => {
    if (!allocatedSchedule || !db) return;
    
    const confirmed = window.confirm(
      "Are you sure you want to save this allocation? This will update the schedule permanently."
    );
    if (!confirmed) return;

    try {
      const allocationDoc = {
        year: YEAR,
        schedule: allocatedSchedule.schedule,
        assignmentCounts: allocatedSchedule.assignmentCounts,
        unfilledSlots: allocatedSchedule.unfilledSlots,
        stats: allocatedSchedule.stats,
        createdAt: serverTimestamp(),
        createdBy: selected?.name || "Admin",
      };
      
      await setDoc(doc(db, "allocations", `${YEAR}-final`), allocationDoc);
      alert("Allocation saved successfully!");
      setShowAllocationModal(false);
    } catch (e) {
      console.error("Failed to save allocation", e);
      alert("Failed to save allocation");
    }
  };

  const downloadAllocationCSV = () => {
    if (!allocatedSchedule) return;
    
    const rows = [];
    for (const date in allocatedSchedule.schedule) {
      const services = allocatedSchedule.schedule[date];
      for (const service in services) {
        const attending = services[service];
        rows.push({ date, service, attending });
      }
    }
    
    const headers = ["date", "service", "attending"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${YEAR}-final-allocation.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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

  const downloadCSV = () => {
    if (!selected) {
      alert("Verify your name/code first.");
      return;
    }
    const rows = [];
    const ordered = compressRanks(rankings);
    for (const r of ordered) {
      rows.push({ name: selected.name, date: r.date, service: r.service, rank: r.rank });
    }
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

  const CalendarMode = () => (
    <div style={{ display: "flex", gap: 20 }}>
      <div className="months" style={{ flex: 1 }}>
        {dismissedInstructions[MODES.CAL] !== true && (
          <div style={{ 
            padding: 16, 
            marginBottom: 16, 
            background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)', 
            borderRadius: 12, 
            border: '1px solid #c7d2fe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#5b21b6', marginBottom: 6 }}>
                📅 Calendar Mode Instructions
              </div>
              <div style={{ fontSize: 13, color: '#5b21b6' }}>
                <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>Browse all weekends by month</li>
                  <li>Click "RNI → Rank" or "COA → Rank" buttons to add a weekend to your rankings</li>
                  <li>Already assigned weekends show the attending's name</li>
                  <li><strong>Please rank as many weekends as possible to maximize your chances of getting your most preferred weekends</strong></li>
                </ol>
              </div>
            </div>
            <button 
              className="btn-link" 
              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
              onClick={() => setDismissedInstructions(prev => ({ ...prev, [MODES.CAL]: true }))}
            >
              Dismiss
            </button>
          </div>
        )}
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
                  <div key={`${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`} className="day">
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    <div className="pill-row">
                      {d.rni && <Pill>RNI: {d.rni}</Pill>}
                      {d.coa && <Pill>COA: {d.coa}</Pill>}
                      {d.isTaken && <Pill>Full weekend</Pill>}
                      {already && <Pill>Rank #{already.rank}</Pill>}
                    </div>
                    <div className="svc-actions">
                      {avail.includes(SERVICES.RNI) && (
                        <button className="btn btn-svc" onClick={() => add(d.date, SERVICES.RNI)}>
                          RNI → Rank
                        </button>
                      )}
                      {avail.includes(SERVICES.COA) && (
                        <button className="btn btn-svc" onClick={() => add(d.date, SERVICES.COA)}>
                          COA → Rank
                        </button>
                      )}
                      {avail.length === 0 && <span className="pill pill-muted">Full</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ position: "sticky", top: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 4 }}>Your Rankings</h4>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontStyle: 'italic' }}>
            Drag items to reorder (higher = more preferred)
          </div>
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
                <button className="btn-link" onClick={() => remove(r.date, r.service)}>
                  remove
                </button>
              </li>
            ))}
            {rankings.length === 0 && (
              <li className="preview-item">
                <span className="muted">No preferences yet.</span>
              </li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );

  const QuickAddMode = () => {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const avail = date ? getAvailableServicesForDate(date) : [];
    const chosen = date && service ? { date, service } : null;

    return (
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          {dismissedInstructions[MODES.QA] !== true && (
            <div style={{ 
              padding: 16, 
              marginBottom: 16, 
              background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)', 
              borderRadius: 12, 
              border: '1px solid #c7d2fe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#5b21b6', marginBottom: 6 }}>
                  ⚡ QuickAdd Mode Instructions
                </div>
                <div style={{ fontSize: 13, color: '#5b21b6' }}>
                  Use the dropdown menus to quickly select a month, Saturday, and service (RNI or COA). Click "Add to Rankings" to add your selection.
                </div>
              </div>
              <button 
                className="btn-link" 
                style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                onClick={() => setDismissedInstructions(prev => ({ ...prev, [MODES.QA]: true }))}
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="qa-layout">
            <div className="qa-form">
              <label>
                Month
                <select className="qa-select" value={mkey} onChange={e => setMkey(e.target.value)}>
                  {MONTH_KEYS.map((mk, idx) => (
                    <option key={mk} value={mk}>{MONTH_FULL[idx]}</option>
                  ))}
                </select>
              </label>
              <label>
                Saturday
                <select className="qa-select" value={date} onChange={e => setDate(e.target.value)}>
                  <option value="">Pick Saturday</option>
                  {saturdays.map(d => (
                    <option key={d.date} value={d.date}>{d.day} — {fmtLabel(d.date)}</option>
                  ))}
                </select>
              </label>
              <label>
                Service
                <select className="qa-select" value={service} onChange={e => setService(e.target.value)} disabled={!date}>
                  <option value="">Pick service</option>
                  {avail.includes(SERVICES.RNI) && <option value={SERVICES.RNI}>RNI</option>}
                  {avail.includes(SERVICES.COA) && <option value={SERVICES.COA}>COA</option>}
                </select>
              </label>
              <button className="btn btn-green" disabled={!date || !service} onClick={() => add(date, service)}>
                Add to Rankings
              </button>
            </div>
            {chosen && (
              <div className="qa-note">
                You are adding: <b>{fmtLabel(chosen.date)}</b> — <b>{service}</b>
              </div>
            )}
          </div>
        </div>
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ position: "sticky", top: 20 }}>
            <h4 style={{ marginTop: 0, marginBottom: 4 }}>Your Rankings</h4>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontStyle: 'italic' }}>
              Drag items to reorder (higher = more preferred)
            </div>
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
                  <button className="btn-link" onClick={() => remove(r.date, r.service)}>remove</button>
                </li>
              ))}
              {rankings.length === 0 && (
                <li className="preview-item"><span className="muted">No preferences yet.</span></li>
              )}
            </ol>
          </div>
        </div>
      </div>
    );
  };

  const RankBoardMode = () => (
    <div style={{ display: "flex", gap: 20 }}>
      <div className="months" style={{ flex: 1 }}>
        {dismissedInstructions[MODES.RB] !== true && (
          <div style={{ 
            padding: 16, 
            marginBottom: 16, 
            background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)', 
            borderRadius: 12, 
            border: '1px solid #c7d2fe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#5b21b6', marginBottom: 6 }}>
                🎯 RankBoard Mode Instructions
              </div>
              <div style={{ fontSize: 13, color: '#5b21b6' }}>
                <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>View all weekends in a calendar layout</li>
                  <li>Click buttons to add weekends to your ranked preferences</li>
                  <li>Your current rank appears on each selected weekend</li>
                  <li><strong>Please rank as many weekends as possible to maximize your chances of getting your most preferred weekends</strong></li>
                </ol>
              </div>
            </div>
            <button 
              className="btn-link" 
              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
              onClick={() => setDismissedInstructions(prev => ({ ...prev, [MODES.RB]: true }))}
            >
              Dismiss
            </button>
          </div>
        )}
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
                        <button className="btn btn-svc" onClick={() => add(d.date, SERVICES.RNI)}>
                          RNI → Rank
                        </button>
                      )}
                      {avail.includes(SERVICES.COA) && (
                        <button className="btn btn-svc" onClick={() => add(d.date, SERVICES.COA)}>
                          COA → Rank
                        </button>
                      )}
                      {avail.length === 0 && <span className="pill pill-muted">Full</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ position: "sticky", top: 20 }}>
          <h4 style={{ marginTop: 0, marginBottom: 4 }}>Your Rankings</h4>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontStyle: 'italic' }}>
            Drag items to reorder (higher = more preferred)
          </div>
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
                <button className="btn-link" onClick={() => remove(r.date, r.service)}>remove</button>
              </li>
            ))}
            {rankings.length === 0 && (
              <li className="preview-item"><span className="muted">No preferences yet.</span></li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );

  const DragBucketsMode = () => {
    const [popover, setPopover] = useState(null);
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
    const chosenKeys = new Set(rankings.map(r => `${r.date}`));

    return (
      <div style={{ display: "flex", gap: 20 }}>
        <div className="dragbuckets" style={{ flex: 1 }}>
          {dismissedInstructions[MODES.DB] !== true && (
            <div style={{ 
              padding: 16, 
              marginBottom: 16, 
              background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)', 
              borderRadius: 12, 
              border: '1px solid #c7d2fe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#5b21b6', marginBottom: 6 }}>
                  🎪 DragBuckets Mode Instructions
                </div>
                <div style={{ fontSize: 13, color: '#5b21b6' }}>
                  Click any available weekend date to select a service (RNI or COA). Drag items in the right panel to reorder your preferences. Higher position = higher priority.
                </div>
              </div>
              <button 
                className="btn-link" 
                style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                onClick={() => setDismissedInstructions(prev => ({ ...prev, [MODES.DB]: true }))}
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="db-left">
            <div className="db-title">Available weekends</div>
            <div className="db-months">
              {MONTH_KEYS.map((mk, idx) => (
                <div className="db-month" key={mk}>
                  <div className="db-month-title">{MONTH_FULL[idx]}</div>
                  <div className="db-chip-row">
                    {months[mk].map(d => {
                      if (chosenKeys.has(d.date)) return null;
                      return (
                        <button key={d.date} className="db-chip" onClick={(e) => openPopover(e, d.date)}>
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
                  <button className="btn-link" onClick={() => remove(r.date, r.service)}>remove</button>
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
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ position: "sticky", top: 20 }}>
            <h4 style={{ marginTop: 0, marginBottom: 4 }}>Your Rankings</h4>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontStyle: 'italic' }}>
              Drag items to reorder (higher = more preferred)
            </div>
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
                  <button className="btn-link" onClick={() => remove(r.date, r.service)}>remove</button>
                </li>
              ))}
              {rankings.length === 0 && (
                <li className="preview-item"><span className="muted">No preferences yet.</span></li>
              )}
            </ol>
          </div>
        </div>
      </div>
    );
  };

  const ModeTabs = () => (
    <div className="mode-tabs">
      <button className={mode === MODES.CAL ? "tab active" : "tab"} onClick={() => setMode(MODES.CAL)}>
        Calendar
      </button>
      <button className={mode === MODES.QA ? "tab active" : "tab"} onClick={() => setMode(MODES.QA)}>
        QuickAdd
      </button>
      <button className={mode === MODES.RB ? "tab active" : "tab"} onClick={() => setMode(MODES.RB)}>
        RankBoard
      </button>
      <button className={mode === MODES.DB ? "tab active" : "tab"} onClick={() => setMode(MODES.DB)}>
        DragBuckets
      </button>
    </div>
  );

  const loginPanel = (
    <div className="login">
      <div className="login-title">Enter your one-time code</div>
      <div className="id-row">
        <select className="id-select" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)}>
          <option value="">Select your name</option>
          {ATTENDINGS.map((a) => (
            <option key={a.email} value={a.email}>
              {a.fullName} ({a.name})
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
            const ok = code && gateCode && gateCode.toUpperCase() === code.toUpperCase();
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
      <div className="muted">Tip: you'll see your name locked in after verification.</div>
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
            {selected && (
              <span className="badge" style={{ 
                background: selected.isAdmin 
                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
                  : 'rgba(255, 255, 255, 0.2)',
                color: selected.isAdmin ? '#111827' : '#ffffff',
                borderColor: selected.isAdmin ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.3)',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 700
              }}>
                {selected.isAdmin && '👑 '}
                {selected.fullName}
              </span>
            )}
            {selected?.isAdmin && (
              <button className="btn btn-amber" onClick={() => setShowAdminPanel(!showAdminPanel)}>
                {showAdminPanel ? 'Hide Admin Panel' : 'Admin Panel'}
              </button>
            )}
            <a 
              href="https://github.com/jaydoc/scheduler-2026" 
              target="_blank" 
              rel="noopener noreferrer"
              className="badge"
              style={{ 
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer'
              }}
              title="View source code on GitHub"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginTop: 1 }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <span className="badge">{firebaseConfig.projectId}</span>
            <button className="btn" onClick={submit}>Submit</button>
            <button className="btn btn-green" onClick={downloadCSV}>Download CSV</button>
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
                {selected?.isAdmin && showAdminPanel && (
                  <div className="section" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderColor: '#fbbf24' }}>
                    <div className="section-head">
                      <h3 className="section-title">👑 Admin Panel</h3>
                    </div>
                    <div className="section-body">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        
                        {/* View All Submissions */}
                        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📊 View All Submissions</h4>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                            <button className="btn btn-green" onClick={loadAllSubmissions} disabled={loadingSubmissions}>
                              {loadingSubmissions ? 'Loading...' : 'Load All Submissions'}
                            </button>
                            {allSubmissions.length > 0 && (
                              <button className="btn" onClick={downloadAllSubmissionsCSV}>
                                Download All as CSV
                              </button>
                            )}
                          </div>
                          {allSubmissions.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                                Total Submissions: {allSubmissions.length} / {ATTENDINGS.length}
                              </div>
                              <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                {allSubmissions.map((sub) => (
                                  <div key={sub.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <strong>{sub.who}</strong> ({sub.email})
                                      <br />
                                      <span style={{ fontSize: 12, color: '#64748b' }}>
                                        {sub.rankings?.length || 0} preferences ranked
                                      </span>
                                    </div>
                                    <button className="btn-link" style={{ color: '#dc2626' }} onClick={() => resetUserData(sub.who)}>
                                      Reset
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Analytics Dashboard */}
                        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📈 Analytics</h4>
                          {allSubmissions.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                              <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1' }}>
                                  {allSubmissions.length}
                                </div>
                                <div style={{ fontSize: 12, color: '#0369a1' }}>Submitted</div>
                              </div>
                              <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>
                                  {ATTENDINGS.length - allSubmissions.length}
                                </div>
                                <div style={{ fontSize: 12, color: '#92400e' }}>Pending</div>
                              </div>
                              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>
                                  {Math.round((allSubmissions.length / ATTENDINGS.length) * 100)}%
                                </div>
                                <div style={{ fontSize: 12, color: '#15803d' }}>Completion</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: '#64748b' }}>Load submissions to see analytics</div>
                          )}
                        </div>

                        {/* Run Allocation Algorithm */}
                        <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>🎯 Run Fair Allocation</h4>
                          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
                            This algorithm will fairly distribute weekends based on everyone's ranked preferences and requested limits.
                          </p>
                          <button 
                            className="btn primary" 
                            onClick={runAllocationAlgorithm}
                            disabled={allSubmissions.length === 0}
                          >
                            Run Allocation Algorithm
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {showLimits && limitsSummary && (
                  <div className="section">
                    <div className="section-head">
                      <h3 className="section-title">Your targets & current assignments</h3>
                      <div className="section-right">
                        <button className="btn btn-amber" onClick={() => setShowLimits(false)}>OK</button>
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
                              <li key={i}>{fmtLabel(a.date)} — {a.service}</li>
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
              </>
            )}
          </div>
        </div>
      </div>
      {showAllocationModal && allocatedSchedule && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 'min(800px, 90vw)', maxHeight: '90vh', overflow: 'auto' }}>
            <h3>🎯 Allocation Results</h3>
            
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>
                  {allocatedSchedule.stats.filledSlots}
                </div>
                <div style={{ fontSize: 12, color: '#15803d' }}>Slots Filled</div>
              </div>
              <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>
                  {allocatedSchedule.stats.unfilledSlots}
                </div>
                <div style={{ fontSize: 12, color: '#92400e' }}>Unfilled</div>
              </div>
              <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1' }}>
                  {Math.round((allocatedSchedule.stats.filledSlots / allocatedSchedule.stats.totalSlots) * 100)}%
                </div>
                <div style={{ fontSize: 12, color: '#0369a1' }}>Fill Rate</div>
              </div>
            </div>

            {/* Assignment counts per attending */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Assignments per Attending:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, fontSize: 12 }}>
                {Object.entries(allocatedSchedule.assignmentCounts).map(([name, count]) => {
                  const limit = ATTENDING_LIMITS[name];
                  return (
                    <div key={name} style={{ padding: 8, background: '#f8fafc', borderRadius: 6 }}>
                      <strong>{name}</strong>: {count} / {limit?.requested || 0}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unfilled slots */}
            {allocatedSchedule.unfilledSlots.length > 0 && (
              <div style={{ marginBottom: 20, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>
                  ⚠️ Unfilled Slots ({allocatedSchedule.unfilledSlots.length}):
                </h4>
                <div style={{ fontSize: 12 }}>
                  {allocatedSchedule.unfilledSlots.map((slot, i) => (
                    <span key={i} style={{ marginRight: 8 }}>
                      {fmtLabel(slot.date)} ({slot.service})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule preview */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Schedule Preview:</h4>
              <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 12 }}>
                {Object.entries(allocatedSchedule.schedule)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, services]) => (
                    <div key={date} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #f1f5f9' }}>
                      <strong>{fmtLabel(date)}:</strong>{' '}
                      {services.RNI && `RNI: ${services.RNI}`}
                      {services.RNI && services.COA && ', '}
                      {services.COA && `COA: ${services.COA}`}
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-green" onClick={saveAllocation}>
                Save Allocation to Database
              </button>
              <button className="btn" onClick={downloadAllocationCSV}>
                Download as CSV
              </button>
              <button className="btn" onClick={() => setShowAllocationModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}