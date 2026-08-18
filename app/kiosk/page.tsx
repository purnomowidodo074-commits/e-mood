import { getCurrentUser } from "@/lib/auth";
import { KioskClient } from "@/components/KioskClient";

// Kiosk itself needs no login (FR-7.1) — but the lock icon in the corner is
// how anyone reaches the dashboard/admin area: to /dashboard if this browser
// already has a session, otherwise to /login first.
export default async function KioskPage() {
  const user = await getCurrentUser();
  return <KioskClient hasSession={!!user} />;
}
