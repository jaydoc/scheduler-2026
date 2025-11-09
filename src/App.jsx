import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, collectionGroup, getDocs, query } from 'firebase/firestore';

/* =========================
   Build tag
   ========================= */
const __APP_VERSION__ = "v13.0 unified modes + centered + drag fix";
console.log("Scheduler build:", __APP_VERSION__);

/* =========================
   Firebase config
   - Prefers injected globals, else window fallback, else local
   ========================= */
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
    // eslint-disable-next-line no-undef
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      // eslint-disable-next-line no-undef
      return JSON.parse(__firebase_config);
    }
  } catch {}
  if (typeof window !== 'undefined' && window.FALLBACK_FIREBASE_CONFIG) return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();

const appId = (typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v13.0");
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   Attendings + Targets
   ========================= */
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

/* =========================
   Calendar data (Saturdays only; Fri–Sun shown in day label as needed)
   Month keys are '01'...'12'
   ========================= */
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

const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* Availability for each weekend */
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
const fmtLabel = (id) => {
  // id is YYYY-MM-DD; show "Month D" (year is redundant here)
  const [y,m,d] = id.split('-');
  const monthName = MONTH_FULL[parseInt(m,10)-1];
  return `${monthName} ${parseInt(d,10)}`;
};

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
  });
  return base;
}
const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });

/* =========================
   CSV/Word utilities
   ========================= */
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
      <td>${esc(fmtLabel(r.weekend))}</td>
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

/* =========================
   Choice & radio mini-components
   ========================= */
function ChoiceSelect({ value, onChange, disabled, placeholder, maxN }) {
  const MAX = Math.max(10, maxN || 10);
  return (
    <select
      disabled={disabled}
      value={String(value || 0)}
      onChange={e => onChange(parseInt(e.target.value, 10))}
      style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14 }}
    >
      <option value="0">{placeholder}</option>
      {Array.from({ length: MAX }, (_, i) => i + 1).map(n => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

/* Limit radios to available services; enforce single service */
function RadioServiceLimited({ available, value, onChange, disabled, name }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      {available.includes(SERVICES.RNI) && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <input type="radio" disabled={disabled} checked={value === SERVICES.RNI} onChange={() => onChange(SERVICES.RNI)} name={name} />
          RNI
        </label>
      )}
      {available.includes(SERVICES.COA) && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <input type="radio" disabled={disabled} checked={value === SERVICES.COA} onChange={() => onChange(SERVICES.COA)} name={name} />
          COA
        </label>
      )}
    </div>
  );
}

/* =========================
   Month card for Calendar UI
   ========================= */
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
          background: color.bg, color: color.fg, borderBottom: `2px solid ${color.border}`,
          fontWeight: 800, fontSize: 16, padding: '12px 14px', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
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
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{fmtLabel(w.date)} <span style={{ fontSize: 13, color: '#64748b' }}>({w.day})</span></div>
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
                          onChange={(svc) => onMostChange(w.date, { ...p, mostService: svc, leastService: p.leastService === svc ? SERVICES.NONE : p.leastService })}
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
                          onChange={(svc) => onLeastChange(w.date, { ...p, leastService: svc, mostService: p.mostService === svc ? SERVICES.NONE : p.mostService })}
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

/* =========================
   Command Palette (Cmd/Ctrl-K)
   ========================= */
function useCommandPalette(onAction) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const items = [
    { id: 'ui:calendar', label: 'Switch UI → Calendar' },
    { id: 'ui:drag',     label: 'Switch UI → DragBuckets' },
    { id: 'ui:quick',    label: 'Switch UI → QuickAdd' },
    { id: 'ui:rank',     label: 'Switch UI → RankBoard' },
    { id: 'act:collapse',label: 'Collapse all months' },
    { id: 'act:expand',  label: 'Expand all months' },
  ].filter(x => x.label.toLowerCase().includes(q.toLowerCase()));
  return {
    open, setOpen, q, setQ,
    items,
    select: (id) => { onAction(id); setOpen(false); setQ(''); }
  };
}

/* =========================
   DragBuckets (fixed)
   - Source lanes horizontally by month
   - Most & Least start empty
   - Ranks renumbered after add/remove
   ========================= */
function DragBuckets({ requireName, months, prefs, setMost, setLeast, availabilityByWeekend, submitted }) {
  const [dragData, setDragData] = useState(null);

  const mostList = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) {
        arr.push({ weekend: id, service: p.mostService, choice: p.mostChoice });
      }
    }
    arr.sort((a,b)=> a.choice-b.choice || allWeekendIds.indexOf(a.weekend)-allWeekendIds.indexOf(b.weekend));
    return arr;
  }, [prefs]);
  const leastList = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) {
        arr.push({ weekend: id, service: p.leastService, choice: p.leastChoice });
      }
    }
    arr.sort((a,b)=> a.choice-b.choice || allWeekendIds.indexOf(a.weekend)-allWeekendIds.indexOf(b.weekend));
    return arr;
  }, [prefs]);

  const normalizeRanks = useCallback(() => {
    // Renumber Most and Least to 1..N based on current sort
    const mostIds = mostList.map(x => x.weekend);
    const leastIds = leastList.map(x => x.weekend);
    let i = 1;
    mostIds.forEach(id => {
      const p = prefs[id] || {};
      setMost(id, { ...p, mostChoice: i++ });
    });
    let j = 1;
    leastIds.forEach(id => {
      const p = prefs[id] || {};
      setLeast(id, { ...p, leastChoice: j++ });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostList.length, leastList.length, prefs, setMost, setLeast]);

  const handleDragStart = (e, payload) => {
    if (!requireName || submitted) return;
    setDragData(payload);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDrop = (bucket) => {
    if (!dragData || submitted) return;
    const { weekend, service } = dragData;
    const available = availabilityByWeekend[weekend] || [];
    if (!available.includes(service)) {
      alert(`That service is not available on ${fmtLabel(weekend)}.`);
      return;
    }
    if (bucket === 'Most') {
      // clear Least if same day
      setLeast(weekend, { ...(prefs[weekend]||{}), leastService: SERVICES.NONE, leastChoice: 0 });
      const nextRank = mostList.length + 1;
      setMost(weekend, { ...(prefs[weekend]||{}), mostService: service, mostChoice: nextRank });
    } else {
      // clear Most if same day
      setMost(weekend, { ...(prefs[weekend]||{}), mostService: SERVICES.NONE, mostChoice: 0 });
      const nextRank = leastList.length + 1;
      setLeast(weekend, { ...(prefs[weekend]||{}), leastService: service, leastChoice: nextRank });
    }
    setDragData(null);
    setTimeout(normalizeRanks, 0);
  };
  const removeFrom = (bucket, weekend) => {
    if (bucket === 'Most') {
      setMost(weekend, { ...(prefs[weekend]||{}), mostService: SERVICES.NONE, mostChoice: 0 });
    } else {
      setLeast(weekend, { ...(prefs[weekend]||{}), leastService: SERVICES.NONE, leastChoice: 0 });
    }
    setTimeout(normalizeRanks, 0);
  };

  // Build source lanes: weekends with at least one available service not already used in that bucket
  const sourceLanes = useMemo(() => {
    const lanes = MONTH_KEYS.map(mk => ({ mk, items: [] }));
    for (const mk of MONTH_KEYS) {
      for (const w of months[mk]) {
        const id = w.date;
        const avail = availabilityByWeekend[id] || [];
        // For source, create both service options that are available
        if (avail.includes(SERVICES.RNI)) lanes.find(l=>l.mk===mk).items.push({ weekend: id, service: SERVICES.RNI });
        if (avail.includes(SERVICES.COA)) lanes.find(l=>l.mk===mk).items.push({ weekend: id, service: SERVICES.COA });
      }
    }
    return lanes;
  }, []);

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
        <b>DragBuckets:</b> Drag a “Month D — Service” chip from the horizontal lanes into <em>Most</em> or <em>Least</em>. Ranks renumber automatically. Click the ✖ on a chip to remove.
      </div>

      {/* Source lanes (horizontal scroll) */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, borderBottom: '1px dashed #e5e7eb', marginBottom: 12 }}>
        {sourceLanes.map((lane, idx) => (
          <div key={lane.mk} style={{ minWidth: 240 }}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>{MONTH_FULL[idx]}</div>
            <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8 }}>
              {lane.items.map((it, i) => (
                <div
                  key={`${it.weekend}-${it.service}-${i}`}
                  draggable={!submitted && requireName}
                  onDragStart={(e)=>handleDragStart(e, it)}
                  title="Drag to Most/Least"
                  style={{ whiteSpace: 'nowrap', fontSize: 12, border:'1px solid #e2e8f0', borderRadius: 999, padding:'6px 10px', background:'#fff' }}
                >
                  {fmtLabel(it.weekend)} — <b>{it.service}</b>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          onDragOver={(e)=>e.preventDefault()}
          onDrop={()=>handleDrop('Most')}
          style={{ minHeight: 140, border:'2px dashed #bfdbfe', borderRadius: 12, padding: 10, background:'#f8fafc' }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Most</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {mostList.map((x, idx)=>(
              <span key={`${x.weekend}-${x.service}`} style={{ fontSize:12, border:'1px solid #93c5fd', borderRadius:999, padding:'6px 10px', background:'#dbeafe' }}>
                #{idx+1} {fmtLabel(x.weekend)} — <b>{x.service}</b>
                {!submitted && (
                  <button onClick={()=>removeFrom('Most', x.weekend)} title="Remove" style={{ marginLeft:8, border:'none', background:'transparent', cursor:'pointer' }}>✖</button>
                )}
              </span>
            ))}
          </div>
        </div>

        <div
          onDragOver={(e)=>e.preventDefault()}
          onDrop={()=>handleDrop('Least')}
          style={{ minHeight: 140, border:'2px dashed #fecaca', borderRadius: 12, padding: 10, background:'#fff1f2' }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Least</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {leastList.map((x, idx)=>(
              <span key={`${x.weekend}-${x.service}`} style={{ fontSize:12, border:'1px solid #fda4af', borderRadius:999, padding:'6px 10px', background:'#ffe4e6' }}>
                #{idx+1} {fmtLabel(x.weekend)} — <b>{x.service}</b>
                {!submitted && (
                  <button onClick={()=>removeFrom('Least', x.weekend)} title="Remove" style={{ marginLeft:8, border:'none', background:'transparent', cursor:'pointer' }}>✖</button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   QuickAdd (starts January)
   ========================= */
function QuickAdd({ requireName, submitted, prefs, setMost, setLeast }) {
  const sortedIds = useMemo(()=> {
    const ids = [...allWeekendIds];
    ids.sort((a,b)=> allWeekendIds.indexOf(a)-allWeekendIds.indexOf(b));
    return ids;
  }, []);
  const [rows, setRows] = useState(()=> sortedIds.map(id => ({ weekend:id, mostService: SERVICES.NONE, mostChoice:0, leastService: SERVICES.NONE, leastChoice:0 })));

  useEffect(()=>{
    // hydrate from prefs when switching in
    setRows(sortedIds.map(id => {
      const p = prefs[id] || {};
      return {
        weekend: id,
        mostService: p.mostService ?? SERVICES.NONE,
        mostChoice: p.mostChoice ?? 0,
        leastService: p.leastService ?? SERVICES.NONE,
        leastChoice: p.leastChoice ?? 0,
      };
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  const onRowChange = (i, field, val) => {
    const id = rows[i].weekend;
    const avail = availabilityByWeekend[id] || [];
    const next = rows.slice();
    // enforce availability & mutual exclusion between Most/Least services
    if (field === 'mostService') {
      if (!avail.includes(val)) return alert('Service not available for this weekend.');
      next[i].mostService = val;
      if (next[i].leastService === val) next[i].leastService = SERVICES.NONE;
      setMost(id, { ...(prefs[id]||{}), mostService: val, mostChoice: next[i].mostChoice });
    } else if (field === 'leastService') {
      if (!avail.includes(val)) return alert('Service not available for this weekend.');
      next[i].leastService = val;
      if (next[i].mostService === val) next[i].mostService = SERVICES.NONE;
      setLeast(id, { ...(prefs[id]||{}), leastService: val, leastChoice: next[i].leastChoice });
    } else if (field === 'mostChoice') {
      next[i].mostChoice = val;
      setMost(id, { ...(prefs[id]||{}), mostService: next[i].mostService, mostChoice: val });
    } else if (field === 'leastChoice') {
      next[i].leastChoice = val;
      setLeast(id, { ...(prefs[id]||{}), leastService: next[i].leastService, leastChoice: val });
    }
    setRows(next);
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
        <b>QuickAdd:</b> Work top-to-bottom. Pick a service (only available ones) and a choice number for either Most or Least. Mutual exclusivity is enforced per weekend.
      </div>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', background:'#f8fafc', fontWeight:800, fontSize:13 }}>
          <div style={{ padding:'8px 10px' }}>Weekend (Sat)</div>
          <div style={{ padding:'8px 10px' }}>Most: Service</div>
          <div style={{ padding:'8px 10px' }}>Most: Choice</div>
          <div style={{ padding:'8px 10px' }}>Least: Service</div>
          <div style={{ padding:'8px 10px' }}>Least: Choice</div>
        </div>
        <div style={{ maxHeight: 520, overflowY:'auto' }}>
          {rows.map((r, i)=> {
            const id = r.weekend;
            const avail = availabilityByWeekend[id] || [];
            return (
              <div key={id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', borderTop:'1px solid #e5e7eb' }}>
                <div style={{ padding:'8px 10px', fontWeight:700 }}>{fmtLabel(id)}</div>
                <div style={{ padding:'8px 10px' }}>
                  <select disabled={submitted || !requireName} value={r.mostService}
                          onChange={(e)=>onRowChange(i,'mostService', e.target.value)}
                          style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}>
                    <option value="none">—</option>
                    {avail.includes(SERVICES.RNI) && <option value="RNI">RNI</option>}
                    {avail.includes(SERVICES.COA) && <option value="COA">COA</option>}
                  </select>
                </div>
                <div style={{ padding:'8px 10px' }}>
                  <ChoiceSelect disabled={submitted || r.mostService===SERVICES.NONE || !requireName}
                                value={r.mostChoice}
                                onChange={(v)=>onRowChange(i,'mostChoice', v)}
                                placeholder="—"
                                maxN={allWeekendIds.length}/>
                </div>
                <div style={{ padding:'8px 10px' }}>
                  <select disabled={submitted || !requireName} value={r.leastService}
                          onChange={(e)=>onRowChange(i,'leastService', e.target.value)}
                          style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}>
                    <option value="none">—</option>
                    {avail.includes(SERVICES.RNI) && <option value="RNI">RNI</option>}
                    {avail.includes(SERVICES.COA) && <option value="COA">COA</option>}
                  </select>
                </div>
                <div style={{ padding:'8px 10px' }}>
                  <ChoiceSelect disabled={submitted || r.leastService===SERVICES.NONE || !requireName}
                                value={r.leastChoice}
                                onChange={(v)=>onRowChange(i,'leastChoice', v)}
                                placeholder="—"
                                maxN={allWeekendIds.length}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================
   RankBoard (click to add/remove)
   - Shift+Click sets “Least”
   ========================= */
function RankBoard({ requireName, submitted, prefs, setMost, setLeast }) {
  const makeList = (kind) => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (kind==='Most' && p.mostService!==SERVICES.NONE && p.mostChoice>0) arr.push({ weekend:id, service:p.mostService, choice:p.mostChoice });
      if (kind==='Least'&& p.leastService!==SERVICES.NONE && p.leastChoice>0) arr.push({ weekend:id, service:p.leastService, choice:p.leastChoice });
    }
    arr.sort((a,b)=> a.choice-b.choice || allWeekendIds.indexOf(a.weekend)-allWeekendIds.indexOf(b.weekend));
    return arr;
  };
  const mostList = useMemo(()=>makeList('Most'), [prefs]);
  const leastList = useMemo(()=>makeList('Least'), [prefs]);

  const toggle = (id, svc, isLeast) => {
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return alert('Service not available for this weekend.');
    if (isLeast) {
      // remove from most, add to least
      setMost(id, { ...(prefs[id]||{}), mostService: SERVICES.NONE, mostChoice: 0 });
      const next = leastList.length + 1;
      setLeast(id, { ...(prefs[id]||{}), leastService: svc, leastChoice: next });
    } else {
      // remove from least, add to most
      setLeast(id, { ...(prefs[id]||{}), leastService: SERVICES.NONE, leastChoice: 0 });
      const next = mostList.length + 1;
      setMost(id, { ...(prefs[id]||{}), mostService: svc, mostChoice: next });
    }
  };

  return (
    <div>
      <div style={{ fontSize: 13, color: '#334155', marginBottom: 8 }}>
        <b>RankBoard:</b> Click a weekend’s RNI/COA pill to add to <em>Most</em>. <b>Shift+Click</b> adds to <em>Least</em>. Click again to remove.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Available board */}
        <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:10 }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>Available</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:8 }}>
            {allWeekendIds.map(id=>{
              const avail = availabilityByWeekend[id] || [];
              return (
                <div key={id} style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:8, background:'#fff' }}>
                  <div style={{ fontWeight:700, marginBottom:6 }}>{fmtLabel(id)}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {avail.includes(SERVICES.RNI) && (
                      <button disabled={submitted || !requireName}
                              onClick={(e)=>toggle(id, SERVICES.RNI, e.shiftKey)}
                              style={{ fontSize:12, border:'1px solid #93c5fd', background:'#dbeafe', borderRadius:999, padding:'6px 10px', cursor:'pointer' }}>
                        RNI
                      </button>
                    )}
                    {avail.includes(SERVICES.COA) && (
                      <button disabled={submitted || !requireName}
                              onClick={(e)=>toggle(id, SERVICES.COA, e.shiftKey)}
                              style={{ fontSize:12, border:'1px solid #c7d2fe', background:'#e0e7ff', borderRadius:999, padding:'6px 10px', cursor:'pointer' }}>
                        COA
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Selections */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:10, background:'#f8fafc' }}>
            <div style={{ fontWeight:800, marginBottom:8 }}>Most</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {mostList.map((x, idx)=>(
                <span key={`${x.weekend}-${x.service}`} style={{ fontSize:12, border:'1px solid #93c5fd', borderRadius:999, padding:'6px 10px', background:'#dbeafe' }}>
                  #{idx+1} {fmtLabel(x.weekend)} — <b>{x.service}</b>
                  {!submitted && (
                    <button onClick={()=>setMost(x.weekend, { ...(prefs[x.weekend]||{}), mostService: SERVICES.NONE, mostChoice: 0 })} title="Remove" style={{ marginLeft:8, border:'none', background:'transparent', cursor:'pointer' }}>✖</button>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:10, background:'#fff1f2' }}>
            <div style={{ fontWeight:800, marginBottom:8 }}>Least</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {leastList.map((x, idx)=>(
                <span key={`${x.weekend}-${x.service}`} style={{ fontSize:12, border:'1px solid #fda4af', borderRadius:999, padding:'6px 10px', background:'#ffe4e6' }}>
                  #{idx+1} {fmtLabel(x.weekend)} — <b>{x.service}</b>
                  {!submitted && (
                    <button onClick={()=>setLeast(x.weekend, { ...(prefs[x.weekend]||{}), leastService: SERVICES.NONE, leastChoice: 0 })} title="Remove" style={{ marginLeft:8, border:'none', background:'transparent', cursor:'pointer' }}>✖</button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Identity & Preview
   ========================= */
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

function LivePreview({ profile, prefs }) {
  const { top, bottom } = useMemo(()=>{
    const t=[], b=[];
    for (const [id,p] of Object.entries(prefs)) {
      if (p.mostService!==SERVICES.NONE && p.mostChoice>0) t.push({ weekend:id, service:p.mostService, choice:p.mostChoice });
      if (p.leastService!==SERVICES.NONE && p.leastChoice>0) b.push({ weekend:id, service:p.leastService, choice:p.leastChoice });
    }
    t.sort((a,b)=> a.choice-b.choice || allWeekendIds.indexOf(a.weekend)-allWeekendIds.indexOf(b.weekend));
    b.sort((a,b)=> a.choice-b.choice || allWeekendIds.indexOf(a.weekend)-allWeekendIds.indexOf(b.weekend));
    return { top:t, bottom:b };
  }, [prefs]);
  return (
    <div style={{ position:'sticky', top:96, border:'1px solid #e5e7eb', borderRadius:12, padding:12, background:'#fff', maxHeight:'calc(100vh - 120px)', overflow:'auto' }}>
      <div style={{ fontWeight:800, marginBottom:6 }}>Live Preview</div>
      <div style={{ fontSize:12, color:'#475569', marginBottom:8 }}>
        {profile.name ? <span><b>{profile.name}</b>{profile.email ? ` • ${profile.email}`:''}</span> : 'Pick your name to begin'}
      </div>
      <div>
        <div style={{ fontWeight:700, margin:'8px 0 4px' }}>Most</div>
        {top.length===0 ? <div style={{ fontSize:12, color:'#64748b' }}>— none —</div> :
          <ol style={{ paddingLeft:18, margin:0 }}>
            {top.map(x=> <li key={`t-${x.weekend}-${x.service}`} style={{ fontSize:12, margin:'2px 0' }}>{fmtLabel(x.weekend)} — <b>{x.service}</b> (#{x.choice})</li>)}
          </ol>}
        <div style={{ fontWeight:700, margin:'8px 0 4px' }}>Least</div>
        {bottom.length===0 ? <div style={{ fontSize:12, color:'#64748b' }}>— none —</div> :
          <ol style={{ paddingLeft:18, margin:0 }}>
            {bottom.map(x=> <li key={`b-${x.weekend}-${x.service}`} style={{ fontSize:12, margin:'2px 0' }}>{fmtLabel(x.weekend)} — <b>{x.service}</b> (#{x.choice})</li>)}
          </ol>}
      </div>
    </div>
  );
}

/* =========================
   Main App
   ========================= */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));
  const params = new URLSearchParams(window.location.search);
  const urlUI = params.get('ui'); // calendar, drag, quick, rank
  const [ui, setUI] = useState(['calendar','drag','quick','rank'].includes(urlUI||'') ? urlUI : 'calendar');

  /* Command palette */
  const palette = useCommandPalette((id)=>{
    if (id==='ui:calendar') setUI('calendar');
    if (id==='ui:drag') setUI('drag');
    if (id==='ui:quick') setUI('quick');
    if (id==='ui:rank') setUI('rank');
    if (id==='act:collapse') setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, true])));
    if (id==='act:expand') setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, false])));
  });

  /* Firebase badge */
  const [fbOK, setFbOK] = useState(null); // null=unknown, true=ok, false=fail

  useEffect(() => {
    (async () => {
      try {
        const token = (typeof __initial_auth_token !== 'undefined') ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, async (u) => {
          if (u) setUid(u.uid);
          setStatus('Loading profile & preferences…');
          // quick connectivity probe: read any doc (non-fatal)
          try {
            const testRef = doc(collection(db, 'healthcheck'), 'ping');
            await getDoc(testRef);
            setFbOK(true);
          } catch {
            setFbOK(false);
          }
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setFbOK(false);
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
        setStatus(`Load error: ${e.message}`);
      }
    })();
  }, [uid]);

  /* one-time: auto-pick the only available service (both Most & Least) */
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

  /* Setters that enforce mutual exclusivity per day */
  const setMost = useCallback((id, v) => {
    setPrefs(prev => {
      const prevDay = prev[id] || {};
      const newDay = { ...prevDay, mostService: v.mostService, mostChoice: v.mostChoice };
      if (v.mostService !== SERVICES.NONE && prevDay.leastService === v.mostService) {
        newDay.leastService = SERVICES.NONE;
        newDay.leastChoice = 0;
      }
      return { ...prev, [id]: newDay };
    });
  }, []);
  const setLeast = useCallback((id, v) => {
    setPrefs(prev => {
      const prevDay = prev[id] || {};
      const newDay = { ...prevDay, leastService: v.leastService, leastChoice: v.leastChoice };
      if (v.leastService !== SERVICES.NONE && prevDay.mostService === v.leastService) {
        newDay.mostService = SERVICES.NONE;
        newDay.mostChoice = 0;
      }
      return { ...prev, [id]: newDay };
    });
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
    const top = [];
    const bottom = [];
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
      top10: top.map(t => ({ weekend: t.weekend, choice: t.choice, rank: t.choice, service: t.service })),
      bottom10: bottom.map(b => ({ weekend: b.weekend, choice: b.choice, rank: b.choice, service: b.service })),
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
      ...top.map(t => ({ attendee: profile.name, email: profile.email || '', kind: 'MOST',  choice: t.choice, service: t.service, weekend: fmtLabel(t.weekend) })),
      ...bottom.map(b => ({ attendee: profile.name, email: profile.email || '', kind: 'LEAST', choice: b.choice, service: b.service, weekend: fmtLabel(b.weekend) })),
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

  /* Admin CSV (unchanged behavior when ?admin=1) */
  const isAdmin = params.get('admin') === '1';
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

  /* counts display */
  const requireName = Boolean(profile?.name);

  /* Centered layout: full-bleed body → centered container with gutters */
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontSize:15, display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:1200, padding:'0 24px' }}>
        {/* Sticky top bar with jump + actions + firebase badge + mode switcher */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(4px)', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'8px 0' }}>
            <strong style={{ marginRight: 8 }}>Jump:</strong>
            {MONTH_KEYS.map((mk, i) => (
              <button key={mk} onClick={() => jumpTo(mk)} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                {MONTH_FULL[i].slice(0,3)}
              </button>
            ))}
            <span style={{ marginLeft:8, fontSize:12, padding:'2px 8px', borderRadius:999, border:'1px solid #e5e7eb', background:'#fff' }}>
              Firebase: {fbOK==null ? '…' : fbOK ? '✓ Connected' : '✗ Error'}
            </span>
            <span style={{ flex: 1 }} />
            {/* Mode switch */}
            <div style={{ display:'flex', gap:6 }}>
              {['calendar','drag','quick','rank'].map(m => (
                <a key={m}
                   href={`?ui=${m}`}
                   onClick={(e)=>{e.preventDefault(); setUI(m);}}
                   style={{
                     padding:'6px 10px', borderRadius: 999, border: '1px solid #e5e7eb',
                     background: ui===m ? '#111827' : '#fff',
                     color: ui===m ? '#fff' : '#111827',
                     textDecoration:'none', fontSize:12
                   }}>
                  {m==='calendar'?'Calendar': m==='drag'?'DragBuckets': m==='quick'?'QuickAdd':'RankBoard'}
                </a>
              ))}
              <button onClick={()=>palette.setOpen(true)} title="Command Palette (Cmd/Ctrl-K)" style={{ padding:'6px 10px', borderRadius:999, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>
                ⌘K
              </button>
            </div>
            {/* Controls */}
            <button onClick={() => collapseAll(true)}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Collapse all</button>
            <button onClick={() => collapseAll(false)} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Expand all</button>
            <button onClick={downloadMyCSV}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #059669', background: '#10b981', color:'#fff', fontSize:12 }}>Preview CSV</button>
            <button onClick={downloadMyWord} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #4f46e5', background: '#6366f1', color:'#fff', fontSize:12 }}>Preview Word</button>
          </div>
        </div>

        {/* Header + instructions */}
        <div style={{ display:'grid', gridTemplateColumns:'1.7fr 0.3fr', gap:24, alignItems:'start', paddingTop:12 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:800, color:'#0f172a', margin:'0 0 6px' }}>2026 Preferences (RNI & COA)</h1>
            <ol style={{ margin: '8px 0 12px', paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.45, listStyle: 'decimal' }}>
              <li style={{ marginBottom: 4 }}>Select your name below. You will see the number of weekends you wanted.</li>
              <li style={{ marginBottom: 4 }}>Choose as many <strong>Most</strong> and <strong>Least</strong> preferred weekends as you want. For each, select <b>service</b> and <b>choice #</b>. (Picking more weekends increases the chance you get more preferred ones overall.)</li>
              <li style={{ marginBottom: 4 }}>You can download a preview anytime (CSV or Word).</li>
              <li style={{ marginBottom: 4 }}>Submit to lock your preferences once you are done.</li>
            </ol>
            <div style={{ fontSize: 13, color: '#0f5132', background: '#d1e7dd', border: '1px solid #badbcc', padding: '10px 12px', borderRadius: 10, marginBottom: 10 }}>
              Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible. This is a <b>ranking</b> process.
            </div>
            <div className="mb-3 text-sm text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-md p-3" style={{ marginBottom:8 }}>
              Status: {status} • Most choices: {counts.mostCount} • Least choices: {counts.leastCount} {submitted ? '• (Locked after submission)' : ''}
            </div>
            <AttendingIdentity profile={profile} saveProfile={saveProfile} />

            {/* Per-mode mini-instructions */}
            <div style={{ fontSize:13, color:'#334155', margin:'8px 0' }}>
              {ui === 'calendar' && <>Mode: <b>Calendar</b> — expand months and set service + choice for each weekend. Radios auto-select when only one service is open.</>}
              {ui === 'drag' && <>Mode: <b>DragBuckets</b> — drag chips from month lanes into Most/Least. Ranks renumber automatically.</>}
              {ui === 'quick' && <>Mode: <b>QuickAdd</b> — fast dropdowns starting from January. Mutual exclusivity enforced.</>}
              {ui === 'rank' && <>Mode: <b>RankBoard</b> — click a service to add to <em>Most</em>; <b>Shift+Click</b> adds to <em>Least</em>; click again to remove.</>}
            </div>

            {/* Main work area (2-column: content + live preview) */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24 }}>
              <div>
                {ui === 'calendar' && (
                  <div style={{
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fit, minmax(420px, 1fr))',
                    gap:32, alignItems:'stretch', justifyContent:'center', justifyItems:'stretch'
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
                        cardRef={null}
                        locked={submitted || !requireName}
                      />
                    ))}
                  </div>
                )}

                {ui === 'drag' && (
                  <DragBuckets
                    months={months}
                    prefs={prefs}
                    setMost={setMost}
                    setLeast={setLeast}
                    availabilityByWeekend={availabilityByWeekend}
                    submitted={submitted}
                    requireName={requireName}
                  />
                )}

                {ui === 'quick' && (
                  <QuickAdd
                    requireName={requireName}
                    submitted={submitted}
                    prefs={prefs}
                    setMost={setMost}
                    setLeast={setLeast}
                  />
                )}

                {ui === 'rank' && (
                  <RankBoard
                    requireName={requireName}
                    submitted={submitted}
                    prefs={prefs}
                    setMost={setMost}
                    setLeast={setLeast}
                  />
                )}

                {/* Submit */}
                <div style={{ padding: '12px 0 24px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
                  <button
                    disabled={!profile.name || submitted}
                    onClick={handleSubmit}
                    style={{
                      padding:'12px 18px',
                      borderRadius:12,
                      fontWeight:800,
                      border:'none',
                      color: (!profile.name || submitted) ? '#6b7280' : '#fff',
                      background: (!profile.name || submitted) ? '#d1d5db' : '#2563eb',
                      cursor: (!profile.name || submitted) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {submitted ? 'Submitted (Locked)' : 'Submit Final Preferences'}
                  </button>
                  <span style={{ fontSize:13, color:'#64748b' }}>{submitted ? 'Locked. Downloads reflect your final choices.' : 'Tip: use Preview CSV/Word above to save your current selections.'}</span>
                </div>

                {/* Admin CSV */}
                {isAdmin && (
                  <div style={{ borderTop:'1px solid #e5e7eb', paddingTop:12, marginBottom:24 }}>
                    <div style={{ fontWeight:800, marginBottom:8 }}>Admin export</div>
                    {!adminLoaded ? <div style={{ fontSize:13, color:'#64748b' }}>Loading …</div> :
                      <button onClick={()=>{
                        const rows = adminRows.map(r=>({
                          attendee:r.attendee, email:r.email, kind:r.kind, choice:r.choice, service:r.service,
                          weekend:fmtLabel(r.weekend), submittedAt:r.submittedAt
                        }));
                        downloadCSV('admin_all_preferences.csv', rows);
                      }} style={{ padding:'8px 12px', borderRadius:10, border:'1px solid #e5e7eb', background:'#fff' }}>
                        Download admin.csv
                      </button>}
                  </div>
                )}
              </div>

              {/* Live Preview */}
              <LivePreview profile={profile} prefs={prefs} />
            </div>

            {/* Build label */}
            <div style={{ textAlign:"right", color:"#64748b", fontSize:12, paddingBottom:24 }}>
              Build: {__APP_VERSION__}
            </div>
          </div>

          {/* Right gutter spacer to ensure perfect centering on wide screens */}
          <div />
        </div>
      </div>

      {/* Command Palette modal */}
      {palette.open && (
        <div onClick={()=>palette.setOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.15)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:100 }}>
          <div onClick={(e)=>e.stopPropagation()} style={{ width:'min(720px, 92vw)', borderRadius:12, background:'#fff', boxShadow:'0 10px 30px rgba(0,0,0,0.2)', overflow:'hidden' }}>
            <div style={{ padding:10, borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>⌘K</span>
              <input autoFocus value={palette.q} onChange={(e)=>palette.setQ(e.target.value)} placeholder="Type a command…" style={{ flex:1, padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 }} />
            </div>
            <div style={{ maxHeight:300, overflowY:'auto' }}>
              {palette.items.length===0 ? <div style={{ padding:12, color:'#64748b', fontSize:13 }}>No matches</div> :
                palette.items.map(it=>(
                  <button key={it.id} onClick={()=>palette.select(it.id)} style={{ width:'100%', textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #f1f5f9', background:'#fff' }}>
                    {it.label}
                  </button>
                ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
