"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { reducedMotionProps } from "./use-card-animation"

type TurnTimerProps = {
  turnExpiresAt?: string | number | null
  active?: boolean
  className?: string
}

export function TurnTimer({ turnExpiresAt, active = true, className }: TurnTimerProps) {
  const prefersReducedMotion = useReducedMotion()
  const [progress, setProgress] = useState(1)
  const totalMsRef = useRef(0)

  useEffect(() => {
    if (!turnExpiresAt || !active) {
      setProgress(1)
      totalMsRef.current = 0
      return
    }

    const expiresAt =
      typeof turnExpiresAt === "number" ? turnExpiresAt : new Date(turnExpiresAt).getTime()

    if (Number.isNaN(expiresAt)) {
      setProgress(1)
      return
    }

    const initialRemaining = Math.max(0, expiresAt - Date.now())
    totalMsRef.current = initialRemaining > 0 ? initialRemaining : 30_000

    const tick = () => {
      const remaining = Math.max(0, expiresAt - Date.now())
      const total = totalMsRef.current || 1
      setProgress(Math.min(1, remaining / total))
    }

    tick()
    const interval = window.setInterval(tick, 100)
    return () => window.clearInterval(interval)
  }, [turnExpiresAt, active])

  if (!active || !turnExpiresAt) return null

  const isUrgent = progress < 0.2

  return (
    <div
      className={cn("h-1 w-full overflow-hidden rounded-full bg-white/10", className)}
      role="timer"
      aria-label="Turn time remaining"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn(
          "h-full rounded-full bg-turn-active",
          isUrgent && "bg-red-500"
        )}
        animate={{ width: `${progress * 100}%` }}
        transition={prefersReducedMotion ? reducedMotionProps.transition : { duration: 0.1, ease: "linear" }}
      />
    </div>
  )
}
