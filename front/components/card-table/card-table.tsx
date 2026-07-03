"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { TableLayout } from "./table-layout"
import { TableHUD } from "./table-hud"
import { Seat } from "./seat"
import { TrickZone } from "./trick-zone"
import { PlayerHand } from "./player-hand"
import { TurnTimer } from "./turn-timer"
import { ConnectionBadge, type ConnectionStatus } from "./connection-badge"
import { getSeatPosition } from "./card-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { reducedMotionProps } from "./use-card-animation"
import type { CardCode } from "./card-utils"

type TablePlayer = {
  id: string
  name: string
  seat: number
  team?: string | null
  bid?: number
  books?: number
  isPartner?: boolean
}

type TrickPlay = { playerId: string; card: CardCode; seat: number }

export type CardTableProps = {
  round: number
  totalRounds: number
  usScore: number
  themScore: number
  myPlayerId: string
  mySeat: number
  myHand: CardCode[]
  legalCards?: CardCode[]
  players: TablePlayer[]
  currentTurnId: string | null
  trickPlays?: TrickPlay[]
  winningCard?: string | null
  spadesBroken?: boolean
  turnExpiresAt?: string | number | null
  connectionStatus?: ConnectionStatus
  onPlayCard: (card: CardCode) => Promise<void>
}

export function CardTable({
  round,
  totalRounds,
  usScore,
  themScore,
  myPlayerId,
  mySeat,
  myHand,
  legalCards,
  players,
  currentTurnId,
  trickPlays = [],
  winningCard,
  spadesBroken,
  turnExpiresAt,
  connectionStatus = "connected",
  onPlayCard,
}: CardTableProps) {
  const { toast } = useToast()
  const prefersReducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [optimisticHand, setOptimisticHand] = useState<CardCode[] | null>(null)
  const [showSpadesBanner, setShowSpadesBanner] = useState(false)
  const prevSpadesBrokenRef = useRef(spadesBroken)

  const displayHand = optimisticHand ?? myHand
  const isMyTurn = currentTurnId === myPlayerId

  useEffect(() => {
    setOptimisticHand(null)
  }, [myHand])

  useEffect(() => {
    if (spadesBroken && !prevSpadesBrokenRef.current) {
      setShowSpadesBanner(true)
      toast({ title: "Spades are broken!" })
      const duration = prefersReducedMotion ? 800 : 2500
      const timer = window.setTimeout(() => setShowSpadesBanner(false), duration)
      prevSpadesBrokenRef.current = spadesBroken
      return () => window.clearTimeout(timer)
    }
    prevSpadesBrokenRef.current = spadesBroken
  }, [spadesBroken, toast, prefersReducedMotion])

  const seatMap = useMemo(() => {
    const map: Record<string, "north" | "east" | "south" | "west"> = {}
    for (const p of players) {
      map[p.id] = getSeatPosition(p.seat, mySeat)
    }
    return map
  }, [players, mySeat])

  const byPosition = useMemo(() => {
    const result: Partial<Record<"north" | "east" | "south" | "west", TablePlayer>> = {}
    for (const p of players) {
      const pos = seatMap[p.id]
      if (pos) result[pos] = p
    }
    return result
  }, [players, seatMap])

  const handlePlayCard = async (card: CardCode) => {
    if (!isMyTurn) {
      toast({ title: "Not your turn", variant: "destructive" })
      return
    }
    if (legalCards && !legalCards.includes(card)) {
      toast({ title: "Illegal play", description: "You must follow suit.", variant: "destructive" })
      return
    }

    const snapshot = displayHand
    setOptimisticHand(snapshot.filter((c) => c !== card))
    setPlaying(true)
    try {
      await onPlayCard(card)
    } catch {
      setOptimisticHand(null)
      toast({
        title: "Play failed",
        description: "Your card was returned to your hand.",
        variant: "destructive",
      })
    } finally {
      setPlaying(false)
    }
  }

  const renderSeat = (pos: "north" | "east" | "south" | "west", label: string) => {
    const p = byPosition[pos]
    if (!p) return <div className="h-[88px] w-[100px]" />
    const isTurn = currentTurnId === p.id
    return (
      <div className="flex w-[100px] flex-col gap-1">
        {isTurn && (
          <TurnTimer turnExpiresAt={turnExpiresAt} active={isTurn} />
        )}
        <Seat
          label={label}
          name={p.name}
          bid={p.bid}
          books={p.books}
          isTurn={isTurn}
          isPartner={p.isPartner}
          isSelf={p.id === myPlayerId}
        />
      </div>
    )
  }

  return (
    <TableLayout
      hud={
        <div className="relative">
          <TableHUD
            round={round}
            totalRounds={totalRounds}
            usScore={usScore}
            themScore={themScore}
            spadesBroken={spadesBroken}
          />
          <ConnectionBadge
            status={connectionStatus}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          />
        </div>
      }
      north={renderSeat("north", "Partner")}
      east={renderSeat("east", "Opponent")}
      south={renderSeat("south", "You")}
      west={renderSeat("west", "Opponent")}
      center={
        <div className="relative">
          <TrickZone plays={trickPlays} mySeat={mySeat} winningCard={winningCard} />
          <AnimatePresence>
            {showSpadesBanner && (
              <motion.div
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -48, scale: 0.9 }}
                animate={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: [0, 1, 1, 0.85], y: 0, scale: [0.9, 1.05, 1, 1] }
                }
                exit={{ opacity: 0, y: -24 }}
                transition={
                  prefersReducedMotion
                    ? reducedMotionProps.transition
                    : { duration: 2.2, times: [0, 0.15, 0.7, 1], ease: "easeOut" }
                }
                className={cn(
                  "pointer-events-none absolute inset-x-0 -top-14 z-50 mx-auto w-fit",
                  "rounded-xl border border-purple-400/40 bg-purple-600/90 px-4 py-2",
                  "text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(168,85,247,0.5)]"
                )}
                role="status"
                aria-live="assertive"
              >
                ♠ Spades are broken!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
      hand={
        <PlayerHand
          cards={displayHand}
          legalCards={legalCards}
          onPlayCard={handlePlayCard}
          disabled={playing || !isMyTurn}
        />
      }
    >
      <></>
    </TableLayout>
  )
}
