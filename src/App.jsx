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
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  collectionGroup,
  getDocs,
  query
} from 'firebase/firestore';

// at top
import DragBuckets from "./DragBuckets.jsx";

/* Build tag */
const __APP_VERSION__ = "v13.0 — unified UI + palette + live sidebar + badge";

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

const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v13.0";
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* Attendings (your latest with emails) */
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

/* Limits panel when name selected */
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

/* Calendar (Saturdays only; Fri removed per your spec; labels are Month D) */
const months = {
  '01': [
    { d: 'January 10', date: '2026-01-10', rni: null,    coa: null },
    { d: 'January 17', date: '2026-01-17', rni: null,    coa: null, detail: 'MLK Day (long wknd)' },
    { d: 'January 24', date: '2026-01-24', rni: null,    coa: null },
    { d: 'January 31', date: '2026-01-31', rni: null,    coa: null },
  ],
  '02': [
    { d: 'February 7',  date: '2026-02-07', rni: 'Boone',  coa: null },
    { d: 'February 14', date: '2026-02-14', rni: 'Boone',  coa: null },
    { d: 'February 21', date: '2026-02-21', rni: 'Willis', coa: null },
    { d: 'February 28', date: '2026-02-28', rni: 'Willis', coa: null },
  ],
  '03': [
    { d: 'March 7',  date: '2026-03-07', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { d: 'March 14', date: '2026-03-14', rni: null,     coa: 'Winter' },
    { d: 'March 21', date: '2026-03-21', rni: 'Ambal',  coa: 'Arora', isTaken: true },
    { d: 'March 28', date: '2026-03-28', rni: null,     coa: 'Arora' },
  ],
  '04': [
    { d: 'April 4',  date: '2026-04-04', rni: 'Sims', coa: null },
    { d: 'April 11', date: '2026-04-11', rni: null,   coa: null },
    { d: 'April 18', date: '2026-04-18', rni: 'Sims', coa: null },
    { d: 'April 25', date: '2026-04-25', rni: null,   coa: null, detail: 'PAS coverage' },
  ],
  '05': [
    { d: 'May 2',  date: '2026-05-02', rni: null,    coa: null },
    { d: 'May 9',  date: '2026-05-09', rni: 'Arora', coa: null },
    { d: 'May 16', date: '2026-05-16', rni: 'Arora', coa: null },
    { d: 'May 23', date: '2026-05-23', rni: null,    coa: null, detail: 'Memorial Day' },
    { d: 'May 30', date: '2026-05-30', rni: 'Arora', coa: null },
  ],
  '06': [
    { d: 'June 6',  date: '2026-06-06', rni: 'Schuyler', coa: 'Winter', isTaken: true },
    { d: 'June 13', date: '2026-06-13', rni: 'Boone',    coa: null },
    { d: 'June 20', date: '2026-06-20', rni: 'Schuyler', coa: 'Winter', isTaken: true, detail: 'Juneteenth' },
    { d: 'June 27', date: '2026-06-27', rni: 'Boone',    coa: null },
  ],
  '07': [
    { d: 'July 4',  date: '2026-07-04', rni: 'Jain',    coa: 'Carlo',  isTaken: true, detail: 'Independence Day' },
    { d: 'July 11', date: '2026-07-11', rni: null,      coa: 'Willis' },
    { d: 'July 18', date: '2026-07-18', rni: null,      coa: null },
    { d: 'July 25', date: '2026-07-25', rni: 'Shukla',  coa: 'Willis', isTaken: true },
  ],
  '08': [
    { d: 'August 1',  date: '2026-08-01', rni: 'Boone',  coa: null },
    { d: 'August 8',  date: '2026-08-08', rni: 'Sims',   coa: 'Carlo', isTaken: true },
    { d: 'August 15', date: '2026-08-15', rni: 'Boone',  coa: null },
    { d: 'August 22', date: '2026-08-22', rni: 'Sims',   coa: null },
    { d: 'August 29', date: '2026-08-29', rni: null,     coa: 'Carlo' },
  ],
  '09': [
    { d: 'September 5',  date: '2026-09-05', rni: 'Mackay', coa: null, detail: 'Labor Day' },
    { d: 'September 12', date: '2026-09-12', rni: null,     coa: null },
    { d: 'September 19', date: '2026-09-19', rni: null,     coa: null },
    { d: 'September 26', date: '2026-09-26', rni: null,     coa: null },
  ],
  '10': [
    { d: 'October 3',  date: '2026-10-03', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
    { d: 'October 10', date: '2026-10-10', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { d: 'October 17', date: '2026-10-17', rni: 'Kandasamy', coa: null },
    { d: 'October 24', date: '2026-10-24', rni: 'Travers',   coa: 'Bhatia', isTaken: true },
    { d: 'October 31', date: '2026-10-31', rni: 'Kandasamy', coa: 'Carlo',  isTaken: true },
  ],
  '11': [
    { d: 'November 7',  date: '2026-11-07', rni: 'Ambal',  coa: null },
    { d: 'November 14', date: '2026-11-14', rni: 'Bhatia', coa: null },
    { d: 'November 21', date: '2026-11-21', rni: 'Ambal',  coa: null },
    { d: 'November 28', date: '2026-11-28', rni: 'Bhatia', coa: null, detail: 'Thanksgiving' },
  ],
  '12': [
    { d: 'December 5',  date: '2026-12-05', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { d: 'December 12', date: '2026-12-12', rni: null,        coa: null },
    { d: 'December 19', date: '2026-12-19', rni: 'Travers',   coa: 'Kandasamy', isTaken: true },
    { d: 'December 26', date: '2026-12-26', rni: 'Bhatia',    coa: 'Arora',     isTaken: true, detail: 'Christmas' },
  ],
};

const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* Availability map */
const availabilityByWeekend = (() => {
  const m = {};
  for (const arr of Object.values(months)) {
    for (const w of arr) {
      const a = [];
      if (w.rni === null) a.push(SERVICES.RNI);
      if (w.coa === null) a.push(SERVICES.COA);
      m[w.date] = a; // [] means fully assigned
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
      <td>${esc(r.weekend)}</td>
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
        ${top10.map(r => row('MOST', r)).join('')}
        ${bottom10.map(r => row('LEAST', r)).join('')}
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
  </body>
  </html>`;
}

/* Choice select (dynamic max) */
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

/* Limited radio by availability */
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

/* Month card (Calendar mode) */
function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, cardRef, locked }) {
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
          background: '#f8fafc',
          color: '#0f172a',
          borderBottom: '2px solid #e2e8f0',
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
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(w => {
            const p = prefs[w.date] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
            const avail = availabilityByWeekend[w.date] || [];
            const fullyAssigned = avail.length === 0;

            return (
              <div key={w.date} style={{ padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', background: fullyAssigned ? '#f9fafb' : '#fff', opacity: fullyAssigned ? 0.8 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{w.d}</div>
                  {w.detail && <div style={chip('#fff7ed', '#b45309')}>{w.detail}</div>}
                </div>

                <div style={{ fontSize: 13, color: '#334155', marginBottom: 8, lineHeight: 1.25 }}>
                  <span style={{ background: w.rni === null ? '#dbeafe' : '#e5e7eb', color: w.rni === null ? '#1e3a8a' : '#111827', borderRadius: 6, padding: '3px 8px', marginRight: 8 }}>
                    RNI: {w.rni === null ? 'OPEN' : <strong style={{ fontSize: 15 }}>{w.rni}</strong>}
                  </span>
                  <span style={{ background: w.coa === null ? '#e0e7ff' : '#e5e7eb', color: w.coa === null ? '#3730a3' : '#111827', borderRadius: 6, padding: '3px 8px' }}>
                    COA: {w.coa === null ? 'OPEN' : <strong style={{ fontSize: 15 }}>{w.coa}</strong>}
                  </span>
                </div>

                {!fullyAssigned ? (
                  <div style={{ display: 'grid', gap: 10, opacity: locked ? 0.6 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Most (service + choice)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <RadioServiceLimited
                          available={avail}
                          disabled={locked}
                          value={avail.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                          onChange={(svc) => onMostChange(w.date, { ...p, mostService: svc })}
                          name={`most-${w.date}`}
                        />
                        <ChoiceSelect
                          disabled={locked || avail.length === 0 || p.mostService === SERVICES.NONE}
                          value={p.mostChoice || 0}
                          onChange={(choice) => onMostChange(w.date, { ...p, mostChoice: choice })}
                          placeholder="Most choice…"
                          maxN={allWeekendIds.length}
                        />
                      </div>
                    </div>

                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Least (service + choice)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <RadioServiceLimited
                          available={avail}
                          disabled={locked}
                          value={avail.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                          onChange={(svc) => onLeastChange(w.date, { ...p, leastService: svc })}
                          name={`least-${w.date}`}
                        />
                        <ChoiceSelect
                          disabled={locked || avail.length === 0 || p.leastService === SERVICES.NONE}
                          value={p.leastChoice || 0}
                          onChange={(choice) => onLeastChange(w.date, { ...p, leastChoice: choice })}
                          placeholder="Least choice…"
                          maxN={allWeekendIds.length}
                        />
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

/* QuickAdd (typeahead style list) */
function QuickAdd({ monthsFlat, prefs, setMost, setLeast, disabled }) {
  const [filter, setFilter] = useState('');
  const list = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return monthsFlat.filter(w => !q || w.d.toLowerCase().includes(q) || w.month.toLowerCase().includes(q));
  }, [monthsFlat, filter]);

  const MAXN = allWeekendIds.length;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <input
          placeholder="Search month or day (e.g., 'Apr', 'October 17')"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, background: disabled ? '#f3f4f6' : '#fff' }}
          disabled={disabled}
        />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {list.map(w => {
          const avail = availabilityByWeekend[w.date] || [];
          if (avail.length === 0) {
            return (
              <div key={w.date} style={{ opacity: 0.6, border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, background: '#f9fafb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{w.d}</strong>
                  <span>Fully assigned</span>
                </div>
              </div>
            );
          }
          const p = prefs[w.date] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
          return (
            <div key={w.date} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>{w.d}</strong>
                <span style={{ fontSize: 12, color: '#64748b' }}>{avail.join(' / ')} open</span>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Most:</span>
                <RadioServiceLimited
                  available={avail}
                  disabled={disabled}
                  value={avail.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                  onChange={(svc) => setMost(w.date, { ...p, mostService: svc })}
                  name={`q-most-${w.date}`}
                />
                <ChoiceSelect
                  disabled={disabled || p.mostService === SERVICES.NONE}
                  value={p.mostChoice || 0}
                  onChange={(choice) => setMost(w.date, { ...p, mostChoice: choice })}
                  placeholder="Choice #"
                  maxN={MAXN}
                />
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Least:</span>
                <RadioServiceLimited
                  available={avail}
                  disabled={disabled}
                  value={avail.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                  onChange={(svc) => setLeast(w.date, { ...p, leastService: svc })}
                  name={`q-least-${w.date}`}
                />
                <ChoiceSelect
                  disabled={disabled || p.leastService === SERVICES.NONE}
                  value={p.leastChoice || 0}
                  onChange={(choice) => setLeast(w.date, { ...p, leastChoice: choice })}
                  placeholder="Choice #"
                  maxN={MAXN}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* RankBoard (two tall columns, quick scan) */
function RankBoard({ monthsFlat, prefs, setMost, setLeast, disabled }) {
  const MAXN = allWeekendIds.length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Most (service + choice)</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {monthsFlat.map(w => {
            const avail = availabilityByWeekend[w.date] || [];
            const p = prefs[w.date] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
            return (
              <div key={`m-${w.date}`} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: disabled ? 0.6 : 1 }}>
                <div style={{ width: 160, fontSize: 13 }}>{w.d}</div>
                <RadioServiceLimited
                  available={avail}
                  disabled={disabled}
                  value={avail.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                  onChange={(svc) => setMost(w.date, { ...p, mostService: svc })}
                  name={`b-most-${w.date}`}
                />
                <ChoiceSelect
                  disabled={disabled || p.mostService === SERVICES.NONE}
                  value={p.mostChoice || 0}
                  onChange={(choice) => setMost(w.date, { ...p, mostChoice: choice })}
                  placeholder="Choice #"
                  maxN={MAXN}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Least (service + choice)</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {monthsFlat.map(w => {
            const avail = availabilityByWeekend[w.date] || [];
            const p = prefs[w.date] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
            return (
              <div key={`l-${w.date}`} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: disabled ? 0.6 : 1 }}>
                <div style={{ width: 160, fontSize: 13 }}>{w.d}</div>
                <RadioServiceLimited
                  available={avail}
                  disabled={disabled}
                  value={avail.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                  onChange={(svc) => setLeast(w.date, { ...p, leastService: svc })}
                  name={`b-least-${w.date}`}
                />
                <ChoiceSelect
                  disabled={disabled || p.leastService === SERVICES.NONE}
                  value={p.leastChoice || 0}
                  onChange={(choice) => setLeast(w.date, { ...p, leastChoice: choice })}
                  placeholder="Choice #"
                  maxN={MAXN}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* DragBuckets (simple HTML5 drag between Most/Least “buckets”) */
/* DragBuckets (fixed: empty Most/Least initially; source is compact grid; enforce availability) */
function DragBuckets({ monthsFlat, prefs, setMost, setLeast, disabled, requireName }) {
  const [dragPayload, setDragPayload] = useState(null); // { id, service }

  // Build a compact "library" of draggable chips: one per AVAILABLE service per weekend
  const libraryItems = useMemo(() => {
    return monthsFlat.flatMap(({ id, satISO, label }) => {
      const avail = availabilityByWeekend[id] || [];
      return avail.map(svc => ({
        key: `${id}:${svc}`,
        id,
        service: svc,
        label: `${label} — ${svc}`,
      }));
    });
  }, [monthsFlat]);

  // Existing choices from prefs (only items with a positive choice number)
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

  // Next choice number when dropping into a bucket
  const nextChoice = (list) => (list.reduce((m,x)=>Math.max(m, x.choice||0), 0) + 1);

  // DnD handlers
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
    if (!avail.includes(pl.service)) return; // enforce availability hard

    if (bucket === "MOST") {
      // remove any least assignment for same id
      setLeast(pl.id, { ...((prefs[pl.id]||{})), leastService: SERVICES.NONE, leastChoice: 0 });
      setMost(pl.id,  { ...((prefs[pl.id]||{})), mostService: pl.service,  mostChoice:  nextChoice(mostChosen) });
    } else {
      setMost(pl.id,  { ...((prefs[pl.id]||{})), mostService: SERVICES.NONE, mostChoice: 0 });
      setLeast(pl.id, { ...((prefs[pl.id]||{})), leastService: pl.service,  leastChoice: nextChoice(leastChosen) });
    }
    setDragPayload(null);
  };

  const removeFrom = (bucket, id) => {
    if (bucket === "MOST") setMost(id,  { ...((prefs[id]||{})), mostService: SERVICES.NONE, mostChoice: 0 });
    else                   setLeast(id, { ...((prefs[id]||{})), leastService: SERVICES.NONE, leastChoice: 0 });
  };

  const shell = { border:'1px solid #e5e7eb', borderRadius:14, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.04)' };
  const title = { fontWeight:900, fontSize:14, padding:'8px 10px', borderBottom:'1px solid #e5e7eb', background:'#f8fafc' };
  const pad   = { padding:10 };

  return (
    <div style={{ maxWidth: 1120, margin:'12px auto', padding:'0 12px' }}>
      <div style={{ display:'grid', gap:16, gridTemplateColumns:'1fr 1fr 1fr' }}>
        {/* Library (compact grid of chips) */}
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
                  {MONTH_FULL[new Date(m.id).getMonth()]} {new Date(m.id).getDate()} — {m.service}
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
                  {MONTH_FULL[new Date(m.id).getMonth()]} {new Date(m.id).getDate()} — {m.service}
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


/* Attending picker + limits */
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

/* Live sidebar of choices */
function LiveChoices({ prefs }) {
  const all = useMemo(() => {
    const rows = [];
    for (const id of allWeekendIds) {
      const p = prefs[id];
      if (!p) continue;
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) rows.push({ kind:'MOST', id, svc:p.mostService, choice:p.mostChoice });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) rows.push({ kind:'LEAST', id, svc:p.leastService, choice:p.leastChoice });
    }
    rows.sort((a,b)=> a.kind.localeCompare(b.kind) || a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    return rows;
  }, [prefs]);

  const human = (id) => {
    for (const arr of Object.values(months)) {
      const w = arr.find(x => x.date === id);
      if (w) return w.d;
    }
    return id;
  };

  return (
    <div style={{ position:'sticky', top: 92, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Your choices (live)</div>
      {all.length === 0 ? (
        <div style={{ fontSize: 13, color:'#64748b' }}>No choices yet.</div>
      ) : (
        <div style={{ display:'grid', gap: 6 }}>
          {all.map((r,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span>{r.kind} #{r.choice}</span>
              <span>{r.svc} • {human(r.id)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Command Palette (Ctrl/⌘+K) */
function useCommandPalette({ actions }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v)=>!v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(()=>{ if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return actions;
    return actions.filter(a => a.title.toLowerCase().includes(s));
  }, [q, actions]);

  const palette = !open ? null : (
    <div
      onClick={()=>setOpen(false)}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop: '15vh', zIndex: 1000 }}
    >
      <div onClick={(e)=>e.stopPropagation()} style={{ width: 640, background:'#fff', borderRadius:12, boxShadow:'0 20px 50px rgba(0,0,0,0.25)', overflow:'hidden' }}>
        <div style={{ padding:10, borderBottom:'1px solid #e5e7eb' }}>
          <input
            ref={inputRef}
            placeholder="Type a command…"
            value={q}
            onChange={e=>setQ(e.target.value)}
            style={{ width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8 }}
          />
        </div>
        <div style={{ maxHeight:'50vh', overflow:'auto' }}>
          {filtered.map((a, i)=>(
            <button
              key={i}
              onClick={()=>{ a.run(); setOpen(false); }}
              style={{ display:'flex', width:'100%', textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #f1f5f9', background:'#fff', cursor:'pointer' }}
            >
              <div>
                <div style={{ fontWeight:700 }}>{a.title}</div>
                {a.desc && <div style={{ fontSize:12, color:'#64748b' }}>{a.desc}</div>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding:12, color:'#64748b' }}>No results</div>
          )}
        </div>
      </div>
    </div>
  );

  return { palette, open, setOpen };
}

/* App */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('admin') === '1';

  /* Firebase badge state */
  const [fbOk, setFbOk] = useState(null); // null=unknown, true=ok, false=err

  /* Mode tabs */
  const MODES = ['Calendar', 'QuickAdd', 'RankBoard', 'DragBuckets'];
  const [mode, setMode] = useState('Calendar');

  /* Auth */
  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUid(u.uid);
          setStatus('Loading profile & preferences…');
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setFbOk(false);
      }
    })();
  }, []);

  const profileDocRef = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'profile'), 'current');
  const prefsDocRef   = (uidX) => doc(collection(db, 'artifacts', appId, 'users', uidX, 'preferences'), 'calendar-preferences');

  /* Load persisted profile/prefs */
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
        setFbOk(true);
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
        setFbOk(false);
      }
    })();
  }, [uid]);

  /* Auto-fill service when only one available (once) */
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

  /* Setters with enforcement */
  const setMost = useCallback((id, v) => {
    const avail = availabilityByWeekend[id] || [];
    const svc = avail.includes(v.mostService) ? v.mostService : SERVICES.NONE;
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), mostService: svc, mostChoice: v.mostChoice } }));
  }, []);
  const setLeast = useCallback((id, v) => {
    const avail = availabilityByWeekend[id] || [];
    const svc = avail.includes(v.leastService) ? v.leastService : SERVICES.NONE;
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), leastService: svc, leastChoice: v.leastChoice } }));
  }, []);

  /* Counts */
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
      alert('Preferences submitted. Downloads now reflect your final locked choices.');
      setFbOk(true);
    } catch (e) {
      console.error(e);
      alert('Save failed. Please try again.');
      setFbOk(false);
    }
  };

  const downloadMyCSV = () => {
    const { top10, bottom10 } = assembleTopBottom();
    const rows = [
      ...top10.map(t => ({ attendee: profile.name, email: profile.email || '', kind: 'MOST',  choice: t.choice, service: t.service, weekend: humanDate(t.weekend) })),
      ...bottom10.map(b => ({ attendee: profile.name, email: profile.email || '', kind: 'LEAST', choice: b.choice, service: b.service, weekend: humanDate(b.weekend) })),
    ];
    const fn = submitted ? `preferences_${profile.name || 'attending'}.csv` : `preferences_preview_${profile.name || 'attending'}.csv`;
    downloadCSV(fn, rows);
  };
  const downloadMyWord = () => {
    const { top10, bottom10 } = assembleTopBottom();
    const top = top10.map(t => ({ ...t, weekend: humanDate(t.weekend) }));
    const bot = bottom10.map(b => ({ ...b, weekend: humanDate(b.weekend) }));
    const html = docHtml(profile.name, profile.email, top, bot);
    const fn = submitted ? `preferences_${profile.name || 'attending'}.doc` : `preferences_preview_${profile.name || 'attending'}.doc`;
    downloadBlob(fn, 'application/msword', html);
  };

  const collapseAll = val => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));
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

  /* Admin CSV */
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const loadAdmin = async () => {
    try {
      const qy = query(collectionGroup(db, 'preferences'));
      const snap = await getDocs(qy);
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
      setFbOk(true);
    } catch (e) {
      console.error(e);
      setFbOk(false);
    }
  };
  useEffect(() => {
    if (isAdmin && uid && !adminLoaded) { loadAdmin().catch(console.error); }
  }, [isAdmin, uid, adminLoaded]);

  /* Flattened weekends for non-calendar modes */
  const monthsFlat = useMemo(() => {
    const rows = [];
    for (const mk of MONTH_KEYS) {
      for (const w of months[mk]) rows.push({ ...w, month: MONTH_FULL[parseInt(mk,10)-1] });
    }
    return rows;
  }, []);

  /* Human label from id */
  function humanDate(id) {
    for (const arr of Object.values(months)) {
      const w = arr.find(x => x.date === id);
      if (w) return w.d;
    }
    return id;
  }

  /* Palette actions */
  const { palette } = useCommandPalette({
    actions: [
      ...MODES.map(m => ({ title: `Switch to: ${m}`, run: () => setMode(m) })),
      ...MONTH_KEYS.map((mk,i)=>({ title:`Jump to: ${MONTH_FULL[i]}`, run:()=>jumpTo(mk) })),
      { title: 'Preview CSV', desc:'Download your current selections as CSV', run: downloadMyCSV },
      { title: 'Preview Word', desc:'Download your current selections as Word', run: downloadMyWord },
      { title: 'Collapse all months', run: ()=>collapseAll(true) },
      { title: 'Expand all months', run: ()=>collapseAll(false) },
    ]
  });

  /* Name-first guard */
  const needsName = !profile.name;
  const disabled = needsName || submitted;

  /* UI */
  const countsLabel = `Most choices: ${counts.mostCount} • Least choices: ${counts.leastCount}${submitted ? ' • (Locked after submission)' : ''}`;

  return (
    <div className="min-h-screen" style={{ background:'#f1f5f9', fontSize: 15 }}>
      {/* Sticky top: mode tabs + jump + preview buttons + badge */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(4px)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 12px', display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 10, alignItems: 'center' }}>
          {/* Mode tabs */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {MODES.map(m => (
              <button
                key={m}
                onClick={()=>setMode(m)}
                style={{
                  padding:'6px 10px',
                  border:'1px solid #e5e7eb',
                  background: mode===m ? '#111827' : '#fff',
                  color: mode===m ? '#fff' : '#111827',
                  borderRadius: 999,
                  fontSize:12,
                  cursor:'pointer'
                }}
                title="Switch view"
              >
                {m}
              </button>
            ))}
          </div>

          {/* Jump bar */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
            <strong style={{ marginRight: 4 }}>Jump:</strong>
            {MONTH_KEYS.map((mk, i) => (
              <button key={mk} onClick={() => jumpTo(mk)} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                {MONTH_FULL[i].slice(0,3)}
              </button>
            ))}
          </div>

          {/* Preview buttons (same line) */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button onClick={downloadMyCSV}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #059669', background: '#10b981', color:'#fff', fontSize:12, cursor:'pointer' }}>
              Preview CSV
            </button>
            <button onClick={downloadMyWord} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #4f46e5', background: '#6366f1', color:'#fff', fontSize:12, cursor:'pointer' }}>
              Preview Word
            </button>
          </div>

          {/* Firebase badge */}
          <div title="Firebase connectivity">
            <span style={{
              padding:'6px 10px',
              borderRadius: 999,
              border: `1px solid ${fbOk===false ? '#ef4444' : '#10b981'}`,
              background: fbOk===false ? '#fee2e2' : '#ecfdf5',
              color: fbOk===false ? '#991b1b' : '#065f46',
              fontSize:12
            }}>
              Firebase: {fbOk===null ? '…' : (fbOk ? 'Connected ✓' : 'Error ✕')}
            </span>
          </div>
        </div>
      </div>

      {/* Header + instructions */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 12px 0' }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color:'#0f172a', marginBottom: 8 }}>2026 Preferences (RNI & COA)</h1>
        <ol style={{ margin: '8px 0 12px', paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.45, listStyle: 'decimal' }}>
          <li style={{ marginBottom: 4 }}>Select your name below. You will see the number of weekends you wanted.</li>
          <li style={{ marginBottom: 4 }}>Use any view (Calendar / QuickAdd / RankBoard / DragBuckets) to choose as many <strong>Most</strong> and <strong>Least</strong> preferred weekends as you need. For each selection, pick a <b>service</b> and a <b>choice #</b>.</li>
          <li style={{ marginBottom: 4 }}>You can download a preview anytime.</li>
          <li style={{ marginBottom: 4 }}>Submit to lock your preferences once you are done.</li>
        </ol>
        <div style={{ fontSize: 13, color: '#0f5132', background: '#d1e7dd', border: '1px solid #badbcc', padding: '10px 12px', borderRadius: 10, marginBottom: 10 }}>
          Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible. This is a <b>ranking</b> process; selecting more weekends increases the chance you receive more of your preferred weekends overall.
        </div>
        <div className="mb-3 text-sm" style={{ color:'#3730a3', background:'#eef2ff', borderLeft:'4px solid #a5b4fc', borderRadius:6, padding:'10px 12px' }}>
          Status: {status} • {countsLabel}
        </div>
        <AttendingIdentity profile={profile} saveProfile={saveProfile} />
      </div>

      {/* Body: main + live sidebar */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 12px 24px', display:'grid', gridTemplateColumns:'2fr 1fr', gap: 16 }}>
        <div>
          {/* Views */}
          {mode === 'Calendar' && (
            <>
              {/* 2×6 grid centered */}
              <div style={{
                maxWidth: 1120, margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(340px, 1fr))',
                gap: 24,
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
                    cardRef={null}
                    locked={submitted || needsName}
                  />
                ))}
              </div>
              {/* Expand/Collapse helpers under grid */}
              <div style={{ maxWidth:1120, margin:'12px auto 0', display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => collapseAll(true)}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Collapse all</button>
                <button onClick={() => collapseAll(false)} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Expand all</button>
              </div>
            </>
          )}

          {mode === 'QuickAdd' && (
            <QuickAdd
              monthsFlat={monthsFlat}
              prefs={prefs}
              setMost={setMost}
              setLeast={setLeast}
              disabled={disabled}
            />
          )}

          {mode === 'RankBoard' && (
            <RankBoard
              monthsFlat={monthsFlat}
              prefs={prefs}
              setMost={setMost}
              setLeast={setLeast}
              disabled={disabled}
            />
          )}

          {mode === 'DragBuckets' && (
            <DragBuckets
              monthsFlat={monthsFlat}
              prefs={prefs}
              setMost={setMost}
              setLeast={setLeast}
              disabled={disabled}
            />
          )}

          {/* Name-first overlay hint */}
          {needsName && (
            <div style={{ marginTop: 12, padding:'10px 12px', background:'#fff7ed', border:'1px solid #fed7aa', color:'#7c2d12', borderRadius: 10 }}>
              Please select your name above to begin entering choices.
            </div>
          )}
        </div>

        {/* Live sidebar */}
        <div>
          <LiveChoices prefs={prefs} />
        </div>
      </div>

      {/* Submit */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 12px 8px', display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        <button
          className={`${profile.name && !submitted ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-3 px-6 rounded-xl font-bold`}
          disabled={!profile.name || submitted}
          onClick={handleSubmit}
        >
          {submitted ? 'Submitted (Locked)' : 'Submit Final Preferences'}
        </button>
        <span className="text-sm" style={{ color:'#475569' }}>
          {submitted ? 'Locked. Downloads reflect your final choices.' : 'Tip: use Preview CSV/Word above to save your current selections.'}
        </span>
      </div>

      {/* Build label */}
      <div style={{maxWidth:1200, margin:"0 auto", padding:"0 12px 24px", textAlign:"right", color:"#64748b", fontSize:12}}>
        Build: {__APP_VERSION__}
      </div>

      {/* Command Palette */}
      {palette}
    </div>
  );
}
