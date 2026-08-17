import "server-only";
import { sql } from "./db";

export type Category = "HAPPY" | "NETRAL" | "BADMOOD";

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
    select id, noreg, nama, recorded_at, shift, category, confidence,
           low_confidence, source, followed_up, followup_note
    from mood_records
    where (recorded_at at time zone 'Asia/Jakarta')::date = ${date}::date
      and (${shift ?? null}::text is null or shift = ${shift ?? null})
    order by recorded_at desc
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
export async function getDailyTrend(startDate: string, endDate: string) {
  const rows = await sql`
    select (recorded_at at time zone 'Asia/Jakarta')::date as day, category, count(*)::int as count
    from mood_records
    where (recorded_at at time zone 'Asia/Jakarta')::date between ${startDate}::date and ${endDate}::date
    group by day, category
    order by day
  `;
  return rows as { day: string; category: Category; count: number }[];
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
  is_active: boolean;
  created_at: string;
};

export async function listMembers(search?: string): Promise<Member[]> {
  const rows = await sql`
    select id, noreg, nama, is_active, created_at
    from members
    where ${search ?? null}::text is null
       or nama ilike '%' || ${search ?? null} || '%'
       or noreg ilike '%' || ${search ?? null} || '%'
    order by nama
  `;
  return rows as Member[];
}

export async function createMember(noreg: string, nama: string) {
  await sql`insert into members (noreg, nama) values (${normalizeNoreg(noreg)}, ${nama})`;
}

export async function updateMember(id: string, noreg: string, nama: string) {
  await sql`update members set noreg = ${normalizeNoreg(noreg)}, nama = ${nama} where id = ${id}::uuid`;
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
  const rows = await sql`select shift, start_time, end_time from shift_config order by shift`;
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
  await sql`update neon_auth."user" set role = ${role} where id = ${userId}::uuid`;
}
