import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';

/* ----------------------------------------------------------------------
   Firebase config & constants (kept compatible with your current file)
   ---------------------------------------------------------------------- */
const firebaseConfig = (() => {
  const FALLBACK_CONFIG = {
    apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
    authDomain: "attending-schedule-2026.firebaseapp.com",
    projectId: "attending-schedule-2026",
    storageBucket: "attending-schedule-2026.firebasestorage.app",
    messagingSenderId: "777996986623",
    appId: "1:777996986623:web:0a8697cccb63149d9744ca",
    measurementId: "G-TJXCM9P7W2"
  };
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try { return JSON.parse(__firebase_config); } catch { return FALLBACK_CONFIG; }
  }
  return FALLBACK_CONFIG;
})();

const appId = typeof __app_id !== 'undefined' ? __app_id : "attending-scheduler-v6-paired";
const YEAR = 2026;
const SERVICES = { RNI: 'RNI', COA: 'COA', NONE: 'none' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const getPreferencesDocRef = (userId) => {
  const userPrefs = collection(db, 'artifacts', appId, 'users', userId, 'preferences');
  return doc(userPrefs, 'calendar-preferences');
};

/* ----------------------------------------------------------------------
   Your existing 2026 calendar data (unchanged)
   ---------------------------------------------------------------------- */
const rawShiftsByMonth = {
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

const getShiftMap = () => {
  const map = {};
  Object.values(rawShiftsByMonth).flat().forEach(s => {
    const isRniOpen = s.rni === null;
    const isCoaOpen = s.coa === null;
    map[s.date] = {
      id: s.date,
      day: s.day,
      detail: s.detail,
      rniAttending: s.rni,
      coaAttending: s.coa,
      isTaken: s.isTaken || (!isRniOpen && !isCoaOpen),
      isRniAvailable: isRniOpen,
      isCoaAvailable: isCoaOpen,
    };
  });
  return map;
};

/* ----------------------------------------------------------------------
   UI helpers
   ---------------------------------------------------------------------- */
const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });
const btn = (kind = 'white', disabled = false) => {
  const base = { padding: '6px 10px', borderRadius: 10, fontSize: 13, border: '1px solid #e2e8f0', background: '#fff', color: '#111827', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 };
  if (kind === 'primary') return { ...base, background: '#111827', color: '#fff', borderColor: '#111827' };
  if (kind === 'success') return { ...base, background: '#10b981', color: '#fff', borderColor: '#10b981' };
  return base;
};

/* ----------------------------------------------------------------------
   New selectors: 
   - MostSelector: requires service + rank 1–10 (service = RNI or COA)
   - LeastSelector: rank 1–10 only (service-agnostic)
   ---------------------------------------------------------------------- */
function MostSelector({ disabled, value, onChange }) {
  // value = { service: 'RNI'|'COA'|'none', rank: 0..10 }
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
        <input type="radio" disabled={disabled} checked={value.service === SERVICES.RNI} onChange={() => onChange({ ...value, service: SERVICES.RNI })} />
        RNI
      </label>
      <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
        <input type="radio" disabled={disabled} checked={value.service === SERVICES.COA} onChange={() => onChange({ ...value, service: SERVICES.COA })} />
        COA
      </label>
      <select
        disabled={disabled || value.service === SERVICES.NONE}
        value={String(value.rank || 0)}
        onChange={e => onChange({ ...value, rank: parseInt(e.target.value, 10) })}
        style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 10 }}
      >
        <option value="0">Most rank…</option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {value.rank > 0 && <span style={chip('#d1fae5', '#10b981')}>Most #{value.rank}</span>}
      <button onClick={() => onChange({ service: SERVICES.NONE, rank: 0 })} disabled={disabled} style={btn('white', disabled)}>Clear</button>
    </div>
  );
}

function LeastSelector({ disabled, rank, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        disabled={disabled}
        value={String(rank || 0)}
        onChange={e => onChange(parseInt(e.target.value, 10))}
        style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 10 }}
      >
        <option value="0">Least rank…</option>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {rank > 0 && <span style={chip('#ffe4e6', '#e11d48')}>Least #{rank}</span>}
      {rank > 0 && <button onClick={() => onChange(0)} disabled={disabled} style={btn('white', disabled)}>Clear</button>}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Month table (uses new selectors)
   ---------------------------------------------------------------------- */
const MonthTable = React.memo(({ monthTitle, shifts, prefs, onMostChange, onLeastChange }) => {
  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-200">
      <h2 className="bg-yellow-400 text-gray-800 text-md sm:text-lg font-extrabold p-3 text-center border-b-2 border-yellow-500">
        {monthTitle}
      </h2>
      <div className="p-3 space-y-4">
        {shifts.map(shift => {
          const shiftId = shift.date;
          const p = prefs[shiftId] || { mostService: SERVICES.NONE, mostRank: 0, leastRank: 0 };
          const fullyAssigned = shift.isTaken;
          const rniOpen = shift.rni === null;
          const coaOpen = shift.coa === null;

          return (
            <div key={shiftId} className={`p-3 rounded-lg border-2 ${fullyAssigned ? 'bg-gray-100 border-gray-300 opacity-70' : 'bg-white border-gray-200 hover:border-blue-400'}`}>
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-bold text-gray-900">{shift.day}</span>
                {shift.detail && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{shift.detail}</span>}
              </div>

              {/* Status */}
              <div className="mb-3 text-sm font-mono space-y-1">
                <div className={`px-2 py-1 rounded-md ${rniOpen ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                  <span className="font-bold">RNI:</span> {rniOpen ? 'OPEN' : shift.rni}
                </div>
                <div className={`px-2 py-1 rounded-md ${coaOpen ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-200 text-gray-700'}`}>
                  <span className="font-bold">COA:</span> {coaOpen ? 'OPEN' : shift.coa}
                </div>
              </div>

              {/* Most + Least */}
              {fullyAssigned ? (
                <div className="text-xs font-bold text-red-700 py-2 px-2 bg-red-100 rounded-md text-center shadow-inner">
                  FULLY ASSIGNED — NO RANKING AVAILABLE
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold mb-1">Most (pick service + rank)</div>
                    <MostSelector
                      disabled={(!rniOpen && !coaOpen)}
                      value={{ service: p.mostService, rank: p.mostRank }}
                      onChange={(val) => onMostChange(shiftId, val)}
                    />
                    {p.mostService !== SERVICES.NONE && !(p.mostService === SERVICES.RNI ? rniOpen : coaOpen) && (
                      <div className="mt-1 text-xs text-amber-700">Selected service is not open for this weekend.</div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold mb-1">Least (rank only)</div>
                    <LeastSelector
                      disabled={false}
                      rank={p.leastRank}
                      onChange={(rank) => onLeastChange(shiftId, rank)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

/* ----------------------------------------------------------------------
   Main App
   ---------------------------------------------------------------------- */
export default function App() {
  const shiftMap = useMemo(getShiftMap, []);
  const [userId, setUserId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [status, setStatus] = useState('Authenticating…');

  // preferences shape: { [shiftId]: { mostService: 'RNI'|'COA'|'none', mostRank: 0..10, leastRank: 0..10 } }
  const [prefs, setPrefs] = useState({});

  const monthOrder = Object.keys(rawShiftsByMonth);
  const monthTitle = (mk) => {
    const monthMap = {
      '01': 'JANUARY', '02': 'FEBRUARY', '03': 'MARCH', '04': 'APRIL',
      '05': 'MAY', '06': 'JUNE', '07': 'JULY', '08': 'AUGUST',
      '09': 'SEPTEMBER', '10': 'OCTOBER', '11': 'NOVEMBER', '12': 'DECEMBER',
    };
    return `${monthMap[mk] || 'TBD'} ${YEAR}`;
  };

  // auth
  useEffect(() => {
    const init = async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUserId(u.uid);
          setAuthReady(true);
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setAuthReady(true);
      }
    };
    init();
  }, []);

  // load or initialize
  useEffect(() => {
    if (!authReady || !userId) return;
    const ref = getPreferencesDocRef(userId);
    setStatus('Loading preferences…');
    (async () => {
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          // migrate old shape if needed
          if (data.top10 && data.bottom10) {
            const next = { ...prefs };
            data.top10.forEach(t => {
              next[t.weekend] = { mostService: t.service, mostRank: t.rank, leastRank: (next[t.weekend]?.leastRank || 0) };
            });
            data.bottom10.forEach(b => {
              next[b.weekend] = { mostService: (next[b.weekend]?.mostService || SERVICES.NONE), mostRank: (next[b.weekend]?.mostRank || 0), leastRank: b.rank };
            });
            setPrefs(next);
          } else if (data.preferences) {
            // legacy service-bound map -> convert
            const next = {};
            for (const [id, p] of Object.entries(data.preferences)) {
              next[id] = {
                mostService: p.type === 'most' ? (p.service || SERVICES.NONE) : SERVICES.NONE,
                mostRank: p.type === 'most' ? (p.rank || 0) : 0,
                leastRank: p.type === 'least' ? (p.rank || 0) : 0,
              };
            }
            setPrefs(next);
          } else {
            setPrefs(initEmpty());
          }
        } else {
          setPrefs(initEmpty());
          await setDoc(ref, { preferences: {}, createdAt: serverTimestamp() }, { merge: true });
        }
        setStatus('Ready.');
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, userId]);

  const initEmpty = () => {
    const base = {};
    for (const s of Object.values(shiftMap)) {
      base[s.id] = { mostService: SERVICES.NONE, mostRank: 0, leastRank: 0 };
    }
    return base;
  };

  // changes
  const onMostChange = useCallback((shiftId, val) => {
    setPrefs(prev => {
      const next = { ...prev, [shiftId]: { ...(prev[shiftId] || { mostService: SERVICES.NONE, mostRank: 0, leastRank: 0 }), ...{ mostService: val.service, mostRank: val.rank || 0 } } };
      return next;
    });
  }, []);

  const onLeastChange = useCallback((shiftId, rank) => {
    setPrefs(prev => {
      const next = { ...prev, [shiftId]: { ...(prev[shiftId] || { mostService: SERVICES.NONE, mostRank: 0, leastRank: 0 }), leastRank: rank || 0 } };
      return next;
    });
  }, []);

  // derive counts and validate
  const counts = useMemo(() => {
    const most = [];
    const least = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostRank > 0) most.push({ id, rank: p.mostRank });
      if (p.leastRank > 0) least.push({ id, rank: p.leastRank });
    }
    // enforce uniqueness within category
    const dup = (arr) => arr.length !== new Set(arr.map(x => x.rank)).size;
    const mostDup = dup(most);
    const leastDup = dup(least);
    const validMost = most.length === 10 && !mostDup;
    const validLeast = least.length === 10 && !leastDup;
    return {
      mostCount: most.length,
      leastCount: least.length,
      validMost, validLeast,
      isValid: validMost && validLeast,
      msgMost: validMost ? '' : (mostDup ? 'Duplicate “Most” ranks.' : `Select exactly ${10 - most.length} more “Most”.`),
      msgLeast: validLeast ? '' : (leastDup ? 'Duplicate “Least” ranks.' : `Select exactly ${10 - least.length} more “Least”.`),
    };
  }, [prefs]);

  // save
  const handleSubmit = async () => {
    if (!userId) return;
    if (!counts.isValid) return;

    // prepare arrays for clean downstream use
    // order by calendar order (object key order is not guaranteed)
    const order = Object.keys(shiftMap);
    const toOrderIdx = (id) => order.indexOf(id);

    const top10 = [];
    const bottom10 = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostRank > 0) {
        // check service availability warning (not blocking)
        const open = p.mostService === SERVICES.RNI ? shiftMap[id].isRniAvailable : shiftMap[id].isCoaAvailable;
        top10.push({ weekend: id, rank: p.mostRank, service: p.mostService, open });
      }
      if (p.leastRank > 0) {
        bottom10.push({ weekend: id, rank: p.leastRank });
      }
    }
    top10.sort((a,b) => a.rank - b.rank || toOrderIdx(a.weekend) - toOrderIdx(b.weekend));
    bottom10.sort((a,b) => a.rank - b.rank || toOrderIdx(a.weekend) - toOrderIdx(b.weekend));

    const ref = getPreferencesDocRef(userId);
    await setDoc(ref, {
      // keep the per-shift map (for compatibility/inspection)
      preferences: prefs,
      // add clean arrays for the optimizer
      top10, bottom10,
      lastUpdated: serverTimestamp(),
      submittedCounts: { most: counts.mostCount, least: counts.leastCount }
    }, { merge: true });
    setStatus('Saved.');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans bg-gray-50 min-height-screen">
      <h1 className="text-3xl font-extrabold text-gray-800 mb-2">2026 Attending Weekend Preference System</h1>
      <p className="text-sm text-gray-600 mb-4">Pick exactly 10 “Most” (with RNI or COA) and exactly 10 “Least” (no service). No duplicate ranks within a category.</p>

      {/* status/auth */}
      <div className="mb-6 p-3 bg-indigo-50 border-l-4 border-indigo-400 rounded-lg">
        <p className="text-sm font-medium text-indigo-800">Status: {status}</p>
        <p className="text-xs text-indigo-700 mt-1">User ID: <span className="font-mono">{userId || '…'}</span></p>
      </div>

      {/* counts */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${counts.validMost ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>Most: {counts.mostCount}/10</span>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${counts.validLeast ? 'bg-rose-100 text-rose-800' : 'bg-yellow-100 text-yellow-800'}`}>Least: {counts.leastCount}/10</span>
        {!counts.validMost && <span className="text-xs text-amber-700">{counts.msgMost}</span>}
        {!counts.validLeast && <span className="text-xs text-amber-700">{counts.msgLeast}</span>}
      </div>

      {/* paired grid 2-up months */}
      <div className="space-y-6">
        {monthOrder.map((_, idx) => {
          if (idx % 2 !== 0) return null;
          const m1 = monthOrder[idx];
          const m2 = monthOrder[idx + 1];
          return (
            <div key={m1} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MonthTable
                monthTitle={monthTitle(m1)}
                shifts={rawShiftsByMonth[m1]}
                prefs={prefs}
                onMostChange={(id, val) => onMostChange(id, val)}
                onLeastChange={(id, rank) => onLeastChange(id, rank)}
              />
              {m2 && (
                <MonthTable
                  monthTitle={monthTitle(m2)}
                  shifts={rawShiftsByMonth[m2]}
                  prefs={prefs}
                  onMostChange={(id, val) => onMostChange(id, val)}
                  onLeastChange={(id, rank) => onLeastChange(id, rank)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* submit */}
      <div className="mt-10 flex items-center gap-8">
        <button
          className={`${counts.isValid ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-3 px-6 rounded-xl font-bold`}
          disabled={!counts.isValid}
          onClick={handleSubmit}
        >
          Submit Final Preferences
        </button>
        {!counts.isValid && <div className="text-sm text-amber-700">Finish both lists to enable submit.</div>}
      </div>
    </div>
  );
}
