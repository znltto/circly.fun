"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  DoorOpen,
  User,
  MessageSquare,
  Shield,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translate";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  admin?: boolean;
}

const items: NavItem[] = [
  { href: "/inicio", labelKey: "nav.home", icon: Home },
  { href: "/pessoas", labelKey: "nav.people", icon: Users },
  { href: "/mensagens", labelKey: "nav.messages", icon: MessageSquare },
  { href: "/salas/nova", labelKey: "nav.newRoom", icon: DoorOpen },
  { href: "/salas/agendadas", labelKey: "nav.scheduled", icon: Calendar },
  { href: "/conta", labelKey: "nav.account", icon: User },
  { href: "/admin", labelKey: "nav.admin", icon: Shield, admin: true },
];

export function SidebarNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="flex flex-col gap-0.5" aria-label={t("nav.main")}>
      {items.map(({ href, labelKey, icon: Icon, admin }) => {
        const active =
          href === "/inicio"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        // Renderiza SEMPRE (evita hydration mismatch) e esconde via CSS
        // quando o item é admin-only e o viewer não é admin.
        const hidden = admin && !isAdmin;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "text-text-primary"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              admin && !active && "text-brand/80 hover:text-brand",
              hidden && "hidden"
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-4 -translate-y-1/2 w-0.5 rounded-full bg-brand"
              />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t(labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
