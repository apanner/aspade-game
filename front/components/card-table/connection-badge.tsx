"use client"

import { cn } from "@/lib/utils"

export type ConnectionStatus = "connected" | "connecting" | "disconnected"

type ConnectionBadgeProps = {
  status: ConnectionStatus
  className?: string
}

export function ConnectionBadge({ status, className }: ConnectionBadgeProps) {
  if (status === "connected") return null

  const isConnecting = status === "connecting"

  return (
    <div
      className={cn(
        "pointer-events-none flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
        isConnecting
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-red-500/30 bg-red-500/10 text-red-300",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          isConnecting ? "animate-pulse bg-amber-400" : "bg-red-500"
        )}
        aria-hidden
      />
      {isConnecting ? "Connecting…" : "Reconnecting…"}
    </div>
  )
}
