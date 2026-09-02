import "server-only";
import { sql } from "./db";

export type Category = "HAPPY" | "NETRAL" | "BADMOOD";

/** device_id stamped on rows from the admin mock-data generator (app/admin/mock),
 * so they can be wiped separately from real kiosk attendance. */
export const MOCK_DEVICE_ID = "mock";

/** Noreg selalu 7 digit — kurang dari itu ditambal 0 di depan (data lama Excel bervariasi 5-7 digit). */
function normalizeNoreg(noreg: string): string {
  return noreg.trim().padStart(7, "0");
}

export type MoodRecordRow = {
  id: string;
  noreg: string;
  nama: string;
  recorded_at: string;
  shift: string;
  category: Category;
  confidence: number;
  low_confidence: boolean;
  source: "auto" | "manual";
  followed_up: boolean;
  followup_note: string | null;
  line: string | null;
};

export type MoodSummary = {
  happy: number;
  netral: number;
  badmood: number;
  total: number;
  totalActiveMembers: number;
};

/** Kartu ringkasan (FR-5.1): jumlah per kategori + total sudah absen dari total member aktif. */
export async function getMoodSummary(date: string, shift?: string): Promise<MoodSummary> {
  const rows = await sql`
    select category, count(*)::int as count
    from mood_records
    where (recorded_at at time zone 'Asia/Jakarta')::date = ${date}::date
      and (${shift ?? null}::text is null or shift = ${shift ?? null})
    group by category
  `;
  const counts: Record<Category, number> = { HAPPY: 0, NETRAL: 0, BADMOOD: 0 };
  for (const r of rows as { category: Category; count: number }[]) counts[r.category] = r.count;

  const [{ count: totalActiveMembers }] = (await sql`
    select count(*)::int as count from members where is_active
  `) as { count: number }[];

  return {
    happy: counts.HAPPY,
    netral: counts.NETRAL,
    badmood: counts.BADMOOD,
    total: counts.HAPPY + counts.NETRAL + counts.BADMOOD,
    totalActiveMembers,
  };
}

/** Tabel detail per-member (FR-5.5), untuk Leader. */
export async function getMoodRecords(date: string, shift?: string): Promise<MoodRecordRow[]> {
  const rows = await sql`
    select r.id, r.noreg, r.nama, r.recorded_at, r.shift, r.category, r.confidence,
           r.low_confidence, r.source, r.followed_up, r.followup_note,
           m.line as line
    from mood_records r
    left join members m on m.id = r.member_id
    where (r.recorded_at at time zone 'Asia/Jakarta')::date = ${date}::date
      and (${shift ?? null}::text is null or r.shift = ${shift ?? null})
    order by r.recorded_at desc
  `;
  return rows as MoodRecordRow[];
}

/** Panel "Belum Absen" (FR-5.7): member aktif tanpa record di tanggal terpilih. */
export async function getUnrecordedMembers(date: string) {
  const rows = await sql`
    select m.noreg, m.nama
    from members m
    where m.is_active
      and not exists (
        select 1 from mood_records r
        where r.member_id = m.id
          and (r.recorded_at at time zone 'Asia/Jakarta')::date = ${date}::date
      )
    order by m.nama
  `;
  return rows as { noreg: string; nama: string }[];
}

/** Tren harian per kategori dalam rentang tanggal (FR-5.4), untuk Section Head — agregat saja. */
export async function getDailyTrend(startDate: string, endDate: string, shift?: string) {
  const rows = await sql`
    select ((recorded_at at time zone 'Asia/Jakarta')::date)::text as day, category, count(*)::int as count
    from mood_records
    where (recorded_at at time zone 'Asia/Jakarta')::date between ${startDate}::date and ${endDate}::date
      and (${shift ?? null}::text is null or shift = ${shift ?? null})
    group by day, category
    order by day
  `;
  return rows as { day: string; category: Category; count: number }[];
}

/** Tren per jam absensi untuk satu hari (dipakai saat filter tren = 1D) — X = jam. */
export async function getHourlyTrend(date: string, shift?: string) {
  const rows = await sql`
    select extract(hour from (recorded_at at time zone 'Asia/Jakarta'))::int as hour, category, count(*)::int as count
    from mood_records
    where (recorded_at at time zone 'Asia/Jakarta')::date = ${date}::date
      and (${shift ?? null}::text is null or shift = ${shift ?? null})
    group by hour, category
    order by hour
  `;
  return rows as { hour: number; category: Category; count: number }[];
}

/** Perbandingan antar shift dalam rentang tanggal (FR-5.3/US-16), agregat saja. */
export async function getShiftComparison(startDate: string, endDate: string) {
  const rows = await sql`
    select shift, category, count(*)::int as count
    from mood_records
    where (recorded_at at time zone 'Asia/Jakarta')::date between ${startDate}::date and ${endDate}::date
    group by shift, category
    order by shift
  `;
  return rows as { shift: string; category: Category; count: number }[];
}

/** Perbandingan per Line (Y = nama line, X = quantity) — stacked Happy/Netral/Badmood. */
export async function getLineComparison(startDate: string, endDate: string, shift?: string) {
  const rows = await sql`
    select coalesce(nullif(trim(m.line), ''), 'Tanpa Line') as line, r.category, count(*)::int as count
    from mood_records r
    left join members m on m.id = r.member_id
    where (r.recorded_at at time zone 'Asia/Jakarta')::date between ${startDate}::date and ${endDate}::date
      and (${shift ?? null}::text is null or r.shift = ${shift ?? null})
    group by line, r.category
    order by line
  `;
  return rows as { line: string; category: Category; count: number }[];
}

// ---- Kiosk (FR-1, FR-3, FR-4 — no auth, identification is by Noreg only) ----

export type KioskMember = { id: string; noreg: string; nama: string };

export async function findMemberByNoreg(noreg: string): Promise<KioskMember | null> {
  const rows = await sql`
    select id, noreg, nama from members where noreg = ${normalizeNoreg(noreg)} and is_active
  `;
  return (rows[0] as KioskMember | undefined) ?? null;
}

/** FR-1.5: menolak absen ganda di shift yang sama (hari WIB berjalan). */
export async function findExistingRecordToday(memberId: string, shift: string) {
  const rows = await sql`
    select recorded_at from mood_records
    where member_id = ${memberId}::uuid
      and shift = ${shift}
      and (recorded_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date
    limit 1
  `;
  return (rows[0] as { recorded_at: string } | undefined) ?? null;
}

export type RawEmotionScores = Record<
  "angry" | "disgust" | "fear" | "happy" | "sad" | "surprise" | "neutral",
  number
>;

export type KioskResult = {
  status: "ok" | "duplicate";
  category?: Category;
  confidence?: number;
  lowConfidence?: boolean;
  existingTime?: string;
};

/** FR-3.3–3.7: rata-rata skor sudah dihitung di caller; di sini tinggal map ke kategori + simpan. */
export async function insertAutoMoodRecord(
  member: KioskMember,
  shift: string,
  rawScores: RawEmotionScores,
  framesUsed: number,
  deviceId: string
): Promise<KioskResult> {
  const mapping = await listEmotionMapping();
  const threshold = await getConfidenceThreshold();

  const entries = Object.entries(rawScores) as [keyof RawEmotionScores, number][];
  const [dominantEmotion, confidence] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  const category = mapping.find((m) => m.emotion === dominantEmotion)?.category ?? "NETRAL";
  const lowConfidence = confidence < threshold;

  return insertRecord(member, shift, category, confidence, lowConfidence, rawScores, "auto", framesUsed, deviceId);
}

/** FR-3.9: fallback manual setelah 3x gagal deteksi wajah — member pilih sendiri. */
export async function insertManualMoodRecord(
  member: KioskMember,
  shift: string,
  category: Category,
  deviceId: string
): Promise<KioskResult> {
  return insertRecord(member, shift, category, 100, false, { manual: true }, "manual", null, deviceId);
}

async function insertRecord(
  member: KioskMember,
  shift: string,
  category: Category,
  confidence: number,
  lowConfidence: boolean,
  rawScores: unknown,
  source: "auto" | "manual",
  framesUsed: number | null,
  deviceId: string
): Promise<KioskResult> {
  // Absen kamera asli mengalahkan data demo: hapus semua baris mock member ini
  // untuk tanggal WIB berjalan (shift apa pun) sebelum mencatat yang asli — jadi
  // orangnya kehitung sekali saja, di shift aslinya (total harian tetap <= 100%).
  if (deviceId !== MOCK_DEVICE_ID) {
    await sql`
      delete from mood_records
      where member_id = ${member.id}::uuid
        and device_id = ${MOCK_DEVICE_ID}
        and (recorded_at at time zone 'Asia/Jakarta')::date = (now() at time zone 'Asia/Jakarta')::date
    `;
  }

  try {
    await sql`
      insert into mood_records
        (member_id, noreg, nama, shift, category, confidence, low_confidence, raw_scores, source, frames_used, device_id)
      values
        (${member.id}::uuid, ${member.noreg}, ${member.nama}, ${shift}, ${category}, ${confidence},
         ${lowConfidence}, ${JSON.stringify(rawScores)}::jsonb, ${source}, ${framesUsed}, ${deviceId})
    `;
    return { status: "ok", category, confidence, lowConfidence };
  } catch (err) {
    // 23505 = unique_violation (sudah absen shift ini hari ini — race dengan cek awal)
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      const existing = await findExistingRecordToday(member.id, shift);
      return { status: "duplicate", existingTime: existing?.recorded_at };
    }
    throw err;
  }
}

/** Admin-only "reset data" (dashboard): wipes every mood record so all counts
 * restart at zero. Members and dashboard user accounts are untouched — this
 * clears attendance history only, not master data. */
export async function resetAllMoodRecords(): Promise<number> {
  const rows = await sql`delete from mood_records returning id`;
  return rows.length;
}

// ---- Mock data generator (Admin, app/admin/mock) ----
// Rows are written with device_id = 'mock' so deleteMockMoodRecords can wipe
// only the demo data and leave real kiosk attendance untouched. insertRecord
// (above) also uses this to clear a member's mock rows on a real check-in.

export async function listActiveMembersForMock(): Promise<{ id: string; noreg: string; nama: string }[]> {
  return (await sql`select id, noreg, nama from members where is_active`) as {
    id: string;
    noreg: string;
    nama: string;
  }[];
}

/** (member_id, WIB day, shift) tuples already present in the range — used to skip
 * members that already have a record for a given day+shift. */
export async function listRecordKeysInRange(
  startDate: string,
  endDate: string,
): Promise<{ member_id: string; day: string; shift: string }[]> {
  return (await sql`
    select member_id,
           ((recorded_at at time zone 'Asia/Jakarta')::date)::text as day,
           shift
    from mood_records
    where (recorded_at at time zone 'Asia/Jakarta')::date between ${startDate}::date and ${endDate}::date
      and member_id is not null
  `) as { member_id: string; day: string; shift: string }[];
}

export type MockInsertRow = {
  memberId: string;
  noreg: string;
  nama: string;
  recordedAt: string; // ISO with +07:00
  shift: string;
  category: string;
  confidence: number;
  lowConfidence: boolean;
  rawScores: Record<string, number>;
  framesUsed: number;
};

export async function insertMockMoodRecords(rows: MockInsertRow[]): Promise<number> {
  const COLS = 12;
  // ponytail: 1000 rows/req keeps params (12k) well under Postgres' 65535 and
  // the whole generate to ~6 HTTP round-trips for a 2-week × 2-shift run. Bump
  // to a COPY stream only if a much larger range is ever needed.
  const CHUNK = 1000;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const params: unknown[] = [];
    const tuples = slice.map((r, idx) => {
      const b = idx * COLS;
      params.push(
        r.memberId,
        r.noreg,
        r.nama,
        r.recordedAt,
        r.shift,
        r.category,
        r.confidence,
        r.lowConfidence,
        JSON.stringify(r.rawScores),
        "auto",
        r.framesUsed,
        MOCK_DEVICE_ID,
      );
      return `($${b + 1}::uuid,$${b + 2},$${b + 3},$${b + 4}::timestamptz,$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9}::jsonb,$${b + 10},$${b + 11},$${b + 12})`;
    });
    const result = await sql.query(
      `insert into mood_records
         (member_id, noreg, nama, recorded_at, shift, category, confidence, low_confidence, raw_scores, source, frames_used, device_id)
       values ${tuples.join(",")}
       on conflict do nothing
       returning id`,
      params,
    );
    inserted += Array.isArray(result) ? result.length : (result as { rows: unknown[] }).rows.length;
  }
  return inserted;
}

export async function countMockMoodRecords(): Promise<number> {
  const rows = (await sql`select count(*)::int as c from mood_records where device_id = ${MOCK_DEVICE_ID}`) as {
    c: number;
  }[];
  return rows[0]?.c ?? 0;
}

export async function deleteMockMoodRecords(): Promise<number> {
  const rows = await sql`delete from mood_records where device_id = ${MOCK_DEVICE_ID} returning id`;
  return rows.length;
}

export async function setFollowUp(
  recordId: string,
  followed_up: boolean,
  note: string,
  actorId: string
) {
  await sql`
    update mood_records
    set followed_up = ${followed_up},
        followup_note = ${note || null},
        followup_by = ${actorId}::uuid,
        followup_at = now()
    where id = ${recordId}::uuid
  `;
}

// ---- Master data (Admin) ----

export type Member = {
  id: string;
  noreg: string;
  nama: string;
  line: string | null;
  is_active: boolean;
  created_at: string;
};

export async function listMembers(search?: string): Promise<Member[]> {
  const rows = await sql`
    select id, noreg, nama, line, is_active, created_at
    from members
    where ${search ?? null}::text is null
       or nama ilike '%' || ${search ?? null} || '%'
       or noreg ilike '%' || ${search ?? null} || '%'
    order by nama
  `;
  return rows as Member[];
}

export async function createMember(noreg: string, nama: string, line: string) {
  await sql`insert into members (noreg, nama, line) values (${normalizeNoreg(noreg)}, ${nama}, ${line || null})`;
}

export async function updateMember(id: string, noreg: string, nama: string, line: string) {
  await sql`update members set noreg = ${normalizeNoreg(noreg)}, nama = ${nama}, line = ${line || null} where id = ${id}::uuid`;
}

export async function setMemberActive(id: string, isActive: boolean) {
  await sql`update members set is_active = ${isActive} where id = ${id}::uuid`;
}

export type EmotionMappingRow = { emotion: string; category: Category };

export async function listEmotionMapping(): Promise<EmotionMappingRow[]> {
  const rows = await sql`select emotion, category from emotion_mapping order by emotion`;
  return rows as EmotionMappingRow[];
}

export async function updateEmotionMapping(emotion: string, category: Category) {
  await sql`
    update emotion_mapping set category = ${category}, updated_at = now()
    where emotion = ${emotion}
  `;
}

export async function getConfidenceThreshold(): Promise<number> {
  const rows = await sql`select value from app_config where key = 'confidence_threshold'`;
  return Number((rows[0] as { value: number } | undefined)?.value ?? 50);
}

export async function setConfidenceThreshold(value: number) {
  await sql`
    insert into app_config (key, value) values ('confidence_threshold', ${value}::jsonb)
    on conflict (key) do update set value = excluded.value
  `;
}

export type ShiftConfigRow = { shift: string; start_time: string; end_time: string };

export async function listShiftConfig(): Promise<ShiftConfigRow[]> {
  const rows = await sql`
    select shift, start_time, end_time from shift_config
    order by case shift when 'Day' then 0 when 'Night' then 1 else 2 end, shift
  `;
  return rows as ShiftConfigRow[];
}

export async function updateShiftConfig(shift: string, startTime: string, endTime: string) {
  await sql`
    update shift_config set start_time = ${startTime}::time, end_time = ${endTime}::time
    where shift = ${shift}
  `;
}

// ---- Dashboard users (Admin) ----

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

export async function listDashboardUsers(): Promise<DashboardUser[]> {
  const rows = await sql`
    select id, name, email, role from neon_auth."user" order by name
  `;
  return rows as DashboardUser[];
}

export async function setUserRole(userId: string, role: string) {
  // Neon Auth mirrors a new sign-up into neon_auth."user" with a ~2-3s lag, so
  // right after createDashboardUserAction's sign-up the row isn't there yet and
  // a plain UPDATE would silently match 0 rows (the "role tak ke-set" bug).
  // Poll via UPDATE ... RETURNING until it lands. Role changes from the admin
  // dropdown hit an existing row and return on the first pass.
  for (let i = 0; i < 25; i++) {
    const rows = await sql`
      update neon_auth."user" set role = ${role} where id = ${userId}::uuid returning id
    `;
    if (rows.length > 0) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Neon Auth belum sinkron akun baru — coba set role lagi dari tabel di bawah.");
}

/**
 * Removes a dashboard/admin account. We can only delete from the Neon Auth
 * mirror (neon_auth."user") — the hosted auth service keeps its own copy, but
 * with no mirror row getCurrentUser() returns null so the account can no longer
 * reach /dashboard or /admin. followup_by / audit_log.actor FKs are nulled
 * first so the delete isn't blocked by history (internal tool — the "who" on an
 * old follow-up matters less than being able to remove a person).
 */
export async function deleteDashboardUser(userId: string) {
  await sql`update mood_records set followup_by = null where followup_by = ${userId}::uuid`;
  await sql`update audit_log set actor = null where actor = ${userId}::uuid`;
  await sql`delete from neon_auth."user" where id = ${userId}::uuid`;
}
