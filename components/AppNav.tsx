"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";
import type { Role } from "@/lib/auth";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  leader: "Leader",
  section_head: "Section Head",
};

export function AppNav({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/admin", label: "Admin", show: role === "admin" },
  ].filter((l) => l.show);

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    await authClient.signOut().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-foreground">e-Mood</span>
          <nav className="flex gap-1">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-muted"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-600">
            {name} <span className="text-slate-400">· {ROLE_LABEL[role]}</span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="cursor-pointer rounded-md border border-border px-3 py-1.5 font-medium text-slate-600 transition-colors hover:bg-muted"
          >
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
