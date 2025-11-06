import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

/* ----------------------------------------------------------------------
   Firebase (keeps your prior pattern; honors __firebase_config if injected)
   ---------------------------------------------------------------------- */
const firebaseConfig = (() => {
  const FALLBACK = {
    apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
    authDomain: "attending-schedule-2026.firebaseapp.com",
    projectId: "attending-schedule-2026",
    storageBucket: "attending-schedule-2026.firebasestorage.app",
    messagingSenderId: "777996986623",
    appId: "1:777996986623:web:0a8697cccb63149d9744ca",
    measurementId: "G-TJXCM9P7W2"
  };
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try { return JSON.parse(__firebase_config); } catch { return FALLBACK; }
  }
  return FALLBACK;
})();

const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v6";
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const prefsDocRef = (uid) => doc(collection(db, 'artifacts', appId, 'users', uid, 'preferences'), 'calendar-preferences');

/* ----------------------------------------------------------------------
   Calendar data (same as before; Sat–Sun weekends by month)
   ---------------------------------------------------------------------- */
const months = {
  '01': [
    { day: '10', date: '2026-01-10', rni: null, coa: null },
    { day: '17-19', date: '2026-01-17', rni: null, coa: null, detail: 'MLK Day' },
    { day: '24', date: '2026-01-24', rni: null, coa: null },
    { day: '31', date: '2026-01-31', rni: null, coa: null },
  ],
  '02': [
    { day: '7', date: '2026-02-07', rni: 'Boone', coa: null },
    { day: '14', date: '2026-02-14', rni: 'Boone', coa: null },
    { day: '21', date: '2026-02-21', rni: 'Willis', coa: null },
    { day: '28', date: '2026-02-28', rni: 'Willis', coa: null },
  ],
  '03': [
    { day: '7', date: '2026-03-07', rni: 'Ambal', coa: 'Arora', isTaken: true },
    { day: '14', date: '2026-03-14', rni: null, coa: 'Winter' },
    { day: '21', date: '2026-03-21', rni: 'Ambal', coa: 'Arora', isTaken: true },
    { day: '28', date: '2026-03-28', rni: null, coa: 'Arora' },
  ],
  '04': [
    { day: '4', date: '2026-04-04', rni: 'Sims', coa: null },
    { day: '11', date: '2026-04-11', rni: null, coa: null },
    { day: '18', date: '2026-04-18', rni: 'Sims', coa: null },
    { day: '25', date: '2026-04-25', rni: null, coa: null, detail: 'PAS Meeting Coverage' },
  ],
  '05': [
    { day: '2', date: '2026-05-02', rni: null, coa: null },
    { day: '9', date: '2026-05-09', rni: 'Arora', coa: null },
    { day: '16', date: '2026-05-16', rni: 'Arora', coa: null },
    { day: '23-25', date: '2026-05-23', rni: null, coa: null, detail: 'Memorial Day' },
    { day: '30', date: '2026-05-30', rni: 'Arora', coa: null },
  ],
  '06': [
    { day: '6', date: '2026-06-06', rni: 'Schuyler', coa: 'Winter', isTaken: true },
    { day: '13', date: '2026-06-13', rni: 'Boone', coa: null },
    { day: '19-21', date: '2026-06-19', rni: 'Schuyler', coa: 'Winter', isTaken: true, detail: 'Juneteenth Day' },
    { day: '27', date: '2026-06-27', rni: 'Boone', coa: null },
  ],
  '07': [
    { day: '4-6', date: '2026-07-04', rni: 'Jain', coa: 'Carlo', isTaken: true, detail: '4th of July' },
    { day: '11', date: '2026-07-11', rni: null, coa: 'Willis' },
    { day: '18', date: '2026-07-18', rni: null, coa: null },
    { day: '25', date: '2026-07-25', rni: 'Shukla', coa: 'Willis', isTaken: true },
  ],
  '08': [
    { day: '1', date: '2026-08-01', rni: 'Boone', coa: null },
    { day: '8', date: '2026-08-08', rni: 'Sims', coa: 'Carlo', isTaken: true },
    { day: '15', date: '2026-08-15', rni: 'Boone', coa: null },
    { day: '22', date: '2026-08-22', rni: 'Sims', coa: null },
    { day: '29', date: '2026-08-29', rni: null, coa: 'Carlo' },
  ],
  '09': [
    { day: '5-7', date: '2026-09-05', rni: 'Mackay', coa: null, detail: 'Labor Day' },
    { day: '12', date: '2026-09-12', rni: null, coa: null },
    { day: '19', date: '2026-09-19', rni: null, coa: null },
    { day: '26', date: '2026-09-26', rni: null, coa: null },
  ],
  '10': [
    { day: '3', date: '2026-10-03', rni: 'Kandasamy', coa: 'Carlo', isTaken: true },
    { day: '10', date: '2026-10-10', rni: 'Travers', coa: 'Bhatia', isTaken: true },
    { day: '17', date: '2026-10-17', rni: 'Kandasamy', coa: null },
    { day: '24', date: '2026-10-24', rni: 'Travers', coa: 'Bhatia', isTaken: true },
    { day: '31', date: '2026-10-31', rni: 'Kandasamy', coa: 'Carlo', isTaken: true },
  ],
  '11': [
    { day: '7', date: '2026-11-07', rni: 'Ambal', coa: null },
    { day: '14', date: '2026-11-14', rni: 'Bhatia', coa: null },
    { day: '21', date: '2026-11-21', rni: 'Ambal', coa: null },
    { day: '26-28', date: '2026-11-26', rni: 'Bhatia', coa: null, isTaken: false, detail: 'Thanksgiving' },
  ],
  '12': [
    { day: '5', date: '2026-12-05', rni: 'Travers', coa: 'Kandasamy', isTaken: true },
    { day: '12', date: '2026-12-12', rni: null, coa: null },
    { day: '19', date: '2026-12-19', rni: 'Travers', coa: 'Kandasamy', isTaken: true },
    { day: '24-28', date: '2026-12-24', rni: 'Bhatia', coa: 'Arora', isTaken: true, detail: 'Christmas' },
    { day: '31-Jan 4', date: '2026-12-31', rni: 'Kane', coa: 'Kandasamy', isTaken: true, detail: "New Year's Eve" },
  ],
};

const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* ----------------------------------------------------------------------
   Preferences shape
   ---------------------------------------------------------------------- */
function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostRank: 0, leastService: SERVICES.NONE, leastRank: 0 };
  });
  return base;
}

/* ----------------------------------------------------------------------
   Small UI helpers
   ---------------------------------------------------------------------- */
const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });
const btn = (kind = 'white', disabled = false) => {
  const base = { padding: '6px 10px', borderRadius: 10, fontSize: 13, border: '1px solid #e2e8f0', background: '#fff', color: '#111827', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 };
  if (kind === 'primary') return { ...base, background: '#111827', color: '#fff', borderColor: '#111827' };
  if (kind === 'success') return { ...base, background: '#10b981', color: '#fff', borderColor: '#10b981' };
  return base;
};

function RadioService({ value, onChange, disabled, name }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <input type="radio" disabled={disabled} checked={value === SERVICES.RNI} onChange={() => onChange(SERVICES.RNI)} name={name} />
        RNI
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <input type="radio" disabled={disabled} checked={value === SERVICES.COA} onChange={() => onChange(SERVICES.COA)} name={name} />
        COA
      </label>
    </div>
  );
}

function RankSelect({ value, onChange, disabled, placeholder }) {
  return (
    <select
      disabled={disabled}
      value={String(value || 0)}
      onChange={e => onChange(parseInt(e.target.value, 10))}
      style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 10 }}
    >
      <option value="0">{placeholder}</option>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

/* ----------------------------------------------------------------------
   Month card (equal-height; collapsible; colored headers)
   ---------------------------------------------------------------------- */
const MONTH_COLORS = [
  { bg: '#fde68a', fg: '#1f2937', border: '#f59e0b' }, // Jan
  { bg: '#bfdbfe', fg: '#1f2937', border: '#3b82f6' }, // Feb
  { bg: '#bbf7d0', fg: '#064e3b', border: '#10b981' }, // Mar
  { bg: '#fecaca', fg: '#7f1d1d', border: '#f87171' }, // Apr
  { bg: '#ddd6fe', fg: '#312e81', border: '#8b5cf6' }, // May
  { bg: '#c7d2fe', fg: '#1e3a8a', border: '#6366f1' }, // Jun
  { bg: '#fbcfe8', fg: '#831843', border: '#ec4899' }, // Jul
  { bg: '#a7f3d0', fg: '#065f46', border: '#34d399' }, // Aug
  { bg: '#fcd34d', fg: '#1f2937', border: '#f59e0b' }, // Sep
  { bg: '#fca5a5', fg: '#7f1d1d', border: '#ef4444' }, // Oct
  { bg: '#93c5fd', fg: '#1e3a8a', border: '#3b82f6' }, // Nov
  { bg: '#86efac', fg: '#064e3b', border: '#22c55e' }, // Dec
];

// Equal-height trick: set a fixed minHeight for the card body.
// Tweak this constant if you want taller/shorter tiles.
const MONTH_MIN_HEIGHT = 520;

function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, cardRef }) {
  const color = MONTH_COLORS[parseInt(mk, 10) - 1] || MONTH_COLORS[0];

  return (
    <div
      ref={cardRef}
      id={`month-${mk}`}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid #e2e8f0`,
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
          padding: '10px 12px',
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
        <span style={{ fontWeight: 900 }}>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12, minHeight: MONTH_MIN_HEIGHT }}>
          {items.map(w => {
            const p = prefs[w.date] || { mostService: SERVICES.NONE, mostRank: 0, leastService: SERVICES.NONE, leastRank: 0 };
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const fullyAssigned = w.isTaken || (!rniOpen && !coaOpen);

            return (
              <div key={w.date} style={{
                padding: 12,
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: fullyAssigned ? '#f9fafb' : '#fff',
                opacity: fullyAssigned ? 0.75 : 1
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{w.day}</div>
                  {w.detail && <div style={chip('#fff7ed', '#c2410c')}>{w.detail}</div>}
                </div>

                <div style={{ fontSize: 12, color: '#475569', marginBottom: 8 }}>
                  <span className={`px-2 py-0.5 rounded-md`} style={{ background: rniOpen ? '#dbeafe' : '#e5e7eb', color: rniOpen ? '#1e3a8a' : '#374151', marginRight: 8 }}>
                    RNI: {rniOpen ? 'OPEN' : w.rni}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md`} style={{ background: coaOpen ? '#e0e7ff' : '#e5e7eb', color: coaOpen ? '#3730a3' : '#374151' }}>
                    COA: {coaOpen ? 'OPEN' : w.coa}
                  </span>
                </div>

                {!fullyAssigned ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {/* MOST */}
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Most (service + rank required)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <RadioService
                          disabled={false}
                          value={p.mostService}
                          onChange={(svc) => onMostChange(w.date, { ...p, mostService: svc })}
                          name={`most-${w.date}`}
                        />
                        <RankSelect
                          disabled={p.mostService === SERVICES.NONE}
                          value={p.mostRank}
                          onChange={(rank) => onMostChange(w.date, { ...p, mostRank: rank })}
                          placeholder="Most rank…"
                        />
                        {p.mostService !== SERVICES.NONE && p.mostRank > 0 && <span style={chip('#d1fae5', '#10b981')}>Most #{p.mostRank}</span>}
                        {p.mostService !== SERVICES.NONE && !(p.mostService === SERVICES.RNI ? rniOpen : coaOpen) && (
                          <span style={{ fontSize: 12, color: '#92400e' }}>Selected service isn’t open for this weekend.</span>
                        )}
                      </div>
                    </div>

                    {/* LEAST (service optional, as requested) */}
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Least (rank required; service optional)</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <RadioService
                          disabled={false}
                          value={p.leastService}
                          onChange={(svc) => onLeastChange(w.date, { ...p, leastService: svc })}
                          name={`least-${w.date}`}
                        />
                        <RankSelect
                          disabled={false}
                          value={p.leastRank}
                          onChange={(rank) => onLeastChange(w.date, { ...p, leastRank: rank })}
                          placeholder="Least rank…"
                        />
                        {p.leastRank > 0 && <span style={chip('#ffe4e6', '#e11d48')}>Least #{p.leastRank}</span>}
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

/* ----------------------------------------------------------------------
   App (adds sticky Jump-to-Month nav; equal-height 2-col grid; collapse)
   ---------------------------------------------------------------------- */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, false])));
  const monthRefs = useRef(Object.fromEntries(MONTH_KEYS.map(mk => [mk, React.createRef()])));

  // auth
  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUid(u.uid);
          setStatus('Loading preferences…');
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
      }
    })();
  }, []);

  // load existing
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDoc(prefsDocRef(uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.preferences) {
            const next = { ...initEmptyPrefs(), ...d.preferences };
            setPrefs(next);
          } else if (d.top10 || d.bottom10) {
            const next = initEmptyPrefs();
            (d.top10 || []).forEach(t => {
              next[t.weekend] = { ...next[t.weekend], mostService: t.service || SERVICES.NONE, mostRank: t.rank || 0 };
            });
            (d.bottom10 || []).forEach(b => {
              next[b.weekend] = { ...next[b.weekend], leastService: (b.service || SERVICES.NONE), leastRank: b.rank || 0 };
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

  const setMost = useCallback((id, v) => {
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), mostService: v.mostService, mostRank: v.mostRank } }));
  }, []);
  const setLeast = useCallback((id, v) => {
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), leastService: v.leastService, leastRank: v.leastRank } }));
  }, []);

  const counts = useMemo(() => {
    const mostRanks = [];
    const leastRanks = [];
    for (const p of Object.values(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostRank > 0) mostRanks.push(p.mostRank);
      if (p.leastRank > 0) leastRanks.push(p.leastRank);
    }
    const dedup = arr => arr.length === new Set(arr).size;
    const validMost = mostRanks.length === 10 && dedup(mostRanks);
    const validLeast = leastRanks.length === 10 && dedup(leastRanks);
    return { validMost, validLeast, isValid: validMost && validLeast, mostCount: mostRanks.length, leastCount: leastRanks.length };
  }, [prefs]);

  const handleSubmit = async () => {
    if (!uid || !counts.isValid) return;

    const orderIdx = id => allWeekendIds.indexOf(id);
    const top10 = [];
    const bottom10 = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostRank > 0) {
        top10.push({ weekend: id, rank: p.mostRank, service: p.mostService });
      }
      if (p.leastRank > 0) {
        bottom10.push({ weekend: id, rank: p.leastRank, service: p.leastService === SERVICES.NONE ? '' : p.leastService });
      }
    }
    top10.sort((a,b) => a.rank - b.rank || orderIdx(a.weekend) - orderIdx(b.weekend));
    bottom10.sort((a,b) => a.rank - b.rank || orderIdx(a.weekend) - orderIdx(b.weekend));

    await setDoc(prefsDocRef(uid), {
      preferences: prefs,
      top10,
      bottom10,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    alert('Preferences saved.');
  };

  const monthTitleFull = mk => `${MONTH_FULL[parseInt(mk,10)-1]} ${YEAR}`;
  const jumpTo = mk => monthRefs.current[mk]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const toggleMonth = mk => setCollapsed(prev => ({ ...prev, [mk]: !prev[mk] }));
  const collapseAll = val => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Jump-to-Month nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#ffffffcc', backdropFilter: 'saturate(180%) blur(4px)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ marginRight: 8 }}>Jump:</strong>
          {MONTH_KEYS.map((mk, i) => (
            <button key={mk} onClick={() => jumpTo(mk)} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              {MONTH_FULL[i].slice(0,3)}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button onClick={() => collapseAll(true)}  style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12 }}>Collapse all</button>
          <button onClick={() => collapseAll(false)} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12 }}>Expand all</button>
        </div>
      </div>

      {/* Header */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '16px 12px 0' }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">2026 Preferences (RNI & COA)</h1>
        <p className="text-sm text-gray-600 mb-4">
          Each month is a tile. For each weekend, select <b>Most</b> (service + rank) and/or <b>Least</b> (rank required, service optional).
          You must complete exactly 10 Most and 10 Least with no duplicate ranks within a bucket to submit.
        </p>
        <div className="mb-4 text-sm text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-md p-3">
          Status: {status} • Most: {counts.mostCount}/10 • Least: {counts.leastCount}/10
        </div>
      </div>

      {/* 2-column equal-height grid (auto wraps on small screens) */}
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 12px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '32px',
        alignItems: 'stretch'
      }}>
        {MONTH_KEYS.map(mk => (
          <MonthCard
            key={mk}
            mk={mk}
            label={monthTitleFull(mk)}
            items={months[mk]}
            prefs={prefs}
            onMostChange={(id, v) => setMost(id, v)}
            onLeastChange={(id, v) => setLeast(id, v)}
            collapsed={collapsed[mk]}
            onToggle={() => toggleMonth(mk)}
            cardRef={monthRefs.current[mk]}
          />
        ))}
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 12px 32px' }}>
        <button
          className={`${counts.isValid ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-3 px-6 rounded-xl font-bold`}
          disabled={!counts.isValid}
          onClick={handleSubmit}
        >
          Submit Final Preferences
        </button>
      </div>
    </div>
  );
}
