import test from "node:test";
import assert from "node:assert/strict";
import { computeTargets, allocate, estimateAllMax, lotteryOrder, makeRng } from "../src/allocate.js";
import { ATTENDINGS, WEEKENDS, ON_SERVICE, TOTAL_SLOTS, SCHEDULER_NAME } from "../src/config.js";

const NAMES = ATTENDINGS.map((a) => a.name);
const S = TOTAL_SLOTS;

test("100 slots in 2027", () => assert.equal(S, 100));

test("estimate if everyone wants max: 10 get 6, 8 get 5", () => {
  const e = estimateAllMax(100, 18);
  assert.equal(e.base, 5); assert.equal(e.extra, 10);
});

test("Jay's example: 4 in max group, 18 left -> scheduler 5, one lottery 5, two 4", () => {
  const names = ["A", "B", "C", "Kandasamy", "D"];
  const requests = { A: { type: "max" }, B: { type: "max" }, C: { type: "max" }, Kandasamy: { type: "max" }, D: { type: "number", n: 2 } };
  const r = computeTargets({ names, requests, totalSlots: 20, scheduler: "Kandasamy", seed: "x" });
  assert.equal(r.targets.Kandasamy, 5);
  const others = ["A", "B", "C"].map((n) => r.targets[n]).sort();
  assert.deepEqual(others, [4, 4, 5]);
  assert.equal(Object.values(r.targets).reduce((a, b) => a + b), 20);
});

test("scheduler gets only ONE extra even when remainder is larger", () => {
  const names = ["A", "B", "C", "Kandasamy"];
  const requests = Object.fromEntries(names.map((n) => [n, { type: "max" }]));
  const r = computeTargets({ names, requests, totalSlots: 15, scheduler: "Kandasamy", seed: "y" }); // 3 each + 3 extra
  assert.equal(r.targets.Kandasamy, 4);
  assert.deepEqual(["A", "B", "C"].map((n) => r.targets[n]).sort(), [3, 4, 4]);
});

test("even division -> scheduler gets the same as everyone", () => {
  const names = ["A", "B", "Kandasamy"];
  const requests = Object.fromEntries(names.map((n) => [n, { type: "max" }]));
  const r = computeTargets({ names, requests, totalSlots: 12, scheduler: "Kandasamy" });
  assert.deepEqual(Object.values(r.targets), [4, 4, 4]);
});

test("nobody in max group -> leftover goes to scheduler", () => {
  const names = ["A", "B", "Kandasamy"];
  const requests = { A: { type: "number", n: 3 }, B: { type: "number", n: 2 }, Kandasamy: { type: "number", n: 1 } };
  const r = computeTargets({ names, requests, totalSlots: 10, scheduler: "Kandasamy" });
  assert.equal(r.targets.Kandasamy, 5);
});

test("over-request -> everyone cut to a common level, max group not starved", () => {
  const names = ["A", "B", "C", "Kandasamy"];
  const requests = { A: { type: "number", n: 9 }, B: { type: "number", n: 6 }, C: { type: "number", n: 2 }, Kandasamy: { type: "max" } };
  const r = computeTargets({ names, requests, totalSlots: 12, scheduler: "Kandasamy" });
  assert.equal(r.targets.C, 2);                    // under the level: full request
  assert.equal(r.targets.A, 3); assert.equal(r.targets.B, 3);
  assert.equal(r.targets.Kandasamy, 4);            // level 3 + the one extra
  assert.equal(Object.values(r.targets).reduce((a, b) => a + b), 12);
});

test("specific number above the 'as many as possible' share is capped at the share", () => {
  const names = ["A", "B", "C"];
  const requests = { A: { type: "number", n: 12 }, B: { type: "max" }, C: { type: "max" } };
  const r = computeTargets({ names, requests, totalSlots: 20, scheduler: "Kandasamy", seed: "q" });
  for (const n of names) assert.ok([6, 7].includes(r.targets[n]), `${n}=${r.targets[n]}`);
  assert.equal(Object.values(r.targets).reduce((a, b) => a + b), 20);
  assert.deepEqual(r.capped, ["A"]);
});

test("specific number at or below the share is granted in full", () => {
  const names = ["A", "B", "C"];
  const requests = { A: { type: "number", n: 4 }, B: { type: "max" }, C: { type: "max" } };
  const r = computeTargets({ names, requests, totalSlots: 20, scheduler: "Kandasamy" });
  assert.equal(r.targets.A, 4); assert.equal(r.targets.B + r.targets.C, 16);
});

test("lottery is deterministic and seed-dependent", () => {
  assert.deepEqual(lotteryOrder(NAMES, "s1"), lotteryOrder(NAMES, "s1"));
  assert.notDeepEqual(lotteryOrder(NAMES, "s1"), lotteryOrder(NAMES, "s2"));
});

// ---- realistic simulation ----
function simulate(seed) {
  const rng = makeRng(`sim:${seed}`);
  // 2026-like appetite
  const want = { Ambal: 6, Arora: "max", Bhatia: 6, Boone: "max", Carlo: 5, Jain: "max", Kandasamy: "max", Kane: 1,
    Lal: 0, Mackay: 5, Salas: 3, Schuyler: 3, Shukla: "max", Sims: 8, Travers: 7, Valcarce: 0, Willis: "max", Winter: 5 };
  const requests = Object.fromEntries(Object.entries(want).map(([n, v]) => [n, v === "max" ? { type: "max" } : { type: "number", n: v }]));
  const rankings = {};
  for (const n of NAMES) {
    if (want[n] === 0) { rankings[n] = []; continue; }
    // everyone ranks ~3x what they want, holidays and own-service months more likely
    const scored = WEEKENDS.map((w) => {
      const svc = rng() < 0.5 ? "RNI" : "COA";
      let s = rng();
      if (w.paid) s += 0.6;
      const os = ON_SERVICE[w.month];
      if (os.RNI.includes(n) || os.COA.includes(n)) s += 0.3;
      return { date: w.date, service: os.RNI.includes(n) ? "RNI" : os.COA.includes(n) ? "COA" : svc, s };
    }).sort((a, b) => b.s - a.s);
    const k = Math.min(WEEKENDS.length, (want[n] === "max" ? 8 : want[n]) * 3);
    rankings[n] = scored.slice(0, k).map((x, i) => ({ date: x.date, service: x.service, rank: i + 1 }));
  }
  const t = computeTargets({ names: NAMES, requests, totalSlots: S, scheduler: SCHEDULER_NAME, seed });
  const res = allocate({ weekends: WEEKENDS, onService: ON_SERVICE, rankings, targets: t.targets, scheduler: SCHEDULER_NAME, seed });
  return { t, res, rankings, want };
}

for (const seed of ["2027", "a", "b", "c", "d"]) {
  test(`simulation seed=${seed}: invariants`, () => {
    const { t, res, rankings, want } = simulate(seed);
    // targets sum to slots
    assert.equal(Object.values(t.targets).reduce((a, b) => a + b), S);
    // every slot filled exactly once, nobody on both sides of one weekend
    let filled = 0;
    for (const w of WEEKENDS) {
      const d = res.schedule[w.date] || {};
      if (d.RNI) filled++; if (d.COA) filled++;
      if (d.RNI && d.COA) assert.notEqual(d.RNI, d.COA, `${w.date} same person both sides`);
    }
    assert.equal(filled + res.unfilled.length, S);
    // people who asked for 0 get nothing
    for (const n of NAMES) if (want[n] === 0) assert.equal(res.counts[n], 0, n);
    // nobody exceeds target except scheduler via leftovers
    for (const n of NAMES) if (n !== SCHEDULER_NAME) assert.ok(res.counts[n] <= t.targets[n], `${n} over target`);
    // only assigned weekends that person ranked (except leftovers)
    for (const [k, how] of Object.entries(res.how)) {
      const [d, s] = k.split("|");
      const who = res.schedule[d][s];
      if (how !== "leftover") assert.ok(rankings[who].some((r) => r.date === d && r.service === s), `${who} got unranked ${k}`);
    }
    // on-service priority: if an on-service attending ranked a weekend in their month on their side
    // and did not get it, it must be because they hit target or a co-service colleague took it
    for (const w of WEEKENDS) for (const side of ["RNI", "COA"]) {
      const holder = res.schedule[w.date]?.[side];
      for (const p of ON_SERVICE[w.month][side]) {
        if (!(p in t.targets) || p === holder) continue;
        const ranked = rankings[p]?.some((r) => r.date === w.date && r.service === side);
        if (!ranked) continue;
        const colleague = ON_SERVICE[w.month][side].includes(holder);
        const full = res.counts[p] >= t.targets[p];
        const sameWeekendOther = res.schedule[w.date]?.[side === "RNI" ? "COA" : "RNI"] === p;
        assert.ok(colleague || full || sameWeekendOther, `${p} lost on-service ${w.date} ${side} to ${holder}`);
      }
    }
    // holiday spread: among people who ranked a holiday and are not full, counts differ by at most 1
    const hc = Object.entries(res.holidayCounts).filter(([n, c]) => rankings[n].some((r) => WEEKENDS.find((w) => w.date === r.date).paid));
    const vals = hc.map(([, c]) => c);
    console.log(`  seed ${seed}: holiday counts`, Object.fromEntries(hc), "leftover", res.leftover.length, "shortfalls", res.shortfalls);
  });
}

test("deterministic: same seed -> identical schedule", () => {
  assert.deepEqual(simulate("z").res.schedule, simulate("z").res.schedule);
});

test("fillShortfallsFirst gives leftovers to short people before scheduler", () => {
  const { t, rankings } = simulate("2027");
  const res = allocate({ weekends: WEEKENDS, onService: ON_SERVICE, rankings, targets: t.targets, scheduler: SCHEDULER_NAME, seed: "2027", fillShortfallsFirst: true });
  assert.equal(res.shortfalls.length, 0);
  for (const n of NAMES) if (n !== SCHEDULER_NAME) assert.ok(res.counts[n] <= t.targets[n]);
  console.log("  shortfall-fill:", res.toShort.length, "to short people,", res.leftover.length, "to scheduler");
});
