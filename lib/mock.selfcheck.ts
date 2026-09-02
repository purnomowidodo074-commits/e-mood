// Run: node lib/mock.selfcheck.ts   (Node >= 22, strips TS types)
import assert from "node:assert/strict";
import {
  eachDate,
  pickCategory,
  randomCheckInISO,
  rollConfidence,
  mockRawScores,
  shuffle,
  targetCount,
  splitDayNight,
  validateMockParams,
  parseMockParams,
  type MockParams,
} from "./mock.ts";

// eachDate — inclusive, handles month boundary
assert.deepEqual(eachDate("2026-01-30", "2026-02-02"), [
  "2026-01-30",
  "2026-01-31",
  "2026-02-01",
  "2026-02-02",
]);
assert.equal(eachDate("2026-03-01", "2026-03-01").length, 1);

// pickCategory — boundaries land in the right bucket
const w = { HAPPY: 55, NETRAL: 30, BADMOOD: 15 };
assert.equal(pickCategory(0, w), "HAPPY");
assert.equal(pickCategory(0.54, w), "HAPPY");
assert.equal(pickCategory(0.56, w), "NETRAL");
assert.equal(pickCategory(0.84, w), "NETRAL");
assert.equal(pickCategory(0.86, w), "BADMOOD");
assert.equal(pickCategory(0.999, w), "BADMOOD");
assert.equal(pickCategory(0.5, { HAPPY: 0, NETRAL: 0, BADMOOD: 0 }), "BADMOOD"); // no NaN/crash

// randomCheckInISO — inside window, correct offset
const t0 = randomCheckInISO("2026-09-01", "06:00", "09:00", 0);
assert.equal(t0, "2026-09-01T06:00:00+07:00");
const t1 = randomCheckInISO("2026-09-01", "06:00", "09:00", 0.999);
assert.match(t1, /^2026-09-01T08:5\d:00\+07:00$/);
const hour = new Date(randomCheckInISO("2026-09-01", "18:00", "21:00", 0.5)).getUTCHours();
assert.equal(hour, 12); // 19:30 WIB -> 12:30 UTC

// rollConfidence — low bucket below threshold, normal bucket at/above
let lowN = 0;
for (let i = 0; i < 1000; i++) {
  const r = rollConfidence(i / 1000, ((i * 7) % 1000) / 1000, {
    confMin: 72,
    confMax: 99,
    lowConfPct: 12,
    threshold: 50,
  });
  assert.ok(r.confidence >= 0 && r.confidence <= 100);
  if (r.lowConfidence) {
    assert.ok(r.confidence < 50);
    lowN++;
  } else {
    assert.ok(r.confidence >= 50);
  }
}
assert.ok(lowN > 90 && lowN < 150, `low-conf share off: ${lowN}/1000`);

// mockRawScores — dominant matches category, values ~sum to 100
const s = mockRawScores("BADMOOD", 80, 0);
assert.equal(s.sad, 80);
const sum = Object.values(s).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(sum - 100) < 0.5, `raw scores sum ${sum}`);
assert.equal(mockRawScores("HAPPY", 90, 0.9).happy, 90);

// targetCount — inside [min,max] % of memberCount, never exceeds memberCount
assert.equal(targetCount(200, 75, 95, 0), 150);
assert.equal(targetCount(200, 75, 95, 1), 190);
assert.equal(targetCount(200, 80, 80, 0.5), 160); // min == max => fixed
assert.equal(targetCount(10, 0, 200, 1), 10); // clamps to memberCount
for (let i = 0; i <= 20; i++) {
  const c = targetCount(183, 60, 90, i / 20);
  assert.ok(c >= Math.round(183 * 0.6) && c <= Math.round(183 * 0.9));
}

// splitDayNight — day + night == total, day ≈ dayShare%
assert.deepEqual(splitDayNight(100, 55), [55, 45]);
assert.deepEqual(splitDayNight(0, 55), [0, 0]);
assert.deepEqual(splitDayNight(10, 0), [0, 10]);
assert.deepEqual(splitDayNight(10, 100), [10, 0]);
for (const t of [3, 17, 156, 999]) {
  const [d, n] = splitDayNight(t, 55);
  assert.equal(d + n, t);
}

// shuffle — same multiset, input untouched
let seed = 42;
const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const src = [1, 2, 3, 4, 5, 6, 7, 8];
const a = shuffle(src, rng);
assert.deepEqual([...a].sort((x, y) => x - y), src);
assert.deepEqual(src, [1, 2, 3, 4, 5, 6, 7, 8]);

// validateMockParams
const good: MockParams = {
  startDate: "2026-08-20",
  endDate: "2026-09-02",
  targetMin: 75,
  targetMax: 95,
  oneShiftPerDay: true,
  dayShare: 55,
  dayFrom: "06:00",
  dayTo: "09:00",
  nightFrom: "18:00",
  nightTo: "21:00",
  distHappy: 55,
  distNetral: 30,
  distBadmood: 15,
  confMin: 72,
  confMax: 99,
  lowConfPct: 12,
};
assert.equal(validateMockParams(good), null);
assert.match(validateMockParams({ ...good, distBadmood: 20 })!, /berjumlah 100/);
assert.match(validateMockParams({ ...good, startDate: "2026-09-03" })!, /setelah tanggal selesai/);
assert.match(validateMockParams({ ...good, dayFrom: "10:00", dayTo: "09:00" })!, /Day/);
assert.match(validateMockParams({ ...good, startDate: "2026-01-01", endDate: "2026-12-31" })!, /maksimal/);
assert.match(validateMockParams({ ...good, confMin: 80, confMax: 70 })!, /min ≤ max/);
assert.match(validateMockParams({ ...good, targetMin: 90, targetMax: 70 })!, /Target kehadiran/);
assert.match(validateMockParams({ ...good, targetMax: 120 })!, /Target kehadiran/);
assert.equal(validateMockParams({ ...good, targetMin: 50, targetMax: 50 }), null);
assert.match(validateMockParams({ ...good, dayShare: 140 })!, /Porsi Day/);
assert.equal(validateMockParams({ ...good, oneShiftPerDay: false, dayShare: 0 }), null);

// parseMockParams round-trips through a FormData-like getter
// (oneShiftPerDay is a checkbox: "on" when checked, absent otherwise)
const fd = new Map(
  Object.entries({ ...good }).map(([k, v]) => [k, k === "oneShiftPerDay" ? (v ? "on" : "") : String(v)]),
);
const parsed = parseMockParams((k) => fd.get(k) ?? "");
assert.deepEqual(parsed, good);
assert.equal(parseMockParams((k) => (k === "oneShiftPerDay" ? "" : "1")).oneShiftPerDay, false);

console.log("mock.selfcheck: all assertions passed");
