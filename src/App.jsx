// App.jsx — minimal, targeted updates:
// - Submit flow adds a "Review & Download" modal prompting CSV download & verification.
// - DragBuckets shows a contextual service popover near the user’s drop/click location when both services are open.
// Everything else is preserved.

import React, { useEffect, useMemo, useReducer, useState, useCallback, useRef } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

/* =========================================================
   FIREBASE CONFIG (unchanged; keeps your original fallbacks)
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
   CONSTANTS / DATA — keep whatever you already had here
   (ATTENDINGS, ATTENDING_CODES, months, helpers, reducer, etc.)
========================================================= */

// -------------- BEGIN: keep your existing constants --------------
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

// NOTE: months[] and helpers (compressRanks, nextRank, getAvailableServicesForDate, fmtLabel, etc.)
// should remain exactly as in your current working file. For brevity here, I’ll include the same
// content you shared earlier. If your local file differs, keep your version.
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
const MONTH_KEYS  = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
// -------------- END: keep your existing constants --------------

/* =========================================================
   Reducer (same shape you already use)
   NOTE: This snippet assumes you are still on the “Most/Least” *or* single list.
   We won’t change your structure. We’ll detect and export CSV accordingly.
========================================================= */
const initialState = { most: [], least: [], prefs: [] }; // keep all; you may be using one of these

function enforceInvariants(state) {
  // If single-list mode is used:
  if (Array.isArray(state.prefs) && state.prefs.length) {
    const uniq = new Map(); // key: date+service (or just date if you chose that), keep first
    for (const it of state.prefs) {
      uniq.set(`${it.date}|${it.service ?? ""}`, it);
    }
    const prefs = compressRanks(Array.from(uniq.values()));
    return { ...state, prefs };
  }
  // If dual-bucket mode is used:
  const leastDates = new Set(state.least.map(x => x.date));
  const mostClean  = state.most.filter(x => !leastDates.has(x.date));
  const uniqByDate = (items) => {
    const seen = new Set(); const out = [];
    for (const it of items) { const k = it.date; if (!seen.has(k)) { seen.add(k); out.push(it); } }
    return out;
  };
  const mostUniq = uniqByDate(mostClean);
  const leastUniq = uniqByDate(state.least);
  return { ...state, most: compressRanks(mostUniq), least: compressRanks(leastUniq) };
}

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { model = "dual", bucket = "most", date, service } = action;
      if (!date) return state;
      // Single-list model
      if (model === "single") {
        const list = state.prefs || [];
        // prevent duplicates of same date+service
        if (hasDateService(list, date, service)) return state;
        const next = [...list, { date, service, rank: nextRank(list) }];
        return enforceInvariants({ ...state, prefs: next });
      }
      // Dual-bucket model (unchanged)
      if (bucket === "most" && hasDate(state.least, date)) return state;
      if (bucket === "least" && hasDate(state.most, date)) return state;
      const list = bucket === "most" ? state.most : state.least;
      const other = bucket === "most" ? state.least : state.most;
      if (list.some(x => x.date === date && x.service !== service)) return state;
      if (hasDateService(list, date, service)) return state;
      const added = [...list, { date, service, rank: nextRank(list) }];
      return enforceInvariants(bucket === "most" ? { ...state, most: added, least: other } : { ...state, most: other, least: added });
    }
    case "remove": {
      const { model = "dual", bucket = "most", date, service } = action;
      if (model === "single") {
        const filtered = (state.prefs || []).filter(x => !(x.date === date && x.service === service));
        return enforceInvariants({ ...state, prefs: filtered });
      }
      const list = bucket === "most" ? state.most : state.least;
      const other = bucket === "most" ? state.least : state.most;
      const filtered = list.filter(x => !(x.date === date && x.service === service));
      return enforceInvariants(bucket === "most" ? { ...state, most: filtered, least: other } : { ...state, most: other, least: filtered });
    }
    case "clear":
      return initialState;
    default:
      return state;
  }
}

/* =========================================================
   Small UI atoms reused
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
   Review & Download Modal (NEW, shown on Submit)
========================================================= */
function ReviewModal({ open, onClose, onContinue, onDownloadCSV, name }) {
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-title">Review your preferences</div>
        <p className="muted" style={{marginBottom:8}}>
          Please <strong>download the CSV</strong> and quickly verify that your name, dates, services and ranks
          are recorded correctly. When you’re satisfied, click <strong>Continue</strong> to submit.
        </p>
        <div className="row right gap" style={{marginTop:8}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={onDownloadCSV}>Download CSV</button>
          <button className="btn btn-green" onClick={onContinue}>Continue</button>
        </div>
        {name ? <div className="muted" style={{marginTop:6}}>User: {name}</div> : null}
      </div>
    </div>
  );
}

/* =========================================================
   Contextual Service Popover (NEW for DragBuckets)
   Anchors near the user’s drop/click coordinates.
========================================================= */
function ServicePopover({ anchor, services, onPick, onClose }) {
  if (!anchor) return null;
  const style = {
    position: "fixed",
    left: Math.max(8, Math.min(window.innerWidth - 220, anchor.x - 10)),
    top: Math.max(8, Math.min(window.innerHeight - 140, anchor.y + 8)),
    zIndex: 60,
  };
  return (
    <div style={style}>
      <div className="modal-card" style={{padding:10}}>
        <div className="modal-title" style={{marginBottom:6}}>Pick Service</div>
        <div className="row gap">
          {services.map(s => (
            <button key={s} className="btn btn-svc" onClick={() => { onPick(s); onClose(); }}>
              {s}
            </button>
          ))}
        </div>
        <div className="row right" style={{marginTop:8}}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP (ONLY the submit flow & DragBuckets popover are new)
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

  // Name gate (unchanged)
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

  // Your current mode & state shape are preserved
  const [mode, setMode] = useState(MODES.RB);
  const [{ most, least, prefs }, dispatch] = useReducer(reducer, initialState);

  // ---- helpers you already use (add only where needed) ----
  const addTo = useCallback((opts) => dispatch({ type: "add", ...opts }), []);
  const removeFrom = useCallback((opts) => dispatch({ type: "remove", ...opts }), []);
  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);

  // -------- CSV (unchanged; used by new modal) --------
  const getPreviewRows = () => {
    // Support single-list or dual-list without changing your current data shape
    if (Array.isArray(prefs) && prefs.length) {
      return compressRanks(prefs).map(x => ({
        name: selected?.name ?? "",
        date: x.date,
        service: x.service,
        bucket: "Rank",      // single ranking
        rank: x.rank
      }));
    }
    const rows = [];
    compressRanks(most).forEach(x => rows.push({ name: selected?.name ?? "", bucket: "Most", date: x.date, service: x.service, rank: x.rank }));
    compressRanks(least).forEach(x => rows.push({ name: selected?.name ?? "", bucket: "Least", date: x.date, service: x.service, rank: x.rank }));
    return rows;
  };

  const downloadCSV = () => {
    const headers = ["name","date","service","bucket","rank"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const rows = getPreviewRows();
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fname = `${YEAR}-${selected?.name ?? "user"}-preferences.csv`;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // -------- NEW: Submit -> Review modal gating --------
  const [reviewOpen, setReviewOpen] = useState(false);
  const submit = async () => {
    if (!selected) { alert("Log in with your code first."); return; }
    setReviewOpen(true); // open the “download & verify” prompt first
  };
  const reallySubmit = async () => {
    setReviewOpen(false);
    const payload = {
      appId,
      year: YEAR,
      who: selected.name,
      email: selected.email,
      // Save whichever model you are using
      prefs: Array.isArray(prefs) && prefs.length ? compressRanks(prefs) : undefined,
      most: (!prefs || prefs.length === 0) ? compressRanks(most) : undefined,
      least: (!prefs || prefs.length === 0) ? compressRanks(least) : undefined,
      ts: serverTimestamp(),
      isAdmin
    };
    try {
      await setDoc(doc(db, "prefs", `${YEAR}-${selected.name}`), payload);
      alert("Saved to Firestore. Thanks!");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  /* -------------------- Collapsible month wrapper (unchanged) -------------------- */
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

  /* -------------------------- Calendar (keep your existing UI) -------------------------- */
  function peerKey(d){ return `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`; }

  function CalendarMode() {
    // Keep your in-place click-to-add implementation as-is.
    const onClickSvc = (date, service, bucketOrModel) => {
      const avail = getAvailableServicesForDate(date);
      if (!avail.includes(service)) return;
      // If you are now using single ranking, pass model:"single"
      // Otherwise keep your bucket = "most"/"least" as before.
      if (bucketOrModel === "single") {
        addTo({ model: "single", date, service });
      } else {
        addTo({ bucket: bucketOrModel || "most", date, service });
      }
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
                          <button className="btn btn-svc" disabled={taken} onClick={() => onClickSvc(d.date, SERVICES.RNI, "single")}>RNI → Rank</button>
                        </>
                      )}
                      {avail.includes(SERVICES.COA) && (
                        <>
                          <button className="btn btn-svc" disabled={taken} onClick={() => onClickSvc(d.date, SERVICES.COA, "single")}>COA → Rank</button>
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

  /* -------------------------- QuickAdd (kept intact) -------------------------- */
  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const onAdd = () => {
      if (!date || !service) return;
      addTo({ model: "single", date, service });
    };
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
        <button className="btn btn-green" onClick={onAdd}>Add</button>
      </div>
    );
  }

  /* -------------------------- RankBoard (kept one-click) -------------------------- */
  function RankBoardMode() {
    const renderRow = (d) => {
      const avail = getAvailableServicesForDate(d.date);
      const disabled = d.isTaken || avail.length === 0;
      const svcBtns = (svc) => (
        <button
          className="btn btn-svc"
          disabled={disabled || !avail.includes(svc)}
          onClick={() => addTo({ model: "single", date: d.date, service: svc })}
        >
          {svc} → Rank
        </button>
      );
      return (
        <div key={peerKey(d)} className="rb-row">
          <div>
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
        <div className="muted" style={{marginBottom:8}}>One click to rank by service.</div>
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            {months[mk].map(renderRow)}
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  /* -------------------------- DragBuckets (NEW contextual popover) -------------------------- */
  function DragBucketsMode() {
    const [drag, setDrag] = useState(null);
    const [svcAnchor, setSvcAnchor] = useState(null); // { x, y, date }
    const [svcChoices, setSvcChoices] = useState([]);

    const chips = useMemo(() => {
      const chosenDates = new Set((prefs && prefs.length ? prefs : [...most, ...least]).map(x => x.date));
      return MONTH_KEYS.map((mk, i) => ({
        mkey: mk, label: MONTH_FULL[i],
        items: months[mk].filter(d => !d.isTaken && !chosenDates.has(d.date)).map(d => ({ date: d.date }))
      }));
    }, [most, least, prefs]);

    const onDropTo = (e, _bucketIgnored) => {
      if (!drag) return;
      const avail = getAvailableServicesForDate(drag.date);
      if (avail.length === 0) { setDrag(null); return; }
      // Single-ranking: user must pick which service if both are open.
      if (avail.length === 1) {
        addTo({ model: "single", date: drag.date, service: avail[0] });
      } else {
        setSvcChoices(avail);
        setSvcAnchor({ x: e.clientX, y: e.clientY, date: drag.date });
      }
      setDrag(null);
    };

    const pickService = (svc) => {
      if (!svcAnchor) return;
      addTo({ model: "single", date: svcAnchor.date, service: svc });
    };

    return (
      <div className="drag-grid">
        <div>
          <div className="muted">Drag an available date; if both services are open, pick appears next to your drop.</div>
          {chips.map(group => (
            <div key={group.mkey} className="chip-group">
              <div className="chip-title">{group.label}</div>
              <div className="chip-row">
                {group.items.map(it => (
                  <div
                    key={it.date}
                    draggable
                    onDragStart={(e) => {
                      setDrag({ date: it.date });
                    }}
                    className="chip"
                  >{fmtLabel(it.date)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="buckets">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDropTo(e, "rank")}
            className="bucket"
            style={{ minHeight: 220 }}
          >
            <div className="bucket-title">Your Rankings</div>
            <ol className="bucket-list">
              {compressRanks(prefs).map(x => (
                <li key={`${x.date}-${x.service}`} className="bucket-item">
                  <span>#{x.rank} — {fmtLabel(x.date)} ({x.service})</span>
                  <button className="btn-link" onClick={() => removeFrom({ model: "single", date: x.date, service: x.service })}>remove</button>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Contextual service chooser anchored near drop point */}
        <ServicePopover
          anchor={svcAnchor}
          services={svcChoices}
          onPick={pickService}
          onClose={() => setSvcAnchor(null)}
        />
      </div>
    );
  }

  /* -------------------------- Topbar (unchanged save button -> opens modal) -------------------------- */
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
        <button className="btn" onClick={submit}>Submit</button>
      </div>
    </div>
  );

  /* -------------------------- Login (unchanged) -------------------------- */
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
      <div className="muted">Tip: you'll see your name locked in after verification.</div>
    </div>
  );

  /* -------------------------- Page layout (unchanged) -------------------------- */
  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        {topBar}
        <div className="content">
          <div className="main">
            <Section title={mode} right={<button className="btn btn-green" onClick={downloadCSV}>Download CSV</button>}>
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
              title="Live Preview"
              right={<button className="btn-link" onClick={clearAll}>Clear all</button>}
            >
              <div className="preview">
                <div>
                  <div className="preview-title">Ranked (higher number = more preferred)</div>
                  <ol className="preview-list">
                    {compressRanks(prefs).map((x) => (
                      <li key={`${x.date}-${x.service}`} className="preview-item">
                        <span>#{x.rank} — {fmtLabel(x.date)} ({x.service})</span>
                        <button className="btn-link" onClick={() => removeFrom({ model: "single", date: x.date, service: x.service })}>remove</button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="helper">
                Tip: Remove an item to re-compress ranks automatically (1…N).
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

      {/* New: Review & Download modal before final save */}
      <ReviewModal
        open={reviewOpen}
        name={selected?.name}
        onClose={() => setReviewOpen(false)}
        onDownloadCSV={downloadCSV}
        onContinue={reallySubmit}
      />
    </div>
  );
}
