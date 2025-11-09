import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./App.css";

/* =========================
   VERSION + FIREBASE WIRING
   ========================= */
const __APP_VERSION__ = "v13.0 - four modes, fix gate, drag horizontal, renumber, centered with bands";

/* Firebase (no Functions; free tier) */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  collectionGroup,
  getDocs,
  query,
} from "firebase/firestore";

/* Fallback config strategy: injected -> window -> local */
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
  if (typeof window !== "undefined" && window.FALLBACK_FIREBASE_CONFIG)
    return window.FALLBACK_FIREBASE_CONFIG;
  return LOCAL_FALLBACK;
})();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* App id */
const appId =
  typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v13.0";

/* =========================
   CONSTANTS & DATA
   ========================= */
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };

const ATTENDINGS = [
  { name: "Ambal", email: "nambalav@uab.edu" },
  { name: "Arora", email: "nitinarora@uabmc.edu" },
  { name: "Bhatia", email: "ksbhatia@uabmc.edu" },
  { name: "Boone", email: "boone@uabmc.edu" },
  { name: "Carlo", email: "wcarlo@uabmc.edu" },
  { name: "Jain", email: "viraljain@uabmc.edu" },
  { name: "Kandasamy", email: "jkandasamy@uabmc.edu" },
  { name: "Kane", email: "akane@uabmc.edu" },
  { name: "Mackay", email: "mackay@uabmc.edu" },
  { name: "Schuyler", email: "aschuyler@uabmc.edu" },
  { name: "Shukla", email: "vshukla@uabmc.edu" },
  { name: "Sims", email: "bsims@uabmc.edu" },
  { name: "Travers", email: "cptravers@uabmc.edu" },
  { name: "Willis", email: "kentwillis@uabmc.edu" },
  { name: "Winter", email: "lwinter@uabmc.edu" },
  { name: "Salas", email: "asalas@uabmc.edu" },
  { name: "Lal", email: "clal@uabmc.edu" },
  { name: "Vivian", email: "vvalcarceluaces@uabmc.edu" },
];

const ATTENDING_LIMITS = {
  Ambal: { requested: 6, claimed: 4, left: 2 },
  Schuyler: { requested: 3, claimed: 2, left: 1 },
  Mackay: { requested: 5, claimed: 1, left: 4 },
  Kane: { requested: 1, claimed: 1, left: 0 },
  Salas: { requested: 3, claimed: 0, left: 3 },
  Sims: { requested: 8, claimed: 4, left: 4 },
  Travers: { requested: 7, claimed: 4, left: 3 },
  Kandasamy: { requested: 10, claimed: 6, left: 4 },
  Willis: { requested: 9, claimed: 4, left: 5 },
  Bhatia: { requested: 6, claimed: 5, left: 1 },
  Winter: { requested: 5, claimed: 3, left: 2 },
  Boone: { requested: 9, claimed: 6, left: 3 },
  Arora: { requested: 9, claimed: 7, left: 2 },
  Jain: { requested: 9, claimed: 1, left: 8 },
  Lal: { requested: 0, claimed: 0, left: 0 },
  Shukla: { requested: 9, claimed: 1, left: 8 },
  Vivian: { requested: 0, claimed: 0, left: 2 },
  Carlo: { requested: 5, claimed: 5, left: 0 },
};

/* Calendar data: each Saturday (some services pre-assigned).
   NOTE: Keep "isTaken" true when both filled to block ranking. */
const months = {
  "01": [
    { day: "10", date: "2026-01-10", rni: null, coa: null },
    { day: "17-19", date: "2026-01-17", rni: null, coa: null, detail: "MLK Day" },
    { day: "24", date: "2026-01-24", rni: null, coa: null },
    { day: "31", date: "2026-01-31", rni: null, coa: null },
  ],
  "02": [
    { day: "7", date: "2026-02-07", rni: "Boone", coa: null },
    { day: "14", date: "2026-02-14", rni: "Boone", coa: null },
    { day: "21", date: "2026-02-21", rni: "Willis", coa: null },
    { day: "28", date: "2026-02-28", rni: "Willis", coa: null },
  ],
  "03": [
    { day: "7", date: "2026-03-07", rni: "Ambal", coa: "Arora", isTaken: true },
    { day: "14", date: "2026-03-14", rni: null, coa: "Winter" },
    { day: "21", date: "2026-03-21", rni: "Ambal", coa: "Arora", isTaken: true },
    { day: "28", date: "2026-03-28", rni: null, coa: "Arora" },
  ],
  "04": [
    { day: "4", date: "2026-04-04", rni: "Sims", coa: null },
    { day: "11", date: "2026-04-11", rni: null, coa: null },
    { day: "18", date: "2026-04-18", rni: "Sims", coa: null },
    { day: "25", date: "2026-04-25", rni: null, coa: null, detail: "PAS Meeting Coverage" },
  ],
  "05": [
    { day: "2", date: "2026-05-02", rni: null, coa: null },
    { day: "9", date: "2026-05-09", rni: "Arora", coa: null },
    { day: "16", date: "2026-05-16", rni: "Arora", coa: null },
    { day: "23-25", date: "2026-05-23", rni: null, coa: null, detail: "Memorial Day" },
    { day: "30", date: "2026-05-30", rni: "Arora", coa: null },
  ],
  "06": [
    { day: "6", date: "2026-06-06", rni: "Schuyler", coa: "Winter", isTaken: true },
    { day: "13", date: "2026-06-13", rni: "Boone", coa: null },
    { day: "19-21", date: "2026-06-19", rni: "Schuyler", coa: "Winter", isTaken: true, detail: "Juneteenth Day" },
    { day: "27", date: "2026-06-27", rni: "Boone", coa: null },
  ],
  "07": [
    { day: "4-6", date: "2026-07-04", rni: "Jain", coa: "Carlo", isTaken: true, detail: "4th of July" },
    { day: "11", date: "2026-07-11", rni: null, coa: "Willis" },
    { day: "18", date: "2026-07-18", rni: null, coa: null },
    { day: "25", date: "2026-07-25", rni: "Shukla", coa: "Willis", isTaken: true },
  ],
  "08": [
    { day: "1", date: "2026-08-01", rni: "Boone", coa: null },
    { day: "8", date: "2026-08-08", rni: "Sims", coa: "Carlo", isTaken: true },
    { day: "15", date: "2026-08-15", rni: "Boone", coa: null },
    { day: "22", date: "2026-08-22", rni: "Sims", coa: null },
    { day: "29", date: "2026-08-29", rni: null, coa: "Carlo" },
  ],
  "09": [
    { day: "5-7", date: "2026-09-05", rni: "Mackay", coa: null, detail: "Labor Day" },
    { day: "12", date: "2026-09-12", rni: null, coa: null },
    { day: "19", date: "2026-09-19", rni: null, coa: null },
    { day: "26", date: "2026-09-26", rni: null, coa: null },
  ],
  "10": [
    { day: "3", date: "2026-10-03", rni: "Kandasamy", coa: "Carlo", isTaken: true },
    { day: "10", date: "2026-10-10", rni: "Travers", coa: "Bhatia", isTaken: true },
    { day: "17", date: "2026-10-17", rni: "Kandasamy", coa: null },
    { day: "24", date: "2026-10-24", rni: "Travers", coa: "Bhatia", isTaken: true },
    { day: "31", date: "2026-10-31", rni: "Kandasamy", coa: "Carlo", isTaken: true },
  ],
  "11": [
    { day: "7", date: "2026-11-07", rni: "Ambal", coa: null },
    { day: "14", date: "2026-11-14", rni: "Bhatia", coa: null },
    { day: "21", date: "2026-11-21", rni: "Ambal", coa: null },
    { day: "26-28", date: "2026-11-26", rni: "Bhatia", coa: null, detail: "Thanksgiving" },
  ],
  "12": [
    { day: "5", date: "2026-12-05", rni: "Travers", coa: "Kandasamy", isTaken: true },
    { day: "12", date: "2026-12-12", rni: null, coa: null },
    { day: "19", date: "2026-12-19", rni: "Travers", coa: "Kandasamy", isTaken: true },
    { day: "24-28", date: "2026-12-24", rni: "Bhatia", coa: "Arora", isTaken: true, detail: "Christmas" },
    { day: "31-Jan 4", date: "2026-12-31", rni: "Kane", coa: "Kandasamy", isTaken: true, detail: "New Year's Eve" },
  ],
};

const MONTH_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const allWeekendIds = Object.values(months).flat().map(w => w.date);

/* Helper: availability map for quick checks */
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

/* =========================
   UTILITIES
   ========================= */
const monthLabelForDate = (iso) => {
  const mm = iso.slice(5,7);
  const dd = iso.slice(8,10).replace(/^0/,'');
  return `${MONTH_FULL[parseInt(mm,10)-1]} ${dd}`;
};

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach(id => {
    base[id] = {
      mostService: SERVICES.NONE,
      mostChoice: 0,
      leastService: SERVICES.NONE,
      leastChoice: 0,
    };
  });
  return base;
}

/* Normalize ranks so they are 1..N contiguous after every mutation */
function normalizeRanks(prefs) {
  const entries = Object.entries(prefs);

  const most = entries
    .filter(([_, p]) => p.mostService !== SERVICES.NONE && p.mostChoice > 0)
    .map(([id, p]) => ({ id, choice: p.mostChoice }));

  const least = entries
    .filter(([_, p]) => p.leastService !== SERVICES.NONE && p.leastChoice > 0)
    .map(([id, p]) => ({ id, choice: p.leastChoice }));

  // sort by (declared choice, then calendar order)
  const orderIdx = (id) => allWeekendIds.indexOf(id);
  most.sort((a,b) => a.choice - b.choice || orderIdx(a.id) - orderIdx(b.id));
  least.sort((a,b) => a.choice - b.choice || orderIdx(a.id) - orderIdx(b.id));

  const next = { ...prefs };

  most.forEach((m, idx) => {
    next[m.id] = { ...next[m.id], mostChoice: idx + 1 };
  });

  least.forEach((l, idx) => {
    next[l.id] = { ...next[l.id], leastChoice: idx + 1 };
  });

  return next;
}

/* Mutations with mutual exclusion & availability enforcement */
function setMostMutation(prev, id, svc, choice) {
  const avail = availabilityByWeekend[id] || [];
  // Only allow valid service
  if (!avail.includes(svc)) svc = SERVICES.NONE;

  const next = { ...prev };
  const cur = next[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };

  // If picking a service for "most", make sure we don't also hold the other service in "least" for same weekend (mutual exclusion).
  if (svc !== SERVICES.NONE && cur.leastService !== SERVICES.NONE) {
    // If leastService equals the *other* slot, keep least, but mutual-exclusion is about "same day both services".
    // The rule we discussed: can't pick both services for the same weekend (regardless Most/Least).
    // So if least has any service, and we're setting most to any service, we allow both as long as they are not both set? You asked to prohibit both services on same day entirely.
    // Enforce: if leastService set, and setting mostService != NONE, we clear leastService/leastChoice.
    cur.leastService = SERVICES.NONE;
    cur.leastChoice = 0;
  }

  cur.mostService = svc;
  cur.mostChoice = svc === SERVICES.NONE ? 0 : (choice || cur.mostChoice || 1);
  next[id] = cur;
  return normalizeRanks(next);
}

function setLeastMutation(prev, id, svc, choice) {
  const avail = availabilityByWeekend[id] || [];
  if (!avail.includes(svc)) svc = SERVICES.NONE;

  const next = { ...prev };
  const cur = next[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };

  // Mutual exclusion with most on same weekend
  if (svc !== SERVICES.NONE && cur.mostService !== SERVICES.NONE) {
    cur.mostService = SERVICES.NONE;
    cur.mostChoice = 0;
  }

  cur.leastService = svc;
  cur.leastChoice = svc === SERVICES.NONE ? 0 : (choice || cur.leastChoice || 1);
  next[id] = cur;
  return normalizeRanks(next);
}

/* Auto-fill single-availability slots (both Most & Least service default) */
function autoFillSingleService(prefs) {
  const next = { ...prefs };
  for (const id of allWeekendIds) {
    const avail = availabilityByWeekend[id] || [];
    if (avail.length === 1) {
      const only = avail[0];
      const cur = next[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
      if (cur.mostService === SERVICES.NONE) cur.mostService = only;
      if (cur.leastService === SERVICES.NONE) cur.leastService = only;
      next[id] = cur;
    }
  }
  return next;
}

/* CSV / Word downloads */
const toCSV = (rows) => {
  const headers = Object.keys(rows[0] || {});
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return [headers.join(","), body].join("\n");
};

function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function docHtml(name, email, top, least) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const row = (kind, r) => `
    <tr>
      <td>${esc(kind)}</td>
      <td>${esc(r.choice)}</td>
      <td>${esc(r.service || "")}</td>
      <td>${esc(monthLabelForDate(r.weekend))}</td>
    </tr>`;
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>Preferences</title></head>
  <body>
    <h2>2026 Weekend Preferences</h2>
    <p><b>Name:</b> ${esc(name || "")} &nbsp; <b>Email:</b> ${esc(email || "")}</p>
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead style="background:#f3f4f6">
        <tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Sat)</th></tr>
      </thead>
      <tbody>
        ${top.map((r) => row("MOST", r)).join("")}
        ${least.map((r) => row("LEAST", r)).join("")}
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
  </body>
  </html>`;
}

/* =========================
   SUBCOMPONENTS
   ========================= */

/* Firebase badge (green when ok, red on error) */
function FirebaseBadge({ ok, msg }) {
  const style = {
    border: "1px solid " + (ok ? "#059669" : "#b91c1c"),
    background: ok ? "#10b981" : "#fca5a5",
    color: "#fff",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
  return <span title={msg} style={style}>{ok ? "Firebase ✓" : "Firebase ✗"}</span>;
}

/* Identity picker + target numbers */
function AttendingIdentity({ profile, saveProfile }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 700 }}>Your name:</label>
      <select
        value={profile.name}
        onChange={(e) =>
          saveProfile({
            ...profile,
            name: e.target.value,
            email:
              ATTENDINGS.find((a) => a.name === e.target.value)?.email ||
              profile.email,
          })
        }
        style={{
          padding: "6px 10px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          minWidth: 220,
          fontSize: 14,
        }}
      >
        <option value="">— Select —</option>
        {ATTENDINGS.map((a) => (
          <option key={a.name} value={a.name}>
            {a.name}
          </option>
        ))}
      </select>

      <label style={{ fontSize: 14, fontWeight: 700, marginLeft: 8 }}>
        Email (optional):
      </label>
      <input
        type="email"
        value={profile.email}
        placeholder="you@uab.edu"
        onChange={(e) => saveProfile({ ...profile, email: e.target.value })}
        style={{
          padding: "6px 10px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          minWidth: 260,
          fontSize: 14,
        }}
      />

      {profile.name && (
        <div style={{ marginTop: 8 }}>
          {(() => {
            const m = ATTENDING_LIMITS[profile.name];
            return m ? (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                  {profile.name}
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  <b>Total weekends requested:</b> {m.requested}
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  <b>Assignments already claimed:</b> {m.claimed}
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  <b>Assignments left to be picked:</b> {m.left}
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "#7c2d12",
                  background: "#ffedd5",
                  border: "1px solid #fed7aa",
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                Target numbers for “{profile.name}” are not set yet.
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* Month card used by Calendar mode */
function MonthCard({
  mk,
  label,
  items,
  prefs,
  onMost,
  onLeast,
  collapsed,
  onToggle,
  locked,
}) {
  const colorPallette = [
    { bg: "#fde68a", fg: "#1f2937", border: "#f59e0b" },
    { bg: "#bfdbfe", fg: "#1f2937", border: "#3b82f6" },
    { bg: "#bbf7d0", fg: "#064e3b", border: "#10b981" },
    { bg: "#fecaca", fg: "#7f1d1d", border: "#f87171" },
    { bg: "#ddd6fe", fg: "#312e81", border: "#8b5cf6" },
    { bg: "#c7d2fe", fg: "#1e3a8a", border: "#6366f1" },
    { bg: "#fbcfe8", fg: "#831843", border: "#ec4899" },
    { bg: "#a7f3d0", fg: "#065f46", border: "#34d399" },
    { bg: "#fcd34d", fg: "#1f2937", border: "#f59e0b" },
    { bg: "#fca5a5", fg: "#7f1d1d", border: "#ef4444" },
    { bg: "#93c5fd", fg: "#1e3a8a", border: "#3b82f6" },
    { bg: "#86efac", fg: "#064e3b", border: "#22c55e" },
  ];
  const idx = parseInt(mk, 10) - 1;
  const color = colorPallette[idx] ?? { bg: "#eeeeee", fg: "#111111", border: "#cccccc" };

  const headStyle = {
    background: color.bg,
    color: color.fg,
    borderBottom: `2px solid ${color.border}`,
  };

  const labelStyle = { fontWeight: 800, marginLeft: 6 };

  const groupBox = { border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 };

  const radioRow = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 };

  const selectStyle = { padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13 };

  const chip = (bg, fg) => ({
    padding: "2px 8px",
    borderRadius: 10,
    background: bg,
    color: fg,
    fontSize: 12,
    border: `1px solid ${fg}22`,
  });

  return (
    <div id={`month-${mk}`} className="card" style={{ scrollMarginTop: 96 }}>
      <div className="card-head" style={headStyle} onClick={onToggle} title="Collapse/expand">
        <span>{label}</span>
        <span style={labelStyle}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {!collapsed && (
        <div className="card-body">
          {items.map((w) => {
            const p = prefs[w.date] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const fullyAssigned = w.isTaken || (!rniOpen && !coaOpen);

            const available = [];
            if (rniOpen) available.push(SERVICES.RNI);
            if (coaOpen) available.push(SERVICES.COA);

            const ddLabel = w.day;

            const labelBox = (
              <div className="row" style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{ddLabel}</div>
                {w.detail && <div className="badge badge-hint">{w.detail}</div>}
              </div>
            );

            const assignment = (
              <div style={{ fontSize: 13, color: "#334155", marginBottom: 8, lineHeight: 1.25 }}>
                <span
                  className="badge"
                  style={{
                    background: rniOpen ? "#dbeafe" : "#e5e7eb",
                    color: rniOpen ? "#1e3a8a" : "#111827",
                    borderRadius: 6,
                    padding: "3px 8px",
                    marginRight: 8,
                  }}
                >
                  RNI: {rniOpen ? "OPEN" : <strong style={{ fontSize: 15 }}>{w.rni}</strong>}
                </span>
                <span
                  className="badge"
                  style={{
                    background: coaOpen ? "#e0e7ff" : "#e5e7eb",
                    color: coaOpen ? "#3730a3" : "#111827",
                    borderRadius: 6,
                    padding: "3px 8px",
                  }}
                >
                  COA: {coaOpen ? "OPEN" : <strong style={{ fontSize: 15 }}>{w.coa}</strong>}
                </span>
              </div>
            );

            return (
              <div key={w.date} className={`weekend ${fullyAssigned ? "assigned" : ""}`}>
                {labelBox}
                {assignment}
                {!fullyAssigned ? (
                  <div style={{ display: "grid", gap: 10, opacity: locked ? 0.6 : 1, pointerEvents: locked ? "none" : "auto" }}>
                    {/* MOST */}
                    <div style={groupBox}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                        Most (service + choice)
                      </div>
                      <div style={radioRow}>
                        {available.includes(SERVICES.RNI) && (
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                            <input
                              type="radio"
                              name={`most-${w.date}`}
                              checked={p.mostService === SERVICES.RNI}
                              onChange={() => onMost(w.date, SERVICES.RNI, p.mostChoice || 1)}
                            />
                            RNI
                          </label>
                        )}
                        {available.includes(SERVICES.COA) && (
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                            <input
                              type="radio"
                              name={`most-${w.date}`}
                              checked={p.mostService === SERVICES.COA}
                              onChange={() => onMost(w.date, SERVICES.COA, p.mostChoice || 1)}
                            />
                            COA
                          </label>
                        )}
                        <select
                          style={selectStyle}
                          disabled={p.mostService === SERVICES.NONE}
                          value={String(p.mostChoice || 0)}
                          onChange={(e) => onMost(w.date, p.mostService, parseInt(e.target.value, 10))}
                        >
                          <option value="0">Most choice…</option>
                          {Array.from({ length: allWeekendIds.length }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        {p.mostService === SERVICES.NONE && p.mostChoice > 0 && (
                          <span className="badge badge-hint">Pick a service for Most</span>
                        )}
                        {p.mostService !== SERVICES.NONE && p.mostChoice > 0 && (
                          <span className="badge badge-ok">Most #{p.mostChoice}</span>
                        )}
                      </div>
                    </div>

                    {/* LEAST */}
                    <div style={groupBox}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                        Least (service + choice)
                      </div>
                      <div style={radioRow}>
                        {available.includes(SERVICES.RNI) && (
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                            <input
                              type="radio"
                              name={`least-${w.date}`}
                              checked={p.leastService === SERVICES.RNI}
                              onChange={() => onLeast(w.date, SERVICES.RNI, p.leastChoice || 1)}
                            />
                            RNI
                          </label>
                        )}
                        {available.includes(SERVICES.COA) && (
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                            <input
                              type="radio"
                              name={`least-${w.date}`}
                              checked={p.leastService === SERVICES.COA}
                              onChange={() => onLeast(w.date, SERVICES.COA, p.leastChoice || 1)}
                            />
                            COA
                          </label>
                        )}
                        <select
                          style={selectStyle}
                          disabled={p.leastService === SERVICES.NONE}
                          value={String(p.leastChoice || 0)}
                          onChange={(e) => onLeast(w.date, p.leastService, parseInt(e.target.value, 10))}
                        >
                          <option value="0">Least choice…</option>
                          {Array.from({ length: allWeekendIds.length }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        {p.leastService === SERVICES.NONE && p.leastChoice > 0 && (
                          <span className="badge badge-hint">Pick a service for Least</span>
                        )}
                        {p.leastService !== SERVICES.NONE && p.leastChoice > 0 && (
                          <span className="badge badge-warn">Least #{p.leastChoice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#991b1b",
                      background: "#fee2e2",
                      padding: 8,
                      borderRadius: 8,
                      textAlign: "center",
                    }}
                  >
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

/* =========================
   MAIN APP
   ========================= */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("Authenticating…");
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [submitted, setSubmitted] = useState(false);

  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(MONTH_KEYS.map((mk) => [mk, true]))
  );

  const [firebaseOK, setFirebaseOK] = useState(false);
  const [firebaseMsg, setFirebaseMsg] = useState("…");

  /* UI switcher */
  const params = new URLSearchParams(window.location.search);
  const initialUI = params.get("ui") || "calendar";
  const [ui, setUI] = useState(initialUI); // 'calendar' | 'quick' | 'rank' | 'drag'
  const isAdmin = params.get("admin") === "1";

  /* Auth */
  useEffect(() => {
    (async () => {
      try {
        const token =
          typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUid(u.uid);
            setStatus("Loading profile & preferences…");
            setFirebaseOK(true);
            setFirebaseMsg("Connected");
          }
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setFirebaseOK(false);
        setFirebaseMsg("Auth error");
      }
    })();
  }, []);

  /* Firestore refs */
  const profileDocRef = (uidX) =>
    doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsDocRef = (uidX) =>
    doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  /* Load persisted profile + prefs */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const [proSnap, prefSnap] = await Promise.all([
          getDoc(profileDocRef(uid)),
          getDoc(prefsDocRef(uid)),
        ]);
        if (proSnap.exists()) {
          const d = proSnap.data();
          setProfile({ name: d.name || "", email: d.email || "" });
        }
        if (prefSnap.exists()) {
          const d = prefSnap.data();
          setSubmitted(Boolean(d.submitted));
          if (d.preferences) {
            const remapped = {};
            for (const [k, v] of Object.entries(d.preferences || {})) {
              remapped[k] = {
                mostService: v.mostService ?? SERVICES.NONE,
                mostChoice: v.mostChoice ?? v.mostRank ?? 0,
                leastService: v.leastService ?? SERVICES.NONE,
                leastChoice: v.leastChoice ?? v.leastRank ?? 0,
              };
            }
            setPrefs((prev) => normalizeRanks({ ...initEmptyPrefs(), ...remapped }));
          } else {
            // legacy top/bottom arrays
            const next = initEmptyPrefs();
            (d.top10 || []).forEach((t) => {
              next[t.weekend] = {
                ...next[t.weekend],
                mostService: t.service || SERVICES.NONE,
                mostChoice: t.choice ?? t.rank ?? 0,
              };
            });
            (d.bottom10 || []).forEach((b) => {
              next[b.weekend] = {
                ...next[b.weekend],
                leastService: b.service || SERVICES.NONE,
                leastChoice: b.choice ?? b.rank ?? 0,
              };
            });
            setPrefs((prev) => normalizeRanks(next));
          }
        }
        setStatus("Ready.");
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
        setFirebaseOK(false);
        setFirebaseMsg("Read error");
      }
    })();
  }, [uid]);

  /* One-time auto-fill single-service weekends */
  const [autoFilledOnce, setAutoFilledOnce] = useState(false);
  useEffect(() => {
    if (autoFilledOnce) return;
    setPrefs((prev) => normalizeRanks(autoFillSingleService(prev)));
    setAutoFilledOnce(true);
  }, [autoFilledOnce]);

  /* Mutators used by all modes */
  const onMost = useCallback((id, svc, choice) => {
    setPrefs((prev) => setMostMutation(prev, id, svc, choice));
  }, []);
  const onLeast = useCallback((id, svc, choice) => {
    setPrefs((prev) => setLeastMutation(prev, id, svc, choice));
  }, []);
  const clearWeekend = useCallback((id) => {
    setPrefs((prev) =>
      normalizeRanks({
        ...prev,
        [id]: {
          mostService: SERVICES.NONE,
          mostChoice: 0,
          leastService: SERVICES.NONE,
          leastChoice: 0,
        },
      })
    );
  }, []);

  /* Name gate: block interaction until name is picked */
  const requireName = Boolean(profile?.name);

  /* Counts + derived arrays (live preview) */
  const { mostRows, leastRows } = useMemo(() => {
    const orderIdx = (id) => allWeekendIds.indexOf(id);
    const m = [];
    const l = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0)
        m.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0)
        l.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
    }
    m.sort((a, b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    l.sort((a, b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    return { mostRows: m, leastRows: l };
  }, [prefs]);

  const counts = useMemo(() => {
    return { mostCount: mostRows.length, leastCount: leastRows.length };
  }, [mostRows, leastRows]);

  /* Submit */
  const handleSubmit = async () => {
    if (!uid || !profile.name) {
      alert("Select your name first.");
      return;
    }
    // Least requires a service where a least choice number is set
    const badLeast = Object.values(prefs).some(
      (p) => p.leastChoice > 0 && p.leastService === SERVICES.NONE
    );
    if (badLeast) {
      alert("For every “Least” choice, please select a service (RNI or COA).");
      return;
    }
    // Persist preferences as map plus flat arrays for easy admin export
    await setDoc(
      prefsDocRef(uid),
      {
        name: profile.name,
        email: profile.email || "",
        preferences: Object.fromEntries(
          Object.entries(prefs).map(([k, v]) => [
            k,
            {
              mostService: v.mostService,
              mostChoice: v.mostChoice,
              mostRank: v.mostChoice,
              leastService: v.leastService,
              leastChoice: v.leastChoice,
              leastRank: v.leastChoice,
            },
          ])
        ),
        top10: mostRows.map((t) => ({
          weekend: t.weekend,
          choice: t.choice,
          rank: t.choice,
          service: t.service,
        })),
        bottom10: leastRows.map((b) => ({
          weekend: b.weekend,
          choice: b.choice,
          rank: b.choice,
          service: b.service,
        })),
        submitted: true,
        submittedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    setSubmitted(true);
    alert("Preferences submitted. Downloads now reflect your final locked choices.");
  };

  /* Downloads */
  const doCSV = () => {
    const rows = [
      ...mostRows.map((t) => ({
        attendee: profile.name,
        email: profile.email || "",
        kind: "MOST",
        choice: t.choice,
        service: t.service,
        weekend: monthLabelForDate(t.weekend),
      })),
      ...leastRows.map((b) => ({
        attendee: profile.name,
        email: profile.email || "",
        kind: "LEAST",
        choice: b.choice,
        service: b.service,
        weekend: monthLabelForDate(b.weekend),
      })),
    ];
    const fn = submitted
      ? `preferences_${profile.name || "attending"}.csv`
      : `preferences_preview_${profile.name || "attending"}.csv`;
    if (rows.length === 0) {
      alert("Nothing to export.");
      return;
    }
    downloadBlob(fn, "text/csv;charset=utf-8;", toCSV(rows));
  };

  const doWord = () => {
    const html = docHtml(profile.name, profile.email, mostRows, leastRows);
    const fn = submitted
      ? `preferences_${profile.name || "attending"}.doc`
      : `preferences_preview_${profile.name || "attending"}.doc`;
    downloadBlob(fn, "application/msword", html);
  };

  /* Jump helpers */
  const jumpTo = (mk) => {
    setCollapsed((prev) => {
      const next = { ...prev, [mk]: false };
      requestAnimationFrame(() => {
        const el = document.getElementById(`month-${mk}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return next;
    });
  };
  const collapseAll = (val) =>
    setCollapsed(Object.fromEntries(MONTH_KEYS.map((k) => [k, val])));

  /* Admin CSV (optional) */
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const loadAdmin = async () => {
    const q = query(collectionGroup(db, "preferences"));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!data || !data.top10 || !data.bottom10) return;
      const attendee = data.name || "(unknown)";
      const em = data.email || "";
      const submittedAt = data.submittedAt?._seconds
        ? new Date(data.submittedAt._seconds * 1000).toISOString()
        : "";
      const pull = (x) => x.choice ?? x.rank;
      data.top10.forEach((t) =>
        rows.push({
          attendee,
          email: em,
          kind: "MOST",
          choice: pull(t),
          service: t.service,
          weekend: t.weekend,
          submittedAt,
        })
      );
      data.bottom10.forEach((b) =>
        rows.push({
          attendee,
          email: em,
          kind: "LEAST",
          choice: pull(b),
          service: b.service || "",
          weekend: b.weekend,
          submittedAt,
        })
      );
    });
    rows.sort(
      (a, b) =>
        (a.attendee || "").localeCompare(b.attendee || "") ||
        a.kind.localeCompare(b.kind) ||
        a.choice - b.choice
    );
    setAdminRows(rows);
    setAdminLoaded(true);
  };
  useEffect(() => {
    if (isAdmin && uid && !adminLoaded) {
      loadAdmin().catch(console.error);
    }
  }, [isAdmin, uid, adminLoaded]);

  /* ======== MODE: CALENDAR ======== */
  const CalendarMode = (
    <div className="container">
      <div className="info">
        Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when
        possible. This is a <b>ranking</b> process; selecting more weekends increases the
        chance you receive more of your preferred weekends overall.
      </div>

      <div className="status">
        Status: {status} • Most choices: {counts.mostCount} • Least choices: {counts.leastCount}{" "}
        {submitted ? "• (Locked after submission)" : ""}
      </div>

      <AttendingIdentity
        profile={profile}
        saveProfile={async (next) => {
          setProfile(next);
          if (!uid) return;
          await setDoc(
            profileDocRef(uid),
            { ...next, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }}
      />

      <div className="main-flex">
        {/* Left: calendar grid */}
        <div className="month-grid" aria-disabled={!requireName}>
          {!requireName && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: 12,
                border: "1px solid #fecaca",
                background: "#fee2e2",
                color: "#7f1d1d",
                borderRadius: 12,
                fontWeight: 800,
              }}
            >
              Select your name above to begin.
            </div>
          )}
          {MONTH_KEYS.map((mk, i) => (
            <MonthCard
              key={mk}
              mk={mk}
              label={`${MONTH_FULL[i]} ${YEAR}`}
              items={months[mk]}
              prefs={prefs}
              onMost={(id, svc, choice) =>
                requireName ? onMost(id, svc, choice) : null
              }
              onLeast={(id, svc, choice) =>
                requireName ? onLeast(id, svc, choice) : null
              }
              collapsed={collapsed[mk]}
              onToggle={() =>
                setCollapsed((c) => ({ ...c, [mk]: !c[mk] }))
              }
              locked={submitted || !requireName}
            />
          ))}
        </div>

        {/* Right: live preview */}
        <aside className="sidebar">
          <h3>Live Preview</h3>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Most ({counts.mostCount})
          </div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {mostRows.map((r) => (
              <div key={`m-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button
                    className="btn"
                    style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {mostRows.length === 0 && (
              <div className="mono" style={{ color: "#6b7280" }}>
                (none)
              </div>
            )}
          </div>

          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Least ({counts.leastCount})
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {leastRows.map((r) => (
              <div key={`l-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button
                    className="btn"
                    style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {leastRows.length === 0 && (
              <div className="mono" style={{ color: "#6b7280" }}>
                (none)
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );

  /* ======== MODE: QUICKADD ======== */
  const QuickAdd = (
    <div className="container">
      <div className="info">
        QuickAdd: Choose Month → Saturday, select service and a choice number. List starts from <b>January</b>.
      </div>
      {!requireName && (
        <div
          style={{
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fee2e2",
            color: "#7f1d1d",
            borderRadius: 12,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          Select your name above to begin.
        </div>
      )}

      <div className="main-flex">
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12 }}>
          {MONTH_KEYS.map((mk, i) => (
            <div key={mk} style={{ marginBottom: 10 }}>
              <div className="bold" style={{ marginBottom: 6 }}>
                {MONTH_FULL[i]}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {months[mk].map((w) => {
                  const avail = availabilityByWeekend[w.date] || [];
                  if (w.isTaken || avail.length === 0) {
                    return (
                      <span key={w.date} className="pill" style={{ opacity: 0.5, cursor: "default" }}>
                        {w.day} · FULL
                      </span>
                    );
                  }
                  return (
                    <div key={w.date} className="pill" style={{ background: "#fff" }}>
                      <span style={{ marginRight: 6 }}>{w.day}</span>
                      {avail.map((svc) => (
                        <button
                          key={svc}
                          className="btn"
                          disabled={!requireName || submitted}
                          onClick={() => onMost(w.date, svc, 999)} /* put large -> normalizeRanks will compact */
                          style={{ padding: "2px 6px", fontSize: 12 }}
                          title="Add to Most (fast)"
                        >
                          {svc} → Most
                        </button>
                      ))}
                      {avail.map((svc) => (
                        <button
                          key={`${svc}-least`}
                          className="btn"
                          disabled={!requireName || submitted}
                          onClick={() => onLeast(w.date, svc, 999)}
                          style={{ padding: "2px 6px", fontSize: 12, marginLeft: 4 }}
                          title="Add to Least (fast)"
                        >
                          {svc} → Least
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar live preview */}
        <aside className="sidebar">
          <h3>Live Preview</h3>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Most ({counts.mostCount})
          </div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {mostRows.map((r) => (
              <div key={`m2-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}>Remove</button>
                )}
              </div>
            ))}
            {mostRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(none)</div>}
          </div>

          <div style={{ fontSize: 13, marginBottom: 8 }}>Least ({counts.leastCount})</div>
          <div style={{ display: "grid", gap: 6 }}>
            {leastRows.map((r) => (
              <div key={`l2-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}>Remove</button>
                )}
              </div>
            ))}
            {leastRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(none)</div>}
          </div>
        </aside>
      </div>
    </div>
  );

  /* ======== MODE: RANKBOARD ======== */
  const RankBoard = (
    <div className="container">
      <div className="info">
        RankBoard: Click an available weekend chip to add to <b>Most</b>. Hold <b>Shift</b> while clicking to add to <b>Least</b>.
        Click an entry in the preview to remove. Ranks renumber automatically.
      </div>
      {!requireName && (
        <div
          style={{
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fee2e2",
            color: "#7f1d1d",
            borderRadius: 12,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          Select your name above to begin.
        </div>
      )}

      <div className="main-flex">
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff", padding: 12 }}>
          {MONTH_KEYS.map((mk, i) => (
            <div key={mk} style={{ marginBottom: 10 }}>
              <div className="bold" style={{ marginBottom: 6 }}>
                {MONTH_FULL[i]}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {months[mk].map((w) => {
                  const avail = availabilityByWeekend[w.date] || [];
                  const disabled = !requireName || submitted || w.isTaken || avail.length === 0;
                  const chipStyle = {
                    border: "1px solid #e5e7eb",
                    background: disabled ? "#f3f4f6" : "#fff",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 12,
                    cursor: disabled ? "not-allowed" : "pointer",
                  };
                  return (
                    <span
                      key={w.date}
                      className="pill"
                      style={chipStyle}
                      title={disabled ? "Unavailable" : "Click = Most, Shift+Click = Least"}
                      onClick={(e) => {
                        if (disabled) return;
                        const svc = avail[0] || SERVICES.NONE; // if both open, default RNI; smarter pick:
                        const finalSvc = avail.includes(SERVICES.RNI) ? SERVICES.RNI : SERVICES.COA;
                        if (e.shiftKey) onLeast(w.date, finalSvc, 999);
                        else onMost(w.date, finalSvc, 999);
                      }}
                    >
                      {w.day}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar live preview */}
        <aside className="sidebar">
          <h3>Live Preview</h3>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Most ({counts.mostCount})
          </div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {mostRows.map((r) => (
              <div key={`m3-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}>Remove</button>
                )}
              </div>
            ))}
            {mostRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(none)</div>}
          </div>

          <div style={{ fontSize: 13, marginBottom: 8 }}>Least ({counts.leastCount})</div>
          <div style={{ display: "grid", gap: 6 }}>
            {leastRows.map((r) => (
              <div key={`l3-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}>Remove</button>
                )}
              </div>
            ))}
            {leastRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(none)</div>}
          </div>
        </aside>
      </div>
    </div>
  );

  /* ======== MODE: DRAGBUCKETS ======== */
  // HTML5 DnD helpers
  const dragPayloadRef = useRef(null);

  const onDragStart = (payload) => (e) => {
    dragPayloadRef.current = payload; // { id, svc, kind? }
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDropMost = () => {
    const p = dragPayloadRef.current;
    if (!p || !requireName || submitted) return;
    onMost(p.id, p.svc, 999);
  };
  const onDropLeast = () => {
    const p = dragPayloadRef.current;
    if (!p || !requireName || submitted) return;
    onLeast(p.id, p.svc, 999);
  };

  const DragBuckets = (
    <div className="container">
      <div className="info">
        DragBuckets: Drag a weekend (with its valid service) from the horizontal pool into <b>Most</b> or <b>Least</b>. Most/Least start empty. Ranks renumber automatically.
      </div>
      {!requireName && (
        <div
          style={{
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fee2e2",
            color: "#7f1d1d",
            borderRadius: 12,
            fontWeight: 800,
            marginBottom: 10,
          }}
        >
          Select your name above to begin.
        </div>
      )}

      <div className="main-flex">
        <div className="dock" aria-disabled={!requireName}>
          {/* SOURCE POOL (grouped by month, horizontal strip) */}
          <div className="pool">
            <div className="pool-strip">
              {MONTH_KEYS.map((mk, i) => (
                <div className="month-block" key={`pool-${mk}`}>
                  <h4>{MONTH_FULL[i]}</h4>
                  <div className="block-list">
                    {months[mk].map((w) => {
                      const avail = availabilityByWeekend[w.date] || [];
                      if (w.isTaken || avail.length === 0) return null;
                      return avail.map((svc) => (
                        <div
                          key={`${w.date}-${svc}`}
                          className="draggable"
                          draggable={!submitted && requireName}
                          onDragStart={onDragStart({ id: w.date, svc })}
                          title={`${monthLabelForDate(w.date)} · ${svc}`}
                        >
                          {monthLabelForDate(w.date)} · <b>{svc}</b>
                        </div>
                      ));
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MOST BUCKET */}
          <div className="bucket" onDragOver={onDragOver} onDrop={onDropMost}>
            <div className="bucket-title">Most ({counts.mostCount})</div>
            <div style={{ display: "grid", gap: 6 }}>
              {mostRows.map((r) => (
                <div key={`drag-m-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                  <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                  {!submitted && (
                    <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                      onClick={() => clearWeekend(r.weekend)}>Remove</button>
                  )}
                </div>
              ))}
              {mostRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(drop here)</div>}
            </div>
          </div>

          {/* LEAST BUCKET */}
          <div className="bucket" onDragOver={onDragOver} onDrop={onDropLeast}>
            <div className="bucket-title">Least ({counts.leastCount})</div>
            <div style={{ display: "grid", gap: 6 }}>
              {leastRows.map((r) => (
                <div key={`drag-l-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                  <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                  {!submitted && (
                    <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                      onClick={() => clearWeekend(r.weekend)}>Remove</button>
                  )}
                </div>
              ))}
              {leastRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(drop here)</div>}
            </div>
          </div>
        </div>

        {/* Sidebar live preview */}
        <aside className="sidebar">
          <h3>Live Preview</h3>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Most ({counts.mostCount})
          </div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {mostRows.map((r) => (
              <div key={`m4-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}>Remove</button>
                )}
              </div>
            ))}
            {mostRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(none)</div>}
          </div>

          <div style={{ fontSize: 13, marginBottom: 8 }}>Least ({counts.leastCount})</div>
          <div style={{ display: "grid", gap: 6 }}>
            {leastRows.map((r) => (
              <div key={`l4-${r.weekend}`} className="draggable" style={{ cursor: "default" }}>
                <b>#{r.choice}</b> · {r.service} · {monthLabelForDate(r.weekend)}
                {!submitted && (
                  <button className="btn" style={{ marginLeft: 8, padding: "2px 6px", fontSize: 12 }}
                    onClick={() => clearWeekend(r.weekend)}>Remove</button>
                )}
              </div>
            ))}
            {leastRows.length === 0 && <div className="mono" style={{ color: "#6b7280" }}>(none)</div>}
          </div>
        </aside>
      </div>
    </div>
  );

  /* ======== COMMAND PALETTE (always available in top bar) ======== */
  const cmdRef = useRef(null);
  const handleCommand = () => {
    const raw = (cmdRef.current?.value || "").trim();
    if (!raw) return;
    // Format: "Jun 3 RNI M 1" or "January 10 COA L 2"
    // Parse month (short/long), day, service (RNI/COA), M/L, choice#
    const tokens = raw.split(/\s+/);
    const monthTok = tokens[0];
    const dayTok = tokens[1];
    const svcTok = (tokens[2] || "").toUpperCase();
    const kindTok = (tokens[3] || "").toUpperCase(); // M or L
    const choiceTok = parseInt(tokens[4] || "999", 10);

    const mIndex =
      MONTH_FULL.findIndex(
        (m) =>
          m.toLowerCase().startsWith(monthTok.toLowerCase()) ||
          m.toLowerCase() === monthTok.toLowerCase()
      ) + 1;
    if (mIndex <= 0) {
      alert("Month not recognized.");
      return;
    }
    const mm = String(mIndex).padStart(2, "0");
    // find matching Saturday record in that month by day string inclusion
    const sel = (months[mm] || []).find((w) =>
      w.day.replace(/[^0-9]/g, "") === String(parseInt(dayTok, 10))
    );
    if (!sel) {
      alert("Day not found in that month.");
      return;
    }
    if (!requireName || submitted) {
      alert("Pick your name first or you already submitted.");
      return;
    }
    const svc = svcTok === "RNI" ? SERVICES.RNI : svcTok === "COA" ? SERVICES.COA : SERVICES.NONE;
    if (!availabilityByWeekend[sel.date]?.includes(svc)) {
      alert("That service isn’t available for this weekend.");
      return;
    }
    if (kindTok === "M") onMost(sel.date, svc, isNaN(choiceTok) ? 999 : choiceTok);
    else if (kindTok === "L") onLeast(sel.date, svc, isNaN(choiceTok) ? 999 : choiceTok);
    else alert("Specify M or L for Most/Least.");
    cmdRef.current.value = "";
  };

  /* ======== RENDER ======== */
  return (
    <div className="page">
      <div className="band" />
      <div className="main">
        {/* Sticky top bar (one line) */}
        <div className="topbar">
          <div className="topbar-inner">
            {/* Mode links */}
            <button className="btn" onClick={() => setUI("calendar")}>Calendar</button>
            <button className="btn" onClick={() => setUI("quick")}>QuickAdd</button>
            <button className="btn" onClick={() => setUI("rank")}>RankBoard</button>
            <button className="btn" onClick={() => setUI("drag")}>DragBuckets</button>

            {/* Month jumps (Calendar only) */}
            {ui === "calendar" && (
              <div className="jump-row">
                <span className="bold" style={{ marginRight: 4 }}>Jump:</span>
                {MONTH_KEYS.map((mk, i) => (
                  <button key={mk} className="pill" onClick={() => jumpTo(mk)}>
                    {MONTH_FULL[i].slice(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {/* spacer */}
            <div style={{ flex: 1 }} />

            {/* Command palette */}
            <input
              ref={cmdRef}
              className="mono"
              placeholder='Command (e.g., "Jun 3 RNI M 1")'
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "6px 10px",
                fontSize: 13,
                minWidth: 260,
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCommand()}
            />
            <button className="btn" onClick={handleCommand}>Add</button>

            {/* Downloads + Submit (single row) */}
            <button className="btn success" onClick={doCSV}>Preview/My CSV</button>
            <button className="btn info" onClick={doWord}>Preview/My Word</button>
            <button
              className="btn primary"
              onClick={handleSubmit}
              disabled={!requireName || submitted}
              title={submitted ? "Already submitted (locked)" : "Submit final preferences"}
            >
              {submitted ? "Submitted (Locked)" : "Submit Preferences"}
            </button>

            {/* Firebase badge */}
            <FirebaseBadge ok={firebaseOK} msg={firebaseMsg} />
          </div>
        </div>

        {/* Mode-specific instructions are inside each mode container */}
        {ui === "calendar" && CalendarMode}
        {ui === "quick" && QuickAdd}
        {ui === "rank" && RankBoard}
        {ui === "drag" && DragBuckets}

        {/* Build label */}
        <div className="container" style={{ textAlign: "right", color: "#64748b", fontSize: 12 }}>
          Build: {__APP_VERSION__}
        </div>
      </div>
      <div className="band" />
    </div>
  );
}
