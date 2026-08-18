import { redirect } from "next/navigation";

// Kiosk is the landing surface (FR-7.1 — no login needed to absen). Admin/
// dashboard access lives behind the lock icon inside /kiosk itself.
export default function Home() {
  redirect("/kiosk");
}
