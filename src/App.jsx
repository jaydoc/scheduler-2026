import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';

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

/* --- Calendar Data (unchanged) --- */
const months = { /* your month data exactly as before */ };

const MONTH_KEYS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const allWeekendIds = Object.values(months).flat().map(w => w.date);

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = { mostService: SERVICES.NONE, mostRank: 0, leastService: SERVICES.NONE, leastRank: 0 };
  });
  return base;
}

const chip = (bg, fg) => ({ padding: '2px 8px', borderRadius: 10, background: bg, color: fg, fontSize: 12, border: `1px solid ${fg}22` });

function RadioService({ value, onChange, disabled, name }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <label><input type="radio" disabled={disabled} checked={value === SERVICES.RNI} onChange={() => onChange(SERVICES.RNI)} name={name}/> RNI</label>
      <label><input type="radio" disabled={disabled} checked={value === SERVICES.COA} onChange={() => onChange(SERVICES.COA)} name={name}/> COA</label>
    </div>
  );
}

function RankSelect({ value, onChange, disabled, placeholder }) {
  return (
    <select disabled={disabled} value={String(value || 0)} onChange={e => onChange(parseInt(e.target.value, 10))}>
      <option value="0">{placeholder}</option>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

const MONTH_COLORS = [ /* unchanged color list */ ];
const MONTH_MIN_HEIGHT = 520;

function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, cardRef }) {
  const color = MONTH_COLORS[parseInt(mk, 10) - 1];

  return (
    <div ref={cardRef} id={`month-${mk}`} style={{ display:'flex', flexDirection:'column', border:'1px solid #e2e8f0', borderRadius:16, background:'#fff' }}>
      <button onClick={onToggle} style={{ background:color.bg, color:color.fg, borderBottom:`2px solid ${color.border}`, fontWeight:800, padding:'10px 12px', textAlign:'center', cursor:'pointer' }}>
        {label} {collapsed ? '▸' : '▾'}
      </button>

      {!collapsed && (
        <div style={{ padding:12, display:'flex', flexDirection:'column', gap:12, minHeight:MONTH_MIN_HEIGHT }}>
          {items.map(w => {
            const p = prefs[w.date];
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const taken = w.isTaken || (!rniOpen && !coaOpen);

            return (
              <div key={w.date} style={{ padding:12, border:'1px solid #e5e7eb', borderRadius:12, background: taken ? '#f9fafb' : '#fff' }}>
                <div style={{ fontWeight:700, marginBottom:8 }}>{w.day}</div>
                {w.detail && <div style={chip('#fff7ed','#c2410c')}>{w.detail}</div>}
                {!taken ? (
                  <div style={{ display:'grid', gap:10 }}>
                    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:8 }}>
                      <div style={{ fontWeight:600 }}>Most</div>
                      <RadioService value={p.mostService} onChange={(svc)=>onMostChange(w.date,{...p,mostService:svc})} name={`most-${w.date}`} />
                      <RankSelect value={p.mostRank} onChange={(rank)=>onMostChange(w.date,{...p,mostRank:rank})} placeholder="Rank…" />
                    </div>
                    <div style={{ border:'1px solid #e5e7eb', borderRadius:10, padding:8 }}>
                      <div style={{ fontWeight:600 }}>Least</div>
                      <RadioService value={p.leastService} onChange={(svc)=>onLeastChange(w.date,{...p,leastService:svc})} name={`least-${w.date}`} />
                      <RankSelect value={p.leastRank} onChange={(rank)=>onLeastChange(w.date,{...p,leastRank:rank})} placeholder="Rank…" />
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign:'center', color:'#991b1b', background:'#fee2e2', padding:8, borderRadius:8 }}>FULLY ASSIGNED</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState('Authenticating…');
  const [prefs, setPrefs] = useState(initEmptyPrefs());

  // ✅ Start all collapsed
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(MONTH_KEYS.map(mk => [mk, true]))
  );

  const monthRefs = useRef(Object.fromEntries(MONTH_KEYS.map(mk => [mk, React.createRef()])));

  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, u => { if (u) setUid(u.uid); setStatus('Loading…'); });
      } catch (e) { setStatus(`Auth error: ${e.message}`); }
    })();
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDoc(prefsDocRef(uid));
        if (snap.exists()) {
          const d = snap.data();
          if (d.preferences) setPrefs({ ...initEmptyPrefs(), ...d.preferences });
        }
        setStatus('Ready.');
      } catch (e) { setStatus(`Load error: ${e.message}`); }
    })();
  }, [uid]);

  const setMost = useCallback((id,v)=>setPrefs(p=>({...p,[id]:{...p[id],mostService:v.mostService,mostRank:v.mostRank}})),[]);
  const setLeast = useCallback((id,v)=>setPrefs(p=>({...p,[id]:{...p[id],leastService:v.leastService,leastRank:v.leastRank}})),[]);

  const counts = useMemo(() => {
    const m = [], l = [];
    for (const p of Object.values(prefs)) {
      if (p.mostService!==SERVICES.NONE && p.mostRank>0) m.push(p.mostRank);
      if (p.leastRank>0) l.push(p.leastRank);
    }
    return { isValid:m.length===10 && new Set(m).size===10 && l.length===10 && new Set(l).size===10, most:m.length, least:l.length };
  }, [prefs]);

  const handleSubmit = async () => {
    if (!uid || !counts.isValid) return;
    await setDoc(prefsDocRef(uid), { preferences:prefs, lastUpdated:serverTimestamp() }, { merge:true });
    alert('Saved.');
  };

  const monthTitleFull = mk => `${MONTH_FULL[parseInt(mk,10)-1]} ${YEAR}`;
  const toggleMonth = mk => setCollapsed(c => ({ ...c, [mk]: !c[mk] }));
  const collapseAll = b => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, b])));

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#ffffffcc', backdropFilter:'blur(6px)', borderBottom:'1px solid #e5e7eb' }}>
        <div style={{ maxWidth:1120, margin:'0 auto', padding:'8px 12px', display:'flex', gap:8, flexWrap:'wrap' }}>
          <strong>Jump:</strong>
          {MONTH_KEYS.map((mk,i)=>(
            <button key={mk} onClick={()=>monthRefs.current[mk].current.scrollIntoView({behavior:'smooth'})}
              style={{ padding:'6px 10px', borderRadius:999, border:'1px solid #e5e7eb', background:'#fff', fontSize:12 }}>
              {MONTH_FULL[i].slice(0,3)}
            </button>
          ))}
          <span style={{ flex:1 }} />
          <button onClick={()=>collapseAll(true)}>Collapse all</button>
          <button onClick={()=>collapseAll(false)}>Expand all</button>
        </div>
      </div>

      <div style={{ maxWidth:1120, margin:'0 auto', padding:'16px 12px' }}>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">2026 Preferences (RNI & COA)</h1>
        <p className="text-sm text-gray-600">Status: {status} • Most: {counts.most}/10 • Least: {counts.least}/10</p>
      </div>

      {/* ✅ Centered 2-column grid */}
      <div
        style={{
          maxWidth:1120,
          margin:'0 auto',
          padding:'0 12px 24px',
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(420px, 1fr))',
          gap:'32px',
          alignItems:'stretch',
          justifyContent:'center'
        }}
      >
        {MONTH_KEYS.map(mk => (
          <MonthCard
            key={mk}
            mk={mk}
            label={monthTitleFull(mk)}
            items={months[mk]}
            prefs={prefs}
            onMostChange={setMost}
            onLeastChange={setLeast}
            collapsed={collapsed[mk]}
            onToggle={()=>toggleMonth(mk)}
            cardRef={monthRefs.current[mk]}
          />
        ))}
      </div>

      <div style={{ maxWidth:1120, margin:'0 auto', padding:'0 12px 32px' }}>
        <button disabled={!counts.isValid} onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-bold disabled:bg-gray-300 disabled:text-gray-500">
          Submit Final Preferences
        </button>
      </div>
    </div>
  );
}
