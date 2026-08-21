"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { Wordmark } from "@/components/brand/Wordmark";
import { UserAvatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { InstallButton } from "@/components/pwa/InstallButton";
import { LogOut } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { MobileNav } from "./MobileNav";
import { PresenceProvider } from "@/components/presence/PresenceProvider";
import { useI18n } from "@/lib/i18n/context";

interface AppShellProps {
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
    status_message?: string | null;
    status_emoji?: string | null;
  };
  isAdmin?: boolean;
  children: React.ReactNode;
}

export function AppShell({ user, isAdmin = false, children }: AppShellProps) {
  const { t } = useI18n();
  const hasStatus = !!(user.status_message || user.status_emoji);

  return (
    <PresenceProvider selfId={user.id}>
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <aside
          className="hidden w-60 shrink-0 flex-col border-r border-border bg-background p-4 md:flex"
          aria-label={t("nav.sidebar")}
        >
          <div className="mb-4 flex items-center justify-between gap-2 pr-1">
            <Link
              href="/inicio"
              className="flex items-center gap-2.5 rounded-md px-2 py-1"
            >
              <BrandMark className="h-6 w-6" animate />
              <Wordmark className="text-sm" />
            </Link>
            <LanguageSwitcher align="right" />
          </div>
          <div className="mb-6 flex justify-start">
            <InstallButton />
          </div>

          <SidebarNav isAdmin={isAdmin} />

          <div className="mt-auto space-y-2">
            <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-3">
              <UserAvatar
                name={user.display_name}
                src={user.avatar_url}
                size="md"
                status="online"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">
                  {user.display_name}
                </p>
                <p className="truncate font-mono text-xs text-text-muted">
                  @{user.username}
                </p>
                {hasStatus && (
                  <p className="mt-1 truncate text-xs text-text-secondary">
                    {user.status_emoji && (
                      <span className="mr-1">{user.status_emoji}</span>
                    )}
                    {user.status_message}
                  </p>
                )}
              </div>
              <form action="/api/auth/sair" method="post">
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label={t("nav.signOut")}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>

            <p className="flex items-center justify-center gap-3 text-[10px] text-text-muted">
              <Link
                href="/termos"
                className="hover:text-text-secondary"
              >
                {t("nav.terms")}
              </Link>
              <span>·</span>
              <Link
                href="/privacidade"
                className="hover:text-text-secondary"
              >
                {t("nav.privacy")}
              </Link>
            </p>
          </div>
        </aside>

        {/* Header mobile — brand + seletor de idioma */}
        <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
          <Link
            href="/inicio"
            className="flex items-center gap-2 rounded-md"
            aria-label="Circly"
          >
            <BrandMark className="h-6 w-6" />
            <Wordmark className="text-sm" />
          </Link>
          <div className="flex items-center gap-1.5">
            <InstallButton />
            <LanguageSwitcher align="right" idPrefix="lang-mobile" />
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 pb-20 pt-14 md:pb-0 md:pt-0">{children}</main>

        {/* Nav mobile */}
        <MobileNav />
      </div>
    </PresenceProvider>
  );
}
