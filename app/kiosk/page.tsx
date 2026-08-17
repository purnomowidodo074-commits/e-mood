import { getCurrentUser } from "@/lib/auth";
import { KioskClient } from "@/components/KioskClient";

// Kiosk itself needs no login (FR-7.1) — but if this browser already has a
// dashboard session, show a discreet link back to it so an admin can check
// whether their own absen went through.
export default async function KioskPage() {
  const user = await getCurrentUser();
  return <KioskClient isAdmin={user?.role === "admin"} />;
}
