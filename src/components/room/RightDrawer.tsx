"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RightDrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function RightDrawer({
  open,
  title,
  onClose,
  children,
}: RightDrawerProps) {
  return (
    <aside
      aria-label={title}
      aria-hidden={!open}
      className={cn(
        "fixed right-0 top-0 z-30 flex h-full w-full flex-col border-l border-border bg-background transition-transform duration-200 ease-out-quart md:w-80",
        "pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]",
        !open && "translate-x-full"
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {title}
        </h3>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="-mr-1 flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </aside>
  );
}
