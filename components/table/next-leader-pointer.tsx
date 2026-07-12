"use client"

import { motion, useReducedMotion } from "framer-motion"
import { getSeatPosition } from "./card-utils"
import { cn } from "@/lib/utils"

type NextLeaderPointerProps = {
  leaderName: string
  leaderSeat: number
  mySeat: number
}

const POINTER_CLASS: Record<string, string> = {
  north: "top-0 left-1/2 -translate-x-1/2 -translate-y-full",
  east: "right-0 top-1/2 translate-x-full -translate-y-1/2",
  south: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full",
  west: "left-0 top-1/2 -translate-x-full -translate-y-1/2",
}

export function NextLeaderPointer({ leaderName, leaderSeat, mySeat }: NextLeaderPointerProps) {
  const prefersReducedMotion = useReducedMotion()
  const pos = getSeatPosition(leaderSeat, mySeat)
  const pointerClass = POINTER_CLASS[pos]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className={cn("pointer-events-none absolute z-20", pointerClass)}
    >
      <div
        className={cn(
          "rounded-lg border border-turn-active/60 bg-black/85 px-3 py-1.5 text-center shadow-[0_0_20px_rgba(34,197,94,0.35)]",
          !prefersReducedMotion && "animate-pulse"
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-turn-active">
          {leaderName} leads next
        </p>
        <p className="text-[9px] text-white/50 mt-0.5">New trick starting</p>
      </div>
    </motion.div>
  )
}
