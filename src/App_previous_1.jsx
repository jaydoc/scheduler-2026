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

/* ──────────────────────────────────────────────────────────────────────────
   Build tag
   ────────────────────────────────────────────────────────────────────────── */
const __APP_VERSION__ = "v13.0 — unified modes, centered, drag fix, live preview";

/* ──────────────────────────────────────────────────────────────────────────
   Firebase config (prefers injected → global → local)
   ────────────────────────────────────────────────────────────────────────── */
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
const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v13.0";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ──────────────────────────────────────────────────────────────────────────
   Constants / Attendings / Year / Services
   ────────────────────────────────────────────────────────────────────────── */
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

const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
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

/* ──────────────────────────────────────────────────────────────────────────
   Schedule (Sat dates only; service null = open, string = assigned)
   ────────────────────────────────────────────────────────────────────────── */
const months = {
  "01": [
    { d: "2026-01-10", label: "January 10", rni: null, coa: null },
    { d: "2026-01-17", label: "January 17", rni: null, coa: null, detail: "MLK" },
    { d: "2026-01-24", label: "January 24", rni: null, coa: null },
    { d: "2026-01-31", label: "January 31", rni: null, coa: null },
  ],
  "02": [
    { d: "2026-02-07", label: "February 7", rni: "Boone", coa: null },
    { d: "2026-02-14", label: "February 14", rni: "Boone", coa: null },
    { d: "2026-02-21", label: "February 21", rni: "Willis", coa: null },
    { d: "2026-02-28", label: "February 28", rni: "Willis", coa: null },
  ],
  "03": [
    { d: "2026-03-07", label: "March 7", rni: "Ambal", coa: "Arora" },
    { d: "2026-03-14", label: "March 14", rni: null, coa: "Winter" },
    { d: "2026-03-21", label: "March 21", rni: "Ambal", coa: "Arora" },
    { d: "2026-03-28", label: "March 28", rni: null, coa: "Arora" },
  ],
  "04": [
    { d: "2026-04-04", label: "April 4", rni: "Sims", coa: null },
    { d: "2026-04-11", label: "April 11", rni: null, coa: null },
    { d: "2026-04-18", label: "April 18", rni: "Sims", coa: null },
    { d: "2026-04-25", label: "April 25", rni: null, coa: null, detail: "PAS" },
  ],
  "05": [
    { d: "2026-05-02", label: "May 2", rni: null, coa: null },
    { d: "2026-05-09", label: "May 9", rni: "Arora", coa: null },
    { d: "2026-05-16", label: "May 16", rni: "Arora", coa: null },
    { d: "2026-05-23", label: "May 23", rni: null, coa: null, detail: "Memorial" },
    { d: "2026-05-30", label: "May 30", rni: "Arora", coa: null },
  ],
  "06": [
    { d: "2026-06-06", label: "June 6", rni: "Schuyler", coa: "Winter" },
    { d: "2026-06-13", label: "June 13", rni: "Boone", coa: null },
    { d: "2026-06-19", label: "June 19", rni: "Schuyler", coa: "Winter", detail: "Juneteenth" },
    { d: "2026-06-27", label: "June 27", rni: "Boone", coa: null },
  ],
  "07": [
    { d: "2026-07-04", label: "July 4", rni: "Jain", coa: "Carlo", detail: "Independence Day" },
    { d: "2026-07-11", label: "July 11", rni: null, coa: "Willis" },
    { d: "2026-07-18", label: "July 18", rni: null, coa: null },
    { d: "2026-07-25", label: "July 25", rni: "Shukla", coa: "Willis" },
  ],
  "08": [
    { d: "2026-08-01", label: "August 1", rni: "Boone", coa: null },
    { d: "2026-08-08", label: "August 8", rni: "Sims", coa: "Carlo" },
    { d: "2026-08-15", label: "August 15", rni: "Boone", coa: null },
    { d: "2026-08-22", label: "August 22", rni: "Sims", coa: null },
    { d: "2026-08-29", label: "August 29", rni: null, coa: "Carlo" },
  ],
  "09": [
    { d: "2026-09-05", label: "September 5", rni: "Mackay", coa: null, detail: "Labor Day" },
    { d: "2026-09-12", label: "September 12", rni: null, coa: null },
    { d: "2026-09-19", label: "September 19", rni: null, coa: null },
    { d: "2026-09-26", label: "September 26", rni: null, coa: null },
  ],
  "10": [
    { d: "2026-10-03", label: "October 3", rni: "Kandasamy", coa: "Carlo" },
    { d: "2026-10-10", label: "October 10", rni: "Travers", coa: "Bhatia" },
    { d: "2026-10-17", label: "October 17", rni: "Kandasamy", coa: null },
    { d: "2026-10-24", label: "October 24", rni: "Travers", coa: "Bhatia" },
    { d: "2026-10-31", label: "October 31", rni: "Kandasamy", coa: "Carlo" },
  ],
  "11": [
    { d: "2026-11-07", label: "November 7", rni: "Ambal", coa: null },
    { d: "2026-11-14", label: "November 14", rni: "Bhatia", coa: null },
    { d: "2026-11-21", label: "November 21", rni: "Ambal", coa: null },
    { d: "2026-11-26", label: "November 26", rni: "Bhatia", coa: null, detail: "Thanksgiving" },
  ],
  "12": [
    { d: "2026-12-05", label: "December 5", rni: "Travers", coa: "Kandasamy" },
    { d: "2026-12-12", label: "December 12", rni: null, coa: null },
    { d: "2026-12-19", label: "December 19", rni: "Travers", coa: "Kandasamy" },
    { d: "2026-12-24", label: "December 24", rni: "Bhatia", coa: "Arora", detail: "Christmas" },
    { d: "2026-12-31", label: "December 31", rni: "Kane", coa: "Kandasamy", detail: "New Year’s Eve" },
  ],
};

const allWeekendIds = Object.values(months)
  .flat()
  .map((w) => w.d);

/* What’s available per weekend */
const availabilityByWeekend = (() => {
  const m = {};
  for (const arr of Object.values(months)) {
    for (const w of arr) {
      const a = [];
      if (w.rni === null) a.push(SERVICES.RNI);
      if (w.coa === null) a.push(SERVICES.COA);
      m[w.d] = a;
    }
  }
  return m;
})();

/* ──────────────────────────────────────────────────────────────────────────
   Helpers: state shape, CSV/Word, download utils
   ────────────────────────────────────────────────────────────────────────── */
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
function clampToAvailability(id, p) {
  const avail = availabilityByWeekend[id] || [];
  const out = { ...p };
  if (!avail.includes(out.mostService)) out.mostService = SERVICES.NONE;
  if (!avail.includes(out.leastService)) out.leastService = SERVICES.NONE;
  return out;
}
function normalizeRanks(prefs) {
  // compact ranks to 1..N per bucket
  const ids = Object.keys(prefs);
  const most = ids
    .filter((id) => prefs[id].mostService !== SERVICES.NONE && prefs[id].mostChoice > 0)
    .sort((a, b) => prefs[a].mostChoice - prefs[b].mostChoice);
  const least = ids
    .filter((id) => prefs[id].leastService !== SERVICES.NONE && prefs[id].leastChoice > 0)
    .sort((a, b) => prefs[a].leastChoice - prefs[b].leastChoice);

  let i = 1;
  for (const id of most) prefs[id].mostChoice = i++;
  i = 1;
  for (const id of least) prefs[id].leastChoice = i++;
  return { ...prefs };
}
function toCSV(rows) {
  const headers = Object.keys(rows[0] || {});
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
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
function docHtml(name, email, top, bottom) {
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
      <td>${esc(r.label)}</td>
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
        ${bottom.map((r) => row("LEAST", r)).join("")}
      </tbody>
    </table>
    <p style="margin-top:12px;font-size:12px;color:#555">Generated on ${new Date().toLocaleString()}</p>
  </body>
  </html>`;
}

/* ──────────────────────────────────────────────────────────────────────────
   Reusable UI bits
   ────────────────────────────────────────────────────────────────────────── */
const badge = (bg, fg, b) => ({
  padding: "2px 8px",
  borderRadius: 999,
  background: bg,
  color: fg,
  border: `1px solid ${b}`,
  fontSize: 12,
  whiteSpace: "nowrap",
});
const btn = (outline = false) => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: outline ? "1px solid #e5e7eb" : "1px solid #2563eb",
  background: outline ? "#ffffff" : "#2563eb",
  color: outline ? "#1f2937" : "#ffffff",
  fontSize: 12,
  cursor: "pointer",
});
const tiny = { fontSize: 12, color: "#64748b" };

/* ──────────────────────────────────────────────────────────────────────────
   Live extraction for preview/export
   ────────────────────────────────────────────────────────────────────────── */
function computeLists(prefs) {
  const order = new Map(allWeekendIds.map((id, i) => [id, i]));
  const top = [];
  const bottom = [];
  for (const [id, p] of Object.entries(prefs)) {
    if (p.mostService !== SERVICES.NONE && p.mostChoice > 0)
      top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
    if (p.leastService !== SERVICES.NONE && p.leastChoice > 0)
      bottom.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
  }
  top.sort((a, b) => a.choice - b.choice || order.get(a.weekend) - order.get(b.weekend));
  bottom.sort((a, b) => a.choice - b.choice || order.get(a.weekend) - order.get(b.weekend));
  // attach human labels
  const labelOf = (id) => {
    const d = new Date(id);
    return `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
    };
  const withLabelsTop = top.map((t) => ({ ...t, label: labelOf(t.weekend) }));
  const withLabelsBottom = bottom.map((t) => ({ ...t, label: labelOf(t.weekend) }));
  return { top: withLabelsTop, bottom: withLabelsBottom };
}

/* ──────────────────────────────────────────────────────────────────────────
   Choice controls (used in Calendar mode)
   ────────────────────────────────────────────────────────────────────────── */
function ChoiceSelect({ value, onChange, disabled, placeholder, maxN }) {
  const MAX = Math.max(10, maxN || 10);
  return (
    <select
      disabled={disabled}
      value={String(value || 0)}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13 }}
    >
      <option value="0">{placeholder}</option>
      {Array.from({ length: MAX }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </select>
  );
}
function RadioServiceLimited({ available, value, onChange, disabled, name }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      {available.includes(SERVICES.RNI) && (
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <input
            type="radio"
            disabled={disabled}
            checked={value === SERVICES.RNI}
            onChange={() => onChange(SERVICES.RNI)}
            name={name}
          />
          RNI
        </label>
      )}
      {available.includes(SERVICES.COA) && (
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <input
            type="radio"
            disabled={disabled}
            checked={value === SERVICES.COA}
            onChange={() => onChange(SERVICES.COA)}
            name={name}
          />
          COA
        </label>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Month card + Calendar grid (2×6), collapsed by default
   ────────────────────────────────────────────────────────────────────────── */
function MonthCard({ mk, label, items, prefs, onMostChange, onLeastChange, collapsed, onToggle, locked }) {
  return (
    <div
      id={`month-${mk}`}
      style={{
        scrollMarginTop: 96,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          background: "#f8fafc",
          color: "#0f172a",
          borderBottom: "1px solid #e2e8f0",
          fontWeight: 800,
          fontSize: 16,
          padding: "12px 14px",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
        }}
        title="Collapse/expand"
      >
        <span>{label}</span>
        <span style={{ fontWeight: 900, marginLeft: 6 }}>{collapsed ? "▸" : "▾"}</span>
      </button>

      {!collapsed && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((w) => {
            const p = prefs[w.d] || {
              mostService: SERVICES.NONE,
              mostChoice: 0,
              leastService: SERVICES.NONE,
              leastChoice: 0,
            };
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const fullyAssigned = (!rniOpen && !coaOpen) || (w.rni && w.coa);

            const available = [];
            if (rniOpen) available.push(SERVICES.RNI);
            if (coaOpen) available.push(SERVICES.COA);

            return (
              <div
                key={w.d}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: fullyAssigned ? "#f9fafb" : "#fff",
                  opacity: fullyAssigned ? 0.85 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{w.label}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        background: rniOpen ? "#dbeafe" : "#e5e7eb",
                        color: rniOpen ? "#1e3a8a" : "#111827",
                        borderRadius: 6,
                        padding: "3px 8px",
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
                    {w.detail && <span style={badge("#fff7ed", "#b45309", "#f59e0b")}>{w.detail}</span>}
                  </div>
                </div>

                {!fullyAssigned ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {/* MOST */}
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Most (service + choice)</div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                        <RadioServiceLimited
                          available={available}
                          disabled={locked}
                          value={available.includes(p.mostService) ? p.mostService : SERVICES.NONE}
                          onChange={(svc) => {
                            const next = { ...p, mostService: svc };
                            // prevent both services within MOST
                            if (svc !== SERVICES.NONE && p.leastService === svc && p.leastChoice > 0) {
                              // same service present in least → clear least
                              onLeastChange(w.d, { ...p, leastService: SERVICES.NONE, leastChoice: 0 });
                            }
                            onMostChange(w.d, clampToAvailability(w.d, next));
                          }}
                          name={`most-${w.d}`}
                        />
                        <ChoiceSelect
                          disabled={locked || available.length === 0 || p.mostService === SERVICES.NONE}
                          value={p.mostChoice || 0}
                          onChange={(choice) => {
                            const next = { ...p, mostChoice: choice };
                            onMostChange(w.d, next);
                          }}
                          placeholder="Most choice…"
                          maxN={allWeekendIds.length}
                        />
                        {p.mostService !== SERVICES.NONE && p.mostChoice > 0 && (
                          <span style={badge("#d1fae5", "#065f46", "#10b981")}>Most #{p.mostChoice}</span>
                        )}
                      </div>
                    </div>

                    {/* LEAST */}
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Least (service + choice)</div>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                        <RadioServiceLimited
                          available={available}
                          disabled={locked}
                          value={available.includes(p.leastService) ? p.leastService : SERVICES.NONE}
                          onChange={(svc) => {
                            const next = { ...p, leastService: svc };
                            // prevent both services within LEAST
                            if (svc !== SERVICES.NONE && p.mostService === svc && p.mostChoice > 0) {
                              onMostChange(w.d, { ...p, mostService: SERVICES.NONE, mostChoice: 0 });
                            }
                            onLeastChange(w.d, clampToAvailability(w.d, next));
                          }}
                          name={`least-${w.d}`}
                        />
                        <ChoiceSelect
                          disabled={locked || available.length === 0 || p.leastService === SERVICES.NONE}
                          value={p.leastChoice || 0}
                          onChange={(choice) => {
                            const next = { ...p, leastChoice: choice };
                            onLeastChange(w.d, next);
                          }}
                          placeholder="Least choice…"
                          maxN={allWeekendIds.length}
                        />
                        {p.leastService !== SERVICES.NONE && p.leastChoice > 0 && (
                          <span style={badge("#fee2e2", "#7f1d1d", "#ef4444")}>Least #{p.leastChoice}</span>
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
function CalendarGrid({ prefs, setMost, setLeast, collapsed, setCollapsed, submitted }) {
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
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 24,
          alignItems: "stretch",
        }}
      >
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
            onToggle={() => setCollapsed((c) => ({ ...c, [mk]: !c[mk] }))}
            locked={submitted}
          />
        ))}
      </div>

      <div className="container" style={{ padding: "0 12px 24px", display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
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

/* ──────────────────────────────────────────────────────────────────────────
   DragBuckets mode (fixed): empty Most/Least; compact source; hard availability
   ────────────────────────────────────────────────────────────────────────── */
function DragBuckets({ prefs, setMost, setLeast, requireName, submitted }) {
  const monthsFlat = useMemo(
    () =>
      MONTH_KEYS.flatMap((mk) =>
        (months[mk] || []).map((w) => ({
          id: w.d,
          label: w.label,
        }))
      ),
    []
  );

  const libraryItems = useMemo(() => {
    return monthsFlat.flatMap(({ id, label }) => {
      const avail = availabilityByWeekend[id] || [];
      return avail.map((svc) => ({
        key: `${id}:${svc}`,
        id,
        label,
        service: svc,
      }));
    });
  }, [monthsFlat]);

  const { top: mostChosen, bottom: leastChosen } = useMemo(() => computeLists(prefs), [prefs]);

  // Re-number ranks when removing
  const removeFrom = (bucket, id) => {
    if (bucket === "MOST") {
      setMost(id, { ...(prefs[id] || {}), mostService: SERVICES.NONE, mostChoice: 0 });
    } else {
      setLeast(id, { ...(prefs[id] || {}), leastService: SERVICES.NONE, leastChoice: 0 });
    }
  };

  // Drag handlers
  const [dragPayload, setDragPayload] = useState(null);
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
  const nextChoice = (list) => list.length + 1;

  const onDrop = (bucket) => (e) => {
    if (submitted || !requireName) return;
    e.preventDefault();
    let pl = dragPayload;
    try {
      pl = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {}
    if (!pl) return;
    const avail = availabilityByWeekend[pl.id] || [];
    if (!avail.includes(pl.service)) return;

    const p = prefs[pl.id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };

    if (bucket === "MOST") {
      // clear LEAST if present
      if (p.leastChoice > 0) setLeast(pl.id, { ...p, leastService: SERVICES.NONE, leastChoice: 0 });
      setMost(pl.id, { ...p, mostService: pl.service, mostChoice: nextChoice(mostChosen) });
    } else {
      // clear MOST if present
      if (p.mostChoice > 0) setMost(pl.id, { ...p, mostService: SERVICES.NONE, mostChoice: 0 });
      setLeast(pl.id, { ...p, leastService: pl.service, leastChoice: nextChoice(leastChosen) });
    }
  };

  const shell = { border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.04)" };
  const title = { fontWeight: 900, fontSize: 14, padding: "8px 10px", borderBottom: "1px solid #e5e7eb", background: "#f8fafc" };
  const pad = { padding: 10 };

  return (
    <div className="container" style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr 1fr" }}>
        {/* Library (compact grid) */}
        <div style={shell}>
          <div style={title}>Available (drag a chip)</div>
          <div style={pad}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 8,
                alignItems: "start",
              }}
            >
              {libraryItems.map((item) => (
                <div
                  key={item.key}
                  draggable={!submitted && requireName}
                  onDragStart={onDragStart({ id: item.id, service: item.service })}
                  title={requireName ? "Drag to MOST or LEAST" : "Select your name first"}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    fontSize: 12,
                    cursor: submitted || !requireName ? "not-allowed" : "grab",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label} — {item.service}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MOST */}
        <div style={shell} onDragOver={onDragOver} onDrop={onDrop("MOST")}>
          <div style={title}>Most (drop to add)</div>
          <div style={{ ...pad, minHeight: 120, display: "flex", flexDirection: "column", gap: 8 }}>
            {mostChosen.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>— empty —</div>
            ) : (
              mostChosen.map((m) => (
                <div key={`M-${m.weekend}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "4px 8px", borderRadius: 8, background: "#d1fae5", border: "1px solid #10b98133", fontSize: 12 }}>
                    #{m.choice}
                  </span>
                  <span style={{ fontSize: 13 }}>{m.label} — {m.service}</span>
                  <button
                    onClick={() => removeFrom("MOST", m.weekend)}
                    style={{ marginLeft: "auto", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "2px 6px", cursor: "pointer" }}
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
          <div style={{ ...pad, minHeight: 120, display: "flex", flexDirection: "column", gap: 8 }}>
            {leastChosen.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>— empty —</div>
            ) : (
              leastChosen.map((m) => (
                <div key={`L-${m.weekend}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "4px 8px", borderRadius: 8, background: "#fee2e2", border: "1px solid #ef444433", fontSize: 12 }}>
                    #{m.choice}
                  </span>
                  <span style={{ fontSize: 13 }}>{m.label} — {m.service}</span>
                  <button
                    onClick={() => removeFrom("LEAST", m.weekend)}
                    style={{ marginLeft: "auto", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: "2px 6px", cursor: "pointer" }}
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

/* ──────────────────────────────────────────────────────────────────────────
   QuickAdd (fast add via dropdowns)
   ────────────────────────────────────────────────────────────────────────── */
function QuickAdd({ prefs, setMost, setLeast, requireName, submitted }) {
  const [id, setId] = useState(allWeekendIds[0]);
  const [svc, setSvc] = useState(SERVICES.NONE);
  const avail = availabilityByWeekend[id] || [];

  useEffect(() => {
    if (!avail.includes(svc)) setSvc(SERVICES.NONE);
  }, [id]);

  const add = (bucket) => {
    if (submitted || !requireName) return;
    if (svc === SERVICES.NONE) return;
    const p = prefs[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };

    if (bucket === "MOST") {
      // clear LEAST if present
      if (p.leastChoice > 0) setLeast(id, { ...p, leastService: SERVICES.NONE, leastChoice: 0 });
      // set MOST with next rank
      const { top } = computeLists(prefs);
      setMost(id, { ...p, mostService: svc, mostChoice: top.length + 1 });
    } else {
      if (p.mostChoice > 0) setMost(id, { ...p, mostService: SERVICES.NONE, mostChoice: 0 });
      const { bottom } = computeLists(prefs);
      setLeast(id, { ...p, leastService: svc, leastChoice: bottom.length + 1 });
    }
  };

  return (
    <div className="container" style={{ marginTop: 12 }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", padding: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontWeight: 700 }}>Weekend:</label>
          <select
            value={id}
            onChange={(e) => setId(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 220 }}
          >
            {allWeekendIds.map((wid) => {
              const d = new Date(wid);
              const label = `${MONTH_FULL[d.getMonth()]} ${d.getDate()}`;
              return (
                <option key={wid} value={wid}>
                  {label}
                </option>
              );
            })}
          </select>

          <label style={{ fontWeight: 700 }}>Service:</label>
          <select
            value={svc}
            onChange={(e) => setSvc(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 140 }}
          >
            <option value={SERVICES.NONE}>— Select —</option>
            {avail.includes(SERVICES.RNI) && <option value={SERVICES.RNI}>RNI</option>}
            {avail.includes(SERVICES.COA) && <option value={SERVICES.COA}>COA</option>}
          </select>

          <button style={btn(false)} onClick={() => add("MOST")} disabled={submitted || !requireName}>
            Add to MOST
          </button>
          <button style={btn(true)} onClick={() => add("LEAST")} disabled={submitted || !requireName}>
            Add to LEAST
          </button>
        </div>

        <div style={{ marginTop: 12, ...tiny }}>
          Only open services are listed. Adding a weekend to Most clears it from Least (and vice versa). Ranks compact automatically.
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   RankBoard (clickable board)
   ────────────────────────────────────────────────────────────────────────── */
function RankBoard({ prefs, setMost, setLeast, requireName, submitted }) {
  const card = (w) => {
    const avail = availabilityByWeekend[w.d] || [];
    return (
      <div key={w.d} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, background: "#fff" }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{w.label}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {avail.map((svc) => (
            <button
              key={svc}
              disabled={submitted || !requireName}
              onClick={() => {
                const p = prefs[w.d] || {
                  mostService: SERVICES.NONE,
                  mostChoice: 0,
                  leastService: SERVICES.NONE,
                  leastChoice: 0,
                };
                // toggle logic: click once → add to MOST next rank; shift-click → add to LEAST next rank
                const shift = window.event && window.event.shiftKey;
                if (!shift) {
                  if (p.leastChoice > 0) setLeast(w.d, { ...p, leastService: SERVICES.NONE, leastChoice: 0 });
                  const { top } = computeLists(prefs);
                  setMost(w.d, { ...p, mostService: svc, mostChoice: top.length + 1 });
                } else {
                  if (p.mostChoice > 0) setMost(w.d, { ...p, mostService: SERVICES.NONE, mostChoice: 0 });
                  const { bottom } = computeLists(prefs);
                  setLeast(w.d, { ...p, leastService: svc, leastChoice: bottom.length + 1 });
                }
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                cursor: submitted || !requireName ? "not-allowed" : "pointer",
                fontSize: 12,
              }}
              title="Click = MOST, Shift+Click = LEAST"
            >
              {svc}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Jan–Apr</div>
          <div style={{ display: "grid", gap: 10 }}>
            {["01", "02", "03", "04"].flatMap((mk) => months[mk]).map(card)}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>May–Aug</div>
          <div style={{ display: "grid", gap: 10 }}>
            {["05", "06", "07", "08"].flatMap((mk) => months[mk]).map(card)}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Sep–Dec</div>
          <div style={{ display: "grid", gap: 10 }}>
            {["09", "10", "11", "12"].flatMap((mk) => months[mk]).map(card)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, ...tiny }}>Tip: Click = add to MOST; Shift+Click = add to LEAST.</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Command Palette (⌘/Ctrl-K)
   ────────────────────────────────────────────────────────────────────────── */
function CommandPalette({ open, setOpen, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    function onKey(e) {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      if ((isMac && e.metaKey && e.key === "k") || (!isMac && e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (!open) return null;
  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 200,
      }}
    >
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 560, background: "#fff", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.25)", overflow: "hidden" }}
      >
        <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb", fontWeight: 800 }}>Command Palette</div>
        <div style={{ padding: 8, display: "grid", gap: 6 }}>
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => {
                setOpen(false);
                a.run();
              }}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div style={{ padding: 8, ...tiny, textAlign: "right" }}>Esc to close • ⌘/Ctrl-K to open</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main App
   ────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("Authenticating…");
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [submitted, setSubmitted] = useState(false);

  // shared prefs across all modes
  const [prefs, setPrefs] = useState(() => {
    const raw = localStorage.getItem("prefs_v13");
    return raw ? JSON.parse(raw) : initEmptyPrefs();
  });
  useEffect(() => {
    localStorage.setItem("prefs_v13", JSON.stringify(prefs));
  }, [prefs]);

  // collapsed months (default collapsed)
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(MONTH_KEYS.map((mk) => [mk, true]))
  );

  // UI mode
  const params = new URLSearchParams(window.location.search);
  const ui = params.get("ui") || "calendar"; // "calendar" | "drag" | "quick" | "rank"
  const isAdmin = params.get("admin") === "1";

  // Firebase badge
  const [fbOK, setFbOK] = useState(null); // null = pending, true ok, false fail

  // auth
  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
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

  const profileDocRef = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsDocRef = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  // load profile + prefs
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
            const remapped = {};
            for (const [k, v] of Object.entries(d.preferences || {})) {
              remapped[k] = {
                mostService: v.mostService ?? SERVICES.NONE,
                mostChoice: v.mostChoice ?? v.mostRank ?? 0,
                leastService: v.leastService ?? SERVICES.NONE,
                leastChoice: v.leastChoice ?? v.leastRank ?? 0,
              };
            }
            setPrefs((old) => normalizeRanks({ ...old, ...remapped }));
          }
        }
        setStatus("Ready.");
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
      }
    })();
  }, [uid]);

  // Firebase badge check (auth ok + a harmless read)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!uid) return;
        await getDoc(profileDocRef(uid)); // if this succeeds, we’re connected
        if (!cancelled) setFbOK(true);
      } catch {
        if (!cancelled) setFbOK(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const saveProfile = async (next) => {
    setProfile(next);
    if (!uid) return;
    await setDoc(profileDocRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  };

  // Setting helpers that enforce constraints and re-compact ranks
  const setMost = useCallback((id, v) => {
    setPrefs((prev) => {
      const pv = prev[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
      // if setting MOST, clear LEAST for this id
      let merged = { ...prev, [id]: { ...pv, mostService: v.mostService, mostChoice: v.mostChoice, leastService: pv.leastService, leastChoice: pv.leastChoice } };
      if (v.mostChoice > 0 && pv.leastChoice > 0) {
        merged[id].leastService = SERVICES.NONE;
        merged[id].leastChoice = 0;
      }
      return normalizeRanks(merged);
    });
  }, []);
  const setLeast = useCallback((id, v) => {
    setPrefs((prev) => {
      const pv = prev[id] || { mostService: SERVICES.NONE, mostChoice: 0, leastService: SERVICES.NONE, leastChoice: 0 };
      // if setting LEAST, clear MOST for this id
      let merged = { ...prev, [id]: { ...pv, leastService: v.leastService, leastChoice: v.leastChoice, mostService: pv.mostService, mostChoice: pv.mostChoice } };
      if (v.leastChoice > 0 && pv.mostChoice > 0) {
        merged[id].mostService = SERVICES.NONE;
        merged[id].mostChoice = 0;
      }
      return normalizeRanks(merged);
    });
  }, []);

  // Export/submit
  const { top: topList, bottom: bottomList } = useMemo(() => computeLists(prefs), [prefs]);
  const downloadMyCSV = () => {
    const rows = [
      ...topList.map((t) => ({ attendee: profile.name, email: profile.email || "", kind: "MOST", choice: t.choice, service: t.service, weekend: t.label })),
      ...bottomList.map((b) => ({ attendee: profile.name, email: profile.email || "", kind: "LEAST", choice: b.choice, service: b.service, weekend: b.label })),
    ];
    const fn = submitted ? `preferences_${profile.name || "attending"}.csv` : `preferences_preview_${profile.name || "attending"}.csv`;
    downloadCSV(fn, rows);
  };
  const downloadMyWord = () => {
    const html = docHtml(profile.name, profile.email, topList, bottomList);
    const fn = submitted ? `preferences_${profile.name || "attending"}.doc` : `preferences_preview_${profile.name || "attending"}.doc`;
    downloadBlob(fn, "application/msword", html);
  };
  const handleSubmit = async () => {
    if (!uid || !profile.name) {
      alert("Select your name first.");
      return;
    }
    // ensure Least always has a service when chosen
    const badLeast = Object.values(prefs).some((p) => p.leastChoice > 0 && p.leastService === SERVICES.NONE);
    if (badLeast) {
      alert("For every “Least” choice, please select a service (RNI or COA).");
      return;
    }
    await setDoc(
      prefsDocRef(uid),
      {
        name: profile.name,
        email: profile.email || "",
        preferences: prefs,
        top10: topList.map((t) => ({ weekend: t.weekend, choice: t.choice, rank: t.choice, service: t.service })),
        bottom10: bottomList.map((b) => ({ weekend: b.weekend, choice: b.choice, rank: b.choice, service: b.service })),
        submitted: true,
        submittedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    setSubmitted(true);
    alert("Preferences submitted. Downloads now reflect your final locked choices.");
  };

  // Live preview panel
  const LivePreview = () => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "#fff",
        padding: 12,
        minWidth: 280,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Live Preview</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Most</div>
          <div style={{ display: "grid", gap: 6 }}>
            {topList.length === 0 && <div style={tiny}>— none —</div>}
            {topList.map((t) => (
              <div key={`pvM-${t.weekend}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ padding: "2px 6px", borderRadius: 6, background: "#d1fae5", border: "1px solid #10b98133", fontSize: 12 }}>
                  #{t.choice}
                </span>
                <span style={{ fontSize: 12 }}>{t.label} — {t.service}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Least</div>
          <div style={{ display: "grid", gap: 6 }}>
            {bottomList.length === 0 && <div style={tiny}>— none —</div>}
            {bottomList.map((t) => (
              <div key={`pvL-${t.weekend}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ padding: "2px 6px", borderRadius: 6, background: "#fee2e2", border: "1px solid #ef444433", fontSize: 12 }}>
                  #{t.choice}
                </span>
                <span style={{ fontSize: 12 }}>{t.label} — {t.service}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8, ...tiny }}>
        {profile.name ? (
          <>
            Logged in as <b>{profile.name}</b> {profile.email ? `• ${profile.email}` : ""} {submitted ? "• (Locked)" : ""}
          </>
        ) : (
          "Select your name to start."
        )}
      </div>
    </div>
  );

  // Top sticky bar (mode switch, firebase badge, collapse/expand, preview buttons)
  const [cmdOpen, setCmdOpen] = useState(false);
  const goto = (m) => {
    const u = new URL(window.location.href);
    u.searchParams.set("ui", m);
    window.location.assign(u.toString());
  };
  const collapseAll = (val) => setCollapsed(Object.fromEntries(MONTH_KEYS.map((k) => [k, val])));

  const actions = [
    { key: "mode_calendar", label: "Mode: Calendar", run: () => goto("calendar") },
    { key: "mode_drag", label: "Mode: DragBuckets", run: () => goto("drag") },
    { key: "mode_quick", label: "Mode: QuickAdd", run: () => goto("quick") },
    { key: "mode_rank", label: "Mode: RankBoard", run: () => goto("rank") },
    { key: "collapse", label: "Collapse All Months", run: () => collapseAll(true) },
    { key: "expand", label: "Expand All Months", run: () => collapseAll(false) },
    { key: "csv", label: "Preview CSV", run: () => downloadMyCSV() },
    { key: "word", label: "Preview Word", run: () => downloadMyWord() },
    { key: "submit", label: "Submit Final Preferences", run: () => handleSubmit() },
  ];

  // Identity picker + requested/claimed/left
  const AttendingIdentity = () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 700 }}>Your name:</label>
      <select
        value={profile.name}
        onChange={(e) =>
          saveProfile({
            ...profile,
            name: e.target.value,
            email: ATTENDINGS.find((a) => a.name === e.target.value)?.email || profile.email,
          })
        }
        style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 220, fontSize: 14 }}
      >
        <option value="">— Select —</option>
        {ATTENDINGS.map((a) => (
          <option key={a.name} value={a.name}>
            {a.name}
          </option>
        ))}
      </select>

      <label style={{ fontSize: 14, fontWeight: 700, marginLeft: 8 }}>Email (optional):</label>
      <input
        type="email"
        value={profile.email}
        placeholder="you@uab.edu"
        onChange={(e) => saveProfile({ ...profile, email: e.target.value })}
        style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 8, minWidth: 260, fontSize: 14 }}
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
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{profile.name}</div>
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
              <div style={{ fontSize: 13, color: "#7c2d12", background: "#ffedd5", border: "1px solid #fed7aa", borderRadius: 10, padding: "8px 10px" }}>
                Target numbers for “{profile.name}” are not set yet.
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );

  return (
    <div className="page">
      {/* Sticky bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,.9)",
          backdropFilter: "saturate(180%) blur(4px)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div className="container" style={{ padding: "8px 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Mode switcher */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={btn(ui !== "calendar")} onClick={() => goto("calendar")}>
              Calendar
            </button>
            <button style={btn(ui !== "drag")} onClick={() => goto("drag")}>
              DragBuckets
            </button>
            <button style={btn(ui !== "quick")} onClick={() => goto("quick")}>
              QuickAdd
            </button>
            <button style={btn(ui !== "rank")} onClick={() => goto("rank")}>
              RankBoard
            </button>
          </div>

          {/* Spacer */}
          <span style={{ flex: 1 }} />

          {/* Firebase badge */}
          <span
            title="Firebase connectivity"
            style={
              fbOK === null
                ? badge("#fef3c7", "#92400e", "#f59e0b")
                : fbOK
                ? badge("#dcfce7", "#065f46", "#22c55e")
                : badge("#fee2e2", "#7f1d1d", "#ef4444")
            }
          >
            Firebase: {fbOK === null ? "…" : fbOK ? "✓" : "✕"}
          </span>

          {/* Collapse/expand */}
          <button onClick={() => collapseAll(true)} style={btn(true)}>
            Collapse all
          </button>
          <button onClick={() => collapseAll(false)} style={btn(true)}>
            Expand all
          </button>

          {/* Preview buttons inline */}
          <button onClick={downloadMyCSV} style={btn(true)}>
            Preview CSV
          </button>
          <button onClick={downloadMyWord} style={btn(true)}>
            Preview Word
          </button>

          {/* Command palette */}
          <button onClick={() => setCmdOpen(true)} style={btn(true)} title="⌘/Ctrl-K">
            ◦ Command
          </button>
        </div>
      </div>

      {/* Header + instructions + identity */}
      <div className="container" style={{ padding: "16px 12px 0" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1f2937", marginBottom: 6 }}>2026 Preferences (RNI & COA)</h1>
        <ol style={{ margin: "8px 0 12px", paddingLeft: 20, color: "#334155", fontSize: 14, lineHeight: 1.5, listStyle: "decimal" }}>
          <li>Select your name below. You will see the number of weekends you wanted.</li>
          <li>
            Expand months as needed to choose as many <b>Most</b> and <b>Least</b> preferred weekends as you need to. For each, select <b>service</b> and{" "}
            <b>choice #</b>.
          </li>
          <li>You can download a preview anytime.</li>
          <li>Submit to lock your preferences once you are done.</li>
        </ol>
        <div style={{ fontSize: 13, color: "#0f5132", background: "#d1e7dd", border: "1px solid #badbcc", padding: "10px 12px", borderRadius: 10, marginBottom: 10 }}>
          Aim for a balanced spread of <b>COA</b> and <b>RNI</b> on your “Most” list when possible. This is a <b>ranking</b> process; selecting more weekends
          increases the chance you receive more of your preferred weekends overall.
        </div>
        <div style={{ marginBottom: 8, ...tiny }}>
          Status: {status} • Most choices: {computeLists(prefs).top.length} • Least choices: {computeLists(prefs).bottom.length}{" "}
          {submitted ? "• (Locked after submission)" : ""}
        </div>
        <AttendingIdentity />
      </div>

      {/* Main area: mode content + live preview aligned */}
      <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        <div>
          {ui === "calendar" && (
            <CalendarGrid
              prefs={prefs}
              setMost={setMost}
              setLeast={setLeast}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              submitted={submitted}
            />
          )}
          {ui === "drag" && (
            <DragBuckets prefs={prefs} setMost={setMost} setLeast={setLeast} requireName={Boolean(profile?.name)} submitted={submitted} />
          )}
          {ui === "quick" && (
            <QuickAdd prefs={prefs} setMost={setMost} setLeast={setLeast} requireName={Boolean(profile?.name)} submitted={submitted} />
          )}
          {ui === "rank" && (
            <RankBoard prefs={prefs} setMost={setMost} setLeast={setLeast} requireName={Boolean(profile?.name)} submitted={submitted} />
          )}

          {/* Submit */}
          <div style={{ padding: "0 0 18px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <button
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: submitted || !profile.name ? "1px solid #d1d5db" : "1px solid #2563eb",
                background: submitted || !profile.name ? "#e5e7eb" : "#2563eb",
                color: submitted || !profile.name ? "#6b7280" : "#ffffff",
                fontWeight: 800,
                cursor: submitted || !profile.name ? "not-allowed" : "pointer",
              }}
              disabled={!profile.name || submitted}
              onClick={handleSubmit}
            >
              {submitted ? "Submitted (Locked)" : "Submit Final Preferences"}
            </button>
            <span style={tiny}>{submitted ? "Locked. Downloads reflect your final choices." : "Tip: use Preview CSV/Word to save your current selections."}</span>
          </div>

          <div style={{ textAlign: "right", color: "#64748b", fontSize: 12, paddingBottom: 24 }}>Build: {__APP_VERSION__}</div>
        </div>

        <LivePreview />
      </div>

      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} actions={actions} />
    </div>
  );
}
