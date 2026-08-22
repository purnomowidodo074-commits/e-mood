import { Newsreader } from "next/font/google";
import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { AppBackground } from "@/components/AppBackground";

// Editorial serif for dashboard headings only — scoped to this layout, doesn't
// touch the sans/mono fonts loaded globally in app/layout.tsx.
const editorialSerif = Newsreader({
  variable: "--font-editorial-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      <AppBackground />
      <AppNav name={user.name} role={user.role} />
      <main
        className={`${editorialSerif.variable} relative mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6`}
      >
        {children}
      </main>
    </div>
  );
}
