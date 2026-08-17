"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconUsers, IconSettings, IconUserCog } from "@/components/icons";

const TABS = [
  { href: "/admin/members", label: "Member", icon: IconUsers },
  { href: "/admin/config", label: "Konfigurasi", icon: IconSettings },
  { href: "/admin/users", label: "User Dashboard", icon: IconUserCog },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border bg-surface/60">
      <nav className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`relative flex cursor-pointer items-center gap-2 px-3.5 py-3 text-sm font-medium transition-colors duration-[var(--dur-base)] ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span
                className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] ${
                  active ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
