import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

/* ----------------------------------------------------------------------
   Firebase config (kept flexible to your existing setup)
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
   Your month->weekend data (keep in sync with your source)
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

// flatten for order mapping
const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* ----------------------------------------------------------------------
   Preference model:
   prefs[weekendId] = {
     mostService: 'RNI'|'COA'|'none',
     mostRank: 0..10,
     leastService: 'RNI'|'COA'|'none',  // NEW: optional service for least
     leastRank: 0..10
   }
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
   Month card
   ---------------------------------------------------------------------- */
function MonthCard({ label, items, prefs, onMostChange, onLeastChange }) {
  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
      <h2 className="bg-yellow-400 text-gray-800 text-md sm:text-lg font-extrabold p-3 text-center border-b-2 border-yellow-500">
        {label}
      </h2>
      <div className="p-3 space-y-3">
        {items.map(w => {
          const p = prefs[w.date] || { mostService: SERVICES.NONE, mostRank: 0, leastService: SERVICES.NONE, leastRank: 0 };
          const rniOpen = w.rni === null;
          const coaOpen = w.coa === null;
          const fullyAssigned = w.isTaken || (!rniOpen && !coaOpen);

          return (
            <div key={w.date} className={`p-3 rounded-xl border ${fullyAssigned ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-bold text-gray-900">{w.day}</div>
                {w.detail && <div style={chip('#fff7ed', '#c2410c')}>{w.detail}</div>}
              </div>

              {/* service availability note */}
              <div className="text-xs text-gray-600 mb-2">
                <span className={`px-2 py-0.5 rounded-md mr-2 ${rniOpen ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>RNI: {rniOpen ? 'OPEN' : w.rni}</span>
                <span className={`px-2 py-0.5 rounded-md ${coaOpen ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700'}`}>COA: {coaOpen ? 'OPEN' : w.coa}</span>
              </div>

              {!fullyAssigned ? (
                <div className="grid gap-3">
                  {/* MOST */}
                  <div className="rounded-lg border p-2">
                    <div className="text-xs font-semibold mb-1">Most (required: service + rank)</div>
                    <div className="flex flex-wrap gap-8 items-center">
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
                        <span className="text-xs text-amber-700">Selected service isn’t open for this weekend.</span>
                      )}
                    </div>
                  </div>

                  {/* LEAST */}
                  <div className="rounded-lg border p-2">
                    <div className="text-xs font-semibold mb-1">Least (rank required; service optional)</div>
                    <div className="flex flex-wrap gap-8 items-center">
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
                <div className="text-xs font-bold text-red-700 py-2 px-2 bg-red-100 rounded-md text-center shadow-inner">
                  FULLY ASSIGNED — NO RANKING AVAILABLE
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   App (2 columns x 6 rows of month cards)
   ---------------------------------------------------------------------- */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [prefs, setPrefs] = useState(initEmptyPrefs());

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

  // load if exists
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDoc(prefsDocRef(uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.preferences) {
            // migrate if missing new keys
            const next = { ...initEmptyPrefs(), ...d.preferences };
            setPrefs(next);
          } else if (d.top10 || d.bottom10) {
            // legacy arrays -> fold into map
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

  // validation: exactly 10 most + 10 least; no duplicate ranks within each bucket
  const counts = useMemo(() => {
    const most = [];
    const least = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostRank > 0) most.push(p.mostRank);
      if (p.leastRank > 0) least.push(p.leastRank);
    }
    const dedup = (arr) => arr.length === new Set(arr).size;
    const validMost = most.length === 10 && dedup(most);
    const validLeast = least.length === 10 && dedup(least);
    return { validMost, validLeast, isValid: validMost && validLeast, mostCount: most.length, leastCount: least.length };
  }, [prefs]);

  const handleSubmit = async () => {
    if (!uid || !counts.isValid) return;

    // derive tidy arrays for downstream
    const orderIdx = (id) => allWeekendIds.indexOf(id);
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

  const monthKeys = Object.keys(months); // '01'..'12'
  const monthTitle = (mk) => {
    const name = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][parseInt(mk,10)-1];
    return `${name} ${YEAR}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">2026 Preferences (RNI & COA)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Each month is a tile. For each weekend, select <b>Most</b> (service + rank) and/or <b>Least</b> (rank required, service optional).
        You must complete exactly 10 Most and 10 Least (no duplicate ranks within a bucket) to submit.
      </p>

      <div className="mb-4 text-sm text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-md p-3">
        Status: {status} • Most: {counts.mostCount}/10 • Least: {counts.leastCount}/10
      </div>

      {/* 2 columns x 6 rows grid of months */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {monthKeys.map((mk, i) => (
          <MonthCard
            key={mk}
            label={monthTitle(mk)}
            items={months[mk]}
            prefs={prefs}
            onMostChange={(id, v) => setMost(id, v)}
            onLeastChange={(id, v) => setLeast(id, v)}
          />
        ))}
      </div>

      <div className="mt-8">
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
