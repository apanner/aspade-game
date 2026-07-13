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
        "flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        isLive && "border-[#3155e7]/40 bg-[#3155e7]/15 text-[#8fa7ff]",
        isConnecting && "border-[#ff7a45]/35 bg-[#ff7a45]/10 text-[#ff9a6e]",
        status === "disconnected" && "border-red-500/35 bg-red-500/10 text-red-300",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          isLive && "bg-[#8fa7ff] shadow-[0_0_6px_rgba(143,167,255,0.6)]",
          isConnecting && "animate-pulse bg-[#ff7a45]",
          status === "disconnected" && "bg-red-500"
        )}
        aria-hidden
      />
      {isLive ? "Live" : isConnecting ? "Sync" : "Off"}
    </div>
  )
}
