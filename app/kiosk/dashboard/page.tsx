import Link from "next/link";
import { Fraunces } from "next/font/google";
import { AppBackground } from "@/components/AppBackground";
import { IconArrowLeft } from "@/components/icons";
import { LeaderView } from "@/app/dashboard/page";

// Mirrors app/dashboard/layout.tsx — same editorial serif, kept in sync since
// this public kiosk-dashboard mirror renders the same LeaderView headings.
const editorialSerif = Fraunces({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
});

// Public, read-only mirror of /dashboard reachable straight from the kiosk —
// no login (FR: kiosk dashboard button must not gate on auth). Follow-up
// notes are view-only here; editing still requires the real admin login.
// Reset Data IS shown here too, unauthenticated, per explicit product
// decision — see resetMoodRecordsPublicAction in lib/actions.ts.
export default async function KioskDashboardPage(props: PageProps<"/kiosk/dashboard">) {
  const searchParams = await props.searchParams;

  return (
    <div className={`${editorialSerif.variable} relative flex min-h-screen flex-col overflow-hidden`}>
      <AppBackground />
      <header className="relative z-10 flex items-center gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/kiosk"
          aria-label="Kembali ke kiosk"
          title="Kembali ke kiosk"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface/80 text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-primary"
        >
          <IconArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-medium text-muted-foreground">Kiosk</span>
      </header>
      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 pb-6 sm:px-6">
        <LeaderView searchParams={searchParams} readOnly showReset resetIsPublic />
      </main>
    </div>
  );
}
