import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./App.css";

/* Firebase */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  query
} from "firebase/firestore";

/* ===== Build tag ===== */
const __APP_VERSION__ = "v14.2 unified-modes + centered + palette + name-gate-fix";

/* ===== Firebase config (injected → window fallback → local) ===== */
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
    // build-time injection
    if (typeof __firebase_config !== "undefined" && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch {}
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG)
    return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v14";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===== Constants ===== */
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };
const MONTH_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* Attendings */
const ATTENDINGS = [
  { name: "Ambal",   email: "nambalav@uab.edu" },
  { name: "Arora",   email: "nitinarora@uabmc.edu" },
  { name: "Bhatia",  email: "ksbhatia@uabmc.edu" },
  { name: "Boone",   email: "boone@uabmc.edu" },
  { name: "Carlo",   email: "wcarlo@uabmc.edu" },
  { name: "Jain",    email: "viraljain@uabmc.edu" },
  { name: "Kandasamy", email: "jkandasamy@uabmc.edu" },
  { name: "Kane",    email: "akane@uabmc.edu" },
  { name: "Mackay",  email: "mackay@uabmc.edu" },
  { name: "Schuyler",email: "aschuyler@uabmc.edu" },
  { name: "Shukla",  email: "vshukla@uabmc.edu" },
  { name: "Sims",    email: "bsims@uabmc.edu" },
  { name: "Travers", email: "cptravers@uabmc.edu" },
  { name: "Willis",  email: "kentwillis@uabmc.edu" },
  { name: "Winter",  email: "lwinter@uabmc.edu" },
  { name: "Salas",   email: "asalas@uabmc.edu" },
  { name: "Lal",     email: "clal@uabmc.edu" },
  { name: "Vivian",  email: "vvalcarceluaces@uabmc.edu" },
];

/* Limits summary (appears after name select) */
const ATTENDING_LIMITS = {
  "Ambal":     { requested: 6,  claimed: 4, left: 2 },
  "Schuyler":  { requested: 3,  claimed: 2, left: 1 },
  "Mackay":    { requested: 5,  claimed: 1, left: 4 },
  "Kane":      { requested: 1,  claimed: 1, left: 0 },
  "Salas":     { requested: 3,  claimed: 0, left: 3 },
  "Sims":      { requested: 8,  claimed: 4, left: 4 },
  "Travers":   { requested: 7,  claimed: 4, left: 3 },
  "Kandasamy": { requested: 10, claimed: 6, left: 4 },
  "Willis":    { requested: 9,  claimed: 4, left: 5 },
  "Bhatia":    { requested: 6,  claimed: 5, left: 1 },
  "Winter":    { requested: 5,  claimed: 3, left: 2 },
  "Boone":     { requested: 9,  claimed: 6, left: 3 },
  "Arora":     { requested: 9,  claimed: 7, left: 2 },
  "Jain":      { requested: 9,  claimed: 1, left: 8 },
  "Lal":       { requested: 0,  claimed: 0, left: 0 },
  "Shukla":    { requested: 9,  claimed: 1, left: 8 },
  "Vivian":    { requested: 0,  claimed: 0, left: 2 },
  "Carlo":     { requested: 5,  claimed: 5, left: 0 },
};

/* Calendar (Saturdays; some prefilled) */
const months = {
  "01": [
    { day: "10",    date: "2026-01-10", rni: null,     coa: null },
    { day: "17-19", date: "2026-01-17", rni: null,     coa: null, detail: "MLK Day" },
    { day: "24",    date: "2026-01-24", rni: null,     coa: null },
    { day: "31",    date: "2026-01-31", rni: null,     coa: null },
  ],
  "02": [
    { day: "7", date: "2026-02-07", rni: "Boone",  coa: null },
    { day: "14",date: "2026-02-14", rni: "Boone",  coa: null },
    { day: "21",date: "2026-02-21", rni: "Willis", coa: null },
    { day: "28",date: "2026-02-28", rni: "Willis", coa: null },
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
    { day: "23-25", date:"2026-05-23", rni: null,  coa: null, detail: "Memorial Day" },
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
    { day: "31-Jan 4",date: "2026-12-31", rni: "Kane",      coa: "Kandasamy", isTaken: true, detail: "New Year's Eve" },
  ],
};

const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* Availability map (which services are still open per weekend) */
const availabilityByWeekend = (() => {
  const m = {};
  for (const arr of Object.values(months)) {
    for (const w of arr) {
      const a = [];
      if (w.rni === null) a.push(SERVICES.RNI);
      if (w.coa === null) a.push(SERVICES.COA);
      m[w.date] = a;
    }
  }
  return m;
})();

/* Helpers */
const isValidName = (name) => ATTENDINGS.some(a => a.name === name);
function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = {
      mostService: SERVICES.NONE,
      mostChoice: 0,
      leastService: SERVICES.NONE,
      leastChoice: 0,
    };
  });
  return base;
}
function fmtLabel(id) {
  // month name + day (year omitted in most places)
  const [y,m,d] = id.split("-");
  const idx = parseInt(m,10)-1;
  const day = d.replace(/^0/,"");
  return `${MONTH_FULL[idx]} ${day}`;
}
function toCSV(rows) {
  const headers = Object.keys(rows[0] || {});
  const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const body = rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
  return [headers.join(","), body].join("\n");
}
function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ====== Components ====== */

/* Top identity row (name + email + limits) */
function AttendingIdentity({ profile, saveProfile }) {
  const chosen = ATTENDING_LIMITS[profile.name || ""] || null;
  return (
    <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
      <label style={{ fontSize:14, fontWeight:700 }}>Your name:</label>
      <select
        value={profile.name}
        onChange={(e) => {
          const nextName = e.target.value;
          const email = ATTENDINGS.find(a => a.name === nextName)?.email || profile.email;
          saveProfile({ name: nextName, email });
        }}
        style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, minWidth:220, fontSize:14 }}
      >
        <option value="">— Select —</option>
        {ATTENDINGS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
      </select>

      <label style={{ fontSize:14, fontWeight:700, marginLeft:8 }}>Email (optional):</label>
      <input
        type="email"
        value={profile.email}
        placeholder="you@uab.edu"
        onChange={(e) => saveProfile({ ...profile, email: e.target.value })}
        style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, minWidth:260, fontSize:14 }}
      />

      {profile.name && chosen && (
        <div className="card" style={{ padding:"8px 10px" }}>
          <strong style={{ marginRight:8 }}>{profile.name}</strong>
          <span style={{ fontSize:13, color:"#334155" }}>Requested: {chosen.requested} </span>
          <span style={{ fontSize:13, color:"#334155", marginLeft:8 }}>Claimed: {chosen.claimed} </span>
          <span style={{ fontSize:13, color:"#334155", marginLeft:8 }}>Left: {chosen.left}</span>
        </div>
      )}
    </div>
  );
}

/* Radio limited to available services */
function RadioServiceLimited({ available, value, onChange, name, disabled }) {
  return (
    <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
      {available.includes(SERVICES.RNI) && (
        <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:13 }}>
          <input type="radio" name={name} disabled={disabled} checked={value === SERVICES.RNI} onChange={() => onChange(SERVICES.RNI)} />
          RNI
        </label>
      )}
      {available.includes(SERVICES.COA) && (
        <label style={{ display:"flex", alignItems:"center", gap:4, fontSize:13 }}>
          <input type="radio" name={name} disabled={disabled} checked={value === SERVICES.COA} onChange={() => onChange(SERVICES.COA)} />
          COA
        </label>
      )}
    </div>
  );
}

/* Choice select that can grow beyond 10 */
function ChoiceSelect({ value, onChange, disabled, placeholder, maxN }) {
  const MAX = Math.max(10, maxN || 10);
  return (
    <select
      disabled={disabled}
      value={String(value || 0)}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      style={{ padding:"5px 10px", border:"1px solid #e2e8f0", borderRadius:10, fontSize:13 }}
    >
      <option value="0">{placeholder}</option>
      {Array.from({length:MAX}, (_,i) => i+1).map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

/* Month card for Calendar mode */
function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, submitted }) {
  return (
    <div id={`month-${mk}`} className="card" style={{ display:"flex", flexDirection:"column" }}>
      <button
        onClick={onToggle}
        style={{ background:"#f1f5f9", borderBottom:"1px solid #e5e7eb", fontWeight:800, fontSize:16, padding:"12px 14px", textAlign:"center", cursor:"pointer" }}
        title="Collapse/expand"
      >
        {label} <span style={{ fontWeight:900, marginLeft:6 }}>{collapsed ? "▸" : "▾"}</span>
      </button>
      {!collapsed && (
        <div style={{ padding:12, display:"flex", flexDirection:"column", gap:12 }}>
          {items.map(w => {
            const p = prefs[w.date] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const available = [];
            if (rniOpen) available.push(SERVICES.RNI);
            if (coaOpen) available.push(SERVICES.COA);
            const fullyAssigned = available.length === 0;

            const enforce = (bucket, next) => {
              // Prevent choosing both services in the same bucket on the same weekend
              // (Radio enforces per bucket; this ensures we don't allow invalid service)
              if (!available.includes(next[`${bucket}Service`])) {
                next[`${bucket}Service`] = SERVICES.NONE;
              }
              return next;
            };

            return (
              <div key={w.date} className="card" style={{ padding:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:"#0f172a" }}>{w.day}</div>
                  {w.detail && <div className="pill" style={{ fontSize:12, padding:"2px 8px", borderRadius:999, border:"1px solid #f59e0b33", background:"#fff7ed", color:"#c2410c" }}>{w.detail}</div>}
                </div>
                <div style={{ fontSize:13, color:"#334155", marginBottom:8 }}>
                  <span style={{ background: rniOpen ? "#dbeafe" : "#e5e7eb", color: rniOpen ? "#1e3a8a" : "#111827", borderRadius:6, padding:"3px 8px", marginRight:8 }}>
                    RNI: {rniOpen ? "OPEN" : <strong style={{ fontSize:15 }}>{w.rni}</strong>}
                  </span>
                  <span style={{ background: coaOpen ? "#e0e7ff" : "#e5e7eb", color: coaOpen ? "#3730a3" : "#111827", borderRadius:6, padding:"3px 8px" }}>
                    COA: {coaOpen ? "OPEN" : <strong style={{ fontSize:15 }}>{w.coa}</strong>}
                  </span>
                </div>

                {!fullyAssigned ? (
                  <div style={{ display:"grid", gap:10 }}>
                    <div className="card" style={{ padding:8 }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Most (service + choice)</div>
                      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:12 }}>
                        <RadioServiceLimited
                          available={available}
                          name={`most-${w.date}`}
                          value={available.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                          onChange={(svc) => onMostChange(w.date, enforce("most", { ...p, mostService: svc }))}
                          disabled={submitted}
                        />
                        <ChoiceSelect
                          disabled={submitted || p.mostService === SERVICES.NONE}
                          value={p.mostChoice || 0}
                          onChange={(choice) => onMostChange(w.date, enforce("most", { ...p, mostChoice: choice }))}
                          placeholder="Choice #"
                          maxN={allWeekendIds.length}
                        />
                      </div>
                    </div>

                    <div className="card" style={{ padding:8 }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Least (service + choice)</div>
                      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:12 }}>
                        <RadioServiceLimited
                          available={available}
                          name={`least-${w.date}`}
                          value={available.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                          onChange={(svc) => onLeastChange(w.date, enforce("least", { ...p, leastService: svc }))}
                          disabled={submitted}
                        />
                        <ChoiceSelect
                          disabled={submitted || p.leastService === SERVICES.NONE}
                          value={p.leastChoice || 0}
                          onChange={(choice) => onLeastChange(w.date, enforce("least", { ...p, leastChoice: choice }))}
                          placeholder="Choice #"
                          maxN={allWeekendIds.length}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:12, fontWeight:800, color:"#991b1b", background:"#fee2e2", padding:8, borderRadius:8, textAlign:"center" }}>
                    FULLY ASSIGNED — NO RANKING AVAILABLE
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===== DragBuckets (grouped horizontally by month) ===== */
function DragBuckets({ months, prefs, setMost, setLeast, availabilityByWeekend, submitted, requireName }) {
  const [drag, setDrag] = useState(null);

  const poolByMonth = MONTH_KEYS.map((mk, i) => {
    const items = months[mk]
      .filter(w => (availabilityByWeekend[w.date] || []).length > 0)
      .map(w => ({
        id: w.date,
        label: fmtLabel(w.date),
        avail: availabilityByWeekend[w.date],
      }));
    return { mk, label: MONTH_FULL[i], items };
  });

  const onDropMost = (id) => {
    const avail = availabilityByWeekend[id] || [];
    if (avail.length === 0) return;
    // auto pick single service if only one available
    const svc = avail.length === 1 ? avail[0] : SERVICES.NONE;
    setMost(id, { mostService: svc, mostChoice: nextRank(prefs, "most") });
  };
  const onDropLeast = (id) => {
    const avail = availabilityByWeekend[id] || [];
    if (avail.length === 0) return;
    const svc = avail.length === 1 ? avail[0] : SERVICES.NONE;
    setLeast(id, { leastService: svc, leastChoice: nextRank(prefs, "least") });
  };

  const nextRank = (prefsObj, which) => {
    const key = which === "most" ? "mostChoice" : "leastChoice";
    let m = 0;
    for (const p of Object.values(prefsObj)) m = Math.max(m, p[key] || 0);
    return m + 1;
  };

  const removeFrom = (id, which) => {
    const p = prefs[id] || {};
    if (which === "most") setMost(id, { mostService: SERVICES.NONE, mostChoice: 0 });
    else setLeast(id, { leastService: SERVICES.NONE, leastChoice: 0 });
  };

  const canUse = !!requireName;

  return (
    <div className="drag-wrap">
      {/* POOL */}
      <div className="card" style={{ padding:12 }}>
        <div style={{ fontWeight:800, marginBottom:6 }}>Available (drag a chip)</div>
        {!canUse && <div className="help">Select your name above to begin.</div>}
        <div className="drag-pool">
          {poolByMonth.map((m) => (
            <div key={m.mk}>
              <div style={{ fontSize:12, fontWeight:800, color:"#475569", marginBottom:6 }}>{m.label}</div>
              <div className="drag-month">
                {m.items.map(it => (
                  <div
                    key={it.id}
                    className="drag-chip"
                    draggable={canUse && !submitted}
                    onDragStart={() => setDrag(it.id)}
                    onDoubleClick={() => canUse && !submitted && onDropMost(it.id)}
                    title={`${it.label} — ${it.avail.join(" / ")}`}
                  >
                    {it.label} ({it.avail.join(" / ")})
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MOST */}
      <div className="card" style={{ padding:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:800 }}>Most (drop to add)</div>
          <div style={{ fontSize:12, color:"#64748b" }}>Tip: double-click a chip to add as Most</div>
        </div>
        <div
          className="drop-col"
          onDragOver={(e)=>e.preventDefault()}
          onDrop={(e)=>{ e.preventDefault(); if (canUse && drag && !submitted) onDropMost(drag); }}
        >
          {Object.entries(prefs)
            .filter(([id,p]) => p.mostChoice>0)
            .sort((a,b)=>a[1].mostChoice - b[1].mostChoice)
            .map(([id,p]) => (
              <div key={id} className="drop-item">
                <strong>#{p.mostChoice}</strong>
                <span>{fmtLabel(id)}</span>
                <span style={{ marginLeft:"auto", fontSize:12, color:"#6b7280" }}>{p.mostService !== SERVICES.NONE ? p.mostService : "Pick service"}</span>
                <button className="btn" onClick={()=>removeFrom(id,"most")}>Remove</button>
              </div>
            ))}
        </div>
      </div>

      {/* LEAST */}
      <div className="card" style={{ padding:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:800 }}>Least (drop to add)</div>
        </div>
        <div
          className="drop-col"
          onDragOver={(e)=>e.preventDefault()}
          onDrop={(e)=>{ e.preventDefault(); if (canUse && drag && !submitted) onDropLeast(drag); }}
        >
          {Object.entries(prefs)
            .filter(([id,p]) => p.leastChoice>0)
            .sort((a,b)=>a[1].leastChoice - b[1].leastChoice)
            .map(([id,p]) => (
              <div key={id} className="drop-item">
                <strong>#{p.leastChoice}</strong>
                <span>{fmtLabel(id)}</span>
                <span style={{ marginLeft:"auto", fontSize:12, color:"#6b7280" }}>{p.leastService !== SERVICES.NONE ? p.leastService : "Pick service"}</span>
                <button className="btn" onClick={()=>removeFrom(id,"least")}>Remove</button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ===== QuickAdd ===== */
function QuickAdd({ addCmd, disabled }) {
  const [line, setLine] = useState("");
  return (
    <div className="card" style={{ padding:12 }}>
      <div style={{ fontWeight:800, marginBottom:6 }}>Command palette</div>
      <div style={{ fontSize:13, color:"#475569", marginBottom:6 }}>
        Type like: <code>Jun 3 RNI M 1</code> or <code>August 22 COA L 2</code>.
        Format: <b>Month day</b> <b>SERVICE</b> <b>(M/L)</b> <b>rank#</b>.
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input
          value={line}
          disabled={disabled}
          onChange={(e)=>setLine(e.target.value)}
          placeholder="e.g., Jun 3 RNI M 1"
          style={{ flex:1, padding:"8px 10px", border:"1px solid #e5e7eb", borderRadius:10 }}
        />
        <button className="btn" disabled={disabled} onClick={()=>{ addCmd(line); setLine(""); }}>Add</button>
      </div>
    </div>
  );
}

/* ===== RankBoard ===== */
function RankBoard({ months, prefs, setMost, setLeast, availabilityByWeekend, submitted, requireName }) {
  const canUse = !!requireName;
  const all = MONTH_KEYS.flatMap((mk,i) => months[mk].map(w => ({
    id: w.date,
    label: `${MONTH_FULL[i]} ${w.day}`,
    avail: availabilityByWeekend[w.date] || [],
  })));

  const click = (id, isLeast, e) => {
    if (!canUse || submitted) return;
    const avail = availabilityByWeekend[id] || [];
    if (avail.length === 0) return;

    const svc = avail.length === 1 ? avail[0] : SERVICES.NONE;
    if (isLeast) {
      // Shift+click message was confusing earlier → explicit param
      const next = (Object.values(prefs).reduce((m,p)=>Math.max(m, p.leastChoice||0),0)) + 1;
      setLeast(id, { leastService: svc, leastChoice: next });
    } else {
      const next = (Object.values(prefs).reduce((m,p)=>Math.max(m, p.mostChoice||0),0)) + 1;
      setMost(id, { mostService: svc, mostChoice: next });
    }
  };

  return (
    <div className="card" style={{ padding:12 }}>
      {!canUse && <div className="help">Select your name above to begin.</div>}
      <div style={{ display:"grid", gap:10 }}>
        <div className="card" style={{ padding:10 }}>
          <div style={{ fontWeight:800, marginBottom:6 }}>RankBoard — click = Most, <span style={{fontWeight:700}}>Shift+click</span> = Least</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:10 }}>
            {all.map(item => (
              <button
                key={item.id}
                className="btn"
                disabled={!canUse || submitted || item.avail.length===0}
                onClick={(e)=>click(item.id, e.shiftKey, e)}
                title={`${item.label} — ${item.avail.join(" / ")}`}
                style={{ textAlign:"left" }}
              >
                {item.label} • {item.avail.length? item.avail.join(" / "): "FULL"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Main App ===== */
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialUI = params.get("ui") || "cal"; // cal | drag | quick | rank
  const [ui, setUI] = useState(["cal","drag","quick","rank"].includes(initialUI) ? initialUI : "cal");

  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("Authenticating…");
  const [fbOK, setFbOK] = useState(null); // null → pending, true → ok, false → fail

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [submitted, setSubmitted] = useState(false);

  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));

  const saveProfile = async (next) => {
    // Gate fix: normalize & ensure valid name triggers unlock immediately
    const normalized = {
      name: typeof next.name === "string" ? next.name.trim() : "",
      email: (next.email || "").trim(),
    };
    setProfile(normalized);
    if (!uid) return;
    await setDoc(doc(collection(db, "artifacts", appId, "users", uid, "profile"), "current"),
      { ...normalized, updatedAt: serverTimestamp() }, { merge: true });
  };

  const setMost = useCallback((id, v) => {
    setPrefs(prev => {
      const next = { ...prev, [id]: { ...(prev[id]||{}), mostService: v.mostService, mostChoice: v.mostChoice } };
      return next;
    });
  }, []);
  const setLeast = useCallback((id, v) => {
    setPrefs(prev => {
      const next = { ...prev, [id]: { ...(prev[id]||{}), leastService: v.leastService, leastChoice: v.leastChoice } };
      return next;
    });
  }, []);

  /* Auth */
  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUid(u.uid);
          setStatus("Loading profile & preferences…");
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setFbOK(false);
      }
    })();
  }, []);

  /* Load profile + prefs */
  const profileDocRef = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsDocRef   = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const [proSnap, prefSnap] = await Promise.all([getDoc(profileDocRef(uid)), getDoc(prefsDocRef(uid))]);
        if (proSnap.exists()) {
          const d = proSnap.data();
          const nm = (d.name || "").trim();
          const em = (d.email || "").trim();
          setProfile({ name: nm, email: em });
        }
        if (prefSnap.exists()) {
          const d = prefSnap.data();
          setSubmitted(Boolean(d.submitted));
          const next = initEmptyPrefs();
          if (d.preferences) {
            for (const [k, v] of Object.entries(d.preferences)) {
              next[k] = {
                mostService: v.mostService ?? SERVICES.NONE,
                mostChoice:  v.mostChoice ?? v.mostRank ?? 0,
                leastService: v.leastService ?? SERVICES.NONE,
                leastChoice:  v.leastChoice ?? v.leastRank ?? 0,
              };
            }
          }
          setPrefs(next);
        }
        setStatus("Ready.");
        // tiny read => badge
        setFbOK(true);
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
        setFbOK(false);
      }
    })();
  }, [uid]);

  /* One-time auto-fill (when only one service is available) */
  const [autoFilledOnce, setAutoFilledOnce] = useState(false);
  useEffect(() => {
    if (autoFilledOnce) return;
    setPrefs(prev => {
      let changed = false;
      const next = { ...prev };
      for (const id of allWeekendIds) {
        const avail = availabilityByWeekend[id] || [];
        if (avail.length === 1) {
          const p = next[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
          if (p.mostService === SERVICES.NONE) { p.mostService = avail[0]; changed = true; }
          if (p.leastService === SERVICES.NONE) { p.leastService = avail[0]; changed = true; }
          next[id] = p;
        }
      }
      return changed ? next : prev;
    });
    setAutoFilledOnce(true);
  }, [autoFilledOnce]);

  /* Counts + assembled rows */
  const counts = useMemo(() => {
    let mostCount = 0, leastCount = 0;
    for (const p of Object.values(prefs)) {
      if (p.mostChoice > 0 && p.mostService !== SERVICES.NONE) mostCount++;
      if (p.leastChoice > 0 && p.leastService !== SERVICES.NONE) leastCount++;
    }
    return { mostCount, leastCount };
  }, [prefs]);

  const assembleTopBottom = useCallback(() => {
    const orderIdx = (id) => allWeekendIds.indexOf(id);
    const top = [];
    const bottom = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) bottom.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
    }
    top.sort((a,b)=>a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    bottom.sort((a,b)=>a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    return { top, bottom };
  }, [prefs]);

  /* Submit + downloads */
  const handleSubmit = async () => {
    if (!isValidName(profile.name)) {
      alert("Select your name first.");
      return;
    }
    const badLeast = Object.values(prefs).some(p => p.leastChoice > 0 && p.leastService === SERVICES.NONE);
    if (badLeast) { alert("For every Least choice, select a service (RNI or COA)."); return; }
    const { top, bottom } = assembleTopBottom();
    await setDoc(prefsDocRef(uid), {
      name: profile.name,
      email: profile.email || "",
      preferences: Object.fromEntries(Object.entries(prefs).map(([k,v]) => [k, {
        mostService: v.mostService, mostChoice: v.mostChoice, mostRank: v.mostChoice,
        leastService: v.leastService, leastChoice: v.leastChoice, leastRank: v.leastChoice,
      }])),
      top10: top.map(t => ({ weekend: t.weekend, choice: t.choice, rank: t.choice, service: t.service })),
      bottom10: bottom.map(b => ({ weekend: b.weekend, choice: b.choice, rank: b.choice, service: b.service })),
      submitted: true,
      submittedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    setSubmitted(true);
    alert("Preferences submitted. Downloads reflect your final locked choices.");
  };

  const downloadMyCSV = () => {
    const { top, bottom } = assembleTopBottom();
    const rows = [
      ...top.map(t => ({ attendee: profile.name, email: profile.email || "", kind: "MOST",  choice: t.choice, service: t.service, weekend: fmtLabel(t.weekend) })),
      ...bottom.map(b => ({ attendee: profile.name, email: profile.email || "", kind: "LEAST", choice: b.choice, service: b.service, weekend: fmtLabel(b.weekend) })),
    ];
    const fn = submitted ? `preferences_${profile.name || "attending"}.csv` : `preferences_preview_${profile.name || "attending"}.csv`;
    downloadBlob(fn, "text/csv;charset=utf-8;", toCSV(rows));
  };
  const downloadMyWord = () => {
    const { top, bottom } = assembleTopBottom();
    const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const row = (kind, r) => `<tr><td>${esc(kind)}</td><td>${esc(r.choice)}</td><td>${esc(r.service||"")}</td><td>${esc(fmtLabel(r.weekend))}</td></tr>`;
    const html = `
      <html><head><meta charset="utf-8"><title>Preferences</title></head>
      <body>
        <h2>2026 Weekend Preferences</h2>
        <p><b>Name:</b> ${esc(profile.name||"")} &nbsp; <b>Email:</b> ${esc(profile.email||"")}</p>
        <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
          <thead style="background:#f3f4f6"><tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Sat date)</th></tr></thead>
          <tbody>
            ${top.map(r=>row("MOST", r)).join("")}
            ${bottom.map(r=>row("LEAST", r)).join("")}
          </tbody>
        </table>
        <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
      </body></html>`;
    const fn = submitted ? `preferences_${profile.name || "attending"}.doc` : `preferences_preview_${profile.name || "attending"}.doc`;
    downloadBlob(fn, "application/msword", html);
  };

  /* Live preview panel */
  const LivePreview = () => {
    const { top, bottom } = assembleTopBottom();
    return (
      <div className="card live">
        <div style={{ fontWeight:800, marginBottom:6 }}>Your live selections</div>
        <div style={{ fontSize:12, color:"#64748b", marginBottom:4 }}>{profile.name || "—"}</div>
        <h4>Most</h4>
        {top.length === 0 ? <div className="pill">None</div> :
          top.map(t => <div key={`m-${t.weekend}`} className="pill">#{t.choice} • {t.service} • {fmtLabel(t.weekend)}</div>)}
        <div style={{ height:6 }} />
        <h4>Least</h4>
        {bottom.length === 0 ? <div className="pill">None</div> :
          bottom.map(b => <div key={`l-${b.weekend}`} className="pill">#{b.choice} • {b.service} • {fmtLabel(b.weekend)}</div>)}
      </div>
    );
  };

  /* Calendar mode wrapper */
  const CalendarUI = () => (
    <div className="month-grid">
      {MONTH_KEYS.map((mk, i) => (
        <MonthCard
          key={mk}
          mk={mk}
          label={`${MONTH_FULL[i]} ${YEAR}`}
          items={months[mk]}
          prefs={prefs}
          onMostChange={(id, v) => setMost(id, v)}
          onLeastChange={(id, v) => setLeast(id, v)}
          collapsed={collapsed[mk]}
          onToggle={() => setCollapsed(c => ({ ...c, [mk]: !c[mk] }))}
          submitted={submitted}
        />
      ))}
    </div>
  );

  /* QuickAdd parser */
  const addCmd = (line) => {
    const s = (line || "").trim();
    if (!s) return;
    // e.g., "Jun 3 RNI M 1"
    const re = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s+(rni|coa)\s+(m|l)\s+(\d{1,3})$/i;
    const m = s.match(re);
    if (!m) { alert("Could not parse. Example: 'Jun 3 RNI M 1'"); return; }
    const monthStr = m[1].slice(0,3).toLowerCase();
    const monthIdx = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(monthStr);
    const day = parseInt(m[2],10);
    const svc = m[3].toUpperCase() === "RNI" ? SERVICES.RNI : SERVICES.COA;
    const bucket = m[4].toUpperCase() === "M" ? "most" : "least";
    const rank = parseInt(m[5],10);

    const mk = MONTH_KEYS[monthIdx];
    const sat = months[mk].find(w => String(w.day).replace(/[^0-9]/g,"") === String(day));
    if (!sat) { alert("No matching Saturday found."); return; }
    const id = sat.date;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc) && !(avail.length===1 && avail[0]===svc)) { alert("Service not available for that weekend."); return; }

    if (bucket === "most") setMost(id, { mostService: svc, mostChoice: rank });
    else setLeast(id, { leastService: svc, leastChoice: rank });
  };

  /* Jump bar */
  const jumpTo = (mk) => {
    setCollapsed(prev => {
      const next = { ...prev, [mk]: false };
      requestAnimationFrame(() => {
        const el = document.getElementById(`month-${mk}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return next;
    });
  };

  const canInteract = isValidName(profile.name); // ← *** name-gate fix ***

  return (
    <div className="page">
      {/* Top bar */}
      <div className="topbar">
        <div className="container topbar-inner">
          <div className="mode-switch">
            {[
              ["cal","Calendar"],
              ["drag","DragBuckets"],
              ["quick","QuickAdd"],
              ["rank","RankBoard"],
            ].map(([key, label]) => (
              <button key={key} className={ui===key ? "active" : ""} onClick={()=>setUI(key)}>{label}</button>
            ))}
          </div>

          <div className="jump" style={{ marginLeft:12 }}>
            {MONTH_SHORT.map((m, i) => (
              <button key={m} onClick={()=>jumpTo(MONTH_KEYS[i])}>{m}</button>
            ))}
          </div>

          <div style={{ marginLeft:"auto" }} className="tools">
            <span className={fbOK ? "badge-ok" : "badge-bad"}>
              Firebase: {fbOK ? "Connected ✓" : "Error"}
            </span>
            <button className="btn" onClick={()=>setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k,true])))}>Collapse all</button>
            <button className="btn" onClick={()=>setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k,false])))}>Expand all</button>
            <button className="btn btn-green" onClick={downloadMyCSV}>Preview/My CSV</button>
            <button className="btn btn-indigo" onClick={downloadMyWord}>Preview/My Word</button>
            <button className="btn btn-primary" disabled={!canInteract || submitted} onClick={handleSubmit}>
              {submitted ? "Submitted (Locked)" : "Submit Preferences"}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container">
        <h1 className="h1">2026 Preferences (RNI & COA)</h1>

        {/* Mode-specific instructions */}
        <ol style={{ margin:"8px 0 12px", paddingLeft:20, color:"#334155", fontSize:14, lineHeight:1.45 }}>
          <li>Select your name below. You will see the number of weekends you wanted.</li>
          <li>
            Use any mode (<b>Calendar</b>, <b>Drag</b>, <b>QuickAdd</b>, <b>RankBoard</b>) to select
            <b> Most</b> and <b> Least</b> preferences (service + choice).
            Services are enforced to available slots only; you cannot select both RNI and COA for the same bucket/weekend.
          </li>
          <li>Aim for a balanced spread of COA and RNI on your “Most” list. Selecting more weekends increases your chances of preferred outcomes.</li>
          <li>Preview anytime; when ready, click <b>Submit Preferences</b> (locks your choices).</li>
        </ol>

        <div className="help">
          Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible.
          This is a <b>ranking</b> process; selecting more weekends increases the chance you receive more of your preferred weekends overall.
        </div>

        <div className="card" style={{ padding:"8px 12px", marginBottom:10, fontSize:14 }}>
          Status: {status} • Most choices: {counts.mostCount} • Least choices: {counts.leastCount} {submitted ? "• (Locked after submission)" : ""}
        </div>

        <AttendingIdentity profile={profile} saveProfile={saveProfile} />

        {/* Two-column main body: left = mode UI, right = live preview */}
        <div style={{ display:"grid", gap:16 }}>
          <div style={{ display:"grid", gap:16, gridTemplateColumns:"1fr 320px" }}>
            <div>
              {ui === "cal"  && <CalendarUI />}
              {ui === "drag" && <DragBuckets
                months={months}
                prefs={prefs}
                setMost={(id,v)=>setMost(id, v)}
                setLeast={(id,v)=>setLeast(id, v)}
                availabilityByWeekend={availabilityByWeekend}
                submitted={submitted}
                requireName={canInteract}
              />}
              {ui === "quick" && (
                <QuickAdd addCmd={addCmd} disabled={!canInteract || submitted} />
              )}
              {ui === "rank" && <RankBoard
                months={months}
                prefs={prefs}
                setMost={(id,v)=>setMost(id, v)}
                setLeast={(id,v)=>setLeast(id, v)}
                availabilityByWeekend={availabilityByWeekend}
                submitted={submitted}
                requireName={canInteract}
              />}
            </div>
            <div>
              <LivePreview />
            </div>
          </div>
        </div>

        {/* Build tag */}
        <div style={{ textAlign:"right", color:"#64748b", fontSize:12, marginTop:12 }}>
          Build: {__APP_VERSION__}
        </div>
      </div>
    </div>
  );
}
