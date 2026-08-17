import { NextResponse } from "next/server";
import {
  findMemberByNoreg,
  insertAutoMoodRecord,
  insertManualMoodRecord,
  listShiftConfig,
  type Category,
  type RawEmotionScores,
} from "@/lib/queries";
import { computeCurrentShift } from "@/lib/shift";
import { formatTimeID } from "@/lib/date";

const DEVICE_ID = process.env.KIOSK_DEVICE_ID ?? "kiosk-dev";

// Public endpoint — no login (FR-7.1). Shift is recomputed server-side, not trusted from the client.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const noreg = typeof body?.noreg === "string" ? body.noreg.trim() : "";
  const mode = body?.mode === "manual" ? "manual" : "auto";
  if (!noreg) return NextResponse.json({ error: "Noreg kosong" }, { status: 400 });

  const member = await findMemberByNoreg(noreg);
  if (!member) return NextResponse.json({ error: "Noreg tidak terdaftar" }, { status: 404 });

  const shifts = await listShiftConfig();
  const shift = computeCurrentShift(shifts);

  const result =
    mode === "manual"
      ? await insertManualMoodRecord(member, shift, body.category as Category, DEVICE_ID)
      : await insertAutoMoodRecord(
          member,
          shift,
          body.rawScores as RawEmotionScores,
          Number(body.framesUsed) || 0,
          DEVICE_ID
        );

  if (result.status === "duplicate") {
    return NextResponse.json(
      {
        error: `Anda sudah absen jam ${result.existingTime ? formatTimeID(result.existingTime) : "-"}`,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    nama: member.nama,
    category: result.category,
    confidence: result.confidence,
    lowConfidence: result.lowConfidence,
  });
}
