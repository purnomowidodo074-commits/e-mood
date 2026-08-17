"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/members", label: "Member" },
  { href: "/admin/config", label: "Konfigurasi" },
  { href: "/admin/users", label: "User Dashboard" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-surface">
      <nav className="mx-auto flex max-w-7xl gap-1 px-4">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`cursor-pointer border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-slate-600 hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
