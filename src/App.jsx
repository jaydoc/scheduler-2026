// src/App.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

/* ------------ Build tag ------------ */
const __APP_VERSION__ = "v13.0 — multi-UI + fixed DragBuckets + palette";

/* ------------ Firebase config (safe fallbacks) ------------ */
const LOCAL_FALLBACK = {
  apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
  authDomain: "attending-schedule-2026.firebaseapp.com",
  projectId: "attending-schedule-2026",
  storageBucket: "attending-schedule-2026.firebasestorage.app",
  messagingSenderId: "777996986623",
  appId: "1:777996986623:web:0a8697cccb63149d9744ca",
  measurementId: "G-TJXCM9P7W2",
};
const firebaseConfig = (()=>{
  try { if (typeof __firebase_config !== 'undefined' && __firebase_config) return JSON.parse(__firebase_config); } catch {}
  if (typeof window !== 'undefined' && window.FALLBACK_FIREBASE_CONFIG) return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();
const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v13";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ------------ Constants ------------ */
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

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

const MONTH_KEYS  = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ------------ Calendar data (Sat start; example fills) ------------ */
const months = {
  '01': [{ day:'10',date:'2026-01-10',rni:null,coa:null },
         { day:'17-19',date:'2026-01-17',rni:null,coa:null,detail:'MLK Day' },
         { day:'24',date:'2026-01-24',rni:null,coa:null },
         { day:'31',date:'2026-01-31',rni:null,coa:null }],
  '02': [{ day:'7',date:'2026-02-07',rni:'Boone',coa:null },
         { day:'14',date:'2026-02-14',rni:'Boone',coa:null },
         { day:'21',date:'2026-02-21',rni:'Willis',coa:null },
         { day:'28',date:'2026-02-28',rni:'Willis',coa:null }],
  '03': [{ day:'7',date:'2026-03-07',rni:'Ambal',coa:'Arora',isTaken:true },
         { day:'14',date:'2026-03-14',rni:null,coa:'Winter' },
         { day:'21',date:'2026-03-21',rni:'Ambal',coa:'Arora',isTaken:true },
         { day:'28',date:'2026-03-28',rni:null,coa:'Arora' }],
  '04': [{ day:'4',date:'2026-04-04',rni:'Sims',coa:null },
         { day:'11',date:'2026-04-11',rni:null,coa:null },
         { day:'18',date:'2026-04-18',rni:'Sims',coa:null },
         { day:'25',date:'2026-04-25',rni:null,coa:null,detail:'PAS Meeting Coverage' }],
  '05': [{ day:'2',date:'2026-05-02',rni:null,coa:null },
         { day:'9',date:'2026-05-09',rni:'Arora',coa:null },
         { day:'16',date:'2026-05-16',rni:'Arora',coa:null },
         { day:'23-25',date:'2026-05-23',rni:null,coa:null,detail:'Memorial Day' },
         { day:'30',date:'2026-05-30',rni:'Arora',coa:null }],
  '06': [{ day:'6',date:'2026-06-06',rni:'Schuyler',coa:'Winter',isTaken:true },
         { day:'13',date:'2026-06-13',rni:'Boone',coa:null },
         { day:'19-21',date:'2026-06-19',rni:'Schuyler',coa:'Winter',isTaken:true,detail:'Juneteenth Day' },
         { day:'27',date:'2026-06-27',rni:'Boone',coa:null }],
  '07': [{ day:'4-6',date:'2026-07-04',rni:'Jain',coa:'Carlo',isTaken:true,detail:'4th of July' },
         { day:'11',date:'2026-07-11',rni:null,coa:'Willis' },
         { day:'18',date:'2026-07-18',rni:null,coa:null },
         { day:'25',date:'2026-07-25',rni:'Shukla',coa:'Willis',isTaken:true }],
  '08': [{ day:'1',date:'2026-08-01',rni:'Boone',coa:null },
         { day:'8',date:'2026-08-08',rni:'Sims',coa:'Carlo',isTaken:true },
         { day:'15',date:'2026-08-15',rni:'Boone',coa:null },
         { day:'22',date:'2026-08-22',rni:'Sims',coa:null },
         { day:'29',date:'2026-08-29',rni:null,coa:'Carlo' }],
  '09': [{ day:'5-7',date:'2026-09-05',rni:'Mackay',coa:null,detail:'Labor Day' },
         { day:'12',date:'2026-09-12',rni:null,coa:null },
         { day:'19',date:'2026-09-19',rni:null,coa:null },
         { day:'26',date:'2026-09-26',rni:null,coa:null }],
  '10': [{ day:'3',date:'2026-10-03',rni:'Kandasamy',coa:'Carlo',isTaken:true },
         { day:'10',date:'2026-10-10',rni:'Travers',coa:'Bhatia',isTaken:true },
         { day:'17',date:'2026-10-17',rni:'Kandasamy',coa:null },
         { day:'24',date:'2026-10-24',rni:'Travers',coa:'Bhatia',isTaken:true },
         { day:'31',date:'2026-10-31',rni:'Kandasamy',coa:'Carlo',isTaken:true }],
  '11': [{ day:'7',date:'2026-11-07',rni:'Ambal',coa:null },
         { day:'14',date:'2026-11-14',rni:'Bhatia',coa:null },
         { day:'21',date:'2026-11-21',rni:'Ambal',coa:null },
         { day:'26-28',date:'2026-11-26',rni:'Bhatia',coa:null,detail:'Thanksgiving' }],
  '12': [{ day:'5',date:'2026-12-05',rni:'Travers',coa:'Kandasamy',isTaken:true },
         { day:'12',date:'2026-12-12',rni:null,coa:null },
         { day:'19',date:'2026-12-19',rni:'Travers',coa:'Kandasamy',isTaken:true },
         { day:'24-28',date:'2026-12-24',rni:'Bhatia',coa:'Arora',isTaken:true,detail:'Christmas' },
         { day:'31-Jan 4',date:'2026-12-31',rni:'Kane',coa:'Kandasamy',isTaken:true,detail:"New Year's Eve" }],
};

/* ------------ Derived structures ------------ */
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

/* ------------ Helpers ------------ */
const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
  });
  return base;
}
const fmtLabel = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
};

/* CSV/Word download */
function toCSV(rows){ const headers = Object.keys(rows[0]||{}); const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`; return [headers.join(','), rows.map(r=>headers.map(h=>esc(r[h])).join(',')).join('\n')].join('\n'); }
function downloadBlob(filename, mime, content){ const blob = new Blob([content], {type:mime}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function downloadCSV(filename, rows){ if (!rows.length){ alert('Nothing to export.'); return; } downloadBlob(filename, 'text/csv;charset=utf-8;', toCSV(rows)); }
function docHtml(name, email, top, bottom){
  const esc = s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const row = (kind, r)=>`<tr><td>${esc(kind)}</td><td>${esc(r.choice)}</td><td>${esc(r.service||'')}</td><td>${esc(fmtLabel(r.weekend))}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Preferences</title></head><body>
  <h2>2026 Weekend Preferences</h2><p><b>Name:</b> ${esc(name||'')} &nbsp; <b>Email:</b> ${esc(email||'')}</p>
  <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse">
    <thead style="background:#f3f4f6"><tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend</th></tr></thead>
    <tbody>${top.map(r=>row('MOST',r)).join('')}${bottom.map(r=>row('LEAST',r)).join('')}</tbody>
  </table><p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p></body></html>`;
}

/* ------------ Small UI atoms ------------ */
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

/* ------------ Month card (Calendar UI) ------------ */
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
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{fmtLabel(w.date)}</div>
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
                          placeholder="Choice #"
                          maxN={allWeekendIds.length}
                        />
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
                          placeholder="Choice #"
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

/* ------------ Calendar Grid wrapper ------------ */
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
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '32px', alignItems: 'stretch', justifyContent: 'center', justifyItems: 'stretch'
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
            locked={submitted}
          />
        ))}
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

/* ------------ DragBuckets (fixed per your notes) ------------ */
function DragBucketsUI({ prefs, setMost, setLeast, submitted, requireName }) {
  // Build compact library of chips: one per *available* service per weekend
  const libraryItems = useMemo(() => {
    return MONTH_KEYS.flatMap(mk =>
      months[mk].flatMap(w => {
        const avail = availabilityByWeekend[w.date] || [];
        return avail.map(svc => ({ id: w.date, svc, key: `${w.date}:${svc}`, label: `${fmtLabel(w.date)} — ${svc}` }));
      })
    );
  }, []);

  const mostChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) arr.push({ id, svc: p.mostService, choice: p.mostChoice });
    arr.sort((a,b)=> (a.choice-b.choice) || (allWeekendIds.indexOf(a.id)-allWeekendIds.indexOf(b.id)));
    return arr;
  }, [prefs]);
  const leastChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) arr.push({ id, svc: p.leastService, choice: p.leastChoice });
    arr.sort((a,b)=> (a.choice-b.choice) || (allWeekendIds.indexOf(a.id)-allWeekendIds.indexOf(b.id)));
    return arr;
  }, [prefs]);

  const nextChoice = (list) => list.reduce((m,x)=>Math.max(m, x.choice||0),0)+1;

  const onDragStart = (payload)=>(e)=>{ if(submitted||!requireName){ e.preventDefault(); return;} e.dataTransfer.setData('text/plain', JSON.stringify(payload)); e.dataTransfer.effectAllowed='move'; };
  const onDragOver  = (e)=>{ if(submitted||!requireName) return; e.preventDefault(); e.dataTransfer.dropEffect='move'; };
  const onDrop = (bucket)=>(e)=>{
    if (submitted||!requireName) return;
    e.preventDefault();
    let pl = null; try { pl = JSON.parse(e.dataTransfer.getData('text/plain')); } catch {}
    if (!pl) return;
    const avail = availabilityByWeekend[pl.id] || [];
    if (!avail.includes(pl.svc)) return; // enforce availability

    if (bucket==='MOST'){
      setLeast(pl.id, { ...(prefs[pl.id]||{}), leastService: SERVICES.NONE, leastChoice: 0 });
      setMost (pl.id, { ...(prefs[pl.id]||{}), mostService:  pl.svc,     mostChoice:  nextChoice(mostChosen) });
    } else {
      setMost (pl.id, { ...(prefs[pl.id]||{}), mostService:  SERVICES.NONE, mostChoice: 0 });
      setLeast(pl.id, { ...(prefs[pl.id]||{}), leastService: pl.svc,       leastChoice: nextChoice(leastChosen) });
    }
  };
  const remove = (bucket,id)=> bucket==='MOST'
    ? setMost(id,  { ...(prefs[id]||{}), mostService: SERVICES.NONE, mostChoice: 0 })
    : setLeast(id, { ...(prefs[id]||{}), leastService: SERVICES.NONE, leastChoice: 0 });

  const shell = { border:'1px solid #e5e7eb', borderRadius:14, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.04)' };
  const title = { fontWeight:900, fontSize:14, padding:'8px 10px', borderBottom:'1px solid #e5e7eb', background:'#f8fafc' };
  const pad   = { padding:10 };

  return (
    <div style={{ maxWidth:1120, margin:'12px auto', padding:'0 12px' }}>
      <div style={{ display:'grid', gap:16, gridTemplateColumns:'1fr 1fr 1fr' }}>
        {/* Library grid (compact) */}
        <div style={shell}>
          <div style={title}>Available (drag a chip)</div>
          <div style={pad}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:8 }}>
              {libraryItems.map(it=>(
                <div
                  key={it.key}
                  draggable={requireName && !submitted}
                  onDragStart={onDragStart({ id: it.id, svc: it.svc })}
                  title={requireName ? "Drag to Most/Least" : "Select your name first"}
                  style={{
                    padding:'6px 10px', borderRadius:999, border:'1px solid #e5e7eb',
                    background:'#fff', fontSize:12, cursor:(requireName && !submitted) ? 'grab':'not-allowed',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'
                  }}
                >
                  {it.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* MOST bucket */}
        <div style={shell} onDragOver={onDragOver} onDrop={onDrop('MOST')}>
          <div style={title}>Most (drop to add)</div>
          <div style={{ ...pad, minHeight:120, display:'flex', flexDirection:'column', gap:8 }}>
            {mostChosen.length===0 ? <div style={{ fontSize:12, color:'#64748b' }}>— empty —</div> :
              mostChosen.map(m=>(
                <div key={`M-${m.id}-${m.choice}`} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ padding:'4px 8px', borderRadius:8, background:'#d1fae5', border:'1px solid #10b98133', fontSize:12 }}>#{m.choice}</span>
                  <span style={{ fontSize:13 }}>{fmtLabel(m.id)} — {m.svc}</span>
                  <button onClick={()=>remove('MOST',m.id)} style={{ marginLeft:'auto', fontSize:12, border:'1px solid #e5e7eb', borderRadius:8, padding:'2px 6px' }}>Remove</button>
                </div>
              ))
            }
          </div>
        </div>
        {/* LEAST bucket */}
        <div style={shell} onDragOver={onDragOver} onDrop={onDrop('LEAST')}>
          <div style={title}>Least (drop to add)</div>
          <div style={{ ...pad, minHeight:120, display:'flex', flexDirection:'column', gap:8 }}>
            {leastChosen.length===0 ? <div style={{ fontSize:12, color:'#64748b' }}>— empty —</div> :
              leastChosen.map(m=>(
                <div key={`L-${m.id}-${m.choice}`} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ padding:'4px 8px', borderRadius:8, background:'#fee2e2', border:'1px solid #ef444433', fontSize:12 }}>#{m.choice}</span>
                  <span style={{ fontSize:13 }}>{fmtLabel(m.id)} — {m.svc}</span>
                  <button onClick={()=>remove('LEAST',m.id)} style={{ marginLeft:'auto', fontSize:12, border:'1px solid #e5e7eb', borderRadius:8, padding:'2px 6px' }}>Remove</button>
                </div>
              ))
            }
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

/* ------------ QuickAdd (fast form) ------------ */
function QuickAddUI({ prefs, setMost, setLeast, submitted, requireName }) {
  const weeks = useMemo(()=> MONTH_KEYS.flatMap(mk => months[mk]), []);
  const sorted = weeks.slice().sort((a,b)=> new Date(a.date)-new Date(b.date));
  const maxN = allWeekendIds.length;

  const row = (w)=>{
    const p = prefs[w.date] || { mostService:SERVICES.NONE, mostChoice:0, leastService:SERVICES.NONE, leastChoice:0 };
    const avail = availabilityByWeekend[w.date] || [];
    return (
      <tr key={w.date}>
        <td style={{ padding:'6px 8px' }}>{fmtLabel(w.date)}</td>
        <td style={{ padding:'6px 8px' }}>
          <RadioServiceLimited available={avail} disabled={submitted||!requireName} value={p.mostService} onChange={svc=>setMost(w.date,{...p, mostService:svc})} name={`qm-${w.date}`} />
        </td>
        <td style={{ padding:'6px 8px' }}>
          <ChoiceSelect disabled={submitted||!requireName||p.mostService===SERVICES.NONE} value={p.mostChoice} onChange={v=>setMost(w.date,{...p, mostChoice:v})} placeholder="Choice #" maxN={maxN}/>
        </td>
        <td style={{ padding:'6px 8px' }}>
          <RadioServiceLimited available={avail} disabled={submitted||!requireName} value={p.leastService} onChange={svc=>setLeast(w.date,{...p, leastService:svc})} name={`ql-${w.date}`} />
        </td>
        <td style={{ padding:'6px 8px' }}>
          <ChoiceSelect disabled={submitted||!requireName||p.leastService===SERVICES.NONE} value={p.leastChoice} onChange={v=>setLeast(w.date,{...p, leastChoice:v})} placeholder="Choice #" maxN={maxN}/>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ maxWidth:1120, margin:'0 auto', padding:'0 12px 16px' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #e5e7eb', background:'#fff' }}>
        <thead style={{ background:'#f8fafc' }}>
          <tr>
            <th style={{ textAlign:'left', padding:'8px' }}>Weekend</th>
            <th style={{ textAlign:'left', padding:'8px' }}>Most: Service</th>
            <th style={{ textAlign:'left', padding:'8px' }}>Most: Choice #</th>
            <th style={{ textAlign:'left', padding:'8px' }}>Least: Service</th>
            <th style={{ textAlign:'left', padding:'8px' }}>Least: Choice #</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(row)}
        </tbody>
      </table>
      {!requireName && <div style={{ marginTop:8, fontSize:12, color:'#991b1b', background:'#fee2e2', border:'1px solid #fecaca', padding:'6px 8px', borderRadius:8 }}>Select your name above to edit.</div>}
    </div>
  );
}

/* ------------ RankBoard (edit selections only) ------------ */
function RankBoardUI({ prefs, setMost, setLeast, submitted }) {
  const top = [], bottom = [];
  for (const [id,p] of Object.entries(prefs)){
    if (p.mostService!==SERVICES.NONE && p.mostChoice>0) top.push({ id, service:p.mostService, choice:p.mostChoice });
    if (p.leastService!==SERVICES.NONE && p.leastChoice>0) bottom.push({ id, service:p.leastService, choice:p.leastChoice });
  }
  top.sort((a,b)=>a.choice-b.choice); bottom.sort((a,b)=>a.choice-b.choice);
  const maxN = allWeekendIds.length;

  const row = (r, kind) => (
    <tr key={`${kind}-${r.id}-${r.choice}`}>
      <td style={{ padding:'6px 8px' }}>{fmtLabel(r.id)}</td>
      <td style={{ padding:'6px 8px' }}>{r.service}</td>
      <td style={{ padding:'6px 8px' }}>
        <ChoiceSelect
          value={r.choice}
          onChange={v => kind==='MOST' ? setMost(r.id, { ...(prefs[r.id]||{}), mostService:r.service, mostChoice:v })
                                      : setLeast(r.id,{ ...(prefs[r.id]||{}), leastService:r.service, leastChoice:v })}
          disabled={submitted}
          placeholder="Choice #"
          maxN={maxN}
        />
      </td>
      <td style={{ padding:'6px 8px' }}>
        <button onClick={()=> kind==='MOST'
          ? setMost(r.id, { ...(prefs[r.id]||{}), mostService:SERVICES.NONE, mostChoice:0 })
          : setLeast(r.id, { ...(prefs[r.id]||{}), leastService:SERVICES.NONE, leastChoice:0 })
        } style={{ fontSize:12, border:'1px solid #e5e7eb', borderRadius:8, padding:'2px 6px' }}>Remove</button>
      </td>
    </tr>
  );

  const board = (title, list, kind) => (
    <div style={{ border:'1px solid #e5e7eb', borderRadius:12, background:'#fff', overflow:'hidden' }}>
      <div style={{ padding:'8px 10px', fontWeight:900, background:'#f8fafc' }}>{title}</div>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <tbody>{list.length? list.map(r=>row(r,kind)) : <tr><td style={{ padding:10, color:'#64748b' }}>— empty —</td></tr>}</tbody>
      </table>
    </div>
  );

  return (
    <div style={{ maxWidth:1120, margin:'0 auto', padding:'0 12px 16px', display:'grid', gap:16, gridTemplateColumns:'1fr 1fr' }}>
      {board('Most (service + choice)', top, 'MOST')}
      {board('Least (service + choice)', bottom, 'LEAST')}
    </div>
  );
}

/* ------------ Identity block ------------ */
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

/* ------------ Command Palette (⌘/Ctrl-K) ------------ */
function useCommandPalette(commands){
  const [open, setOpen] = useState(false);
  const [q, setQ]     = useState('');
  useEffect(()=>{
    const h = (e)=>{ if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setOpen(v=>!v);} };
    window.addEventListener('keydown', h); return ()=>window.removeEventListener('keydown', h);
  },[]);
  const list = commands.filter(c => c.title.toLowerCase().includes(q.toLowerCase()));
  return {
    Portal: ()=> open ? (
      <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, background:'#0006', zIndex:1000, display:'grid', placeItems:'start center', paddingTop:120 }}>
        <div onClick={e=>e.stopPropagation()} style={{ width:640, background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 10px 30px rgba(0,0,0,.2)' }}>
          <div style={{ padding:10, borderBottom:'1px solid #e5e7eb' }}>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type a command…" style={{ width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8 }}/>
          </div>
          <div style={{ maxHeight:360, overflow:'auto' }}>
            {list.map((c,i)=>(
              <div key={i} onClick={()=>{ setOpen(false); c.run(); }} style={{ padding:12, borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}>
                <div style={{ fontWeight:700 }}>{c.title}</div>
                {c.desc && <div style={{ fontSize:12, color:'#64748b' }}>{c.desc}</div>}
              </div>
            ))}
            {list.length===0 && <div style={{ padding:16, color:'#64748b' }}>No matches.</div>}
          </div>
        </div>
      </div>
    ) : null,
    open, setOpen
  };
}

/* ------------ App ------------ */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [fbOK, setFbOK] = useState(false);

  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));

  const params = new URLSearchParams(window.location.search);
  const uiParam = (params.get('ui') || '').toLowerCase(); // '', 'calendar','drag','quick','rank'
  const [ui, setUI] = useState(['calendar','drag','quick','rank'].includes(uiParam) ? uiParam : '');

  /* Firebase auth + small connectivity sanity check */
  useEffect(() => {
    (async () => {
      try {
        await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUid(u.uid);
          setStatus('Loading profile & preferences…');
          setFbOK(true);
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
          }
        }
        setStatus('Ready.');
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
      }
    })();
  }, [uid]);

  /* One-time auto-fill service when only one is available */
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

  /* Mutators */
  const setMost  = useCallback((id, v) => setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), mostService: v.mostService, mostChoice: v.mostChoice } })), []);
  const setLeast = useCallback((id, v) => setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), leastService: v.leastService, leastChoice: v.leastChoice } })), []);

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
    const top = [], bottom = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) bottom.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
    }
    const orderIdx = id => allWeekendIds.indexOf(id);
    top.sort((a,b)=> a.choice-b.choice || orderIdx(a.weekend)-orderIdx(b.weekend));
    bottom.sort((a,b)=> a.choice-b.choice || orderIdx(a.weekend)-orderIdx(b.weekend));
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

  const collapseAll = val => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));

  /* Palette commands */
  const palette = useCommandPalette([
    { title: "Switch: Calendar", run: ()=>{ setUI('calendar'); history.replaceState(null,'',`?ui=calendar`); } },
    { title: "Switch: DragBuckets", run: ()=>{ setUI('drag'); history.replaceState(null,'',`?ui=drag`); } },
    { title: "Switch: QuickAdd", run: ()=>{ setUI('quick'); history.replaceState(null,'',`?ui=quick`); } },
    { title: "Switch: RankBoard", run: ()=>{ setUI('rank'); history.replaceState(null,'',`?ui=rank`); } },
    { title: "Collapse all months", run: ()=>collapseAll(true) },
    { title: "Expand all months", run: ()=>collapseAll(false) },
    { title: "Preview CSV", run: downloadMyCSV },
    { title: "Preview Word", run: downloadMyWord },
  ]);

  /* Landing links */
  const Landing = () => (
    <div style={{ maxWidth:1120, margin:'0 auto', padding:'16px 12px' }}>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-3">2026 Preferences (RNI & COA)</h1>
      <p style={{ marginBottom:12, color:'#334155' }}>Choose an input mode:</p>
      <div style={{ display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))' }}>
        {[
          { k:'calendar',  t:'Calendar',  d:'Monthly tiles with Sat–Sun and service availability.' },
          { k:'drag',      t:'DragBuckets', d:'Drag chips from pool into Most/Least buckets.' },
          { k:'quick',     t:'QuickAdd',  d:'Fast table to set service + choice #' },
          { k:'rank',      t:'RankBoard', d:'Edit only the items you have ranked.' },
        ].map(x=>(
          <a key={x.k} href={`?ui=${x.k}`} onClick={e=>{ e.preventDefault(); setUI(x.k); history.replaceState(null,'',`?ui=${x.k}`); }}
             style={{ padding:16, border:'1px solid #e5e7eb', borderRadius:12, background:'#fff', display:'block' }}>
            <div style={{ fontWeight:900, marginBottom:6 }}>{x.t}</div>
            <div style={{ fontSize:13, color:'#64748b' }}>{x.d}</div>
          </a>
        ))}
      </div>
    </div>
  );

  /* Top controls (shared) */
  const TopBar = () => (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(4px)', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong style={{ marginRight: 8 }}>Jump:</strong>
        {MONTH_KEYS.map((mk, i) => (
          <button key={mk} onClick={() => {
            setCollapsed(prev => ({ ...prev, [mk]: false }));
            const el = document.getElementById(`month-${mk}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
            {MONTH_FULL[i].slice(0, 3)}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {/* Firebase badge inline */}
        <span style={{ fontSize:12, marginRight:8, padding:'4px 8px', borderRadius:999, border: `1px solid ${fbOK?'#059669':'#ef4444'}`, background: fbOK?'#ecfdf5':'#fee2e2', color: fbOK?'#065f46':'#991b1b' }}>
          Firebase: {fbOK ? 'Connected ✓' : 'Error ✗'}
        </span>
        <button onClick={()=>collapseAll(true)}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Collapse all</button>
        <button onClick={()=>collapseAll(false)} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>Expand all</button>
        <button onClick={downloadMyCSV}  style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #059669', background:'#10b981', color:'#fff', fontSize:12 }}>Preview/My CSV</button>
        <button onClick={downloadMyWord} style={{ padding:'6px 10px', borderRadius: 10, border:'1px solid #4f46e5', background:'#6366f1', color:'#fff', fontSize:12 }}>Preview/My Word</button>
      </div>
    </div>
  );

  /* Header + instructions (shared) */
  const HeaderBlock = () => (
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
  );

  const requireName = Boolean(profile?.name);

  /* Render */
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontSize: 15 }}>
      {ui ? <TopBar/> : null}
      <HeaderBlock/>

      {!ui && <Landing/>}

      {ui==='calendar' && (
        <CalendarGrid prefs={prefs} setMost={setMost} setLeast={setLeast} collapsed={collapsed} setCollapsed={setCollapsed} submitted={submitted}/>
      )}

      {ui==='drag' && (
        <DragBucketsUI prefs={prefs} setMost={setMost} setLeast={setLeast} submitted={submitted} requireName={requireName}/>
      )}

      {ui==='quick' && (
        <QuickAddUI prefs={prefs} setMost={setMost} setLeast={setLeast} submitted={submitted} requireName={requireName}/>
      )}

      {ui==='rank' && (
        <RankBoardUI prefs={prefs} setMost={setMost} setLeast={setLeast} submitted={submitted}/>
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
        <span style={{ marginLeft:'auto', fontSize:12, color:'#64748b' }}>Build: {__APP_VERSION__}</span>
      </div>

      {/* Command Palette Portal */}
      <palette.Portal />
    </div>
  );
}
