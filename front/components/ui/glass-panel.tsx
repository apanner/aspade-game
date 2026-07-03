"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type GlassPanelProps = {
  children: ReactNode
  className?: string
  glow?: "us" | "them" | "turn" | "none"
}

export function GlassPanel({ children, className, glow = "none" }: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass-panel rounded-xl border border-white/10 bg-white/5 backdrop-blur-md",
        glow === "us" && "glow-us",
        glow === "them" && "glow-them",
        glow === "turn" && "glow-turn",
        className
      )}
    >
      {children}
    </div>
  )
}
