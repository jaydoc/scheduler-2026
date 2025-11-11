// App.jsx (with per-attending code login gate)
import React, { useEffect, useMemo, useReducer, useState, useCallback } from "react";
import "./App.css";

// Firebase SDK (v9+ modular)
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp, collection
} from "firebase/firestore";

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
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v14.3";

/* =========================================================
   CONSTANTS + DATA
========================================================= */
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA" };
const MODES = { CAL: "Calendar", QA: "QuickAdd", RB: "RankBoard", DB: "DragBuckets" };

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

/* Optional local fallback codes (for dev/offline).
   In production, create Firestore docs:
     codes/{attendingName}  -> { code: "123456" }
*/
const LOCAL_CODE_MAP = {
  // "Kandasamy": "246810",
  // "Willis": "135790",
};

/* =========================================================
   CALENDAR DATA (Saturdays 2026) — same structure you had
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
   HELPERS — ranks & invariants
========================================================= */
function compressRanks(list) {
  const sorted = [...list].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  return sorted.map((it, idx) => ({ ...it, rank: idx + 1 }));
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
function fmt(dateStr) {
  const [_, m, d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}

/* =========================================================
   REDUCER (hard invariants across modes)
========================================================= */
const initialState = { most: [], least: [] };
function enforceInvariants(state) {
  // 1) Same date cannot exist in both lists
  const leastDates = new Set(state.least.map(x => x.date));
  const mostClean = state.most.filter(x => !leastDates.has(x.date));
  // 2) Within a list, only one service allowed per date
  const uniqByDate = (items) => {
    const seen = new Set(), out = [];
    for (const it of items) { if (!seen.has(it.date)) { seen.add(it.date); out.push(it); } }
    return out;
  };
  const mostUniq = uniqByDate(mostClean);
  const leastUniq = uniqByDate(state.least);
  // 3) Re-compress ranks
  return { most: compressRanks(mostUniq), least: compressRanks(leastUniq) };
}
function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { bucket, date, service, rank } = action;
      if (bucket === "most" && hasDate(state.least, date)) return state;
      if (bucket === "least" && hasDate(state.most, date)) return state;
      const list  = bucket === "most" ? state.most : state.least;
      const other = bucket === "most" ? state.least : state.most;
      if (list.some(x => x.date === date && x.service !== service)) return state; // XOR per date
      if (hasDateService(list, date, service)) return state; // no dup
      const added = [...list, { date, service, rank: rank ?? nextRank(list) }];
      const next  = bucket === "most" ? { most: added, least: other } : { most: other, least: added };
      return enforceInvariants(next);
    }
    case "remove": {
      const list  = action.bucket === "most" ? state.most : state.least;
      const other = action.bucket === "most" ? state.least : state.most;
      const filtered = list.filter(x => !(x.date === action.date && x.service === action.service));
      const next  = action.bucket === "most" ? { most: filtered, least: other } : { most: other, least: filtered };
      return enforceInvariants(next);
    }
    case "clear": return initialState;
    default: return state;
  }
}

/* =========================================================
   SMALL UI ATOMS
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
   LOGIN GATE (name + one-time code)
   - Checks Firestore: codes/{name}.code
   - Falls back to LOCAL_CODE_MAP for dev/offline
========================================================= */
function LoginGate({ db, onAuthed }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const tryVerify = useCallback(async () => {
    setErr("");
    if (!name || !code) { setErr("Select name and enter the 6-digit code."); return; }
    setBusy(true);
    try {
      // Firestore first
      const snap = await getDoc(doc(db, "codes", name));
      let expected = null;
      if (snap.exists()) {
        expected = (snap.data()?.code || "").trim();
      } else {
        // local fallback (dev)
        expected = (LOCAL_CODE_MAP[name] || "").trim();
      }
      if (!expected) {
        setErr("No code is set for this name yet.");
      } else if (expected !== code.trim()) {
        setErr("Invalid code. Check your email and try again.");
      } else {
        onAuthed(name);
      }
    } catch (e) {
      console.error(e);
      setErr("Could not verify code right now.");
    } finally {
      setBusy(false);
    }
  }, [db, name, code, onAuthed]);

  return (
    <div className="gate">
      <div className="id-row">
        <div className="id-label">Login</div>
        <select className="id-select" value={name} onChange={(e) => setName(e.target.value)}>
          <option value="">Select your name</option>
          {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
        </select>
        <input
          className="id-select"
          style={{ maxWidth: 140 }}
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="btn btn-green" disabled={busy} onClick={tryVerify}>
          {busy ? "Verifying…" : "Enter"}
        </button>
      </div>
      {err ? <div className="muted" style={{ color:"#b91c1c" }}>{err}</div> : null}
      <div className="helper" style={{ marginTop: 6 }}>
        Tip: Codes live at <code>codes/&lt;name&gt;</code> in Firestore as <code>{`{ code: "123456" }`}</code>.
      </div>
    </div>
  );
}

/* =========================================================
   OPTIONAL: lightweight admin to set codes (?admin=1)
========================================================= */
function AdminCodes({ db }) {
  const [pairs, setPairs] = useState(() =>
    ATTENDINGS.map(a => ({ name: a.name, code: "" }))
  );
  const save = async () => {
    try {
      await Promise.all(
        pairs.filter(p => p.code.trim()).map(p =>
          setDoc(doc(db, "codes", p.name), { code: p.code.trim(), updatedAt: serverTimestamp() }, { merge: true })
        )
      );
      alert("Codes saved.");
    } catch (e) { console.error(e); alert("Error saving codes."); }
  };
  return (
    <Section title="Admin: Set Login Codes" right={<button className="btn btn-green" onClick={save}>Save All</button>}>
      <div className="bucket-list">
        {pairs.map((p, i) => (
          <div key={p.name} className="bucket-item">
            <div style={{ minWidth: 160 }}>{p.name}</div>
            <input
              className="id-select"
              style={{ maxWidth: 160 }}
              placeholder="6-digit code"
              value={p.code}
              onChange={(e) => {
                const next = [...pairs]; next[i] = { ...p, code: e.target.value }; setPairs(next);
              }}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}

/* =========================================================
   MAIN APP
========================================================= */
export default function App() {
  // Firebase init
  const app = useMemo(() => initializeApp(firebaseConfig), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db   = useMemo(() => getFirestore(app), [app]);

  // Anonymous auth (for Firestore access)
  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  // Who’s logged in (after code verification)
  const [who, setWho] = useState(null); // string name
  const selected = who ? ATTENDINGS.find(a => a.name === who) : null;

  // Modes + prefs
  const [mode, setMode] = useState(MODES.CAL);
  const [{ most, least }, dispatch] = useReducer(reducer, initialState);

  // Helpers
  const addTo = useCallback((bucket, date, service, rank) => {
    const avail = getAvailableServicesForDate(date);
    let s = service;
    if (!s) { if (avail.length === 1) s = avail[0]; else return { ok: false, msg: "Pick a service" }; }
    dispatch({ type: "add", bucket, date, service: s, rank });
    return { ok: true };
  }, []);
  const removeFrom = useCallback((bucket, date, service) => dispatch({ type: "remove", bucket, date, service }), []);
  const clearAll   = useCallback(() => dispatch({ type: "clear" }), []);

  // Submit
  const submit = async () => {
    if (!selected) { alert("Login first."); return; }
    const payload = {
      appId, year: YEAR,
      who: selected.name, email: selected.email,
      most: compressRanks(most), least: compressRanks(least),
      ts: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "prefs", `${YEAR}-${selected.name}`), payload);
      alert("Saved to Firestore.");
    } catch (e) { console.error(e); alert("Failed to save."); }
  };

  /* ------------ UI Modes (unchanged behavior/invariants) ------------- */
  function CalendarMode() {
    const [active, setActive] = useState(null); // {date}
    const [svc, setSvc] = useState("");
    const onPickDay = (d) => {
      const avail = getAvailableServicesForDate(d.date);
      if (avail.length === 1) { const r = addTo("most", d.date, avail[0]); if (!r.ok) alert(r.msg); return; }
      setActive({ date: d.date });
    };
    const confirm = (bucket) => {
      const r = addTo(bucket, active.date, svc || null);
      if (!r.ok) alert(r.msg);
      setActive(null); setSvc("");
    };
    return (
      <div>
        <div className="months">
          {MONTH_KEYS.map((mk, i) => (
            <div key={mk} className="month">
              <div className="month-title">{MONTH_FULL[i]}</div>
              <div className="days">
                {months[mk].map((d) => {
                  const taken = d.isTaken;
                  const avail = getAvailableServicesForDate(d.date);
                  return (
                    <button
                      key={d.date}
                      className={`day ${taken ? "is-disabled" : ""}`}
                      disabled={taken}
                      onClick={() => onPickDay(d)}
                    >
                      <div className="day-top">
                        <span className="day-label">{d.day}</span>
                        <span className="day-date">({fmt(d.date)})</span>
                      </div>
                      {d.detail && <div className="day-detail">{d.detail}</div>}
                      <div className="day-badges">
                        {avail.length === 0 && <Pill tone="muted">Full</Pill>}
                        {avail.includes(SERVICES.RNI) && <Pill>RNI open</Pill>}
                        {avail.includes(SERVICES.COA) && <Pill>COA open</Pill>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {active && (
          <div className="modal">
            <div className="modal-card">
              <div className="modal-title">{fmt(active.date)}</div>
              <div className="row gap">
                <select className="select" value={svc} onChange={(e) => setSvc(e.target.value)}>
                  <option value="">Pick service</option>
                  {getAvailableServicesForDate(active.date).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="row right gap">
                <button className="btn" onClick={() => { setActive(null); setSvc(""); }}>Cancel</button>
                <button className="btn btn-green" onClick={() => confirm("most")}>Add to Most</button>
                <button className="btn btn-amber" onClick={() => confirm("least")}>Add to Least</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const [bucket, setBucket] = useState("most");
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const saturdays = months[mkey];
    const onAdd = () => { const r = addTo(bucket, date, service || null); if (!r.ok) alert(r.msg); };
    return (
      <div className="row wrap gap">
        <select className="select" value={mkey} onChange={(e) => setMkey(e.target.value)}>
          {MONTH_KEYS.map((mk, i) => (<option key={mk} value={mk}>{MONTH_FULL[i]}</option>))}
        </select>
        <select className="select" value={date} onChange={(e) => setDate(e.target.value)}>
          <option value="">Pick Saturday</option>
          {saturdays.map((d) => (
            <option key={d.date} value={d.date} disabled={d.isTaken}>
              {fmt(d.date)}{d.isTaken ? " (full)" : ""}
            </option>
          ))}
        </select>
        <select className="select" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Pick service</option>
          {(date ? getAvailableServicesForDate(date) : [SERVICES.RNI, SERVICES.COA]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="select" value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="most">Most</option>
          <option value="least">Least</option>
        </select>
        <button className="btn btn-green" onClick={onAdd}>Add</button>
      </div>
    );
  }

  function RankBoardMode() {
    const [toLeast, setToLeast] = useState(false);
    const handleClick = (date, e) => {
      const bucket = e.shiftKey || toLeast ? "least" : "most";
      const avail = getAvailableServicesForDate(date);
      const service = avail.length === 1 ? avail[0] : null;
      const r = addTo(bucket, date, service);
      if (!r.ok) alert(r.msg);
    };
    return (
      <div>
        <div className="row between">
          <div className="muted">Click → Most; Shift+Click/toggle → Least.</div>
          <label className="row gap">
            <input type="checkbox" checked={toLeast} onChange={(e) => setToLeast(e.target.checked)} />
            Send to Least
          </label>
        </div>
        <div className="months">
          {MONTH_KEYS.map((mk, i) => (
            <div key={mk} className="month">
              <div className="month-title">{MONTH_FULL[i]}</div>
              <div className="days">
                {months[mk].map((d) => {
                  const taken = d.isTaken;
                  const avail = getAvailableServicesForDate(d.date);
                  return (
                    <button
                      key={d.date}
                      disabled={taken || avail.length === 0}
                      onClick={(e) => handleClick(d.date, e)}
                      className={`day ${taken || avail.length === 0 ? "is-disabled" : ""}`}
                    >
                      <div className="day-top">
                        <span className="day-label">{d.day}</span>
                        <span className="day-date">({fmt(d.date)})</span>
                      </div>
                      {d.detail && <div className="day-detail">{d.detail}</div>}
                      <div className="day-badges">
                        {avail.length === 0 && <Pill tone="muted">Full</Pill>}
                        {avail.includes(SERVICES.RNI) && <Pill>RNI</Pill>}
                        {avail.includes(SERVICES.COA) && <Pill>COA</Pill>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function DragBucketsMode() {
    const [drag, setDrag] = useState(null);
    const chips = React.useMemo(() => {
      const chosenDates = new Set([...most, ...least].map(x => x.date));
      return MONTH_KEYS.map((mk, i) => ({
        mkey: mk,
        label: MONTH_FULL[i],
        items: months[mk].filter(d => !d.isTaken && !chosenDates.has(d.date)).map(d => ({ date: d.date })),
      }));
    }, [most, least]);

    const onDropTo = (bucket) => {
      if (!drag) return;
      const avail = getAvailableServicesForDate(drag.date);
      const service = avail.length === 1 ? avail[0] : null;
      const r = addTo(bucket, drag.date, service);
      if (!r.ok) alert(r.msg);
      setDrag(null);
    };

    return (
      <div className="drag-grid">
        <div>
          <div className="muted">Drag from Available into Most/Least. Removing/moving re-assigns ranks 1…N.</div>
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
                  >{fmt(it.date)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="buckets">
          <div onDragOver={(e) => e.preventDefault()} onDrop={() => onDropTo("most")} className="bucket">
            <div className="bucket-title">Most</div>
            <ol className="bucket-list">
              {compressRanks(most).map(x => (
                <li key={`${x.date}-${x.service}`} className="bucket-item">
                  <span>#{x.rank} — {fmt(x.date)} ({x.service})</span>
                  <button className="btn-link" onClick={() => removeFrom("most", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
          <div onDragOver={(e) => e.preventDefault()} onDrop={() => onDropTo("least")} className="bucket">
            <div className="bucket-title">Least</div>
            <ol className="bucket-list">
              {compressRanks(least).map(x => (
                <li key={`${x.date}-${x.service}`} className="bucket-item">
                  <span>#{x.rank} — {fmt(x.date)} ({x.service})</span>
                  <button className="btn-link" onClick={() => removeFrom("least", x.date, x.service)}>remove</button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  /* ------------ Top bar ------------- */
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
        <span className="badge">{firebaseConfig.projectId}</span>
        <button className="btn" onClick={submit}>Submit</button>
      </div>
    </div>
  );

  const isAdmin = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1";

  /* ------------ Layout ------------- */
  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        {topBar}
        <div className="content">
          <div className="main">
            {!who ? (
              <Section title="Enter Code to Continue">
                <LoginGate db={db} onAuthed={setWho} />
              </Section>
            ) : (
              <Section title={`${mode} — ${who}`} right={<span className="muted">{ATTENDINGS.find(a=>a.name===who)?.email}</span>}>
                {mode === MODES.CAL && <CalendarMode />}
                {mode === MODES.QA  && <QuickAddMode />}
                {mode === MODES.RB  && <RankBoardMode />}
                {mode === MODES.DB  && <DragBucketsMode />}
              </Section>
            )}

            {isAdmin && <AdminCodes db={db} />}
          </div>

          <aside className="side">
            <Section title="Live Preview" right={<button className="btn-link" onClick={() => dispatch({ type:"clear" })}>Clear all</button>}>
              <div className="preview">
                <div>
                  <div className="preview-title">Most preferred</div>
                  <ol className="preview-list">
                    {compressRanks(initialState.most.concat([]).concat([]) && compressRanks([])) /* noop for tree-shaking */ && compressRanks([])}
                    {compressRanks([]) /* keep linter happy */}
                    {compressRanks([])}
                    {compressRanks([])}
                  </ol>
                </div>
                <div>
                  <div className="preview-title">Least preferred</div>
                  <ol className="preview-list"></ol>
                </div>
              </div>
              {/* Real lists below (not the placeholders above) */}
              <div className="preview">
                <div>
                  <div className="preview-title">Most preferred</div>
                  <ol className="preview-list">
                    {compressRanks(most).map((x) => (
                      <li key={`${x.date}-${x.service}`} className="preview-item">
                        <span>#{x.rank} — {fmt(x.date)} ({x.service})</span>
                        <button className="btn-link" onClick={() => removeFrom("most", x.date, x.service)}>remove</button>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="preview-title">Least preferred</div>
                  <ol className="preview-list">
                    {compressRanks(least).map((x) => (
                      <li key={`${x.date}-${x.service}`} className="preview-item">
                        <span>#{x.rank} — {fmt(x.date)} ({x.service})</span>
                        <button className="btn-link" onClick={() => removeFrom("least", x.date, x.service)}>remove</button>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="helper" style={{ marginTop: 8 }}>
                Invariants: same date cannot be both Most & Least; only one service per date within a bucket; ranks auto-compress to 1…N.
              </div>
            </Section>
          </aside>
        </div>
      </div>
      <div className="band" />
    </div>
  );
}
