"use client"

import { forwardRef } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Spade } from "lucide-react"
import { PlayingCard } from "./playing-card"
import { getSeatPosition, parseCardCode, SUIT_SYMBOL } from "./card-utils"
import { playKey } from "@/lib/trick-display"
import { cn } from "@/lib/utils"

type TrickPlay = { playerId: string; card: string; seat: number }

type TrickZoneProps = {
  plays: TrickPlay[]
  mySeat: number
  isDropTarget?: boolean
  celebrating?: boolean
  leaderLabel?: string | null
  freshPlayKeys?: string[]
  spadesFlash?: boolean
}

const POSITION_CLASS: Record<string, string> = {
  north: "top-0 left-1/2 -translate-x-1/2 -translate-y-1",
  east: "right-0 top-1/2 -translate-y-1/2 translate-x-1",
  south: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1",
  west: "left-0 top-1/2 -translate-y-1/2 -translate-x-1",
}

const SEAT_ENTRY: Record<string, { x: number; y: number; rotate: number; scale: number }> = {
  south: { x: 0, y: 72, rotate: 4, scale: 0.82 },
  north: { x: 0, y: -72, rotate: -4, scale: 0.82 },
  east: { x: 72, y: 0, rotate: 8, scale: 0.82 },
  west: { x: -72, y: 0, rotate: -8, scale: 0.82 },
}

export const TrickZone = forwardRef<HTMLDivElement, TrickZoneProps>(function TrickZone(
  {
    plays,
    mySeat,
    isDropTarget = false,
    celebrating = false,
    leaderLabel = null,
    freshPlayKeys = [],
    spadesFlash = false,
  },
  ref
) {
  const prefersReducedMotion = useReducedMotion()
  const freshSet = new Set(freshPlayKeys)

  const centerLabel = spadesFlash
    ? "♠ Broken"
    : isDropTarget
      ? "Drop here"
      : celebrating
        ? "…"
        : plays.length > 0
          ? plays.length < 4
            ? `${plays.length}/4`
            : plays[0]?.card
              ? `Led ${SUIT_SYMBOL[parseCardCode(plays[0].card).suit] ?? "?"}`
              : "Trick"
          : leaderLabel
            ? `${leaderLabel} leads`
            : "Trick"

  return (
    <div
      ref={ref}
      data-trick-drop-zone
      className={cn(
        "trick-zone relative mx-auto aspect-square w-full max-w-[176px]",
        isDropTarget && "trick-zone--drop-target"
      )}
    >
      <div className="table-trick-ring table-trick-ring--outer absolute inset-0 rounded-full" />
      <div
        className={cn(
          "table-trick-ring absolute inset-[3px] rounded-full transition-all duration-300",
          isDropTarget && "table-trick-ring--drop-target"
        )}
      />
      <div className="trick-zone__inner absolute inset-[8px] flex flex-col items-center justify-center rounded-full">
        <Spade
          className={cn(
            "trick-zone__watermark pointer-events-none absolute h-14 w-14",
            spadesFlash && "trick-zone__watermark--flash"
          )}
          aria-hidden
        />
        <span
          className={cn(
            "table-trick-label relative z-10 text-[9px] font-bold uppercase tracking-[0.22em]",
            isDropTarget && "table-trick-label--active animate-pulse",
            spadesFlash && "table-trick-label--spades"
          )}
        >
          {centerLabel}
        </span>
        {spadesFlash && (
          <span className="relative z-10 mt-0.5 text-[7px] font-medium uppercase tracking-wider text-[#8fa7ff]/70">
            Trump live
          </span>
        )}
      </div>
      {plays.map((play) => {
        const key = playKey(play)
        const pos = getSeatPosition(play.seat, mySeat)
        const entry = SEAT_ENTRY[pos]
        const isFresh = freshSet.has(key) && !prefersReducedMotion

        return (
          <motion.div
            key={key}
            className={cn("absolute z-10", POSITION_CLASS[pos])}
            initial={
              isFresh
                ? { x: entry.x, y: entry.y, rotate: entry.rotate, scale: entry.scale, opacity: 0.4 }
                : false
            }
            animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlayingCard code={play.card} state="played" size="sm" />
          </motion.div>
        )
      })}
    </div>
  )
})
