import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";

import {
  YEAR, SERVICES, ATTENDINGS, ATTENDING_BY_NAME, ADMIN_EMAIL, WEEKENDS, FIXED_BLOCKS,
  ON_SERVICE, SERVICE_ROLES, ROLE_LABELS, MONTH_KEYS, MONTH_ABBR, MONTH_FULL, TOTAL_SLOTS, SCHEDULER_NAME,
  DEFAULT_MAX_ESTIMATE, REPO_URL,
} from "./config.js";
import { computeTargets, allocate, estimateAllMax, countSchedule, makeRng } from "./allocate.js";
import { createStore, personalLinkUrl } from "./store.js";

// ---------------------------------------------------------------------
// Weekend list in the shape the screens use: months["01"] = [{ day, date, rni, coa, isTaken, detail }]
// Christmas / New Year blocks come pre-filled (not rankable).
// ---------------------------------------------------------------------
const months = Object.fromEntries(MONTH_KEYS.map((mk) => [mk, []]));
for (const w of WEEKENDS) {
  months[w.month].push({ day: w.day, date: w.date, rni: null, coa: null, detail: w.detail, paid: !!w.paid });
}
for (const b of FIXED_BLOCKS) {
  months[b.month].push({ day: b.day, date: b.date, rni: b.rni, coa: b.coa, isTaken: true, detail: b.detail, fixed: true });
}
for (const mk of MONTH_KEYS) months[mk].sort((a, b) => a.date.localeCompare(b.date));

function fmtLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

function getAvailableServicesForDate(date) {
  for (const mk of MONTH_KEYS) {
    const entry = months[mk].find((d) => d.date === date);
    if (entry) {
      const out = [];
      if (!entry.rni) out.push(SERVICES.RNI);
      if (!entry.coa) out.push(SERVICES.COA);
      return out;
    }
  }
  return [SERVICES.RNI, SERVICES.COA];
}

function compressRanks(list) {
  return list
    .slice()
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

/** A person's service roles in one month, e.g. ["RNICU Resident"]. */
function rolesFor(name, mk) {
  const r = SERVICE_ROLES[mk] || {};
  return Object.keys(ROLE_LABELS).filter((k) => (r[k] || []).includes(name)).map((k) => ROLE_LABELS[k]);
}

/** Months a person is on service (incl. CCN), and which weekend side they get priority for. */
function serviceMonthsFor(name) {
  const out = [];
  for (const mk of MONTH_KEYS) {
    const roles = rolesFor(name, mk);
    if (!roles.length) continue;
    const os = ON_SERVICE[mk] || {};
    const sides = ["RNI", "COA"].filter((side) => (os[side] || []).includes(name));
    out.push({ mk, label: MONTH_FULL[MONTH_KEYS.indexOf(mk)], roles, sides });
  }
  return out;
}

const WANT_MAX = "max";
function wantLabel(want) {
  if (!want) return "not chosen yet";
  if (want.type === WANT_MAX) return "as many as possible";
  return `${want.n} weekend${want.n === 1 ? "" : "s"}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(headers, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

const Pill = ({children}) => <span className="pill">{children}</span>;

const DragHandle = () => (
  <span className="drag-handle" aria-hidden="true" title="Drag to reorder">
    <span className="dot-row">
      <span className="dot" /><span className="dot" />
    </span>
    <span className="dot-row">
      <span className="dot" /><span className="dot" />
    </span>
  </span>
);

function InlineServicePopover({ x, y, date, onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  const avail = getAvailableServicesForDate(date);
  return (
    <div
      ref={ref}
      style={{
        position:"fixed", top: y + 8, left: x + 8, zIndex: 9999,
        background:"#fff", border:"1px solid #e5e7eb", borderRadius: 10,
        padding: 8, boxShadow:"0 10px 30px rgba(0,0,0,0.12)"
      }}
    >
      <div style={{fontWeight:700, fontSize:12, marginBottom:6}}>
        {fmtLabel(date)} — Pick service
      </div>
      <div style={{display:"flex", gap:8}}>
        {avail.includes(SERVICES.RNI) && (
          <button className="btn btn-green" onClick={() => onPick(SERVICES.RNI)}>RNI</button>
        )}
        {avail.includes(SERVICES.COA) && (
          <button className="btn btn-blue" onClick={() => onPick(SERVICES.COA)}>COA</button>
        )}
      </div>
      <button className="btn-link" style={{marginTop:4, fontSize:11}} onClick={onClose}>
        cancel
      </button>
    </div>
  );
}

const initialState = { rankings: [] };

function reducer(state, action) {
  switch (action.type) {
    case "add": {
      const { date, service } = action;
      if (!date || !service) return state;
      const filtered = state.rankings.filter((x) => x.date !== date);
      if (state.rankings.some((x) => x.date === date && x.service === service)) {
        return state;
      }
      const next = [
        ...filtered,
        { date, service, rank: (filtered.length ? Math.max(...filtered.map(y => y.rank)) : 0) + 1 },
      ];
      return { rankings: compressRanks(next) };
    }
    case "remove": {
      const { date, service } = action;
      const next = state.rankings.filter((x) => !(x.date === date && x.service === service));
      return { rankings: compressRanks(next) };
    }
    case "reorder": {
      const { fromIndex, toIndex } = action;
      const arr = compressRanks(state.rankings);
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= arr.length || toIndex >= arr.length) {
        return state;
      }
      const moved = arr[fromIndex];
      const rest = arr.filter((_, i) => i !== fromIndex);
      rest.splice(toIndex, 0, moved);
      const renum = rest.map((x, i) => ({ ...x, rank: i + 1 }));
      return { rankings: renum };
    }
    case "clear":
      return initialState;
    case "load_from_draft": {
      const list = Array.isArray(action.rankings) ? action.rankings : [];
      const cleaned = list.filter(x => x && x.date && x.service);
      return { rankings: compressRanks(cleaned) };
    }
    default:
      return state;
  }
}

const MODES = {
  SCH: "schedule",
  CAL: "calendar",
  QA:  "quick",
};


/** "Your Rankings" — shared by every screen. Drag to reorder, or use the arrows (phones). */
function RankingsPanel({ ctx }) {
  const { rankings, remove, move, onDragStartItem, onDragOverItem, onDropItem, rankingsNote } = ctx;
  const list = compressRanks(rankings);
  return (
    <div className="mode-side" id="your-rankings">
      <div className="mode-side-inner">
        <h4 style={{ marginTop: 0, marginBottom: 4 }}>Your Rankings</h4>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, fontStyle: 'italic' }}>
          Drag (or use the arrows) to reorder. #1 = most preferred, #2 = less preferred, etc.
        </div>
        {rankingsNote}
        <ol className="preview-list">
          {list.map((r, idx) => (
            <li
              key={`${r.date}-${r.service}`}
              className="preview-item draggable-item"
              draggable
              onDragStart={onDragStartItem(idx)}
              onDragOver={onDragOverItem(idx)}
              onDrop={onDropItem(idx)}
            >
              <DragHandle />
              <span className="preview-text">#{r.rank} — {fmtLabel(r.date)} ({r.service})</span>
              <span className="move-btns">
                <button className="move-btn" aria-label="Move up" disabled={idx === 0} onClick={() => move(idx, idx - 1)}>▲</button>
                <button className="move-btn" aria-label="Move down" disabled={idx === list.length - 1} onClick={() => move(idx, idx + 1)}>▼</button>
              </span>
              <button className="btn-link" onClick={() => remove(r.date, r.service)}>
                remove
              </button>
            </li>
          ))}
          {rankings.length === 0 && (
            <li className="preview-item">
              <span className="muted">No preferences yet.</span>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

/** RNI / COA buttons for one weekend: picking one grays out the other; click again to undo. */
function ServiceButtons({ date, rankings, add, remove, compact }) {
  const avail = getAvailableServicesForDate(date);
  const mine = rankings.find((r) => r.date === date);
  const rank = mine ? compressRanks(rankings).find((r) => r.date === date)?.rank : null;
  if (avail.length === 0) return <span className="pill pill-muted">Full</span>;
  return (
    <>
      {[SERVICES.RNI, SERVICES.COA].filter((s) => avail.includes(s)).map((s) => {
        const on = mine?.service === s;
        const off = mine && !on;
        return (
          <button
            key={s}
            className={`btn btn-svc${on ? " on" : ""}`}
            disabled={off}
            title={off ? `You picked ${mine.service} for this weekend. Click ${mine.service} again to change.` : undefined}
            onClick={() => (on ? remove(date, s) : add(date, s))}
          >
            {on ? <><span className="rank-badge" title={`Rank ${rank}`}>{rank}</span>{s} ✓</> : compact ? s : `${s} → Rank`}
          </button>
        );
      })}
    </>
  );
}

/** Schedule view: laid out like the group's Word document, two months side by side. */
function ScheduleMode({ ctx }) {
  const { rankings, add, remove, me, dismissedInstructions, setDismissedInstructions } = ctx;
  const pairs = [];
  for (let i = 0; i < MONTH_KEYS.length; i += 2) pairs.push([MONTH_KEYS[i], MONTH_KEYS[i + 1]]);
  const col = (mk) => {
    const roles = rolesFor(me, mk);
    const prioSides = ["RNI", "COA"].filter((side) => (ON_SERVICE[mk]?.[side] || []).includes(me));
    const onCCN = roles.includes(ROLE_LABELS.CCN);
    return (
      <div className="sched-col" key={mk}>
        <div className="sched-head">
          <span>{MONTH_FULL[MONTH_KEYS.indexOf(mk)].toUpperCase()}</span>
          {prioSides.length > 0 && <span className="sched-tag">Your {prioSides.join(" & ")} month (weekend priority)</span>}
          {onCCN && <span className="sched-tag sched-tag-ccn">Your CCN month (no weekend priority)</span>}
        </div>
        {months[mk].map((d) => (
          <div className="sched-line" key={d.date}>
            <span className="sched-date">
              {d.day}
              {d.detail && <span className={d.paid || d.fixed ? "sched-hol" : "sched-detail"}> ({d.detail})</span>}
            </span>
            <span className="sched-btns">
              {d.isTaken ? (
                <span className="sched-fixed">{d.rni}/{d.coa}</span>
              ) : (
                <ServiceButtons date={d.date} rankings={rankings} add={add} remove={remove} compact />
              )}
            </span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="mode-layout">
      <div className="mode-main">
        {dismissedInstructions.schedule !== true && (
          <div className="mode-help">
            <div>
              <div className="mode-help-title">📄 Schedule View Instructions</div>
              <ol>
                <li>This is laid out like the final weekend schedule document</li>
                <li>Click RNI or COA on a weekend to add it to your rankings — the other service grays out (you can only work one)</li>
                <li>Click it again to remove it or to switch</li>
                <li><strong>Please rank as many weekends as possible to maximize your chances of getting your most preferred weekends</strong></li>
              </ol>
            </div>
            <button className="btn-link" style={{ fontSize: 11, whiteSpace: 'nowrap' }}
              onClick={() => setDismissedInstructions((prev) => ({ ...prev, schedule: true }))}>
              Dismiss
            </button>
          </div>
        )}
        {pairs.map(([a, b]) => (
          <div className="sched-pair" key={a}>{col(a)}{col(b)}</div>
        ))}
      </div>
      <RankingsPanel ctx={ctx} />
    </div>
  );
}

function CalendarMode({ ctx }) {
  const { rankings, add, remove, onDragStartItem, onDragOverItem, onDropItem,
          dismissedInstructions, setDismissedInstructions, rankingsNote } = ctx;
  return (
    <div className="mode-layout">
      <div className="months mode-main">
        {dismissedInstructions[MODES.CAL] !== true && (
          <div style={{ 
            padding: 16, 
            marginBottom: 16, 
            background: 'linear-gradient(135deg, #e6f2ea 0%, #d3e8db 100%)', 
            borderRadius: 12, 
            border: '1px solid #b9d9c5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a5632', marginBottom: 6 }}>
                📅 Calendar Mode Instructions
              </div>
              <div style={{ fontSize: 13, color: '#1a5632' }}>
                <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>Browse all weekends by month</li>
                  <li>Click "RNI → Rank" or "COA → Rank" buttons to add a weekend to your rankings</li>
                  <li>Already assigned weekends show the attending's name</li>
                  <li><strong>Please rank as many weekends as possible to maximize your chances of getting your most preferred weekends</strong></li>
                </ol>
              </div>
            </div>
            <button 
              className="btn-link" 
              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
              onClick={() => setDismissedInstructions(prev => ({ ...prev, [MODES.CAL]: true }))}
            >
              Dismiss
            </button>
          </div>
        )}
        {MONTH_KEYS.map((mk, i) => (
          <div key={mk} className="month">
            <div className="month-toggle">
              <span className="month-title">{MONTH_FULL[i]}</span>
            </div>
            <div className="days">
              {months[mk].map((d) => {
                const avail = getAvailableServicesForDate(d.date);
                return (
                  <div key={`${d.date}-${d.rni ?? "x"}-${d.coa ?? "x"}`} className="day">
                    <div className="day-top">
                      <span className="day-label">{d.day}</span>
                      <span className="day-date">({fmtLabel(d.date)})</span>
                    </div>
                    {d.detail && <div className="day-detail">{d.detail}</div>}
                    <div className="pill-row">
                      {d.rni && <Pill>RNI: {d.rni}</Pill>}
                      {d.coa && <Pill>COA: {d.coa}</Pill>}
                      {d.isTaken && <Pill>Full weekend</Pill>}
                    </div>
                    <div className="svc-actions">
                      <ServiceButtons date={d.date} rankings={rankings} add={add} remove={remove} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <RankingsPanel ctx={ctx} />
    </div>
  );
}

function QuickAddMode({ ctx }) {
  const { rankings, add, remove, onDragStartItem, onDragOverItem, onDropItem,
          dismissedInstructions, setDismissedInstructions, rankingsNote } = ctx;
    const [mkey, setMkey] = useState("01");
    const [date, setDate] = useState("");
    const [service, setService] = useState("");
    const saturdays = months[mkey];
    useEffect(() => { setDate(""); setService(""); }, [mkey]);
    const avail = date ? getAvailableServicesForDate(date) : [];
    const chosen = date && service ? { date, service } : null;
    const picked = date ? rankings.find((r) => r.date === date) : null;
    useEffect(() => { setService(picked ? picked.service : ""); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div className="mode-layout">
        <div className="mode-main">
          {dismissedInstructions[MODES.QA] !== true && (
            <div style={{ 
              padding: 16, 
              marginBottom: 16, 
              background: 'linear-gradient(135deg, #e6f2ea 0%, #d3e8db 100%)', 
              borderRadius: 12, 
              border: '1px solid #b9d9c5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a5632', marginBottom: 6 }}>
                  ⚡ QuickAdd Mode Instructions
                </div>
                <div style={{ fontSize: 13, color: '#1a5632' }}>
                  <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li>Use the dropdown menus to select a month</li>
                    <li>Pick a Saturday from the available dates</li>
                    <li>Choose a service (RNI or COA)</li>
                    <li>Click "Add to Rankings" to add your selection</li>
                    <li><strong>Please rank as many weekends as possible to maximize your chances of getting your most preferred weekends</strong></li>
                  </ol>
                </div>
              </div>
              <button 
                className="btn-link" 
                style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                onClick={() => setDismissedInstructions(prev => ({ ...prev, [MODES.QA]: true }))}
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="qa-layout">
            <div className="qa-form">
              <label>
                Month
                <select className="qa-select" value={mkey} onChange={e => setMkey(e.target.value)}>
                  {MONTH_KEYS.map((mk, idx) => (
                    <option key={mk} value={mk}>{MONTH_FULL[idx]}</option>
                  ))}
                </select>
              </label>
              <label>
                Saturday
                <select className="qa-select" value={date} onChange={e => setDate(e.target.value)}>
                  <option value="">Pick Saturday</option>
                  {saturdays.map(d => (
                    <option key={d.date} value={d.date}>{d.day} — {fmtLabel(d.date)}</option>
                  ))}
                </select>
              </label>
              <label>
                Service
                <select className="qa-select" value={service} onChange={e => setService(e.target.value)} disabled={!date}>
                  <option value="">Pick service</option>
                  {avail.includes(SERVICES.RNI) && <option value={SERVICES.RNI} disabled={picked && picked.service !== SERVICES.RNI}>RNI{picked?.service === SERVICES.RNI ? " (in your rankings)" : ""}</option>}
                  {avail.includes(SERVICES.COA) && <option value={SERVICES.COA} disabled={picked && picked.service !== SERVICES.COA}>COA{picked?.service === SERVICES.COA ? " (in your rankings)" : ""}</option>}
                </select>
              </label>
              {picked ? (
                <button className="btn" onClick={() => remove(picked.date, picked.service)}>
                  Remove {fmtLabel(picked.date)} ({picked.service}) from Rankings
                </button>
              ) : (
                <button className="btn btn-green" disabled={!date || !service} onClick={() => add(date, service)}>
                  Add to Rankings
                </button>
              )}
            </div>
            {chosen && !picked && (
              <div className="qa-note">
                You are adding: <b>{fmtLabel(chosen.date)}</b> — <b>{service}</b>
              </div>
            )}
          </div>
        </div>
        <RankingsPanel ctx={ctx} />
      </div>
    );
}

export default function App() {
  const store = useMemo(() => createStore(), []);

  const [authReady, setAuthReady] = useState(false);
  const [identity, setIdentity] = useState(null);   // { name, key, isAdmin }
  const myKey = identity?.key || null;
  const [gateEmail, setGateEmail] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [links, setLinks] = useState([]);
  const [linksBusy, setLinksBusy] = useState(false);
  const [gateErr, setGateErr] = useState("");
  const [linkSentTo, setLinkSentTo] = useState("");
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => (identity && ATTENDING_BY_NAME[identity.name] ? { ...ATTENDING_BY_NAME[identity.name], isAdmin: !!identity.isAdmin } : null),
    [identity]
  );
  const me = selected?.name || "";

  const [mode, setMode] = useState(MODES.SCH);
  const [showLimits, setShowLimits] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [allocatedSchedule, setAllocatedSchedule] = useState(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const [dismissedInstructions, setDismissedInstructions] = useState({});
  const [{ rankings }, dispatch] = useReducer(reducer, initialState);
  const [want, setWant] = useState(null);            // { type: "number", n } | { type: "max" }
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [meta, setMeta] = useState({});
  const [seed, setSeed] = useState(String(YEAR));
  const [fillShortFirst, setFillShortFirst] = useState(false);

  const dragIndex = useRef(null);
  const onDragStartItem = (index) => () => { dragIndex.current = index; };
  const onDragOverItem = () => (e) => { e.preventDefault(); };
  const onDropItem = (index) => () => {
    const from = dragIndex.current;
    const to = index;
    if (from == null || from === to) return;
    dispatch({ type: "reorder", fromIndex: from, toIndex: to });
    dragIndex.current = null;
  };

  // ---- sign-in ----
  useEffect(() => {
    let unsub = () => {};
    store.init((id) => { setIdentity(id); setAuthReady(true); }, (msg) => setGateErr(msg))
      .then((u) => { unsub = u || unsub; })
      .catch((e) => { setGateErr(String(e.message || e)); setAuthReady(true); });
    return () => unsub();
  }, [store]);

  const sendLink = async () => {
    if (store.mode === "demo") {
      if (!gateEmail) { setGateErr("Please select a name."); return; }
      setGateErr("");
      await store.demoSignIn(gateEmail);
      return;
    }
    const email = gateEmail.trim().toLowerCase();
    if (email !== ADMIN_EMAIL) {
      setGateErr("Only the scheduler signs in here. Attendings: please use the personal link from your email.");
      return;
    }
    setSending(true); setGateErr("");
    try {
      await store.sendAdminLink(email);
      setLinkSentTo(email);
    } catch (e) {
      setGateErr(`Could not send the sign-in email: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  // ---- load my draft (and whether I already submitted) BEFORE any saving ----
  useEffect(() => {
    if (!myKey) return;
    let cancelled = false;
    setDraftLoaded(false);
    (async () => {
      try {
        const [draft, sub, m] = await Promise.all([store.getDraft(myKey), store.getSubmission(myKey), store.getMeta()]);
        if (cancelled) return;
        const src = draft || sub;
        if (src && Array.isArray(src.rankings)) dispatch({ type: "load_from_draft", rankings: src.rankings });
        if (src?.want) setWant(src.want);
        if (sub?.ts) setSubmittedAt(sub.ts.toDate ? sub.ts.toDate() : new Date());
        setMeta(m || {});
      } catch (e) {
        console.error("Failed to load draft", e);
      } finally {
        if (!cancelled) setDraftLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [store, myKey]);

  // ---- autosave (only after the draft has loaded, so nothing gets wiped) ----
  useEffect(() => {
    if (!myKey || !draftLoaded) return;
    store.saveDraft(myKey, { who: me, rankings, want: want || null }).catch((e) => console.error("Failed to save draft", e));
  }, [store, myKey, me, draftLoaded, rankings, want]);

  const add = useCallback((date, service) => {
    const avail = getAvailableServicesForDate(date);
    if (!avail.includes(service)) return;
    dispatch({ type: "add", date, service });
  }, []);

  const remove = useCallback((date, service) => {
    dispatch({ type: "remove", date, service });
  }, []);

  // ---- what this person can expect ----
  const expected = useMemo(() => {
    if (!want) return null;
    if (want.type === WANT_MAX) {
      const txt = meta.maxShare || DEFAULT_MAX_ESTIMATE;
      const hi = parseInt(String(txt).split(/[–-]/).pop(), 10) || 6;
      return { text: `about ${txt}`, hi };
    }
    return { text: `${want.n}`, hi: want.n };
  }, [want, meta]);
  const suggestRank = expected ? Math.min(WEEKENDS.length, Math.max(expected.hi * 2, expected.hi + 4)) : null;

  const rankingsNote = expected && expected.hi > 0 ? (
    <div className="rank-note">
      Ranked <b>{rankings.length}</b>
      {rankings.length < suggestRank && <> · rank at least <b>{suggestRank}</b> for the best chance of getting weekends you want</>}
    </div>
  ) : null;

  const myServiceMonths = useMemo(() => (me ? serviceMonthsFor(me) : []), [me]);

  // ---- admin ----
  const loadAllSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const subs = await store.listSubmissions();
      setAllSubmissions(subs);
      if (subs.length === 0) alert("No submissions found yet.");
    } catch (e) {
      console.error("Failed to load submissions", e);
      alert("Failed to load submissions. Error: " + e.message);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const downloadAllSubmissionsCSV = () => {
    if (allSubmissions.length === 0) { alert("No submissions to download"); return; }
    const rows = [];
    for (const sub of allSubmissions) {
      for (const r of (Array.isArray(sub.rankings) ? sub.rankings : [])) {
        rows.push({ name: sub.who, email: ATTENDING_BY_NAME[sub.who]?.email || "", weekends_wanted: wantLabel(sub.want), date: r.date, service: r.service, rank: r.rank });
      }
    }
    downloadBlob(new Blob([toCSV(["name", "email", "weekends_wanted", "date", "service", "rank"], rows)], { type: "text/csv" }), `${YEAR}-all-submissions.csv`);
  };

  const resetUserData = async (sub) => {
    if (!window.confirm(`Are you sure you want to reset all data for ${sub.who}? This will delete their draft and submission.`)) return;
    try {
      await store.resetUser(sub.id);
      alert(`Successfully reset data for ${sub.who}`);
      loadAllSubmissions();
    } catch (e) {
      console.error("Failed to reset user data", e);
      alert("Failed to reset user data");
    }
  };

  const subsByName = useMemo(() => Object.fromEntries(allSubmissions.map((s) => [s.who, s])), [allSubmissions]);
  const notSubmitted = ATTENDINGS.filter((a) => !subsByName[a.name]).map((a) => a.name);
  const allMax = useMemo(() => estimateAllMax(TOTAL_SLOTS, ATTENDINGS.length), []);

  const targetsInfo = useMemo(() => {
    if (!allSubmissions.length) return null;
    const requests = {};
    for (const s of allSubmissions) if (s.want) requests[s.who] = s.want;
    return computeTargets({ names: ATTENDINGS.map((a) => a.name), requests, totalSlots: TOTAL_SLOTS, scheduler: SCHEDULER_NAME, seed });
  }, [allSubmissions, seed]);

  const publishShare = async () => {
    if (!targetsInfo?.share) return;
    const { base, extraCount } = targetsInfo.share;
    const txt = extraCount ? `${base}–${base + 1}` : `${base}`;
    try {
      await store.setMeta({ maxShare: txt });
      setMeta((m) => ({ ...m, maxShare: txt }));
      alert(`Published: people who chose "as many as possible" will now see "${txt}".`);
    } catch (e) {
      alert("Failed to publish: " + e.message);
    }
  };

  const runAllocationAlgorithm = () => {
    if (!targetsInfo) { alert("No submissions to allocate"); return; }
    const rankingsByName = Object.fromEntries(allSubmissions.map((s) => [s.who, Array.isArray(s.rankings) ? s.rankings : []]));
    const res = allocate({
      weekends: WEEKENDS, onService: ON_SERVICE, rankings: rankingsByName, targets: targetsInfo.targets,
      scheduler: SCHEDULER_NAME, seed, fillShortfallsFirst: fillShortFirst,
    });
    setAllocatedSchedule({ ...res, targets: targetsInfo.targets, seed });
    setShowAllocationModal(true);
  };

  const editSlot = (date, service, name) => {
    setAllocatedSchedule((prev) => {
      const schedule = { ...prev.schedule, [date]: { ...(prev.schedule[date] || {}), [service]: name || undefined } };
      const how = { ...prev.how, [`${date}|${service}`]: name ? "edited" : undefined };
      return { ...prev, schedule, how };
    });
  };

  const allocCounts = useMemo(
    () => (allocatedSchedule ? countSchedule(allocatedSchedule.schedule, ATTENDINGS.map((a) => a.name)) : {}),
    [allocatedSchedule]
  );
  const allocStats = useMemo(() => {
    if (!allocatedSchedule) return null;
    let filled = 0;
    const unfilled = [];
    const clashes = [];
    for (const w of WEEKENDS) {
      const d = allocatedSchedule.schedule[w.date] || {};
      for (const s of ["RNI", "COA"]) { if (d[s]) filled++; else unfilled.push({ date: w.date, service: s }); }
      if (d.RNI && d.RNI === d.COA) clashes.push(w.date);
    }
    return { filled, unfilled, clashes, total: TOTAL_SLOTS };
  }, [allocatedSchedule]);

  const saveAllocation = async () => {
    if (!allocatedSchedule) return;
    if (!window.confirm("Are you sure you want to save this allocation? This will update the schedule permanently.")) return;
    try {
      await store.saveAllocation({
        year: YEAR, schedule: JSON.parse(JSON.stringify(allocatedSchedule.schedule)), counts: allocCounts,
        targets: allocatedSchedule.targets, seed: allocatedSchedule.seed, createdBy: selected?.name || "Admin",
      });
      alert("Allocation saved successfully!");
    } catch (e) {
      console.error("Failed to save allocation", e);
      alert("Failed to save allocation");
    }
  };

  const downloadAllocationCSV = () => {
    if (!allocatedSchedule) return;
    const rows = [];
    for (const w of WEEKENDS) {
      for (const s of ["RNI", "COA"]) {
        rows.push({ date: w.date, weekend: `${MONTH_FULL[MONTH_KEYS.indexOf(w.month)]} ${w.day}`, service: s, attending: allocatedSchedule.schedule[w.date]?.[s] || "" });
      }
    }
    downloadBlob(new Blob([toCSV(["date", "weekend", "service", "attending"], rows)], { type: "text/csv" }), `${YEAR}-final-allocation.csv`);
  };

  const downloadWord = async () => {
    if (!allocatedSchedule) return;
    const { weekendDocBlob } = await import("./wordExport.js");
    const blob = await weekendDocBlob(allocatedSchedule.schedule, new Date());
    downloadBlob(blob, `${YEAR}_Attending_Weekend_Schedule.docx`);
  };

  // Preview mode only: fill everyone with random test submissions.
  const fillTestData = async () => {
    if (store.mode !== "demo") return;
    if (!window.confirm("Preview mode: replace all submissions with random test data?")) return;
    const rng = makeRng(`test:${Date.now()}`);
    for (const a of ATTENDINGS) {
      const r = rng();
      const w = r < 0.35 ? { type: WANT_MAX } : r < 0.45 ? { type: "number", n: 0 } : { type: "number", n: 1 + Math.floor(rng() * 8) };
      const opts = [];
      for (const wk of WEEKENDS) {
        const os = ON_SERVICE[wk.month];
        const svc = os.RNI.includes(a.name) ? "RNI" : os.COA.includes(a.name) ? "COA" : rng() < 0.5 ? "RNI" : "COA";
        opts.push({ date: wk.date, service: svc, s: rng() + (wk.paid ? 0.4 : 0) + (os.RNI.includes(a.name) || os.COA.includes(a.name) ? 0.5 : 0) });
      }
      opts.sort((x, y) => y.s - x.s);
      const k = w.type === WANT_MAX ? 20 : w.n * 3;
      const rk = opts.slice(0, k).map((o, i) => ({ date: o.date, service: o.service, rank: i + 1 }));
      await store.submit(a.email, { who: a.name, want: w, rankings: rk });
    }
    loadAllSubmissions();
  };

  const alreadyAssigned = useMemo(() => {
    if (!selected) return [];
    const out = [];
    for (const b of FIXED_BLOCKS) {
      if (b.rni === selected.name) out.push({ date: b.date, service: "RNI", detail: b.detail });
      if (b.coa === selected.name) out.push({ date: b.date, service: "COA", detail: b.detail });
    }
    return out;
  }, [selected]);

  const downloadCSV = () => {
    if (!selected) { alert("Sign in first."); return; }
    const rows = compressRanks(rankings).map((r) => ({ name: selected.name, date: r.date, service: r.service, rank: r.rank }));
    downloadBlob(new Blob([toCSV(["name", "date", "service", "rank"], rows)], { type: "text/csv" }), `${YEAR}-${selected.name}-preferences.csv`);
  };

  const submit = () => {
    if (!authReady || !selected) { alert("Sign in first."); return; }
    if (!want) { alert('Please choose "How many weekends do you want?" first.'); setShowLimits(true); return; }
    const wantsSome = want.type === WANT_MAX || want.n > 0;
    if (wantsSome && rankings.length === 0) { alert("Please add at least one weekend to your rankings before submitting."); return; }
    setShowSubmitPrompt(true);
  };

  const reallySubmit = async () => {
    if (!selected) return;
    try {
      await store.submit(myKey, { year: YEAR, who: selected.name, want, rankings: compressRanks(rankings) });
      setSubmittedAt(new Date());
      setShowSubmitPrompt(false);
      alert("✅ Successfully submitted! Your preferences have been saved. You can change them and submit again until the deadline.");
    } catch (e) {
      console.error("Submit error:", e);
      alert("❌ Failed to save. Error: " + e.message + "\n\nPlease contact the admin.");
    }
  };

  // ---- personal links (admin) ----
  const activeLinkFor = (name) => links.find((l) => l.name === name && l.active);
  const loadLinks = async () => {
    try { setLinks(await store.listLinks()); } catch (e) { alert("Failed to load personal links: " + e.message); }
  };
  useEffect(() => { if (selected?.isAdmin && showAdminPanel) loadLinks(); }, [selected?.isAdmin, showAdminPanel]); // eslint-disable-line react-hooks/exhaustive-deps
  const createMissingLinks = async () => {
    setLinksBusy(true);
    try {
      for (const a of ATTENDINGS) if (!activeLinkFor(a.name)) await store.createLink(a.name);
      await loadLinks();
    } catch (e) { alert("Failed to create links: " + e.message); } finally { setLinksBusy(false); }
  };
  const reissueLink = async (l) => {
    if (!window.confirm(`Issue a new link for ${l.name}? Their current link will stop working (their saved preferences move to the new link). You'll need to email them the new one.`)) return;
    setLinksBusy(true);
    try { await store.reissueLink(l.token, l.name); await loadLinks(); } catch (e) { alert("Failed to reissue: " + e.message); } finally { setLinksBusy(false); }
  };
  const copyText = async (t) => {
    try { await navigator.clipboard.writeText(t); alert("Link copied."); } catch { window.prompt("Copy this link:", t); }
  };
  const composeHref = (a, url) => {
    const subject = `Your ${YEAR} weekend scheduler link`;
    const body =
`Hi Dr. ${a.name},

Here is your personal link for the ${YEAR} weekend scheduler:

${url}

Click it to open your own page — no password needed. It works on your phone or computer and keeps working until the deadline, so you can come back and make changes.

Please don't forward this link; it opens your page only.

Thanks,
Jegen`;
    return `mailto:${a.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const move = (from, to) => dispatch({ type: "reorder", fromIndex: from, toIndex: to });
  const ctx = {
    rankings, add, remove, move, me, onDragStartItem, onDragOverItem, onDropItem,
    dismissedInstructions, setDismissedInstructions, rankingsNote,
  };

  const ModeTabs = () => (
    <div className="mode-tabs">
      <button className={mode === MODES.SCH ? "tab active" : "tab"} onClick={() => setMode(MODES.SCH)}>
        Schedule
      </button>
      <button className={mode === MODES.CAL ? "tab active" : "tab"} onClick={() => setMode(MODES.CAL)}>
        Calendar
      </button>
      <button className={mode === MODES.QA ? "tab active" : "tab"} onClick={() => setMode(MODES.QA)}>
        QuickAdd
      </button>
    </div>
  );

  const loginPanel = store.mode === "demo" ? (
    <div className="login">
      <div className="login-title">Preview mode — pick a name</div>
      <div className="id-row">
        <select className="id-select" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)}>
          <option value="">Select a name</option>
          {ATTENDINGS.map((a) => (
            <option key={a.name} value={a.name}>{a.fullName} ({a.name})</option>
          ))}
        </select>
        <button className="btn btn-green" onClick={sendLink} disabled={!gateEmail}>Continue</button>
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
    </div>
  ) : (
    <div className="login">
      <div className="login-title">Open your personal link</div>
      <div style={{ fontSize: 14, lineHeight: 1.6 }}>
        Each attending gets a personal link by email from Dr. Kandasamy. <b>Click the link in that email</b> to open your own page —
        no password needed. It works on your phone or computer, as many times as you like.
      </div>
      {gateErr && <div className="error">{gateErr}</div>}
      <div className="muted" style={{ marginTop: 14 }}>
        Can't find the email? Contact Dr. Kandasamy.{' '}
        {!showAdminLogin && <button className="btn-link" onClick={() => setShowAdminLogin(true)}>Scheduler sign-in</button>}
      </div>
      {showAdminLogin && (
        linkSentTo ? (
          <div className="login-sent" style={{ marginTop: 12 }}>
            ✉️ A sign-in link has been sent to <b>{linkSentTo}</b>. UAB email can take 5–10 minutes to arrive.
            If you request another, <b>only the newest email will work</b>.
          </div>
        ) : (
          <div className="id-row" style={{ marginTop: 12 }}>
            <input className="id-select" type="email" placeholder="Scheduler's UAB email" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)} />
            <button className="btn btn-green" onClick={sendLink} disabled={sending || !gateEmail}>
              {sending ? "Sending..." : "Email me a sign-in link"}
            </button>
          </div>
        )
      )}
    </div>
  );

  const wantValue = !want ? "" : want.type === WANT_MAX ? WANT_MAX : String(want.n);
  const onWantChange = (v) => {
    if (v === "") setWant(null);
    else if (v === WANT_MAX) setWant({ type: WANT_MAX });
    else setWant({ type: "number", n: parseInt(v, 10) });
  };


  const cardStyle = { background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' };

  return (
    <div className="page">
      <div className="band" />
      <div className="container">
        <div className="topbar">
          <div className="topbar-inner">
            <div className="section-title">UAB/COA Weekend Attending Scheduler {YEAR}</div>
            <div className="spacer" />
            {selected && (
              <span className="badge" style={{
                background: selected.isAdmin
                  ? 'linear-gradient(135deg, #fdb913 0%, #e6a40b 100%)'
                  : 'rgba(255, 255, 255, 0.2)',
                color: selected.isAdmin ? '#111827' : '#ffffff',
                borderColor: selected.isAdmin ? 'rgba(253, 185, 19, 0.4)' : 'rgba(255, 255, 255, 0.3)',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 700
              }}>
                {selected.isAdmin && '👑 '}
                {selected.fullName}
              </span>
            )}
            {selected && (
              <button className="btn" onClick={() => {
                if (!selected.isAdmin && store.mode !== "demo" && !window.confirm("Sign out on this device? You'll need your personal link from the email to get back in.")) return;
                store.signOut(); setGateEmail(""); setLinkSentTo(""); dispatch({ type: "clear" }); setWant(null); setSubmittedAt(null);
              }}>
                Sign out
              </button>
            )}
            {selected?.isAdmin && (
              <button className="btn btn-amber" onClick={() => setShowAdminPanel(!showAdminPanel)}>
                {showAdminPanel ? 'Hide Admin Panel' : 'Admin Panel'}
              </button>
            )}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="badge hide-phone"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer'
              }}
              title="View source code on GitHub"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginTop: 1 }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </a>
            <span className="badge hide-phone">{store.projectId}</span>
            <button className="btn" onClick={submit}>Submit</button>
            <button className="btn btn-green" onClick={downloadCSV}>Download CSV</button>
          </div>
        </div>
        <div className="content">
          <div className="main">
            {!authReady ? (
              <div className="section">
                <div className="section-head">
                  <h3 className="section-title">Loading...</h3>
                </div>
                <div className="section-body">
                  <p>Initializing authentication, please wait...</p>
                </div>
              </div>
            ) : !me ? (
              <div className="section">
                <div className="section-head">
                  <h3 className="section-title">Login</h3>
                </div>
                <div className="section-body">{loginPanel}</div>
              </div>
            ) : !draftLoaded ? (
              <div className="section">
                <div className="section-body">
                  <p>Loading your saved preferences...</p>
                </div>
              </div>
            ) : (
              <>
                {selected?.isAdmin && showAdminPanel && (
                  <div className="section" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderColor: '#fdb913' }}>
                    <div className="section-head">
                      <h3 className="section-title">👑 Admin Panel</h3>
                    </div>
                    <div className="section-body">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={cardStyle}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>🔗 Personal Links</h4>
                          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
                            Each attending opens their own page with their personal link. Click <b>Compose email</b> to open a
                            ready-to-send Outlook message for that person. <b>New link</b> replaces a link that was lost or forwarded
                            (the old one stops working; their saved choices carry over).
                          </p>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-green" onClick={createMissingLinks} disabled={linksBusy}>
                              {linksBusy ? 'Working...' : `Create links for everyone who doesn't have one`}
                            </button>
                            <button className="btn" onClick={loadLinks} disabled={linksBusy}>Refresh</button>
                          </div>
                          <div className="links-table">
                            {ATTENDINGS.map((a) => {
                              const l = activeLinkFor(a.name);
                              const url = l ? personalLinkUrl(l.token) : null;
                              return (
                                <div className="links-row" key={a.name}>
                                  <div className="links-name"><strong>{a.name}</strong><span>{a.email}</span></div>
                                  {l ? (
                                    <div className="links-actions">
                                      <a className="btn btn-green" href={composeHref(a, url)}>Compose email</a>
                                      <button className="btn" onClick={() => copyText(url)}>Copy link</button>
                                      <button className="btn-link" onClick={() => reissueLink(l)} disabled={linksBusy}>New link</button>
                                    </div>
                                  ) : (
                                    <span className="muted">No link yet</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div style={cardStyle}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📊 View All Submissions</h4>
                          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-green" onClick={loadAllSubmissions} disabled={loadingSubmissions}>
                              {loadingSubmissions ? 'Loading...' : 'Load All Submissions'}
                            </button>
                            {allSubmissions.length > 0 && (
                              <button className="btn" onClick={downloadAllSubmissionsCSV}>
                                Download All as CSV
                              </button>
                            )}
                            {store.mode === "demo" && (
                              <button className="btn" onClick={fillTestData}>Fill with random test data (preview only)</button>
                            )}
                          </div>
                          {allSubmissions.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                                Total Submissions: {allSubmissions.length} / {ATTENDINGS.length}
                              </div>
                              <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                                {allSubmissions.map((sub) => (
                                  <div key={sub.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <strong>{sub.who}</strong> ({ATTENDING_BY_NAME[sub.who]?.email})
                                      <br />
                                      <span style={{ fontSize: 12, color: '#64748b' }}>
                                        Wants {wantLabel(sub.want)} · {sub.rankings?.length || 0} preferences ranked
                                      </span>
                                    </div>
                                    <button className="btn-link" style={{ color: '#dc2626' }} onClick={() => resetUserData(sub)}>
                                      Reset
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {notSubmitted.length > 0 && (
                                <div style={{ fontSize: 12, color: '#92400e', marginTop: 8 }}>
                                  Not submitted yet: {notSubmitted.join(", ")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={cardStyle}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📈 Analytics</h4>
                          {allSubmissions.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                              <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1' }}>
                                  {allSubmissions.length}
                                </div>
                                <div style={{ fontSize: 12, color: '#0369a1' }}>Submitted</div>
                              </div>
                              <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>
                                  {ATTENDINGS.length - allSubmissions.length}
                                </div>
                                <div style={{ fontSize: 12, color: '#92400e' }}>Pending</div>
                              </div>
                              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>
                                  {Math.round((allSubmissions.length / ATTENDINGS.length) * 100)}%
                                </div>
                                <div style={{ fontSize: 12, color: '#15803d' }}>Completion</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: '#64748b' }}>Load submissions to see analytics</div>
                          )}
                        </div>

                        <div style={cardStyle}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📣 Weekend Numbers</h4>
                          <div style={{ fontSize: 13, marginBottom: 10 }}>
                            <b>{TOTAL_SLOTS}</b> weekend slots to allocate ({WEEKENDS.length} weekends × RNI/COA; Christmas and New Year not counted).
                            <br />
                            For the first email — if everyone wanted as many as possible: <b>{allMax.text}</b>.
                          </div>
                          {targetsInfo ? (
                            <div style={{ fontSize: 13 }}>
                              <div>Specific requests: <b>{targetsInfo.definiteSum}</b> weekends from {targetsInfo.definite.length} people.</div>
                              {targetsInfo.share ? (
                                <>
                                  <div style={{ marginTop: 6 }}>
                                    "As many as possible" ({targetsInfo.maxGroup.length}): <b>{targetsInfo.maxGroup.join(", ")}</b>
                                  </div>
                                  <div style={{ marginTop: 6 }}>
                                    {targetsInfo.share.remaining} weekends left for this group → <b>{targetsInfo.share.base}</b> each
                                    {targetsInfo.share.extraCount > 0 && (
                                      <> ; <b>{targetsInfo.share.extraCount}</b> get {targetsInfo.share.base + 1} ({targetsInfo.share.extraNames.join(", ")})</>
                                    )}
                                  </div>
                                  <button className="btn" style={{ marginTop: 10 }} onClick={publishShare}>
                                    Publish this number to the "as many as possible" group
                                  </button>
                                </>
                              ) : (
                                <div style={{ marginTop: 6 }}>Nobody chose "as many as possible" yet.</div>
                              )}
                              {targetsInfo.notes.map((n, i) => <div key={i} style={{ marginTop: 6, color: '#92400e' }}>{n}</div>)}
                            </div>
                          ) : (
                            <div style={{ color: '#64748b', fontSize: 13 }}>Load submissions to calculate the shares.</div>
                          )}
                        </div>

                        <div style={cardStyle}>
                          <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>🎯 Run Fair Allocation</h4>
                          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>
                            On-service attendings get priority for weekends in their service month; everything else goes,
                            one weekend at a time, to whoever has received the smallest share of their number so far.
                            Paid holiday weekends are spread out. Ties are decided by lottery — submission time never matters.
                          </p>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
                            <label>Lottery seed{' '}
                              <input className="qa-select" style={{ width: 90 }} value={seed} onChange={(e) => setSeed(e.target.value)} />
                            </label>
                            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input type="checkbox" checked={fillShortFirst} onChange={(e) => setFillShortFirst(e.target.checked)} />
                              Give leftover weekends to people still short of their number before me
                            </label>
                          </div>
                          <button
                            className="btn primary"
                            onClick={runAllocationAlgorithm}
                            disabled={allSubmissions.length === 0}
                          >
                            Run Allocation Algorithm
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!dismissedInstructions.overview && (
                  <div className="section">
                    <div className="section-body">
                      <div style={{
                        padding: 16,
                        background: 'linear-gradient(135deg, #e6f2ea 0%, #d3e8db 100%)',
                        borderRadius: 12,
                        border: '1px solid #b9d9c5',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start'
                      }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1a5632', marginBottom: 6 }}>
                            📋 How this works
                          </div>
                          <div style={{ fontSize: 13, color: '#1a5632' }}>
                            <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
                              <li style={{ marginBottom: 4 }}>Choose how many weekends you want.</li>
                              <li style={{ marginBottom: 4 }}>
                                Add weekends to your list in order of preference (#1 = most wanted).{' '}
                                <strong>Rank as many weekends as you can.</strong> The more you rank, the more likely you are
                                to end up with weekends you actually want, rather than whatever is left over.
                              </li>
                              <li>Click <strong>Submit</strong> when you're done. You can still make changes and resubmit until the deadline.</li>
                            </ol>
                          </div>
                        </div>
                        <button
                          className="btn-link"
                          style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                          onClick={() => setDismissedInstructions(prev => ({ ...prev, overview: true }))}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showLimits ? (
                  <div className="section">
                    <div className="section-head">
                      <h3 className="section-title">Your weekends</h3>
                      <div className="section-right">
                        <button className="btn btn-amber" onClick={() => setShowLimits(false)} disabled={!want}>OK</button>
                      </div>
                    </div>
                    <div className="section-body">
                      <div className="limits-summary">
                        <div className="limit-item">
                          <span className="limit-label">How many weekends do you want?</span>
                          <select className="qa-select" value={wantValue} onChange={(e) => onWantChange(e.target.value)}>
                            <option value="">Choose...</option>
                            {Array.from({ length: 16 }, (_, i) => i).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                            <option value={WANT_MAX}>As many as possible</option>
                          </select>
                        </div>
                        <div className="limit-item">
                          <span className="limit-label">Currently ranked:</span>
                          <span className="limit-value">{rankings.length}</span>
                        </div>
                        <div className="limit-item">
                          <span className="limit-label">Submitted:</span>
                          <span className="limit-value">{submittedAt ? submittedAt.toLocaleDateString() : "not yet"}</span>
                        </div>
                      </div>
                      {want?.type === WANT_MAX && (
                        <div className="muted" style={{ marginTop: 8 }}>
                          Everyone who asks for a specific number gets it; the rest is shared equally among those who chose
                          "as many as possible". The final number will be emailed to you.
                        </div>
                      )}
                      <div className="assigned-list">
                        <div className="assigned-title">Your {YEAR} service months:</div>
                        {myServiceMonths.length ? (
                          <ul>
                            {myServiceMonths.map((m) => (
                              <li key={m.mk}>{m.label} — {m.roles.join(", ")}{m.sides.length > 0 && <> (priority for {m.sides.join(" & ")} weekends that month)</>}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="muted">None this year.</div>
                        )}
                      </div>
                      {alreadyAssigned.length > 0 && (
                        <div className="assigned-list">
                          <div className="assigned-title">Holiday blocks you're covering:</div>
                          <ul>
                            {alreadyAssigned.map((a, i) => (
                              <li key={i}>{a.detail} ({fmtLabel(a.date)}) — {a.service}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="section">
                    <div className="section-body" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
                      <span>You want <b>{wantLabel(want)}</b> · ranked <b>{rankings.length}</b></span>
                      <button className="btn-link" onClick={() => setShowLimits(true)}>Edit</button>
                    </div>
                  </div>
                )}

                <a className="jump-rankings" href="#your-rankings">Your rankings ({rankings.length}) ↓</a>
                <div className="section">
                  <div className="section-head">
                    <h3 className="section-title">Select weekends</h3>
                  </div>
                  <div className="section-body">
                    <ModeTabs />
                    {mode === MODES.SCH && <ScheduleMode ctx={ctx} />}
                    {mode === MODES.CAL && <CalendarMode ctx={ctx} />}
                    {mode === MODES.QA && <QuickAddMode ctx={ctx} />}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showSubmitPrompt && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Before you submit...</h3>
            <p>Please follow these steps:</p>
            <ol style={{ textAlign: "left", marginTop: 16, marginBottom: 16 }}>
              <li style={{ marginBottom: 8 }}>Click "Download CSV" to save your preferences</li>
              <li style={{ marginBottom: 8 }}>Open the CSV file and verify all your ranked weekends are correct</li>
              <li style={{ marginBottom: 8 }}>If everything looks good, come back and click "Submit Now" below</li>
            </ol>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              You want <b>{wantLabel(want)}</b> and have ranked <b>{rankings.length}</b> weekend{rankings.length === 1 ? "" : "s"}.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn btn-green" onClick={reallySubmit}>Submit Now</button>
              <button className="btn" onClick={() => setShowSubmitPrompt(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAllocationModal && allocatedSchedule && allocStats && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 'min(900px, 94vw)', maxHeight: '90vh', overflow: 'auto' }}>
            <h3>🎯 Allocation Results</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>
                  {allocStats.filled}
                </div>
                <div style={{ fontSize: 12, color: '#15803d' }}>Slots Filled</div>
              </div>
              <div style={{ background: '#fef3c7', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>
                  {allocStats.unfilled.length}
                </div>
                <div style={{ fontSize: 12, color: '#92400e' }}>Unfilled</div>
              </div>
              <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1' }}>
                  {Math.round((allocStats.filled / allocStats.total) * 100)}%
                </div>
                <div style={{ fontSize: 12, color: '#0369a1' }}>Fill Rate</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Assignments per Attending (got / number):</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, fontSize: 12 }}>
                {ATTENDINGS.map((a) => {
                  const got = allocCounts[a.name] || 0;
                  const tgt = allocatedSchedule.targets[a.name] || 0;
                  const off = got !== tgt;
                  return (
                    <div key={a.name} style={{ padding: 8, background: off ? '#fef3c7' : '#f8fafc', borderRadius: 6 }}>
                      <strong>{a.name}</strong>: {got} / {tgt}
                      {allocatedSchedule.holidayCounts[a.name] > 0 && <span style={{ color: '#64748b' }}> · {allocatedSchedule.holidayCounts[a.name]} holiday</span>}
                    </div>
                  );
                })}
              </div>
              {allocatedSchedule.leftover.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 8, color: '#92400e' }}>
                  {allocatedSchedule.leftover.length} weekend(s) could not be filled from rankings and went to {SCHEDULER_NAME}.
                </div>
              )}
              {allocatedSchedule.toShort?.length > 0 && (
                <div style={{ fontSize: 12, marginTop: 4, color: '#92400e' }}>
                  {allocatedSchedule.toShort.length} unranked weekend(s) were given to people still short of their number.
                </div>
              )}
              <div style={{ fontSize: 11, marginTop: 6, color: '#64748b' }}>Lottery seed: {allocatedSchedule.seed}</div>
            </div>

            {allocStats.unfilled.length > 0 && (
              <div style={{ marginBottom: 20, padding: 12, background: '#fef3c7', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>
                  ⚠️ Unfilled Slots ({allocStats.unfilled.length}):
                </h4>
                <div style={{ fontSize: 12 }}>
                  {allocStats.unfilled.map((slot, i) => (
                    <span key={i} style={{ marginRight: 8 }}>
                      {fmtLabel(slot.date)} ({slot.service})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {allocStats.clashes.length > 0 && (
              <div style={{ marginBottom: 20, padding: 12, background: '#fee2e2', borderRadius: 8, fontSize: 12 }}>
                ⚠️ Same person on both RNI and COA: {allocStats.clashes.map(fmtLabel).join(", ")}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Schedule Preview (you can change any name):</h4>
              <div style={{ maxHeight: 340, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 12 }}>
                {WEEKENDS.map((w) => (
                  <div key={w.date} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <strong style={{ width: 150 }}>{fmtLabel(w.date)}{w.detail ? ` (${w.detail})` : ''}</strong>
                    {["RNI", "COA"].map((s) => (
                      <label key={s} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {s}:
                        <select className="qa-select" value={allocatedSchedule.schedule[w.date]?.[s] || ""} onChange={(e) => editSlot(w.date, s, e.target.value)}>
                          <option value="">—</option>
                          {ATTENDINGS.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                        </select>
                      </label>
                    ))}
                    {["RNI", "COA"].some((s) => allocatedSchedule.how?.[`${w.date}|${s}`] === "on-service") && (
                      <span className="pill">on-service</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-green" onClick={saveAllocation}>
                Save Allocation to Database
              </button>
              <button className="btn btn-green" onClick={downloadWord}>
                Download Word Document
              </button>
              <button className="btn" onClick={downloadAllocationCSV}>
                Download as CSV
              </button>
              <button className="btn" onClick={() => setShowAllocationModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
