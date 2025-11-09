import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import './App.css';

/* ========= Firebase bootstrap (fallback-safe) ========= */
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp,
  collection, collectionGroup, getDocs, query
} from 'firebase/firestore';

/* Build tag */
const __APP_VERSION__ = "v14.0 unified-modes + centered + palette";

/* Firebase config: injected → window fallback → local */
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
  try { if (typeof __firebase_config !== 'undefined' && __firebase_config) return JSON.parse(__firebase_config); } catch {}
  if (typeof window !== 'undefined' && window.FALLBACK_FIREBASE_CONFIG) return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();

const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v14";
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ========= Domain data ========= */

/* Attendings (with email) */
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

/* Target counts UI blurb */
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

const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* Saturdays list (with existing assignments) — month.day display, year kept in id only */
const months = {
  '01': [
    { day: '10',    id: '2026-01-10', rni: null, coa: null },
    { day: '17-19', id: '2026-01-17', rni: null, coa: null, detail: 'MLK Day' },
    { day: '24',    id: '2026-01-24', rni: null, coa: null },
    { day: '31',    id: '2026-01-31', rni: null, coa: null },
  ],
  '02': [
    { day: '7',  id: '2026-02-07', rni: 'Boone',  coa: null },
    { day: '14', id: '2026-02-14', rni: 'Boone',  coa: null },
    { day: '21', id: '2026-02-21', rni: 'Willis', coa: null },
    { day: '28', id: '2026-02-28', rni: 'Willis', coa: null },
  ],
  '03': [
    { day: '7',  id: '2026-03-07', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { day: '14', id: '2026-03-14', rni: null,     coa: 'Winter' },
    { day: '21', id: '2026-03-21', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { day: '28', id: '2026-03-28', rni: null,     coa: 'Arora' },
  ],
  '04': [
    { day: '4',  id: '2026-04-04', rni: 'Sims', coa: null },
    { day: '11', id: '2026-04-11', rni: null,   coa: null },
    { day: '18', id: '2026-04-18', rni: 'Sims', coa: null },
    { day: '25', id: '2026-04-25', rni: null,   coa: null, detail: 'PAS Meeting Coverage' },
  ],
  '05': [
    { day: '2',   id: '2026-05-02', rni: null,    coa: null },
    { day: '9',   id: '2026-05-09', rni: 'Arora', coa: null },
    { day: '16',  id: '2026-05-16', rni: 'Arora', coa: null },
    { day: '23-25', id: '2026-05-23', rni: null,  coa: null, detail: 'Memorial Day' },
    { day: '30',  id: '2026-05-30', rni: 'Arora', coa: null },
  ],
  '06': [
    { day: '6',    id: '2026-06-06', rni: 'Schuyler', coa: 'Winter', isTaken: true },
    { day: '13',   id: '2026-06-13', rni: 'Boone',    coa: null },
    { day: '19-21',id: '2026-06-19', rni: 'Schuyler', coa: 'Winter', isTaken: true, detail: 'Juneteenth Day' },
    { day: '27',   id: '2026-06-27', rni: 'Boone',    coa: null },
  ],
  '07': [
    { day: '4-6', id: '2026-07-04', rni: 'Jain',    coa: 'Carlo',  isTaken: true, detail: '4th of July' },
    { day: '11',  id: '2026-07-11', rni: null,      coa: 'Willis' },
    { day: '18',  id: '2026-07-18', rni: null,      coa: null },
    { day: '25',  id: '2026-07-25', rni: 'Shukla',  coa: 'Willis', isTaken: true },
  ],
  '08': [
    { day: '1',  id: '2026-08-01', rni: 'Boone',  coa: null },
    { day: '8',  id: '2026-08-08', rni: 'Sims',   coa: 'Carlo', isTaken: true },
    { day: '15', id: '2026-08-15', rni: 'Boone',  coa: null },
    { day: '22', id: '2026-08-22', rni: 'Sims',   coa: null },
    { day: '29', id: '2026-08-29', rni: null,     coa: 'Carlo' },
  ],
  '09': [
    { day: '5-7', id: '2026-09-05', rni: 'Mackay', coa: null, detail: 'Labor Day' },
    { day: '12',  id: '2026-09-12', rni: null,     coa: null },
    { day: '19',  id: '2026-09-19', rni: null,     coa: null },
    { day: '26',  id: '2026-09-26', rni: null,     coa: null },
  ],
  '10': [
    { day: '3',  id: '2026-10-03', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
    { day: '10', id: '2026-10-10', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { day: '17', id: '2026-10-17', rni: 'Kandasamy', coa: null },
    { day: '24', id: '2026-10-24', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { day: '31', id: '2026-10-31', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
  ],
  '11': [
    { day: '7',  id: '2026-11-07', rni: 'Ambal',  coa: null },
    { day: '14', id: '2026-11-14', rni: 'Bhatia', coa: null },
    { day: '21', id: '2026-11-21', rni: 'Ambal',  coa: null },
    { day: '26-28', id: '2026-11-26', rni: 'Bhatia', coa: null, detail: 'Thanksgiving' },
  ],
  '12': [
    { day: '5',        id: '2026-12-05', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { day: '12',       id: '2026-12-12', rni: null,        coa: null },
    { day: '19',       id: '2026-12-19', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { day: '24-28',    id: '2026-12-24', rni: 'Bhatia',    coa: 'Arora',     isTaken: true, detail: 'Christmas' },
    { day: '31–Jan 4', id: '2026-12-31', rni: 'Kane',      coa: 'Kandasamy', isTaken: true, detail: "New Year's Eve" },
  ],
};

const allWeekendIds = Object.values(months).flat().map(w => w.id);

const availabilityByWeekend = (() => {
  const m = {};
  for (const arr of Object.values(months)) {
    for (const w of arr) {
      const a = [];
      if (w.rni === null) a.push(SERVICES.RNI);
      if (w.coa === null) a.push(SERVICES.COA);
      m[w.id] = a;
    }
  }
  return m;
})();

/* ========= Utilities ========= */

const MONTH_MIN_HEIGHT = 520;

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
  });
  return base;
}
const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });

function toCSV(rows) {
  const headers = Object.keys(rows[0] || {});
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
  return [headers.join(','), body].join('\n');
}
function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function downloadCSV(filename, rows) {
  if (!rows.length) { alert('Nothing to export.'); return; }
  downloadBlob(filename, 'text/csv;charset=utf-8;', toCSV(rows));
}
function docHtml(name, email, top, bottom) {
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const row = (kind, r) => `
    <tr>
      <td>${esc(kind)}</td>
      <td>${esc(r.choice)}</td>
      <td>${esc(r.service || '')}</td>
      <td>${esc(r.label)}</td>
    </tr>`;
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>Preferences</title></head>
  <body>
    <h2>2026 Weekend Preferences</h2>
    <p><b>Name:</b> ${esc(name || '')} &nbsp; <b>Email:</b> ${esc(email || '')}</p>
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead style="background:#f3f4f6">
        <tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Sat)</th></tr>
      </thead>
      <tbody>
        ${top.map(r => row('MOST', r)).join('')}
        ${bottom.map(r => row('LEAST', r)).join('')}
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
  </body>
  </html>`;
}

/* Label helpers */
const labelFor = (id) => {
  // Convert id '2026-03-07' to 'March 7'
  const [, m, d] = id.split('-');
  const month = MONTH_FULL[parseInt(m, 10)-1];
  const day = d.startsWith('0') ? d.slice(1) : d;
  return `${month} ${day}`;
};

/* ========= Shared subcomponents ========= */

function AttendingIdentity({ profile, saveProfile }) {
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
      <label style={{ fontWeight:800 }}>Your name:</label>
      <select
        value={profile.name}
        onChange={e => saveProfile({
          ...profile,
          name: e.target.value,
          email: (ATTENDINGS.find(a => a.name === e.target.value)?.email || profile.email)
        })}
        style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:10, minWidth:220 }}
      >
        <option value="">— Select —</option>
        {ATTENDINGS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
      </select>

      <label style={{ fontWeight:800 }}>Email (optional):</label>
      <input
        type="email"
        value={profile.email}
        placeholder="you@uab.edu"
        onChange={e => saveProfile({ ...profile, email: e.target.value })}
        style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:10, minWidth:260 }}
      />

      {profile.name && (() => {
        const m = ATTENDING_LIMITS[profile.name];
        return m ? (
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'8px 12px' }}>
            <div style={{ fontWeight:800 }}>{profile.name}</div>
            <div><b>Requested:</b> {m.requested}</div>
            <div><b>Claimed:</b> {m.claimed}</div>
            <div><b>Left:</b> {m.left}</div>
          </div>
        ) : null;
      })()}
    </div>
  );
}

function LivePreview({ prefs }) {
  const most = [];
  const least = [];
  for (const [id, p] of Object.entries(prefs)) {
    if (p.mostService !== SERVICES.NONE && p.mostChoice > 0)
      most.push({ id, label: labelFor(id), choice: p.mostChoice, service: p.mostService });
    if (p.leastService !== SERVICES.NONE && p.leastChoice > 0)
      least.push({ id, label: labelFor(id), choice: p.leastChoice, service: p.leastService });
  }
  most.sort((a,b)=>a.choice-b.choice);
  least.sort((a,b)=>a.choice-b.choice);

  return (
    <div className="card preview" style={{ padding:12 }}>
      <div className="h2">Live preview</div>
      <div style={{ fontSize:12, color:'#475569', marginBottom:6 }}>Updates as you make choices in any mode.</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:6 }}>
        <div>
          <div style={{ fontWeight:800, marginBottom:4 }}>Most</div>
          {most.length===0 ? <div className="chip">None</div> :
            most.map(r => (
              <div key={`m-${r.id}`} className="draggable" style={{ display:'flex', justifyContent:'space-between' }}>
                <span>#{r.choice} — {r.label}</span><span className="chip">{r.service}</span>
              </div>
            ))
          }
        </div>
        <div>
          <div style={{ fontWeight:800, marginTop:8, marginBottom:4 }}>Least</div>
          {least.length===0 ? <div className="chip">None</div> :
            least.map(r => (
              <div key={`l-${r.id}`} className="draggable" style={{ display:'flex', justifyContent:'space-between' }}>
                <span>#{r.choice} — {r.label}</span><span className="chip">{r.service}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* Choice widgets */
function ChoiceSelect({ value, onChange, disabled, placeholder, maxN }) {
  const MAX = Math.max(10, maxN || 10);
  return (
    <select
      disabled={disabled}
      value={String(value || 0)}
      onChange={e => onChange(parseInt(e.target.value, 10))}
      style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13 }}
    >
      <option value="0">{placeholder}</option>
      {Array.from({ length: MAX }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}
function RadioServiceLimited({ available, value, onChange, disabled, name }) {
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
      {available.includes(SERVICES.RNI) && (
        <label style={{ display:'flex', alignItems:'center', gap:4 }}>
          <input type="radio" disabled={disabled} checked={value === SERVICES.RNI} onChange={() => onChange(SERVICES.RNI)} name={name} />
          RNI
        </label>
      )}
      {available.includes(SERVICES.COA) && (
        <label style={{ display:'flex', alignItems:'center', gap:4 }}>
          <input type="radio" disabled={disabled} checked={value === SERVICES.COA} onChange={() => onChange(SERVICES.COA)} name={name} />
          COA
        </label>
      )}
    </div>
  );
}

/* ========= Modes ========= */

/* Calendar Mode (months collapsed, Month day labels) */
function CalendarMode({ prefs, setMost, setLeast, submitted, collapsed, setCollapsed }) {
  return (
    <div className="month-grid">
      {MONTH_KEYS.map((mk, i) => {
        const items = months[mk];
        const label = `${MONTH_FULL[i]} ${YEAR}`;
        return (
          <div key={mk} id={`month-${mk}`} className="card" style={{ overflow:'hidden' }}>
            <button
              onClick={() => setCollapsed(c => ({ ...c, [mk]: !c[mk] }))}
              style={{ width:'100%', background:'#f1f5f9', borderBottom:'2px solid #e2e8f0', fontWeight:900, fontSize:16, padding:'12px 14px', cursor:'pointer' }}
              title="Collapse/expand"
            >
              {label} <span style={{ fontWeight:900, marginLeft:6 }}>{collapsed[mk] ? '▸' : '▾'}</span>
            </button>

            {!collapsed[mk] && (
              <div style={{ padding:12, display:'flex', flexDirection:'column', gap:12, minHeight: MONTH_MIN_HEIGHT }}>
                {items.map(w => {
                  const p = prefs[w.id];
                  const rniOpen = w.rni === null;
                  const coaOpen = w.coa === null;
                  const fullyAssigned = w.isTaken || (!rniOpen && !coaOpen);
                  const available = [];
                  if (rniOpen) available.push(SERVICES.RNI);
                  if (coaOpen) available.push(SERVICES.COA);

                  return (
                    <div key={w.id} style={{ padding:12, borderRadius:12, border:'1px solid #e5e7eb', background: fullyAssigned ? '#f9fafb' : '#fff', opacity: fullyAssigned ? 0.85 : 1 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div style={{ fontSize:18, fontWeight:900 }}>{MONTH_FULL[parseInt(mk,10)-1]} {w.day}</div>
                        {w.detail && <div style={chip('#fff7ed', '#c2410c')}>{w.detail}</div>}
                      </div>
                      <div style={{ fontSize:13, color:'#334155', marginBottom:8 }}>
                        <span className="chip" style={{ background: rniOpen?'#dbeafe':'#e5e7eb', borderColor:'#bfdbfe', marginRight:8 }}>
                          RNI: {rniOpen ? 'OPEN' : <strong style={{ fontSize:15 }}>{w.rni}</strong>}
                        </span>
                        <span className="chip" style={{ background: coaOpen?'#e0e7ff':'#e5e7eb', borderColor:'#c7d2fe' }}>
                          COA: {coaOpen ? 'OPEN' : <strong style={{ fontSize:15 }}>{w.coa}</strong>}
                        </span>
                      </div>

                      {!fullyAssigned ? (
                        <div style={{ display:'grid', gap:10, opacity: submitted ? 0.6 : 1, pointerEvents: submitted ? 'none' : 'auto' }}>
                          <div className="card" style={{ padding:8 }}>
                            <div className="h2">Most (service + choice)</div>
                            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12 }}>
                              <RadioServiceLimited
                                available={available}
                                disabled={submitted}
                                value={available.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                                onChange={(svc) => setMost(w.id, { ...p, mostService: svc })}
                                name={`most-${w.id}`}
                              />
                              <ChoiceSelect
                                disabled={submitted || available.length===0 || p.mostService===SERVICES.NONE}
                                value={p.mostChoice || 0}
                                onChange={(choice) => setMost(w.id, { ...p, mostChoice: choice })}
                                placeholder="Most choice…"
                                maxN={allWeekendIds.length}
                              />
                              {p.mostService !== SERVICES.NONE && p.mostChoice > 0 && (
                                <span className="chip" style={{ background:'#d1fae5', borderColor:'#a7f3d0' }}>Most #{p.mostChoice}</span>
                              )}
                            </div>
                          </div>

                          <div className="card" style={{ padding:8 }}>
                            <div className="h2">Least (service + choice)</div>
                            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12 }}>
                              <RadioServiceLimited
                                available={available}
                                disabled={submitted}
                                value={available.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                                onChange={(svc) => setLeast(w.id, { ...p, leastService: svc })}
                                name={`least-${w.id}`}
                              />
                              <ChoiceSelect
                                disabled={submitted || available.length===0 || p.leastService===SERVICES.NONE}
                                value={p.leastChoice || 0}
                                onChange={(choice) => setLeast(w.id, { ...p, leastChoice: choice })}
                                placeholder="Least choice…"
                                maxN={allWeekendIds.length}
                              />
                              {p.leastService !== SERVICES.NONE && p.leastChoice > 0 && (
                                <span className="chip" style={{ background:'#ffe4e6', borderColor:'#fecdd3' }}>Least #{p.leastChoice}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize:12, fontWeight:800, color:'#991b1b', background:'#fee2e2', padding:8, borderRadius:8, textAlign:'center' }}>
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
      })}
    </div>
  );
}

/* QuickAdd Mode (list from January; tap to add) */
function QuickAddMode({ prefs, addMost, addLeast, submitted }) {
  return (
    <div className="card" style={{ padding:12 }}>
      <div className="h2" style={{ marginBottom:8 }}>QuickAdd — click a service to add as next choice</div>
      <div className="cmd-help" style={{ marginBottom:8 }}>Starts at January; services disabled if not available for that date. Least requires a service too.</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(300px, 1fr))', gap:16 }}>
        {MONTH_KEYS.map(mk => (
          <div key={mk} className="card" style={{ padding:10 }}>
            <div className="h2">{MONTH_FULL[parseInt(mk,10)-1]}</div>
            <div style={{ display:'grid', gap:8 }}>
              {months[mk].map(w => {
                const avail = availabilityByWeekend[w.id];
                const label = `${MONTH_FULL[parseInt(mk,10)-1]} ${w.day}`;
                const mostNext = 1 + Object.values(prefs).filter(p=>p.mostChoice>0).length;
                const leastNext = 1 + Object.values(prefs).filter(p=>p.leastChoice>0).length;
                return (
                  <div key={w.id} className="card" style={{ padding:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div><b>{label}</b></div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn" disabled>Most →</button>
                        <button
                          className="btn"
                          disabled={submitted || !avail.includes(SERVICES.RNI)}
                          onClick={() => addMost(w.id, SERVICES.RNI, mostNext)}
                        >RNI</button>
                        <button
                          className="btn"
                          disabled={submitted || !avail.includes(SERVICES.COA)}
                          onClick={() => addMost(w.id, SERVICES.COA, mostNext)}
                        >COA</button>
                      </div>
                    </div>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:6, marginTop:6 }}>
                      <button className="btn" disabled>Least →</button>
                      <button
                        className="btn"
                        disabled={submitted || !avail.includes(SERVICES.RNI)}
                        onClick={() => addLeast(w.id, SERVICES.RNI, leastNext)}
                      >RNI</button>
                      <button
                        className="btn"
                        disabled={submitted || !avail.includes(SERVICES.COA)}
                        onClick={() => addLeast(w.id, SERVICES.COA, leastNext)}
                      >COA</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* RankBoard Mode (clickable lists; shift+click for Least is now explicit buttons) */
function RankBoardMode({ prefs, setMostOrder, setLeastOrder, removeMost, removeLeast, submitted }) {
  const mostList = Object.entries(prefs)
    .filter(([,p]) => p.mostService !== SERVICES.NONE && p.mostChoice > 0)
    .map(([id,p]) => ({ id, label: labelFor(id), service: p.mostService, choice: p.mostChoice }))
    .sort((a,b)=>a.choice-b.choice);
  const leastList = Object.entries(prefs)
    .filter(([,p]) => p.leastService !== SERVICES.NONE && p.leastChoice > 0)
    .map(([id,p]) => ({ id, label: labelFor(id), service: p.leastService, choice: p.leastChoice }))
    .sort((a,b)=>a.choice-b.choice);

  const up = (list, setter, idx) => {
    if (idx<=0) return;
    const a = list.slice(); [a[idx-1], a[idx]] = [a[idx], a[idx-1]];
    setter(a.map((v,i)=>({ ...v, choice: i+1 })));
  };
  const down = (list, setter, idx) => {
    if (idx>=list.length-1) return;
    const a = list.slice(); [a[idx+1], a[idx]] = [a[idx], a[idx+1]];
    setter(a.map((v,i)=>({ ...v, choice: i+1 })));
  };

  return (
    <div className="card" style={{ padding:12 }}>
      <div className="h2" style={{ marginBottom:8 }}>RankBoard — reorder with arrows; remove to re-pick in other modes</div>
      <div className="cmd-help" style={{ marginBottom:8 }}>Use ▲/▼ to change rank. Removing recomputes ranks automatically.</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="card" style={{ padding:10 }}>
          <div className="h2">Most</div>
          {mostList.length===0 ? <div className="chip">No Most choices yet</div> :
            mostList.map((r, i)=>(
              <div key={`rm-${r.id}`} className="draggable" style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', alignItems:'center', gap:6 }}>
                <div><b>#{r.choice}</b> — {r.label} <span className="chip">{r.service}</span></div>
                <button className="btn" disabled={submitted} onClick={()=>up(mostList, setMostOrder, i)}>▲</button>
                <button className="btn" disabled={submitted} onClick={()=>down(mostList, setMostOrder, i)}>▼</button>
                <button className="btn" disabled={submitted} onClick={()=>removeMost(r.id)}>✕</button>
              </div>
            ))
          }
        </div>
        <div className="card" style={{ padding:10 }}>
          <div className="h2">Least</div>
          {leastList.length===0 ? <div className="chip">No Least choices yet</div> :
            leastList.map((r, i)=>(
              <div key={`rl-${r.id}`} className="draggable" style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', alignItems:'center', gap:6 }}>
                <div><b>#{r.choice}</b> — {r.label} <span className="chip">{r.service}</span></div>
                <button className="btn" disabled={submitted} onClick={()=>up(leastList, setLeastOrder, i)}>▲</button>
                <button className="btn" disabled={submitted} onClick={()=>down(leastList, setLeastOrder, i)}>▼</button>
                <button className="btn" disabled={submitted} onClick={()=>removeLeast(r.id)}>✕</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* DragBuckets Mode — fixed: pool grouped by month horizontally; Most/Least start empty; ranks recompute */
function DragBucketsMode({ prefs, setPrefs, submitted }) {
  // Build pool tokens from availability; exclude already-chosen combos
  const chosen = new Set();
  for (const [id,p] of Object.entries(prefs)) {
    if (p.mostService !== SERVICES.NONE) chosen.add(`${id}|${p.mostService}`);
    if (p.leastService !== SERVICES.NONE) chosen.add(`${id}|${p.leastService}`);
  }
  const poolByMonth = MONTH_KEYS.map(mk => {
    const items = [];
    for (const w of months[mk]) {
      const avail = availabilityByWeekend[w.id];
      avail.forEach(svc => {
        const key = `${w.id}|${svc}`;
        if (!chosen.has(key)) {
          items.push({ key, id: w.id, svc, label: `${MONTH_FULL[parseInt(mk,10)-1]} ${w.day}`, monthKey: mk });
        }
      });
    }
    return { mk, label: MONTH_FULL[parseInt(mk,10)-1], items };
  });

  const mostList = Object.entries(prefs)
    .filter(([,p]) => p.mostService !== SERVICES.NONE && p.mostChoice > 0)
    .map(([id,p]) => ({ key:`${id}|${p.mostService}`, id, svc:p.mostService, label: labelFor(id), choice: p.mostChoice }))
    .sort((a,b)=>a.choice-b.choice);

  const leastList = Object.entries(prefs)
    .filter(([,p]) => p.leastService !== SERVICES.NONE && p.leastChoice > 0)
    .map(([id,p]) => ({ key:`${id}|${p.leastService}`, id, svc:p.leastService, label: labelFor(id), choice: p.leastChoice }))
    .sort((a,b)=>a.choice-b.choice);

  // DnD
  const dzMost = useRef(null);
  const dzLeast = useRef(null);
  const onDragStart = (e, payload) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
  };
  const attachDZ = (ref, onDrop) => {
    if (!ref.current) return;
    const el = ref.current;
    const enter = (ev) => { ev.preventDefault(); el.classList.add('dragover'); };
    const over  = (ev) => { ev.preventDefault(); };
    const leave = ()   => el.classList.remove('dragover');
    const drop  = (ev) => {
      ev.preventDefault();
      el.classList.remove('dragover');
      try { onDrop(JSON.parse(ev.dataTransfer.getData('text/plain'))); } catch {}
    };
    el.addEventListener('dragenter', enter);
    el.addEventListener('dragover',  over);
    el.addEventListener('dragleave', leave);
    el.addEventListener('drop',      drop);
    return () => {
      el.removeEventListener('dragenter', enter);
      el.removeEventListener('dragover',  over);
      el.removeEventListener('dragleave', leave);
      el.removeEventListener('drop',      drop);
    };
  };
  useEffect(()=>attachDZ(dzMost, ({ id, svc }) => {
    setPrefs(p => {
      const next = { ...p };
      // Prevent double-service for same day: overwrite existing service if any
      next[id] = { ...(next[id] || {}) , mostService: svc, mostChoice: 0 };
      // recompute sequential choices
      const sorted = Object.entries(next)
        .filter(([,v])=>v.mostService!==SERVICES.NONE)
        .map(([i,v])=>({ i, svc:v.mostService }))
        .sort((a,b)=>allWeekendIds.indexOf(a.i)-allWeekendIds.indexOf(b.i));
      sorted.forEach((rec, idx)=>{ next[rec.i].mostChoice = idx+1; });
      return next;
    });
  }), [setPrefs]);

  useEffect(()=>attachDZ(dzLeast, ({ id, svc }) => {
    setPrefs(p => {
      const next = { ...p };
      next[id] = { ...(next[id] || {}) , leastService: svc, leastChoice: 0 };
      const sorted = Object.entries(next)
        .filter(([,v])=>v.leastService!==SERVICES.NONE)
        .map(([i,v])=>({ i, svc:v.leastService }))
        .sort((a,b)=>allWeekendIds.indexOf(a.i)-allWeekendIds.indexOf(b.i));
      sorted.forEach((rec, idx)=>{ next[rec.i].leastChoice = idx+1; });
      return next;
    });
  }), [setPrefs]);

  const removeFrom = (kind, id) => {
    setPrefs(p => {
      const next = { ...p };
      if (kind==='most') { next[id].mostService = SERVICES.NONE; next[id].mostChoice = 0; }
      if (kind==='least'){ next[id].leastService = SERVICES.NONE; next[id].leastChoice = 0; }
      // recompute compact ranks
      const fix = (fieldS, fieldC) => {
        const arr = Object.entries(next).filter(([,v])=>v[fieldS]!==SERVICES.NONE)
          .sort((a,b)=>allWeekendIds.indexOf(a[0]) - allWeekendIds.indexOf(b[0]));
        arr.forEach(([i], idx)=>{ next[i][fieldC] = idx+1; });
      };
      fix('mostService','mostChoice');
      fix('leastService','leastChoice');
      return next;
    });
  };

  return (
    <div className="dbkt-shell">
      {/* Pool: horizontally grouped by month */}
      <div className="card" style={{ padding:12 }}>
        <div className="h2">Drag from pool →</div>
        <div className="cmd-help" style={{ marginBottom:8 }}>Only open services appear. Drag a pill into Most or Least.</div>
        <div style={{ display:'grid', gap:10 }}>
          {poolByMonth.map(m => (
            <div key={m.mk} className="pool-month">
              <div style={{ fontWeight:800, marginBottom:6 }}>{m.label}</div>
              <div className="pool-row">
                {m.items.length===0 ? <div className="chip">No open services</div> :
                  m.items.map(item => (
                    <div key={item.key}
                         className="draggable"
                         draggable={!submitted}
                         onDragStart={(e)=>onDragStart(e, { id:item.id, svc:item.svc })}
                    >
                      {item.label} <span className="chip" style={{ marginLeft:6 }}>{item.svc}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most drop */}
      <div className="card" style={{ padding:12 }}>
        <div className="h2">Most</div>
        <div ref={dzMost} className="dropzone" style={{ pointerEvents: submitted ? 'none' : 'auto', opacity: submitted ? .6 : 1 }}>
          {mostList.length===0 ? <div className="chip">Drop items here</div> :
            mostList.map((r)=>(
              <div key={r.key} className="draggable" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div><b>#{r.choice}</b> — {r.label} <span className="chip" style={{ marginLeft:6 }}>{r.svc}</span></div>
                <button className="btn" onClick={()=>removeFrom('most', r.id)} disabled={submitted}>✕</button>
              </div>
            ))
          }
        </div>
      </div>

      {/* Least drop */}
      <div className="card" style={{ padding:12 }}>
        <div className="h2">Least</div>
        <div ref={dzLeast} className="dropzone" style={{ pointerEvents: submitted ? 'none' : 'auto', opacity: submitted ? .6 : 1 }}>
          {leastList.length===0 ? <div className="chip">Drop items here</div> :
            leastList.map((r)=>(
              <div key={r.key} className="draggable" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div><b>#{r.choice}</b> — {r.label} <span className="chip" style={{ marginLeft:6 }}>{r.svc}</span></div>
                <button className="btn" onClick={()=>removeFrom('least', r.id)} disabled={submitted}>✕</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* Command Palette — parse "Jun 3 RNI M 1" */
function CommandPalette({ exec, submitted }) {
  const [cmd, setCmd] = useState('');
  const monthsMap = Object.fromEntries(MONTH_FULL.map((m,i)=>[m.toLowerCase(), i+1]));
  const abbrMap = Object.fromEntries(MONTH_FULL.map((m,i)=>[m.slice(0,3).toLowerCase(), i+1]));

  const parse = (txt) => {
    // Format: Mon 3 RNI M 1  OR  June 3 COA L 2
    const t = txt.trim().replace(/\s+/g,' ').split(' ');
    if (t.length < 4) return null;
    const monTok = t[0].toLowerCase();
    const mNum = monthsMap[monTok] || abbrMap[monTok];
    if (!mNum) return null;
    const day = t[1].replace(/\D/g,'');
    const svc = t[2].toUpperCase();
    const kindTok = t[3].toUpperCase(); // M or L
    const rank = t[4] ? parseInt(t[4],10) : undefined;
    if (!day || ![SERVICES.RNI, SERVICES.COA].includes(svc)) return null;
    const kind = (kindTok==='M') ? 'most' : (kindTok==='L' ? 'least' : null);
    if (!kind) return null;
    // find the id matching month + includes that day token (supports 17-19 etc.)
    const mk = String(mNum).padStart(2,'0');
    const slot = months[mk].find(w => (w.day+'').includes(day));
    if (!slot) return null;
    return { id: slot.id, svc, kind, rank };
  };

  const onExec = () => {
    const p = parse(cmd);
    if (!p) { alert('Example: "Jun 3 RNI M 1"'); return; }
    exec(p);
    setCmd('');
  };

  return (
    <div className="card" style={{ padding:12, marginTop:12 }}>
      <div className="h2">Command palette</div>
      <div className="cmd-help" style={{ marginBottom:8 }}>
        Type like: <code>Jun 3 RNI M 1</code> or <code>August 22 COA L 2</code>. Month day SERVICE (RNI/COA) kind (M/L) rank#.
      </div>
      <div className="cmd-box">
        <input className="cmd-input" value={cmd} onChange={e=>setCmd(e.target.value)} placeholder="e.g., Jun 3 RNI M 1" disabled={submitted}/>
        <button className="btn btn-primary" onClick={onExec} disabled={submitted || !cmd.trim()}>Add</button>
      </div>
    </div>
  );
}

/* ========= App ========= */

export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [firebaseOk, setFirebaseOk] = useState(false);

  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  // months collapsed by default
  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));

  // which UI
  const params = new URLSearchParams(window.location.search);
  const initialUI = params.get('ui') || 'calendar';
  const [ui, setUI] = useState(initialUI);

  // Auth
  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, async (u) => {
          if (u) setUid(u.uid);
          setStatus('Loading profile & preferences…');
          try {
            // test read to show Connected ✓
            await getDoc(doc(db, '_ping', 'ok'));
            setFirebaseOk(true);
          } catch {
            setFirebaseOk(false);
          }
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
      }
    })();
  }, []);

  const profileDocRef = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'profile'), 'current');
  const prefsDocRef   = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'preferences'), 'calendar-preferences');

  // Load persisted
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const [proSnap, prefSnap] = await Promise.all([getDoc(profileDocRef(uid)), getDoc(prefsDocRef(uid))]);
        if (proSnap.exists()) {
          const d = proSnap.data();
          setProfile({ name: d.name || '', email: d.email || '' });
        }
        if (prefSnap.exists()) {
          const d = prefSnap.data();
          setSubmitted(Boolean(d.submitted));
          if (d.preferences) {
            const remapped = {};
            for (const [k, v] of Object.entries(d.preferences || {})) {
              remapped[k] = {
                mostService: v.mostService ?? SERVICES.NONE,
                mostChoice:  (v.mostChoice ?? v.mostRank ?? 0),
                leastService:(v.leastService ?? SERVICES.NONE),
                leastChoice: (v.leastChoice ?? v.leastRank ?? 0),
              };
            }
            setPrefs({ ...initEmptyPrefs(), ...remapped });
          }
        }
        setStatus('Ready.');
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
      }
    })();
  }, [uid]);

  // One-time autofill service if only single available
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

  /* —— Shared setters enforcing “no double service per kind” —— */
  const setMost = (id, v) => {
    setPrefs(prev => {
      const p = prev[id] || {};
      const next = { ...prev, [id]: { ...p, mostService: v.mostService, mostChoice: v.mostChoice } };
      return next;
    });
  };
  const setLeast = (id, v) => {
    setPrefs(prev => {
      const p = prev[id] || {};
      const next = { ...prev, [id]: { ...p, leastService: v.leastService, leastChoice: v.leastChoice } };
      return next;
    });
  };

  // QuickAdd helpers
  const addMost = (id, svc, choice) => {
    setPrefs(prev => {
      const next = { ...prev };
      next[id] = { ...(next[id]||{}), mostService: svc, mostChoice: 0 };
      // recompute compact ranks
      const arr = Object.entries(next)
        .filter(([,v])=>v.mostService!==SERVICES.NONE)
        .sort((a,b)=>allWeekendIds.indexOf(a[0]) - allWeekendIds.indexOf(b[0]));
      arr.forEach(([i], idx)=>{ next[i].mostChoice = idx+1; });
      return next;
    });
  };
  const addLeast = (id, svc, choice) => {
    setPrefs(prev => {
      const next = { ...prev };
      next[id] = { ...(next[id]||{}), leastService: svc, leastChoice: 0 };
      const arr = Object.entries(next)
        .filter(([,v])=>v.leastService!==SERVICES.NONE)
        .sort((a,b)=>allWeekendIds.indexOf(a[0]) - allWeekendIds.indexOf(b[0]));
      arr.forEach(([i], idx)=>{ next[i].leastChoice = idx+1; });
      return next;
    });
  };

  // RankBoard helpers
  const setMostOrder = (ordered) => {
    setPrefs(prev => {
      const next = { ...prev };
      // clear all mostChoice to 0 then set according to ordered
      Object.keys(next).forEach(id => { if (next[id].mostService!==SERVICES.NONE) next[id].mostChoice = 0; });
      ordered.forEach((r,i)=>{ next[r.id].mostChoice = i+1; next[r.id].mostService = r.svc; });
      return next;
    });
  };
  const setLeastOrder = (ordered) => {
    setPrefs(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { if (next[id].leastService!==SERVICES.NONE) next[id].leastChoice = 0; });
      ordered.forEach((r,i)=>{ next[r.id].leastChoice = i+1; next[r.id].leastService = r.svc; });
      return next;
    });
  };
  const removeMost = (id) => {
    setPrefs(prev => {
      const next = { ...prev };
      next[id].mostService = SERVICES.NONE; next[id].mostChoice = 0;
      const arr = Object.entries(next)
        .filter(([,v])=>v.mostService!==SERVICES.NONE)
        .sort((a,b)=>allWeekendIds.indexOf(a[0]) - allWeekendIds.indexOf(b[0]));
      arr.forEach(([i], idx)=>{ next[i].mostChoice = idx+1; });
      return next;
    });
  };
  const removeLeast = (id) => {
    setPrefs(prev => {
      const next = { ...prev };
      next[id].leastService = SERVICES.NONE; next[id].leastChoice = 0;
      const arr = Object.entries(next)
        .filter(([,v])=>v.leastService!==SERVICES.NONE)
        .sort((a,b)=>allWeekendIds.indexOf(a[0]) - allWeekendIds.indexOf(b[0]));
      arr.forEach(([i], idx)=>{ next[i].leastChoice = idx+1; });
      return next;
    });
  };

  // Command palette exec
  const execCommand = ({ id, svc, kind, rank }) => {
    if (kind==='most') addMost(id, svc, rank);
    else addLeast(id, svc, rank);
  };

  // Counts
  const counts = useMemo(() => {
    let mostCount = 0, leastCount = 0;
    for (const p of Object.values(prefs)) {
      if (p.mostChoice > 0 && p.mostService !== SERVICES.NONE) mostCount++;
      if (p.leastChoice > 0 && p.leastService !== SERVICES.NONE) leastCount++;
    }
    return { mostCount, leastCount };
  }, [prefs]);

  // Save profile
  const saveProfile = async (next) => {
    setProfile(next);
    if (!uid) return;
    await setDoc(profileDocRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  };

  // Assemble rows for export/doc
  const assembleRows = useCallback(() => {
    const orderIdx = id => allWeekendIds.indexOf(id);
    const top = [], bottom = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top.push({ weekend: id, label: labelFor(id), choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) bottom.push({ weekend: id, label: labelFor(id), choice: p.leastChoice, service: p.leastService });
    }
    top.sort((a,b)=>a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    bottom.sort((a,b)=>a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    return { top, bottom };
  }, [prefs]);

  // Submit
  const handleSubmit = async () => {
    if (!uid || !profile.name) { alert('Select your name first.'); return; }
    // enforce least must have service
    const badLeast = Object.values(prefs).some(p => p.leastChoice > 0 && p.leastService === SERVICES.NONE);
    if (badLeast) { alert('For every “Least” choice, please select a service (RNI or COA).'); return; }

    const { top, bottom } = assembleRows();
    await setDoc(prefsDocRef(uid), {
      name: profile.name,
      email: profile.email || '',
      preferences: Object.fromEntries(Object.entries(prefs).map(([k,v]) => [k, {
        mostService: v.mostService, mostChoice: v.mostChoice, mostRank: v.mostChoice,
        leastService: v.leastService, leastChoice: v.leastChoice, leastRank: v.leastChoice,
      }])),
      top10: top.map(t => ({ weekend: t.weekend, choice: t.choice, rank: t.choice, service: t.service })),
      bottom10: bottom.map(b => ({ weekend: b.weekend, choice: b.choice, rank: b.choice, service: b.service })),
      submitted: true,
      submittedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    setSubmitted(true);
    alert('Preferences submitted. Downloads now reflect your final locked choices.');
  };

  // Export buttons
  const downloadMyCSV = () => {
    const { top, bottom } = assembleRows();
    const rows = [
      ...top.map(t => ({ attendee: profile.name, email: profile.email || '', kind: 'MOST',  choice: t.choice, service: t.service, weekend: t.label })),
      ...bottom.map(b => ({ attendee: profile.name, email: profile.email || '', kind: 'LEAST', choice: b.choice, service: b.service, weekend: b.label })),
    ];
    const fn = submitted ? `preferences_${profile.name || 'attending'}.csv` : `preferences_preview_${profile.name || 'attending'}.csv`;
    downloadCSV(fn, rows);
  };
  const downloadMyWord = () => {
    const { top, bottom } = assembleRows();
    const html = docHtml(profile.name, profile.email, top, bottom);
    const fn = submitted ? `preferences_${profile.name || 'attending'}.doc` : `preferences_preview_${profile.name || 'attending'}.doc`;
    downloadBlob(fn, 'application/msword', html);
  };

  // Jump
  const jumpTo = (mk) => {
    setCollapsed(prev => {
      const next = { ...prev, [mk]: false };
      requestAnimationFrame(() => {
        const el = document.getElementById(`month-${mk}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return next;
    });
  };
  const collapseAll = val => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));

  // Mode instructions
  const ModeHelp = () => {
    const lines = {
      calendar: [
        'Click a month to expand, pick service + choice for Most/Least.',
        'Service is mandatory for both Most and Least; only available services are shown.',
      ],
      drag: [
        'Drag pills from the pool (left) into Most or Least; ranks recompute automatically.',
        'Remove an item to compact ranks.',
      ],
      quick: [
        'Use buttons to add the next Most/Least choice quickly; only open services appear.',
        'Rerank later in RankBoard if needed.',
      ],
      rank: [
        'Use ▲/▼ to change order. ✕ removes a selection and compacts ranks.',
      ],
    }[ui] || [];
    return (
      <ol style={{ margin:'8px 0 12px', paddingLeft:18, color:'#334155', lineHeight:1.45 }}>
        {lines.map((t,i)=>(<li key={i} style={{ marginBottom:4 }}>{t}</li>))}
      </ol>
    );
  };

  return (
    <div className="app-shell">
      {/* TOP BAR (single line, scrollable) */}
      <div className="topbar">
        <div className="container">
          <div className="row-nowrap" aria-label="top-controls">
            {/* Mode switch */}
            <div className="chip" style={{ fontWeight:800 }}>Mode:</div>
            <button className={`btn ${ui==='calendar'?'btn-primary':''}`} onClick={()=>setUI('calendar')}>Calendar</button>
            <button className={`btn ${ui==='drag'?'btn-primary':''}`} onClick={()=>setUI('drag')}>DragBuckets</button>
            <button className={`btn ${ui==='quick'?'btn-primary':''}`} onClick={()=>setUI('quick')}>QuickAdd</button>
            <button className={`btn ${ui==='rank'?'btn-primary':''}`} onClick={()=>setUI('rank')}>RankBoard</button>

            {/* Jump mini */}
            <div className="chip" style={{ marginLeft:8, fontWeight:800 }}>Jump:</div>
            {MONTH_KEYS.map((mk,i)=>(
              <button key={mk} className="btn" onClick={()=>jumpTo(mk)}>{MONTH_FULL[i].slice(0,3)}</button>
            ))}

            {/* Layout actions */}
            <button className="btn" onClick={()=>collapseAll(true)}>Collapse</button>
            <button className="btn" onClick={()=>collapseAll(false)}>Expand</button>

            {/* Export */}
            <button className="btn btn-green" onClick={downloadMyCSV}>Preview CSV</button>
            <button className="btn btn-indigo" onClick={downloadMyWord}>Preview Word</button>

            {/* Submit (prominent) */}
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!profile.name || submitted}>
              {submitted ? 'Submitted (Locked)' : 'Submit Preferences'}
            </button>

            {/* Firebase badge */}
            <span className="chip" style={{ marginLeft:8, borderColor: firebaseOk?'#86efac':'#fecaca', background: firebaseOk?'#dcfce7':'#fee2e2', color:'#111827' }}>
              Firebase: {firebaseOk ? 'Connected ✓' : 'Error'}
            </span>

            {/* Status */}
            <span className="chip">{status} • Most: {counts.mostCount} • Least: {counts.leastCount}</span>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="container section">
        <h1 className="h1">2026 Preferences (RNI & COA)</h1>
        <ol style={{ margin:'8px 0 12px', paddingLeft:20, color:'#334155', lineHeight:1.45, listStyle:'decimal' }}>
          <li>Select your name below. You will see the number of weekends you wanted.</li>
          <li>Use any mode (Calendar, Drag, QuickAdd, RankBoard) to select <b>Most</b> and <b>Least</b> preferences (service + choice).</li>
          <li>Aim for a balanced spread of COA and RNI on your “Most” list. Selecting more weekends increases your chances of preferred outcomes.</li>
          <li>Preview anytime; when ready, click <b>Submit Preferences</b> (locks your choices).</li>
        </ol>
        <AttendingIdentity profile={profile} saveProfile={saveProfile} />
        <ModeHelp />
      </div>

      {/* MAIN CONTENT + LIVE PREVIEW SIDEBAR */}
      <div className="container section" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16 }}>
        <div
          className="blocker"
          style={{ '--blocker-display': profile.name ? 'none' : 'grid' }}
        >
          {ui==='calendar' && (
            <CalendarMode
              prefs={prefs}
              setMost={(id,v)=>setMost(id,v)}
              setLeast={(id,v)=>setLeast(id,v)}
              submitted={submitted}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
            />
          )}
          {ui==='drag' && (
            <DragBucketsMode
              prefs={prefs}
              setPrefs={setPrefs}
              submitted={submitted}
            />
          )}
          {ui==='quick' && (
            <QuickAddMode
              prefs={prefs}
              addMost={addMost}
              addLeast={addLeast}
              submitted={submitted}
            />
          )}
          {ui==='rank' && (
            <RankBoardMode
              prefs={prefs}
              setMostOrder={setMostOrder}
              setLeastOrder={setLeastOrder}
              removeMost={removeMost}
              removeLeast={removeLeast}
              submitted={submitted}
            />
          )}

          {/* Command palette present in all modes */}
          <CommandPalette exec={execCommand} submitted={submitted} />
        </div>

        <LivePreview prefs={prefs} />
      </div>

      {/* FOOTER BUILD LABEL */}
      <div className="container" style={{ textAlign:'right', color:'#64748b', fontSize:12, paddingBottom:24 }}>
        Build: {__APP_VERSION__}
      </div>
    </div>
  );
}
