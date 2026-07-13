"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type WinnerChipProps = {
  label: string
  sublabel?: string
  className?: string
  size?: "sm" | "md"
}

/** Compact winner callout — stays inside the trick zone, never blocks seats. */
export function WinnerChip({ label, sublabel = "+1 book", className, size = "sm" }: WinnerChipProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "winner-chip",
        size === "md" && "winner-chip--md",
        className
      )}
      role="status"
    >
      <span className="winner-chip__label">{label}</span>
      {sublabel && <span className="winner-chip__sub">{sublabel}</span>}
    </motion.div>
  )
}
