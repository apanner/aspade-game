"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

type SeatTurnNoticeProps = {
  message?: string
  className?: string
}

export function SeatTurnNotice({ message = "Your turn", className }: SeatTurnNoticeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn("turn-chip mb-1", className)}
      role="status"
      aria-live="assertive"
    >
      {message}
    </motion.div>
  )
}

type TableNoticeProps = {
  message: string
  className?: string
}

export function TableNotice({ message, className }: TableNoticeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("status-chip", className)}
      role="status"
    >
      {message}
    </motion.div>
  )
}

export function YourTurnBanner({ message, className }: { message?: string; className?: string }) {
  return <SeatTurnNotice message={message} className={className} />
}
