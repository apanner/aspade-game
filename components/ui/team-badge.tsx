"use client"

import { cn } from "@/lib/utils"

type TeamBadgeProps = {
  name: string
  variant?: "us" | "them" | "neutral"
  className?: string
}

export function TeamBadge({ name, variant = "neutral", className }: TeamBadgeProps) {
  return (
    <span
      className={cn(
        "glass-panel inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        variant === "us" && "border-team-us/40 text-team-us glow-us",
        variant === "them" && "border-team-them/40 text-team-them glow-them",
        variant === "neutral" && "border-white/10 text-muted-foreground",
        className
      )}
    >
      {name}
    </span>
  )
}
