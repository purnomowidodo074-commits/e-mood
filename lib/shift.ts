import type { ShiftConfigRow } from "./queries";

/**
 * Menentukan shift berjalan dari jam sekarang (WIB), termasuk shift yang
 * melewati tengah malam (mis. Night: 18:00–06:00).
 */
export function computeCurrentShift(shifts: ShiftConfigRow[], now: Date = new Date()): string {
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(now); // "HH:MM"

  for (const s of shifts) {
    const start = s.start_time.slice(0, 5);
    const end = s.end_time.slice(0, 5);
    const overnight = start > end;
    const inRange = overnight ? hhmm >= start || hhmm < end : hhmm >= start && hhmm < end;
    if (inRange) return s.shift;
  }

  // ponytail: shift_config kosong/tidak menutup 24 jam — fallback ke shift pertama
  // agar absen tetap tercatat daripada gagal total.
  return shifts[0]?.shift ?? "Day";
}
