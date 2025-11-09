import React, { useEffect, useMemo, useState, useCallback } from "react";

/**
 * DragBuckets
 * Props:
 * - months: { [MM]: [{ date, day, rni, coa, isTaken?, detail? }, ...] }
 * - prefs:  { [dateISO]: { mostService, mostChoice, leastService, leastChoice } }
 * - setMost(id, {mostService, mostChoice})
 * - setLeast(id, {leastService, leastChoice})
 * - availabilityByWeekend: { [dateISO]: ('RNI'|'COA')[] }
 * - submitted: boolean
 * - requireName: boolean  (disable interactions until an attending is selected)
 */
const SERVICES = { RNI: "RNI", COA: "COA", NONE: "none" };

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function labelFromISO(iso) {
  // iso = YYYY-MM-DD (Saturday); return "Month D"
  const d = new Date(iso + "T00:00:00");
  const m = monthNames[d.getMonth()];
  return `${m} ${d.getDate()}`;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function DragBuckets({
  months,
  prefs,
  setMost,
  setLeast,
  availabilityByWeekend,
  submitted,
  requireName
}) {
  // Build the master list of weekends we can show
  const all = useMemo(() => {
    const flat = [];
    Object.entries(months).forEach(([mm, arr]) => {
      arr.forEach(w => {
        const id = w.date;
        const label = labelFromISO(id);
        const available = availabilityByWeekend[id] || [];
        const taken = (!available.includes("RNI") && !available.includes("COA")) || w.isTaken;
        flat.push({
          id,
          label,
          available, // array of allowed services
          taken,
          detail: w.detail || null,
        });
      });
    });
    // Keep stable chronological order
    flat.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return flat;
  }, [months, availabilityByWeekend]);

  // Prefill buckets only from actual choices in prefs
  const initialMost = useMemo(() => {
    const rows = [];
    for (const w of all) {
      const p = prefs[w.id];
      if (p && p.mostService && p.mostService !== SERVICES.NONE && (p.mostChoice || 0) > 0) {
        if (w.available.includes(p.mostService)) {
          rows.push({ id: w.id, service: p.mostService, choice: p.mostChoice });
        }
      }
    }
    // stable order by choice then calendar
    rows.sort((a, b) => a.choice - b.choice || (a.id < b.id ? -1 : 1));
    return rows;
  }, [all, prefs]);

  const initialLeast = useMemo(() => {
    const rows = [];
    for (const w of all) {
      const p = prefs[w.id];
      if (p && p.leastService && p.leastService !== SERVICES.NONE && (p.leastChoice || 0) > 0) {
        if (w.available.includes(p.leastService)) {
          rows.push({ id: w.id, service: p.leastService, choice: p.leastChoice });
        }
      }
    }
    rows.sort((a, b) => a.choice - b.choice || (a.id < b.id ? -1 : 1));
    return rows;
  }, [all, prefs]);

  const [most, setMostLocal] = useState(initialMost);
  const [least, setLeastLocal] = useState(initialLeast);

  // Everything not in MOST/LEAST becomes the pool
  const pool = useMemo(() => {
    const chosen = new Set([...most.map(x => x.id), ...least.map(x => x.id)]);
    return all.filter(w => !chosen.has(w.id) && !w.taken);
  }, [all, most, least]);

  const findMeta = useCallback((id) => all.find(w => w.id === id), [all]);

  // DnD helpers
  const onDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
  };
  const allowDrop = (e) => {
    e.preventDefault();
  };

  const safeAdd = (target, setTarget) => (id) => {
    const already = target.some(x => x.id === id) || least.some(x => x.id === id) || most.some(x => x.id === id);
    if (already) return;
    const meta = findMeta(id);
    if (!meta || meta.taken || meta.available.length === 0) return;
    // If only one service open, preselect it
    const svc = meta.available.length === 1 ? meta.available[0] : SERVICES.RNI;
    const choice = Math.max(1, (target[target.length - 1]?.choice || 0) + 1);
    setTarget([...target, { id, service: svc, choice }]);
  };

  const addToMost = safeAdd(most, setMostLocal);
  const addToLeast = safeAdd(least, setLeastLocal);

  const sendBackToPool = (id, from) => {
    if (from === "most") setMostLocal(most.filter(x => x.id !== id));
    else setLeastLocal(least.filter(x => x.id !== id));
  };

  // Change service limited by availability; auto-correct if invalid
  const changeService = (from, id, svc) => {
    const meta = findMeta(id);
    if (!meta || !meta.available.includes(svc)) return;
    if (from === "most") setMostLocal(most.map(x => x.id === id ? { ...x, service: svc } : x));
    else setLeastLocal(least.map(x => x.id === id ? { ...x, service: svc } : x));
  };

  const changeChoice = (from, id, val) => {
    const n = Math.max(1, parseInt(val || "1", 10));
    const next = (from === "most" ? most : least).map(x => x.id === id ? { ...x, choice: n } : x)
      .sort((a, b) => a.choice - b.choice || (a.id < b.id ? -1 : 1));
    if (from === "most") setMostLocal(next);
    else setLeastLocal(next);
  };

  // Push local state back into app prefs so preview/export sees it
  useEffect(() => {
    if (submitted) return;
    // Reset app prefs for the ids we touch, then write values
    const touched = new Set([...all.map(w => w.id)]);
    // MOST
    most.forEach(row => {
      setMost(row.id, { mostService: row.service, mostChoice: row.choice });
    });
    // Clear any MOST that were removed (set choice 0)
    all.forEach(w => {
      if (!most.some(x => x.id === w.id)) {
        setMost(w.id, { mostService: SERVICES.NONE, mostChoice: 0 });
      }
    });
    // LEAST
    least.forEach(row => {
      setLeast(row.id, { leastService: row.service, leastChoice: row.choice });
    });
    all.forEach(w => {
      if (!least.some(x => x.id === w.id)) {
        setLeast(w.id, { leastService: SERVICES.NONE, leastChoice: 0 });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [most, least, submitted]);

  // UI pieces
  const Box = ({ title, borderColor, children }) => (
    <div style={{
      border: `2px dashed ${borderColor}`,
      borderRadius: 12,
      padding: 10,
      background: "#fff"
    }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );

  const Row = ({ item, from }) => {
    const meta = findMeta(item.id);
    const avail = meta?.available || [];
    const svcOnly = avail.length === 1 ? avail[0] : null;

    return (
      <div
        key={`${from}-${item.id}`}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto auto",
          gap: 8,
          alignItems: "center",
          padding: "6px 8px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#f8fafc",
          marginBottom: 6
        }}
      >
        <div style={{ fontWeight: 600 }}>{meta?.label || item.id}</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Service limited to availability; auto-selected when only one */}
          {avail.includes("RNI") && (
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
              <input
                type="radio"
                name={`${from}-svc-${item.id}`}
                checked={item.service === "RNI"}
                onChange={() => changeService(from, item.id, "RNI")}
                disabled={submitted || !requireName}
              />
              RNI
            </label>
          )}
          {avail.includes("COA") && (
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
              <input
                type="radio"
                name={`${from}-svc-${item.id}`}
                checked={item.service === "COA"}
                onChange={() => changeService(from, item.id, "COA")}
                disabled={submitted || !requireName}
              />
              COA
            </label>
          )}
          {!avail.length && <span style={{ fontSize: 12, color: "#991b1b" }}>FULL</span>}
        </div>

        <select
          value={String(item.choice)}
          onChange={(e) => changeChoice(from, item.id, e.target.value)}
          disabled={submitted || !requireName}
          style={{ padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: 8 }}
        >
          {Array.from({ length: 100 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{`Choice # ${n}`}</option>
          ))}
        </select>

        <button
          onClick={() => sendBackToPool(item.id, from)}
          title="Remove from this list"
          style={{
            border: "1px solid #e5e7eb",
            background: "#fff",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer"
          }}
          disabled={submitted || !requireName}
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr 1fr",
          gap: 16,
          alignItems: "start"
        }}
      >
        {/* Pool */}
        <Box title="Pool (drag to assign)" borderColor="#9ca3af">
          <div
            onDragOver={allowDrop}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 8,
              maxHeight: "70vh",
              overflow: "auto",
              paddingRight: 4
            }}
          >
            {pool.map(w => (
              <div
                key={w.id}
                draggable={!submitted && requireName}
                onDragStart={(e) => onDragStart(e, w.id)}
                title={w.detail || ""}
                style={{
                  userSelect: "none",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "8px",
                  background: "#ffffff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  opacity: requireName ? 1 : 0.5,
                  cursor: !submitted && requireName ? "grab" : "not-allowed"
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{w.label}</div>
                <div style={{ fontSize: 12, color: "#334155" }}>
                  {w.available.join(" / ") || "FULL"}
                </div>
              </div>
            ))}
          </div>
        </Box>

        {/* MOST */}
        <Box title="MOST (service + choice)" borderColor="#10b981">
          <div
            onDragOver={allowDrop}
            onDrop={(e) => {
              e.preventDefault();
              if (submitted || !requireName) return;
              addToMost(e.dataTransfer.getData("text/plain"));
            }}
          >
            {most.map(item => <Row key={`most-${item.id}`} item={item} from="most" />)}
            {!most.length && <div style={{ color: "#64748b", fontSize: 13 }}>Drag weekends here.</div>}
          </div>
        </Box>

        {/* LEAST */}
        <Box title="LEAST (service + choice)" borderColor="#ef4444">
          <div
            onDragOver={allowDrop}
            onDrop={(e) => {
              e.preventDefault();
              if (submitted || !requireName) return;
              addToLeast(e.dataTransfer.getData("text/plain"));
            }}
          >
            {least.map(item => <Row key={`least-${item.id}`} item={item} from="least" />)}
            {!least.length && <div style={{ color: "#64748b", fontSize: 13 }}>Drag weekends here.</div>}
          </div>
        </Box>
      </div>
    </div>
  );
}

export default DragBuckets;
