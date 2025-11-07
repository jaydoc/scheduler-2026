import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, collectionGroup, getDocs, query } from 'firebase/firestore';

/* Build tag */
const __APP_VERSION__ = "v13.01— calendar + dragbuckets fix + quickadd + rankboard + palette";

/* Firebase config: prefer injected, else global, else local */
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

const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v13.0";
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* Attendings with email (from your last message) */
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

/* Targets/claimed/left panel */
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

/* Calendar (Saturdays only; Sat/Sun shown; some filled) */
const months = {
  '01': [
    { day: '10',      date: '2026-01-10', rni: null,     coa: null },
    { day: '17-19',   date: '2026-01-17', rni: null,     coa: null, detail: 'MLK Day' },
    { day: '24',      date: '2026-01-24', rni: null,     coa: null },
    { day: '31',      date: '2026-01-31', rni: null,     coa: null },
  ],
  '02': [
    { day: '7',       date: '2026-02-07', rni: 'Boone',  coa: null },
    { day: '14',      date: '2026-02-14', rni: 'Boone',  coa: null },
    { day: '21',      date: '2026-02-21', rni: 'Willis', coa: null },
    { day: '28',      date: '2026-02-28', rni: 'Willis', coa: null },
  ],
  '03': [
    { day: '7',       date: '2026-03-07', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { day: '14',      date: '2026-03-14', rni: null,     coa: 'Winter' },
    { day: '21',      date: '2026-03-21', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { day: '28',      date: '2026-03-28', rni: null,     coa: 'Arora' },
  ],
  '04': [
    { day: '4',       date: '2026-04-04', rni: 'Sims',   coa: null },
    { day: '11',      date: '2026-04-11', rni: null,     coa: null },
    { day: '18',      date: '2026-04-18', rni: 'Sims',   coa: null },
    { day: '25',      date: '2026-04-25', rni: null,     coa: null, detail: 'PAS Meeting Coverage' },
  ],
  '05': [
    { day: '2',       date: '2026-05-02', rni: null,     coa: null },
    { day: '9',       date: '2026-05-09', rni: 'Arora',  coa: null },
    { day: '16',      date: '2026-05-16', rni: 'Arora',  coa: null },
    { day: '23-25',   date: '2026-05-23', rni: null,     coa: null, detail: 'Memorial Day' },
    { day: '30',      date: '2026-05-30', rni: 'Arora',  coa: null },
  ],
  '06': [
    { day: '6',       date: '2026-06-06', rni: 'Schuyler', coa: 'Winter', isTaken: true },
    { day: '13',      date: '2026-06-13', rni: 'Boone',    coa: null },
    { day: '19-21',   date: '2026-06-19', rni: 'Schuyler', coa: 'Winter', isTaken: true, detail: 'Juneteenth Day' },
    { day: '27',      date: '2026-06-27', rni: 'Boone',    coa: null },
  ],
  '07': [
    { day: '4-6',     date: '2026-07-04', rni: 'Jain',     coa: 'Carlo',  isTaken: true, detail: '4th of July' },
    { day: '11',      date: '2026-07-11', rni: null,       coa: 'Willis' },
    { day: '18',      date: '2026-07-18', rni: null,       coa: null },
    { day: '25',      date: '2026-07-25', rni: 'Shukla',   coa: 'Willis', isTaken: true },
  ],
  '08': [
    { day: '1',       date: '2026-08-01', rni: 'Boone',    coa: null },
    { day: '8',       date: '2026-08-08', rni: 'Sims',     coa: 'Carlo', isTaken: true },
    { day: '15',      date: '2026-08-15', rni: 'Boone',    coa: null },
    { day: '22',      date: '2026-08-22', rni: 'Sims',     coa: null },
    { day: '29',      date: '2026-08-29', rni: null,       coa: 'Carlo' },
  ],
  '09': [
    { day: '5-7',     date: '2026-09-05', rni: 'Mackay',   coa: null, detail: 'Labor Day' },
    { day: '12',      date: '2026-09-12', rni: null,       coa: null },
    { day: '19',      date: '2026-09-19', rni: null,       coa: null },
    { day: '26',      date: '2026-09-26', rni: null,       coa: null },
  ],
  '10': [
    { day: '3',       date: '2026-10-03', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
    { day: '10',      date: '2026-10-10', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { day: '17',      date: '2026-10-17', rni: 'Kandasamy', coa: null },
    { day: '24',      date: '2026-10-24', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { day: '31',      date: '2026-10-31', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
  ],
  '11': [
    { day: '7',       date: '2026-11-07', rni: 'Ambal',  coa: null },
    { day: '14',      date: '2026-11-14', rni: 'Bhatia', coa: null },
    { day: '21',      date: '2026-11-21', rni: 'Ambal',  coa: null },
    { day: '26-28',   date: '2026-11-26', rni: 'Bhatia', coa: null, detail: 'Thanksgiving' },
  ],
  '12': [
    { day: '5',       date: '2026-12-05', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { day: '12',      date: '2026-12-12', rni: null,        coa: null },
    { day: '19',      date: '2026-12-19', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { day: '24-28',   date: '2026-12-24', rni: 'Bhatia',    coa: 'Arora',     isTaken: true, detail: 'Christmas' },
    { day: '31-Jan 4',date: '2026-12-31', rni: 'Kane',      coa: 'Kandasamy', isTaken: true, detail: "New Year's Eve" },
  ],
};

const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* Availability mapping from calendar (RNI/COA OPEN if null) */
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
function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
  });
  return base;
}
const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });

const MONTH_COLORS = [
  { bg: '#fde68a', fg: '#1f2937', border: '#f59e0b' },
  { bg: '#bfdbfe', fg: '#1f2937', border: '#3b82f6' },
  { bg: '#bbf7d0', fg: '#064e3b', border: '#10b981' },
  { bg: '#fecaca', fg: '#7f1d1d', border: '#f87171' },
  { bg: '#ddd6fe', fg: '#312e81', border: '#8b5cf6' },
  { bg: '#c7d2fe', fg: '#1e3a8a', border: '#6366f1' },
  { bg: '#fbcfe8', fg: '#831843', border: '#ec4899' },
  { bg: '#a7f3d0', fg: '#065f46', border: '#34d399' },
  { bg: '#fcd34d', fg: '#1f2937', border: '#f59e0b' },
  { bg: '#fca5a5', fg: '#7f1d1d', border: '#ef4444' },
  { bg: '#93c5fd', fg: '#1e3a8a', border: '#3b82f6' },
  { bg: '#86efac', fg: '#064e3b', border: '#22c55e' },
];
const MONTH_MIN_HEIGHT = 520;

/* Choice select with dynamic max */
function ChoiceSelect({ value, onChange, disabled, placeholder, maxN }) {
  const MAX = Math.max(10, maxN || 10);
  return (
    <select
      disabled={disabled}
      value={String(value || 0)}
      onChange={e => onChange(parseInt(e.target.value, 10))}
      style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13 }}
    >
      <option value="0">{placeholder}</option>
      {Array.from({ length: MAX }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

/* Limited radio that respects availability */
function RadioServiceLimited({ available, value, onChange, disabled, name }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      {available.includes(SERVICES.RNI) && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <input type="radio" disabled={disabled} checked={value === SERVICES.RNI} onChange={() => onChange(SERVICES.RNI)} name={name} />
          RNI
        </label>
      )}
      {available.includes(SERVICES.COA) && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <input type="radio" disabled={disabled} checked={value === SERVICES.COA} onChange={() => onChange(SERVICES.COA)} name={name} />
          COA
        </label>
      )}
    </div>
  );
}

/* Month card for Calendar mode (unchanged behavior) */
function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, cardRef, locked }) {
  const idx = parseInt(mk, 10) - 1;
  const color = MONTH_COLORS[idx] ?? { bg: '#eeeeee', fg: '#111111', border: '#cccccc' };

  return (
    <div
      ref={cardRef}
      id={`month-${mk}`}
      style={{
        scrollMarginTop: 96,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        background: '#fff',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      }}
    >
      <button
        onClick={onToggle}
        style={{
          background: color.bg,
          color: color.fg,
          borderBottom: `2px solid ${color.border}`,
          fontWeight: 800,
          fontSize: 16,
          padding: '12px 14px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          cursor: 'pointer'
        }}
        title="Collapse/expand"
      >
        <span>{label}</span>
        <span style={{ fontWeight: 900, marginLeft: 6 }}>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, minHeight: MONTH_MIN_HEIGHT }}>
          {items.map(w => {
            const p = prefs[w.date] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const fullyAssigned = w.isTaken || (!rniOpen && !coaOpen);
            const available = [];
            if (rniOpen) available.push(SERVICES.RNI);
            if (coaOpen) available.push(SERVICES.COA);

            return (
              <div key={w.date} style={{ padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', background: fullyAssigned ? '#f9fafb' : '#fff', opacity: fullyAssigned ? 0.8 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{w.day}</div>
                  {w.detail && <div style={chip('#fff7ed', '#c2410c')}>{w.detail}</div>}
                </div>

                <div style={{ fontSize: 13, color: '#334155', marginBottom: 8, lineHeight: 1.25 }}>
                  <span style={{ background: rniOpen ? '#dbeafe' : '#e5e7eb', color: rniOpen ? '#1e3a8a' : '#111827', borderRadius: 6, padding: '3px 8px', marginRight: 8 }}>
                    RNI: {rniOpen ? 'OPEN' : <strong style={{ fontSize: 15 }}>{w.rni}</strong>}
                  </span>
                  <span style={{ background: coaOpen ? '#e0e7ff' : '#e5e7eb', color: coaOpen ? '#3730a3' : '#111827', borderRadius: 6, padding: '3px 8px' }}>
                    COA: {coaOpen ? 'OPEN' : <strong style={{ fontSize: 15 }}>{w.coa}</strong>}
                  </span>
                </div>

                {!fullyAssigned ? (
                  <div style={{ display: 'grid', gap: 10, opacity: locked ? 0.6 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Most (service + choice)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <RadioServiceLimited
                          available={available}
                          disabled={locked}
                          value={available.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                          onChange={(svc) => onMostChange(w.date, { ...p, mostService: svc })}
                          name={`most-${w.date}`}
                        />
                        <ChoiceSelect
                          disabled={locked || available.length === 0 || p.mostService === SERVICES.NONE}
                          value={p.mostChoice || 0}
                          onChange={(choice) => onMostChange(w.date, { ...p, mostChoice: choice })}
                          placeholder="Most choice…"
                          maxN={allWeekendIds.length}
                        />
                        {p.mostService === SERVICES.NONE && p.mostChoice > 0 && (
                          <span style={chip('#fff7ed', '#b45309')}>Pick a service for Most</span>
                        )}
                        {p.mostService !== SERVICES.NONE && p.mostChoice > 0 && (
                          <span style={chip('#d1fae5', '#10b981')}>Most #{p.mostChoice}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Least (service + choice)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <RadioServiceLimited
                          available={available}
                          disabled={locked}
                          value={available.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                          onChange={(svc) => onLeastChange(w.date, { ...p, leastService: svc })}
                          name={`least-${w.date}`}
                        />
                        <ChoiceSelect
                          disabled={locked || available.length === 0 || p.leastService === SERVICES.NONE}
                          value={p.leastChoice || 0}
                          onChange={(choice) => onLeastChange(w.date, { ...p, leastChoice: choice })}
                          placeholder="Least choice…"
                          maxN={allWeekendIds.length}
                        />
                        {p.leastService === SERVICES.NONE && p.leastChoice > 0 && (
                          <span style={chip('#fff7ed', '#b45309')}>Pick a service for Least</span>
                        )}
                        {p.leastService !== SERVICES.NONE && p.leastChoice > 0 && (
                          <span style={chip('#ffe4e6', '#e11d48')}>Least #{p.leastChoice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: 8, borderRadius: 8, textAlign: 'center' }}>
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

/* CSV/Word helpers */
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
      <td>${esc(monthLabel(r.weekend))}</td>
    </tr>`;
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>Preferences</title></head>
  <body>
    <h2>2026 Weekend Preferences</h2>
    <p><b>Name:</b> ${esc(name || '')} &nbsp; <b>Email:</b> ${esc(email || '')}</p>
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead style="background:#f3f4f6">
        <tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Sat date)</th></tr>
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
function monthLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
}

/* Identity block */
function AttendingIdentity({ profile, saveProfile }) {
  return (
    <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
      <label style={{ fontSize:14, fontWeight:700 }}>Your name:</label>
      <select
        value={profile.name}
        onChange={e => saveProfile({ ...profile, name: e.target.value, email: (ATTENDINGS.find(a => a.name === e.target.value)?.email || profile.email) })}
        style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, minWidth:220, fontSize:14 }}
      >
        <option value="">— Select —</option>
        {ATTENDINGS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
      </select>

      <label style={{ fontSize:14, fontWeight:700, marginLeft:8 }}>Email (optional):</label>
      <input
        type="email"
        value={profile.email}
        placeholder="you@uab.edu"
        onChange={e => saveProfile({ ...profile, email: e.target.value })}
        style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, minWidth:260, fontSize:14 }}
      />

      {profile.name && (
        <div style={{ marginTop: 8 }}>
          {(() => {
            const m = ATTENDING_LIMITS[profile.name];
            return m ? (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{profile.name}</div>
                <div style={{ fontSize: 13, color: '#334155' }}><b>Total weekends requested:</b> {m.requested}</div>
                <div style={{ fontSize: 13, color: '#334155' }}><b>Assignments already claimed:</b> {m.claimed}</div>
                <div style={{ fontSize: 13, color: '#334155' }}><b>Assignments left to be picked:</b> {m.left}</div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#7c2d12', background: '#ffedd5', border: '1px solid #fed7aa', borderRadius: 10, padding: '8px 10px' }}>
                Target numbers for “{profile.name}” are not set yet.
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* Live View sidebar */
function LiveView({ prefs }) {
  const most = [];
  const least = [];
  for (const [id, p] of Object.entries(prefs)) {
    if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) most.push({ id, ...p });
    if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) least.push({ id, ...p });
  }
  most.sort((a,b)=>a.mostChoice-b.mostChoice);
  least.sort((a,b)=>a.leastChoice-b.leastChoice);

  return (
    <div style={{ position:'sticky', top:96, display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, background:'#fff' }}>
        <div style={{ padding:'8px 10px', borderBottom:'1px solid #e5e7eb', fontWeight:900, fontSize:14, background:'#f8fafc' }}>Live View — Most</div>
        <div style={{ padding:10, display:'flex', flexDirection:'column', gap:6 }}>
          {most.length===0 ? <div style={{ fontSize:12, color:'#64748b' }}>— none —</div> :
            most.map(m => (
              <div key={`mv-${m.id}`} style={{ fontSize:13 }}>
                #{m.mostChoice} — {monthLabel(m.id)} — {m.mostService}
              </div>
            ))
          }
        </div>
      </div>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, background:'#fff' }}>
        <div style={{ padding:'8px 10px', borderBottom:'1px solid #e5e7eb', fontWeight:900, fontSize:14, background:'#f8fafc' }}>Live View — Least</div>
        <div style={{ padding:10, display:'flex', flexDirection:'column', gap:6 }}>
          {least.length===0 ? <div style={{ fontSize:12, color:'#64748b' }}>— none —</div> :
            least.map(m => (
              <div key={`lv-${m.id}`} style={{ fontSize:13 }}>
                #{m.leastChoice} — {monthLabel(m.id)} — {m.leastService}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* 2×6 Calendar Grid container */
function CalendarGrid({ prefs, setMost, setLeast, collapsed, setCollapsed, submitted }) {
  const monthRefs = useRef(Object.fromEntries(MONTH_KEYS.map(mk => [mk, React.createRef()])));

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

  return (
    <>
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 12px 24px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(360px, 1fr))',
          gap: '24px',
          alignItems: 'stretch',
          justifyItems: 'stretch'
        }}>
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
              cardRef={monthRefs.current[mk]}
              locked={submitted}
            />
          ))}
        </div>
        <LiveView prefs={prefs} />
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 12px 24px', display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
        {MONTH_KEYS.map((mk, i) => (
          <button key={mk} onClick={() => jumpTo(mk)} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
            {MONTH_FULL[i]}
          </button>
        ))}
      </div>
    </>
  );
}

/* -------- DragBuckets (fixed) -------- */
function DragBuckets({ monthsFlat, prefs, setMost, setLeast, disabled, requireName }) {
  const [dragPayload, setDragPayload] = useState(null);

  const libraryItems = useMemo(() => {
    return monthsFlat.flatMap(({ id, label }) => {
      const avail = availabilityByWeekend[id] || [];
      return avail.map(svc => ({ key: `${id}:${svc}`, id, service: svc, label: `${label} — ${svc}` }));
    });
  }, [monthsFlat]);

  const mostChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p?.mostService && p.mostService !== SERVICES.NONE && (p.mostChoice || 0) > 0) {
        arr.push({ id, service: p.mostService, choice: p.mostChoice });
      }
    }
    arr.sort((a,b)=>(a.choice-b.choice) || (allWeekendIds.indexOf(a.id)-allWeekendIds.indexOf(b.id)));
    return arr;
  }, [prefs]);

  const leastChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p?.leastService && p.leastService !== SERVICES.NONE && (p.leastChoice || 0) > 0) {
        arr.push({ id, service: p.leastService, choice: p.leastChoice });
      }
    }
    arr.sort((a,b)=>(a.choice-b.choice) || (allWeekendIds.indexOf(a.id)-allWeekendIds.indexOf(b.id)));
    return arr;
  }, [prefs]);

  const nextChoice = (list) => (list.reduce((m,x)=>Math.max(m, x.choice||0), 0) + 1);

  const onDragStart = (payload) => (e) => {
    if (disabled || !requireName) { e.preventDefault(); return; }
    setDragPayload(payload);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };
  const onDragOver = (e) => { if (disabled || !requireName) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (bucket) => (e) => {
    if (disabled || !requireName) return;
    e.preventDefault();
    let pl = dragPayload;
    try { pl = JSON.parse(e.dataTransfer.getData("text/plain")); } catch {}
    if (!pl) return;
    const avail = availabilityByWeekend[pl.id] || [];
    if (!avail.includes(pl.service)) return;

    if (bucket === "MOST") {
      setLeast(pl.id, { ...((prefs[pl.id]||{})), leastService: SERVICES.NONE, leastChoice: 0 });
      setMost(pl.id, { ...((prefs[pl.id]||{})), mostService: pl.service, mostChoice: nextChoice(mostChosen) });
    } else {
      setMost(pl.id, { ...((prefs[pl.id]||{})), mostService: SERVICES.NONE, mostChoice: 0 });
      setLeast(pl.id, { ...((prefs[pl.id]||{})), leastService: pl.service, leastChoice: nextChoice(leastChosen) });
    }
    setDragPayload(null);
  };

  const removeFrom = (bucket, id) => {
    if (bucket === "MOST") setMost(id, { ...((prefs[id]||{})), mostService: SERVICES.NONE, mostChoice: 0 });
    else setLeast(id, { ...((prefs[id]||{})), leastService: SERVICES.NONE, leastChoice: 0 });
  };

  const shell = { border:'1px solid #e5e7eb', borderRadius:14, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.04)' };
  const title = { fontWeight:900, fontSize:14, padding:'8px 10px', borderBottom:'1px solid #e5e7eb', background:'#f8fafc' };
  const pad = { padding:10 };

  return (
    <div style={{ maxWidth: 1120, margin:'12px auto', padding:'0 12px' }}>
      <div style={{ display:'grid', gap:16, gridTemplateColumns:'1fr 1fr 1fr' }}>
        {/* Library */}
        <div style={shell}>
          <div style={title}>Available (drag a chip)</div>
          <div style={{ ...pad }}>
            <div
              style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',
                gap:8,
                alignItems:'start'
              }}
            >
              {libraryItems.map(item => (
                <div
                  key={item.key}
                  draggable={!disabled && requireName}
                  onDragStart={onDragStart({ id:item.id, service:item.service })}
                  title={requireName ? "Drag to MOST or LEAST" : "Select your name first"}
                  style={{
                    padding:'6px 10px',
                    borderRadius:999,
                    border:'1px solid #e5e7eb',
                    background:'#ffffff',
                    fontSize:12,
                    cursor: (disabled || !requireName) ? 'not-allowed' : 'grab',
                    userSelect:'none',
                    whiteSpace:'nowrap',
                    overflow:'hidden',
                    textOverflow:'ellipsis'
                  }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MOST */}
        <div style={shell} onDragOver={onDragOver} onDrop={onDrop("MOST")}>
          <div style={title}>Most (drop to add)</div>
          <div style={{ ...pad, minHeight: 120, display:'flex', flexDirection:'column', gap:8 }}>
            {mostChosen.length === 0 ? (
              <div style={{ fontSize:12, color:'#64748b' }}>— empty —</div>
            ) : mostChosen.map(m => (
              <div key={`M-${m.id}`} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ padding:'4px 8px', borderRadius:8, background:'#d1fae5', border:'1px solid #10b98133', fontSize:12 }}>
                  #{m.choice}
                </span>
                <span style={{ fontSize:13 }}>
                  {monthLabel(m.id)} — {m.service}
                </span>
                <button onClick={()=>removeFrom("MOST", m.id)} style={{ marginLeft:'auto', fontSize:12, border:'1px solid #e5e7eb', borderRadius:8, padding:'2px 6px' }}>Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* LEAST */}
        <div style={shell} onDragOver={onDragOver} onDrop={onDrop("LEAST")}>
          <div style={title}>Least (drop to add)</div>
          <div style={{ ...pad, minHeight: 120, display:'flex', flexDirection:'column', gap:8 }}>
            {leastChosen.length === 0 ? (
              <div style={{ fontSize:12, color:'#64748b' }}>— empty —</div>
            ) : leastChosen.map(m => (
              <div key={`L-${m.id}`} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ padding:'4px 8px', borderRadius:8, background:'#fee2e2', border:'1px solid #ef444433', fontSize:12 }}>
                  #{m.choice}
                </span>
                <span style={{ fontSize:13 }}>
                  {monthLabel(m.id)} — {m.service}
                </span>
                <button onClick={()=>removeFrom("LEAST", m.id)} style={{ marginLeft:'auto', fontSize:12, border:'1px solid #e5e7eb', borderRadius:8, padding:'2px 6px' }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {!requireName && (
        <div style={{ marginTop:8, fontSize:12, color:'#991b1b', background:'#fee2e2', border:'1px solid #fecaca', padding:'6px 8px', borderRadius:8 }}>
          Select your name above to enable drag & drop.
        </div>
      )}
    </div>
  );
}

/* -------- QuickAdd (click to add next choice, enforcing availability) -------- */
function QuickAdd({ weekends, prefs, setMost, setLeast, requireName, disabled }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = weekends;
    if (!s) return base;
    return base.filter(x => x.label.toLowerCase().includes(s));
  }, [q, weekends]);

  const nextChoiceFor = (kind) => {
    let best = 0;
    for (const p of Object.values(prefs)) {
      const n = kind === 'MOST' ? (p.mostChoice||0) : (p.leastChoice||0);
      if (n > best) best = n;
    }
    return best + 1;
  };

  const add = (id, svc, kind) => {
    if (disabled || !requireName) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;
    if (kind === 'MOST') {
      setLeast(id, { ...((prefs[id]||{})), leastService: SERVICES.NONE, leastChoice: 0 });
      setMost(id,  { ...((prefs[id]||{})), mostService: svc, mostChoice: nextChoiceFor('MOST') });
    } else {
      setMost(id,  { ...((prefs[id]||{})), mostService: SERVICES.NONE, mostChoice: 0 });
      setLeast(id, { ...((prefs[id]||{})), leastService: svc, leastChoice: nextChoiceFor('LEAST') });
    }
  };

  return (
    <div style={{ maxWidth:1120, margin:'12px auto', padding:'0 12px', display:'grid', gridTemplateColumns:'2fr 1fr', gap:24 }}>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, background:'#fff' }}>
        <div style={{ padding:10, borderBottom:'1px solid #e5e7eb', display:'flex', gap:8, alignItems:'center' }}>
          <strong>QuickAdd</strong>
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search month/day…"
            style={{ flex:1, padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}
          />
        </div>
        <div style={{ padding:10, display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))' }}>
          {filtered.map(w => {
            const avail = availabilityByWeekend[w.id] || [];
            return (
              <div key={w.id} style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:10 }}>
                <div style={{ fontWeight:800, marginBottom:8 }}>{w.label}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {avail.map(svc => (
                    <button
                      key={svc}
                      disabled={disabled || !requireName}
                      onClick={()=>add(w.id, svc, 'MOST')}
                      style={{ padding:'6px 10px', borderRadius:10, border:"1px solid #10b981", background:'#ecfdf5', fontSize:12 }}
                    >Add MOST — {svc}</button>
                  ))}
                  {avail.map(svc => (
                    <button
                      key={`${svc}-L`}
                      disabled={disabled || !requireName}
                      onClick={()=>add(w.id, svc, 'LEAST')}
                      style={{ padding:'6px 10px', borderRadius:10, border:"1px solid #ef4444", background:'#fef2f2', fontSize:12 }}
                    >Add LEAST — {svc}</button>
                  ))}
                  {avail.length===0 && <span style={{ fontSize:12, color:'#64748b' }}>Fully assigned</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <LiveView prefs={prefs} />
    </div>
  );
}

/* -------- RankBoard (grid of numbers, click to assign next rank) -------- */
function RankBoard({ weekends, prefs, setMost, setLeast, requireName, disabled }) {
  const [mode, setMode] = useState('MOST'); // MOST or LEAST
  const nextChoiceFor = (kind) => {
    let best = 0;
    for (const p of Object.values(prefs)) {
      const n = kind === 'MOST' ? (p.mostChoice||0) : (p.leastChoice||0);
      if (n > best) best = n;
    }
    return best + 1;
  };
  const assign = (id, svc) => {
    if (disabled || !requireName) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;
    if (mode === 'MOST') {
      setLeast(id, { ...((prefs[id]||{})), leastService: SERVICES.NONE, leastChoice: 0 });
      setMost(id,  { ...((prefs[id]||{})), mostService: svc, mostChoice: nextChoiceFor('MOST') });
    } else {
      setMost(id,  { ...((prefs[id]||{})), mostService: SERVICES.NONE, mostChoice: 0 });
      setLeast(id, { ...((prefs[id]||{})), leastService: svc, leastChoice: nextChoiceFor('LEAST') });
    }
  };

  return (
    <div style={{ maxWidth:1120, margin:'12px auto', padding:'0 12px', display:'grid', gridTemplateColumns:'2fr 1fr', gap:24 }}>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, background:'#fff' }}>
        <div style={{ padding:10, borderBottom:'1px solid #e5e7eb', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <strong>RankBoard</strong>
          <div style={{ display:'flex', gap:6 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
              <input type="radio" checked={mode==='MOST'} onChange={()=>setMode('MOST')} /> MOST
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
              <input type="radio" checked={mode==='LEAST'} onChange={()=>setMode('LEAST')} /> LEAST
            </label>
          </div>
        </div>
        <div style={{ padding:10, display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))' }}>
          {weekends.map(w => {
            const avail = availabilityByWeekend[w.id] || [];
            return (
              <div key={w.id} style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:10 }}>
                <div style={{ fontWeight:800, marginBottom:8 }}>{w.label}</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {avail.map(svc => (
                    <button
                      key={svc}
                      disabled={disabled || !requireName}
                      onClick={()=>assign(w.id, svc)}
                      style={{ padding:'6px 10px', borderRadius:10, border: mode==='MOST' ? "1px solid #10b981" : "1px solid #ef4444", background: mode==='MOST' ? '#ecfdf5' : '#fef2f2', fontSize:12 }}
                    >
                      {mode==='MOST' ? 'Add MOST' : 'Add LEAST'} — {svc}
                    </button>
                  ))}
                  {avail.length===0 && <span style={{ fontSize:12, color:'#64748b' }}>Fully assigned</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <LiveView prefs={prefs} />
    </div>
  );
}

/* -------- Command Palette (Ctrl/Cmd-K) -------- */
function CommandPalette({ open, onClose, weekends, doAction, requireName }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(()=>{ if(open) setTimeout(()=>inputRef.current?.focus(), 50); }, [open]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    const base = weekends;
    if (!s) return base.slice(0, 20);
    return base.filter(x => x.label.toLowerCase().includes(s)).slice(0, 30);
  }, [q, weekends]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.25)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:80, zIndex:200 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width:680, background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 10px 30px rgba(0,0,0,.2)' }}>
        <div style={{ padding:12, borderBottom:'1px solid #e5e7eb' }}>
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Type a month/day… then click an action" style={{ width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:10 }}/>
        </div>
        <div style={{ maxHeight:420, overflow:'auto', padding:10 }}>
          {filtered.length===0 ? <div style={{ padding:10, color:'#64748b' }}>No matches</div> :
            filtered.map(w=>{
              const avail = availabilityByWeekend[w.id] || [];
              return (
                <div key={w.id} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #f1f5f9', marginBottom:8 }}>
                  <div style={{ fontWeight:800, marginBottom:6 }}>{w.label}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {avail.map(svc=>(
                      <button key={`m-${svc}`} disabled={!requireName} onClick={()=>doAction('MOST', w.id, svc)} style={{ padding:'6px 10px', borderRadius:10, border:"1px solid #10b981", background:'#ecfdf5', fontSize:12 }}>
                        Add MOST — {svc}
                      </button>
                    ))}
                    {avail.map(svc=>(
                      <button key={`l-${svc}`} disabled={!requireName} onClick={()=>doAction('LEAST', w.id, svc)} style={{ padding:'6px 10px', borderRadius:10, border:"1px solid #ef4444", background:'#fef2f2', fontSize:12 }}>
                        Add LEAST — {svc}
                      </button>
                    ))}
                    {avail.length===0 && <span style={{ fontSize:12, color:'#64748b' }}>Fully assigned</span>}
                  </div>
                </div>
              );
            })
          }
        </div>
        <div style={{ padding:10, fontSize:12, color:'#64748b', textAlign:'right' }}>Esc closes • {requireName ? 'Ready' : 'Select your name first'}</div>
      </div>
    </div>
  );
}

/* App */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [firebaseOk, setFirebaseOk] = useState(null); // null=unknown, true=ok, false=bad
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';

  // Mode selection
  const MODES = ['Calendar','DragBuckets','QuickAdd','RankBoard'];
  const [mode, setMode] = useState('Calendar');

  // Palette
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(()=>{
    const onKey = (e)=>{
      const isCmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k';
      if (isCmdK){ e.preventDefault(); setPaletteOpen(x=>!x); }
      if (e.key==='Escape'){ setPaletteOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return ()=>window.removeEventListener('keydown', onKey);
  },[]);

  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, async (u) => {
          if (u) setUid(u.uid);
          setStatus('Loading profile & preferences…');
          // tiny health check read
          try {
            await getDoc(doc(db, "healthcheck", "ping")); // may not exist; still exercises Firestore
            setFirebaseOk(true);
          } catch {
            setFirebaseOk(true); // auth ok even if doc missing
          }
        });
      } catch (e) {
        console.error(e);
        setFirebaseOk(false);
        setStatus(`Auth error: ${e.message}`);
      }
    })();
  }, []);

  const profileDocRef = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'profile'), 'current');
  const prefsDocRef   = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'preferences'), 'calendar-preferences');

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
          } else if (d.top10 || d.bottom10) {
            const next = initEmptyPrefs();
            (d.top10 || []).forEach(t => {
              next[t.weekend] = { ...next[t.weekend], mostService: t.service || SERVICES.NONE, mostChoice: t.choice ?? t.rank ?? 0 };
            });
            (d.bottom10 || []).forEach(b => {
              next[b.weekend] = { ...next[b.weekend], leastService: b.service || SERVICES.NONE, leastChoice: b.choice ?? b.rank ?? 0 };
            });
            setPrefs(next);
          }
        }
        setStatus('Ready.');
      } catch (e) {
        console.error(e);
        setFirebaseOk(false);
        setStatus(`Load error: ${e.message}`);
      }
    })();
  }, [uid]);

  /* one-time auto-fill service when only one is available */
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

  const setMost = useCallback((id, v) => {
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), mostService: v.mostService, mostChoice: v.mostChoice } }));
  }, []);
  const setLeast = useCallback((id, v) => {
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), leastService: v.leastService, leastChoice: v.leastChoice } }));
  }, []);

  const counts = useMemo(() => {
    let mostCount = 0, leastCount = 0;
    for (const p of Object.values(prefs)) {
      if (p.mostChoice > 0 && p.mostService !== SERVICES.NONE) mostCount++;
      if (p.leastChoice > 0 && p.leastService !== SERVICES.NONE) leastCount++;
    }
    return { mostCount, leastCount };
  }, [prefs]);

  const saveProfile = async (next) => {
    setProfile(next);
    if (!uid) return;
    await setDoc(profileDocRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  };

  const assembleTopBottom = useCallback(() => {
    const orderIdx = id => allWeekendIds.indexOf(id);
    const top = [], bottom = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) bottom.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
    }
    top.sort((a,b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    bottom.sort((a,b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    return { top, bottom };
  }, [prefs]);

  const handleSubmit = async () => {
    if (!uid || !profile.name) { alert('Select your name first.'); return; }
    const badLeast = Object.values(prefs).some(p => p.leastChoice > 0 && p.leastService === SERVICES.NONE);
    if (badLeast) { alert('For every “Least” choice, please select a service (RNI or COA).'); return; }

    const { top, bottom } = assembleTopBottom();
    await setDoc(prefsDocRef(uid), {
      name: profile.name,
      email: profile.email || '',
      preferences: Object.fromEntries(Object.entries(prefs).map(([k,v]) => [k, {
        mostService: v.mostService, mostChoice: v.mostChoice, mostRank: v.mostChoice,
        leastService: v.leastService, leastChoice: v.leastChoice, leastRank: v.leastChoice,
      }])),
      top10: top.map(t => ({ weekend: t.weekend, choice: t.choice, rank: t.choice, service: t.service })),        // compatible
      bottom10: bottom.map(b => ({ weekend: b.weekend, choice: b.choice, rank: b.choice, service: b.service })),   // compatible
      submitted: true,
      submittedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    setSubmitted(true);
    alert('Preferences submitted. Downloads now reflect your final locked choices.');
  };

  const downloadMyCSV = () => {
    const { top, bottom } = assembleTopBottom();
    const rows = [
      ...top.map(t => ({ attendee: profile.name, email: profile.email || '', kind: 'MOST',  choice: t.choice, service: t.service, weekend: monthLabel(t.weekend) })),
      ...bottom.map(b => ({ attendee: profile.name, email: profile.email || '', kind: 'LEAST', choice: b.choice, service: b.service, weekend: monthLabel(b.weekend) })),
    ];
    const fn = submitted ? `preferences_${profile.name || 'attending'}.csv` : `preferences_preview_${profile.name || 'attending'}.csv`;
    downloadCSV(fn, rows);
  };
  const downloadMyWord = () => {
    const { top, bottom } = assembleTopBottom();
    const html = docHtml(profile.name, profile.email, top, bottom);
    const fn = submitted ? `preferences_${profile.name || 'attending'}.doc` : `preferences_preview_${profile.name || 'attending'}.doc`;
    downloadBlob(fn, 'application/msword', html);
  };

  // Months flattened (for alt UIs)
  const monthsFlat = useMemo(()=>{
    const arr = [];
    MONTH_KEYS.forEach((mk, i) => {
      months[mk].forEach(w => {
        arr.push({ id: w.date, label: `${MONTH_FULL[i]} ${String(new Date(w.date).getDate())}` });
      });
    });
    return arr;
  }, []);

  // Command palette doAction
  const paletteAction = (kind, id, svc) => {
    if (!profile.name) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;
    if (kind === 'MOST') {
      setLeast(id, { ...((prefs[id]||{})), leastService: SERVICES.NONE, leastChoice: 0 });
      const next = (()=>{ let m=0; for (const p of Object.values(prefs)) m=Math.max(m, p.mostChoice||0); return m+1; })();
      setMost(id,  { ...((prefs[id]||{})), mostService: svc, mostChoice: next });
    } else {
      setMost(id,  { ...((prefs[id]||{})), mostService: SERVICES.NONE, mostChoice: 0 });
      const next = (()=>{ let m=0; for (const p of Object.values(prefs)) m=Math.max(m, p.leastChoice||0); return m+1; })();
      setLeast(id, { ...((prefs[id]||{})), leastService: svc, leastChoice: next });
    }
  };

  /* Admin CSV (optional readout) */
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const loadAdmin = async () => {
    const q = query(collectionGroup(db, 'preferences'));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach(d => {
      const data = d.data();
      if (!data || !data.top10 || !data.bottom10) return;
      const attendee = data.name || '(unknown)';
      const em = data.email || '';
      const submittedAt = data.submittedAt?._seconds ? new Date(data.submittedAt._seconds * 1000).toISOString() : '';
      const pull = (x) => x.choice ?? x.rank;
      data.top10.forEach(t => rows.push({ attendee, email: em, kind: 'MOST',  choice: pull(t), service: t.service, weekend: t.weekend, submittedAt }));
      data.bottom10.forEach(b => rows.push({ attendee, email: em, kind: 'LEAST', choice: pull(b), service: b.service || '', weekend: b.weekend, submittedAt }));
    });
    rows.sort((a,b) => (a.attendee||'').localeCompare(b.attendee||'') || a.kind.localeCompare(b.kind) || (a.choice - b.choice));
    setAdminRows(rows);
    setAdminLoaded(true);
  };
  useEffect(() => {
    if (isAdmin && uid && !adminLoaded) { loadAdmin().catch(console.error); }
  }, [isAdmin, uid, adminLoaded]);

  const collapseAll = val => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));

  const requireName = Boolean(profile?.name);
  const disabled = submitted;

  // Firebase badge
  const fbBadge = firebaseOk === null ? '…' : firebaseOk ? '✓' : '×';
  const fbColor = firebaseOk ? '#065f46' : '#991b1b';
  const fbBg    = firebaseOk ? '#d1fae5' : '#fee2e2';
  const fbBorder= firebaseOk ? '#10b981' : '#ef4444';

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontSize: 15 }}>
      {/* Sticky jump/controls with inline Firebase badge + mode switch */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(4px)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mode switch */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {MODES.map(m => (
              <button key={m} onClick={()=>setMode(m)} style={{
                padding:'6px 10px', borderRadius:999,
                border: mode===m ? "1px solid #1d4ed8" : "1px solid #e5e7eb",
                background: mode===m ? '#eff6ff' : '#fff', fontSize:12
              }}>{m}</button>
            ))}
          </div>

          {/* Jump — Calendar months quick buttons */}
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginLeft:8 }}>
            {MONTH_KEYS.map((mk, i) => (
              <a key={mk} href={`#month-${mk}`} style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11 }}>
                {MONTH_FULL[i].slice(0,3)}
              </a>
            ))}
          </div>

          <span style={{ flex: 1 }} />

          {/* Firebase badge */}
          <div title="Firebase connection status"
               style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px', borderRadius:999,
                        border:`1px solid ${fbBorder}`, background: fbBg, color: fbColor, fontSize:12 }}>
            Firebase {fbBadge}
          </div>

          {/* Coll/Expand + Preview CSV/Word */}
          <button onClick={() => collapseAll(true)}  style={{ padding:'6px 10px', borderRadius: 10, border:"1px solid #e5e7eb", background:'#fff', fontSize:12 }}>Collapse all</button>
          <button onClick={() => collapseAll(false)} style={{ padding:'6px 10px', borderRadius: 10, border:"1px solid #e5e7eb", background:'#fff', fontSize:12 }}>Expand all</button>
          <button onClick={downloadMyCSV}  style={{ padding:'6px 10px', borderRadius: 10, border:"1px solid #059669", background: '#10b981', color:'#fff', fontSize:12 }}>Preview CSV</button>
          <button onClick={downloadMyWord} style={{ padding:'6px 10px', borderRadius: 10, border:"1px solid #4f46e5", background: '#6366f1', color:'#fff', fontSize:12 }}>Preview Word</button>
          <button onClick={()=>setPaletteOpen(true)} title="Command Palette (Ctrl/Cmd-K)" style={{ padding:'6px 10px', borderRadius:10, border:"1px solid #334155", background:'#0f172a', color:'#fff', fontSize:12 }}>
            ⌘K
          </button>
        </div>
      </div>

      {/* Header + instructions */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 12px 0' }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">2026 Preferences (RNI & COA)</h1>
        <ol style={{ margin: '8px 0 12px', paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.45, listStyle: 'decimal' }}>
          <li style={{ marginBottom: 4 }}>Select your name below. You will see the number of weekends you wanted.</li>
          <li style={{ marginBottom: 4 }}>Expand months as needed to choose as many <strong>Most</strong> and <strong>Least</strong> preferred weekends as you need to. For each, select <b>service</b> and <b>choice #</b>.</li>
          <li style={{ marginBottom: 4 }}>You can download a preview anytime.</li>
          <li style={{ marginBottom: 4 }}>Submit to lock your preferences once you are done.</li>
        </ol>
        <div style={{ fontSize: 13, color: '#0f5132', background: '#d1e7dd', border: '1px solid #badbcc', padding: '10px 12px', borderRadius: 10, marginBottom: 10 }}>
          Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible. This is a <b>ranking</b> process; selecting more weekends increases the chance you receive more of your preferred weekends overall.
        </div>
        <div className="mb-3 text-sm text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-md p-3">
          Status: {status} • Most choices: {counts.mostCount} • Least choices: {counts.leastCount} {submitted ? '• (Locked after submission)' : ''}
        </div>
        <AttendingIdentity profile={profile} saveProfile={saveProfile} />
      </div>

      {/* Mode view */}
      {mode === 'Calendar' && (
        <CalendarGrid
          prefs={prefs}
          setMost={(id,v)=>setMost(id,v)}
          setLeast={(id,v)=>setLeast(id,v)}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          submitted={submitted}
        />
      )}

      {mode === 'DragBuckets' && (
        <DragBuckets
          monthsFlat={monthsFlat}
          prefs={prefs}
          setMost={(id, v) => setPrefs(p => ({ ...p, [id]: { ...(p[id]||{}), mostService: v.mostService, mostChoice: v.mostChoice } }))}
          setLeast={(id, v) => setPrefs(p => ({ ...p, [id]: { ...(p[id]||{}), leastService: v.leastService, leastChoice: v.leastChoice } }))}
          disabled={submitted}
          requireName={Boolean(profile?.name)}
        />
      )}

      {mode === 'QuickAdd' && (
        <QuickAdd
          weekends={monthsFlat}
          prefs={prefs}
          setMost={(id, v) => setPrefs(p => ({ ...p, [id]: { ...(p[id]||{}), mostService: v.mostService, mostChoice: v.mostChoice } }))}
          setLeast={(id, v) => setPrefs(p => ({ ...p, [id]: { ...(p[id]||{}), leastService: v.leastService, leastChoice: v.leastChoice } }))}
          requireName={Boolean(profile?.name)}
          disabled={submitted}
        />
      )}

      {mode === 'RankBoard' && (
        <RankBoard
          weekends={monthsFlat}
          prefs={prefs}
          setMost={(id, v) => setPrefs(p => ({ ...p, [id]: { ...(p[id]||{}), mostService: v.mostService, mostChoice: v.mostChoice } }))}
          setLeast={(id, v) => setPrefs(p => ({ ...p, [id]: { ...(p[id]||{}), leastService: v.leastService, leastChoice: v.leastChoice } }))}
          requireName={Boolean(profile?.name)}
          disabled={submitted}
        />
      )}

      {/* Submit */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 12px 8px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        <button
          className={`${profile.name && !submitted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-3 px-6 rounded-xl font-bold`}
          disabled={!profile.name || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted (Locked)' : 'Submit Final Preferences'}
        </button>
        <span className="text-sm text-gray-600">{submitted ? 'Locked. Downloads reflect your final choices.' : 'Tip: use Preview CSV/Word above to save your current selections.'}</span>
      </div>

      {/* Command palette (global) */}
      <CommandPalette
        open={paletteOpen}
        onClose={()=>setPaletteOpen(false)}
        weekends={monthsFlat}
        doAction={paletteAction}
        requireName={Boolean(profile?.name)}
      />

      {/* Build label */}
      <div style={{maxWidth:1120, margin:"0 auto", padding:"0 12px 24px", textAlign:"right", color:"#64748b", fontSize:12}}>
        Build: {__APP_VERSION__}
      </div>
    </div>
  );
}
