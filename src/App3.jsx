import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, collectionGroup, getDocs, query
} from "firebase/firestore";

/* ====================== BUILD TAG ====================== */
const __APP_VERSION__ = "v13.0 — Multi-UI + CmdPalette + LivePreview";

/* ====================== FIREBASE ======================= */
/* Your local fallback config (kept as-is) */
const LOCAL_FALLBACK = {
  apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
  authDomain: "attending-schedule-2026.firebaseapp.com",
  projectId: "attending-schedule-2026",
  storageBucket: "attending-schedule-2026.firebasestorage.app",
  messagingSenderId: "777996986623",
  appId: "1:777996986623:web:0a8697cccb63149d9744ca",
  measurementId: "G-TJXCM9P7W2"
};
/* Prefer injected config if present; else window fallback; else LOCAL_FALLBACK */
const firebaseConfig = (() => {
  try { if (typeof __firebase_config !== "undefined" && __firebase_config) return JSON.parse(__firebase_config); } catch {}
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG) return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v13.0";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ====================== CONSTANTS ====================== */
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };

/* Your current attendings with emails (kept) */
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

/* Targets (as given) */
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

/* ============== Weekend data (Sat dates) ============== */
/* Same schema you used before; ‘isTaken’ marks fully assigned weekends */
const months = {
  '01': [
    { day: '10', date: '2026-01-10', rni: null, coa: null },
    { day: '17-19', date: '2026-01-17', rni: null, coa: null, detail: 'MLK Day' },
    { day: '24', date: '2026-01-24', rni: null, coa: null },
    { day: '31', date: '2026-01-31', rni: null, coa: null },
  ],
  '02': [
    { day: '7',  date: '2026-02-07', rni: 'Boone',  coa: null },
    { day: '14', date: '2026-02-14', rni: 'Boone',  coa: null },
    { day: '21', date: '2026-02-21', rni: 'Willis', coa: null },
    { day: '28', date: '2026-02-28', rni: 'Willis', coa: null },
  ],
  '03': [
    { day: '7',  date: '2026-03-07', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { day: '14', date: '2026-03-14', rni: null,     coa: 'Winter' },
    { day: '21', date: '2026-03-21', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { day: '28', date: '2026-03-28', rni: null,     coa: 'Arora' },
  ],
  '04': [
    { day: '4',  date: '2026-04-04', rni: 'Sims', coa: null },
    { day: '11', date: '2026-04-11', rni: null,   coa: null },
    { day: '18', date: '2026-04-18', rni: 'Sims', coa: null },
    { day: '25', date: '2026-04-25', rni: null,   coa: null, detail: 'PAS Meeting Coverage' },
  ],
  '05': [
    { day: '2',   date: '2026-05-02', rni: null,    coa: null },
    { day: '9',   date: '2026-05-09', rni: 'Arora', coa: null },
    { day: '16',  date: '2026-05-16', rni: 'Arora', coa: null },
    { day: '23-25', date: '2026-05-23', rni: null,  coa: null, detail: 'Memorial Day' },
    { day: '30',  date: '2026-05-30', rni: 'Arora', coa: null },
  ],
  '06': [
    { day: '6',    date: '2026-06-06', rni: 'Schuyler', coa: 'Winter', isTaken: true },
    { day: '13',   date: '2026-06-13', rni: 'Boone',    coa: null },
    { day: '19-21',date: '2026-06-19', rni: 'Schuyler', coa: 'Winter', isTaken: true, detail: 'Juneteenth Day' },
    { day: '27',   date: '2026-06-27', rni: 'Boone',    coa: null },
  ],
  '07': [
    { day: '4-6', date: '2026-07-04', rni: 'Jain',    coa: 'Carlo',  isTaken: true, detail: '4th of July' },
    { day: '11',  date: '2026-07-11', rni: null,      coa: 'Willis' },
    { day: '18',  date: '2026-07-18', rni: null,      coa: null },
    { day: '25',  date: '2026-07-25', rni: 'Shukla',  coa: 'Willis', isTaken: true },
  ],
  '08': [
    { day: '1',  date: '2026-08-01', rni: 'Boone',  coa: null },
    { day: '8',  date: '2026-08-08', rni: 'Sims',   coa: 'Carlo', isTaken: true },
    { day: '15', date: '2026-08-15', rni: 'Boone',  coa: null },
    { day: '22', date: '2026-08-22', rni: 'Sims',   coa: null },
    { day: '29', date: '2026-08-29', rni: null,     coa: 'Carlo' },
  ],
  '09': [
    { day: '5-7', date: '2026-09-05', rni: 'Mackay', coa: null, detail: 'Labor Day' },
    { day: '12',  date: '2026-09-12', rni: null,     coa: null },
    { day: '19',  date: '2026-09-19', rni: null,     coa: null },
    { day: '26',  date: '2026-09-26', rni: null,     coa: null },
  ],
  '10': [
    { day: '3',  date: '2026-10-03', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
    { day: '10', date: '2026-10-10', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { day: '17', date: '2026-10-17', rni: 'Kandasamy', coa: null },
    { day: '24', date: '2026-10-24', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { day: '31', date: '2026-10-31', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
  ],
  '11': [
    { day: '7',  date: '2026-11-07', rni: 'Ambal',  coa: null },
    { day: '14', date: '2026-11-14', rni: 'Bhatia', coa: null },
    { day: '21', date: '2026-11-21', rni: 'Ambal',  coa: null },
    { day: '26-28', date: '2026-11-26', rni: 'Bhatia', coa: null, detail: 'Thanksgiving' },
  ],
  '12': [
    { day: '5',       date: '2026-12-05', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { day: '12',      date: '2026-12-12', rni: null,        coa: null },
    { day: '19',      date: '2026-12-19', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { day: '24-28',   date: '2026-12-24', rni: 'Bhatia',    coa: 'Arora',     isTaken: true, detail: 'Christmas' },
    { day: '31-Jan 4',date: '2026-12-31', rni: 'Kane',      coa: 'Kandasamy', isTaken: true, detail: "New Year's Eve" },
  ],
};
const MONTH_KEYS  = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* Availability map for enforcing service options */
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

/* ====================== HELPERS ======================== */
const container = { maxWidth: 1120, margin: "0 auto", padding: "0 12px" };
const chip = (bg, fg) => ({ padding:'2px 8px', borderRadius: 10, background:bg, color:fg, fontSize:12, border:`1px solid ${fg}22` });

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
  });
  return base;
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}
function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function downloadCSV(filename, rows) {
  if (!rows.length) { alert("Nothing to export."); return; }
  downloadBlob(filename, "text/csv;charset=utf-8;", toCSV(rows));
}
function docHtml(name, email, top, bottom) {
  const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const row = (kind, r) => `<tr><td>${kind}</td><td>${esc(r.choice)}</td><td>${esc(r.service)}</td><td>${esc(r.weekend)}</td></tr>`;
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
  <head><meta charset="utf-8"><title>Preferences</title></head>
  <body>
    <h2>2026 Weekend Preferences</h2>
    <p><b>Name:</b> ${esc(name||"")} &nbsp; <b>Email:</b> ${esc(email||"")}</p>
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead style="background:#f3f4f6"><tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Sat date)</th></tr></thead>
      <tbody>
        ${top.map(r => row("MOST", r)).join("")}
        ${bottom.map(r => row("LEAST", r)).join("")}
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
  </body>
  </html>`;
}

/* ====================== SHARED WIDGETS ================= */
function FirebaseBadge({ ok }) {
  return (
    <span style={{
      marginLeft:8, padding:"4px 8px", borderRadius:999,
      background: ok ? "#e8f5e9" : "#fee2e2",
      color: ok ? "#0f5132" : "#991b1b",
      border: `1px solid ${ok ? "#badbcc" : "#fecaca"}`, fontSize:12
    }}>
      Firebase: {ok ? "Connected ✓" : "Failed"}
    </span>
  );
}
function LivePreview({ prefs, profile }) {
  const rows = useMemo(() => {
    const out = [];
    const idx = id => allWeekendIds.indexOf(id);
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) out.push({ kind:"MOST",  choice:p.mostChoice, service:p.mostService, weekend:id });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) out.push({ kind:"LEAST", choice:p.leastChoice, service:p.leastService, weekend:id });
    }
    out.sort((a,b) => a.kind.localeCompare(b.kind) || (a.choice-b.choice) || (idx(a.weekend)-idx(b.weekend)));
    return out;
  }, [prefs]);
  return (
    <div style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:10 }}>
      <div style={{ fontWeight:900, marginBottom:6 }}>Your live selections</div>
      <div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>
        {profile?.name ? profile.name : "Select your name"} • {rows.length} items
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize:12, color:"#94a3b8" }}>— none yet —</div>
      ) : rows.map((r,i) => (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"center", fontSize:13, padding:"4px 0", borderTop: i? "1px dashed #e5e7eb":"none" }}>
          <span style={chip(r.kind==="MOST"?"#d1fae5":"#ffe4e6", r.kind==="MOST"?"#065f46":"#9f1239")}>{r.kind}</span>
          <span>#{r.choice}</span>
          <span>•</span>
          <span>{MONTH_FULL[new Date(r.weekend).getMonth()]} {new Date(r.weekend).getDate()}</span>
          <span>•</span>
          <span>{r.service}</span>
        </div>
      ))}
    </div>
  );
}
function CommandPalette({ open, onClose, jumpTo, exportCSV, exportWord }) {
  const ref = useRef(null);
  useEffect(() => {
    function onKey(e){ if(e.key==="Escape") onClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.25)", zIndex:200 }}>
      <div ref={ref} style={{
        maxWidth: 560, margin:"10vh auto 0", background:"#fff", borderRadius:14,
        border:"1px solid #e5e7eb", boxShadow:"0 10px 30px rgba(0,0,0,.15)", padding:12
      }}>
        <div style={{ fontWeight:900, marginBottom:8 }}>Command Palette</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {MONTH_KEYS.map((mk,i)=>(
            <button key={mk} onClick={()=>{onClose(); jumpTo(mk);}}
              style={{ padding:"6px 10px", borderRadius:999, border:"1px solid #e5e7eb", background:"#fff", fontSize:12 }}>
              Jump: {MONTH_FULL[i]}
            </button>
          ))}
          <span style={{ flexBasis:"100%" }} />
          <button onClick={()=>{onClose(); exportCSV();}}
            style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #059669", background:"#10b981", color:"#fff", fontSize:12 }}>
            Preview/My CSV
          </button>
          <button onClick={()=>{onClose(); exportWord();}}
            style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #4f46e5", background:"#6366f1", color:"#fff", fontSize:12 }}>
            Preview/My Word
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================== UI 1: CALENDAR ================= */
function RadioServiceLimited({ available, value, onChange, disabled, name }) {
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
      {available.includes(SERVICES.RNI) && (
        <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:13 }}>
          <input type="radio" disabled={disabled} checked={value===SERVICES.RNI} onChange={()=>onChange(SERVICES.RNI)} name={name}/> RNI
        </label>
      )}
      {available.includes(SERVICES.COA) && (
        <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:13 }}>
          <input type="radio" disabled={disabled} checked={value===SERVICES.COA} onChange={()=>onChange(SERVICES.COA)} name={name}/> COA
        </label>
      )}
    </div>
  );
}
function ChoiceSelect({ value, onChange, disabled, placeholder, maxN }) {
  const MAX = Math.max(10, maxN || 10);
  return (
    <select disabled={disabled} value={String(value||0)} onChange={e=>onChange(parseInt(e.target.value,10))}
      style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13 }}>
      <option value="0">{placeholder}</option>
      {Array.from({length:MAX},(_,i)=>i+1).map(n=> <option key={n} value={n}>{n}</option>)}
    </select>
  );
}
function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, locked }) {
  return (
    <div id={`month-${mk}`} style={{
      scrollMarginTop: 96, height:"100%", display:"flex", flexDirection:"column",
      border:"1px solid #e2e8f0", borderRadius:16, background:"#fff", boxShadow:"0 1px 2px rgba(0,0,0,.05)"
    }}>
      <button onClick={onToggle} style={{
        background:"#f1f5f9", color:"#0f172a", borderBottom:"1px solid #e2e8f0", fontWeight:800,
        fontSize:16, padding:"12px 14px", textAlign:"center", cursor:"pointer"
      }}>
        {label} <span style={{ fontWeight:900, marginLeft:6 }}>{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div style={{ padding:12, display:"flex", flexDirection:"column", gap:12 }}>
          {items.map(w=>{
            const p = prefs[w.date] || { mostService:SERVICES.NONE, mostChoice:0, leastService:SERVICES.NONE, leastChoice:0 };
            const avail = availabilityByWeekend[w.date] || [];
            const fullyAssigned = w.isTaken || avail.length===0;

            const enforceMutualExclusion = (bucket, svc, choice) => {
              // Prevent picking both RNI and COA *within the same bucket/day*.
              // We only store one service per bucket; this function centralizes updates.
              if (bucket==="MOST") onMostChange(w.date, { ...p, mostService: svc, mostChoice: choice });
              else onLeastChange(w.date, { ...p, leastService: svc, leastChoice: choice });
            };

            return (
              <div key={w.date} style={{ padding:12, borderRadius:12, border:"1px solid #e5e7eb", background: fullyAssigned ? "#f9fafb" : "#fff", opacity: fullyAssigned?0.8:1 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ fontSize:18, fontWeight:800, color:"#0f172a" }}>
                    {MONTH_FULL[new Date(w.date).getMonth()]} {new Date(w.date).getDate()}
                  </div>
                  {w.detail && <div style={chip("#fff7ed", "#c2410c")}>{w.detail}</div>}
                </div>

                <div style={{ fontSize:13, color:"#334155", marginBottom:8, lineHeight:1.25 }}>
                  <span style={{ background: w.rni===null ? "#dbeafe" : "#e5e7eb", color: w.rni===null ? "#1e3a8a" : "#111827",
                    borderRadius:6, padding:"3px 8px", marginRight:8 }}>
                    RNI: {w.rni===null ? "OPEN" : <strong style={{ fontSize:15 }}>{w.rni}</strong>}
                  </span>
                  <span style={{ background: w.coa===null ? "#e0e7ff" : "#e5e7eb", color: w.coa===null ? "#3730a3" : "#111827",
                    borderRadius:6, padding:"3px 8px" }}>
                    COA: {w.coa===null ? "OPEN" : <strong style={{ fontSize:15 }}>{w.coa}</strong>}
                  </span>
                </div>

                {!fullyAssigned ? (
                  <div style={{ display:"grid", gap:10, opacity: locked ? .6 : 1, pointerEvents: locked ? "none":"auto" }}>
                    {/* MOST */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:8 }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Most (service + choice)</div>
                      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:12 }}>
                        <RadioServiceLimited
                          available={avail}
                          disabled={locked}
                          value={avail.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                          onChange={(svc)=>enforceMutualExclusion("MOST", svc, p.mostChoice)}
                          name={`most-${w.date}`}
                        />
                        <ChoiceSelect
                          disabled={locked || p.mostService===SERVICES.NONE}
                          value={p.mostChoice||0}
                          onChange={(choice)=>enforceMutualExclusion("MOST", p.mostService, choice)}
                          placeholder="Choice #"
                          maxN={allWeekendIds.length}
                        />
                        {p.mostService!==SERVICES.NONE && p.mostChoice>0 && (
                          <span style={chip("#d1fae5","#10b981")}>Most #{p.mostChoice}</span>
                        )}
                      </div>
                    </div>

                    {/* LEAST */}
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:8 }}>
                      <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>Least (service + choice)</div>
                      <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:12 }}>
                        <RadioServiceLimited
                          available={avail}
                          disabled={locked}
                          value={avail.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                          onChange={(svc)=>enforceMutualExclusion("LEAST", svc, p.leastChoice)}
                          name={`least-${w.date}`}
                        />
                        <ChoiceSelect
                          disabled={locked || p.leastService===SERVICES.NONE}
                          value={p.leastChoice||0}
                          onChange={(choice)=>enforceMutualExclusion("LEAST", p.leastService, choice)}
                          placeholder="Choice #"
                          maxN={allWeekendIds.length}
                        />
                        {p.leastService!==SERVICES.NONE && p.leastChoice>0 && (
                          <span style={chip("#ffe4e6","#e11d48")}>Least #{p.leastChoice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:12, fontWeight:800, color:"#991b1b", background:"#fee2e2",
                    padding:8, borderRadius:8, textAlign:"center" }}>
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
function CalendarGrid({ prefs, setMost, setLeast, collapsed, setCollapsed, submitted }) {
  const jumpTo = (mk) => {
    setCollapsed(prev => {
      const next = { ...prev, [mk]: false };
      requestAnimationFrame(()=> {
        const el = document.getElementById(`month-${mk}`);
        if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
      });
      return next;
    });
  };
  return (
    <>
      <div style={{ ...container, padding:"0 12px 24px",
        display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(420px, 1fr))", gap:"32px" }}>
        {MONTH_KEYS.map((mk,i)=>(
          <MonthCard
            key={mk}
            mk={mk}
            label={`${MONTH_FULL[i]} ${YEAR}`}
            items={months[mk]}
            prefs={prefs}
            onMostChange={(id,v)=>setMost(id,v)}
            onLeastChange={(id,v)=>setLeast(id,v)}
            collapsed={collapsed[mk]}
            onToggle={()=>setCollapsed(c=>({ ...c, [mk]: !c[mk] }))}
            locked={submitted}
          />
        ))}
      </div>
      <div style={{ ...container, padding:"0 12px 24px", display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
        {MONTH_KEYS.map((mk,i)=>(
          <button key={mk} onClick={()=>jumpTo(mk)} style={{
            padding:"6px 10px", borderRadius:999, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer", fontSize:12
          }}>{MONTH_FULL[i]}</button>
        ))}
      </div>
    </>
  );
}

/* ====================== UI 2: DRAG BUCKETS ============= */
/* Compact left “library”; empty Most/Least initially; enforces availability */
function DragBuckets({ prefs, setMost, setLeast, submitted, requireName }) {
  // build library
  const lib = useMemo(()=>{
    return MONTH_KEYS.flatMap((mk,i)=>
      months[mk].flatMap(w=>{
        const avail = availabilityByWeekend[w.date] || [];
        return avail.map(svc=>({
          id:w.date, key:`${w.date}:${svc}`, label:`${MONTH_FULL[new Date(w.date).getMonth()]} ${new Date(w.date).getDate()} — ${svc}`
        }));
      })
    );
  },[]);
  const mostList = useMemo(()=>{
    const a=[]; for(const [id,p] of Object.entries(prefs)) if(p.mostService!==SERVICES.NONE && p.mostChoice>0) a.push({id,choice:p.mostChoice,service:p.mostService});
    a.sort((x,y)=>x.choice-y.choice || allWeekendIds.indexOf(x.id)-allWeekendIds.indexOf(y.id)); return a;
  },[prefs]);
  const leastList = useMemo(()=>{
    const a=[]; for(const [id,p] of Object.entries(prefs)) if(p.leastService!==SERVICES.NONE && p.leastChoice>0) a.push({id,choice:p.leastChoice,service:p.leastService});
    a.sort((x,y)=>x.choice-y.choice || allWeekendIds.indexOf(x.id)-allWeekendIds.indexOf(y.id)); return a;
  },[prefs]);

  const nextChoice = (list)=> list.reduce((m,x)=>Math.max(m,x.choice||0),0)+1;
  const [drag, setDrag] = useState(null);
  const onDragStart = (payload)=>(e)=>{ if(submitted||!requireName){e.preventDefault();return;} setDrag(payload); e.dataTransfer.setData("text/plain", JSON.stringify(payload)); };
  const onDragOver  = (e)=>{ if(submitted||!requireName) return; e.preventDefault(); e.dataTransfer.dropEffect="move"; };
  const drop = (bucket)=>(e)=>{
    if(submitted||!requireName) return;
    e.preventDefault();
    let pl=drag; try{ pl = JSON.parse(e.dataTransfer.getData("text/plain")); }catch{}
    if(!pl) return;
    const avail = availabilityByWeekend[pl.id]||[];
    if(!avail.includes(pl.service)) return;
    if(bucket==="MOST"){
      setLeast(pl.id, { ...(prefs[pl.id]||{}), leastService:SERVICES.NONE, leastChoice:0 });
      setMost (pl.id, { ...(prefs[pl.id]||{}), mostService: pl.service, mostChoice: nextChoice(mostList) });
    }else{
      setMost (pl.id, { ...(prefs[pl.id]||{}), mostService:SERVICES.NONE, mostChoice:0 });
      setLeast(pl.id, { ...(prefs[pl.id]||{}), leastService: pl.service, leastChoice: nextChoice(leastList) });
    }
  };
  const removeFrom = (bucket,id)=>{
    if(bucket==="MOST") setMost(id,{...(prefs[id]||{}), mostService:SERVICES.NONE, mostChoice:0});
    else setLeast(id,{...(prefs[id]||{}), leastService:SERVICES.NONE, leastChoice:0});
  };

  const shell = { border:"1px solid #e5e7eb", borderRadius:14, background:"#fff", boxShadow:"0 1px 2px rgba(0,0,0,.04)" };
  const title = { fontWeight:900, fontSize:14, padding:"8px 10px", borderBottom:"1px solid #e5e7eb", background:"#f8fafc" };
  const pad   = { padding:10 };

  return (
    <div style={{ ...container, marginTop:12 }}>
      <div style={{ display:"grid", gap:16, gridTemplateColumns:"1fr 1fr 1fr" }}>
        <div style={shell}>
          <div style={title}>Available (drag a chip)</div>
          <div style={{...pad}}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:8 }}>
              {lib.map(item=>(
                <div key={item.key} draggable={!submitted&&requireName} onDragStart={onDragStart({id:item.id, service:item.label.includes("RNI")?SERVICES.RNI:SERVICES.COA})}
                  title={requireName? "Drag to MOST or LEAST":"Select your name first"} style={{
                    padding:"6px 10px", borderRadius:999, border:"1px solid #e5e7eb", background:"#fff",
                    fontSize:12, cursor:(submitted||!requireName)?"not-allowed":"grab", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
                  }}>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={shell} onDragOver={onDragOver} onDrop={drop("MOST")}>
          <div style={title}>Most (drop to add)</div>
          <div style={{ ...pad, minHeight:120, display:"flex", flexDirection:"column", gap:8 }}>
            {mostList.length===0 ? <div style={{ fontSize:12, color:"#64748b" }}>— empty —</div> :
              mostList.map(m=>(
                <div key={`M-${m.id}`} style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ padding:"4px 8px", borderRadius:8, background:"#d1fae5", border:"1px solid #10b98133", fontSize:12 }}>#{m.choice}</span>
                  <span style={{ fontSize:13 }}>{MONTH_FULL[new Date(m.id).getMonth()]} {new Date(m.id).getDate()} — {m.service}</span>
                  <button onClick={()=>removeFrom("MOST",m.id)} style={{ marginLeft:"auto", fontSize:12, border:"1px solid #e5e7eb", borderRadius:8, padding:"2px 6px" }}>Remove</button>
                </div>
              ))
            }
          </div>
        </div>
        <div style={shell} onDragOver={onDragOver} onDrop={drop("LEAST")}>
          <div style={title}>Least (drop to add)</div>
          <div style={{ ...pad, minHeight:120, display:"flex", flexDirection:"column", gap:8 }}>
            {leastList.length===0 ? <div style={{ fontSize:12, color:"#64748b" }}>— empty —</div> :
              leastList.map(m=>(
                <div key={`L-${m.id}`} style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ padding:"4px 8px", borderRadius:8, background:"#fee2e2", border:"1px solid #ef444433", fontSize:12 }}>#{m.choice}</span>
                  <span style={{ fontSize:13 }}>{MONTH_FULL[new Date(m.id).getMonth()]} {new Date(m.id).getDate()} — {m.service}</span>
                  <button onClick={()=>removeFrom("LEAST",m.id)} style={{ marginLeft:"auto", fontSize:12, border:"1px solid #e5e7eb", borderRadius:8, padding:"2px 6px" }}>Remove</button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
      {!requireName && (
        <div style={{ marginTop:8, fontSize:12, color:"#991b1b", background:"#fee2e2", border:"1px solid #fecaca",
          padding:"6px 8px", borderRadius:8 }}>
          Select your name above to enable drag & drop.
        </div>
      )}
    </div>
  );
}

/* ====================== UI 3: QUICK ADD (fast form) ==== */
function QuickAdd({ prefs, setMost, setLeast, submitted, requireName }) {
  const [pick, setPick] = useState({ id:"", svc:SERVICES.NONE, bucket:"MOST", choice:1 });
  const options = useMemo(()=> allWeekendIds
    .filter(id => (availabilityByWeekend[id]||[]).length>0)
    .map(id => ({ id, label:`${MONTH_FULL[new Date(id).getMonth()]} ${new Date(id).getDate()}` })), []);
  const onAdd = ()=>{
    if(submitted||!requireName) return;
    if(!pick.id || pick.svc===SERVICES.NONE) return;
    if(pick.bucket==="MOST")
      setMost(pick.id, { ...(prefs[pick.id]||{}), mostService:pick.svc, mostChoice:pick.choice });
    else
      setLeast(pick.id, { ...(prefs[pick.id]||{}), leastService:pick.svc, leastChoice:pick.choice });
  };
  return (
    <div style={{ ...container, marginTop:12, border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:12 }}>
      <div style={{ fontWeight:900, marginBottom:8 }}>Quick Add</div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <select value={pick.id} onChange={e=>setPick(p=>({...p,id:e.target.value}))}
          style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:10 }}>
          <option value="">Weekend…</option>
          {options.map(o=> <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <select value={pick.svc} onChange={e=>setPick(p=>({...p,svc:e.target.value}))}
          style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:10 }}>
          <option value={SERVICES.NONE}>Service…</option>
          <option value={SERVICES.RNI}>RNI</option>
          <option value={SERVICES.COA}>COA</option>
        </select>
        <select value={pick.bucket} onChange={e=>setPick(p=>({...p,bucket:e.target.value}))}
          style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:10 }}>
          <option value="MOST">Most</option>
          <option value="LEAST">Least</option>
        </select>
        <input type="number" min={1} value={pick.choice} onChange={e=>setPick(p=>({...p,choice:parseInt(e.target.value||"1",10)}))}
          style={{ width:90, padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:10 }} />
        <button onClick={onAdd} disabled={submitted||!requireName}
          style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #0ea5e9", background:"#38bdf8", color:"#fff" }}>
          Add
        </button>
      </div>
    </div>
  );
}

/* ====================== UI 4: RANK BOARD (table) ======= */
function RankBoard({ prefs, setMost, setLeast, submitted, requireName }) {
  const rows = useMemo(()=> MONTH_KEYS.flatMap((mk,i)=> months[mk].map(w=>({
    id:w.date, label:`${MONTH_FULL[new Date(w.date).getMonth()]} ${new Date(w.date).getDate()}`,
    avail: availabilityByWeekend[w.date]||[]
  }))),[]);
  const Row = ({ r })=>{
    const p = prefs[r.id] || { mostService:SERVICES.NONE, mostChoice:0, leastService:SERVICES.NONE, leastChoice:0 };
    return (
      <tr>
        <td style={{ padding:"6px 8px", borderTop:"1px solid #e5e7eb" }}>{r.label}</td>
        <td style={{ padding:"6px 8px", borderTop:"1px solid #e5e7eb" }}>
          <select disabled={submitted||!requireName} value={p.mostService}
            onChange={e=>setMost(r.id,{...p, mostService:e.target.value})}>
            <option value={SERVICES.NONE}>—</option>
            {r.avail.includes(SERVICES.RNI) && <option value={SERVICES.RNI}>RNI</option>}
            {r.avail.includes(SERVICES.COA) && <option value={SERVICES.COA}>COA</option>}
          </select>
          <input type="number" min={0} value={p.mostChoice} disabled={submitted||!requireName||p.mostService===SERVICES.NONE}
            onChange={e=>setMost(r.id,{...p, mostChoice:parseInt(e.target.value||"0",10)})}
            style={{ width:70, marginLeft:8 }} />
        </td>
        <td style={{ padding:"6px 8px", borderTop:"1px solid #e5e7eb" }}>
          <select disabled={submitted||!requireName} value={p.leastService}
            onChange={e=>setLeast(r.id,{...p, leastService:e.target.value})}>
            <option value={SERVICES.NONE}>—</option>
            {r.avail.includes(SERVICES.RNI) && <option value={SERVICES.RNI}>RNI</option>}
            {r.avail.includes(SERVICES.COA) && <option value={SERVICES.COA}>COA</option>}
          </select>
          <input type="number" min={0} value={p.leastChoice} disabled={submitted||!requireName||p.leastService===SERVICES.NONE}
            onChange={e=>setLeast(r.id,{...p, leastChoice:parseInt(e.target.value||"0",10)})}
            style={{ width:70, marginLeft:8 }} />
        </td>
      </tr>
    );
  };
  return (
    <div style={{ ...container, marginTop:12, border:"1px solid #e5e7eb", borderRadius:12, background:"#fff", padding:12, overflowX:"auto" }}>
      <div style={{ fontWeight:900, marginBottom:8 }}>Rank Board</div>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
        <thead>
          <tr style={{ background:"#f8fafc" }}>
            <th style={{ textAlign:"left", padding:"6px 8px", borderBottom:"1px solid #e5e7eb" }}>Weekend</th>
            <th style={{ textAlign:"left", padding:"6px 8px", borderBottom:"1px solid #e5e7eb" }}>Most (service + choice)</th>
            <th style={{ textAlign:"left", padding:"6px 8px", borderBottom:"1px solid #e5e7eb" }}>Least (service + choice)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => <Row key={r.id} r={r} />)}
        </tbody>
      </table>
    </div>
  );
}

/* ====================== APP ============================ */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("Authenticating…");
  const [fbOK, setFbOK] = useState(false);

  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name:"", email:"" });
  const [submitted, setSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(()=> Object.fromEntries(MONTH_KEYS.map(mk=>[mk,true])));

  const params = new URLSearchParams(window.location.search);
  const ui = (params.get("ui") || "cal").toLowerCase();   // cal | drag | quick | rank
  const isAdmin = params.get("admin") === "1";

  // Auth
  useEffect(()=>{ (async ()=>{
    try{
      const token = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
      if (token) await signInWithCustomToken(auth, token); else await signInAnonymously(auth);
      onAuthStateChanged(auth, (u)=>{
        if (u) setUid(u.uid);
        setStatus("Loading profile & preferences…");
      });
    }catch(e){ console.error(e); setStatus(`Auth error: ${e.message}`); }
  })(); }, []);

  // Load user docs
  const profileDocRef = (uidX)=> doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsDocRef   = (uidX)=> doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  useEffect(()=>{ if(!uid) return; (async ()=>{
    try{
      const [proSnap, prefSnap] = await Promise.all([getDoc(profileDocRef(uid)), getDoc(prefsDocRef(uid))]);
      if (proSnap.exists()) {
        const d = proSnap.data(); setProfile({ name:d.name||"", email:d.email||"" });
      }
      if (prefSnap.exists()) {
        const d = prefSnap.data(); setSubmitted(Boolean(d.submitted));
        if (d.preferences) {
          const remapped={}; for(const [k,v] of Object.entries(d.preferences||{})){
            remapped[k]={ mostService:v.mostService??SERVICES.NONE, mostChoice:(v.mostChoice??v.mostRank??0),
                           leastService:v.leastService??SERVICES.NONE, leastChoice:(v.leastChoice??v.leastRank??0) };
          }
          setPrefs({ ...initEmptyPrefs(), ...remapped });
        }
      }
      setStatus("Ready.");
      setFbOK(true);
    }catch(e){ console.error(e); setStatus(`Load error: ${e.message}`); setFbOK(false); }
  })(); }, [uid]);

  // Ensure mutually exclusive service choice *within the same bucket/day* already handled in UI components.

  const setMost = useCallback((id, v)=>{
    setPrefs(prev=>({ ...prev, [id]: { ...(prev[id]||{}), mostService:v.mostService, mostChoice:v.mostChoice }}));
  },[]);
  const setLeast = useCallback((id, v)=>{
    setPrefs(prev=>({ ...prev, [id]: { ...(prev[id]||{}), leastService:v.leastService, leastChoice:v.leastChoice }}));
  },[]);

  // Counts for status
  const counts = useMemo(()=>{
    let most=0, least=0;
    for (const p of Object.values(prefs)) {
      if (p.mostService!==SERVICES.NONE && p.mostChoice>0) most++;
      if (p.leastService!==SERVICES.NONE && p.leastChoice>0) least++;
    }
    return { most, least };
  },[prefs]);

  // Submit/save
  const assembleTopBottom = useCallback(()=>{
    const order = id=> allWeekendIds.indexOf(id);
    const top=[], bottom=[];
    for(const [id,p] of Object.entries(prefs)){
      if (p.mostService!==SERVICES.NONE && p.mostChoice>0) top.push({ weekend:id, choice:p.mostChoice, service:p.mostService });
      if (p.leastService!==SERVICES.NONE && p.leastChoice>0) bottom.push({ weekend:id, choice:p.leastChoice, service:p.leastService });
    }
    top.sort((a,b)=>a.choice-b.choice || order(a.weekend)-order(b.weekend));
    bottom.sort((a,b)=>a.choice-b.choice || order(a.weekend)-order(b.weekend));
    return { top, bottom };
  },[prefs]);

  const handleSubmit = async ()=>{
    if (!uid || !profile.name) { alert("Select your name first."); return; }
    // every least must have service
    const badLeast = Object.values(prefs).some(p=>p.leastChoice>0 && p.leastService===SERVICES.NONE);
    if (badLeast) { alert('For every “Least” choice, please select a service (RNI or COA).'); return; }

    const { top, bottom } = assembleTopBottom();
    await setDoc(prefsDocRef(uid), {
      name: profile.name, email: profile.email || "",
      preferences: Object.fromEntries(Object.entries(prefs).map(([k,v])=>[k,{
        mostService:v.mostService, mostChoice:v.mostChoice, mostRank:v.mostChoice,
        leastService:v.leastService, leastChoice:v.leastChoice, leastRank:v.leastChoice
      }])),
      top10: top, bottom10: bottom,
      submitted: true, submittedAt: serverTimestamp(), lastUpdated: serverTimestamp()
    }, { merge:true });
    setSubmitted(true);
    alert("Preferences submitted. Downloads now reflect your final locked choices.");
  };

  const downloadMyCSV = ()=>{
    const { top, bottom } = assembleTopBottom();
    const rows = [
      ...top.map(t=>({ attendee:profile.name, email:profile.email||"", kind:"MOST",  choice:t.choice, service:t.service, weekend:t.weekend })),
      ...bottom.map(b=>({ attendee:profile.name, email:profile.email||"", kind:"LEAST", choice:b.choice, service:b.service, weekend:b.weekend })),
    ];
    downloadCSV((submitted? "preferences_":"preferences_preview_") + (profile.name||"attending") + ".csv", rows);
  };
  const downloadMyWord = ()=>{
    const { top, bottom } = assembleTopBottom();
    downloadBlob((submitted? "preferences_":"preferences_preview_") + (profile.name||"attending") + ".doc",
      "application/msword", docHtml(profile.name, profile.email, top, bottom));
  };

  // Jump helpers for palette
  const jumpTo = (mk)=>{
    const el = document.getElementById(`month-${mk}`);
    if (el) el.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  // Command palette hotkey
  const [palette, setPalette] = useState(false);
  useEffect(()=>{
    const onK = (e)=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); setPalette(v=>!v); } };
    window.addEventListener("keydown", onK); return ()=>window.removeEventListener("keydown", onK);
  },[]);

  // Admin CSV (unchanged behavior)
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  useEffect(()=>{ if(isAdmin && uid && !adminLoaded){ (async ()=>{
    const qy = query(collectionGroup(db,"preferences")); const snap = await getDocs(qy);
    const rows=[]; snap.forEach(d=>{ const data=d.data(); if(!data||!data.top10||!data.bottom10) return;
      const attendee=data.name||"(unknown)"; const em=data.email||"";
      const pull = (x)=> x.choice ?? x.rank;
      data.top10.forEach(t=>rows.push({attendee,email:em,kind:"MOST", choice:pull(t), service:t.service, weekend:t.weekend}));
      data.bottom10.forEach(b=>rows.push({attendee,email:em,kind:"LEAST",choice:pull(b), service:b.service||"", weekend:b.weekend}));
    });
    rows.sort((a,b)=> (a.attendee||"").localeCompare(b.attendee||"") || a.kind.localeCompare(b.kind) || (a.choice-b.choice));
    setAdminRows(rows); setAdminLoaded(true);
  })().catch(console.error); } }, [isAdmin, uid, adminLoaded]);

  const collapseAll = (val)=> setCollapsed(Object.fromEntries(MONTH_KEYS.map(k=>[k,val])));

  /* UI switcher header (centered page) */
  const uiLinks = [
    { key:"cal",  label:"Calendar" },
    { key:"drag", label:"DragBuckets" },
    { key:"quick",label:"QuickAdd" },
    { key:"rank", label:"RankBoard" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontSize:15 }}>
      {/* Sticky top controls */}
      <div style={{ position:"sticky", top:0, zIndex:50, background:"#ffffffcc", backdropFilter:"saturate(180%) blur(4px)", borderBottom:"1px solid #e5e7eb" }}>
        <div style={{ ...container, padding:"8px 12px", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <strong style={{ marginRight:4 }}>Jump:</strong>
          {MONTH_KEYS.map((mk,i)=>(
            <a key={mk} href={`#month-${mk}`} onClick={(e)=>{e.preventDefault(); jumpTo(mk);}}
               style={{ padding:"6px 10px", borderRadius:999, border:"1px solid #e5e7eb", background:"#fff", fontSize:12 }}>
              {MONTH_FULL[i].slice(0,3)}
            </a>
          ))}
          <span style={{ marginLeft:8 }} />
          <button onClick={()=>collapseAll(true)}  style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"#fff", fontSize:12 }}>Collapse all</button>
          <button onClick={()=>collapseAll(false)} style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"#fff", fontSize:12 }}>Expand all</button>
          <button onClick={downloadMyCSV}  style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #059669", background:"#10b981", color:"#fff", fontSize:12 }}>Preview/My CSV</button>
          <button onClick={downloadMyWord} style={{ padding:"6px 10px", borderRadius:10, border:"1px solid #4f46e5", background:"#6366f1", color:"#fff", fontSize:12 }}>Preview/My Word</button>
          <FirebaseBadge ok={fbOK} />
          <span style={{ marginLeft:"auto" }} />
          {uiLinks.map(l=>(
            <a key={l.key}
               href={`?ui=${l.key}${isAdmin?"&admin=1":""}`}
               style={{
                 padding:"6px 10px", borderRadius:999, border:"1px solid #e5e7eb",
                 background: ui===l.key? "#e0f2fe":"#fff", color:"#0c4a6e", fontSize:12
               }}>
              {l.label}
            </a>
          ))}
          <button onClick={()=>setPalette(true)} title="Command Palette (Ctrl/⌘+K)"
            style={{ padding:"6px 10px", borderRadius:999, border:"1px solid #e5e7eb", background:"#fff", fontSize:12 }}>
            ⌘K
          </button>
        </div>
      </div>

      {/* Title + instructions (centered) */}
      <div style={{ ...container, padding:"16px 12px 0" }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">2026 Preferences (RNI & COA)</h1>
        <ol style={{ margin:"8px 0 12px", paddingLeft:20, color:"#334155", fontSize:14, lineHeight:1.45, listStyle:"decimal" }}>
          <li style={{ marginBottom:4 }}>Select your name below. You will see the number of weekends you wanted.</li>
          <li style={{ marginBottom:4 }}>Choose **Most** and **Least** preferred weekends; for each, select <b>service</b> and <b>choice #</b>. Services are enforced to available slots only; you cannot select both RNI and COA for the same bucket/weekend.</li>
          <li style={{ marginBottom:4 }}>You can download a preview anytime.</li>
          <li style={{ marginBottom:4 }}>Submit to lock your preferences once you are done.</li>
        </ol>
        <div style={{ fontSize:13, color:"#0f5132", background:"#d1e7dd", border:"1px solid #badbcc",
          padding:"10px 12px", borderRadius:10, marginBottom:10 }}>
          Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible. This is a <b>ranking</b> process; selecting more weekends increases the chance you receive more of your preferred weekends overall.
        </div>
        <div className="mb-3 text-sm text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-md p-3">
          Status: {status} • Most choices: {counts.most} • Least choices: {counts.least} {submitted ? "• (Locked after submission)" : ""}
        </div>

        {/* Identity */}
        <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
          <label style={{ fontSize:14, fontWeight:700 }}>Your name:</label>
          <select value={profile.name}
                  onChange={e=>setProfile(p=>({ ...p, name:e.target.value, email:(ATTENDINGS.find(a=>a.name===e.target.value)?.email||p.email) }))}
                  style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, minWidth:220, fontSize:14 }}>
            <option value="">— Select —</option>
            {ATTENDINGS.map(a=> <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>

          <label style={{ fontSize:14, fontWeight:700, marginLeft:8 }}>Email (optional):</label>
          <input type="email" value={profile.email} placeholder="you@uab.edu"
                 onChange={e=>setProfile(p=>({ ...p, email:e.target.value }))}
                 style={{ padding:"6px 10px", border:"1px solid #e5e7eb", borderRadius:8, minWidth:260, fontSize:14 }} />
        </div>

        {/* Attending limits summary */}
        {profile.name && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"10px 12px", marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{profile.name}</div>
            {ATTENDING_LIMITS[profile.name] ? (
              <>
                <div style={{ fontSize:13, color:"#334155" }}><b>Total weekends requested:</b> {ATTENDING_LIMITS[profile.name].requested}</div>
                <div style={{ fontSize:13, color:"#334155" }}><b>Assignments already claimed:</b> {ATTENDING_LIMITS[profile.name].claimed}</div>
                <div style={{ fontSize:13, color:"#334155" }}><b>Assignments left to be picked:</b> {ATTENDING_LIMITS[profile.name].left}</div>
              </>
            ) : <div style={{ fontSize:13, color:"#7c2d12", background:"#ffedd5", border:"1px solid #fed7aa", borderRadius:10, padding:"8px 10px" }}>
                  Target numbers for “{profile.name}” are not set yet.
                </div>}
          </div>
        )}
      </div>

      {/* Body: current UI + live preview sidebar */}
      <div style={{ ...container, display:"grid", gridTemplateColumns:"minmax(0,1fr) 320px", gap:16, alignItems:"start", paddingBottom:16 }}>
        <div>
          {ui==="drag"  && <DragBuckets  prefs={prefs} setMost={setMost} setLeast={setLeast} submitted={submitted} requireName={Boolean(profile?.name)} />}
          {ui==="quick" && <QuickAdd     prefs={prefs} setMost={setMost} setLeast={setLeast} submitted={submitted} requireName={Boolean(profile?.name)} />}
          {ui==="rank"  && <RankBoard    prefs={prefs} setMost={setMost} setLeast={setLeast} submitted={submitted} requireName={Boolean(profile?.name)} />}
          {ui==="cal"   && <CalendarGrid prefs={prefs} setMost={setMost} setLeast={setLeast} collapsed={collapsed} setCollapsed={setCollapsed} submitted={submitted} />}
        </div>
        <LivePreview prefs={prefs} profile={profile} />
      </div>

      {/* Submit */}
      <div style={{ ...container, padding:"0 12px 8px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
        <button
          className={`${profile.name && !submitted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-3 px-6 rounded-xl font-bold`}
          disabled={!profile.name || submitted}
          onClick={handleSubmit}
        >
          {submitted ? "Submitted (Locked)" : "Submit Final Preferences"}
        </button>
        <span className="text-sm text-gray-600">{submitted ? "Locked. Downloads reflect your final choices." : "Tip: use Preview CSV/Word above to save your current selections."}</span>
        {isAdmin && adminLoaded && (
          <button onClick={()=>downloadCSV("admin.csv", adminRows)}
                  style={{ marginLeft:"auto", padding:"6px 10px", borderRadius:10, border:"1px solid #e5e7eb", background:"#fff", fontSize:12 }}>
            Download admin.csv
          </button>
        )}
      </div>

      <div style={{ ...container, padding:"0 12px 24px", textAlign:"right", color:"#64748b", fontSize:12 }}>
        Build: {__APP_VERSION__}
      </div>

      <CommandPalette
        open={palette}
        onClose={()=>setPalette(false)}
        jumpTo={(mk)=>{ setCollapsed(c=>({ ...c, [mk]: false })); jumpTo(mk); }}
        exportCSV={downloadMyCSV}
        exportWord={downloadMyWord}
      />
    </div>
  );
}
