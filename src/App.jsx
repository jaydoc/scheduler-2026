import React, { useEffect, useMemo, useReducer, useState, useCallback } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

/* =========================================================
   FIREBASE CONFIG (keeps your original fallbacks)
========================================================= */
const LOCAL_FALLBACK = {
  apiKey: "AIzaSyB6CvHk5u4jvvO8oXGnf_GTq1RMbwhT-JU",
  authDomain: "attending-schedule-2026.firebaseapp.com",
  projectId: "attending-schedule-2026",
  storageBucket: "attending-schedule-2026.firebasestorage.app",
  messagingSenderId: "777996986623",
  appId: "1:777996986623:web:0a8697cccb63149d9744ca",
  measurementId: "G-TJXCM9P7W2",
};
const firebaseConfig = (() => {
  try {
    if (typeof __firebase_config !== "undefined" && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch {}
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG) {
    return window.FALLBACK_FIREBASE_CONFIG;
  }
  return LOCAL_FALLBACK;
})();
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v16.0";

/* =========================================================
   CONSTANTS + DATA (leave your existing ATTENDINGS/months)
========================================================= */
const APP_TITLE = "UAB/COA Weekend Attending Scheduler 2026";
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA" };
const MODES = { CAL: "Calendar", QA: "QuickAdd", RB: "RankBoard", DB: "DragBuckets" };
const ADMIN_EMAIL = "jkandasamy@uabmc.edu";

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

const ATTENDING_CODES = {
  "nambalav@uab.edu": "UAB26-7KQ2T9",
  "nitinarora@uabmc.edu": "UAB26-M3ZP5H",
  "ksbhatia@uabmc.edu": "UAB26-X8D4N2",
  "boone@uabmc.edu": "UAB26-R6C9JW",
  "wcarlo@uabmc.edu": "UAB26-P2L7VQ",
  "viraljain@uabmc.edu": "UAB26-HT5M8A",
  "jkandasamy@uabmc.edu": "UAB26-B9Y3KC",
  "akane@uabmc.edu": "UAB26-W4N6UE",
  "mackay@uabmc.edu": "UAB26-J2F8RD",
  "aschuyler@uabmc.edu": "UAB26-Z7T3LM",
  "vshukla@uabmc.edu": "UAB26-Q5R9BX",
  "bsims@uabmc.edu": "UAB26-N6V2PG",
  "cptravers@uabmc.edu": "UAB26-C8H5TY",
  "kentwillis@uabmc.edu": "UAB26-L3K9SD",
  "lwinter@uabmc.edu": "UAB26-D7M4QE",
  "asalas@uabmc.edu": "UAB26-V2P7RJ",
  "clal@uabmc.edu": "UAB26-K9S3TU",
  "vvalcarceluaces@uabmc.edu": "UAB26-A4N8GY",
};

/* === Months (use your existing object exactly as-is) === */
const months = {
  "01": [
    { day: "10",       date: "2026-01-10", rni: null,      coa: null },
    { day: "17-19",    date: "2026-01-17", rni: null,      coa: null, detail: "MLK Day" },
    { day: "24",       date: "2026-01-24", rni: null,      coa: null },
    { day: "31",       date: "2026-01-31", rni: null,      coa: null },
  ],
  "02": [
    { day: "7",        date: "2026-02-07", rni: "Boone",   coa: null },
    { day: "14",       date: "2026-02-14", rni: "Boone",   coa: null },
    { day: "21",       date: "2026-02-21", rni: "Willis",  coa: null },
    { day: "28",       date: "2026-02-28", rni: "Willis",  coa: null },
  ],
  "03": [
    { day: "7",        date: "2026-03-07", rni: "Ambal",   coa: "Arora", isTaken: true },
    { day: "14",       date: "2026-03-14", rni: null,      coa: "Winter" },
    { day: "21",       date: "2026-03-21", rni: "Ambal",   coa: "Arora", isTaken: true },
    { day: "28",       date: "2026-03-28", rni: null,      coa: "Arora" },
  ],
  "04": [
    { day: "4",        date: "2026-04-04", rni: "Sims",    coa: null },
    { day: "11",       date: "2026-04-11", rni: null,      coa: null },
    { day: "18",       date: "2026-04-18", rni: "Sims",    coa: null },
    { day: "25",       date: "2026-04-25", rni: null,      coa: null, detail: "PAS Meeting Coverage" },
  ],
  "05": [
    { day: "2",        date: "2026-05-02", rni: null,      coa: null },
    { day: "9",        date: "2026-05-09", rni: "Arora",   coa: null },
    { day: "16",       date: "2026-05-16", rni: "Arora",   coa: null },
    { day: "23-25",    date: "2026-05-23", rni: null,      coa: null, detail: "Memorial Day" },
    { day: "30",       date: "2026-05-30", rni: "Arora",   coa: null },
  ],
  "06": [
    { day: "6",        date: "2026-06-06", rni: "Schuyler", coa: "Winter", isTaken: true },
    { day: "13",       date: "2026-06-13", rni: "Boone",    coa: null },
    { day: "19-21",    date: "2026-06-19", rni: "Schuyler", coa: "Winter", isTaken: true, detail: "Juneteenth Day" },
    { day: "27",       date: "2026-06-27", rni: "Boone",    coa: null },
  ],
  "07": [
    { day: "4-6",      date: "2026-07-04", rni: "Jain",     coa: "Carlo", isTaken: true, detail: "4th of July" },
    { day: "11",       date: "2026-07-11", rni: null,       coa: "Willis" },
    { day: "18",       date: "2026-07-18", rni: null,       coa: null },
    { day: "25",       date: "2026-07-25", rni: "Shukla",   coa: "Willis", isTaken: true },
  ],
  "08": [
    { day: "1",        date: "2026-08-01", rni: "Boone",    coa: null },
    { day: "8",        date: "2026-08-08", rni: "Sims",     coa: "Carlo", isTaken: true },
    { day: "15",       date: "2026-08-15", rni: "Boone",    coa: null },
    { day: "22",       date: "2026-08-22", rni: "Sims",     coa: null },
    { day: "29",       date: "2026-08-29", rni: null,       coa: "Carlo" },
  ],
  "09": [
    { day: "5-7",      date: "2026-09-05", rni: "Mackay",   coa: null, detail: "Labor Day" },
    { day: "12",       date: "2026-09-12", rni: null,       coa: null },
    { day: "19",       date: "2026-09-19", rni: null,       coa: null },
    { day: "26",       date: "2026-09-26", rni: null,       coa: null },
  ],
  "10": [
    { day: "3",        date: "2026-10-03", rni: "Kandasamy", coa: "Carlo",  isTaken: true },
    { day: "10",       date: "2026-10-10", rni: "Travers",   coa: "Bhatia", isTaken: true },
    { day: "17",       date: "2026-10-17", rni: "Kandasamy", coa: null },
    { day: "24",       date: "2026-10-24", rni: "Travers",   coa: "Bhatia", isTaken: true },
    { day: "31",       date: "2026-10-31", rni: "Kandasamy", coa: "Carlo",  isTaken: true },
  ],
  "11": [
    { day: "7",        date: "2026-11-07", rni: "Ambal",   coa: null },
    { day: "14",       date: "2026-11-14", rni: "Bhatia",  coa: null },
    { day: "21",       date: "2026-11-21", rni: "Ambal",   coa: null },
    { day: "26-28",    date: "2026-11-26", rni: "Bhatia",  coa: null, detail: "Thanksgiving" },
  ],
  "12": [
    { day: "5",        date: "2026-12-05", rni: "Travers",   coa: "Kandasamy", isTaken: true },
    { day: "12",       date: "2026-12-12", rni: null,        coa: null },
    { day: "19",       date: "2026-12-19", rni: "Travers",   coa: "Kandasamy", isTaken: true },
    { day: "24-28",    date: "2026-12-24", rni: "Bhatia",    coa: "Arora",     isTaken: true, detail: "Christmas" },
    { day: "31-Jan 4", date: "2026-12-31", rni: "Kane",      coa: "Kandasamy", isTaken: true, detail: "New Year’s Eve" },
  ],
};
const MONTH_KEYS  = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_ABBR  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* =========================================================
   HELPERS
========================================================= */
function getAvailableServicesForDate(date) {
  for (const mk of MONTH_KEYS) {
    const hit = months[mk].find((d) => d.date === date);
    if (hit) {
      const out = [];
      if (!hit.rni) out.push(SERVICES.RNI);
      if (!hit.coa) out.push(SERVICES.COA);
      return out;
    }
  }
  return [SERVICES.RNI, SERVICES.COA];
}
function fmtLabel(dateStr) {
  const [y,m,d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}
function compressRanks(list) {
  return list
    .sort((a,b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((it, idx) => ({ ...it, rank: idx + 1 })); // 1 is most preferred
}
function uniqByDate(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (!seen.has(it.date)) {
      seen.add(it.date);
      out.push(it);
    }
  }
  return out;
}

/* =========================================================
   STATE — single ranking bucket
   Invariants:
   - Only one selection per weekend (date) total.
   - No duplicate (date, service).
   - Ranks always compress to 1..N, #1 is most preferred.
========================================================= */
const initialState = { ranks: [] }; // [{date, service, rank}]
function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service } = action;
      if (!service) return state;

      // block if that weekend already chosen (any service) -> replace service? (we’ll block; user can remove then add)
      if (state.ranks.some(x => x.date === date)) return state;
      if (state.ranks.some(x => x.date === date && x.service === service)) return state;

      const next = [...state.ranks, { date, service, rank: (state.ranks.length + 1) }];
      return { ranks: compressRanks(uniqByDate(next)) };
    }
    case "remove": {
      const next = state.ranks.filter(x => !(x.date === action.date && x.service === action.service));
      return { ranks: compressRanks(next) };
    }
    case "reorder": {
      // action.fromIndex, action.toIndex — reorder visible list
      const list = [...state.ranks].sort((a,b) => a.rank - b.rank);
      const [moved] = list.splice(action.fromIndex, 1);
      list.splice(action.toIndex, 0, moved);
      // Reassign ranks in new order (1..N, #1 is most preferred)
      const reassigned = list.map((x, i) => ({ ...x, rank: i + 1 }));
      return { ranks: reassigned };
    }
    case "clear": return initialState;
    default: return state;
  }
}

/* =========================================================
   Small atoms
========================================================= */
function Pill({ children, tone = "default" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
function Section({ title, children, right }) {
  return (
    <section className="section">
      <div className="section-head">
        <h3 className="section-title">{title}</h3>
        <div className="section-right">{right}</div>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

/* =========================================================
   MAIN APP
========================================================= */
export default function App() {
  const app = useMemo(() => initializeApp(firebaseConfig), []);
  const auth = useMemo(() => getAuth(app), [app]);
  const db = useMemo(() => getFirestore(app), [app]);

  const [uid, setUid] = useState(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [auth]);

  const [me, setMe] = useState("");
  const selected = useMemo(() => ATTENDINGS.find(a => a.name === me) || null, [me]);
  const isAdmin = useMemo(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      return q.get("admin") === "1" && selected?.email === ADMIN_EMAIL;
    } catch { return false; }
  }, [selected]);

  const [gateEmail, setGateEmail] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [gateErr, setGateErr] = useState("");

  const [mode, setMode] = useState(MODES.RB); // show the alternative by default
  const [{ ranks }, dispatch] = useReducer(reducer, initialState);

  /* ===== Add / Remove helpers ===== */
  const add = useCallback((date, service) => {
    const avail = getAvailableServicesForDate(date);
    if (!avail.includes(service)) return;
    dispatch({ type: "add", date, service });
  }, []);
  const remove = useCallback((date, service) => dispatch({ type: "remove", date, service }), []);
  const clearAll = useCallback(() => dispatch({ type: "clear" }), []);
  const reorder = useCallback((fromIndex, toIndex) => dispatch({ type: "reorder", fromIndex, toIndex }), []);

  /* ===== Download CSV ===== */
  const downloadCSV = () => {
    if (!selected) { alert("Please verify your name/code first."); return; }
    const rows = compressRanks(ranks).map(x => ({
      name: selected.name,
      date: x.date,
      service: x.service,
      rank: x.rank
    }));
    const headers = ["name","date","service","rank"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${YEAR}-${selected.name}-preferences.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ===== Review & Submit modal ===== */
  const [reviewOpen, setReviewOpen] = useState(false);
  const openReview = () => {
    if (!selected) { alert("Log in with your one-time code first."); return; }
    setReviewOpen(true);
  };
  const submitNow = async () => {
    const payload = {
      appId,
      title: APP_TITLE,
      year: YEAR,
      who: selected.name,
      email: selected.email,
      ranks: compressRanks(ranks),
      ts: serverTimestamp(),
      isAdmin
    };
    try {
      await setDoc(doc(db, "prefs", `${YEAR}-${selected.name}`), payload);
      setReviewOpen(false);
      alert("Saved to Firestore. Thanks!");
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    }
  };

  /* ===== Collapsible Month wrapper ===== */
  function CollapsibleMonth({ title, children, defaultCollapsed = true }) {
    const [open, setOpen] = useState(!defaultCollapsed);
    return (
      <div className="month">
        <button className="month-toggle" onClick={() => setOpen(o => !o)}>
          <span className="chev">{open ? "▾" : "▸"}</span>
          <span className="month-title">{title}</span>
        </button>
        {open && children}
      </div>
    );
  }

  /* ===== Inline service buttons shared renderer ===== */
  function ServiceButtons({ date }) {
    const avail = getAvailableServicesForDate(date);
    return (
      <div className="svc-actions">
        {avail.includes(SERVICES.RNI) && (
          <>
            <button className="btn btn-svc" onClick={() => add(date, SERVICES.RNI)}>RNI → Rank</button>
          </>
        )}
        {avail.includes(SERVICES.COA) && (
          <>
            <button className="btn btn-svc" onClick={() => add(date, SERVICES.COA)}>COA → Rank</button>
          </>
        )}
        {avail.length === 0 && <Pill tone="muted">Full</Pill>}
      </div>
    );
  }

  /* ========================= MODES ========================= */

  /* ---- Calendar (months collapsed; inline RNI/COA) ---- */
  function CalendarMode() {
    return (
      <div className="months">
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            <div className="days">
              {months[mk].map((d) => {
                const taken = d.isTaken;
                const key = `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`;
                return (
                  <div key={key} className={`day ${taken ? "is-disabled" : ""}`}>
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    {!taken && <ServiceButtons date={d.date} />}
                    {taken && <Pill tone="muted">Full</Pill>}
                  </div>
                );
              })}
            </div>
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  /* ---- QuickAdd (unchanged UX, honors single ranking) ---- */
  function QuickAddMode() {
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    return (
      <div className="row wrap gap">
        <select className="select" value={mkey} onChange={(e) => setMkey(e.target.value)}>
          {MONTH_KEYS.map((mk, i) => (<option key={mk} value={mk}>{MONTH_FULL[i]}</option>))}
        </select>
        <select className="select" value={date} onChange={(e) => setDate(e.target.value)}>
          <option value="">Pick Saturday</option>
          {saturdays.map((d) => (
            <option key={d.date} value={d.date} disabled={d.isTaken}>
              {fmtLabel(d.date)}{d.isTaken ? " (full)" : ""}
            </option>
          ))}
        </select>
        <select className="select" value={service} onChange={(e) => setService(e.target.value)}>
          <option value="">Pick service</option>
          {(date ? getAvailableServicesForDate(date) : [SERVICES.RNI, SERVICES.COA])
            .map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <button className="btn btn-green" onClick={() => add(date, service || null)}>Add</button>
      </div>
    );
  }

  /* ---- RankBoard (compact list with one-click service) ---- */
  function RankBoardMode() {
    return (
      <div className="rb-list">
        <div className="muted" style={{marginBottom:8}}>
          One click per date: choose RNI or COA to add. Drag items in the Rankings list to reorder (1 = most preferred).
        </div>
        {MONTH_KEYS.map((mk, i) => (
          <CollapsibleMonth key={mk} title={MONTH_FULL[i]} defaultCollapsed={true}>
            {months[mk].map((d) => {
              const taken = d.isTaken;
              const avail = getAvailableServicesForDate(d.date);
              const key = `${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`;
              return (
                <div key={key} className="rb-row">
                  <div className="rb-date">
                    <div className="rb-label">{fmtLabel(d.date)}</div>
                    {d.detail && <div className="rb-detail">{d.detail}</div>}
                  </div>
                  <div className="rb-actions">
                    <button
                      className="btn btn-svc"
                      disabled={taken || !avail.includes(SERVICES.RNI)}
                      onClick={() => add(d.date, SERVICES.RNI)}
                    >RNI → Rank</button>
                    <button
                      className="btn btn-svc"
                      disabled={taken || !avail.includes(SERVICES.COA)}
                      onClick={() => add(d.date, SERVICES.COA)}
                    >COA → Rank</button>
                    {avail.length === 0 && <Pill tone="muted">Full</Pill>}
                  </div>
                </div>
              );
            })}
          </CollapsibleMonth>
        ))}
      </div>
    );
  }

  /* ---- DragBuckets (chips + near-cursor service picker) ---- */
  function DragBucketsMode() {
    const [drag, setDrag] = useState(null);
    const [picker, setPicker] = useState(null); // { date, x, y } to place small popover near last click/drop

    const chips = useMemo(() => {
      const chosenDates = new Set(ranks.map(x => x.date));
      return MONTH_KEYS.map((mk, i) => ({
        mkey: mk, label: MONTH_FULL[i],
        items: months[mk].filter(d => !d.isTaken && !chosenDates.has(d.date)).map(d => ({ date: d.date }))
      }));
    }, [ranks]);

    const onDropToRank = (e) => {
      e.preventDefault();
      if (!drag) return;
      const avail = getAvailableServicesForDate(drag.date);
      if (avail.length === 1) {
        add(drag.date, avail[0]);
      } else if (avail.length === 2) {
        // show picker near drop location
        setPicker({ date: drag.date, x: e.clientX, y: e.clientY });
      }
      setDrag(null);
    };

    const openPickerNear = (e, date) => {
      const avail = getAvailableServicesForDate(date);
      if (avail.length === 1) add(date, avail[0]);
      else setPicker({ date, x: e.clientX, y: e.clientY });
    };

    return (
      <div className="drag-grid">
        <div>
          <div className="muted">Drag a Saturday chip into Rankings, or click a chip to pick the service. Reorder in Rankings.</div>
          {chips.map(group => (
            <div key={group.mkey} className="chip-group">
              <div className="chip-title">{group.label}</div>
              <div className="chip-row">
                {group.items.map(it => (
                  <div
                    key={it.date}
                    draggable
                    onDragStart={() => setDrag({ date: it.date })}
                    onClick={(e) => openPickerNear(e, it.date)}
                    className="chip"
                  >{fmtLabel(it.date)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Rankings bucket (single list) */}
        <div
          className="bucket"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropToRank}
        >
          <div className="bucket-title">Rankings (1 = most preferred). Drag to reorder.</div>
          <ol className="bucket-list">
            {compressRanks(ranks).map((x, idx) => (
              <DraggableRankItem
                key={`${x.date}-${x.service}`}
                index={idx}
                item={x}
                remove={remove}
                reorder={reorder}
              />
            ))}
          </ol>
        </div>

        {/* Tiny floating picker near the cursor */}
        {picker && (
          <div
            className="floating-picker"
            style={{ left: picker.x + 8, top: picker.y + 8 }}
          >
            <div className="picker-title">{fmtLabel(picker.date)} — Pick Service</div>
            {getAvailableServicesForDate(picker.date).map(s => (
              <button
                key={s}
                className="btn btn-svc"
                onClick={() => { add(picker.date, s); setPicker(null); }}
              >{s}</button>
            ))}
            <button className="btn btn-link" onClick={() => setPicker(null)}>cancel</button>
          </div>
        )}
      </div>
    );
  }

  /* ---- Draggable ranking item (D&D reorder) ---- */
  function DraggableRankItem({ index, item, remove, reorder }) {
    const [dragOver, setDragOver] = useState(false);

    const onDragStart = (e) => {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
    };
    const onDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
    };
    const onDragLeave = () => setDragOver(false);
    const onDrop = (e) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const to = index;
      setDragOver(false);
      if (!Number.isNaN(from) && from !== to) reorder(from, to);
    };

    return (
      <li
        className={`bucket-item rank-item ${dragOver ? "is-over" : ""}`}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="drag-handle" title="Drag to reorder">⠿</span>
        <span className="rank-label">#{index + 1} — {fmtLabel(item.date)} ({item.service})</span>
        <button className="btn-link" onClick={() => remove(item.date, item.service)}>remove</button>
      </li>
    );
  }

  /* ========================= CHROME ========================= */

  const topBar = (
    <div className="topbar">
      <div className="topbar-inner">
        <div className="app-title">{APP_TITLE}</div>
        <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value={MODES.CAL}>Calendar</option>
          <option value={MODES.QA}>QuickAdd</option>
          <option value={MODES.RB}>RankBoard</option>
          <option value={MODES.DB}>DragBuckets</option>
        </select>
        <div className="spacer" />
        <span className="badge">{firebaseConfig.projectId}{isAdmin ? " — ADMIN" : ""}</span>
        <button className="btn" onClick={openReview}>Submit</button>
      </div>
    </div>
  );

  const loginPanel = (
    <div className="login">
      <div className="login-title">Enter your one-time code</div>
      <div className="id-row">
        <select className="id-select" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)}>
          <option value="">Select your name</option>
          {ATTENDINGS.map(a => (
            <option key={a.email} value={a.email}>{a.name} — {a.email}</option>
          ))}
        </select>
        <input
          className="id-select"
          placeholder="Paste code (e.g., UAB26-XXXXXX)"
          value={gateCode}
          onChange={(e) => setGateCode(e.target.value.trim())}
        />
        <button
          className="btn btn-green"
          onClick={() => {
            const code = ATTENDING_CODES[gateEmail];
            const ok = code && gateCode && gateCode.toUpperCase() === code.toUpperCase();
            if (!ok) { setGateErr("Invalid code or attendee."); return; }
            const att = ATTENDINGS.find(a => a.email === gateEmail);
            setGateErr(""); setMe(att.name);
          }}
        >
          Verify & Continue
        </button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted">Tip: you'll see your name locked after verification.</div>
    </div>
  );

  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        {topBar}
        <div className="content">
          <div className="main">
            <Section title={mode} right={<button className="btn btn-green" onClick={downloadCSV}>Download CSV</button>}>
              {!me ? loginPanel : (
                <>
                  {mode === MODES.CAL && <CalendarMode />}
                  {mode === MODES.QA  && <QuickAddMode />}
                  {mode === MODES.RB  && <RankBoardMode />}
                  {mode === MODES.DB  && <DragBucketsMode />}
                </>
              )}
            </Section>
          </div>
          <aside className="side">
            <Section
              title="Rankings (drag to reorder)"
              right={<button className="btn-link" onClick={clearAll}>Clear all</button>}
            >
              <ol className="preview-list">
                {compressRanks(ranks).map((x, idx) => (
                  <DraggableRankItem
                    key={`${x.date}-${x.service}`}
                    index={idx}
                    item={x}
                    remove={remove}
                    reorder={reorder}
                  />
                ))}
              </ol>
              <div className="helper">
                Rules: (1) Only one selection per weekend. (2) No duplicates of (date, service).
                (3) Rank #1 is most preferred. (4) Ranks compress automatically.
              </div>
            </Section>

            <Section title="Who">
              <div className="id-row">
                <select className="id-select" value={me} onChange={(e) => setMe(e.target.value)} disabled={!me}>
                  {!me && <option value="">(locked after login)</option>}
                  {ATTENDINGS.map(a => <option key={a.email} value={a.name}>{a.name}</option>)}
                </select>
                {me && <span className="muted">{ATTENDINGS.find(a => a.name === me)?.email}</span>}
              </div>
            </Section>
          </aside>
        </div>
      </div>
      <div className="band" />

      {/* Review & Submit Modal */}
      {reviewOpen && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-title">Review & Submit</div>
            <p className="muted" style={{marginBottom:8}}>
              Please <b>download the CSV</b> and verify your preferences (name, date, service, rank).
              If everything looks correct, click <b>Proceed to Submit</b>.
            </p>
            <div className="row gap right" style={{marginTop:8}}>
              <button className="btn" onClick={() => setReviewOpen(false)}>Cancel</button>
              <button className="btn" onClick={downloadCSV}>Download CSV</button>
              <button className="btn btn-green" onClick={submitNow}>Proceed to Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
