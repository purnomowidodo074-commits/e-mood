// Factory is in Indonesia (WIB) — "today" must be computed in that timezone,
// not the server's (Neon compute region is us-west-2 / UTC-ish).
const TZ = "Asia/Jakarta";

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date()); // en-CA => YYYY-MM-DD
}

export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function formatDateID(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: TZ }).format(new Date(iso));
}

export function formatTimeID(isoDateTime: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(isoDateTime));
}

export function formatDayLabel(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", timeZone: TZ }).format(
    new Date(iso)
  );
}

export function isoDateAddDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function isoDateMinusDays(iso: string, days: number): string {
  return isoDateAddDays(iso, -days);
}

export function daysRange(endIso: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) out.push(isoDateMinusDays(endIso, i));
  return out;
}
