import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc, getDoc, setDoc, serverTimestamp,
  collection, collectionGroup, getDocs, query
} from 'firebase/firestore';

/* -----------------------------------------------
   Build Tag
----------------------------------------------- */
const __APP_VERSION__ = "v13.0 — 4 UIs + CmdPalette + LivePreview + Centered + DragFixes";

/* -----------------------------------------------
   Firebase config (safe fallbacks)
----------------------------------------------- */
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
const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v13.0";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* -----------------------------------------------
   Constants & Data
----------------------------------------------- */
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

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

const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

/* Weekend data (Sat dates; some pre-filled RNI/COA) */
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

/* -----------------------------------------------
   Derived helpers & persistence
----------------------------------------------- */
const allWeekendIds = Object.values(months).flat().map(w => w.date);

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

const fmtLabel = (iso) => {
  const d = new Date(iso);
  return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
};

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
  });
  return base;
}

const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });

/* -----------------------------------------------
   CSV / Word exports
----------------------------------------------- */
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
function docHtml(name, email, topList, leastList) {
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
        <tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Sat date)</th></tr>
      </thead>
      <tbody>
        ${topList.map(r => row('MOST', r)).join('')}
        ${leastList.map(r => row('LEAST', r)).join('')}
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
  </body>
  </html>`;
}

/* -----------------------------------------------
   Small UI helpers
----------------------------------------------- */
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

/* -----------------------------------------------
   Month card (Calendar UI)
----------------------------------------------- */
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

/* -----------------------------------------------
   DragBuckets (fixed, compact library, empty buckets initially)
----------------------------------------------- */
function DragBuckets({ monthsFlat, prefs, setMost, setLeast, availabilityByWeekend, requireName, disabled }) {
  const [dragPayload, setDragPayload] = useState(null);

  const libraryItems = useMemo(() => {
    return monthsFlat.flatMap(({ id, label }) => {
      const avail = availabilityByWeekend[id] || [];
      return avail.map(svc => ({
        key: `${id}:${svc}`,
        id,
        service: svc,
        label: `${label} — ${svc}`,
      }));
    });
  }, [monthsFlat, availabilityByWeekend]);

  const mostChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p?.mostService && p.mostService !== SERVICES.NONE && (p.mostChoice || 0) > 0) {
        arr.push({ id, service: p.mostService, choice: p.mostChoice });
      }
    }
    arr.sort((a,b) => (a.choice - b.choice) || (allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id)));
    return arr;
  }, [prefs]);

  const leastChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p?.leastService && p.leastService !== SERVICES.NONE && (p.leastChoice || 0) > 0) {
        arr.push({ id, service: p.leastService, choice: p.leastChoice });
      }
    }
    arr.sort((a,b) => (a.choice - b.choice) || (allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id)));
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
    if (!avail.includes(pl.service)) return; // enforce availability

    // update/replace logic to avoid runaway numbering
    if (bucket === "MOST") {
      // clear least for same id
      setLeast(pl.id, { ...(prefs[pl.id]||{}), leastService: SERVICES.NONE, leastChoice: 0 });
      const existing = mostChosen.find(x => x.id === pl.id);
      if (existing) {
        // replace service, keep choice number
        setMost(pl.id, { ...(prefs[pl.id]||{}), mostService: pl.service, mostChoice: existing.choice });
      } else {
        setMost(pl.id, { ...(prefs[pl.id]||{}), mostService: pl.service, mostChoice: nextChoice(mostChosen) });
      }
    } else {
      // bucket === "LEAST": clear most for same id
      setMost(pl.id, { ...(prefs[pl.id]||{}), mostService: SERVICES.NONE, mostChoice: 0 });
      const existing = leastChosen.find(x => x.id === pl.id);
      if (existing) {
        setLeast(pl.id, { ...(prefs[pl.id]||{}), leastService: pl.service, leastChoice: existing.choice });
      } else {
        setLeast(pl.id, { ...(prefs[pl.id]||{}), leastService: pl.service, leastChoice: nextChoice(leastChosen) });
      }
    }
    setDragPayload(null);
  };

  const removeFrom = (bucket, id) => {
    if (bucket === "MOST") setMost(id, { ...(prefs[id]||{}), mostService: SERVICES.NONE, mostChoice: 0 });
    else setLeast(id, { ...(prefs[id]||{}), leastService: SERVICES.NONE, leastChoice: 0 });
  };

  const shell = { border:'1px solid #e5e7eb', borderRadius:14, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.04)' };
  const title = { fontWeight:900, fontSize:14, padding:'8px 10px', borderBottom:'1px solid #e5e7eb', background:'#f8fafc' };
  const pad = { padding:10 };

  return (
    <div style={{ maxWidth: 1120, margin:'12px auto', padding:'0 12px' }}>
      <div style={{ display:'grid', gap:16, gridTemplateColumns:'1fr 1fr 1fr' }}>
        {/* Library (compact grid) */}
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
                  {fmtLabel(m.id)} — {m.service}
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
                  {fmtLabel(m.id)} — {m.service}
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

/* -----------------------------------------------
   QuickAdd (fast select with availability enforcement)
----------------------------------------------- */
function QuickAdd({ monthsFlat, prefs, setMost, setLeast, availabilityByWeekend, requireName, disabled }) {
  const [pick, setPick] = useState({ id:'', bucket:'MOST', service:SERVICES.NONE, choice:0 });

  const options = monthsFlat.map(m => ({ value: m.id, label: m.label }));

  const commit = () => {
    if (!requireName) { alert('Select your name first.'); return; }
    if (!pick.id || pick.service === SERVICES.NONE || pick.choice <= 0) { alert('Choose date, service, and choice number.'); return; }
    const avail = availabilityByWeekend[pick.id] || [];
    if (!avail.includes(pick.service)) { alert('That service is not available for this date.'); return; }

    const base = prefs[pick.id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
    if (pick.bucket === 'MOST') {
      setLeast(pick.id, { ...base, leastService: SERVICES.NONE, leastChoice: 0 });
      setMost(pick.id,  { ...base, mostService: pick.service, mostChoice: pick.choice });
    } else {
      setMost(pick.id,  { ...base, mostService: SERVICES.NONE, mostChoice: 0 });
      setLeast(pick.id, { ...base, leastService: pick.service, leastChoice: pick.choice });
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '12px auto', padding: '0 12px' }}>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', border:'1px solid #e5e7eb', borderRadius:14, padding:12, background:'#fff' }}>
        <select
          value={pick.id}
          onChange={e => setPick(p => ({ ...p, id:e.target.value }))}
          style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, minWidth:220 }}
          disabled={disabled}
        >
          <option value="">— Select weekend —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={pick.bucket}
          onChange={e => setPick(p => ({ ...p, bucket:e.target.value }))}
          style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}
          disabled={disabled}
        >
          <option value="MOST">Most</option>
          <option value="LEAST">Least</option>
        </select>
        <select
          value={pick.service}
          onChange={e => setPick(p => ({ ...p, service:e.target.value }))}
          style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}
          disabled={disabled}
        >
          <option value="none">— Service —</option>
          <option value="RNI">RNI</option>
          <option value="COA">COA</option>
        </select>
        <input
          type="number"
          min={1}
          value={pick.choice}
          onChange={e => setPick(p => ({ ...p, choice: Math.max(1, parseInt(e.target.value||'0', 10)) }))}
          style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8, width:90 }}
          disabled={disabled}
        />
        <button
          onClick={commit}
          disabled={disabled}
          style={{ padding:'8px 12px', borderRadius:10, border:'1px solid #16a34a', background:'#22c55e', color:'#fff', fontWeight:700 }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

/* -----------------------------------------------
   RankBoard (clickable tiles; availability enforced)
----------------------------------------------- */
function RankBoard({ monthsFlat, prefs, setMost, setLeast, availabilityByWeekend, requireName, disabled }) {
  const [activeBucket, setActiveBucket] = useState('MOST');
  const [activeService, setActiveService] = useState(SERVICES.RNI);

  const mostChosen = useMemo(() => Object.entries(prefs).filter(([,p]) => p.mostService!==SERVICES.NONE && p.mostChoice>0).length, [prefs]);
  const leastChosen = useMemo(() => Object.entries(prefs).filter(([,p]) => p.leastService!==SERVICES.NONE && p.leastChoice>0).length, [prefs]);

  const onTileClick = (id) => {
    if (disabled || !requireName) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(activeService)) return;

    const base = prefs[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };

    if (activeBucket === 'MOST') {
      const next = (mostChosen || 0) + 1;
      setLeast(id, { ...base, leastService: SERVICES.NONE, leastChoice: 0 });
      setMost(id,  { ...base, mostService: activeService, mostChoice: next });
    } else {
      const next = (leastChosen || 0) + 1;
      setMost(id,  { ...base, mostService: SERVICES.NONE, mostChoice: 0 });
      setLeast(id, { ...base, leastService: activeService, leastChoice: next });
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin:'12px auto', padding:'0 12px' }}>
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
        <label style={{ fontWeight:800 }}>Bucket:</label>
        <select value={activeBucket} onChange={e=>setActiveBucket(e.target.value)} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}>
          <option value="MOST">Most</option>
          <option value="LEAST">Least</option>
        </select>
        <label style={{ fontWeight:800, marginLeft:10 }}>Service:</label>
        <select value={activeService} onChange={e=>setActiveService(e.target.value)} style={{ padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:8 }}>
          <option value="RNI">RNI</option>
          <option value="COA">COA</option>
        </select>
        <span style={{ marginLeft:'auto', fontSize:12, color:'#64748b' }}>
          Click a tile to add #{activeBucket === 'MOST' ? (mostChosen+1) : (leastChosen+1)} • {activeService}
        </span>
      </div>

      <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {monthsFlat.map(m => {
          const avail = availabilityByWeekend[m.id] || [];
          const canUse = avail.includes(activeService);
          const p = prefs[m.id] || {};
          const selected =
            (activeBucket === 'MOST' && p.mostService === activeService && p.mostChoice>0) ||
            (activeBucket === 'LEAST' && p.leastService === activeService && p.leastChoice>0);

        return (
          <button
            key={m.id}
            onClick={() => onTileClick(m.id)}
            disabled={disabled || !requireName || !canUse}
            style={{
              padding:'10px',
              borderRadius:12,
              border:'1px solid #e5e7eb',
              background: selected ? '#eef2ff' : canUse ? '#ffffff' : '#f8fafc',
              color: selected ? '#3730a3' : '#0f172a',
              textAlign:'left',
              cursor: (disabled || !requireName || !canUse) ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,.04)'
            }}
            title={!canUse ? 'Service not available for this date' : ''}
          >
            <div style={{ fontWeight:900, marginBottom:6 }}>{m.label}</div>
            <div style={{ fontSize:12, color:'#475569' }}>RNI {avail.includes(SERVICES.RNI) ? 'OPEN' : '—'} · COA {avail.includes(SERVICES.COA) ? 'OPEN' : '—'}</div>
          </button>
        );})}
      </div>
    </div>
  );
}

/* -----------------------------------------------
   Identity, Live Preview, Command Palette
----------------------------------------------- */
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
  const orderIdx = id => allWeekendIds.indexOf(id);
  const top = [];
  const least = [];
  for (const [id, p] of Object.entries(prefs)) {
    if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
    if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) least.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
  }
  top.sort((a,b)=> a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
  least.sort((a,b)=> a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));

  return (
    <div style={{ border:'1px solid #e5e7eb', borderRadius: 12, padding: 12, background:'#ffffff', minWidth: 280 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Live Preview</div>
      <div style={{ fontSize: 12, color:'#64748b', marginBottom:6 }}>{profile.name || '—'}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color:'#065f46', marginBottom:4 }}>Most</div>
      {top.length === 0 ? <div style={{ fontSize:12, color:'#94a3b8' }}>— none —</div> :
        top.map(t => <div key={`t-${t.weekend}`} style={{ fontSize: 12 }}>#{t.choice} · {fmtLabel(t.weekend)} · {t.service}</div>)
      }
      <div style={{ height:8 }} />
      <div style={{ fontSize: 13, fontWeight: 800, color:'#7f1d1d', marginBottom:4 }}>Least</div>
      {least.length === 0 ? <div style={{ fontSize:12, color:'#94a3b8' }}>— none —</div> :
        least.map(t => <div key={`l-${t.weekend}`} style={{ fontSize: 12 }}>#{t.choice} · {fmtLabel(t.weekend)} · {t.service}</div>)
      }
    </div>
  );
}

function CommandPalette({ open, onClose, actions }) {
  const [q, setQ] = useState('');
  const list = actions.filter(a => a.label.toLowerCase().includes(q.toLowerCase()));
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose(open ? false : true, true);
      }
      if (open && e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.2)',
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop: '10vh', zIndex:1000
    }}>
      <div style={{ width: 640, background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 10px 30px rgba(0,0,0,.15)' }}>
        <div style={{ padding:12, borderBottom:'1px solid #e5e7eb' }}>
          <input
            autoFocus
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Type a command… (e.g., jump jan, collapse, expand, switch drag)"
            style={{ width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8 }}
          />
        </div>
        <div style={{ maxHeight: 360, overflow:'auto' }}>
          {list.length === 0 ? <div style={{ padding:12, color:'#94a3b8', fontSize:13 }}>No matches</div> :
            list.map((a,i) => (
              <button
                key={i}
                onClick={() => { a.run(); onClose(false); }}
                style={{ width:'100%', textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #f1f5f9', background:'#fff', cursor:'pointer' }}
              >
                <div style={{ fontWeight:800 }}>{a.label}</div>
                {a.desc && <div style={{ fontSize:12, color:'#64748b' }}>{a.desc}</div>}
              </button>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* -----------------------------------------------
   2×6 Calendar Grid wrapper
----------------------------------------------- */
function CalendarGrid({ prefs, setMost, setLeast, collapsed, setCollapsed, submitted }) {
  return (
    <>
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 12px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '32px',
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
            locked={submitted}
          />
        ))}
      </div>
    </>
  );
}

/* -----------------------------------------------
   App
----------------------------------------------- */
export default function App() {
  /* URL mode (?ui=calendar|drag|quick|rank) */
  const urlParams = new URLSearchParams(window.location.search);
  const initialUI = (urlParams.get('ui') || 'calendar').toLowerCase();
  const [mode, setMode] = useState(['calendar','drag','quick','rank'].includes(initialUI) ? initialUI : 'calendar');

  /* Auth / Firebase health */
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [fbHealthy, setFbHealthy] = useState(null); // null=unknown, true/false

  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUid(u.uid);
            setStatus('Checking connection…');
            // tiny read to check health
            try {
              const pingRef = doc(db, 'artifacts', appId, 'health', 'ping');
              await setDoc(pingRef, { at: serverTimestamp() }, { merge: true });
              const snap = await getDoc(pingRef);
              setFbHealthy(snap.exists());
              setStatus('Ready.');
            } catch (e) {
              console.error(e);
              setFbHealthy(false);
              setStatus('Ready (no DB)');
            }
          }
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setFbHealthy(false);
      }
    })();
  }, []);

  /* Profile & Prefs (persist locally + Firestore) */
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sched_profile')||'{}') || { name:'', email:'' }; } catch { return { name:'', email:'' }; }
  });
  const [prefs, setPrefs] = useState(() => {
    try { 
      const p = JSON.parse(localStorage.getItem('sched_prefs')||'null');
      return p && typeof p === 'object' ? p : initEmptyPrefs();
    } catch { return initEmptyPrefs(); }
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { localStorage.setItem('sched_profile', JSON.stringify(profile)); }, [profile]);
  useEffect(() => { localStorage.setItem('sched_prefs', JSON.stringify(prefs)); }, [prefs]);

  const profileDocRef = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'profile'), 'current');
  const prefsDocRef   = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'preferences'), 'calendar-preferences');

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const [proSnap, prefSnap] = await Promise.all([getDoc(profileDocRef(uid)), getDoc(prefsDocRef(uid))]);
        if (proSnap.exists()) {
          const d = proSnap.data();
          setProfile(prev => ({ ...prev, name: d.name || prev.name || '', email: d.email || prev.email || '' }));
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
            setPrefs(prev => ({ ...prev, ...remapped }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [uid]);

  const saveProfile = async (next) => {
    setProfile(next);
    try { if (uid) await setDoc(profileDocRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true }); } catch {}
  };

  /* Collapse state (months start collapsed) */
  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));

  /* Auto-fill radio when only one service available (run once) */
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

  /* Setters that enforce constraints:
     - cannot have both services for same day in the SAME bucket (we only store one; changing service replaces)
     - selecting in one bucket clears the same date in the other bucket
  */
  const setMost = useCallback((id, v) => {
    setPrefs(prev => {
      const base = prev[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
      // clear least if we set any most
      const next = { ...prev, [id]: { ...base, mostService: v.mostService, mostChoice: v.mostChoice, leastService: SERVICES.NONE, leastChoice: 0 } };
      return next;
    });
  }, []);
  const setLeast = useCallback((id, v) => {
    setPrefs(prev => {
      const base = prev[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
      const next = { ...prev, [id]: { ...base, mostService: SERVICES.NONE, mostChoice: 0, leastService: v.leastService, leastChoice: v.leastChoice } };
      return next;
    });
  }, []);

  /* Tally for header */
  const counts = useMemo(() => {
    let mostCount = 0, leastCount = 0;
    for (const p of Object.values(prefs)) {
      if (p.mostChoice > 0 && p.mostService !== SERVICES.NONE) mostCount++;
      if (p.leastChoice > 0 && p.leastService !== SERVICES.NONE) leastCount++;
    }
    return { mostCount, leastCount };
  }, [prefs]);

  /* Months flat list for various UIs */
  const monthsFlat = useMemo(() => {
    const rows = [];
    MONTH_KEYS.forEach((mk, i) => {
      months[mk].forEach(w => rows.push({ id: w.date, label: `${MONTH_FULL[i]} ${new Date(w.date).getDate()}` }));
    });
    return rows;
  }, []);

  /* Admin CSV (unchanged; only when ?admin=1) */
  const isAdmin = urlParams.get('admin') === '1';
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  useEffect(() => {
    if (!isAdmin || !uid || adminLoaded === true) return;
    (async () => {
      try {
        const qSnap = await getDocs(query(collectionGroup(db, 'preferences')));
        const rows = [];
        qSnap.forEach(d => {
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
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isAdmin, uid, adminLoaded]);

  /* Exports & Submit */
  const orderIdx = id => allWeekendIds.indexOf(id);
  const assembleTopBottom = useCallback(() => {
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
    try {
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
    } catch (e) {
      console.error(e);
      alert('Saved locally, but Firestore submission failed. You can still download your CSV/Word.');
    }
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

  const collapseAll = val => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));

  /* Command palette actions */
  const [cmdOpen, setCmdOpen] = useState(false);
  const actions = useMemo(() => {
    const jumpers = MONTH_KEYS.map((mk, i) => ({
      label: `Jump to ${MONTH_FULL[i]}`,
      run: () => {
        setCollapsed(c => ({ ...c, [mk]: false }));
        const el = document.getElementById(`month-${mk}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }));
    return [
      { label: 'Collapse all months', run: () => collapseAll(true) },
      { label: 'Expand all months',   run: () => collapseAll(false) },
      { label: 'Switch to Calendar',  run: () => setMode('calendar') },
      { label: 'Switch to DragBuckets', run: () => setMode('drag') },
      { label: 'Switch to QuickAdd',  run: () => setMode('quick') },
      { label: 'Switch to RankBoard', run: () => setMode('rank') },
      ...jumpers
    ];
  }, [setMode]);

  /* Layout: centered with gutters (bands) */
  const pageBg = {
    background: 'linear-gradient(90deg, #f8fafc 0, #f8fafc 1fr, #ffffff 1fr, #ffffff calc(100% - 1fr), #f8fafc calc(100% - 1fr), #f8fafc 100%)'
  };

  /* Top jump bar */
  const JumpBar = (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(4px)', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Mode links */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {['calendar','drag','quick','rank'].map(m => (
            <a
              key={m}
              href={`?ui=${m}`}
              onClick={e => { e.preventDefault(); setMode(m); }}
              style={{
                padding:'6px 10px', borderRadius: 999, border: '1px solid #e5e7eb',
                background: mode===m ? '#111827' : '#ffffff',
                color: mode===m ? '#ffffff' : '#111827', fontSize:12, textDecoration:'none'
              }}
            >
              {m === 'calendar' ? 'Calendar' : m === 'drag' ? 'DragBuckets' : m === 'quick' ? 'QuickAdd' : 'RankBoard'}
            </a>
          ))}
        </div>

        {/* Jump buttons (Calendar only) */}
        {mode === 'calendar' && (
          <>
            <strong style={{ marginLeft:8 }}>Jump:</strong>
            {MONTH_KEYS.map((mk, i) => (
              <button key={mk} onClick={() => { setCollapsed(c => ({ ...c, [mk]: false })); const el = document.getElementById(`month-${mk}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                {MONTH_FULL[i].slice(0,3)}
              </button>
            ))}
          </>
        )}

        <span style={{ flex: 1 }} />

        {/* Firebase badge inline */}
        <span style={{ fontSize:12, padding:'4px 8px', borderRadius:999, border:'1px solid #e5e7eb', background: fbHealthy===null ? '#f1f5f9' : fbHealthy ? '#dcfce7' : '#fee2e2', color: fbHealthy===false ? '#991b1b' : '#065f46' }}>
          Firebase {fbHealthy ? '✓ Connected' : fbHealthy===false ? '✗ Error' : '…'}
        </span>

        {/* Coll/Exp + Preview buttons (always visible) */}
        <button onClick={() => collapseAll(true)}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Collapse all</button>
        <button onClick={() => collapseAll(false)} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Expand all</button>
        <button onClick={downloadMyCSV}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #059669', background: '#10b981', color:'#fff', fontSize:12 }}>Preview CSV</button>
        <button onClick={downloadMyWord} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #4f46e5', background: '#6366f1', color:'#fff', fontSize:12 }}>Preview Word</button>

        {/* Command palette button */}
        <button onClick={() => setCmdOpen(true)} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>⌘K Commands</button>
      </div>
    </div>
  );

  /* Main render */
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc' }}>
      {JumpBar}

      {/* Centered wrapper + gutters */}
      <div style={{ maxWidth: 1200, margin:'0 auto', padding:'0 12px' }}>
        {/* Header & instructions */}
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 0 8px' }}>
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

        {/* Main area: UI + Live Preview side-by-side on wide screens */}
        <div style={{ maxWidth: 1120, margin: '0 auto', display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' }}>
          <div>
            {mode === 'calendar' && (
              <CalendarGrid
                prefs={prefs}
                setMost={setMost}
                setLeast={setLeast}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                submitted={submitted}
              />
            )}

            {mode === 'drag' && (
              <DragBuckets
                monthsFlat={monthsFlat}
                prefs={prefs}
                setMost={(id, v) => setMost(id, v)}
                setLeast={(id, v) => setLeast(id, v)}
                availabilityByWeekend={availabilityByWeekend}
                requireName={Boolean(profile?.name)}
                disabled={submitted}
              />
            )}

            {mode === 'quick' && (
              <QuickAdd
                monthsFlat={monthsFlat}
                prefs={prefs}
                setMost={(id, v) => setMost(id, v)}
                setLeast={(id, v) => setLeast(id, v)}
                availabilityByWeekend={availabilityByWeekend}
                requireName={Boolean(profile?.name)}
                disabled={submitted}
              />
            )}

            {mode === 'rank' && (
              <RankBoard
                monthsFlat={monthsFlat}
                prefs={prefs}
                setMost={(id, v) => setMost(id, v)}
                setLeast={(id, v) => setLeast(id, v)}
                availabilityByWeekend={availabilityByWeekend}
                requireName={Boolean(profile?.name)}
                disabled={submitted}
              />
            )}

            {/* Submit bar */}
            <div style={{ padding: '8px 0 24px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
              <button
                className={`${profile.name && !submitted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-3 px-6 rounded-xl font-bold`}
                disabled={!profile.name || submitted}
                onClick={handleSubmit}
              >
                {submitted ? 'Submitted (Locked)' : 'Submit Final Preferences'}
              </button>
              <span className="text-sm text-gray-600">{submitted ? 'Locked. Downloads reflect your final choices.' : 'Tip: use Preview CSV/Word above to save your current selections.'}</span>
            </div>

            {/* Admin CSV button (optional) */}
            {isAdmin && (
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => {
                    const fn = `admin_preferences_${new Date().toISOString().slice(0,10)}.csv`;
                    downloadCSV(fn, adminRows);
                  }}
                  style={{ padding:'8px 12px', border:'1px solid #111827', background:'#111827', color:'#fff', borderRadius:10, fontWeight:700 }}
                >Download admin.csv</button>
                {!adminLoaded && <span style={{ marginLeft:8, fontSize:12, color:'#64748b' }}>loading…</span>}
              </div>
            )}

            <div style={{textAlign:'right', color:'#64748b', fontSize:12, marginBottom:24}}>Build: {__APP_VERSION__}</div>
          </div>

          {/* Live preview */}
          <LivePreview profile={profile} prefs={prefs} />
        </div>
      </div>

      {/* Command palette (⌘/Ctrl + K) */}
      <CommandPalette
        open={cmdOpen}
        onClose={(v)=>setCmdOpen(v)}
        actions={actions}
      />
    </div>
  );
}
