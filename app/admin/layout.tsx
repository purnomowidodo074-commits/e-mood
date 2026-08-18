import { requireUser } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";
import { AdminTabs } from "@/components/AdminTabs";
import { AppBackground } from "@/components/AppBackground";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["admin"]);

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      <AppBackground />
      <AppNav name={user.name} role={user.role} />
      <AdminTabs />
      <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
