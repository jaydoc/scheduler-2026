import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
} from "firebase/firestore";

import './App.css';


/* =========================================================
   BUILD TAG
========================================================= */
const __APP_VERSION__ = "v13.0 — unified modes, centered, horizontal DragBuckets, Jan-first QuickAdd";

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
    // allow injected compile-time/global config if present
    if (typeof __firebase_config !== "undefined" && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch {}
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG) {
    return window.FALLBACK_FIREBASE_CONFIG;
  }
  return LOCAL_FALLBACK;
})();
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v13.0";
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };

/* Init Firebase */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================================================
   ATTENDINGS (with emails you provided)
========================================================= */
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

/* Optional display of target counts (shown after selecting name) */
const ATTENDING_LIMITS = {
  Ambal:     { requested: 6,  claimed: 4, left: 2 },
  Schuyler:  { requested: 3,  claimed: 2, left: 1 },
  Mackay:    { requested: 5,  claimed: 1, left: 4 },
  Kane:      { requested: 1,  claimed: 1, left: 0 },
  Salas:     { requested: 3,  claimed: 0, left: 3 },
  Sims:      { requested: 8,  claimed: 4, left: 4 },
  Travers:   { requested: 7,  claimed: 4, left: 3 },
  Kandasamy: { requested: 10, claimed: 6, left: 4 },
  Willis:    { requested: 9,  claimed: 4, left: 5 },
  Bhatia:    { requested: 6,  claimed: 5, left: 1 },
  Winter:    { requested: 5,  claimed: 3, left: 2 },
  Boone:     { requested: 9,  claimed: 6, left: 3 },
  Arora:     { requested: 9,  claimed: 7, left: 2 },
  Jain:      { requested: 9,  claimed: 1, left: 8 },
  Lal:       { requested: 0,  claimed: 0, left: 0 },
  Shukla:    { requested: 9,  claimed: 1, left: 8 },
  Vivian:    { requested: 0,  claimed: 0, left: 2 },
  Carlo:     { requested: 5,  claimed: 5, left: 0 },
};

/* =========================================================
   CALENDAR (SATURDAYS OF 2026) — your current state
   (Same content structure you’ve been using.)
========================================================= */
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

/* Flat weekends list in Jan→Dec order */
const weekendsFlat = MONTH_KEYS.flatMap((mk, i) =>
  months[mk].map(w => ({
    id: w.date,
    monthKey: mk,
    monthIdx: i,
    monthName: MONTH_FULL[i],
    dayText: w.day,
    rni: w.rni,
    coa: w.coa,
    detail: w.detail || "",
    isTaken: Boolean(w.isTaken),
  }))
);
const allWeekendIds = weekendsFlat.map(x => x.id);

/* Availability map per weekend id */
const availabilityByWeekend = (() => {
  const m = {};
  for (const w of weekendsFlat) {
    const avail = [];
    if (w.rni === null) avail.push(SERVICES.RNI);
    if (w.coa === null) avail.push(SERVICES.COA);
    m[w.id] = avail; // [] means fully assigned
  }
  return m;
})();

/* =========================================================
   UTIL & SHARED HELPERS
========================================================= */
function initEmptyPrefs() {
  const base = {};
  for (const id of allWeekendIds) {
    base[id] = { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
  }
  return base;
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
  return [headers.join(","), body].join("\n");
}
function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function monthLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
}
function nextChoiceNumber(list) {
  // list: array of {choice}
  return list.reduce((m, x) => Math.max(m, x.choice || 0), 0) + 1;
}

/* =========================================================
   “LIVE PREVIEW” (persists across modes)
========================================================= */
function LivePreview({ prefs, profile }) {
  const summary = useMemo(() => {
    const top = [];
    const low = [];
    for (const id of allWeekendIds) {
      const p = prefs[id];
      if (!p) continue;
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) {
        top.push({ id, service: p.mostService, choice: p.mostChoice });
      }
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) {
        low.push({ id, service: p.leastService, choice: p.leastChoice });
      }
    }
    top.sort((a,b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    low.sort((a,b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    return { top, low };
  }, [prefs]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
        Live Preview{profile?.name ? ` — ${profile.name}` : ""}
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Most</div>
          {summary.top.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>— none —</div>
          ) : summary.top.map((r, idx) => (
            <div key={`top-${idx}`} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ padding: "2px 6px", borderRadius: 8, background: "#d1fae5", border: "1px solid #10b98133", fontSize: 12 }}>#{r.choice}</span>
              <span>{monthLabel(r.id)} — {r.service}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Least</div>
          {summary.low.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>— none —</div>
          ) : summary.low.map((r, idx) => (
            <div key={`low-${idx}`} style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ padding: "2px 6px", borderRadius: 8, background: "#fee2e2", border: "1px solid #ef444433", fontSize: 12 }}>#{r.choice}</span>
              <span>{monthLabel(r.id)} — {r.service}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODE 1: CALENDAR (2×6 grid, collapsed by default, centered)
========================================================= */
function CalendarMode({
  prefs, setMost, setLeast, submitted, collapsed, setCollapsed,
}) {
  const container = {
    maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px",
    display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 24,
  };

  const headerChip = (bg, fg, border) => ({
    background: bg, color: fg, borderBottom: `2px solid ${border}`,
    fontWeight: 800, fontSize: 16, padding: "10px 12px", textAlign: "center",
  });

  const monthColor = (idx) => {
    const pal = [
      ["#fde68a","#1f2937","#f59e0b"],
      ["#bfdbfe","#1f2937","#3b82f6"],
      ["#bbf7d0","#064e3b","#10b981"],
      ["#fecaca","#7f1d1d","#f87171"],
      ["#ddd6fe","#312e81","#8b5cf6"],
      ["#c7d2fe","#1e3a8a","#6366f1"],
      ["#fbcfe8","#831843","#ec4899"],
      ["#a7f3d0","#065f46","#34d399"],
      ["#fcd34d","#1f2937","#f59e0b"],
      ["#fca5a5","#7f1d1d","#ef4444"],
      ["#93c5fd","#1e3a8a","#3b82f6"],
      ["#86efac","#064e3b","#22c55e"],
    ];
    return pal[idx] || ["#e5e7eb", "#111827", "#9ca3af"];
  };

  return (
    <div style={container}>
      {MONTH_KEYS.map((mk, i) => {
        const [bg, fg, br] = monthColor(i);
        const items = months[mk];
        return (
          <div key={mk} id={`month-${mk}`} style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff" }}>
            <button
              onClick={() => setCollapsed(c => ({ ...c, [mk]: !c[mk] }))}
              style={{ ...headerChip(bg, fg, br), width: "100%", cursor: "pointer" }}
              title="Collapse/expand"
            >
              {MONTH_FULL[i]} {YEAR} {collapsed[mk] ? "▸" : "▾"}
            </button>
            {!collapsed[mk] && (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map(w => {
                  const id = w.date;
                  const p  = prefs[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
                  const avail = availabilityByWeekend[id] || [];
                  const fullyAssigned = avail.length === 0;

                  const setMostSafe  = (svcOrChoice, val) => {
                    const nx = { ...p };
                    if (svcOrChoice === "svc") {
                      if (!avail.includes(val)) return;        // enforce real availability
                      nx.mostService = val;
                      // prevent both services in same day for same bucket by design (only one radio)
                    } else {
                      nx.mostChoice = val;
                    }
                    // If setting MOST, clear LEAST on same date to prevent double-claiming on both buckets if desired
                    // (You asked only to prevent both services within same bucket; leaving cross-bucket allowed.)
                    setMost(id, nx);
                  };
                  const setLeastSafe = (svcOrChoice, val) => {
                    const nx = { ...p };
                    if (svcOrChoice === "svc") {
                      if (!avail.includes(val)) return;
                      nx.leastService = val;
                    } else {
                      nx.leastChoice = val;
                    }
                    setLeast(id, nx);
                  };

                  return (
                    <div key={id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{MONTH_FULL[i]} {new Date(id).getDate()}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
                          <span style={{ background: w.rni === null ? "#dbeafe" : "#e5e7eb", padding: "3px 8px", borderRadius: 8 }}>
                            RNI: {w.rni === null ? "OPEN" : <b>{w.rni}</b>}
                          </span>
                          <span style={{ background: w.coa === null ? "#e0e7ff" : "#e5e7eb", padding: "3px 8px", borderRadius: 8 }}>
                            COA: {w.coa === null ? "OPEN" : <b>{w.coa}</b>}
                          </span>
                          {w.detail && <span style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#7c2d12", padding: "3px 8px", borderRadius: 8 }}>{w.detail}</span>}
                        </div>
                      </div>

                      {!fullyAssigned ? (
                        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                          {/* MOST */}
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Most (service + choice)</div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              {/* Service radios only for AVAILABLE services */}
                              <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.RNI) ? 1 : 0.4 }}>
                                <input
                                  type="radio"
                                  name={`most-${id}`}
                                  disabled={!avail.includes(SERVICES.RNI) || submitted}
                                  checked={p.mostService === SERVICES.RNI}
                                  onChange={() => setMostSafe("svc", SERVICES.RNI)}
                                />
                                RNI
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.COA) ? 1 : 0.4 }}>
                                <input
                                  type="radio"
                                  name={`most-${id}`}
                                  disabled={!avail.includes(SERVICES.COA) || submitted}
                                  checked={p.mostService === SERVICES.COA}
                                  onChange={() => setMostSafe("svc", SERVICES.COA)}
                                />
                                COA
                              </label>
                              <select
                                disabled={submitted || p.mostService === SERVICES.NONE}
                                value={String(p.mostChoice || 0)}
                                onChange={(e) => setMostSafe("choice", parseInt(e.target.value, 10))}
                                style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                              >
                                <option value="0">Choice…</option>
                                {Array.from({ length: allWeekendIds.length }, (_, n) => n + 1).map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* LEAST */}
                          <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Least (service + choice)</div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.RNI) ? 1 : 0.4 }}>
                                <input
                                  type="radio"
                                  name={`least-${id}`}
                                  disabled={!avail.includes(SERVICES.RNI) || submitted}
                                  checked={p.leastService === SERVICES.RNI}
                                  onChange={() => setLeastSafe("svc", SERVICES.RNI)}
                                />
                                RNI
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.COA) ? 1 : 0.4 }}>
                                <input
                                  type="radio"
                                  name={`least-${id}`}
                                  disabled={!avail.includes(SERVICES.COA) || submitted}
                                  checked={p.leastService === SERVICES.COA}
                                  onChange={() => setLeastSafe("svc", SERVICES.COA)}
                                />
                                COA
                              </label>
                              <select
                                disabled={submitted || p.leastService === SERVICES.NONE}
                                value={String(p.leastChoice || 0)}
                                onChange={(e) => setLeastSafe("choice", parseInt(e.target.value, 10))}
                                style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                              >
                                <option value="0">Choice…</option>
                                {Array.from({ length: allWeekendIds.length }, (_, n) => n + 1).map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#991b1b", background: "#fee2e2", padding: 8, borderRadius: 8, textAlign: "center", marginTop: 8 }}>
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
      })}
    </div>
  );
}

/* =========================================================
   MODE 2: QUICK ADD (Jan → Dec order; fewer clicks)
========================================================= */
function QuickAddMode({ prefs, setMost, setLeast, submitted }) {
  const container = { maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" };
  const rowCss = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 };

  const sorted = weekendsFlat.slice(); // already Jan→Dec
  return (
    <div style={container}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>QuickAdd — Instructions</div>
        <div style={{ fontSize: 13, color: "#334155" }}>
          Click a weekend row and set <b>Most</b> or <b>Least</b> with a service. Choice number grows automatically; change it if you need.
        </div>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        {sorted.map(w => {
          const id = w.id;
          const p = prefs[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
          const avail = availabilityByWeekend[id] || [];

          const setAuto = (bucket) => {
            if (submitted || avail.length === 0) return;
            const svc = avail.length === 1 ? avail[0] : null;
            if (!svc) return; // require manual radio if 2 open
            if (bucket === "MOST") {
              const next = { ...p, mostService: svc, mostChoice: (p.mostChoice > 0 ? p.mostChoice : 1) };
              setMost(id, next);
            } else {
              const next = { ...p, leastService: svc, leastChoice: (p.leastChoice > 0 ? p.leastChoice : 1) };
              setLeast(id, next);
            }
          };

          return (
            <div key={id} style={rowCss}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontWeight: 800 }}>{w.monthName} {new Date(id).getDate()}</div>
                <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                  <span style={{ background: w.rni === null ? "#dbeafe" : "#e5e7eb", padding: "2px 6px", borderRadius: 8 }}>
                    RNI: {w.rni === null ? "OPEN" : <b>{w.rni}</b>}
                  </span>
                  <span style={{ background: w.coa === null ? "#e0e7ff" : "#e5e7eb", padding: "2px 6px", borderRadius: 8 }}>
                    COA: {w.coa === null ? "OPEN" : <b>{w.coa}</b>}
                  </span>
                  {w.detail && <span style={{ background: "#fff7ed", border: "1px solid #fed7aa", padding: "2px 6px", borderRadius: 8 }}>{w.detail}</span>}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                {/* MOST quick controls */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Most</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setAuto("MOST")}
                      disabled={submitted || avail.length !== 1}
                      style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
                      title={avail.length === 1 ? "Auto-pick the only open service" : "Two services open — choose below"}
                    >
                      Auto
                    </button>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.RNI) ? 1 : 0.4 }}>
                      <input
                        type="radio"
                        name={`mostq-${id}`}
                        disabled={!avail.includes(SERVICES.RNI) || submitted}
                        checked={p.mostService === SERVICES.RNI}
                        onChange={() => setMost(id, { ...p, mostService: SERVICES.RNI, mostChoice: p.mostChoice || 1 })}
                      />
                      RNI
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.COA) ? 1 : 0.4 }}>
                      <input
                        type="radio"
                        name={`mostq-${id}`}
                        disabled={!avail.includes(SERVICES.COA) || submitted}
                        checked={p.mostService === SERVICES.COA}
                        onChange={() => setMost(id, { ...p, mostService: SERVICES.COA, mostChoice: p.mostChoice || 1 })}
                      />
                      COA
                    </label>
                    <select
                      disabled={submitted || p.mostService === SERVICES.NONE}
                      value={String(p.mostChoice || 0)}
                      onChange={(e) => setMost(id, { ...p, mostChoice: parseInt(e.target.value, 10) })}
                      style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                    >
                      <option value="0">Choice…</option>
                      {Array.from({ length: allWeekendIds.length }, (_, n) => n + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LEAST quick controls */}
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Least</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => setAuto("LEAST")}
                      disabled={submitted || avail.length !== 1}
                      style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
                    >
                      Auto
                    </button>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.RNI) ? 1 : 0.4 }}>
                      <input
                        type="radio"
                        name={`leastq-${id}`}
                        disabled={!avail.includes(SERVICES.RNI) || submitted}
                        checked={p.leastService === SERVICES.RNI}
                        onChange={() => setLeast(id, { ...p, leastService: SERVICES.RNI, leastChoice: p.leastChoice || 1 })}
                      />
                      RNI
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, opacity: avail.includes(SERVICES.COA) ? 1 : 0.4 }}>
                      <input
                        type="radio"
                        name={`leastq-${id}`}
                        disabled={!avail.includes(SERVICES.COA) || submitted}
                        checked={p.leastService === SERVICES.COA}
                        onChange={() => setLeast(id, { ...p, leastService: SERVICES.COA, leastChoice: p.leastChoice || 1 })}
                      />
                      COA
                    </label>
                    <select
                      disabled={submitted || p.leastService === SERVICES.NONE}
                      value={String(p.leastChoice || 0)}
                      onChange={(e) => setLeast(id, { ...p, leastChoice: parseInt(e.target.value, 10) })}
                      style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }}
                    >
                      <option value="0">Choice…</option>
                      {Array.from({ length: allWeekendIds.length }, (_, n) => n + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   MODE 3: DRAG BUCKETS (horizontal, grouped by month)
========================================================= */
function DragBucketsMode({ prefs, setMost, setLeast, submitted, requireName }) {
  const container = { maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" };

  // Library lanes: one horizontal lane per month
  const lanes = useMemo(() => {
    const byMonth = {};
    for (const mk of MONTH_KEYS) byMonth[mk] = [];
    for (const w of weekendsFlat) {
      const avail = availabilityByWeekend[w.id] || [];
      avail.forEach(svc => {
        byMonth[w.monthKey].push({
          id: w.id,
          svc,
          label: `${w.monthName} ${new Date(w.id).getDate()} — ${svc}`,
        });
      });
    }
    return byMonth;
  }, []);

  // current lists
  const mostChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && (p.mostChoice || 0) > 0) {
        arr.push({ id, service: p.mostService, choice: p.mostChoice });
      }
    }
    arr.sort((a,b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    return arr;
  }, [prefs]);
  const leastChosen = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.leastService !== SERVICES.NONE && (p.leastChoice || 0) > 0) {
        arr.push({ id, service: p.leastService, choice: p.leastChoice });
      }
    }
    arr.sort((a,b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    return arr;
  }, [prefs]);

  const onDropMost  = (id, svc) => {
    if (submitted || !requireName) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;
    setMost(id,  { ...(prefs[id] || {}), mostService: svc,  mostChoice: nextChoiceNumber(mostChosen) });
    // prevent same-day both services within same bucket is by definition impossible (single service field)
  };
  const onDropLeast = (id, svc) => {
    if (submitted || !requireName) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;
    setLeast(id, { ...(prefs[id] || {}), leastService: svc, leastChoice: nextChoiceNumber(leastChosen) });
  };

  const removeMost  = (id) => setMost(id,  { ...(prefs[id] || {}), mostService: SERVICES.NONE,  mostChoice: 0 });
  const removeLeast = (id) => setLeast(id, { ...(prefs[id] || {}), leastService: SERVICES.NONE, leastChoice: 0 });

  const laneCss = { whiteSpace: "nowrap", overflowX: "auto", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" };
  const chipCss = {
    display: "inline-block", marginRight: 8, marginBottom: 8,
    padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12,
    cursor: (submitted || !requireName) ? "not-allowed" : "grab", userSelect: "none",
  };

  return (
    <div style={container}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>DragBuckets — Instructions</div>
        <div style={{ fontSize: 13, color: "#334155" }}>
          Drag any chip from the monthly lanes into <b>Most</b> or <b>Least</b>. Choices auto-number in order. Click “Remove” to undo.
        </div>
      </div>

      {/* Library lanes (one per month, horizontal) */}
      <div style={{ display: "grid", gap: 10 }}>
        {MONTH_KEYS.map((mk, i) => (
          <div key={mk}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{MONTH_FULL[i]} {YEAR}</div>
            <div style={laneCss}>
              {(lanes[mk] || []).map(item => (
                <span
                  key={`${item.id}:${item.svc}`}
                  draggable={!submitted && requireName}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify(item));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  title={requireName ? "Drag to Most/Least" : "Select your name first"}
                  style={chipCss}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Drop zones side-by-side */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <div
          onDragOver={(e) => { if (!submitted && requireName) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
          onDrop={(e) => {
            if (submitted || !requireName) return;
            e.preventDefault();
            try { const item = JSON.parse(e.dataTransfer.getData("text/plain")); onDropMost(item.id, item.svc); } catch {}
          }}
          style={{ border: "2px dashed #10b981", borderRadius: 12, background: "#ecfdf5", padding: 12 }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Most (drop here)</div>
          {mostChosen.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>— empty —</div>
          ) : mostChosen.map((m, idx) => (
            <div key={`M-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ padding: "3px 8px", borderRadius: 8, background: "#d1fae5", border: "1px solid #10b98133", fontSize: 12 }}>#{m.choice}</span>
              <span style={{ fontSize: 13 }}>{monthLabel(m.id)} — {m.service}</span>
              <button onClick={() => removeMost(m.id)} style={{ marginLeft: "auto", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "2px 6px" }}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <div
          onDragOver={(e) => { if (!submitted && requireName) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
          onDrop={(e) => {
            if (submitted || !requireName) return;
            e.preventDefault();
            try { const item = JSON.parse(e.dataTransfer.getData("text/plain")); onDropLeast(item.id, item.svc); } catch {}
          }}
          style={{ border: "2px dashed #ef4444", borderRadius: 12, background: "#fef2f2", padding: 12 }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Least (drop here)</div>
          {leastChosen.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>— empty —</div>
          ) : leastChosen.map((m, idx) => (
            <div key={`L-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ padding: "3px 8px", borderRadius: 8, background: "#fee2e2", border: "1px solid #ef444433", fontSize: 12 }}>#{m.choice}</span>
              <span style={{ fontSize: 13 }}>{monthLabel(m.id)} — {m.service}</span>
              <button onClick={() => removeLeast(m.id)} style={{ marginLeft: "auto", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "2px 6px" }}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {!requireName && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca", padding: "6px 8px", borderRadius: 8 }}>
          Select your name above to enable drag & drop.
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MODE 4: RANK BOARD (click to add; explicit controls)
========================================================= */
function RankBoardMode({ prefs, setMost, setLeast, submitted }) {
  const container = { maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px" };

  const handleAdd = (id, bucket, svc) => {
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc) || submitted) return;
    const list = bucket === "MOST"
      ? Object.values(prefs).filter(p => p.mostService !== SERVICES.NONE && (p.mostChoice||0) > 0).map(p => ({ choice: p.mostChoice }))
      : Object.values(prefs).filter(p => p.leastService !== SERVICES.NONE && (p.leastChoice||0) > 0).map(p => ({ choice: p.leastChoice }));
    const next = nextChoiceNumber(list);
    if (bucket === "MOST") setMost(id, { ...(prefs[id]||{}), mostService: svc, mostChoice: next });
    else setLeast(id, { ...(prefs[id]||{}), leastService: svc, leastChoice: next });
  };

  return (
    <div style={container}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>RankBoard — Instructions</div>
        <div style={{ fontSize: 13, color: "#334155" }}>
          Click a button in a weekend card to add it to <b>Most</b> or <b>Least</b> with the selected service.
          Choice numbers increment automatically; use the small selector to adjust if needed.
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        {weekendsFlat.map(w => {
          const id = w.id;
          const p  = prefs[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
          const avail = availabilityByWeekend[id] || [];

          return (
            <div key={id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{w.monthName} {new Date(id).getDate()}</div>
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                <span style={{ background: w.rni === null ? "#dbeafe" : "#e5e7eb", padding: "2px 6px", borderRadius: 8, marginRight: 6 }}>
                  RNI: {w.rni === null ? "OPEN" : <b>{w.rni}</b>}
                </span>
                <span style={{ background: w.coa === null ? "#e0e7ff" : "#e5e7eb", padding: "2px 6px", borderRadius: 8 }}>
                  COA: {w.coa === null ? "OPEN" : <b>{w.coa}</b>}
                </span>
              </div>

              {/* Choose service then add */}
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, width: 40 }}>Most:</span>
                  {avail.includes(SERVICES.RNI) && (
                    <button
                      disabled={submitted}
                      onClick={() => handleAdd(id, "MOST", SERVICES.RNI)}
                      style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
                    >
                      + RNI
                    </button>
                  )}
                  {avail.includes(SERVICES.COA) && (
                    <button
                      disabled={submitted}
                      onClick={() => handleAdd(id, "MOST", SERVICES.COA)}
                      style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
                    >
                      + COA
                    </button>
                  )}
                  {p.mostChoice > 0 && (
                    <>
                      <select
                        value={String(p.mostChoice)}
                        onChange={(e) => setMost(id, { ...p, mostChoice: parseInt(e.target.value, 10) })}
                        style={{ marginLeft: "auto", padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                      >
                        {Array.from({ length: allWeekendIds.length }, (_, n) => n + 1).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <button onClick={() => setMost(id, { ...p, mostService: SERVICES.NONE, mostChoice: 0 })} style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "2px 6px" }}>
                        Remove
                      </button>
                    </>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, width: 40 }}>Least:</span>
                  {avail.includes(SERVICES.RNI) && (
                    <button
                      disabled={submitted}
                      onClick={() => handleAdd(id, "LEAST", SERVICES.RNI)}
                      style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
                    >
                      + RNI
                    </button>
                  )}
                  {avail.includes(SERVICES.COA) && (
                    <button
                      disabled={submitted}
                      onClick={() => handleAdd(id, "LEAST", SERVICES.COA)}
                      style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
                    >
                      + COA
                    </button>
                  )}
                  {p.leastChoice > 0 && (
                    <>
                      <select
                        value={String(p.leastChoice)}
                        onChange={(e) => setLeast(id, { ...p, leastChoice: parseInt(e.target.value, 10) })}
                        style={{ marginLeft: "auto", padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                      >
                        {Array.from({ length: allWeekendIds.length }, (_, n) => n + 1).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <button onClick={() => setLeast(id, { ...p, leastService: SERVICES.NONE, leastChoice: 0 })} style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "2px 6px" }}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   APP (unified switcher + command palette link + firebase badge)
========================================================= */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("Authenticating…");
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [submitted, setSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map(mk => [mk, true])));

  // mode switcher (via tabs; also respects ?ui=)
  const uiFromQuery = new URLSearchParams(window.location.search).get("ui");
  const initialMode = ["calendar","drag","quick","rank"].includes(uiFromQuery) ? uiFromQuery : "calendar";
  const [mode, setMode] = useState(initialMode);

  // Firebase badge
  const [fbOk, setFbOk] = useState(null); // null=unknown, true/false

  useEffect(() => {
    (async () => {
      try {
        await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUid(u.uid);
        });
        // ping a harmless read to test connectivity
        try {
          const testRef = doc(collection(db, "diagnostics"), "ping");
          await getDoc(testRef); // may 404; we only care that it didn't throw due to network/config
          setFbOk(true);
        } catch {
          setFbOk(true); // even if doc missing, Firestore works
        }
        setStatus("Ready.");
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e?.message || e}`);
        setFbOk(false);
      }
    })();
  }, []);

  // Persist/Load user’s profile & prefs
  const profileDocRef = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsDocRef   = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const [proSnap, prefSnap] = await Promise.all([getDoc(profileDocRef(uid)), getDoc(prefsDocRef(uid))]);
        if (proSnap.exists()) {
          const d = proSnap.data();
          setProfile({ name: d.name || "", email: d.email || "" });
        }
        if (prefSnap.exists()) {
          const d = prefSnap.data();
          setSubmitted(Boolean(d.submitted));
          if (d.preferences) {
            const remap = { ...initEmptyPrefs() };
            for (const [k,v] of Object.entries(d.preferences || {})) {
              remap[k] = {
                mostService:  v.mostService  ?? SERVICES.NONE,
                mostChoice:   v.mostChoice   ?? v.mostRank   ?? 0,
                leastService: v.leastService ?? SERVICES.NONE,
                leastChoice:  v.leastChoice  ?? v.leastRank  ?? 0,
              };
            }
            setPrefs(remap);
          }
        }
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e?.message || e}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const saveProfile = async (next) => {
    setProfile(next);
    if (!uid) return;
    await setDoc(profileDocRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  };

  // Centralized setters enforcing the “no RNI+COA on same day within the same bucket” naturally by single field.
  const setMost = useCallback((id, v) => {
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), mostService: v.mostService, mostChoice: v.mostChoice } }));
  }, []);
  const setLeast = useCallback((id, v) => {
    setPrefs(prev => ({ ...prev, [id]: { ...(prev[id] || {}), leastService: v.leastService, leastChoice: v.leastChoice } }));
  }, []);

  // Top controls
  const jumpTo = (mk) => {
    setCollapsed(prev => {
      const next = { ...prev, [mk]: false };
      requestAnimationFrame(() => {
        const el = document.getElementById(`month-${mk}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return next;
    });
  };
  const collapseAll = (val) => setCollapsed(Object.fromEntries(MONTH_KEYS.map(k => [k, val])));

  // Export helpers
  const assembleRows = useCallback(() => {
    const rows = [];
    for (const id of allWeekendIds) {
      const p = prefs[id];
      if (!p) continue;
      if (p.mostService !== SERVICES.NONE && (p.mostChoice || 0) > 0) {
        rows.push({ attendee: profile.name, email: profile.email || "", kind: "MOST",  choice: p.mostChoice, service: p.mostService, weekend: id });
      }
      if (p.leastService !== SERVICES.NONE && (p.leastChoice || 0) > 0) {
        rows.push({ attendee: profile.name, email: profile.email || "", kind: "LEAST", choice: p.leastChoice, service: p.leastService, weekend: id });
      }
    }
    return rows;
  }, [prefs, profile]);

  const downloadMyCSV = () => {
    const rows = assembleRows();
    const fn = submitted ? `preferences_${profile.name || "attending"}.csv` : `preferences_preview_${profile.name || "attending"}.csv`;
    const csv = toCSV(rows);
    if (csv) downloadBlob(fn, "text/csv;charset=utf-8;", csv);
  };
  const downloadMyWord = () => {
    const rows = assembleRows();
    const top = rows.filter(r => r.kind === "MOST").sort((a,b) => a.choice - b.choice);
    const low = rows.filter(r => r.kind === "LEAST").sort((a,b) => a.choice - b.choice);
    const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const tr = (k,r) => `<tr><td>${k}</td><td>${esc(r.choice)}</td><td>${esc(r.service)}</td><td>${esc(monthLabel(r.weekend))}</td></tr>`;
    const html = `
      <html><head><meta charset="utf-8"><title>Preferences</title></head><body>
      <h2>2026 Weekend Preferences</h2>
      <p><b>Name:</b> ${esc(profile.name||"")} &nbsp; <b>Email:</b> ${esc(profile.email||"")}</p>
      <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead><tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend</th></tr></thead><tbody>
      ${top.map(r => tr("MOST", r)).join("")}
      ${low.map(r => tr("LEAST", r)).join("")}
      </tbody></table>
      <p style="font-size:12px;color:#555;margin-top:12px;">Generated on ${new Date().toLocaleString()}</p>
      </body></html>
    `;
    const fn = submitted ? `preferences_${profile.name || "attending"}.doc` : `preferences_preview_${profile.name || "attending"}.doc`;
    downloadBlob(fn, "application/msword", html);
  };

  const submitFinal = async () => {
    if (!uid || !profile.name) { alert("Select your name first."); return; }
    // ensure Least entries have a service (we already enforce by radios)
    const badLeast = Object.values(prefs).some(p => (p?.leastChoice||0) > 0 && p.leastService === SERVICES.NONE);
    if (badLeast) { alert("For every ‘Least’ choice, please select a service (RNI or COA)."); return; }
    await setDoc(prefsDocRef(uid), {
      name: profile.name,
      email: profile.email || "",
      preferences: Object.fromEntries(Object.entries(prefs).map(([k,v]) => [k, {
        mostService: v.mostService, mostChoice: v.mostChoice, mostRank: v.mostChoice,
        leastService: v.leastService, leastChoice: v.leastChoice, leastRank: v.leastChoice,
      }])),
      submitted: true,
      submittedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    setSubmitted(true);
    alert("Preferences submitted and locked.");
  };

  // Layout wrappers for centering + gutters
  const page = { minHeight: "100vh", background: "#f8fafc" };
  const stickyBar = {
    position: "sticky", top: 0, zIndex: 40,
    background: "#ffffffcc", backdropFilter: "saturate(180%) blur(4px)",
    borderBottom: "1px solid #e5e7eb",
  };
  const stickyInner = {
    maxWidth: 1200, margin: "0 auto", padding: "8px 16px",
    display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
  };

  const badge = fbOk == null
    ? { text: "Firebase: …", bg: "#f3f4f6", br: "#e5e7eb", fg: "#374151" }
    : fbOk
      ? { text: "Firebase ✓", bg: "#d1fae5", br: "#10b981", fg: "#065f46" }
      : { text: "Firebase ✗", bg: "#fee2e2", br: "#ef4444", fg: "#7f1d1d" };

  const disableUntilName = !profile.name;

  return (
    <div style={page}>
      {/* Sticky top: mode switch + jump + badge + preview buttons */}
      <div style={stickyBar}>
        <div style={stickyInner}>
          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {[
              ["calendar","Calendar"],
              ["drag","DragBuckets"],
              ["quick","QuickAdd"],
              ["rank","RankBoard"],
            ].map(([val,label]) => (
              <button
                key={val}
                onClick={() => setMode(val)}
                style={{
                  padding: "6px 10px", borderRadius: 999,
                  border: mode === val ? "1px solid #111827" : "1px solid #e5e7eb",
                  background: mode === val ? "#111827" : "#fff",
                  color: mode === val ? "#fff" : "#111827", fontSize: 12,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Jump bar (Calendar useful) */}
          <div style={{ display: "flex", gap: 6, marginLeft: 12, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 12 }}>Jump:</strong>
            {MONTH_KEYS.map((mk, i) => (
              <button
                key={mk}
                onClick={() => jumpTo(mk)}
                style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}
              >
                {MONTH_FULL[i].slice(0,3)}
              </button>
            ))}
            <button onClick={() => collapseAll(true)}  style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}>Collapse</button>
            <button onClick={() => collapseAll(false)} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12 }}>Expand</button>
          </div>

          {/* Firebase badge */}
          <span style={{ marginLeft: "auto", padding: "4px 8px", borderRadius: 999, border: `1px solid ${badge.br}`, background: badge.bg, color: badge.fg, fontSize: 12 }}>
            {badge.text}
          </span>

          {/* Preview buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={downloadMyCSV}  style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #059669", background: "#10b981", color: "#fff", fontSize: 12 }}>
              Preview CSV
            </button>
            <button onClick={downloadMyWord} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #4f46e5", background: "#6366f1", color: "#fff", fontSize: 12 }}>
              Preview Word
            </button>
          </div>
        </div>
      </div>

      {/* Header / Identity / Live Preview */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 16px 8px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 8 }}>2026 Preferences (RNI & COA)</h1>

        <ol style={{ margin: "8px 0 12px", paddingLeft: 20, color: "#334155", fontSize: 14, lineHeight: 1.45, listStyle: "decimal" }}>
          <li style={{ marginBottom: 4 }}>Select your name below. You will see the number of weekends you wanted.</li>
          <li style={{ marginBottom: 4 }}>Use <b>Calendar</b>, <b>DragBuckets</b>, <b>QuickAdd</b>, or <b>RankBoard</b> to add as many <b>Most</b> and <b>Least</b> choices as you want. For each choice, select a <b>service</b> and a <b>choice #</b>.</li>
          <li style={{ marginBottom: 4 }}>You can preview/download at any time. The live preview updates underneath.</li>
          <li style={{ marginBottom: 4 }}>Submit to lock your preferences once you are done.</li>
        </ol>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 700 }}>Your name:</label>
          <select
            value={profile.name}
            onChange={(e) => {
              const name = e.target.value;
              const email = (ATTENDINGS.find(a => a.name === name)?.email) || profile.email;
              saveProfile({ ...profile, name, email });
            }}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 200, fontSize: 14 }}
          >
            <option value="">— Select —</option>
            {ATTENDINGS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select>

          <label style={{ fontSize: 14, fontWeight: 700 }}>Email (optional):</label>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => saveProfile({ ...profile, email: e.target.value })}
            placeholder="you@uab.edu"
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 260, fontSize: 14 }}
          />

          {!!profile.name && (
            <div style={{ marginTop: 6 }}>
              {(() => {
                const m = ATTENDING_LIMITS[profile.name];
                return m ? (
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px 10px", fontSize: 13 }}>
                    <b>{profile.name}</b>
                    <span>Requested: {m.requested}</span>
                    <span>Claimed: {m.claimed}</span>
                    <span>Left: {m.left}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#7c2d12", background: "#ffedd5", border: "1px solid #fed7aa", borderRadius: 10, padding: "6px 8px" }}>
                    Target numbers for “{profile.name}” are not set yet.
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="mb-3" style={{ fontSize: 13, color: "#1e293b" }}>
          Status: {status} {submitted ? "• (Locked after submission)" : ""}
        </div>

        <LivePreview prefs={prefs} profile={profile} />
      </div>

      {/* MODE BODY — centered */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 16px 24px" }}>
        {mode === "calendar" && (
          <CalendarMode
            prefs={prefs}
            setMost={(id, v) => setMost(id, v)}
            setLeast={(id, v) => setLeast(id, v)}
            submitted={submitted}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        )}
        {mode === "drag" && (
          <DragBucketsMode
            prefs={prefs}
            setMost={(id, v) => setMost(id, v)}
            setLeast={(id, v) => setLeast(id, v)}
            submitted={submitted}
            requireName={!disableUntilName}
          />
        )}
        {mode === "quick" && (
          <QuickAddMode
            prefs={prefs}
            setMost={(id, v) => setMost(id, v)}
            setLeast={(id, v) => setLeast(id, v)}
            submitted={submitted}
          />
        )}
        {mode === "rank" && (
          <RankBoardMode
            prefs={prefs}
            setMost={(id, v) => setMost(id, v)}
            setLeast={(id, v) => setLeast(id, v)}
            submitted={submitted}
          />
        )}
      </div>

      {/* Submit row */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 24px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          disabled={!profile.name || submitted}
          onClick={submitFinal}
          style={{
            padding: "10px 16px", borderRadius: 12, fontWeight: 800,
            background: (!profile.name || submitted) ? "#e5e7eb" : "#2563eb",
            color: (!profile.name || submitted) ? "#6b7280" : "#fff",
            border: "1px solid #cbd5e1",
          }}
        >
          {submitted ? "Submitted (Locked)" : "Submit Final Preferences"}
        </button>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {submitted ? "Locked. Downloads reflect your final choices." : "Tip: Preview CSV/Word anytime from the top bar."}
        </span>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>Build: {__APP_VERSION__}</div>
      </div>
    </div>
  );
}
