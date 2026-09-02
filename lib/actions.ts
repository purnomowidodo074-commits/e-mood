"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "./auth";
import { usernameToEmail } from "./username";
import * as q from "./queries";
import type { Category } from "./queries";

// ---- Leader: follow-up ----

export async function followUpAction(formData: FormData) {
  const user = await requireUser(["leader", "admin"]);
  const recordId = String(formData.get("recordId"));
  const followed_up = formData.get("followed_up") === "on";
  const note = String(formData.get("note") ?? "");
  await q.setFollowUp(recordId, followed_up, note, user.id);
  revalidatePath("/dashboard");
}

// ---- Reset data ----
// Two entry points, same underlying wipe. Kept as separate exports (rather
// than one action with a bypassable flag) so the no-auth path is a explicit,
// grep-able decision in the code, not something a future edit widens by
// accident. Both are wired up in components/ResetDataButton.tsx.

async function doResetMoodRecords(): Promise<{ deleted: number }> {
  const deleted = await q.resetAllMoodRecords();
  revalidatePath("/dashboard");
  revalidatePath("/kiosk/dashboard");
  return { deleted };
}

/** Wipes all mood records (attendance history) back to zero. Used by the
 * admin dashboard's Reset Data button — re-checks requireUser(["admin"])
 * server-side since the button's role gate in the UI is not itself
 * enforcement. Members and dashboard user accounts are untouched. */
export async function resetMoodRecordsAction(): Promise<{ deleted: number }> {
  await requireUser(["admin"]);
  return doResetMoodRecords();
}

/** Same wipe, but reachable with NO authentication at all — wired to the
 * public, no-login /kiosk/dashboard mirror at the product owner's explicit
 * request (anyone with access to that screen can trigger it; there is
 * deliberately no password or role check here). */
export async function resetMoodRecordsPublicAction(): Promise<{ deleted: number }> {
  return doResetMoodRecords();
}

// ---- Admin: members ----

export async function createMemberAction(formData: FormData) {
  await requireUser(["admin"]);
  const noreg = String(formData.get("noreg") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();
  const line = String(formData.get("line") ?? "").trim().toUpperCase();
  if (!noreg || !nama) return;
  await q.createMember(noreg, nama, line);
  revalidatePath("/admin/members");
}

export async function updateMemberAction(formData: FormData) {
  await requireUser(["admin"]);
  const id = String(formData.get("id"));
  const noreg = String(formData.get("noreg") ?? "").trim();
  const nama = String(formData.get("nama") ?? "").trim();
  const line = String(formData.get("line") ?? "").trim().toUpperCase();
  if (!noreg || !nama) return;
  await q.updateMember(id, noreg, nama, line);
  revalidatePath("/admin/members");
}

export async function setMemberActiveAction(formData: FormData) {
  await requireUser(["admin"]);
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";
  await q.setMemberActive(id, isActive);
  revalidatePath("/admin/members");
}

// ---- Admin: emotion mapping & threshold ----

export async function updateEmotionMappingAction(formData: FormData) {
  await requireUser(["admin"]);
  const emotion = String(formData.get("emotion"));
  const category = String(formData.get("category")) as Category;
  await q.updateEmotionMapping(emotion, category);
  revalidatePath("/admin/config");
}

export async function updateThresholdAction(formData: FormData) {
  await requireUser(["admin"]);
  const value = Number(formData.get("threshold"));
  if (Number.isNaN(value) || value < 0 || value > 100) return;
  await q.setConfidenceThreshold(value);
  revalidatePath("/admin/config");
}

// ---- Admin: shift config ----

export async function updateShiftConfigAction(formData: FormData) {
  await requireUser(["admin"]);
  const shift = String(formData.get("shift"));
  const start = String(formData.get("start_time"));
  const end = String(formData.get("end_time"));
  await q.updateShiftConfig(shift, start, end);
  revalidatePath("/admin/config");
}

// ---- Admin: dashboard users ----

export async function createDashboardUserAction(
  formData: FormData
): Promise<{ error?: string }> {
  await requireUser(["admin"]);
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!name || !username || password.length < 8 || !role) {
    return { error: "Lengkapi semua field. Password minimal 8 karakter." };
  }

  // Server-to-server call to Neon Auth's REST API (not the browser SDK) so this
  // doesn't touch the admin's own session cookie on the auth server's domain.
  // Neon Auth rejects the call with 400 MISSING_ORIGIN unless we forward an
  // allow-listed Origin — reuse this request's own (same origin the browser SDK
  // uses to sign in, so it's already allow-listed).
  const h = await headers();
  const origin =
    h.get("origin") ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
  const res = await fetch(`${process.env.NEXT_PUBLIC_NEON_AUTH_URL}/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ name, email: usernameToEmail(username), password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { error: body?.message ?? "Gagal membuat akun (mungkin username sudah dipakai)." };
  }

  const body = (await res.json()) as { user?: { id: string } };
  const userId = body.user?.id;
  if (!userId) return { error: "Akun dibuat tapi ID tidak ditemukan." };

  try {
    await q.setUserRole(userId, role);
  } catch (e) {
    revalidatePath("/admin/users");
    return { error: e instanceof Error ? e.message : "Gagal menetapkan role." };
  }
  revalidatePath("/admin/users");
  return {};
}

export async function setUserRoleAction(formData: FormData) {
  await requireUser(["admin"]);
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role"));
  await q.setUserRole(userId, role);
  revalidatePath("/admin/users");
}

export async function deleteDashboardUserAction(
  formData: FormData
): Promise<{ error?: string }> {
  const me = await requireUser(["admin"]);
  const userId = String(formData.get("userId"));
  if (userId === me.id) return { error: "Tidak bisa menghapus akun sendiri." };
  await q.deleteDashboardUser(userId);
  revalidatePath("/admin/users");
  return {};
}
