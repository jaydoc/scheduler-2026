import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, collectionGroup, getDocs, query } from 'firebase/firestore';

/* Build tag */
const __APP_VERSION__ = "v13.1 — availability guards + Month DD labels";
console.log("Scheduler build:", __APP_VERSION__);

/* Firebase config: prefer injected, else global fallback, else local */
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
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch {}
  if (typeof window !== 'undefined' && window.FALLBACK_FIREBASE_CONFIG) return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();

const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v13.1";
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

/* Calendar (Saturdays) */
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

/* Availability */
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

/* Display date as "Month DD" */
function displayDate(id) {
  // id like "2026-07-18"
  const mm = id.slice(5,7);
  const dd = String(parseInt(id.slice(8,10), 10)); // no leading zero
  const name = MONTH_FULL[parseInt(mm,10)-1] || '';
  return `${name} ${dd}`;
}

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

/* Choice select */
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

/* Limited radio shows only available services */
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

/* Month card */
function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, locked }) {
  const idx = parseInt(mk, 10) - 1;
  const color = MONTH_COLORS[idx] ?? { bg: '#eeeeee', fg: '#111111', border: '#cccccc' };

  return (
    <div
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
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{displayDate(w.date)}</div>
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

/* 2×6 Grid */
function CalendarGrid({ prefs, setMost, setLeast, collapsed, setCollapsed, submitted }) {
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
        gridTemplateColumns: 'repeat(2, minmax(420px, 1fr))',
        gap: '32px',
        alignItems: 'stretch',
        justifyContent: 'center',
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
            locked={submitted}
          />
        ))}
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 12px 24px', display:'flex', gap:8, justifyContent:'center', overflowX:'auto' }}>
        {MONTH_KEYS.map((mk, i) => (
          <a
            key={mk}
            onClick={(e) => { e.preventDefault(); jumpTo(mk); }}
            href={`#month-${mk}`}
            style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, textDecoration:'none', color:'#0f172a', flexShrink:0 }}
          >
            {MONTH_FULL[i]}
          </a>
        ))}
      </div>
    </>
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
function docHtml(name, email, top10, bottom10) {
  const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const row = (kind, r) => `
    <tr>
      <td>${esc(kind)}</td>
      <td>${esc(r.choice)}</td>
      <td>${esc(r.service || '')}</td>
      <td>${esc(displayDate(r.weekend))}</td>
    </tr>`;
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>Preferences</title></head>
  <body>
    <h2>2026 Weekend Preferences</h2>
    <p><b>Name:</b> ${esc(name || '')} &nbsp; <b>Email:</b> ${esc(email || '')}</p>
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead style="background:#f3f4f6">
        <tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Saturday)</th></tr>
      </thead>
      <tbody>
        ${top10.map(r => row('MOST', r)).join('')}
        ${bottom10.map(r => row('LEAST', r)).join('')}
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
  </body>
  </html>`;
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

/* Command Palette */
function CommandPalette({ months, availabilityByWeekend, prefs, safeSetMost, safeSetLeast, submitted }) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [preview, setPreview] = React.useState({ ok: false, msg: "Type: “jul 18 rni m” or “nov 21 coa l3”" });
  const inputRef = React.useRef(null);

  const MONTH_TO_MM = {
    jan:'01', january:'01',
    feb:'02', february:'02',
    mar:'03', march:'03',
    apr:'04', april:'04',
    may:'05',
    jun:'06', june:'06',
    jul:'07', july:'07',
    aug:'08', august:'08',
    sep:'09', sept:'09', september:'09',
    oct:'10', october:'10',
    nov:'11', november:'11',
    dec:'12', december:'12',
  };

  const nextRanks = React.useMemo(() => {
    let most = 0, least = 0;
    for (const p of Object.values(prefs || {})) {
      if (p?.mostChoice > most) most = p.mostChoice;
      if (p?.leastChoice > least) least = p.leastChoice;
    }
    return { nextMost: most + 1, nextLeast: least + 1 };
  }, [prefs]);

  const weekendIds = React.useMemo(() => {
    const out = new Set();
    Object.values(months).forEach(arr => arr.forEach(w => out.add(w.date)));
    return out;
  }, [months]);

  function parseCommand(raw) {
    const s = (raw || "").trim().toLowerCase();
    if (!s) return { ok: false, msg: "Type: “jul 18 rni m” or “nov 21 coa l3”" };

    const tokens = s.split(/\s+/);

    let mm = null;
    for (const t of tokens) { if (MONTH_TO_MM[t]) { mm = MONTH_TO_MM[t]; break; } }

    let dd = null;
    for (const t of tokens) {
      const m = t.match(/^(\d{1,2})$/);
      if (m) { dd = m[1].padStart(2, '0'); break; }
      const m2 = t.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
      if (m2) { dd = m2[2].padStart(2, '0'); if (!mm) mm = String(m2[1]).padStart(2,'0'); }
    }

    let service = null;
    if (/\brni\b/.test(s)) service = 'RNI';
    if (/\bcoa\b/.test(s)) service = 'COA';

    let listType = null;
    let explicitRank = null;
    for (const t of tokens) {
      if (/^m(ost)?\d*$/.test(t)) {
        listType = 'most';
        const n = t.replace(/[^\d]/g,'');
        if (n) explicitRank = parseInt(n,10);
      } else if (/^l(east)?\d*$/.test(t)) {
        listType = 'least';
        const n = t.replace(/[^\d]/g,'');
        if (n) explicitRank = parseInt(n,10);
      }
    }
    if (!explicitRank) {
      const tr = s.match(/\b(?:m|most|l|least)\s*(\d{1,2})\b/);
      if (tr) explicitRank = parseInt(tr[1], 10);
    }

    if (!mm || !dd) return { ok: false, msg: "Need month and day. Example: “jul 18 rni m”" };
    const id = `${YEAR}-${mm}-${dd}`;
    if (!weekendIds.has(id)) return { ok: false, msg: `No weekend found for ${displayDate(id)}.` };

    const avail = availabilityByWeekend[id] || [];
    let chosenService = service;

    if (!listType) return { ok: false, msg: "Add “m” (Most) or “l” (Least). Example: “nov 21 coa l3”" };
    if (avail.length === 0) return { ok: false, msg: "That weekend is fully assigned." };

    if (!chosenService) {
      if (avail.length === 1) chosenService = avail[0];
      else return { ok: false, msg: "Specify service: rni or coa." };
    } else {
      if (!avail.includes(chosenService)) return { ok: false, msg: `Service ${chosenService} is not open on ${displayDate(id)}.` };
    }

    const rank = explicitRank || (listType === 'most' ? nextRanks.nextMost : nextRanks.nextLeast);
    if (rank <= 0) return { ok: false, msg: "Rank must be ≥ 1." };

    return {
      ok: true,
      msg: `${listType === 'most' ? 'MOST' : 'LEAST'} #${rank} — ${chosenService} — ${displayDate(id)}`,
      action: { id, listType, chosenService, rank }
    };
  }

  function applyAction(action) {
    if (!action || submitted) return;
    const { id, listType, chosenService, rank } = action;
    if (listType === 'most') safeSetMost(id, { mostService: chosenService, mostChoice: rank });
    else safeSetLeast(id, { leastService: chosenService, leastChoice: rank });
  }

  useEffect(() => { setPreview(parseCommand(input)); }, [input, prefs]); // eslint-disable-line

  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || '';
      const isTyping = /INPUT|TEXTAREA|SELECT/.test(tag);
      if (e.key === '/' && !isTyping && !open) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      } else if (e.key === 'Enter' && open) {
        const p = parseCommand(input);
        if (p.ok && p.action) {
          applyAction(p.action);
          setInput('');
          setPreview({ ok: false, msg: "Added. Next command…" });
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, input, prefs, submitted]); // eslint-disable-line

  if (!open) {
    return (
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 12px 8px', color:'#475569', fontSize:12 }}>
        Tip: press <code style={{ background:'#f1f5f9', padding:'2px 6px', borderRadius:6 }}>/</code> for the command palette
        {submitted ? ' (disabled after submission).' : '.'}
      </div>
    );
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.25)',
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop: '12vh'
    }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(900px, 92vw)', background:'#fff', borderRadius: 12, boxShadow:'0 20px 60px rgba(0,0,0,0.25)', overflow:'hidden' }}
      >
        <div style={{ padding: 12, borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='Try: "jul 18 rni m" or "nov 21 coa l3"'
            style={{ flex:1, padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14 }}
            disabled={submitted}
          />
          <button
            onClick={() => setOpen(false)}
            style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}
          >Close</button>
        </div>

        <div style={{ padding: 12, fontSize: 13 }}>
          <div style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid ' + (preview.ok ? '#86efac' : '#fecaca'),
            background: preview.ok ? '#ecfdf5' : '#fff1f2',
            color: preview.ok ? '#065f46' : '#7f1d1d',
            marginBottom: 10
          }}>
            {preview.msg}
          </div>

          <div style={{ color:'#475569', lineHeight:1.5 }}>
            <b>Syntax</b>: <code>month day [service] [m|l][rank]</code>
            <ul style={{ margin:'6px 0 0 18px' }}>
              <li>Examples: <code>jul 18 rni m</code>, <code>nov 21 coa l3</code>, <code>sep 12 m</code> (auto-picks service if only one open)</li>
              <li>Services: <code>rni</code> or <code>coa</code>. Required if both are open.</li>
              <li>Lists: <code>m</code> or <code>most</code>, <code>l</code> or <code>least</code>.</li>
              <li>Rank optional; auto-increments to next available.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* QuickAdd */
function QuickAdd({ months, availabilityByWeekend, prefs, safeSetMost, safeSetLeast, submitted }) {
  const [month, setMonth] = React.useState('01');
  const [weekendId, setWeekendId] = React.useState('');
  const [service, setService] = React.useState('');
  const [lastAction, setLastAction] = React.useState(null);

  const options = React.useMemo(() => {
    const arr = months[month] || [];
    return arr.map(w => ({ id: w.date, label: `${displayDate(w.date)} (${w.day})` }));
  }, [months, month]);

  const nextRanks = React.useMemo(() => {
    let most = 0, least = 0;
    for (const p of Object.values(prefs || {})) {
      if (p?.mostChoice > most) most = p.mostChoice;
      if (p?.leastChoice > least) least = p.leastChoice;
    }
    return { nextMost: most + 1, nextLeast: least + 1 };
  }, [prefs]);

  const avail = availabilityByWeekend[weekendId] || [];
  React.useEffect(() => {
    if (weekendId && avail.length === 1) setService(avail[0]);
    if (weekendId && avail.length > 1 && !avail.includes(service)) setService('');
  }, [weekendId, avail]); // eslint-disable-line

  const canPickService = avail.length > 0;
  const disabled = submitted;

  function doAdd(kind) {
    if (!weekendId) { alert('Pick a weekend'); return; }
    if (avail.length === 0) { alert('That weekend is fully assigned.'); return; }
    if (!service) { alert('Pick service (RNI/COA)'); return; }

    const rank = kind === 'most' ? nextRanks.nextMost : nextRanks.nextLeast;

    if (kind === 'most') {
      const ok = safeSetMost(weekendId, { mostService: service, mostChoice: rank });
      if (ok) setLastAction({ kind, weekendId, service, rank });
    } else {
      const ok = safeSetLeast(weekendId, { leastService: service, leastChoice: rank });
      if (ok) setLastAction({ kind, weekendId, service, rank });
    }
  }

  function undo() {
    if (!lastAction) return;
    const { kind, weekendId } = lastAction;
    if (kind === 'most') safeSetMost(weekendId, { mostService: 'none', mostChoice: 0 });
    else safeSetLeast(weekendId, { leastService: 'none', leastChoice: 0 });
    setLastAction(null);
  }

  return (
    <div style={{ maxWidth:1120, margin:'0 auto', padding:'8px 12px 12px' }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap',
                    border:'1px solid #e5e7eb', borderRadius:12, padding:10, background:'#fff' }}>
        <strong style={{ fontSize:14 }}>Quick Add:</strong>

        <select value={month} onChange={e=>{setMonth(e.target.value); setWeekendId('');}}
                style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}>
          {MONTH_KEYS.map((mk,i)=> <option key={mk} value={mk}>{MONTH_FULL[i]}</option>)}
        </select>

        <select value={weekendId} onChange={e=>setWeekendId(e.target.value)}
                style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, minWidth:220 }}>
          <option value="">Weekend…</option>
          {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>

        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:13 }}>
            <input type="radio" name="qa-service" disabled={!canPickService || !avail.includes('RNI') || disabled}
                   checked={service==='RNI'} onChange={()=>setService('RNI')} />
            RNI
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:13 }}>
            <input type="radio" name="qa-service" disabled={!canPickService || !avail.includes('COA') || disabled}
                   checked={service==='COA'} onChange={()=>setService('COA')} />
            COA
          </label>
        </div>

        <button onClick={()=>doAdd('most')}
                disabled={disabled || !weekendId || !service}
                style={{ padding:'6px 10px', borderRadius:10, border:'1px solid #2563eb', background:'#3b82f6', color:'#fff' }}>
          Add to Most #{nextRanks.nextMost}
        </button>
        <button onClick={()=>doAdd('least')}
                disabled={disabled || !weekendId || !service}
                style={{ padding:'6px 10px', borderRadius:10, border:'1px solid #dc2626', background:'#ef4444', color:'#fff' }}>
          Add to Least #{nextRanks.nextLeast}
        </button>

        <span style={{ flex:1 }} />
        <button onClick={undo}
                disabled={!lastAction || disabled}
                style={{ padding:'6px 10px', borderRadius:10, border:'1px solid #e5e7eb', background:'#fff' }}>
          Undo
        </button>
      </div>
    </div>
  );
}

/* RankBoard */
function RankBoard({ months, availabilityByWeekend, prefs, safeSetMost, safeSetLeast, submitted }) {
  const [q, setQ] = React.useState('');
  const rows = React.useMemo(() => {
    const out = [];
    for (const [mk, arr] of Object.entries(months)) {
      for (const w of arr) {
        const id = w.date;
        const avail = availabilityByWeekend[id] || [];
        const p = prefs[id] || {};
        out.push({
          id,
          label: `${displayDate(id)} (${w.day})`,
          openRNI: avail.includes('RNI'),
          openCOA: avail.includes('COA'),
          most: p.mostService !== 'none' && p.mostChoice > 0 ? `${p.mostService} #${p.mostChoice}` : '',
          least: p.leastService !== 'none' && p.leastChoice > 0 ? `${p.leastService} #${p.leastChoice}` : '',
        });
      }
    }
    return out;
  }, [months, availabilityByWeekend, prefs]);

  const filtered = rows.filter(r => r.label.toLowerCase().includes(q.toLowerCase()));

  const nextRanks = React.useMemo(() => {
    let most = 0, least = 0;
    for (const p of Object.values(prefs || {})) {
      if (p?.mostChoice > most) most = p.mostChoice;
      if (p?.leastChoice > least) least = p.leastChoice;
    }
    return { nextMost: most + 1, nextLeast: least + 1 };
  }, [prefs]);

  function add(id, svc, kind) {
    if (submitted) return;
    if (kind === 'most') safeSetMost(id, { mostService: svc, mostChoice: nextRanks.nextMost });
    else safeSetLeast(id, { leastService: svc, leastChoice: nextRanks.nextLeast });
  }

  return (
    <div style={{ maxWidth:1120, margin:'0 auto', padding:'8px 12px 12px' }}>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
        <strong>Rank Board:</strong>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search month, day, holiday…"
               style={{ flex:1, padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }} />
      </div>
      <div style={{ border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', background:'#f8fafc', padding:'8px 10px', fontWeight:700, fontSize:13 }}>
          <div>Weekend</div><div>Open</div><div>Most</div><div>Least</div><div>Quick Add</div>
        </div>
        <div style={{ maxHeight: 420, overflow:'auto', background:'#fff' }}>
          {filtered.map(r => (
            <div key={r.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr', padding:'8px 10px', borderTop:'1px solid #f1f5f9', alignItems:'center', fontSize:13 }}>
              <div>{r.label}</div>
              <div>
                {r.openRNI && <span style={{ marginRight:6, padding:'2px 6px', border:'1px solid #bfdbfe', borderRadius:8, background:'#eff6ff' }}>RNI</span>}
                {r.openCOA && <span style={{ padding:'2px 6px', border:'1px solid #c7d2fe', borderRadius:8, background:'#eef2ff' }}>COA</span>}
              </div>
              <div>{r.most}</div>
              <div>{r.least}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {r.openRNI && <button disabled={submitted} onClick={()=>add(r.id,'RNI','most')}  style={{ padding:'4px 8px', borderRadius:8, border:'1px solid #2563eb', background:'#3b82f6', color:'#fff' }}>+Most</button>}
                {r.openCOA && <button disabled={submitted} onClick={()=>add(r.id,'COA','most')}  style={{ padding:'4px 8px', borderRadius:8, border:'1px solid #2563eb', background:'#3b82f6', color:'#fff' }}>+Most</button>}
                {r.openRNI && <button disabled={submitted} onClick={()=>add(r.id,'RNI','least')} style={{ padding:'4px 8px', borderRadius:8, border:'1px solid #dc2626', background:'#ef4444', color:'#fff' }}>+Least</button>}
                {r.openCOA && <button disabled={submitted} onClick={()=>add(r.id,'COA','least')} style={{ padding:'4px 8px', borderRadius:8, border:'1px solid #dc2626', background:'#ef4444', color:'#fff' }}>+Least</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize:12, color:'#475569', marginTop:6 }}>Tip: combine with the Command Palette for power use.</div>
    </div>
  );
}

/* DragBuckets */
function DragBuckets({ months, availabilityByWeekend, prefs, safeSetMost, safeSetLeast, submitted }) {
  const [dragId, setDragId] = React.useState(null);

  const openWeekends = React.useMemo(() => {
    const out = [];
    for (const arr of Object.values(months)) {
      for (const w of arr) {
        const id = w.date;
        const avail = availabilityByWeekend[id] || [];
        if (avail.length) out.push({ id, avail, label: `${displayDate(id)} (${w.day})` });
      }
    }
    return out;
  }, [months, availabilityByWeekend]);

  const nextRanks = React.useMemo(() => {
    let most = 0, least = 0;
    for (const p of Object.values(prefs || {})) {
      if (p?.mostChoice > most) most = p.mostChoice;
      if (p?.leastChoice > least) least = p.leastChoice;
    }
    return { nextMost: most + 1, nextLeast: least + 1 };
  }, [prefs]);

  function onDragStart(id) { setDragId(id); }
  function onDrop(kind, svc) {
    if (!dragId || submitted) return;
    if (kind === 'most') safeSetMost(dragId, { mostService: svc,   mostChoice:  nextRanks.nextMost });
    else                 safeSetLeast(dragId, { leastService: svc, leastChoice: nextRanks.nextLeast });
    setDragId(null);
  }

  const bucketStyle = { flex:1, minHeight:120, padding:10, border:'2px dashed #e5e7eb', borderRadius:12, background:'#fff' };

  return (
    <div style={{ maxWidth:1120, margin:'0 auto', padding:'8px 12px 12px' }}>
      <div style={{ display:'flex', gap:12, alignItems:'stretch', flexWrap:'wrap' }}>
        <div style={{ flexBasis:'40%', minWidth:280 }}>
          <div style={{ fontWeight:800, marginBottom:6 }}>Available Weekends</div>
          <div style={{ border:'1px solid #e5e7eb', borderRadius:12, padding:8, background:'#fff', maxHeight:300, overflow:'auto' }}>
            {openWeekends.map(w => (
              <div key={w.id} draggable={!submitted} onDragStart={()=>onDragStart(w.id)}
                   style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                            border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px', marginBottom:6, fontSize:13, cursor:'grab' }}>
                <span>{w.label}</span>
                <span>
                  {w.avail.includes('RNI') && <span style={{ marginRight:6, padding:'2px 6px', border:'1px solid #bfdbfe', borderRadius:8, background:'#eff6ff' }}>RNI</span>}
                  {w.avail.includes('COA') && <span style={{ padding:'2px 6px', border:'1px solid #c7d2fe', borderRadius:8, background:'#eef2ff' }}>COA</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flexBasis:'58%', minWidth:320, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop('most','RNI')}>
            <div style={{ fontWeight:800, marginBottom:6 }}>Drop to add Most (RNI)</div>
            <div style={bucketStyle}>Next rank: #{nextRanks.nextMost}</div>
          </div>
          <div onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop('most','COA')}>
            <div style={{ fontWeight:800, marginBottom:6 }}>Drop to add Most (COA)</div>
            <div style={bucketStyle}>Next rank: #{nextRanks.nextMost}</div>
          </div>
          <div onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop('least','RNI')}>
            <div style={{ fontWeight:800, marginBottom:6 }}>Drop to add Least (RNI)</div>
            <div style={bucketStyle}>Next rank: #{nextRanks.nextLeast}</div>
          </div>
          <div onDragOver={(e)=>e.preventDefault()} onDrop={()=>onDrop('least','COA')}>
            <div style={{ fontWeight:800, marginBottom:6 }}>Drop to add Least (COA)</div>
            <div style={bucketStyle}>Next rank: #{nextRanks.nextLeast}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* App */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [firebaseStatus, setFirebaseStatus] = useState('connecting'); // connecting | connected | error
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';

  // UI flags
  const paramsUI = new URLSearchParams(window.location.search);
  const UI_MODE = (paramsUI.get('ui') || 'legacy').toLowerCase();
  const SHOW_QUICKADD  = UI_MODE === 'quickadd'  || UI_MODE === 'combo';
  const SHOW_RANKBOARD = UI_MODE === 'rankboard' || UI_MODE === 'combo';
  const SHOW_DRAG      = UI_MODE === 'drag';

  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUid(u.uid);
          setStatus('Loading profile & preferences…');
          setFirebaseStatus(u ? 'connected' : 'connecting');
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setFirebaseStatus('error');
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
        setFirebaseStatus('connected');
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
        setFirebaseStatus('error');
      }
    })();
  }, [uid]);

  /* Safety: enforce availability in one place */
  function validateService(id, svc) {
    const avail = availabilityByWeekend[id] || [];
    return svc === SERVICES.NONE || avail.includes(svc);
  }
  const safeSetMost = useCallback((id, v) => {
    if (!validateService(id, v.mostService)) {
      alert(`That service is not open on ${displayDate(id)}.`);
      return false;
    }
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), mostService: v.mostService, mostChoice: v.mostChoice } }));
    return true;
  }, []);
  const safeSetLeast = useCallback((id, v) => {
    if (!validateService(id, v.leastService)) {
      alert(`That service is not open on ${displayDate(id)}.`);
      return false;
    }
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), leastService: v.leastService, leastChoice: v.leastChoice } }));
    return true;
  }, []);

  /* one-time auto-fill both Most and Least service when only one option is available */
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
    try {
      await setDoc(profileDocRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true });
      setFirebaseStatus('connected');
    } catch (e) {
      console.error(e);
      setFirebaseStatus('error');
    }
  };

  const assembleTopBottom = useCallback(() => {
    const orderIdx = id => allWeekendIds.indexOf(id);
    const top10 = [];
    const bottom10 = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top10.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) bottom10.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
    }
    top10.sort((a,b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    bottom10.sort((a,b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    return { top10, bottom10 };
  }, [prefs]);

  const handleSubmit = async () => {
    if (!uid || !profile.name) { alert('Select your name first.'); return; }
    const badLeast = Object.values(prefs).some(p => p.leastChoice > 0 && p.leastService === SERVICES.NONE);
    if (badLeast) { alert('For every “Least” choice, please select a service (RNI or COA).'); return; }

    const { top10, bottom10 } = assembleTopBottom();
    try {
      await setDoc(prefsDocRef(uid), {
        name: profile.name,
        email: profile.email || '',
        preferences: Object.fromEntries(Object.entries(prefs).map(([k,v]) => [k, {
          mostService: v.mostService, mostChoice: v.mostChoice, mostRank: v.mostChoice,
          leastService: v.leastService, leastChoice: v.leastChoice, leastRank: v.leastChoice,
        }])),
        top10: top10.map(t => ({ weekend: t.weekend, choice: t.choice, rank: t.choice, service: t.service })),
        bottom10: bottom10.map(b => ({ weekend: b.weekend, choice: b.choice, rank: b.choice, service: b.service })),
        submitted: true,
        submittedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }, { merge: true });
      setSubmitted(true);
      setFirebaseStatus('connected');
      alert('Preferences submitted. Downloads now reflect your final locked choices.');
    } catch (e) {
      console.error(e);
      setFirebaseStatus('error');
      alert('There was an error submitting. Please try again.');
    }
  };

  const downloadMyCSV = () => {
    const { top10, bottom10 } = assembleTopBottom();
    const rows = [
      ...top10.map(t => ({ attendee: profile.name, email: profile.email || '', kind: 'MOST',  choice: t.choice, service: t.service, weekend: displayDate(t.weekend) })),
      ...bottom10.map(b => ({ attendee: profile.name, email: profile.email || '', kind: 'LEAST', choice: b.choice, service: b.service, weekend: displayDate(b.weekend) })),
    ];
    const fn = submitted ? `preferences_${profile.name || 'attending'}.csv` : `preferences_preview_${profile.name || 'attending'}.csv`;
    downloadCSV(fn, rows);
  };
  const downloadMyWord = () => {
    const { top10, bottom10 } = assembleTopBottom();
    const html = docHtml(profile.name, profile.email, top10, bottom10);
    const fn = submitted ? `preferences_${profile.name || 'attending'}.doc` : `preferences_preview_${profile.name || 'attending'}.doc`;
    downloadBlob(fn, 'application/msword', html);
  };

  const collapseAll = val => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));

  /* Admin CSV */
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const loadAdmin = async () => {
    try {
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
        data.top10.forEach(t => rows.push({ attendee, email: em, kind: 'MOST',  choice: pull(t), service: t.service, weekend: displayDate(t.weekend), submittedAt }));
        data.bottom10.forEach(b => rows.push({ attendee, email: em, kind: 'LEAST', choice: pull(b), service: b.service || '', weekend: displayDate(b.weekend), submittedAt }));
      });
      rows.sort((a,b) => (a.attendee||'').localeCompare(b.attendee||'') || a.kind.localeCompare(b.kind) || (a.choice - b.choice));
      setAdminRows(rows);
      setAdminLoaded(true);
      setFirebaseStatus('connected');
    } catch (e) {
      console.error(e);
      setFirebaseStatus('error');
    }
  };
  useEffect(() => {
    if (isAdmin && uid && !adminLoaded) { loadAdmin().catch(console.error); }
  }, [isAdmin, uid, adminLoaded]); // eslint-disable-line

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontSize: 15 }}>
      {/* Sticky header with Jump + Firebase badge inline */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(4px)', borderBottom: '1px solid #e5e7eb' }}>
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            padding: '8px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
            overflowX: 'auto'
          }}
        >
          <strong style={{ marginRight: 8, flexShrink: 0 }}>Jump:</strong>
          {MONTH_KEYS.map((mk, i) => (
            <a
              key={mk}
              onClick={(e) => {
                e.preventDefault();
                setCollapsed(c => ({ ...c, [mk]: false }));
                const el = document.getElementById(`month-${mk}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              href={`#month-${mk}`}
              style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, textDecoration: 'none', color: '#0f172a', flexShrink: 0 }}
            >
              {MONTH_FULL[i].slice(0,3)}
            </a>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {firebaseStatus === 'connected'  && (<span style={{ color: '#059669' }}>● Firebase: Connected</span>)}
            {firebaseStatus === 'connecting' && (<span style={{ color: '#ea580c' }}>● Firebase: Connecting…</span>)}
            {firebaseStatus === 'error'      && (<span style={{ color: '#dc2626' }}>● Firebase: Error</span>)}
          </span>
          <button onClick={() => collapseAll(true)}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12, flexShrink: 0 }}>Collapse all</button>
          <button onClick={() => collapseAll(false)} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12, flexShrink: 0 }}>Expand all</button>
          <button onClick={downloadMyCSV}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #059669', background: '#10b981', color:'#fff', fontSize:12, flexShrink: 0 }}>Preview/My CSV</button>
          <button onClick={downloadMyWord} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #4f46e5', background: '#6366f1', color:'#fff', fontSize:12, flexShrink: 0 }}>Preview/My Word</button>
        </div>
      </div>

      {/* Header + instructions */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 12px 0' }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">2026 Preferences (RNI &amp; COA)</h1>
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

      {/* Command Palette */}
      <CommandPalette
        months={months}
        availabilityByWeekend={availabilityByWeekend}
        prefs={prefs}
        safeSetMost={safeSetMost}
        safeSetLeast={safeSetLeast}
        submitted={submitted}
      />

      {/* Optional fast UIs via query flags */}
      { (UI_MODE !== 'legacy') && (
        <>
          {(UI_MODE === 'quickadd' || UI_MODE === 'combo') && (
            <QuickAdd
              months={months}
              availabilityByWeekend={availabilityByWeekend}
              prefs={prefs}
              safeSetMost={safeSetMost}
              safeSetLeast={safeSetLeast}
              submitted={submitted}
            />
          )}
          {(UI_MODE === 'rankboard' || UI_MODE === 'combo') && (
            <RankBoard
              months={months}
              availabilityByWeekend={availabilityByWeekend}
              prefs={prefs}
              safeSetMost={safeSetMost}
              safeSetLeast={safeSetLeast}
              submitted={submitted}
            />
          )}
          {UI_MODE === 'drag' && (
            <DragBuckets
              months={months}
              availabilityByWeekend={availabilityByWeekend}
              prefs={prefs}
              safeSetMost={safeSetMost}
              safeSetLeast={safeSetLeast}
              submitted={submitted}
            />
          )}
        </>
      )}

      {/* Calendar */}
      <CalendarGrid
        prefs={prefs}
        setMost={safeSetMost}
        setLeast={safeSetLeast}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        submitted={submitted}
      />

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

      {/* Admin export */}
      {isAdmin && (
        <div style={{ maxWidth:1120, margin:'0 auto', padding:'0 12px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <strong>Admin:</strong>
            <button onClick={loadAdmin} style={{ padding:'6px 10px', borderRadius:10, border:'1px solid #e5e7eb', background:'#fff' }}>Refresh</button>
            <button onClick={() => downloadCSV('admin_preferences.csv', adminRows)} style={{ padding:'6px 10px', borderRadius:10, border:'1px solid #4b5563', background:'#111827', color:'#fff' }}>Download admin.csv</button>
            <span style={{ fontSize:12, color:'#64748b' }}>{adminLoaded ? `${adminRows.length} rows` : 'Not loaded'}</span>
          </div>
        </div>
      )}

      {/* Build label */}
      <div style={{maxWidth:1120, margin:"0 auto", padding:"0 12px 24px", textAlign:"right", color:"#64748b", fontSize:12}}>
        Build: {__APP_VERSION__} • UI: {UI_MODE}
      </div>
    </div>
  );
}
