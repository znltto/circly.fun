"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, DoorOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const items: NavItem[] = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/pessoas", label: "Pessoas", icon: Users },
  { href: "/salas/nova", label: "Nova sala", icon: DoorOpen },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/inicio"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "text-text-primary"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-4 -translate-y-1/2 w-0.5 rounded-full bg-brand"
              />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
