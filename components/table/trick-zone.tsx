"use client"

import { forwardRef } from "react"
import { PlayingCard } from "./playing-card"
import { getSeatPosition, parseCardCode, SUIT_SYMBOL } from "./card-utils"
import { cn } from "@/lib/utils"

type TrickPlay = { playerId: string; card: string; seat: number }

type TrickZoneProps = {
  plays: TrickPlay[]
  mySeat: number
  isDropTarget?: boolean
  celebrating?: boolean
  leaderLabel?: string | null
}

const POSITION_CLASS: Record<string, string> = {
  north: "top-0 left-1/2 -translate-x-1/2 -translate-y-1",
  east: "right-0 top-1/2 -translate-y-1/2 translate-x-1",
  south: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1",
  west: "left-0 top-1/2 -translate-y-1/2 -translate-x-1",
}

export const TrickZone = forwardRef<HTMLDivElement, TrickZoneProps>(function TrickZone(
  { plays, mySeat, isDropTarget = false, celebrating = false, leaderLabel = null },
  ref
) {
  return (
    <div
      ref={ref}
      data-trick-drop-zone
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[220px]",
        isDropTarget && "ring-2 ring-turn-active/60 ring-offset-2 ring-offset-transparent rounded-full"
      )}
    >
      <div
        className={cn(
          "table-trick-ring absolute inset-0 rounded-full transition-all duration-300",
          isDropTarget && "table-trick-ring--drop-target"
        )}
      />
      <div
        className={cn(
          "absolute inset-[4px] flex flex-col items-center justify-center rounded-full bg-black/35 backdrop-blur-sm shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] transition-all",
          isDropTarget && "bg-turn-active/10"
        )}
      >
        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-[0.25em]",
            isDropTarget ? "text-turn-active animate-pulse" : "text-white/30"
          )}
        >
          {isDropTarget
            ? "Drop here"
            : celebrating
              ? "…"
              : plays.length > 0
                ? plays.length < 4
                  ? `${plays.length}/4 cards`
                  : plays[0]?.card
                    ? `Led ${SUIT_SYMBOL[parseCardCode(plays[0].card).suit] ?? "?"}`
                    : "Trick"
                : leaderLabel
                  ? `${leaderLabel} leads`
                  : "Trick"}
        </span>
      </div>
      {plays.map((play) => {
        const playKey = `${play.playerId}-${play.card}`
        const pos = getSeatPosition(play.seat, mySeat)

        return (
          <div key={playKey} className={cn("absolute z-10", POSITION_CLASS[pos])}>
            <PlayingCard code={play.card} state="played" size="sm" />
          </div>
        )
      })}
    </div>
  )
})
