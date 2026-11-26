// =====================================================================
//  Weekend allocation engine (pure functions — no Firebase, no React).
//
//  1. TARGETS  — how many weekends each person gets:
//     • "number" requests are honoured. If they add up to more than the
//       slots, everyone is cut back evenly (the largest requests are
//       trimmed first, to a common cap).
//     • What is left is split evenly among the "as many as possible"
//       group. When it does not divide evenly, the scheduler (if in that
//       group) gets one of the extra weekends; the remaining extras are
//       drawn by lottery. If nobody asked for "as many as possible", the
//       leftover goes to the scheduler.
//  2. ON-SERVICE PRIORITY — in each month, RNI weekends go first to that
//     month's RNICU Resident / NNP-BPD attendings and COA weekends to the
//     QB / Harbert attendings, for every weekend of that month they ranked
//     (up to their target). Co-service attendings alternate picks.
//  3. EVERYONE ELSE — one weekend at a time, to whoever has received the
//     smallest share of their target so far, taking their highest-ranked
//     open weekend. Paid holiday weekends are spread: nobody gets a second
//     while someone who ranked one still has fewer.
//  4. Anything still unfilled goes to the scheduler.
//  Ties are always broken by a seeded lottery, so results are fair,
//  never first-come-first-served, and exactly reproducible.
// =====================================================================

// ---------- seeded lottery ----------
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function makeRng(seed) {
  let a = hashSeed(String(seed))();
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic lottery order of names for a given seed. */
export function lotteryOrder(names, seed) {
  const rng = makeRng(`order:${seed}`);
  const arr = [...names].sort();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function drawLottery(names, k, seed) {
  return lotteryOrder(names, `draw:${seed}`).slice(0, k);
}

// ---------- 1. targets ----------
/**
 * Everyone gets what they asked for, up to a common level L that uses up all
 * the slots; nobody gets more than L (+1). "As many as possible" = no limit.
 * So a specific number is honoured only up to what the "as many as possible"
 * group receives, and if requests exceed the slots everyone is cut evenly.
 * When the slots don't divide evenly, those at the level get one extra:
 * the scheduler first (if at the level), the rest by lottery.
 * If nobody chose "as many as possible" and specific requests leave weekends
 * over, the leftover goes to the scheduler.
 *
 * @param names        all attending short names
 * @param requests     { name: { type: "none"|"number"|"max", n?: number } }
 * @param totalSlots   number of weekend slots to allocate
 * @param scheduler    scheduler's short name
 * @param seed         lottery seed
 */
export function computeTargets({ names, requests, totalSlots, scheduler, seed = "2027" }) {
  const req = (n) => requests[n] || { type: "none" };
  const want = (n) => (req(n).type === "max" ? Infinity : req(n).type === "number" ? Math.max(0, req(n).n || 0) : 0);
  const targets = Object.fromEntries(names.map((n) => [n, 0]));
  const notes = [];
  const definite = names.filter((n) => req(n).type === "number" && want(n) > 0);
  const maxGroup = names.filter((n) => req(n).type === "max");
  const noResponse = names.filter((n) => !requests[n]);
  const definiteSum = definite.reduce((s, n) => s + want(n), 0);
  const active = [...definite, ...maxGroup];

  // Nobody wants "as many as possible" and specific requests fit: grant them; leftover to scheduler.
  if (maxGroup.length === 0 && definiteSum <= totalSlots) {
    definite.forEach((n) => (targets[n] = want(n)));
    const left = totalSlots - definiteSum;
    if (left > 0 && scheduler) { targets[scheduler] += left; notes.push(`${left} weekend(s) left after all specific requests go to ${scheduler}.`); }
    return { targets, definite, definiteSum, maxGroup, noResponse, level: null, capped: [], share: null, leftoverToScheduler: left, notes };
  }

  // Common level L: the largest with sum(min(want, L)) <= slots.
  const total = (L) => active.reduce((s, n) => s + Math.min(want(n), L), 0);
  let L = 0;
  while (total(L + 1) <= totalSlots) L++;
  active.forEach((n) => (targets[n] = Math.min(want(n), L)));
  let rem = totalSlots - total(L);
  const atLevel = active.filter((n) => want(n) > L);       // everyone who wanted more than L
  const extraNames = [];
  let pool = atLevel;
  if (rem > 0 && pool.includes(scheduler)) { targets[scheduler] += 1; rem -= 1; extraNames.push(scheduler); pool = pool.filter((n) => n !== scheduler); }
  const drawn = drawLottery(pool, rem, `${seed}:max`);
  drawn.forEach((n) => (targets[n] += 1));
  extraNames.push(...drawn);

  const capped = definite.filter((n) => want(n) > L);      // specific requests above the share
  if (capped.length) {
    notes.push(`Capped at the "as many as possible" share (${L}${extraNames.length ? `–${L + 1}` : ""}): ${capped.map((n) => `${n} asked for ${want(n)}`).join(", ")}.`);
  }
  const share = { level: L, base: L, remaining: atLevel.length * L + (totalSlots - total(L)), groupSize: atLevel.length, extraCount: extraNames.length, extraNames };
  return { targets, definite, definiteSum, maxGroup, noResponse, level: L, capped, share, leftoverToScheduler: 0, notes };
}

/** "If everyone asked for as many as possible" estimate for the first email. */
export function estimateAllMax(totalSlots, n) {
  const base = Math.floor(totalSlots / n);
  const extra = totalSlots % n;
  return { base, extra, text: extra ? `${base}–${base + 1} weekends each (${extra} people get ${base + 1}, ${n - extra} get ${base})` : `${base} weekends each` };
}

// ---------- 2–4. allocation ----------
/**
 * @param weekends    [{ month, date, paid? }]
 * @param onService   { "01": { RNI: [names], COA: [names] }, ... }
 * @param rankings    { name: [{ date, service, rank }] }
 * @param targets     { name: number }
 * @param scheduler   name that receives leftovers
 * @param seed        lottery seed
 * @param fillShortfallsFirst  give unfilled weekends to people still short of
 *                     their number before the scheduler
 */
export function allocate({ weekends, onService, rankings, targets, scheduler, seed = "2027", fillShortfallsFirst = false }) {
  const names = Object.keys(targets);
  const order = lotteryOrder(names, seed);
  const lot = Object.fromEntries(order.map((n, i) => [n, i]));
  const wk = Object.fromEntries(weekends.map((w) => [w.date, w]));
  const slotKey = (d, s) => `${d}|${s}`;

  const assigned = {};          // slotKey -> { name, how }
  const count = Object.fromEntries(names.map((n) => [n, 0]));
  const hol = Object.fromEntries(names.map((n) => [n, 0]));
  const onWeekend = new Set();  // name|date
  const prefs = {};
  for (const n of names) {
    const seen = new Set();
    prefs[n] = (rankings[n] || [])
      .filter((r) => r && wk[r.date] && (r.service === "RNI" || r.service === "COA"))
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      .filter((r) => { const k = slotKey(r.date, r.service); if (seen.has(k)) return false; seen.add(k); return true; });
  }

  const free = (p, r) => !assigned[slotKey(r.date, r.service)] && !onWeekend.has(`${p}|${r.date}`);
  const give = (p, r, how) => {
    assigned[slotKey(r.date, r.service)] = { name: p, how };
    count[p] += 1;
    onWeekend.add(`${p}|${r.date}`);
    if (wk[r.date].paid) hol[p] += 1;
  };

  // ---- Phase 1: on-service priority ----
  const monthKeys = [...new Set(weekends.map((w) => w.month))];
  for (const mk of monthKeys) {
    for (const side of ["RNI", "COA"]) {
      const pool = ((onService[mk] || {})[side] || []).filter((n) => targets[n] > 0);
      const picks = Object.fromEntries(pool.map((n) => [n, 0]));
      for (;;) {
        const cands = pool.filter((n) => count[n] < targets[n] &&
          prefs[n].some((r) => r.service === side && wk[r.date].month === mk && free(n, r)));
        if (!cands.length) break;
        cands.sort((a, b) => picks[a] - picks[b] || lot[a] - lot[b]);
        const p = cands[0];
        const r = prefs[p].find((x) => x.service === side && wk[x.date].month === mk && free(p, x));
        give(p, r, "on-service");
        picks[p] += 1;
      }
    }
  }

  // ---- Phase 2: everyone, smallest share of target first ----
  const hasHolidayOption = (q) => prefs[q].some((r) => wk[r.date].paid && free(q, r));
  const holidayOK = (p, r) => {
    if (!wk[r.date].paid || hol[p] === 0) return true;
    return !names.some((q) => q !== p && count[q] < targets[q] && hol[q] < hol[p] && hasHolidayOption(q));
  };
  const nextPick = (p) => prefs[p].find((r) => free(p, r) && holidayOK(p, r));
  for (;;) {
    const cands = names.filter((n) => count[n] < targets[n] && nextPick(n));
    if (!cands.length) break;
    cands.sort((a, b) => count[a] / targets[a] - count[b] / targets[b] || count[a] - count[b] || lot[a] - lot[b]);
    const p = cands[0];
    give(p, nextPick(p), "ranked");
  }

  // ---- Phase 3: leftovers ----
  // Optionally first to people still short of their number (smallest share
  // first), then to the scheduler.
  const leftover = [];
  const unfilled = [];
  const toShort = [];
  for (const w of weekends) {
    for (const s of ["RNI", "COA"]) {
      if (assigned[slotKey(w.date, s)]) continue;
      if (fillShortfallsFirst) {
        const short = names
          .filter((n) => count[n] < targets[n] && !onWeekend.has(`${n}|${w.date}`))
          .sort((a, b) => count[a] / targets[a] - count[b] / targets[b] || lot[a] - lot[b]);
        if (short.length) {
          give(short[0], { date: w.date, service: s }, "shortfall");
          toShort.push({ date: w.date, service: s, name: short[0] });
          continue;
        }
      }
      if (scheduler && !onWeekend.has(`${scheduler}|${w.date}`)) {
        give(scheduler, { date: w.date, service: s }, "leftover");
        leftover.push({ date: w.date, service: s });
      } else unfilled.push({ date: w.date, service: s });
    }
  }

  const schedule = {};
  for (const [k, v] of Object.entries(assigned)) {
    const [d, s] = k.split("|");
    (schedule[d] ||= {})[s] = v.name;
  }
  const how = Object.fromEntries(Object.entries(assigned).map(([k, v]) => [k, v.how]));
  const shortfalls = names.filter((n) => count[n] < targets[n]).map((n) => ({ name: n, target: targets[n], got: count[n] }));
  const rankHit = Object.fromEntries(names.map((n) => {
    const got = prefs[n].filter((r) => assigned[slotKey(r.date, r.service)]?.name === n);
    return [n, got.map((r) => r.rank)];
  }));
  return { schedule, how, counts: count, holidayCounts: hol, leftover, toShort, unfilled, shortfalls, lotteryOrder: order, rankHit };
}

/** Recount totals from a (possibly hand-edited) schedule. */
export function countSchedule(schedule, names) {
  const c = Object.fromEntries(names.map((n) => [n, 0]));
  for (const d of Object.values(schedule)) for (const n of Object.values(d)) if (n && n in c) c[n] += 1;
  return c;
}
