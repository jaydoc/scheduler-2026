import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
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

/* =============================
   Build tag
   ============================= */
const __APP_VERSION__ = "v13.0 – four modes, drag fix, counters normalize, centered bands";

/* =============================
   Firebase config with safe fallback
   ============================= */
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

const appId = typeof __app_id !== "undefined" ? __app_id : "attending-scheduler-v13";
const YEAR = 2026;
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };

/* Firebase init */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =============================
   Attendings + limits panel
   ============================= */
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

/* =============================
   Calendar data (Saturdays only)
   Names bolded on assigned services
   ============================= */
const MONTH_KEYS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const MONTH_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// Note: day label shows Sat or holiday span; date is the Saturday ISO.
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
    { day: "7", date: "2026-03-07", rni: "Ambal", coa: "Arora" },
    { day: "14", date: "2026-03-14", rni: null, coa: "Winter" },
    { day: "21", date: "2026-03-21", rni: "Ambal", coa: "Arora" },
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
    { day: "6", date: "2026-06-06", rni: "Schuyler", coa: "Winter" },
    { day: "13", date: "2026-06-13", rni: "Boone", coa: null },
    { day: "19-21", date: "2026-06-19", rni: "Schuyler", coa: "Winter", detail: "Juneteenth Day" },
    { day: "27", date: "2026-06-27", rni: "Boone", coa: null },
  ],
  "07": [
    { day: "4-6", date: "2026-07-04", rni: "Jain", coa: "Carlo", detail: "4th of July" },
    { day: "11", date: "2026-07-11", rni: null, coa: "Willis" },
    { day: "18", date: "2026-07-18", rni: null, coa: null },
    { day: "25", date: "2026-07-25", rni: "Shukla", coa: "Willis" },
  ],
  "08": [
    { day: "1", date: "2026-08-01", rni: "Boone", coa: null },
    { day: "8", date: "2026-08-08", rni: "Sims", coa: "Carlo" },
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
    { day: "3", date: "2026-10-03", rni: "Kandasamy", coa: "Carlo" },
    { day: "10", date: "2026-10-10", rni: "Travers", coa: "Bhatia" },
    { day: "17", date: "2026-10-17", rni: "Kandasamy", coa: null },
    { day: "24", date: "2026-10-24", rni: "Travers", coa: "Bhatia" },
    { day: "31", date: "2026-10-31", rni: "Kandasamy", coa: "Carlo" },
  ],
  "11": [
    { day: "7", date: "2026-11-07", rni: "Ambal", coa: null },
    { day: "14", date: "2026-11-14", rni: "Bhatia", coa: null },
    { day: "21", date: "2026-11-21", rni: "Ambal", coa: null },
    { day: "26-28", date: "2026-11-26", rni: "Bhatia", coa: null, detail: "Thanksgiving" },
  ],
  "12": [
    { day: "5", date: "2026-12-05", rni: "Travers", coa: "Kandasamy" },
    { day: "12", date: "2026-12-12", rni: null, coa: null },
    { day: "19", date: "2026-12-19", rni: "Travers", coa: "Kandasamy" },
    { day: "24-28", date: "2026-12-24", rni: "Bhatia", coa: "Arora", detail: "Christmas" },
    { day: "31-Jan 4", date: "2026-12-31", rni: "Kane", coa: "Kandasamy", detail: "New Year" },
  ],
};

const allWeekendIds = Object.values(months).flat().map((w) => w.date);
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

/* =============================
   Helpers
   ============================= */
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
const monthOf = (id) => id.slice(5, 7);
const monthIdx = (id) => parseInt(monthOf(id), 10) - 1;
const labelForWeekend = (id) => {
  const mk = monthIdx(id);
  const day = id.slice(8, 10); // Saturday day
  return `${MONTH_FULL[mk]} ${parseInt(day, 10)}`;
};

function normalizeRanks(prefsIn) {
  // Re-number choices from 1..N by order of selection for both Most and Least, per user state.
  // We’ll order by current choice then by calendar order; absent choice => 0
  const order = (id) => allWeekendIds.indexOf(id);

  const most = Object.entries(prefsIn)
    .filter(([, p]) => p.mostService !== SERVICES.NONE && p.mostChoice > 0)
    .map(([id, p]) => ({ id, svc: p.mostService, choice: p.mostChoice }))
    .sort((a, b) => a.choice - b.choice || order(a.id) - order(b.id));

  const least = Object.entries(prefsIn)
    .filter(([, p]) => p.leastService !== SERVICES.NONE && p.leastChoice > 0)
    .map(([id, p]) => ({ id, svc: p.leastService, choice: p.leastChoice }))
    .sort((a, b) => a.choice - b.choice || order(a.id) - order(b.id));

  const next = { ...prefsIn };
  most.forEach((row, i) => {
    const p = next[row.id] || {};
    p.mostChoice = i + 1;
    next[row.id] = p;
  });
  least.forEach((row, i) => {
    const p = next[row.id] || {};
    p.leastChoice = i + 1;
    next[row.id] = p;
  });
  return next;
}

function enforceMutualExclusion(prefsIn, id, where, svc) {
+0262 |   // Global exclusivity per date:
+0263 |   // - You can't have the same date in both Most and Least.
+0264 |   // - You can't pick both services on the same date (because only one bucket may be populated).
+0265 |   const p = { ...(prefsIn[id] || {}) };
+0266 |   if (where === "most") {
+0267 |     p.mostService = svc;
+0268 |     if (svc === SERVICES.NONE) {
+0269 |       p.mostChoice = 0;
+0270 |     } else {
+0271 |       // Choosing a Most value clears any Least selection for that date.
+0272 |       p.leastService = SERVICES.NONE;
+0273 |       p.leastChoice = 0;
+0274 |     }
+0275 |   } else {
+0276 |     p.leastService = svc;
+0277 |     if (svc === SERVICES.NONE) {
+0278 |       p.leastChoice = 0;
+0279 |     } else {
+0280 |       // Choosing a Least value clears any Most selection for that date.
+0281 |       p.mostService = SERVICES.NONE;
+0282 |       p.mostChoice = 0;
+0283 |     }
+0284 |   }
+0285 |   const out = { ...prefsIn, [id]: p };
+0286 |   return normalizeRanks(out);
}

function setChoiceNumber(prefsIn, id, where, n) {
  // When setting an explicit number from UI, normalize after
  const p = { ...(prefsIn[id] || {}) };
  if (where === "most") {
    p.mostChoice = n;
  } else {
    p.leastChoice = n;
  }
  const out = { ...prefsIn, [id]: p };
  return normalizeRanks(out);
}

/* =============================
   CSV / Word export
   ============================= */
function arrayToCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
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
  downloadBlob(filename, "text/csv;charset=utf-8;", arrayToCSV(rows));
}
function docHtml(name, email, top, bottom) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g,>/g, "&gt;");
  const row = (kind, r) => `
    <tr>
	<td>${esc(kind)}</td>
	<td>${esc(r.choice)}</td>
	<td>${esc(r.service || "")}</td>
	<td>${esc(labelForWeekend(r.weekend))}</td>
</tr>`;
  return `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
	<head>
		<meta charset="utf-8">
			<title>Preferences</title>
		</head>
		<body>
			<h2>2026 Weekend Preferences</h2>
			<p>
				<b>Name:</b> ${esc(name || "")} &nbsp; <b>Email:</b> ${esc(email || "")}</p>
			<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;">
				<thead style="background:#f3f4f6">
					<tr>
						<th>Kind</</th>
						<th>Choice #</th>
						<th>Service</th>
						<th>Weekend</th>
					</tr>
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

/* =============================
   UI Components (shared)
   ============================= */
const BarButton = ({ onClick, children, kind = "plain", title }) => {
  const styles = {
    plain: { border: "1px solid #e5e7eb", background: "#fff", color: "#111827" },
    green: { border: "1px solid #059669", background: "#10b981", color: "#fff" },
    indigo: { border: "1px solid #4f46e5", background: "#6366f1", color: "#fff" },
    blue: { border: "1px solid #2563eb", background: "#3b82f6", color: "#fff" },
  };
  const base = {
    padding: "6px 10px",
    borderRadius: 10,
    fontSize: 12,
    whiteSpace: "nowrap",
  };
  return (
    <button title={title} onClick={onClick} style={{ ...base, ...styles[kind] }}> {children}
</button>
  );
};

const Pill = ({ children, bg = "#f1f5f9", fg = "#0f172a" }) => (
  <span className="pill" style={{ background: bg, color: fg }}> {children}
</span>
);

/* =============================
   Identity block
   ============================= */
function Identity({ profile, saveProfile }) {
  return (
    <div className="id-row">
	<label className="id-label">Your name:</label>
	<select value={profile.name} onChange={(e)=>
          saveProfile({
            ...profile,
            name: e.target.value,
            email:
              ATTENDINGS.find((a) => a.name === e.target.value)?.email ||
              profile.email,
          })
        }
        className="id-select"
      >
        <option value="">— Select —</option>
        {ATTENDINGS.map((a) => (
          <option key={a.name} value={a.name}> {a.name}
	</option>
        ))}
      </select>
<label className="id-label" style={{ marginLeft: 8 }}> Email (optional):
</label>
<input type="email" value={profile.email} placeholder="you@uab.edu" onChange={(e)=> saveProfile({ ...profile, email: e.target.value })}
        className="id-input"
      />

      {profile.name && (
        <div style={{ marginTop: 8, width:"100%" }}> {(()=> {
            const m = ATTENDING_LIMITS[profile.name];
            return m ? (
              <div className="limits-card">
			<div className="limits-name">{profile.name}</div>
			<div className="limits-line">
				<b>Total weekends requested:</b> {m.requested}
                </div>
			<div className="limits-line">
				<b>Assignments already claimed:</b> {m.claimed}
                </div>
			<div className="limits-line">
				<b>Assignments left to be picked:</b> {m.left}
                </div>
		</div>
            ) : (
              <div className="limits-warn">
                Target numbers for “{profile.name}” are not set yet.
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* =============================
   Live Preview (always consistent)
   ============================= */
function LivePreview({ prefs }) {
  const order = (id) => allWeekendIds.indexOf(id);
  const most = Object.entries(prefs)
    .filter(([, p]) => p.mostService !== SERVICES.NONE && p.mostChoice > 0)
    .map(([id, p]) => ({ id, svc: p.mostService, choice: p.mostChoice }))
    .sort((a, b) => a.choice - b.choice || order(a.id) - order(b.id));
  const least = Object.entries(prefs)
    .filter(([, p]) => p.leastService !== SERVICES.NONE && p.leastChoice > 0)
    .map(([id, p]) => ({ id, svc: p.leastService, choice: p.leastChoice }))
    .sort((a, b) => a.choice - b.choice || order(a.id) - order(b.id));

  return (
    <div className="live-card">
	<div className="live-title">Live Preview</div>
	<div className="live-columns">
		<div className="live-col">
			<div className="live-col-title">Most</div>
          {most.length === 0 && <div className="live-empty">— None —</div>}
          {most.map((r) => (
            <div key={`m-${r.id}`} className="live-row">
				<span className="live-choice">#{r.choice}</span>
				<span>{labelForWeekend(r.id)}</span>
				<Pill bg="#dbeafe" fg="#1e3a8a">{r.svc}</Pill>
			</div>
          ))}
        </div>
		<div className="live-col">
			<div className="live-col-title">Least</div>
          {least.length === 0 && <div className="live-empty">— None —</div>}
          {least.map((r) => (
            <div key={`l-${r.id}`} className="live-row">
				<span className="live-choice">#{r.choice}</span>
				<span>{labelForWeekend(r.id)}</span>
				<Pill bg="#e0e7ff" fg="#3730a3">{r.svc}</Pill>
			</div>
          ))}
        </div>
	</div>
</div>
  );
}

/* =============================
   Mode 1: Calendar (canonical)
   ============================= */
const MONTH_COLORS = [
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

function ChoiceSelect({ value, onChange, disabled, placeholder, maxN }) {
  const MAX = Math.max(10, maxN || 10);
  return (
    <select disabled={disabled} value={String(value || 0)} onChange={(e)=> onChange(parseInt(e.target.value, 10))}
      className="select"
    >
      <option value="0">{placeholder}</option>
      {Array.from({ length: MAX }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}> {n}
</option>
      ))}
    </select>
  );
}

function RadioServiceLimited({ available, value, onChange, disabled, name }) {
  return (
    <div className="radio-row">
      {available.includes(SERVICES.RNI) && (
        <label className="radio-label">
		<input type="radio" disabled={disabled} checked={value=== SERVICES.RNI}onChange={()=> onChange(SERVICES.RNI)}
            name={name}
          />
          RNI
        </label>
      )}
      {available.includes(SERVICES.COA) && (
        <label className="radio-label">
			<input type="radio" disabled={disabled} checked={value=== SERVICES.COA}onChange={()=> onChange(SERVICES.COA)}
            name={name}
          />
          COA
        </label>
      )}
    </div>
  );
}

function MonthCard({
  mk,
  label,
  items,
  prefs,
  onMostChange,
  onLeastChange,
  collapsed,
  onToggle,
  submitted,
}) {
  const idx = parseInt(mk, 10) - 1;
  const color = MONTH_COLORS[idx] ?? { bg: "#eeeeee", fg: "#111111", border: "#cccccc" };
  return (
    <div id={`month-${mk}`} className="month-card">
			<button className="month-head" style={{ background: color.bg, color: color.fg, borderBottom: `2px solid ${color.border}` }} onClick={onToggle} title="Collapse/expand">
				<span>{label}</span>
				<span className="caret">{collapsed ? "▸" : "▾"}</span>
			</button>
      {!collapsed && (
        <div className="month-body">
          {items.map((w) => {
            const p = prefs[w.date] || {
              mostService: SERVICES.NONE,
              mostChoice: 0,
              leastService: SERVICES.NONE,
              leastChoice: 0,
            };
            const rniOpen = w.rni === null;
            const coaOpen = w.coa === null;
            const fullyAssigned = !rniOpen && !coaOpen;
            const available = [];
            if (rniOpen) available.push(SERVICES.RNI);
            if (coaOpen) available.push(SERVICES.COA);

            return (
              <div key={w.date} className="week-row" style={{ background: fullyAssigned ?"#f9fafb" :"#fff" , opacity: fullyAssigned ? 0.85 : 1 }}>
				<div className="week-top">
					<div className="week-day">{w.day}</div>
                  {w.detail && <Pill bg="#fff7ed" fg="#c2410c">{w.detail}</Pill>}
                </div>
				<div className="assign-line">
					<span className="assign-pill" style={{ background: rniOpen ?"#dbeafe" :"#e5e7eb" , color: rniOpen ?"#1e3a8a" :"#111827" }}> RNI: {rniOpen ?"OPEN" :
					<strong style={{ fontSize: 15 }}>{w.rni}< strong>}
				</span>
				<span className="assign-pill" style={{ background: coaOpen ?"#e0e7ff" :"#e5e7eb" , color: coaOpen ?"#3730a3" :"#111827" }}> COA: {coaOpen ?"OPEN" :
				<strong style={{ fontSize: 15 }}>{w.coa}< strong>}
			</span>
		</div>

                {!fullyAssigned ? (
                  <div className="rank-block" style={{ opacity: submitted ? 0.6 : 1, pointerEvents: submitted ?"none" :"auto" }}>
		<div className="rank-card">
			<div className="rank-title">Most (service + choice)</div>
			<div className="rank-row">
				<RadioServiceLimited available={available} disabled={submitted} value={available.includes(p.mostService) ? p.mostService : SERVICES.NONE} onChange={(svc)=> onMostChange(w.date, { ...p, mostService: svc })}
                          name={`most-${w.date}`}
                        />
                        <ChoiceSelect disabled={submitted || available.length===0 || p.mostService===SERVICES.NONE} value={p.mostChoice || 0} onChange={(choice)=> onMostChange(w.date, { ...p, mostChoice: choice })}
                          placeholder="Most choice…"
                          maxN={allWeekendIds.length}
                        />
                        {p.mostService === SERVICES.NONE && p.mostChoice > 0 && (
                          <Pill bg="#fff7ed" fg="#b45309">Pick a service for Most</Pill>
                        )}
                        {p.mostService !== SERVICES.NONE && p.mostChoice > 0 && (
                          <Pill bg="#d1fae5" fg="#065f46">Most #{p.mostChoice}</Pill>
                        )}
                      </div>
				</div>
				<div className="rank-card">
					<div className="rank-title">Least (service + choice)</div>
					<div className="rank-row">
						<RadioServiceLimited available={available} disabled={submitted} value={available.includes(p.leastService) ? p.leastService : SERVICES.NONE} onChange={(svc)=> onLeastChange(w.date, { ...p, leastService: svc })}
                          name={`least-${w.date}`}
                        />
                        <ChoiceSelect disabled={submitted || available.length===0 || p.leastService===SERVICES.NONE} value={p.leastChoice || 0} onChange={(choice)=> onLeastChange(w.date, { ...p, leastChoice: choice })}
                          placeholder="Least choice…"
                          maxN={allWeekendIds.length}
                        />
                        {p.leastService === SERVICES.NONE && p.leastChoice > 0 && (
                          <Pill bg="#fff7ed" fg="#b45309">Pick a service for Least</Pill>
                        )}
                        {p.leastService !== SERVICES.NONE && p.leastChoice > 0 && (
                          <Pill bg="#ffe4e6" fg="#9f1239">Least #{p.leastChoice}</Pill>
                        )}
                      </div>
						</div>
					</div>
                ) : (
                  <div className="full-badge">FULLY ASSIGNED — NO RANKING AVAILABLE</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarMode({ prefs, setMost, setLeast, collapsed, setCollapsed, submitted }) {
  return (
    <div className="grid-2x6">
      {MONTH_KEYS.map((mk, i) => (
        <MonthCard key={mk} mk={mk} label={`${MONTH_FULL[i]} ${YEAR}`} items={months[mk]} prefs={prefs} onMostChange={(id, v)=> setMost(id, v)}
          onLeastChange={(id, v) => setLeast(id, v)}
          collapsed={collapsed[mk]}
          submitted={submitted}
          onToggle={() => setCollapsed((c) => ({ ...c, [mk]: !c[mk] }))}
        />
      ))}
    </div>
  );
}

/* =============================
   Mode 2: QuickAdd
   - Fast entry from January onward
   - Service required for both Most/Least
   ============================= */
function QuickAdd({ prefs, setPrefs, requireName }) {
  const [month, setMonth] = useState("01");
  const [date, setDate] = useState(allWeekendIds.find((id) => monthOf(id) === "01") || "");
  const [svc, setSvc] = useState(SERVICES.RNI);
  const [bucket, setBucket] = useState("most"); // "most" | "least"
+0720 |     // Disallow using the same date in both buckets; force the user to remove first.
+0721 |     const existing = prefs[date] || {};
+0722 |     if (bucket === "most" && existing.leastService !== SERVICES.NONE && existing.leastChoice > 0) {
+0723 |       alert("This Saturday is already in your Least list. Remove it from Least before adding to Most.");
+0724 |       return;
+0725 |     }
+0726 |     if (bucket === "least" && existing.mostService !== SERVICES.NONE && existing.mostChoice > 0) {
+0727 |       alert("This Saturday is already in your Most list. Remove it from Most before adding to Least.");
+0728 |       return;
+0729 |     }

  useEffect(() => {
    // when month changes, pick first weekend in that month
    const first = allWeekendIds.find((id) => monthOf(id) === month);
    setDate(first || "");
  }, [month]);

  const apply = () => {
    if (!requireName) return;
    if (!date) return;
    const avail = availabilityByWeekend[date] || [];
    if (!avail.includes(svc)) {
      alert("That service is not available on this weekend.");
      return;
    }
    setPrefs((prev) => {
      const out = { ...prev };
      const p = out[date] || {};
      if (bucket === "most") {
        // mutual exclusion
        p.mostService = svc;
        p.mostChoice = p.mostChoice > 0 ? p.mostChoice : 9999; // temp marker to push into list before normalize
		+0734 |         // hard-clear Least to guarantee single-bucket-per-date
+0735 |         if (svc !== SERVICES.NONE) { p.leastService = SERVICES.NONE; p.leastChoice = 0; }
      } else {
        p.leastService = svc;
        p.leastChoice = p.leastChoice > 0 ? p.leastChoice : 9999;
		+0739 |         // hard-clear Most to guarantee single-bucket-per-date
+0740 |         if (svc !== SERVICES.NONE) { p.mostService = SERVICES.NONE; p.mostChoice = 0; }
      }
      out[date] = p;
      return normalizeRanks(out);
    });
  };

  const remove = () => {
    if (!requireName) return;
    if (!date) return;
    setPrefs((prev) => {
      const p = prev[date] || {};
      if (bucket === "most") {
        p.mostService = SERVICES.NONE;
        p.mostChoice = 0;
      } else {
        p.leastService = SERVICES.NONE;
        p.leastChoice = 0;
      }
      const out = { ...prev, [date]: p };
      return normalizeRanks(out);
    });
  };

  return (
    <div className="mode-card">
				<div className="mode-title">QuickAdd</div>
				<div className="mode-instructions">
        Pick Month → Saturday → Service → List, then “Add”. Use “Remove” to undo. Counters renumber automatically.
      </div>
				<div className="qa-row">
					<label>Month</label>
					<select className="select" value={month} onChange={(e)=> setMonth(e.target.value)}>
          {MONTH_KEYS.map((mk, i) => (
            <option key={mk} value={mk}>{MONTH_FULL[i]}</option> ))}
					</select>
					<label>Saturday</label>
					<select className="select" value={date} onChange={(e)=> setDate(e.target.value)}>
          {allWeekendIds.filter((id) => monthOf(id) === month).map((id) => (
            <option key={id} value={id}> {labelForWeekend(id)}
					</option>
          ))}
        </select>
				<label>Service</label>
				<select className="select" value={svc} onChange={(e)=> setSvc(e.target.value)}>
          <option value={SERVICES.RNI}>RNI</option>
					<option value={SERVICES.COA}>COA</option>
				</select>
				<label>List</label>
				<select className="select" value={bucket} onChange={(e)=> setBucket(e.target.value)}>
          <option value="most">Most</option>
					<option value="least">Least</option>
				</select>
				<BarButton kind="blue" onClick={apply} title="Add selection">Add</BarButton>
				<BarButton onClick={remove} title="Remove selection">Remove</BarButton>
			</div>
		</div>
  );
}

/* =============================
   Mode 3: RankBoard
   - Click = Most; Shift+Click = Least
   - Validates availability; renumbers after each change
   ============================= */
function RankBoard({ prefs, setPrefs, requireName }) {
  const [currentMonth, setCurrentMonth] = useState("01");

  const clickWeekend = (id, svc, isLeast) => {
    if (!requireName) return;
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) {
      alert("That service is not available on this weekend.");
      return;
    }
    setPrefs((prev) => {
      const p = { ...(prev[id] || {}) };
      if (isLeast) {
        p.leastService = svc;
        if (p.leastChoice === 0) p.leastChoice = 9999;
      } else {
        p.mostService = svc;
        if (p.mostChoice === 0) p.mostChoice = 9999;
      }
      const out = { ...prev, [id]: p };
      return normalizeRanks(out);
    });
  };

  return (
    <div className="mode-card">
			<div className="mode-title">RankBoard</div>
			<div className="mode-instructions">
        Click a weekend’s <b>RNI</b> or <b>COA</b> to add to <b>Most</b>. <b>Shift+Click</b> adds to <b>Least</b>. Click again on the same service to remove.
      </div>
			<div className="qa-row">
				<label>Month</label>
				<select className="select" value={currentMonth} onChange={(e)=> setCurrentMonth(e.target.value)}>
          {MONTH_KEYS.map((mk, i) => (
            <option key={mk} value={mk}>{MONTH_FULL[i]}</option> ))}
				</select>
			</div>
			<div className="rankboard-grid">
        {months[currentMonth].map((w) => {
          const p = prefs[w.date] || {};
          const avail = availabilityByWeekend[w.date] || [];
          const svcBtn = (svc, label) => {
            const activeMost = p.mostService === svc && p.mostChoice > 0;
            const activeLeast = p.leastService === svc && p.leastChoice > 0;
            const available = avail.includes(svc);
            const base = "rb-btn";
            const cls =
              !available ? `${base} rb-disabled` :
              activeMost ? `${base} rb-most` :
              activeLeast ? `${base} rb-least` :
              base;
            return (
              <button key={svc} className={cls} onClick={(e)=> {
                  if (!available) return;
                  const isLeast = e.shiftKey;
                  setPrefs((prev) => {
                    const cur = { ...(prev[w.date] || {}) };
                    if (isLeast) {
                      // toggle least
                      if (cur.leastService === svc && cur.leastChoice > 0) {
                        cur.leastService = SERVICES.NONE;
                        cur.leastChoice = 0;
                      } else {
                        cur.leastService = svc;
                        if (cur.leastChoice === 0) cur.leastChoice = 9999;
                      }
                    } else {
                      // toggle most
                      if (cur.mostService === svc && cur.mostChoice > 0) {
                        cur.mostService = SERVICES.NONE;
                        cur.mostChoice = 0;
                      } else {
                        cur.mostService = svc;
                        if (cur.mostChoice === 0) cur.mostChoice = 9999;
                      }
                    }
                    const out = { ...prev, [w.date]: cur };
                    return normalizeRanks(out);
                  });
                }}
              >
                {label}
              </button>
            );
          };

          return (
            <div key={w.date} className="rb-row">
					<div className="rb-date">
						<div className="rb-date-main">{labelForWeekend(w.date)}</div>
                {w.detail && <div className="rb-detail">{w.detail}</div>}
              </div>
					<div className="rb-actions">
						<span className="rb-badge">
                  RNI:&nbsp;
                  {w.rni === null ? svcBtn(SERVICES.RNI, "Open") : <b>{w.rni}</b>}
                </span>
						<span className="rb-badge">
                  COA:&nbsp;
                  {w.coa === null ? svcBtn(SERVICES.COA, "Open") : <b>{w.coa}</b>}
                </span>
					</div>
				</div>
          );
        })}
      </div>
		</div>
  );
}

/* =============================
   Mode 4: DragBuckets (fixed)
   - Source grouped by month, horizontal scroll
   - Most / Least start empty
   - Drag to add; drag back to Source (or click X) to remove
   - Validates availability; renumbers after any change
   ============================= */
function DragBuckets({ prefs, setPrefs, requireName }) {
  // Build source items: every weekend produces up to two draggables for available services
  const sourceByMonth = useMemo(() => {
    const m = {};
    MONTH_KEYS.forEach((mk) => {
      m[mk] = [];
      months[mk].forEach((w) => {
        const avail = availabilityByWeekend[w.date] || [];
        if (avail.includes(SERVICES.RNI))
          m[mk].push({ id: `${w.date}|RNI`, date: w.date, svc: SERVICES.RNI });
        if (avail.includes(SERVICES.COA))
          m[mk].push({ id: `${w.date}|COA`, date: w.date, svc: SERVICES.COA });
      });
    });
    return m;
  }, []);

  // Drag handling
  const dragDataRef = useRef(null);
  const onDragStart = (e, payload) => {
    if (!requireName) {
      e.preventDefault();
      return;
    }
    dragDataRef.current = payload; // {date, svc}
    e.dataTransfer.effectAllowed = "move";
  };
  const onDropTo = (where) => (e) => {
    e.preventDefault();
    const payload = dragDataRef.current;
    if (!payload) return;
    const { date, svc } = payload;
    const avail = availabilityByWeekend[date] || [];
    if (!avail.includes(svc)) {
      alert("That service is not available on this weekend.");
      return;
    }
    setPrefs((prev) => {
      const p = { ...(prev[date] || {}) };
      if (where === "source") {
        // remove from both lists if present
        if (p.mostService === svc) { p.mostService = SERVICES.NONE; p.mostChoice = 0; }
        if (p.leastService === svc) { p.leastService = SERVICES.NONE; p.leastChoice = 0; }
      } else if (where === "most") {
        p.mostService = svc;
        if (p.mostChoice === 0) p.mostChoice = 9999;
      } else {
        p.leastService = svc;
        if (p.leastChoice === 0) p.leastChoice = 9999;
      }
      const out = { ...prev, [date]: p };
      return normalizeRanks(out);
    });
    dragDataRef.current = null;
  };
  const allowDrop = (e) => e.preventDefault();

  const removeEntry = (where, date, svc) => {
    setPrefs((prev) => {
      const p = { ...(prev[date] || {}) };
      if (where === "most") {
        if (p.mostService === svc) { p.mostService = SERVICES.NONE; p.mostChoice = 0; }
      } else {
        if (p.leastService === svc) { p.leastService = SERVICES.NONE; p.leastChoice = 0; }
      }
      const out = { ...prev, [date]: p };
      return normalizeRanks(out);
    });
  };

  const mostList = Object.entries(prefs)
    .filter(([, p]) => p.mostService !== SERVICES.NONE && p.mostChoice > 0)
    .map(([id, p]) => ({ date: id, svc: p.mostService, choice: p.mostChoice }))
    .sort((a, b) => a.choice - b.choice || allWeekendIds.indexOf(a.date) - allWeekendIds.indexOf(b.date));

  const leastList = Object.entries(prefs)
    .filter(([, p]) => p.leastService !== SERVICES.NONE && p.leastChoice > 0)
    .map(([id, p]) => ({ date: id, svc: p.leastService, choice: p.leastChoice }))
    .sort((a, b) => a.choice - b.choice || allWeekendIds.indexOf(a.date) - allWeekendIds.indexOf(b.date));

  return (
    <div className="mode-card">
			<div className="mode-title">DragBuckets</div>
			<div className="mode-instructions">
        Drag from <b>Source</b> (left) to <b>Most</b> or <b>Least</b>. Drag back to <b>Source</b> or click ✕ to remove. Counters renumber automatically.
      </div>
			<div className="drag-wrap">
        {/* SOURCE (horizontal grouped by month) */}
        <div className="drag-source" onDragOver={allowDrop} onDrop={onDropTo("source" )}>
				<div className="drag-source-title">Source</div>
				<div className="drag-month-strip">
            {MONTH_KEYS.map((mk, i) => (
              <div key={mk} className="drag-month">
						<div className="drag-month-head">{MONTH_FULL[i]}</div>
						<div className="drag-month-body">
                  {sourceByMonth[mk].map((it) => (
                    <div key={it.id} className="chip" draggable onDragStart={(e)=> onDragStart(e, { date: it.date, svc: it.svc })}
                      title={`${labelForWeekend(it.date)} • ${it.svc}`}
                    >
                      <span className="chip-date">{labelForWeekend(it.date)}</span>
								<span className={`chip-svc ${it.svc==="RNI" ?"rni" :"coa" }`}>{it.svc}< span>
							</div>
                  ))}
                </div>
					</div>
            ))}
          </div>
			</div>

        {/* MOST */}
        <div className="drag-bucket" onDragOver={allowDrop} onDrop={onDropTo("most" )}>
			<div className="drag-bucket-head">Most</div>
			<div className="drag-bucket-body">
            {mostList.length === 0 && <div className="empty">Drop items here</div>}
            {mostList.map((r) => (
              <div key={`m-${r.date}`} className="row">
					<span className="row-choice">#{r.choice}</span>
					<span className="row-date">{labelForWeekend(r.date)}</span>
					<span className={`row-svc ${r.svc==="RNI" ?"rni" :"coa" }`}>{r.svc}< span>
					<button className="row-x" onClick={()=> removeEntry("most", r.date, r.svc)}>✕</button>
				</div>
            ))}
          </div>
		</div>

        {/* LEAST */}
        <div className="drag-bucket" onDragOver={allowDrop} onDrop={onDropTo("least" )}>
		<div className="drag-bucket-head">Least</div>
		<div className="drag-bucket-body">
            {leastList.length === 0 && <div className="empty">Drop items here</div>}
            {leastList.map((r) => (
              <div key={`l-${r.date}`} className="row">
				<span className="row-choice">#{r.choice}</span>
				<span className="row-date">{labelForWeekend(r.date)}</span>
				<span className={`row-svc ${r.svc==="RNI" ?"rni" :"coa" }`}>{r.svc}< span>
				<button className="row-x" onClick={()=> removeEntry("least", r.date, r.svc)}>✕</button>
			</div>
            ))}
          </div>
	</div>
</div>
</div>
  );
}

/* =============================
   Command Palette (always present)
   - Format:  "Jun 13 RNI M"  or  "September 5 COA L"
   - Optional number: "… M 3"  sets choice; otherwise appended and renumbered
   ============================= */
function CommandPalette({ onCommand, disabled }) {
  const [txt, setTxt] = useState("");
  const parse = (s) => {
    // Try formats: "Jun 13 RNI M 2" / "September 5 COA L"
    const parts = s.trim().split(/\s+/);
    if (parts.length < 4)return null; month may be one token or more (e.g.,"September" ) We’ll assume Month (1) Day (2) Svc (3) Kind (4) [num? (5)] const mon=parts[0]; const day=parts[1].replace(/[^0-9]/g, ""); const svc=parts[2].toUpperCase(); const kind=parts[3].toUpperCase(); M or L const num=parts[4] ? parseInt(parts[4], 10) : null; const mIdx=MONTH_FULL.findIndex( (m)=> m.toLowerCase().startsWith(mon.toLowerCase())
    );
    if (mIdx < 0)return null; const mk=String(mIdx + 1).padStart(2,"0" ); Find matching Saturday by day in that month const id=allWeekendIds.find((id0)=> monthOf(id0) === mk && id0.slice(8, 10) === String(day).padStart(2, "0"));
    if (!id) return null;
    if (svc !== "RNI" && svc !== "COA") return null;
    if (kind !== "M" && kind !== "L") return null;
    return { id, svc, where: kind === "M" ? "most" : "least", number: num };
  };

  const onKey = (e) => {
    if (e.key === "Enter" && txt.trim()) {
      const cmd = parse(txt);
      if (!cmd) {
        alert("Could not parse. Try: “Jun 13 RNI M 2” or “September 5 COA L”.");
        return;
      }
      onCommand(cmd);
      setTxt("");
    }
  };

  return (
    <div className="cmd">
			<input className="cmd-input" disabled={disabled} placeholder='Command (e.g., "Jun 13 RNI M 2" or "September 5 COA L")' value={txt} onChange={(e)=> setTxt(e.target.value)}
        onKeyDown={onKey}
      />
      <div className="cmd-hint">Enter = apply</div>
			</div>
  );
}

/* =============================
   App
   ============================= */
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get("admin") === "1";
  const urlUI = (params.get("ui") || "").toLowerCase(); // calendar|quick|rank|drag
  const [ui, setUI] = useState(["calendar","quick","rank","drag"].includes(urlUI) ? urlUI : "home");

  const [uid, setUid] = useState(null);
  const [status, setStatus] = useState("Authenticating…");
  const [firebaseOK, setFirebaseOK] = useState(null); // null=unknown, true/false
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [prefs, setPrefs] = useState(initEmptyPrefs());
  const [submitted, setSubmitted] = useState(false);
  const [collapsed, setCollapsed] = useState(() => Object.fromEntries(MONTH_KEYS.map((mk) => [mk, true])));

  // Auth + connectivity badge
  useEffect(() => {
    (async () => {
      try {
        const token = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;
        if (token) await signInWithCustomToken(auth, token);
        else await signInAnonymously(auth);
        onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUid(u.uid);
            setStatus("Loading profile & preferences…");
            try {
              // simple test read to set badge
              setFirebaseOK(true);
            } catch {
              setFirebaseOK(false);
            }
          }
        });
      } catch (e) {
        console.error(e);
        setStatus(`Auth error: ${e.message}`);
        setFirebaseOK(false);
      }
    })();
  }, []);

  const profileDocRef = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "profile"), "current");
  const prefsDocRef   = (uidX) => doc(collection(db, "artifacts", appId, "users", uidX, "preferences"), "calendar-preferences");

  // Load profile/prefs
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
            setPrefs((p) => normalizeRanks({ ...p, ...remapped }));
          } else if (d.top10 || d.bottom10) {
            const next = initEmptyPrefs();
            (d.top10 || []).forEach((t) => {
              next[t.weekend] = {
                ...(next[t.weekend] || {}),
                mostService: t.service || SERVICES.NONE,
                mostChoice: t.choice ?? t.rank ?? 0,
              };
            });
            (d.bottom10 || []).forEach((b) => {
              next[b.weekend] = {
                ...(next[b.weekend] || {}),
                leastService: b.service || SERVICES.NONE,
                leastChoice: b.choice ?? b.rank ?? 0,
              };
            });
            setPrefs(normalizeRanks(next));
          }
        }
        setStatus("Ready.");
      } catch (e) {
        console.error(e);
        setStatus(`Load error: ${e.message}`);
      }
    })();
  }, [uid]);

  // Auto-fill single-service (do once)
  const [autoFilledOnce, setAutoFilledOnce] = useState(false);
  useEffect(() => {
    if (autoFilledOnce) return;
    setPrefs((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of allWeekendIds) {
        const avail = availabilityByWeekend[id] || [];
        if (avail.length === 1) {
          const p = next[id] || {
            mostService: SERVICES.NONE,
            mostChoice: 0,
            leastService: SERVICES.NONE,
            leastChoice: 0,
          };
          if (p.mostService === SERVICES.NONE) { p.mostService = avail[0]; changed = true; }
          if (p.leastService === SERVICES.NONE) { p.leastService = avail[0]; changed = true; }
          next[id] = p;
        }
      }
      return changed ? normalizeRanks(next) : prev;
    });
    setAutoFilledOnce(true);
  }, [autoFilledOnce]);

  // Name gate
  const requireName = Boolean(profile?.name) && !submitted;

  // Controlled setters (mutual exclusion + renumber)
  const setMost = useCallback((id, val) => {
    setPrefs((prev) => {
      const avail = availabilityByWeekend[id] || [];
      const svc = val.mostService;
      if (svc !== SERVICES.NONE && !avail.includes(svc)) return prev;
      const out = enforceMutualExclusion(prev, id, "most", svc);
      const withNum = setChoiceNumber(out, id, "most", val.mostChoice || (svc === SERVICES.NONE ? 0 : 9999));
      return normalizeRanks(withNum);
    });
  }, []);
  const setLeast = useCallback((id, val) => {
    setPrefs((prev) => {
      const avail = availabilityByWeekend[id] || [];
      const svc = val.leastService;
      if (svc !== SERVICES.NONE && !avail.includes(svc)) return prev;
      const out = enforceMutualExclusion(prev, id, "least", svc);
      const withNum = setChoiceNumber(out, id, "least", val.leastChoice || (svc === SERVICES.NONE ? 0 : 9999));
      return normalizeRanks(withNum);
    });
  }, []);

  // Counts for header
  const counts = useMemo(() => {
    let mostCount = 0, leastCount = 0;
    for (const p of Object.values(prefs)) {
      if (p.mostChoice > 0 && p.mostService !== SERVICES.NONE) mostCount++;
      if (p.leastChoice > 0 && p.leastService !== SERVICES.NONE) leastCount++;
    }
    return { mostCount, leastCount };
  }, [prefs]);

  // Save profile quickly when changed
  const saveProfile = async (next) => {
    setProfile(next);
    if (!uid) return;
    await setDoc(profileDocRef(uid), { ...next, updatedAt: serverTimestamp() }, { merge: true });
  };

  // Assemble arrays
  const assembleTopBottom = useCallback(() => {
    const orderIdx = (id) => allWeekendIds.indexOf(id);
    const top = [];
    const bottom = [];
    for (const [id, p] of Object.entries(prefs)) {
      if (p.mostService !== SERVICES.NONE && p.mostChoice > 0) top.push({ weekend: id, choice: p.mostChoice, service: p.mostService });
      if (p.leastService !== SERVICES.NONE && p.leastChoice > 0) bottom.push({ weekend: id, choice: p.leastChoice, service: p.leastService });
    }
    top.sort((a, b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    bottom.sort((a, b) => a.choice - b.choice || orderIdx(a.weekend) - orderIdx(b.weekend));
    return { top, bottom };
  }, [prefs]);

  // Submit final
  const handleSubmit = async () => {
    if (!profile.name) {
      alert("Select your name first.");
      return;
    }
    const badLeast = Object.values(prefs).some((p) => p.leastChoice > 0 && p.leastService === SERVICES.NONE);
    if (badLeast) {
      alert("For every “Least” choice, please select a service (RNI or COA).");
      return;
    }
    const { top, bottom } = assembleTopBottom();
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
        top10: top.map((t) => ({ weekend: t.weekend, choice: t.choice, rank: t.choice, service: t.service })),
        bottom10: bottom.map((b) => ({ weekend: b.weekend, choice: b.choice, rank: b.choice, service: b.service })),
        submitted: true,
        submittedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      },
      { merge: true }
    );
    setSubmitted(true);
    alert("Preferences submitted. Downloads now reflect your final locked choices.");
  };

  // Downloads
  const downloadMyCSV = () => {
    const { top, bottom } = assembleTopBottom();
    const rows = [
      ...top.map((t) => ({ attendee: profile.name, email: profile.email || "", kind: "MOST", choice: t.choice, service: t.service, weekend: labelForWeekend(t.weekend) })),
      ...bottom.map((b) => ({ attendee: profile.name, email: profile.email || "", kind: "LEAST", choice: b.choice, service: b.service, weekend: labelForWeekend(b.weekend) })),
    ];
    const fn = submitted ? `preferences_${profile.name || "attending"}.csv` : `preferences_preview_${profile.name || "attending"}.csv`;
    downloadCSV(fn, rows);
  };
  const downloadMyWord = () => {
    const { top, bottom } = assembleTopBottom();
    const html = docHtml(profile.name, profile.email, top, bottom);
    const fn = submitted ? `preferences_${profile.name || "attending"}.doc` : `preferences_preview_${profile.name || "attending"}.doc`;
    downloadBlob(fn, "application/msword", html);
  };

  // Admin CSV
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
      const submittedAt = data.submittedAt?._seconds ? new Date(data.submittedAt._seconds * 1000).toISOString() : "";
      const pull = (x) => x.choice ?? x.rank;
      data.top10.forEach((t) => rows.push({ attendee, email: em, kind: "MOST", choice: pull(t), service: t.service, weekend: labelForWeekend(t.weekend), submittedAt }));
      data.bottom10.forEach((b) => rows.push({ attendee, email: em, kind: "LEAST", choice: pull(b), service: b.service || "", weekend: labelForWeekend(b.weekend), submittedAt }));
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

  // Jump
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

  // Command palette handler
  const onCommand = ({ id, svc, where, number }) => {
    const avail = availabilityByWeekend[id] || [];
    if (!avail.includes(svc)) {
      alert("Service not available for that weekend.");
      return;
    }
    setPrefs((prev) => {
      const p = { ...(prev[id] || {}) };
      if (where === "most") {
        p.mostService = svc;
        p.mostChoice = number ? number : p.mostChoice > 0 ? p.mostChoice : 9999;
      } else {
        p.leastService = svc;
        p.leastChoice = number ? number : p.leastChoice > 0 ? p.leastChoice : 9999;
      }
      const out = { ...prev, [id]: p };
      return normalizeRanks(out);
    });
  };

  // Top bar (single line, no wrap)
  const firebaseBadge =
    firebaseOK == null ? (
      <span className="badge gray">…</span>
    ) : firebaseOK ? (
      <span className="badge green">Connected ✓</span>
    ) : (
      <span className="badge red">Firebase ✗</span>
    );

  const headerButtons = (
    <>
				<strong className="jump-label">Jump:</strong>
      {MONTH_KEYS.map((mk, i) => (
        <BarButton key={mk} onClick={()=> jumpTo(mk)} title={`Jump to ${MONTH_FULL[i]}`}>
          {MONTH_FULL[i].slice(0, 3)}
        </BarButton>
      ))}
      <div className="spacer"/>
				<BarButton onClick={()=> collapseAll(true)} title="Collapse all">Collapse</BarButton>
				<BarButton onClick={()=> collapseAll(false)} title="Expand all">Expand</BarButton>
				<BarButton kind="green" onClick={downloadMyCSV} title="CSV preview or final">Preview CSV</BarButton>
				<BarButton kind="indigo" onClick={downloadMyWord} title="Word preview or final">Preview Word</BarButton>
				<BarButton kind="blue" onClick={handleSubmit} title="Submit & lock">
        {submitted ? "Submitted (Locked)" : "Submit Preferences"}
      </BarButton>
				<div className="fb-badge">{firebaseBadge}</div>
			</>
  );

  // Landing
  const Landing = () => (
    <div className="landing">
				<div className="landing-title">2026 Preferences (RNI &amp; COA)</div>
				<div className="landing-links">
					<button className="link-btn" onClick={()=> setUI("calendar")}>Calendar</button>
					<button className="link-btn" onClick={()=> setUI("quick")}>QuickAdd</button>
					<button className="link-btn" onClick={()=> setUI("rank")}>RankBoard</button>
					<button className="link-btn" onClick={()=> setUI("drag")}>DragBuckets</button>
				</div>
				<div className="landing-note">
        Or use <code>?ui=calendar</code>, <code>?ui=quick</code>, <code>?ui=rank</code>, <code>?ui=drag</code> in the URL.
      </div>
			</div>
  );

  const NameGate = (!profile.name || submitted === undefined) ? true : false;

  return (
    <div className="page">
      {/* left/right bands for centering */}
      <div className="band"/>
				<div className="container">
        {/* Sticky Top Bar */}
        <div className="topbar">
						<div className="topbar-inner">{headerButtons}</div>
					</div>

        {/* Header + instructions */}
        <div className="header">
						<h1 className="h1">Weekend Preference Collection — 2026</h1>
						<ol className="inst">
							<li>Select your name below. You will see your target number of weekends.</li>
							<li>Use any mode to add as many <b>Most</b> and <b>Least</b> choices as you need (service required for both).</li>
							<li>Preview (CSV/Word) anytime. Submit to lock.</li>
							<li>Aim for a balanced spread of <b>COA</b> and <b>RNI</b> in “Most”. Selecting more weekends increases your chance of getting preferred ones.</li>
						</ol>
						<div className="status">
            Status: {status} • Most choices: {counts.mostCount} • Least choices: {counts.leastCount} {submitted ? "• (Locked after submission)" : ""}
          </div>
						<Identity profile={profile} saveProfile={saveProfile}/>
					</div>

        {/* Mode switch + live preview side by side on desktop */}
        <div className="main-split">
						<div className="main-left">
            {ui === "home" && <Landing/>}
            {ui === "calendar" && (
              <>
								<div className="mode-note">Calendar mode: expand months to pick. (Both Most/Least require service; counters auto-renumber.)</div>
								<CalendarMode prefs={prefs} setMost={(id, v)=> requireName && setMost(id, v)}
                  setLeast={(id, v) => requireName && setLeast(id, v)}
                  collapsed={collapsed}
                  setCollapsed={setCollapsed}
                  submitted={submitted}
                />
              </>
            )}
            {ui === "quick" && <QuickAdd prefs={prefs} setPrefs={requireName ? setPrefs : ()=> {}} requireName={requireName} />}
            {ui === "rank" && <RankBoard prefs={prefs} setPrefs={requireName ? setPrefs : ()=> {}} requireName={requireName} />}
            {ui === "drag" && <DragBuckets prefs={prefs} setPrefs={requireName ? setPrefs : ()=> {}} requireName={requireName} />}
          </div>
										<div className="main-right">
											<LivePreview prefs={prefs}/>
											<CommandPalette onCommand={requireName ? onCommand : ()=> {}} disabled={!requireName} />
            <div className="build-tag">Build: {__APP_VERSION__}</div>
											</div>
										</div>

        {/* Admin CSV (when ?admin=1) */}
        {isAdmin && (
          <div className="admin">
											<div className="admin-title">Admin Export</div>
											<BarButton onClick={()=> downloadCSV("admin.csv", adminRows)}
              title="Download admin.csv"
            >
              Download admin.csv
            </BarButton>
										</div>
        )}

        {/* Name gate overlay (blocks interactions until a name is selected) */}
        {!profile.name && !submitted && (
          <div className="gate">
											<div className="gate-inner">Select your name above to begin.</div>
										</div>
        )}
      </div>
									<div className="band"/>
								</div>
  );
}
