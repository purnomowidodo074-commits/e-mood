import { KioskClient } from "@/components/KioskClient";

// Kiosk itself needs no login (FR-7.1) — the Dashboard button in the corner
// goes straight to the public, read-only /kiosk/dashboard view, no auth.
export default function KioskPage() {
  return <KioskClient />;
}
