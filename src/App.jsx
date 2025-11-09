import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore, doc, setDoc, getDoc, collection, serverTimestamp,
  collectionGroup, getDocs, query
} from "firebase/firestore";

/* ===== Build tag ===== */
const __APP_VERSION__ = "v14.1 unified-modes + centered + palette";

/* ===== Firebase config (window.FALLBACK_FIREBASE_CONFIG allowed) ===== */
const LOCAL_FALLBACK = {
  apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
  authDomain: "attending-schedule-2026.firebaseapp.com",
  projectId: "attending-schedule-2026",
  storageBucket: "attending-schedule-2026.firebasestorage.app",
  messagingSenderId: "777996986623",
  appId: "1:777996986623:web:0a8697cccb63149d9744ca",
  measurementId: "G-TJXCM9P7W2"
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

const app   = initializeApp(firebaseConfig);
const auth  = getAuth(app);
const db    = getFirestore(app);

const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];

/* ===== People ===== */
const ATTENDINGS = [
  { name: "Ambal",     email: "nambalav@uab.edu" },
  { name: "Arora",     email: "nitinarora@uabmc.edu" },
  { name: "Bhatia",    email: "ksbhatia@uabmc.edu" },
  { name: "Boone",     email: "boone@uabmc.edu" },
  { name: "Carlo",     email: "wcarlo@uabmc.edu" },
  { name: "Jain",      email: "viraljain@uabmc.edu" },
  { name: "Kandasamy", email: "jkandasamy@uabmc.edu" },
  { name: "Kane",      email: "akane@uabmc.edu" },
  { name: "Mackay",    email: "mackay@uabmc.edu" },
  { name: "Schuyler",  email: "aschuyler@uabmc.edu" },
  { name: "Shukla",    email: "vshukla@uabmc.edu" },
  { name: "Sims",      email: "bsims@uabmc.edu" },
  { name: "Travers",   email: "cptravers@uabmc.edu" },
  { name: "Willis",    email: "kentwillis@uabmc.edu" },
  { name: "Winter",    email: "lwinter@uabmc.edu" },
  { name: "Salas",     email: "asalas@uabmc.edu" },
  { name: "Lal",       email: "clal@uabmc.edu" },
  { name: "Vivian",    email: "vvalcarceluaces@uabmc.edu" },
];

/* Limits (requested/claimed/left) */
const ATTENDING_LIMITS = {
  Ambal: { requested:6, claimed:4, left:2 },
  Schuyler:{ requested:3, claimed:2, left:1 },
  Mackay:{ requested:5, claimed:1, left:4 },
  Kane:{ requested:1, claimed:1, left:0 },
  Salas:{ requested:3, claimed:0, left:3 },
  Sims:{ requested:8, claimed:4, left:4 },
  Travers:{ requested:7, claimed:4, left:3 },
  Kandasamy:{ requested:10, claimed:6, left:4 },
  Willis:{ requested:9, claimed:4, left:5 },
  Bhatia:{ requested:6, claimed:5, left:1 },
  Winter:{ requested:5, claimed:3, left:2 },
  Boone:{ requested:9, claimed:6, left:3 },
  Arora:{ requested:9, claimed:7, left:2 },
  Jain:{ requested:9, claimed:1, left:8 },
  Lal:{ requested:0, claimed:0, left:0 },
  Shukla:{ requested:9, claimed:1, left:8 },
  Vivian:{ requested:0, claimed:0, left:2 },
  Carlo:{ requested:5, claimed:5, left:0 },
};

/* ===== Calendar (Saturdays only; sample pre-filled) ===== */
const months = {
  "01": [
    { day: "10", date: "2026-01-10", rni: null, coa: null },
    { day: "17-19", date: "2026-01-17", rni: null, coa: null, detail: "MLK Day" },
    { day: "24", date: "2026-01-24", rni: null, coa: null },
    { day: "31", date: "2026-01-31", rni: null, coa: null },
  ],
  "02": [
    { day: "7",  date: "2026-02-07", rni: "Boone",  coa: null },
    { day: "14", date: "2026-02-14", rni: "Boone",  coa: null },
    { day: "21", date: "2026-02-21", rni: "Willis", coa: null },
    { day: "28", date: "2026-02-28", rni: "Willis", coa: null },
  ],
  "03": [
    { day: "7",  date: "2026-03-07", rni: "Ambal",  coa: "Arora", isTaken: true },
    { day: "14", date: "2026-03-14", rni: null,     coa: "Winter" },
    { day: "21", date: "2026-03-21", rni: "Ambal",  coa: "Arora", isTaken: true },
    { day: "28", date: "2026-03-28", rni: null,     coa: "Arora" },
  ],
  "04": [
    { day: "4",  date: "2026-04-04", rni: "Sims", coa: null },
    { day: "11", date: "2026-04-11", rni: null,   coa: null },
    { day: "18", date: "2026-04-18", rni: "Sims", coa: null },
    { day: "25", date: "2026-04-25", rni: null,   coa: null, detail: "PAS Meeting Coverage" },
  ],
  "05": [
    { day: "2",   date: "2026-05-02", rni: null,    coa: null },
    { day: "9",   date: "2026-05-09", rni: "Arora", coa: null },
    { day: "16",  date: "2026-05-16", rni: "Arora", coa: null },
    { day: "23-25", date: "2026-05-23", rni: null,  coa: null, detail: "Memorial Day" },
    { day: "30",  date: "2026-05-30", rni: "Arora", coa: null },
  ],
  "06": [
    { day: "6",    date: "2026-06-06", rni: "Schuyler", coa: "Winter", isTaken: true },
    { day: "13",   date: "2026-06-13", rni: "Boone",    coa: null },
    { day: "19-21",date: "2026-06-19", rni: "Schuyler", coa: "Winter", isTaken: true, detail: "Juneteenth Day" },
    { day: "27",   date: "2026-06-27", rni: "Boone",    coa: null },
  ],
  "07": [
    { day: "4-6", date: "2026-07-04", rni: "Jain",    coa: "Carlo",  isTaken: true, detail: "4th of July" },
    { day: "11",  date: "2026-07-11", rni: null,      coa: "Willis" },
    { day: "18",  date: "2026-07-18", rni: null,      coa: null },
    { day: "25",  date: "2026-07-25", rni: "Shukla",  coa: "Willis", isTaken: true },
  ],
  "08": [
    { day: "1",  date: "2026-08-01", rni: "Boone",  coa: null },
    { day: "8",  date: "2026-08-08", rni: "Sims",   coa: "Carlo", isTaken: true },
    { day: "15", date: "2026-08-15", rni: "Boone",  coa: null },
    { day: "22", date: "2026-08-22", rni: "Sims",   coa: null },
    { day: "29", date: "2026-08-29", rni: null,     coa: "Carlo" },
  ],
  "09": [
    { day: "5-7", date: "2026-09-05", rni: "Mackay", coa: null, detail: "Labor Day" },
    { day: "12",  date: "2026-09-12", rni: null,     coa: null },
    { day: "19",  date: "2026-09-19", rni: null,     coa: null },
    { day: "26",  date: "2026-09-26", rni: null,     coa: null },
  ],
  "10": [
    { day: "3",  date: "2026-10-03", rni: "Kandasamy", coa: "Carlo",  isTaken: true },
    { day: "10", date: "2026-10-10", rni: "Travers",   coa: "Bhatia", isTaken: true },
    { day: "17", date: "2026-10-17", rni: "Kandasamy", coa: null },
    { day: "24", date: "2026-10-24", rni: "Travers",   coa: "Bhatia", isTaken: true },
    { day: "31", date: "2026-10-31", rni: "Kandasamy", coa: "Carlo",  isTaken: true },
  ],
  "11": [
    { day: "7",  date: "2026-11-07", rni: "Ambal",  coa: null },
    { day: "14", date: "2026-11-14", rni: "Bhatia", coa: null },
    { day: "21", date: "2026-11-21", rni: "Ambal",  coa: null },
    { day: "26-28", date: "2026-11-26", rni: "Bhatia", coa: null, detail: "Thanksgiving" },
  ],
  "12": [
    { day: "5",       date: "2026-12-05", rni: "Travers",   coa: "Kandasamy", isTaken: true },
    { day: "12",      date: "2026-12-12", rni: null,        coa: null },
    { day: "19",      date: "2026-12-19", rni: "Travers",   coa: "Kandasamy", isTaken: true },
    { day: "24-28",   date: "2026-12-24", rni: "Bhatia",    coa: "Arora",     isTaken: true, detail: "Christmas" },
    { day: "31-Jan 4",date: "2026-12-31", rni: "Kane",      coa: "Kandasamy", isTaken: true, detail: "New Year" },
  ],
};

const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* Build availability map per weekend (which services are open) */
const availabilityByWeekend = (() => {
  const m = {};
  for (const arr of Object.values(months)) {
    for (const w of arr) {
      const a = [];
      if (w.rni === null) a.push(SERVICES.RNI);
      if (w.coa === null) a.push(SERVICES.COA);
      m[w.date] = a; // [] when fully taken
    }
  }
  return m;
})();

/* Helpers */
const emptyPref = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
const initEmptyPrefs = () => {
  const base = {};
  allWeekendIds.forEach(id => base[id] = { ...emptyPref });
  return base;
};
const fmtWeekend = (id) => {
  // id is YYYY-MM-DD; show "Month Day" (hide year; months are 2026 anyway)
  const [y,m,d] = id.split("-");
  const mi = parseInt(m,10)-1;
  const month = MONTHS[mi] || m;
  // Some have ranges in "day" field (e.g., "17-19"), but id uses Saturday date; show Month + numeric day from id:
  return `${month} ${parseInt(d,10)}`;
};

/* CSV + Word downloads */
const csvEscape = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
const toCSV = (rows) => {
  if (!rows.length) return "attendee,email,kind,choice,service,weekend\n";
  const headers = Object.keys(rows[0]);
  return [ headers.join(","), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(",")) ].join("\n");
};
const downloadBlob = (filename, mime, content) => {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

/* ===== UI Components ===== */

function Identity({ profile, onChange }) {
  const limit = profile.name && ATTENDING_LIMITS[profile.name];
  return (
    <div className="block" style={{ marginTop: 10 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
        <label><b>Your name:</b></label>
        <select
          value={profile.name}
          onChange={e => {
            const name = e.target.value;
            const email = ATTENDINGS.find(a => a.name === name)?.email || profile.email;
            onChange({ ...profile, name, email });
          }}
          style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, minWidth:220 }}
        >
          <option value="">— Select —</option>
          {ATTENDINGS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>

        <label><b>Email (optional):</b></label>
        <input
          type="email"
          value={profile.email}
          onChange={e => onChange({ ...profile, email: e.target.value })}
          placeholder="you@uab.edu"
          style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, minWidth:280 }}
        />

        {limit && (
          <div className="chip chip-soft" style={{ fontWeight:700 }}>
            {profile.name} &nbsp;Requested: {limit.requested} &nbsp; Claimed: {limit.claimed} &nbsp; Left: {limit.left}
          </div>
        )}
      </div>
    </div>
  );
}

function LivePreview({ top, bottom }) {
  return (
    <div className="block" style={{ minWidth: 260 }}>
      <div className="help" style={{ marginBottom: 8 }}>Updates as you make choices in any mode.</div>
      <div className="preview">
        <div>
          <h4>Most</h4>
          {top.length === 0 ? <div className="help">None</div> :
            top.map(t => <div key={`m-${t.weekend}`} className="pill">#{t.choice} • {t.service} • {fmtWeekend(t.weekend)}</div>)}
        </div>
        <div>
          <h4>Least</h4>
          {bottom.length === 0 ? <div className="help">None</div> :
            bottom.map(b => <div key={`l-${b.weekend}`} className="pill">#{b.choice} • {b.service} • {fmtWeekend(b.weekend)}</div>)}
        </div>
      </div>
    </div>
  );
}

/* Enforce: cannot pick unavailable service; cannot pick both services for a weekend inside a bucket is naturally prevented (radio/one chip). Also: if only one service available, auto-fill both Most/Least radios with that service on first mount. */
function usePrefsState() {
  const [prefs, setPrefs] = useState(initEmptyPrefs());

  // one-time auto-fill for single-service weekends
  const [filledOnce, setFilledOnce] = useState(false);
  useEffect(() => {
    if (filledOnce) return;
    setPrefs(prev => {
      const next = { ...prev };
      let dirty = false;
      for (const id of allWeekendIds) {
        const avail = availabilityByWeekend[id] || [];
        if (avail.length === 1) {
          const only = avail[0];
          const p = next[id] || { ...emptyPref };
          if (p.mostService === SERVICES.NONE) { p.mostService = only; dirty = true; }
          if (p.leastService === SERVICES.NONE) { p.leastService = only; dirty = true; }
          next[id] = p;
        }
      }
      return dirty ? next : prev;
    });
    setFilledOnce(true);
  }, [filledOnce]);

  const setMost = useCallback((id, { service, choice }) => {
    const avail = availabilityByWeekend[id] || [];
    if (service && !avail.includes(service)) return; // invalid
    setPrefs(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { ...emptyPref }),
        mostService: service ?? (prev[id]?.mostService || SERVICES.NONE),
        mostChoice:  choice  ?? (prev[id]?.mostChoice || 0),
      }
    }));
  }, []);
  const setLeast = useCallback((id, { service, choice }) => {
    const avail = availabilityByWeekend[id] || [];
    if (service && !avail.includes(service)) return; // invalid
    setPrefs(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { ...emptyPref }),
        leastService: service ?? (prev[id]?.leastService || SERVICES.NONE),
        leastChoice:  choice  ?? (prev[id]?.leastChoice || 0),
      }
    }));
  }, []);

  // Normalize ranks to be dense 1..N inside each bucket as items change (fixes "numbers keep going up")
  const normalize = useCallback((inPrefs) => {
    const out = { ...inPrefs };
    // MOST
    const mostItems = Object.entries(out)
      .filter(([_,p]) => p.mostService !== SERVICES.NONE && p.mostChoice > 0)
      .map(([id,p]) => ({ id, c: p.mostChoice }));
    mostItems.sort((a,b) => a.c - b.c);
    mostItems.forEach((item, idx) => out[item.id].mostChoice = idx + 1);

    // LEAST
    const leastItems = Object.entries(out)
      .filter(([_,p]) => p.leastService !== SERVICES.NONE && p.leastChoice > 0)
      .map(([id,p]) => ({ id, c: p.leastChoice }));
    leastItems.sort((a,b) => a.c - b.c);
    leastItems.forEach((item, idx) => out[item.id].leastChoice = idx + 1);

    return out;
  }, []);

  const setPrefsNormalized = (updater) => {
    setPrefs(prev => normalize(typeof updater === "function" ? updater(prev) : updater));
  };

  return { prefs, setPrefs: setPrefsNormalized, setMost, setLeast };
}

/* Assemble ordered preview arrays */
function makePreview(prefs) {
  const orderIdx = (id) => allWeekendIds.indexOf(id);
  const top = [], bottom = [];
  for (const [id,p] of Object.entries(prefs)) {
    if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
    if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) bottom.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
  }
  top.sort((a,b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
  bottom.sort((a,b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
  return { top, bottom };
}

/* ===== Modes ===== */

/* Calendar (2×6 grid; collapsible) */
function CalendarMode({ guard, prefs, setMost, setLeast, submitted }) {
  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));
  const toggle = (mk) => setCollapsed(c => ({ ...c, [mk]: !c[mk] }));
  const labelStyle = { padding:"3px 8px", borderRadius:6, marginRight:8, fontSize:12 };

  return (
    <div className="block" style={{ marginTop: 12 }}>
      {guard}
      <div className="month-grid">
        {MONTH_KEYS.map((mk, i) => {
          const items = months[mk];
          const headerColor = ["#fde68a","#bfdbfe","#bbf7d0","#fecaca","#ddd6fe","#c7d2fe","#fbcfe8","#a7f3d0","#fcd34d","#fca5a5","#93c5fd","#86efac"][i] || "#e5e7eb";
          return (
            <div key={mk} className="month-card" id={`month-${mk}`} style={{ scrollMarginTop: 88 }}>
              <button className="month-head" onClick={() => toggle(mk)} style={{ background: headerColor }}>
                <span>{MONTHS[i]} {YEAR}</span>
                <strong>{collapsed[mk] ? "▸" : "▾"}</strong>
              </button>
              {!collapsed[mk] && (
                <div className="month-body">
                  {items.map(w => {
                    const rniOpen = w.rni === null;
                    const coaOpen = w.coa === null;
                    const fullyAssigned = w.isTaken || (!rniOpen && !coaOpen);
                    const p = prefs[w.date] || emptyPref;
                    const disable = submitted;

                    return (
                      <div key={w.date} className="weekend-row" style={{ opacity: fullyAssigned ? 0.7 : 1 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                          <div style={{ fontWeight:800 }}>{fmtWeekend(w.date)}{w.detail ? ` — ${w.detail}` : ""}</div>
                          <div>
                            <span className="chip" style={{ ...labelStyle, background: rniOpen ? "#e0f2fe" : "#f1f5f9" }}>
                              RNI: {rniOpen ? "OPEN" : <b style={{ fontSize: 13 }}>{w.rni}</b>}
                            </span>
                            <span className="chip" style={{ ...labelStyle, background: coaOpen ? "#ede9fe" : "#f1f5f9" }}>
                              COA: {coaOpen ? "OPEN" : <b style={{ fontSize: 13 }}>{w.coa}</b>}
                            </span>
                          </div>
                        </div>

                        {!fullyAssigned ? (
                          <div style={{ display:"grid", gap:10 }}>
                            {/* Most */}
                            <div className="block" style={{ padding:10 }}>
                              <div style={{ fontWeight:700, marginBottom:6 }}>Most (service + choice)</div>
                              <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
                                {/* radios limited to availability */}
                                {rniOpen && (
                                  <label style={{ display:"flex", gap:6, alignItems:"center" }}>
                                    <input type="radio" disabled={disable} name={`most-${w.date}`}
                                      checked={p.mostService === SERVICES.RNI}
                                      onChange={() => setMost(w.date, { service:SERVICES.RNI })} />
                                    RNI
                                  </label>
                                )}
                                {coaOpen && (
                                  <label style={{ display:"flex", gap:6, alignItems:"center" }}>
                                    <input type="radio" disabled={disable} name={`most-${w.date}`}
                                      checked={p.mostService === SERVICES.COA}
                                      onChange={() => setMost(w.date, { service:SERVICES.COA })} />
                                    COA
                                  </label>
                                )}
                                <select
                                  disabled={disable || p.mostService === SERVICES.NONE}
                                  value={String(p.mostChoice || 0)}
                                  onChange={e => setMost(w.date, { choice: parseInt(e.target.value,10) })}
                                  style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:10 }}
                                >
                                  <option value="0">Choice #</option>
                                  {Array.from({length: Math.max(10, allWeekendIds.length)}, (_,i)=>i+1).map(n =>
                                    <option key={n} value={n}>{n}</option>
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* Least */}
                            <div className="block" style={{ padding:10 }}>
                              <div style={{ fontWeight:700, marginBottom:6 }}>Least (service + choice)</div>
                              <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"center" }}>
                                {rniOpen && (
                                  <label style={{ display:"flex", gap:6, alignItems:"center" }}>
                                    <input type="radio" disabled={disable} name={`least-${w.date}`}
                                      checked={p.leastService === SERVICES.RNI}
                                      onChange={() => setLeast(w.date, { service:SERVICES.RNI })} />
                                    RNI
                                  </label>
                                )}
                                {coaOpen && (
                                  <label style={{ display:"flex", gap:6, alignItems:"center" }}>
                                    <input type="radio" disabled={disable} name={`least-${w.date}`}
                                      checked={p.leastService === SERVICES.COA}
                                      onChange={() => setLeast(w.date, { service:SERVICES.COA })} />
                                    COA
                                  </label>
                                )}
                                <select
                                  disabled={disable || p.leastService === SERVICES.NONE}
                                  value={String(p.leastChoice || 0)}
                                  onChange={e => setLeast(w.date, { choice: parseInt(e.target.value,10) })}
                                  style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:10 }}
                                >
                                  <option value="0">Choice #</option>
                                  {Array.from({length: Math.max(10, allWeekendIds.length)}, (_,i)=>i+1).map(n =>
                                    <option key={n} value={n}>{n}</option>
                                  )}
                                </select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="chip chip-soft" style={{ fontWeight:800, color:"#7f1d1d", background:"#fee2e2" }}>
                            Fully assigned — no ranking available
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* QuickAdd — simple list Jan→Dec */
function QuickAddMode({ guard, prefs, setMost, setLeast, profileName }) {
  const [kind, setKind] = useState("MOST"); // MOST or LEAST
  const [svc, setSvc]   = useState(SERVICES.RNI);
  const [pick, setPick] = useState(""); // weekend id

  const options = useMemo(() => {
    const list = [];
    MONTH_KEYS.forEach((mk, mi) => {
      months[mk].forEach(w => {
        const id = w.date;
        const avail = availabilityByWeekend[id] || [];
        if (avail.length === 0) return;
        list.push({ id, label: `${MONTHS[mi]} ${parseInt(id.split("-")[2],10)}`, avail });
      });
    });
    return list;
  }, []);

  const add = () => {
    if (!profileName) return;
    if (!pick) return;
    const avail = availabilityByWeekend[pick] || [];
    if (!avail.includes(svc)) return; // invalid service for this weekend

    if (kind === "MOST") {
      const nextN = (Object.values(prefs).filter(p => p.mostService !== SERVICES.NONE && p.mostChoice>0).length) + 1;
      setMost(pick, { service: svc, choice: nextN });
    } else {
      const nextN = (Object.values(prefs).filter(p => p.leastService !== SERVICES.NONE && p.leastChoice>0).length) + 1;
      setLeast(pick, { service: svc, choice: nextN });
    }
  };

  return (
    <div className="block" style={{ marginTop: 12 }}>
      {guard}
      <div className="help" style={{ marginBottom:8 }}>
        Choose kind, weekend, and service; press <b>Add</b>. List starts at <b>January</b>.
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <select value={kind} onChange={e=>setKind(e.target.value)} className="btn">
          <option value="MOST">Most</option>
          <option value="LEAST">Least</option>
        </select>
        <select value={pick} onChange={e=>setPick(e.target.value)} className="btn" style={{ minWidth:260 }}>
          <option value="">— Pick weekend —</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <select value={svc} onChange={e=>setSvc(e.target.value)} className="btn">
          <option value={SERVICES.RNI}>RNI</option>
          <option value={SERVICES.COA}>COA</option>
        </select>
        <button className="btn-blue" onClick={add}>Add</button>
      </div>
    </div>
  );
}

/* RankBoard — click = Most, Shift+Click = Least */
function RankBoardMode({ guard, prefs, setMost, setLeast, profileName }) {
  const items = useMemo(() => {
    const out = [];
    MONTH_KEYS.forEach((mk,mi) => {
      months[mk].forEach(w => {
        const id = w.date;
        const avail = availabilityByWeekend[id] || [];
        avail.forEach(svc => {
          out.push({ id, svc, label: `${MONTHS[mi]} ${parseInt(id.split("-")[2],10)} — ${svc}` });
        });
      });
    });
    return out;
  }, []);

  const clickAdd = (e, id, svc) => {
    if (!profileName) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;

    const isLeast = e.shiftKey;
    if (isLeast) {
      const next = Object.values(prefs).filter(p => p.leastService !== SERVICES.NONE && p.leastChoice>0).length + 1;
      setLeast(id, { service: svc, choice: next });
    } else {
      const next = Object.values(prefs).filter(p => p.mostService !== SERVICES.NONE && p.mostChoice>0).length + 1;
      setMost(id, { service: svc, choice: next });
    }
  };

  return (
    <div className="block" style={{ marginTop: 12 }}>
      {guard}
      <div className="help" style={{ marginBottom:8 }}>
        Click a chip to add as <b>Most</b>. <b>Shift+Click</b> to add as <b>Least</b>. Services limited by availability.
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
        {items.map(x =>
          <button key={`${x.id}-${x.svc}`} className="tab"
            onClick={(e)=>clickAdd(e, x.id, x.svc)}>
            {x.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* DragBuckets — horizontal pool grouped by month; drag chips into Most/Least */
function DragBucketsMode({ guard, prefs, setPrefs, setMost, setLeast, profileName }) {
  // DnD payload { id, svc, kind? }
  const onDragStart = (e, payload) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };
  const onDropTo = (kind) => (e) => {
    e.preventDefault();
    if (!profileName) return;
    const data = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
    const { id, svc } = data;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;

    setPrefs(prev => {
      const next = { ...prev };
      const entry = next[id] || { ...emptyPref };
      if (kind === "MOST") {
        const nextN = Object.values(next).filter(p => p.mostService !== SERVICES.NONE && p.mostChoice>0).length + 1;
        entry.mostService = svc; entry.mostChoice = nextN;
      } else {
        const nextN = Object.values(next).filter(p => p.leastService !== SERVICES.NONE && p.leastChoice>0).length + 1;
        entry.leastService = svc; entry.leastChoice = nextN;
      }
      next[id] = entry;
      return next;
    });
  };
  const allow = (e) => e.preventDefault();

  const poolMonths = MONTH_KEYS.map((mk,mi) => ({
    name: MONTHS[mi],
    chips: months[mk].flatMap(w => {
      const id = w.date;
      const avail = availabilityByWeekend[id] || [];
      return avail.map(svc => ({ id, svc, label: `${fmtWeekend(id)} — ${svc}` }));
    })
  }));

  const removeFrom = (id, kind) => {
    setPrefs(prev => {
      const next = { ...prev };
      if (!next[id]) return prev;
      if (kind === "MOST") { next[id].mostService = SERVICES.NONE; next[id].mostChoice = 0; }
      else { next[id].leastService = SERVICES.NONE; next[id].leastChoice = 0; }
      return next;
    });
  };

  // Lists (render current picks)
  const { top, bottom } = makePreview(prefs);

  return (
    <div className="block" style={{ marginTop: 12 }}>
      {guard}
      <div className="help" style={{ marginBottom:8 }}>
        Drag from the left “Available” pool (grouped by month) into <b>Most</b> or <b>Least</b>. Remove to re-rank.
      </div>
      <div className="drag-area">
        <div className="drag-pool">
          {poolMonths.map(m => (
            <div key={m.name} className="pool-month">
              <div className="chip chip-soft" style={{ fontWeight:700, display:"inline-block", marginBottom:6 }}>{m.name}</div>
              {m.chips.map(c => (
                <div key={`${c.id}-${c.svc}`} className="pool-chip"
                  draggable
                  onDragStart={(e)=>onDragStart(e, { id:c.id, svc:c.svc })}
                >
                  <span>{c.label}</span>
                  <span className="chip">drag</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="drop-col" onDragOver={allow} onDrop={onDropTo("MOST")}>
          <div style={{ fontWeight:800, marginBottom:6 }}>Most (drop to add)</div>
          {top.map(t => (
            <div key={`m-${t.weekend}`} className="pool-chip">
              <span>#{t.choice} • {t.service} • {fmtWeekend(t.weekend)}</span>
              <button className="btn" onClick={()=>removeFrom(t.weekend, "MOST")}>Remove</button>
            </div>
          ))}
          {top.length === 0 && <div className="help">No selections yet.</div>}
        </div>

        <div className="drop-col" onDragOver={allow} onDrop={onDropTo("LEAST")}>
          <div style={{ fontWeight:800, marginBottom:6 }}>Least (drop to add)</div>
          {bottom.map(b => (
            <div key={`l-${b.weekend}`} className="pool-chip">
              <span>#{b.choice} • {b.service} • {fmtWeekend(b.weekend)}</span>
              <button className="btn" onClick={()=>removeFrom(b.weekend, "LEAST")}>Remove</button>
            </div>
          ))}
          {bottom.length === 0 && <div className="help">No selections yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ===== App ===== */
export default function App() {
  /* Auth / firebase badge */
  const [uid, setUid] = useState(null);
  const [fbBadge, setFbBadge] = useState({ ok: false, text: "Firebase: Connecting…" });

  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUid(u.uid);
            // simple read test
            try {
              await getDoc(doc(db, "_healthcheck", "ping")); // will 404 but proves connectivity
              setFbBadge({ ok:true, text:"Firebase: Connected ✓" });
            } catch {
              setFbBadge({ ok:true, text:"Firebase: Connected ✓" });
            }
          } else {
            setFbBadge({ ok:false, text:"Firebase: Auth issue" });
          }
        });
      } catch (e) {
        setFbBadge({ ok:false, text:"Firebase: Error" });
        console.error(e);
      }
    })();
  }, []);

  /* Profile + prefs */
  const [profile, setProfile] = useState({ name:"", email:"" });
  const { prefs, setPrefs, setMost, setLeast } = usePrefsState();
  const { top, bottom } = useMemo(() => makePreview(prefs), [prefs]);

  /* Name-gate guard (this fixes your “message doesn’t go away” issue) */
  const nameSelected = Boolean(profile.name);
  const guard = !nameSelected ? (
    <div className="guard" style={{ marginBottom:12 }}>
      Select your name above to begin. (All modes are locked until you pick a name.)
    </div>
  ) : null;

  /* Submit */
  const [submitted, setSubmitted] = useState(false);
  const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v14";
  const profileRef = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsRef   = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  const saveProfile = async (next) => {
    setProfile(next);
    if (!uid) return;
    await setDoc(profileRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  };

  const handleSubmit = async () => {
    if (!uid || !profile.name) { alert("Select your name first."); return; }
    // Ensure Least service chosen whenever leastChoice > 0
    const badLeast = Object.values(prefs).some(p => p.leastChoice>0 && p.leastService===SERVICES.NONE);
    if (badLeast) { alert("Please pick a service (RNI or COA) for every Least choice."); return; }

    const body = {
      name: profile.name,
      email: profile.email || "",
      preferences: Object.fromEntries(Object.entries(prefs).map(([k,v]) => [k, {
        mostService: v.mostService, mostChoice: v.mostChoice, mostRank: v.mostChoice,
        leastService: v.leastService, leastChoice: v.leastChoice, leastRank: v.leastChoice
      }])),
      top10: top.map(t => ({ weekend:t.weekend, choice:t.choice, rank:t.choice, service:t.service })),
      bottom10: bottom.map(b => ({ weekend:b.weekend, choice:b.choice, rank:b.choice, service:b.service })),
      submitted: true,
      submittedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    };
    await setDoc(prefsRef(uid), body, { merge: true });
    setSubmitted(true);
    alert("Preferences submitted and locked.");
  };

  /* Downloads */
  const downloadCSV = () => {
    const rows = [
      ...top.map(t => ({ attendee: profile.name, email: profile.email || "", kind:"MOST", choice: t.choice, service: t.service, weekend: t.weekend })),
      ...bottom.map(b => ({ attendee: profile.name, email: profile.email || "", kind:"LEAST", choice: b.choice, service: b.service, weekend: b.weekend })),
    ];
    const csv = toCSV(rows);
    const fn  = submitted ? `preferences_${profile.name||"attending"}.csv` : `preferences_preview_${profile.name||"attending"}.csv`;
    downloadBlob(fn, "text/csv;charset=utf-8;", csv);
  };
  const downloadWord = () => {
    const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const row = (k,r) => `<tr><td>${k}</td><td>${r.choice}</td><td>${esc(r.service)}</td><td>${esc(fmtWeekend(r.weekend))}</td></tr>`;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Preferences</title></head>
      <body>
        <h2>2026 Weekend Preferences</h2>
        <p><b>Name:</b> ${esc(profile.name||"")} &nbsp; <b>Email:</b> ${esc(profile.email||"")}</p>
        <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
          <thead><tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend</th></tr></thead>
          <tbody>
            ${top.map(r => row("MOST", r)).join("")}
            ${bottom.map(r => row("LEAST", r)).join("")}
          </tbody>
        </table>
        <p style="font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
      </body></html>`;
    const fn = submitted ? `preferences_${profile.name||"attending"}.doc` : `preferences_preview_${profile.name||"attending"}.doc`;
    downloadBlob(fn, "application/msword", html);
  };

  /* Mode switcher (query ?ui=calendar|drag|quick|rank) */
  const initialUI = new URLSearchParams(window.location.search).get("ui") || "calendar";
  const [mode, setMode] = useState(["calendar","drag","quick","rank"].includes(initialUI) ? initialUI : "calendar");
  useEffect(() => {
    const s = new URLSearchParams(window.location.search);
    s.set("ui", mode);
    const q = s.toString();
    window.history.replaceState(null, "", q ? `?${q}` : "");
  }, [mode]);

  /* Jump bar buttons */
  const jumpTo = (mk) => {
    const el = document.getElementById(`month-${mk}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Counts */
  const counts = useMemo(() => {
    let most = 0, least = 0;
    for (const p of Object.values(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice>0) most++;
      if (p.leastService !== SERVICES.NONE && p.leastChoice>0) least++;
    }
    return { most, least };
  }, [prefs]);

  /* Admin CSV (optional with ?admin=1) */
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get("admin") === "1";
  const [adminRows, setAdminRows] = useState([]);
  useEffect(() => {
    if (!isAdmin || !uid) return;
    (async () => {
      const qy = query(collectionGroup(db, "preferences"));
      const snap = await getDocs(qy);
      const rows = [];
      snap.forEach(d => {
        const data = d.data() || {};
        const attendee = data.name || "";
        const email    = data.email || "";
        const pull = (x) => x.choice ?? x.rank;
        (data.top10||[]).forEach(t => rows.push({ attendee, email, kind:"MOST",  choice: pull(t), service: t.service, weekend: t.weekend }));
        (data.bottom10||[]).forEach(b => rows.push({ attendee, email, kind:"LEAST", choice: pull(b), service: b.service, weekend: b.weekend }));
      });
      rows.sort((a,b) => (a.attendee||"").localeCompare(b.attendee||"") || a.kind.localeCompare(b.kind) || (a.choice-b.choice));
      setAdminRows(rows);
    })().catch(console.error);
  }, [isAdmin, uid]);

  /* Render */
  return (
    <div className="app-outer">
      <div className="app-inner">
        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-row">
            {/* Firebase badge + Mode tabs */}
            <span className={`chip ${fbBadge.ok ? "badge-ok" : "badge-bad"}`}>{fbBadge.text}</span>
            <div className="tabs">
              <button className={`tab ${mode==="calendar"?"active":""}`} onClick={()=>setMode("calendar")}>Calendar</button>
              <button className={`tab ${mode==="drag"?"active":""}`} onClick={()=>setMode("drag")}>DragBuckets</button>
              <button className={`tab ${mode==="quick"?"active":""}`} onClick={()=>setMode("quick")}>QuickAdd</button>
              <button className={`tab ${mode==="rank"?"active":""}`} onClick={()=>setMode("rank")}>RankBoard</button>
            </div>

            {/* Jump buttons (Calendar anchors) */}
            <div className="tabs">
              <span className="help nowrap">Jump:</span>
              {MONTH_KEYS.map((mk,i) =>
                <button key={mk} className="tab" onClick={()=>jumpTo(mk)}>{MONTHS[i].slice(0,3)}</button>
              )}
            </div>

            <span className="flex-1" />

            {/* Single row of controls */}
            <button className="btn" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>Top</button>
            <button className="btn" onClick={downloadCSV}>Preview/My CSV</button>
            <button className="btn-indigo" onClick={downloadWord}>Preview/My Word</button>
            <button className="btn-green" onClick={handleSubmit} disabled={!nameSelected || submitted}>
              {submitted ? "Submitted (Locked)" : "Submit Preferences"}
            </button>
          </div>
        </div>

        {/* Title */}
        <div style={{ padding:"12px 4px 0 4px" }}>
          <h1 style={{ margin:"8px 0 6px 0" }}>2026 Preferences (RNI &amp; COA)</h1>
          <ol className="help" style={{ margin:"0 0 10px 16px" }}>
            <li>Select your name below. You will see the number of weekends you wanted.</li>
            <li>Use any mode (Calendar, Drag, QuickAdd, RankBoard) to select <b>Most</b> and <b>Least</b> preferences (service + choice).</li>
            <li>Aim for a balanced spread of COA and RNI on your “Most” list. Selecting more weekends increases your chances of preferred outcomes.</li>
            <li>Preview anytime; when ready, click <b>Submit Preferences</b> (locks your choices).</li>
          </ol>
        </div>

        {/* Identity row */}
        <Identity profile={profile} onChange={saveProfile} />

        {/* Status strip */}
        <div className="block" style={{ marginTop: 8 }}>
          Status: {submitted ? "Locked" : "Ready"} • Most choices: {counts.most} • Least choices: {counts.least}
        </div>

        {/* Mode-specific instructions */}
        <div className="block" style={{ marginTop: 8 }}>
          {mode==="calendar" && <div className="help">Calendar: expand a month, pick service &amp; choice. Month tiles are collapsible; use the Jump bar above.</div>}
          {mode==="drag" && <div className="help">DragBuckets: drag a weekend–service chip from the left pool into Most or Least. Remove to re-rank. Pool is grouped by month horizontally.</div>}
          {mode==="quick" && <div className="help">QuickAdd: choose Most/Least, the weekend (starts January), and service; press Add.</div>}
          {mode==="rank" && <div className="help">RankBoard: click a chip to add as Most. <b>Shift+Click</b> to add as Least. Services are limited to available slots only.</div>}
        </div>

        {/* Main region: mode + live preview */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:12, alignItems:"start", marginTop:8 }}>
          <div>
            {mode==="calendar" && (
              <CalendarMode guard={guard} prefs={prefs} setMost={setMost} setLeast={setLeast} submitted={submitted} />
            )}
            {mode==="drag" && (
              <DragBucketsMode guard={guard} prefs={prefs} setPrefs={setPrefs} setMost={setMost} setLeast={setLeast} profileName={profile.name} />
            )}
            {mode==="quick" && (
              <QuickAddMode guard={guard} prefs={prefs} setMost={setMost} setLeast={setLeast} profileName={profile.name} />
            )}
            {mode==="rank" && (
              <RankBoardMode guard={guard} prefs={prefs} setMost={setMost} setLeast={setLeast} profileName={profile.name} />
            )}
          </div>
          <LivePreview top={top} bottom={bottom} />
        </div>

        {/* Build tag */}
        <div className="help" style={{ textAlign:"right", padding:"12px 4px 32px" }}>
          Build: {__APP_VERSION__}
        </div>
      </div>
    </div>
  );
}
