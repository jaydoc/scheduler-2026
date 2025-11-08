import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

/* ------------------------------------------------------------
   Build tag
------------------------------------------------------------- */
const __APP_VERSION__ = "v13.0 – 4 UIs + centered + persistence + Drag fix";
console.log("Scheduler build:", __APP_VERSION__);

/* ------------------------------------------------------------
   Firebase config (safe fallbacks so builds never crash)
------------------------------------------------------------- */
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

const appId =
  typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v13.0";
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ------------------------------------------------------------
   Attendings
------------------------------------------------------------- */
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

/* ------------------------------------------------------------
   Calendar Data (Saturdays → show Sat–Sun)
------------------------------------------------------------- */
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
    {
      day: "19-21",
      date: "2026-06-19",
      rni: "Schuyler",
      coa: "Winter",
      isTaken: true,
      detail: "Juneteenth Day",
    },
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
    {
      day: "24-28",
      date: "2026-12-24",
      rni: "Bhatia",
      coa: "Arora",
      isTaken: true,
      detail: "Christmas",
    },
    {
      day: "31-Jan 4",
      date: "2026-12-31",
      rni: "Kane",
      coa: "Kandasamy",
      isTaken: true,
      detail: "New Year's Eve",
    },
  ],
};

const MONTH_KEYS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const monthsFlat = MONTH_KEYS.flatMap((mk) =>
  (months[mk] || []).map((w) => ({
    id: w.date,
    satISO: w.date,
    monthKey: mk,
    label: `${MONTH_FULL[parseInt(mk, 10) - 1]} ${new Date(w.date).getDate()}`,
    rni: w.rni,
    coa: w.coa,
  }))
);

const allWeekendIds = monthsFlat.map((x) => x.id);

/* ------------------------------------------------------------
   Availability by weekend (what services are still open)
------------------------------------------------------------- */
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

/* ------------------------------------------------------------
   Helpers
------------------------------------------------------------- */
const styleChip = (bg, fg, border) => ({
  padding: "2px 8px",
  borderRadius: 10,
  background: bg,
  color: fg,
  fontSize: 12,
  border: `1px solid ${border || fg}22`,
});

function initEmptyPrefs() {
  const base = {};
  allWeekendIds.forEach((id) => {
    base[id] = {
      mostService: SERVICES.NONE,
      mostChoice: 0,
      leastService: SERVICES.NONE,
      leastChoice: 0,
    };
  });
  return base;
}

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows
    .map((r) => headers.map((h) => esc(r[h])).join(","))
    .join("\n");
  return [headers.join(","), body].join("\n");
}
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
function downloadCSV(filename, rows) {
  if (!rows.length) {
    alert("Nothing to export.");
    return;
  }
  downloadBlob(filename, "text/csv;charset=utf-8;", toCSV(rows));
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
      <td>${esc(r.weekend)}</td>
    </tr>`;
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"><title>Preferences</title></head>
  <body>
    <h2>2026 Weekend Preferences</h2>
    <p><b>Name:</b> ${esc(name || "")} &nbsp; <b>Email:</b> ${esc(
    email || ""
  )}</p>
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
      <thead style="background:#f3f4f6">
        <tr><th>Kind</th><th>Choice #</th><th>Service</th><th>Weekend (Sat date)</th></tr>
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

/* ------------------------------------------------------------
   Formatting
------------------------------------------------------------- */
function prettyDate(id) {
  const d = new Date(id);
  return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
}

/* ------------------------------------------------------------
   Live Preview (always reflects prefs)
------------------------------------------------------------- */
function LivePreview({ profile, prefs }) {
  const { most, least } = useMemo(() => {
    const most = [];
    const least = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0)
        most.push({ id, choice: p.mostChoice, svc: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0)
        least.push({ id, choice: p.leastChoice, svc: p.leastService });
    }
    most.sort((a, b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    least.sort((a, b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    return { most, least };
  }, [prefs]);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          padding: 10,
          borderBottom: "1px solid #e5e7eb",
          fontWeight: 800,
        }}
      >
        Your live selections
      </div>
      <div style={{ padding: 10, fontSize: 13 }}>
        <div style={{ color: "#64748b", marginBottom: 6 }}>
          {profile?.name || "—"} • {most.length + least.length} items
        </div>

        {least.map((x) => (
          <div key={`L-${x.id}`} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={styleChip("#fee2e2", "#9f1239", "#ef4444")}>LEAST</span>
            <span style={styleChip("#fff", "#111827", "#cbd5e1")}>#{x.choice}</span>
            <span>
              {prettyDate(x.id)} — {x.svc}
            </span>
          </div>
        ))}
        {most.map((x) => (
          <div key={`M-${x.id}`} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={styleChip("#dcfce7", "#065f46", "#10b981")}>MOST</span>
            <span style={styleChip("#fff", "#111827", "#cbd5e1")}>#{x.choice}</span>
            <span>
              {prettyDate(x.id)} — {x.svc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Calendar Month Card (collapsed by default)
------------------------------------------------------------- */
function MonthCard({
  mk,
  label,
  items,
  prefs,
  onMostChange,
  onLeastChange,
  collapsed,
  onToggle,
  locked,
}) {
  const idx = parseInt(mk, 10) - 1;
  const headerColors = [
    "#fde68a",
    "#bfdbfe",
    "#bbf7d0",
    "#fecaca",
    "#ddd6fe",
    "#c7d2fe",
    "#fbcfe8",
    "#a7f3d0",
    "#fcd34d",
    "#fca5a5",
    "#93c5fd",
    "#86efac",
  ];
  const headerBg = headerColors[idx] || "#e5e7eb";

  const controlShell = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 8,
    background: "#fff",
  };

  const radio = (name, checked, set) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={set}
        disabled={locked}
      />
      {name.endsWith("RNI") ? "RNI" : "COA"}
    </label>
  );

  return (
    <div
      id={`month-${mk}`}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        scrollMarginTop: 96,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          background: headerBg,
          fontWeight: 800,
          fontSize: 16,
          padding: "12px 14px",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
        title="Collapse/expand"
      >
        <span>{label}</span>
        <span style={{ fontWeight: 900, marginLeft: 6 }}>
          {collapsed ? "▸" : "▾"}
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((w) => {
            const p = prefs[w.date] || {
              mostService: SERVICES.NONE,
              mostChoice: 0,
              leastService: SERVICES.NONE,
              leastChoice: 0,
            };
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const available = [];
            if (rniOpen) available.push(SERVICES.RNI);
            if (coaOpen) available.push(SERVICES.COA);
            const fullyAssigned = available.length === 0;

            const enforceMost = (svc, choice) => {
              // Clear opposite bucket same day and enforce “only one service” per bucket
              onLeastChange(w.date, { ...p, leastService: p.leastService, leastChoice: p.leastChoice });
              onMostChange(w.date, { ...p, mostService: svc, mostChoice: choice });
            };
            const enforceLeast = (svc, choice) => {
              onMostChange(w.date, { ...p, mostService: p.mostService, mostChoice: p.mostChoice });
              onLeastChange(w.date, { ...p, leastService: svc, leastChoice: choice });
            };

            return (
              <div
                key={w.date}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: fullyAssigned ? "#f9fafb" : "#fff",
                  opacity: fullyAssigned ? 0.8 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    {w.day}
                  </div>
                  {w.detail && (
                    <div style={styleChip("#fff7ed", "#c2410c")}>{w.detail}</div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "#334155",
                    marginBottom: 8,
                    lineHeight: 1.25,
                  }}
                >
                  <span
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

                {!fullyAssigned ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {/* MOST */}
                    <div style={controlShell}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                        Most (service + choice)
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                        {/* radios – only for available services */}
                        {available.includes(SERVICES.RNI) &&
                          radio(
                            `most-${w.date}-RNI`,
                            p.mostService === SERVICES.RNI,
                            () => enforceMost(SERVICES.RNI, p.mostChoice)
                          )}
                        {available.includes(SERVICES.COA) &&
                          radio(
                            `most-${w.date}-COA`,
                            p.mostService === SERVICES.COA,
                            () => enforceMost(SERVICES.COA, p.mostChoice)
                          )}

                        <select
                          disabled={
                            locked || p.mostService === SERVICES.NONE || available.length === 0
                          }
                          value={String(p.mostChoice || 0)}
                          onChange={(e) => enforceMost(p.mostService, parseInt(e.target.value, 10))}
                          style={{
                            padding: "5px 10px",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                            fontSize: 13,
                          }}
                        >
                          <option value="0">Choice #</option>
                          {Array.from({ length: allWeekendIds.length }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            )
                          )}
                        </select>
                        {p.mostService !== SERVICES.NONE && p.mostChoice > 0 && (
                          <span style={styleChip("#dcfce7", "#065f46", "#10b981")}>
                            Most #{p.mostChoice}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* LEAST */}
                    <div style={controlShell}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                        Least (service + choice)
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                        {available.includes(SERVICES.RNI) &&
                          radio(
                            `least-${w.date}-RNI`,
                            p.leastService === SERVICES.RNI,
                            () => enforceLeast(SERVICES.RNI, p.leastChoice)
                          )}
                        {available.includes(SERVICES.COA) &&
                          radio(
                            `least-${w.date}-COA`,
                            p.leastService === SERVICES.COA,
                            () => enforceLeast(SERVICES.COA, p.leastChoice)
                          )}
                        <select
                          disabled={
                            locked || p.leastService === SERVICES.NONE || available.length === 0
                          }
                          value={String(p.leastChoice || 0)}
                          onChange={(e) =>
                            enforceLeast(p.leastService, parseInt(e.target.value, 10))
                          }
                          style={{
                            padding: "5px 10px",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                            fontSize: 13,
                          }}
                        >
                          <option value="0">Choice #</option>
                          {Array.from({ length: allWeekendIds.length }, (_, i) => i + 1).map(
                            (n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            )
                          )}
                        </select>
                        {p.leastService !== SERVICES.NONE && p.leastChoice > 0 && (
                          <span style={styleChip("#fee2e2", "#9f1239", "#ef4444")}>
                            Least #{p.leastChoice}
                          </span>
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

/* ------------------------------------------------------------
   2×6 Grid Calendar UI
------------------------------------------------------------- */
function CalendarGrid({
  prefs,
  setMost,
  setLeast,
  collapsed,
  setCollapsed,
  submitted,
}) {
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

  return (
    <>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 12px 24px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(420px, 1fr))",
          gap: "32px",
          alignItems: "stretch",
          justifyItems: "stretch",
        }}
      >
        {MONTH_KEYS.map((mk, i) => (
          <MonthCard
            key={mk}
            mk={mk}
            label={`${MONTH_FULL[i]} ${YEAR}`}
            items={months[mk]}
            prefs={prefs}
            onMostChange={(id, v) =>
              setMost(id, { ...v, mostService: v.mostService, mostChoice: v.mostChoice })
            }
            onLeastChange={(id, v) =>
              setLeast(id, { ...v, leastService: v.leastService, leastChoice: v.leastChoice })
            }
            collapsed={collapsed[mk]}
            onToggle={() => setCollapsed((c) => ({ ...c, [mk]: !c[mk] }))}
            locked={submitted}
          />
        ))}
      </div>

      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 12px 24px",
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {MONTH_KEYS.map((mk, i) => (
          <button
            key={mk}
            onClick={() => jumpTo(mk)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {MONTH_FULL[i]}
          </button>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------
   DragBuckets UI (fixed)
------------------------------------------------------------- */
function DragBuckets({
  prefs,
  setMost,
  setLeast,
  submitted,
  requireName,
}) {
  const [dragPayload, setDragPayload] = useState(null);

  // “Library” – one chip per AVAILABLE service per weekend, laid out in a compact grid
  const libraryItems = useMemo(
    () =>
      monthsFlat.flatMap(({ id, label }) => {
        const avail = availabilityByWeekend[id] || [];
        return avail.map((svc) => ({
          key: `${id}:${svc}`,
          id,
          service: svc,
          label: `${label} — ${svc}`,
        }));
      }),
    []
  );

  const chosenMost = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0)
        arr.push({ id, service: p.mostService, choice: p.mostChoice });
    }
    arr.sort((a, b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    return arr;
  }, [prefs]);

  const chosenLeast = useMemo(() => {
    const arr = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0)
        arr.push({ id, service: p.leastService, choice: p.leastChoice });
    }
    arr.sort((a, b) => a.choice - b.choice || allWeekendIds.indexOf(a.id) - allWeekendIds.indexOf(b.id));
    return arr;
  }, [prefs]);

  const nextChoice = (list) => list.reduce((m, x) => Math.max(m, x.choice || 0), 0) + 1;

  const onDragStart = (payload) => (e) => {
    if (submitted || !requireName) {
      e.preventDefault();
      return;
    }
    setDragPayload(payload);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };
  const onDragOver = (e) => {
    if (submitted || !requireName) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const place = (bucket, id, svc) => {
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return; // hard enforcement

    if (bucket === "MOST") {
      // overwrite “Most” for that weekend; clear duplicate service in Least
      setLeast(id, {
        ...(prefs[id] || {}),
        leastService: (prefs[id]?.leastService === svc && prefs[id]?.leastChoice > 0)
          ? SERVICES.NONE
          : (prefs[id]?.leastService || SERVICES.NONE),
        leastChoice: (prefs[id]?.leastService === svc && prefs[id]?.leastChoice > 0)
          ? 0
          : (prefs[id]?.leastChoice || 0),
      });
      setMost(id, { ...(prefs[id] || {}), mostService: svc, mostChoice: nextChoice(chosenMost) });
    } else {
      setMost(id, {
        ...(prefs[id] || {}),
        mostService: (prefs[id]?.mostService === svc && prefs[id]?.mostChoice > 0)
          ? SERVICES.NONE
          : (prefs[id]?.mostService || SERVICES.NONE),
        mostChoice: (prefs[id]?.mostService === svc && prefs[id]?.mostChoice > 0)
          ? 0
          : (prefs[id]?.mostChoice || 0),
      });
      setLeast(id, { ...(prefs[id] || {}), leastService: svc, leastChoice: nextChoice(chosenLeast) });
    }
  };

  const onDrop = (bucket) => (e) => {
    if (submitted || !requireName) return;
    e.preventDefault();
    let pl = dragPayload;
    try {
      pl = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {}
    if (!pl) return;
    place(bucket, pl.id, pl.service);
    setDragPayload(null);
  };

  const removeFrom = (bucket, id) => {
    if (bucket === "MOST")
      setMost(id, { ...(prefs[id] || {}), mostService: SERVICES.NONE, mostChoice: 0 });
    else setLeast(id, { ...(prefs[id] || {}), leastService: SERVICES.NONE, leastChoice: 0 });
  };

  const shell = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  };
  const title = {
    fontWeight: 900,
    fontSize: 14,
    padding: 8,
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
  };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 12px 16px" }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.2fr 1fr 1fr" }}>
        {/* Library */}
        <div style={shell}>
          <div style={title}>Available (drag a chip)</div>
          <div style={{ padding: 10 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 8,
              }}
            >
              {libraryItems.map((it) => (
                <div
                  key={it.key}
                  draggable={!submitted && requireName}
                  onDragStart={onDragStart({ id: it.id, service: it.service })}
                  title={
                    requireName ? "Drag to MOST or LEAST" : "Select your name first"
                  }
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontSize: 12,
                    cursor:
                      submitted || !requireName ? "not-allowed" : "grab",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {it.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MOST */}
        <div style={shell} onDragOver={onDragOver} onDrop={onDrop("MOST")}>
          <div style={title}>Most (drop to add)</div>
          <div style={{ padding: 10, minHeight: 140, display: "flex", flexDirection: "column", gap: 8 }}>
            {chosenMost.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>— empty —</div>
            ) : (
              chosenMost.map((m) => (
                <div key={`M-${m.id}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={styleChip("#dcfce7", "#065f46", "#10b981")}>#{m.choice}</span>
                  <span style={{ fontSize: 13 }}>
                    {prettyDate(m.id)} — {m.service}
                  </span>
                  <button
                    onClick={() => removeFrom("MOST", m.id)}
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "2px 6px",
                      background: "#fff",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LEAST */}
        <div style={shell} onDragOver={onDragOver} onDrop={onDrop("LEAST")}>
          <div style={title}>Least (drop to add)</div>
          <div style={{ padding: 10, minHeight: 140, display: "flex", flexDirection: "column", gap: 8 }}>
            {chosenLeast.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>— empty —</div>
            ) : (
              chosenLeast.map((m) => (
                <div key={`L-${m.id}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={styleChip("#fee2e2", "#9f1239", "#ef4444")}>#{m.choice}</span>
                  <span style={{ fontSize: 13 }}>
                    {prettyDate(m.id)} — {m.service}
                  </span>
                  <button
                    onClick={() => removeFrom("LEAST", m.id)}
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "2px 6px",
                      background: "#fff",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {!requireName && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#991b1b",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            padding: "6px 8px",
            borderRadius: 8,
          }}
        >
          Select your name above to enable drag & drop.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   QuickAdd (compact list, minimal clicks)
------------------------------------------------------------- */
function QuickAdd({ prefs, setMost, setLeast, submitted, requireName }) {
  const rows = monthsFlat;

  const set = (id, which, svc, choice) => {
    if (!requireName) return;
    const p = prefs[id] || {
      mostService: SERVICES.NONE,
      mostChoice: 0,
      leastService: SERVICES.NONE,
      leastChoice: 0,
    };
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) return;

    if (which === "MOST") {
      // overwrite Most; clear duplicate service from Least if necessary
      const clearLeast = p.leastService === svc ? { leastService: SERVICES.NONE, leastChoice: 0 } : {};
      setLeast(id, { ...p, ...clearLeast });
      setMost(id, { ...p, mostService: svc, mostChoice: choice });
    } else {
      const clearMost = p.mostService === svc ? { mostService: SERVICES.NONE, mostChoice: 0 } : {};
      setMost(id, { ...p, ...clearMost });
      setLeast(id, { ...p, leastService: svc, leastChoice: choice });
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 12px 16px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <thead style={{ background: "#f8fafc" }}>
          <tr>
            <th style={{ textAlign: "left", padding: 8 }}>Weekend</th>
            <th style={{ textAlign: "left", padding: 8 }}>Most</th>
            <th style={{ textAlign: "left", padding: 8 }}>Most #</th>
            <th style={{ textAlign: "left", padding: 8 }}>Least</th>
            <th style={{ textAlign: "left", padding: 8 }}>Least #</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const p = prefs[r.id] || {
              mostService: SERVICES.NONE,
              mostChoice: 0,
              leastService: SERVICES.NONE,
              leastChoice: 0,
            };
            const avail = availabilityByWeekend[r.id] || [];
            return (
              <tr key={r.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 8 }}>{r.label}</td>
                <td style={{ padding: 8 }}>
                  {avail.includes(SERVICES.RNI) && (
                    <label style={{ marginRight: 10 }}>
                      <input
                        type="radio"
                        name={`m-${r.id}`}
                        checked={p.mostService === SERVICES.RNI}
                        disabled={submitted || !requireName}
                        onChange={() => set(r.id, "MOST", SERVICES.RNI, p.mostChoice)}
                      />
                      &nbsp;RNI
                    </label>
                  )}
                  {avail.includes(SERVICES.COA) && (
                    <label>
                      <input
                        type="radio"
                        name={`m-${r.id}`}
                        checked={p.mostService === SERVICES.COA}
                        disabled={submitted || !requireName}
                        onChange={() => set(r.id, "MOST", SERVICES.COA, p.mostChoice)}
                      />
                      &nbsp;COA
                    </label>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  <select
                    disabled={submitted || p.mostService === SERVICES.NONE || !requireName}
                    value={String(p.mostChoice || 0)}
                    onChange={(e) => set(r.id, "MOST", p.mostService, parseInt(e.target.value, 10))}
                  >
                    <option value="0">#</option>
                    {Array.from({ length: allWeekendIds.length }, (_, k) => k + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={{ padding: 8 }}>
                  {avail.includes(SERVICES.RNI) && (
                    <label style={{ marginRight: 10 }}>
                      <input
                        type="radio"
                        name={`l-${r.id}`}
                        checked={p.leastService === SERVICES.RNI}
                        disabled={submitted || !requireName}
                        onChange={() => set(r.id, "LEAST", SERVICES.RNI, p.leastChoice)}
                      />
                      &nbsp;RNI
                    </label>
                  )}
                  {avail.includes(SERVICES.COA) && (
                    <label>
                      <input
                        type="radio"
                        name={`l-${r.id}`}
                        checked={p.leastService === SERVICES.COA}
                        disabled={submitted || !requireName}
                        onChange={() => set(r.id, "LEAST", SERVICES.COA, p.leastChoice)}
                      />
                      &nbsp;COA
                    </label>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  <select
                    disabled={submitted || p.leastService === SERVICES.NONE || !requireName}
                    value={String(p.leastChoice || 0)}
                    onChange={(e) => set(r.id, "LEAST", p.leastService, parseInt(e.target.value, 10))}
                  >
                    <option value="0">#</option>
                    {Array.from({ length: allWeekendIds.length }, (_, k) => k + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------
   RankBoard (simple two columns you can type ranks into)
------------------------------------------------------------- */
function RankBoard({ prefs, setMost, setLeast, submitted, requireName }) {
  const rows = monthsFlat;

  const set = (id, which, choice) => {
    if (!requireName) return;
    const p = prefs[id] || {
      mostService: SERVICES.NONE,
      mostChoice: 0,
      leastService: SERVICES.NONE,
      leastChoice: 0,
    };
    if (which === "MOST") {
      if (p.mostService === SERVICES.NONE) return; // must pick a service via other UIs first
      setMost(id, { ...p, mostChoice: choice });
    } else {
      if (p.leastService === SERVICES.NONE) return;
      setLeast(id, { ...p, leastChoice: choice });
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 12px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #e5e7eb", fontWeight: 800 }}>
            Most (enter choice #) — set service in another mode
          </div>
          <div style={{ padding: 10 }}>
            {rows.map((r) => {
              const p = prefs[r.id] || {
                mostService: SERVICES.NONE,
                mostChoice: 0,
              };
              return (
                <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px dashed #eef2f7" }}>
                  <div style={{ width: 160, fontSize: 13 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Svc: {p.mostService !== SERVICES.NONE ? p.mostService : "—"}</div>
                  <input
                    type="number"
                    min={0}
                    disabled={submitted || !requireName || p.mostService === SERVICES.NONE}
                    value={p.mostChoice || 0}
                    onChange={(e) => set(r.id, "MOST", parseInt(e.target.value || "0", 10))}
                    style={{ width: 80 }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "#fff" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #e5e7eb", fontWeight: 800 }}>
            Least (enter choice #) — set service in another mode
          </div>
          <div style={{ padding: 10 }}>
            {rows.map((r) => {
              const p = prefs[r.id] || {
                leastService: SERVICES.NONE,
                leastChoice: 0,
              };
              return (
                <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px dashed #eef2f7" }}>
                  <div style={{ width: 160, fontSize: 13 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Svc: {p.leastService !== SERVICES.NONE ? p.leastService : "—"}</div>
                  <input
                    type="number"
                    min={0}
                    disabled={submitted || !requireName || p.leastService === SERVICES.NONE}
                    value={p.leastChoice || 0}
                    onChange={(e) => set(r.id, "LEAST", parseInt(e.target.value || "0", 10))}
                    style={{ width: 80 }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Command Palette (very small modal)
------------------------------------------------------------- */
function CommandPalette({ open, setOpen, setMode }) {
  const options = [
    { key: "calendar", label: "Calendar (2×6 months)" },
    { key: "drag", label: "DragBuckets" },
    { key: "quick", label: "QuickAdd" },
    { key: "rank", label: "RankBoard" },
  ];

  if (!open) return null;
  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.25)",
        display: "grid",
        placeItems: "center",
        zIndex: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}
      >
        <div style={{ padding: 10, borderBottom: "1px solid #e5e7eb", fontWeight: 800 }}>
          Command Palette
        </div>
        <div style={{ padding: 10, display: "grid", gap: 8 }}>
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                setMode(o.key);
                setOpen(false);
              }}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ padding: 10, fontSize: 12, color: "#64748b" }}>
          Tip: press <b>/</b> to open quickly.
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Main App
------------------------------------------------------------- */
export default function App() {
  /* Container centering with side “bands” */
  const pageWrap = {
    display: "grid",
    gridTemplateColumns: "1fr minmax(0, 1200px) 1fr",
    minHeight: "100vh",
    background: "#f5f7fb",
  };
  const centerCol = { gridColumn: 2 };

  /* Mode via query param; default calendar */
  const qp = new URLSearchParams(window.location.search);
  const initialMode =
    qp.get("ui") && ["calendar", "drag", "quick", "rank"].includes(qp.get("ui"))
      ? qp.get("ui")
      : "calendar";
  const [mode, setModeState] = useState(initialMode);
  const setMode = (m) => {
    setModeState(m);
    const u = new URL(window.location.href);
    u.searchParams.set("ui", m);
    window.history.replaceState({}, "", u);
  };

  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("Authenticating…");
  const [firebaseOK, setFirebaseOK] = useState(null); // null=unknown, true/false
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(MONTH_KEYS.map((mk) => [mk, true]))
  );

  const requireName = Boolean(profile?.name);

  /* Firebase auth + “Connected” check */
  useEffect(() => {
    (async () => {
      try {
        const token =
          typeof __initial_auth_token !== "undefined"
            ? __initial_auth_token
            : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => {
          if (u) setUid(u.uid);
          setStatus("Loading profile & preferences…");
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
      }
    })();
  }, []);

  const profileDocRef = (uidX) =>
    doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsDocRef = (uidX) =>
    doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        // “Connected?” probe — cheap read
        try {
          const ping = await getDoc(profileDocRef(uid));
          setFirebaseOK(true);
        } catch {
          setFirebaseOK(false);
        }

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
            setPrefs({ ...initEmptyPrefs(), ...remapped });
          } else if (d.top10 || d.bottom10) {
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
            setPrefs(next);
          }
        }
        setStatus("Ready.");
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
      }
    })();
  }, [uid]);

  /* Setters that enforce “one service per weekend per bucket” and cross-bucket same-service clearing */
  const setMost = useCallback((id, v) => {
    setPrefs((prev) => {
      const p = prev[id] || {
        mostService: SERVICES.NONE,
        mostChoice: 0,
        leastService: SERVICES.NONE,
        leastChoice: 0,
      };
      const avail = availabilityByWeekend[id] || [];
      const svc = v.mostService;
      if (![SERVICES.RNI, SERVICES.COA].includes(svc) || !avail.includes(svc))
        return prev; // invalid
      const next = {
        ...prev,
        [id]: {
          ...p,
          mostService: svc,
          mostChoice: v.mostChoice || 0,
          // if Least had same service AND a choice, clear it
          ...(p.leastService === svc && p.leastChoice > 0
            ? { leastService: SERVICES.NONE, leastChoice: 0 }
            : {}),
        },
      };
      return next;
    });
  }, []);

  const setLeast = useCallback((id, v) => {
    setPrefs((prev) => {
      const p = prev[id] || {
        mostService: SERVICES.NONE,
        mostChoice: 0,
        leastService: SERVICES.NONE,
        leastChoice: 0,
      };
      const avail = availabilityByWeekend[id] || [];
      const svc = v.leastService;
      if (![SERVICES.RNI, SERVICES.COA].includes(svc) || !avail.includes(svc))
        return prev;
      const next = {
        ...prev,
        [id]: {
          ...p,
          leastService: svc,
          leastChoice: v.leastChoice || 0,
          ...(p.mostService === svc && p.mostChoice > 0
            ? { mostService: SERVICES.NONE, mostChoice: 0 }
            : {}),
        },
      };
      return next;
    });
  }, []);

  /* Counts */
  const counts = useMemo(() => {
    let mostCount = 0,
      leastCount = 0;
    for (const p of Object.values(prefs)) {
      if (p.mostChoice > 0 && p.mostService !== SERVICES.NONE) mostCount++;
      if (p.leastChoice > 0 && p.leastService !== SERVICES.NONE) leastCount++;
    }
    return { mostCount, leastCount };
  }, [prefs]);

  /* Save profile inline */
  const saveProfile = async (next) => {
    setProfile(next);
    if (!uid) return;
    await setDoc(
      profileDocRef(uid),
      { ...next, updatedAt: serverTimestamp() },
      { merge: true }
    );
  };

  /* Assemble export arrays */
  const assembleTopBottom = useCallback(() => {
    const orderIdx = (id) => allWeekendIds.indexOf(id);
    const top = [];
    const least = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0)
        top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0)
        least.push({
          weekend: id,
          choice: p.leastChoice,
          service: p.leastService,
        });
    }
    top.sort((a, b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    least.sort((a, b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    return { top, least };
  }, [prefs]);

  const handleSubmit = async () => {
    if (!uid || !profile.name) {
      alert("Select your name first.");
      return;
    }
    const badLeast = Object.values(prefs).some(
      (p) => p.leastChoice > 0 && p.leastService === SERVICES.NONE
    );
    if (badLeast) {
      alert("For every “Least” choice, please select a service (RNI or COA).");
      return;
    }

    const { top, least } = assembleTopBottom();
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
        top10: top.map((t) => ({
          weekend: t.weekend,
          choice: t.choice,
          rank: t.choice,
          service: t.service,
        })),
        bottom10: least.map((b) => ({
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
  const downloadMyCSV = () => {
    const { top, least } = assembleTopBottom();
    const rows = [
      ...top.map((t) => ({
        attendee: profile.name,
        email: profile.email || "",
        kind: "MOST",
        choice: t.choice,
        service: t.service,
        weekend: t.weekend,
      })),
      ...least.map((b) => ({
        attendee: profile.name,
        email: profile.email || "",
        kind: "LEAST",
        choice: b.choice,
        service: b.service,
        weekend: b.weekend,
      })),
    ];
    const fn = submitted
      ? `preferences_${profile.name || "attending"}.csv`
      : `preferences_preview_${profile.name || "attending"}.csv`;
    downloadCSV(fn, rows);
  };
  const downloadMyWord = () => {
    const { top, least } = assembleTopBottom();
    const html = docHtml(profile.name, profile.email, top, least);
    const fn = submitted
      ? `preferences_${profile.name || "attending"}.doc`
      : `preferences_preview_${profile.name || "attending"}.doc`;
    downloadBlob(fn, "application/msword", html);
  };

  /* Admin CSV (optional — keep for future) */
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get("admin") === "1";
  const [adminRows, setAdminRows] = useState([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      if (!isAdmin || !uid || adminLoaded) return;
      try {
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
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isAdmin, uid, adminLoaded]);

  /* Command palette hotkey */
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const h = (e) => {
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen((x) => !x);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* Render */
  const topBar = (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#ffffffcc",
        backdropFilter: "saturate(180%) blur(4px)",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "8px 12px",
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ marginRight: 8 }}>Jump:</strong>
        {MONTH_KEYS.map((mk, i) => (
          <a
            key={mk}
            href={`#month-${mk}`}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontSize: 12,
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            {MONTH_FULL[i].slice(0, 3)}
          </a>
        ))}
        <span style={{ flex: 1 }} />

        {/* Firebase badge inline with Jump bar */}
        <span
          title={
            firebaseOK === null
              ? "Checking…"
              : firebaseOK
              ? "Connected to Firebase"
              : "Not connected"
          }
          style={{
            fontSize: 12,
            border: "1px solid " + (firebaseOK ? "#10b981" : "#ef4444"),
            color: firebaseOK ? "#065f46" : "#991b1b",
            background: firebaseOK ? "#dcfce7" : "#fee2e2",
            borderRadius: 999,
            padding: "4px 8px",
          }}
        >
          Firebase: {firebaseOK === null ? "…" : firebaseOK ? "Connected ✓" : "Offline ✗"}
        </span>

        <button
          onClick={() => setCollapsed(Object.fromEntries(MONTH_KEYS.map((k) => [k, true])))}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#fff",
            fontSize: 12,
          }}
        >
          Collapse all
        </button>
        <button
          onClick={() => setCollapsed(Object.fromEntries(MONTH_KEYS.map((k) => [k, false])))}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#fff",
            fontSize: 12,
          }}
        >
          Expand all
        </button>
        <button
          onClick={downloadMyCSV}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #059669",
            background: "#10b981",
            color: "#fff",
            fontSize: 12,
          }}
        >
          Preview/My CSV
        </button>
        <button
          onClick={downloadMyWord}
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border: "1px solid #4f46e5",
            background: "#6366f1",
            color: "#fff",
            fontSize: 12,
          }}
        >
          Preview/My Word
        </button>
      </div>
    </div>
  );

  return (
    <div style={pageWrap}>
      <div style={centerCol}>
        {topBar}

        {/* Mode Switcher + Palette button (centered container) */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {["calendar", "drag", "quick", "rank"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: mode === m ? "#0ea5e9" : "#fff",
                  color: mode === m ? "#fff" : "#0f172a",
                  cursor: "pointer",
                }}
              >
                {m === "calendar" ? "Calendar" : m === "drag" ? "DragBuckets" : m === "quick" ? "QuickAdd" : "RankBoard"}
              </button>
            ))}
            <button
              onClick={() => setPaletteOpen(true)}
              title="Command palette"
              style={{
                marginLeft: "auto",
                padding: "6px 8px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              ⌘ Palette
            </button>
          </div>
        </div>

        {/* Title + instructions (centered container) */}
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 12px 0" }}>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">
            2026 Preferences (RNI & COA)
          </h1>
          <ol
            style={{
              margin: "8px 0 12px",
              paddingLeft: 20,
              color: "#334155",
              fontSize: 14,
              lineHeight: 1.45,
              listStyle: "decimal",
            }}
          >
            <li style={{ marginBottom: 4 }}>
              Select your name below. You will see the number of weekends you wanted.
            </li>
            <li style={{ marginBottom: 4 }}>
              Choose “<b>Most</b>” and “<b>Least</b>” preferred weekends; for each, select <b>service</b> and <b>choice #</b>. Services are
              enforced to available slots only; you cannot select both RNI and COA for the same bucket/weekend.
            </li>
            <li style={{ marginBottom: 4 }}>You can download a preview anytime.</li>
            <li style={{ marginBottom: 4 }}>Submit to lock your preferences once you are done.</li>
          </ol>
          <div
            style={{
              fontSize: 13,
              color: "#0f5132",
              background: "#d1e7dd",
              border: "1px solid #badbcc",
              padding: "10px 12px",
              borderRadius: 10,
              marginBottom: 10,
            }}
          >
            Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible. This is a <b>ranking</b> process; selecting more
            weekends increases the chance you receive more of your preferred weekends overall.
          </div>
          <div className="mb-3 text-sm text-indigo-800 bg-indigo-50 border-l-4 border-indigo-400 rounded-md p-3">
            Status: {status} • Most choices: {counts.mostCount} • Least choices: {counts.leastCount}{" "}
            {submitted ? "• (Locked after submission)" : ""}
          </div>

          {/* Identity */}
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
          </div>

          {profile.name && (
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                {profile.name}
              </div>
              {(() => {
                const m = ATTENDING_LIMITS[profile.name];
                return m ? (
                  <>
                    <div style={{ fontSize: 13, color: "#334155" }}>
                      <b>Total weekends requested:</b> {m.requested}
                    </div>
                    <div style={{ fontSize: 13, color: "#334155" }}>
                      <b>Assignments already claimed:</b> {m.claimed}
                    </div>
                    <div style={{ fontSize: 13, color: "#334155" }}>
                      <b>Assignments left to be picked:</b> {m.left}
                    </div>
                  </>
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

        {/* Main 2-column layout: left = chosen UI, right = live preview */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px 8px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16 }}>
          <div>
            {mode === "calendar" && (
              <CalendarGrid
                prefs={prefs}
                setMost={setMost}
                setLeast={setLeast}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                submitted={submitted}
              />
            )}
            {mode === "drag" && (
              <DragBuckets
                prefs={prefs}
                setMost={setMost}
                setLeast={setLeast}
                submitted={submitted}
                requireName={requireName}
              />
            )}
            {mode === "quick" && (
              <QuickAdd
                prefs={prefs}
                setMost={setMost}
                setLeast={setLeast}
                submitted={submitted}
                requireName={requireName}
              />
            )}
            {mode === "rank" && (
              <RankBoard
                prefs={prefs}
                setMost={setMost}
                setLeast={setLeast}
                submitted={submitted}
                requireName={requireName}
              />
            )}
          </div>

          <div>
            <LivePreview profile={profile} prefs={prefs} />
          </div>
        </div>

        {/* Submit */}
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 12px 24px",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            className={`${
              profile.name && !submitted
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            } py-3 px-6 rounded-xl font-bold`}
            disabled={!profile.name || submitted}
            onClick={handleSubmit}
          >
            {submitted ? "Submitted (Locked)" : "Submit Final Preferences"}
          </button>
          <span className="text-sm text-gray-600">
            {submitted
              ? "Locked. Downloads reflect your final choices."
              : "Tip: use Preview CSV/Word above to save your current selections."}
          </span>
        </div>

        {/* Build label */}
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 12px 24px",
            textAlign: "right",
            color: "#64748b",
            fontSize: 12,
          }}
        >
          Build: {__APP_VERSION__}
        </div>
      </div>

      {/* Command Palette modal */}
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} setMode={setMode} />
    </div>
  );
}
