"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type SeatTurnNoticeProps = {
  message?: string
  variant?: "play" | "bid"
  className?: string
}

export function SeatTurnNotice({
  message = "Your turn",
  variant = "play",
  className,
}: SeatTurnNoticeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4 }}
      className={cn("table-notice-pill table-notice-pill--turn mb-1.5", className)}
      role="status"
      aria-live="assertive"
    >
      {!prefersReducedMotion && <span className="table-notice-pulse" aria-hidden />}
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-win-gold" />
      <span className="text-[11px] font-bold uppercase tracking-wide text-white">
        {message}
      </span>
    </motion.div>
  )
}

type YourTurnBannerProps = {
  message?: string
  className?: string
}

/** Center-table notice (bots, round events). User turn uses SeatTurnNotice at south seat. */
export function YourTurnBanner({ message = "Your turn — play a card", className }: YourTurnBannerProps) {
  return <SeatTurnNotice message={message} className={className} />
}

type TableNoticeProps = {
  message: string
  className?: string
}

export function TableNotice({ message, className }: TableNoticeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn("table-notice-pill table-notice-pill--info", className)}
      role="status"
    >
      <span className="text-xs font-semibold text-white/90">{message}</span>
    </motion.div>
  )
}
