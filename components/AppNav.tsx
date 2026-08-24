"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";
import type { Role } from "@/lib/auth";
import { IconLayoutDashboard, IconSettings, IconLogOut } from "@/components/icons";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  leader: "Leader",
  section_head: "Section Head",
};

export function AppNav({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard, show: true },
    { href: "/admin", label: "Admin", icon: IconSettings, show: role === "admin" },
  ].filter((l) => l.show);

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" });
    await authClient.signOut().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Toyota" width={100} height={28} className="h-7 w-auto object-contain" priority />
            <span className="h-5 w-px bg-border" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Happiness</span>
          </Link>
          <nav className="flex gap-1">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`group flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-[var(--dur-base)] ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 transition-transform duration-[var(--dur-base)] ${active ? "" : "group-hover:scale-110"}`} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="font-medium text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABEL[role]}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-[var(--dur-fast)] hover:border-destructive/40 hover:text-destructive"
          >
            <IconLogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
