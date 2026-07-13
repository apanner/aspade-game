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
  north: "top-1 left-1/2 -translate-x-1/2",
  east: "right-1 top-1/2 -translate-y-1/2",
  south: "bottom-1 left-1/2 -translate-x-1/2",
  west: "left-1 top-1/2 -translate-y-1/2",
}

export function NextLeaderPointer({ leaderName, leaderSeat, mySeat }: NextLeaderPointerProps) {
  const prefersReducedMotion = useReducedMotion()
  const pos = getSeatPosition(leaderSeat, mySeat)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn("pointer-events-none absolute z-10", POINTER_CLASS[pos])}
    >
      <div className={cn("status-chip text-[8px] py-0.5 px-2", !prefersReducedMotion && "animate-pulse")}>
        {leaderName} leads
      </div>
    </motion.div>
  )
}
