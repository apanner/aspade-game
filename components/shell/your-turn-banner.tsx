"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type YourTurnBannerProps = {
  message?: string
  className?: string
}

export function YourTurnBanner({ message = "Your turn — play a card", className }: YourTurnBannerProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={cn(
        "pointer-events-none absolute inset-x-0 -top-12 z-40 mx-auto flex w-fit items-center gap-2",
        "rounded-full border border-turn-active/50 bg-turn-active/20 px-4 py-2",
        "text-sm font-bold uppercase tracking-wide text-turn-active glow-turn backdrop-blur-md",
        className
      )}
      role="status"
      aria-live="assertive"
    >
      <Sparkles className="h-4 w-4 shrink-0" />
      {message}
    </motion.div>
  )
}
