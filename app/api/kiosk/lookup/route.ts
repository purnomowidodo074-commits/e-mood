import { NextResponse } from "next/server";
import { findMemberByNoreg, findExistingRecordToday, listShiftConfig } from "@/lib/queries";
import { computeCurrentShift } from "@/lib/shift";
import { formatTimeID } from "@/lib/date";

// Public endpoint — kiosk identifies members by Noreg only, no login (FR-7.1).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const noreg = typeof body?.noreg === "string" ? body.noreg.trim() : "";
  if (!noreg) {
    return NextResponse.json({ error: "Noreg kosong" }, { status: 400 });
  }

  const member = await findMemberByNoreg(noreg);
  if (!member) {
    return NextResponse.json({ found: false });
  }

  const shifts = await listShiftConfig();
  const shift = computeCurrentShift(shifts);
  const existing = await findExistingRecordToday(member.id, shift);

  return NextResponse.json({
    found: true,
    member: { id: member.id, noreg: member.noreg, nama: member.nama },
    shift,
    alreadyRecorded: !!existing,
    existingTime: existing ? formatTimeID(existing.recorded_at) : null,
  });
}
