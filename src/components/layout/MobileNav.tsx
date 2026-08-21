"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, DoorOpen, User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translate";

const items: Array<{
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/inicio", labelKey: "nav.home", icon: Home },
  { href: "/pessoas", labelKey: "nav.people", icon: Users },
  { href: "/mensagens", labelKey: "nav.dmsShort", icon: MessageSquare },
  { href: "/salas/nova", labelKey: "nav.newShort", icon: DoorOpen },
  { href: "/conta", labelKey: "nav.account", icon: User },
];

export function MobileNav({
  unreadMessages = 0,
}: {
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {items.map(({ href, labelKey, icon: Icon }) => {
          const active =
            href === "/inicio"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          const badge = href === "/mensagens" ? unreadMessages : 0;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                  active ? "text-brand" : "text-text-secondary"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span
                      aria-label={`${badge} não lidas`}
                      className="absolute -right-2 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-semibold leading-none text-brand-fg"
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
