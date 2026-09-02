// Pure helpers for the admin "Mock Data" generator (app/admin/mock).
// No DB / no "server-only" import so lib/mock.selfcheck.ts can exercise them.

export type MoodCategory = "HAPPY" | "NETRAL" | "BADMOOD";

export type MockParams = {
  startDate: string; // YYYY-MM-DD (Asia/Jakarta calendar day)
  endDate: string;
  targetMin: number; // 0..100 of active members; each day+shift draws a random % in [min,max]
  targetMax: number;
  dayFrom: string; // "HH:MM"
  dayTo: string;
  nightFrom: string;
  nightTo: string;
  distHappy: number; // the three sum to 100
  distNetral: number;
  distBadmood: number;
  confMin: number; // 0..100
  confMax: number;
  lowConfPct: number; // 0..100 of records forced below the confidence threshold
};

export const MAX_RANGE_DAYS = 31;

export function parseMockParams(get: (k: string) => string): MockParams {
  return {
    startDate: get("startDate"),
    endDate: get("endDate"),
    targetMin: Number(get("targetMin")),
    targetMax: Number(get("targetMax")),
    dayFrom: get("dayFrom"),
    dayTo: get("dayTo"),
    nightFrom: get("nightFrom"),
    nightTo: get("nightTo"),
    distHappy: Number(get("distHappy")),
    distNetral: Number(get("distNetral")),
    distBadmood: Number(get("distBadmood")),
    confMin: Number(get("confMin")),
    confMax: Number(get("confMax")),
    lowConfPct: Number(get("lowConfPct")),
  };
}

/** Returns an error string, or null if params are usable. */
export function validateMockParams(p: MockParams): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(p.endDate))
    return "Tanggal tidak valid.";
  if (p.startDate > p.endDate) return "Tanggal mulai setelah tanggal selesai.";
  if (eachDate(p.startDate, p.endDate).length > MAX_RANGE_DAYS)
    return `Rentang maksimal ${MAX_RANGE_DAYS} hari.`;
  if (!(p.targetMin >= 0 && p.targetMax <= 100 && p.targetMin <= p.targetMax))
    return "Target kehadiran min/max harus 0–100 dan min ≤ max.";
  for (const [f, t, name] of [
    [p.dayFrom, p.dayTo, "Day"],
    [p.nightFrom, p.nightTo, "Night"],
  ] as const) {
    if (!/^\d{2}:\d{2}$/.test(f) || !/^\d{2}:\d{2}$/.test(t)) return `Jam ${name} tidak valid.`;
    if (toMinutes(f) >= toMinutes(t)) return `Jam ${name}: "dari" harus sebelum "sampai".`;
  }
  const sum = p.distHappy + p.distNetral + p.distBadmood;
  if (Math.round(sum) !== 100) return `Distribusi mood harus berjumlah 100 (sekarang ${sum}).`;
  if ([p.distHappy, p.distNetral, p.distBadmood].some((v) => v < 0)) return "Distribusi mood tidak boleh negatif.";
  if (!(p.confMin >= 0 && p.confMax <= 100 && p.confMin <= p.confMax))
    return "Confidence min/max harus 0–100 dan min ≤ max.";
  if (!(p.lowConfPct >= 0 && p.lowConfPct <= 100)) return "% kurang yakin harus 0–100.";
  return null;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Inclusive list of YYYY-MM-DD from start to end (calendar arithmetic, TZ-free). */
export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** How many members to record for one day+shift: a random % in [min,max] of `memberCount`. */
export function targetCount(memberCount: number, min: number, max: number, rand: number): number {
  const pct = min + rand * (max - min);
  return Math.min(memberCount, Math.max(0, Math.round((memberCount * pct) / 100)));
}

/** Weighted category pick. `rand` in [0,1). Weights need not be normalized. */
export function pickCategory(rand: number, w: { HAPPY: number; NETRAL: number; BADMOOD: number }): MoodCategory {
  const total = w.HAPPY + w.NETRAL + w.BADMOOD || 1;
  const x = rand * total;
  if (x < w.HAPPY) return "HAPPY";
  if (x < w.HAPPY + w.NETRAL) return "NETRAL";
  return "BADMOOD";
}

/** ISO string with the +07:00 (Asia/Jakarta) offset for a random minute in [from,to) of `date`. */
export function randomCheckInISO(date: string, from: string, to: string, rand: number): string {
  const a = toMinutes(from);
  const b = toMinutes(to);
  const mins = Math.floor(a + rand * (b - a));
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");
  return `${date}T${hh}:${mm}:00+07:00`;
}

/**
 * confidence + low_confidence flag. `rLow`/`rVal` in [0,1).
 * `lowConfPct`% of records land below `threshold` (marked "kurang yakin"),
 * the rest land in [max(confMin,threshold) .. confMax].
 */
export function rollConfidence(
  rLow: number,
  rVal: number,
  p: { confMin: number; confMax: number; lowConfPct: number; threshold: number },
): { confidence: number; lowConfidence: boolean } {
  if (rLow * 100 < p.lowConfPct) {
    const hi = Math.max(1, p.threshold - 1);
    const lo = Math.max(0, p.threshold - 25);
    const c = Math.round(lo + rVal * (hi - lo));
    return { confidence: c, lowConfidence: c < p.threshold };
  }
  const lo = Math.min(Math.max(p.confMin, p.threshold), 100);
  const hi = Math.max(lo, p.confMax);
  const c = Math.round(lo + rVal * (hi - lo));
  return { confidence: c, lowConfidence: c < p.threshold };
}

const EMOTIONS = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"] as const;
const DOMINANT_BY_CATEGORY: Record<MoodCategory, readonly string[]> = {
  HAPPY: ["happy"],
  NETRAL: ["neutral", "surprise"],
  BADMOOD: ["sad", "angry", "fear", "disgust"],
};

/** DeepFace-shaped score object: dominant emotion ≈ confidence, rest split the remainder. */
export function mockRawScores(category: MoodCategory, confidence: number, rand: number): Record<string, number> {
  const pool = DOMINANT_BY_CATEGORY[category];
  const dominant = pool[Math.floor(rand * pool.length) % pool.length];
  const rest = Math.max(0, (100 - confidence) / (EMOTIONS.length - 1));
  const scores: Record<string, number> = {};
  for (const e of EMOTIONS) scores[e] = Number((e === dominant ? confidence : rest).toFixed(2));
  return scores;
}

/** Fisher–Yates using a supplied [0,1) RNG (so the self-check is deterministic). */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
