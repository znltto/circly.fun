import * as React from "react";
import { cn } from "@/lib/utils";

type PresenceStatus = "online" | "in-call" | "busy" | "offline";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: PresenceStatus;
  className?: string;
}

const sizeMap = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-16 w-16 text-base",
};

const dotSizeMap = {
  sm: "h-1.5 w-1.5 border",
  md: "h-2 w-2 border",
  lg: "h-2.5 w-2.5 border-2",
  xl: "h-3 w-3 border-2",
};

export function UserAvatar({
  src,
  name,
  size = "md",
  status,
  className,
  ...props
}: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      {...props}
    >
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full",
          "bg-surface-raised font-medium uppercase text-text-secondary",
          sizeMap[size]
        )}
        aria-label={name}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </div>
      {status && (
        <PresenceIndicator
          status={status}
          className={cn(
            "absolute right-0 bottom-0 rounded-full border-background",
            dotSizeMap[size]
          )}
        />
      )}
    </div>
  );
}

interface PresenceIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: PresenceStatus;
  showLabel?: boolean;
  className?: string;
}

const presenceStyles: Record<PresenceStatus, { color: string; label: string }> = {
  online: { color: "bg-success", label: "Online" },
  "in-call": { color: "bg-brand", label: "Em uma sala" },
  busy: { color: "bg-warning", label: "Ocupado" },
  offline: { color: "bg-text-muted/60", label: "Offline" },
};

export function PresenceIndicator({
  status,
  showLabel,
  className,
  ...props
}: PresenceIndicatorProps) {
  const { color, label } = presenceStyles[status];

  if (showLabel) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-text-secondary",
          className
        )}
        {...props}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", color)} aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(color, className)}
      {...props}
    />
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
