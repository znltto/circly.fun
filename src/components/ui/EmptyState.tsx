import * as React from "react";
import { cn } from "@/lib/utils";
import { CcoMascot, type CcoVariant } from "@/components/brand/CcoMascot";

interface EmptyStateProps {
  title: string;
  description?: string;
  mascot?: CcoVariant;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  mascot = "waiting",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 px-6 py-12 text-center",
        className
      )}
      role="status"
    >
      <CcoMascot variant={mascot} className="h-24 w-24 text-text-secondary" />
      <div className="max-w-sm space-y-2">
        <h3 className="font-serif text-xl text-text-primary text-balance">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-text-secondary text-pretty">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
