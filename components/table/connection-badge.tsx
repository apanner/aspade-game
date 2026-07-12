"use client"

import { cn } from "@/lib/utils"

export type ConnectionStatus = "connected" | "connecting" | "disconnected"

type ConnectionBadgeProps = {
  status: ConnectionStatus
  className?: string
}

export function ConnectionBadge({ status, className }: ConnectionBadgeProps) {
  const isLive = status === "connected"
  const isConnecting = status === "connecting"

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
        isLive && "border-team-us/30 bg-team-us/10 text-team-us",
        isConnecting && "border-amber-500/30 bg-amber-500/10 text-amber-300",
        status === "disconnected" && "border-red-500/30 bg-red-500/10 text-red-300",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          isLive && "live-dot bg-team-us",
          isConnecting && "animate-pulse bg-amber-400",
          status === "disconnected" && "bg-red-500"
        )}
        aria-hidden
      />
      {isLive ? "Live" : isConnecting ? "Syncing…" : "Offline"}
    </div>
  )
}
