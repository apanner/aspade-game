"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "framer-motion"
import { TableLayout } from "./table-layout"
import { TableHUD } from "./table-hud"
import { Seat } from "./seat"
import { TrickZone } from "./trick-zone"
import { TrickCelebration, type TrickCelebrationData } from "./trick-celebration"
import { RoundCompleteBanner } from "./round-complete-banner"
import { BiddingCenter } from "./bidding-center"
import { BiddingOverlay } from "./bidding-overlay"
import { PlayerHand } from "./player-hand"
import { TurnTimer } from "./turn-timer"
import { YourTurnBanner } from "@/components/shell/your-turn-banner"
import type { ConnectionStatus } from "./connection-badge"
import { getSeatPosition, parseCardCode, SUIT_SYMBOL } from "./card-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { reducedMotionProps } from "./use-card-animation"
import { NextLeaderPointer } from "./next-leader-pointer"
import { CardFlyOverlay, getTrickSlotRect, type CardFlyRequest } from "./card-fly-overlay"
import {
  EMPTY_TRICK_PLAYS,
  buildTrickPlays,
  playKey,
  sortTrickPlaysBySeat,
  trickSessionKey,
} from "@/lib/trick-display"
import { useGameVoice } from "@/components/voice/game-voice-provider"
import type { CardCode } from "./card-utils"

type TablePlayer = {
  id: string
  name: string
  seat: number
  team?: string | null
  bid?: number
  books?: number
  score?: number
  isPartner?: boolean
  isComputer?: boolean
}

export type LastCompletedTrick = {
  trickIndex: number
  winnerId: string
  winnerName: string
  winnerSeat: number
  plays: { playerId: string; card: string; seat: number }[]
}

export type RoundEndSummary = {
  round: number
  scores: { playerId: string; name: string; score: number; tricks: number; bid: number }[]
  leaderId: string
}

type TrickPlay = { playerId: string; card: CardCode; seat: number }

export type BiddingTableState = {
  myBid?: number
  hasSubmittedBid: boolean
  isTeamLeader: boolean
  isMyTurnToBid: boolean
  submittedCount: number
  totalBidders: number
  teamUsBid: number | null
  teamThemBid: number | null
  isMyTeamUs: boolean
}

export type CardTableProps = {
  phase: "bidding" | "playing"
  round: number
  totalRounds: number
  usScore: number
  themScore: number
  isIndividualMode?: boolean
  myRank?: number
  totalPlayers?: number
  myPlayerId: string
  myPlayerName: string
  mySeat: number
  myHand: CardCode[]
  legalCards?: CardCode[]
  players: TablePlayer[]
  currentTurnId: string | null
  trickPlays?: TrickPlay[]
  completedTricksCount?: number
  lastCompletedTrick?: LastCompletedTrick | null
  roundEndSummary?: RoundEndSummary | null
  spadesBroken?: boolean
  turnExpiresAt?: string | number | null
  tricksInRound?: number
  cardsPerRound?: number
  connectionStatus?: ConnectionStatus
  bidding?: BiddingTableState
  onPlayCard: (card: CardCode) => Promise<void>
  onSubmitBid?: (bid: number) => Promise<void>
  onRoundCompleteDismiss?: () => void
  onRequestSync?: () => void
  gameId?: string
  isHost?: boolean
}

export function CardTable({
  phase,
  round,
  totalRounds,
  usScore,
  themScore,
  isIndividualMode = false,
  myRank,
  totalPlayers,
  myPlayerId,
  myPlayerName,
  mySeat,
  myHand,
  legalCards,
  players,
  currentTurnId,
  trickPlays = EMPTY_TRICK_PLAYS,
  completedTricksCount = 0,
  lastCompletedTrick,
  roundEndSummary,
  spadesBroken,
  turnExpiresAt,
  tricksInRound = 0,
  cardsPerRound = round,
  connectionStatus = "connected",
  bidding,
  onPlayCard,
  onSubmitBid,
  onRoundCompleteDismiss,
  onRequestSync,
  gameId,
  isHost = false,
}: CardTableProps) {
  const { toast } = useToast()
  const { isPlayerSpeaking } = useGameVoice()
  const prefersReducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [showSpadesBanner, setShowSpadesBanner] = useState(false)
  const [draggingCard, setDraggingCard] = useState<CardCode | null>(null)
  const [optimisticPlay, setOptimisticPlay] = useState<TrickPlay | null>(null)
  const [playedOutCards, setPlayedOutCards] = useState<CardCode[]>([])
  const [trickCelebration, setTrickCelebration] = useState<TrickCelebrationData | null>(null)
  const [flyRequest, setFlyRequest] = useState<CardFlyRequest | null>(null)
  const [flyHiddenPlayKey, setFlyHiddenPlayKey] = useState<string | null>(null)
  const [freshPlayKeys, setFreshPlayKeys] = useState<string[]>([])
  const [nextLeaderId, setNextLeaderId] = useState<string | null>(null)
  const [showRoundBanner, setShowRoundBanner] = useState(false)
  const trickZoneRef = useRef<HTMLDivElement>(null)
  const prevRoundRef = useRef(round)
  const trickSessionRef = useRef(trickSessionKey(round, completedTricksCount))
  const fullTrickSnapshotRef = useRef<TrickPlay[]>([])
  const prevTrickPlaysRef = useRef<TrickPlay[]>([])
  const celebratedTrickRef = useRef(-1)
  const prevSpadesBrokenRef = useRef(spadesBroken)
  const isBidding = phase === "bidding"

  const displayHand = useMemo(() => {
    const gone = new Set<CardCode>(playedOutCards)
    return myHand.filter((c) => !gone.has(c))
  }, [myHand, playedOutCards])

  const trickPlaysKey =
    trickPlays.length === 0
      ? ""
      : trickPlays.map((p) => `${p.playerId}:${p.card}:${p.seat}`).join(",")

  const currentTrickPlays = useMemo(
    () =>
      sortTrickPlaysBySeat(buildTrickPlays(trickPlays, optimisticPlay), mySeat, getSeatPosition),
    [trickPlaysKey, optimisticPlay, mySeat]
  )

  useEffect(() => {
    if (trickPlays.length === 4) {
      fullTrickSnapshotRef.current = sortTrickPlaysBySeat(
        buildTrickPlays(trickPlays, null),
        mySeat,
        getSeatPosition
      )
    }
  }, [trickPlaysKey, trickPlays.length, mySeat])

  useEffect(() => {
    if (trickPlays.length > 0) {
      setNextLeaderId(null)
    }
  }, [trickPlaysKey])

  useEffect(() => {
    const prev = prevTrickPlaysRef.current
    const newOnes = trickPlays.filter(
      (p) => !prev.some((old) => old.playerId === p.playerId && old.card === p.card)
    )
    prevTrickPlaysRef.current = trickPlays

    const botKeys = newOnes
      .filter((p) => p.playerId !== myPlayerId)
      .map((p) => playKey(p))

    if (botKeys.length === 0) return

    setFreshPlayKeys(botKeys)
    const timer = window.setTimeout(() => setFreshPlayKeys([]), 500)
    return () => window.clearTimeout(timer)
  }, [trickPlaysKey, myPlayerId, trickPlays])

  const showTrickCelebration = !!trickCelebration
  const displayTrickPlays = showTrickCelebration
    ? EMPTY_TRICK_PLAYS
    : currentTrickPlays.filter((p) => playKey(p) !== flyHiddenPlayKey)
  const isMyTurn = currentTurnId === myPlayerId
  const serverHasMyPlay = trickPlays.some((p) => p.playerId === myPlayerId)
  const hasPlayedThisTrick =
    serverHasMyPlay || (optimisticPlay?.playerId === myPlayerId && !serverHasMyPlay)
  const leadCard = displayTrickPlays[0]?.card
  const leadSuit = leadCard ? parseCardCode(leadCard).suit : null
  const isMyTurnToBid = !!bidding?.isMyTurnToBid
  const turnPlayer = currentTurnId ? players.find((p) => p.id === currentTurnId) : null
  const canPlayNow = isMyTurn && !hasPlayedThisTrick && !isBidding
  const trickLeaderLabel =
    !isBidding && displayTrickPlays.length === 0 && turnPlayer
      ? turnPlayer.id === myPlayerId
        ? "You"
        : turnPlayer.name.split(" ")[0]
      : null
  const isComputerThinking = !!turnPlayer?.isComputer && !isMyTurn && !isBidding
  const isComputerBidding = isBidding && !!turnPlayer?.isComputer && !isMyTurn

  useEffect(() => {
    if (round !== prevRoundRef.current) {
      prevRoundRef.current = round
      celebratedTrickRef.current = -1
      trickSessionRef.current = trickSessionKey(round, completedTricksCount)
      fullTrickSnapshotRef.current = []
      prevTrickPlaysRef.current = []
      setOptimisticPlay(null)
      setPlayedOutCards([])
      setFlyRequest(null)
      setFlyHiddenPlayKey(null)
      setFreshPlayKeys([])
      setTrickCelebration(null)
      setNextLeaderId(null)
      setShowRoundBanner(true)
      const timer = window.setTimeout(() => setShowRoundBanner(false), prefersReducedMotion ? 600 : 2400)
      return () => window.clearTimeout(timer)
    }
  }, [round, prefersReducedMotion])

  const lastCompletedTrickKey = lastCompletedTrick
    ? `${lastCompletedTrick.trickIndex}:${lastCompletedTrick.winnerId}`
    : ""

  useEffect(() => {
    const session = trickSessionKey(round, completedTricksCount)
    if (session === trickSessionRef.current) return

    const prevCount = Number(trickSessionRef.current.split("-")[1] ?? 0)
    trickSessionRef.current = session

    if (completedTricksCount > prevCount && lastCompletedTrick) {
      const trickIndex = completedTricksCount - 1
      if (trickIndex > celebratedTrickRef.current) {
        celebratedTrickRef.current = trickIndex
        const plays =
          fullTrickSnapshotRef.current.length === 4
            ? fullTrickSnapshotRef.current
            : lastCompletedTrick.plays

        setTrickCelebration({
          trickIndex,
          winnerId: lastCompletedTrick.winnerId,
          winnerName: lastCompletedTrick.winnerName,
          winnerSeat: lastCompletedTrick.winnerSeat,
          plays,
        })
        setNextLeaderId(lastCompletedTrick.winnerId)
      }
    }

    setOptimisticPlay(null)
    setPlayedOutCards([])
    setFlyRequest(null)
    setFlyHiddenPlayKey(null)
    prevTrickPlaysRef.current = []
    if (fullTrickSnapshotRef.current.length > 0) {
      fullTrickSnapshotRef.current = []
    }
  }, [round, completedTricksCount, lastCompletedTrickKey])

  const handleTrickCelebrationDone = () => {
    setTrickCelebration(null)
    fullTrickSnapshotRef.current = []
    prevTrickPlaysRef.current = []
    if (currentTurnId) {
      setNextLeaderId(currentTurnId)
      window.setTimeout(() => setNextLeaderId(null), prefersReducedMotion ? 800 : 2400)
    }
  }

  useEffect(() => {
    if (!optimisticPlay) return
    const landed = trickPlays.some(
      (p) => p.playerId === optimisticPlay.playerId && p.card === optimisticPlay.card
    )
    if (landed) setOptimisticPlay(null)
  }, [trickPlays, optimisticPlay])

  useEffect(() => {
    if (!serverHasMyPlay) return
    const myPlay = trickPlays.find((p) => p.playerId === myPlayerId)
    if (!myPlay) return
    setPlayedOutCards((prev) => prev.filter((c) => c !== myPlay.card))
  }, [trickPlaysKey, serverHasMyPlay, myPlayerId, trickPlays])

  useEffect(() => {
    if (trickPlays.length === 0) {
      setOptimisticPlay(null)
    }
  }, [trickPlays.length, completedTricksCount])

  useEffect(() => {
    if (optimisticPlay && serverHasMyPlay) {
      setOptimisticPlay(null)
    }
    if (isMyTurn && hasPlayedThisTrick && !serverHasMyPlay && optimisticPlay) {
      const timer = window.setTimeout(() => {
        setOptimisticPlay(null)
        setPlayedOutCards((prev) =>
          optimisticPlay ? prev.filter((c) => c !== optimisticPlay.card) : prev
        )
        onRequestSync?.()
      }, 4000)
      return () => window.clearTimeout(timer)
    }
    if (trickPlays.length === 4) {
      onRequestSync?.()
    }
  }, [
    trickPlays,
    isMyTurn,
    hasPlayedThisTrick,
    myPlayerId,
    optimisticPlay,
    serverHasMyPlay,
    onRequestSync,
  ])

  useEffect(() => {
    if (spadesBroken && !prevSpadesBrokenRef.current) {
      setShowSpadesBanner(true)
      toast({ title: "♠ Spades are broken!", description: "Trump is now in play" })
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

  const handleFlyComplete = () => {
    if (flyRequest) {
      setOptimisticPlay({
        playerId: myPlayerId,
        card: flyRequest.card,
        seat: mySeat,
      })
    }
    setFlyRequest(null)
    setFlyHiddenPlayKey(null)
  }

  const handlePlayCard = async (card: CardCode, sourceRect?: DOMRect) => {
    if (isBidding) return
    if (hasPlayedThisTrick) {
      toast({ title: "Already played", description: "Wait for the other players in this trick." })
      return
    }
    if (!isMyTurn) {
      toast({ title: "Not your turn", variant: "destructive" })
      return
    }
    if (legalCards && !legalCards.includes(card)) {
      const suitName = leadSuit ? SUIT_SYMBOL[leadSuit] : "led suit"
      toast({
        title: "Illegal play",
        description: leadSuit
          ? `Follow ${suitName} if you have it, or play any card (♠ cuts).`
          : "You must follow the led suit.",
        variant: "destructive",
      })
      return
    }
    if (playing) return

    setPlayedOutCards((prev) => (prev.includes(card) ? prev : [...prev, card]))

    const container = trickZoneRef.current?.getBoundingClientRect()
    const myPos = getSeatPosition(mySeat, mySeat)
    if (sourceRect && container && !prefersReducedMotion) {
      const to = getTrickSlotRect(container, myPos)
      setFlyHiddenPlayKey(playKey({ playerId: myPlayerId, card, seat: mySeat }))
      setFlyRequest({
        card,
        from: {
          left: sourceRect.left,
          top: sourceRect.top,
          width: sourceRect.width,
          height: sourceRect.height,
        },
        to,
      })
    } else {
      setOptimisticPlay({ playerId: myPlayerId, card, seat: mySeat })
    }

    setPlaying(true)
    try {
      await onPlayCard(card)
    } catch {
      setPlayedOutCards((prev) => prev.filter((c) => c !== card))
      setOptimisticPlay(null)
      setFlyRequest(null)
      setFlyHiddenPlayKey(null)
      toast({
        title: "Play failed",
        description: "Your card was returned to your hand.",
        variant: "destructive",
      })
    } finally {
      setPlaying(false)
    }
  }

  const handleSubmitBid = async (bid: number) => {
    if (!onSubmitBid) return
    await onSubmitBid(bid)
    toast({ title: "Bid locked", description: `You bid ${bid}` })
  }

  const renderSeat = (pos: "north" | "east" | "south" | "west", fallbackLabel: string) => {
    const p = byPosition[pos]
    if (!p) return <div className="h-[88px] w-[84px]" />
    const isTurn = currentTurnId === p.id
    const showBidding = isBidding && isTurn && p.bid === undefined
    const label =
      p.id === myPlayerId ? "You" : !isIndividualMode && p.isPartner ? "Partner" : fallbackLabel
    const isRecentWinner = (showTrickCelebration && trickCelebration?.winnerId === p.id) || nextLeaderId === p.id
    return (
      <div className="flex w-[84px] flex-col gap-0.5">
        {(isTurn && !isBidding) || (isMyTurnToBid && p.id === myPlayerId) ? (
          <TurnTimer turnExpiresAt={turnExpiresAt} active={isTurn || (isMyTurnToBid && p.id === myPlayerId)} />
        ) : null}
        <Seat
          label={label}
          name={p.name}
          playerId={p.id}
          bid={showBidding ? "…" : p.bid}
          books={p.books}
          score={p.score}
          isTurn={isTurn}
          isPartner={!isIndividualMode && p.isPartner}
          isSelf={p.id === myPlayerId}
          isComputer={p.isComputer}
          isThinking={isTurn && !!p.isComputer}
          isIndividualMode={isIndividualMode}
          isRecentWinner={isRecentWinner}
          isSpeaking={isPlayerSpeaking(p.id)}
        />
      </div>
    )
  }

  return (
    <LayoutGroup id="card-table">
    <TableLayout
      hud={
        <TableHUD
          round={round}
          totalRounds={totalRounds}
          usScore={usScore}
          themScore={themScore}
          isIndividualMode={isIndividualMode}
          myRank={myRank}
          totalPlayers={totalPlayers}
          spadesBroken={spadesBroken}
          connectionStatus={connectionStatus}
          phase={phase}
          tricksInRound={tricksInRound}
          cardsPerRound={cardsPerRound}
          gameId={gameId}
          playerId={myPlayerId}
          isHost={isHost}
          commsPlayers={players.map((player) => ({ id: player.id, name: player.name }))}
        />
      }
      north={renderSeat("north", isIndividualMode ? "North" : "Partner")}
      east={renderSeat("east", "Opponent")}
      south={renderSeat("south", "You")}
      west={renderSeat("west", "Opponent")}
      center={
        <div className="relative w-full">
          {isBidding && bidding ? (
            <BiddingCenter
              isIndividualMode={isIndividualMode}
              teamUsBid={bidding.teamUsBid}
              teamThemBid={bidding.teamThemBid}
              submittedCount={bidding.submittedCount}
              totalBidders={bidding.totalBidders}
              isMyTeamUs={bidding.isMyTeamUs}
              cardsPerRound={cardsPerRound}
            />
          ) : (
            <div className="relative mx-auto w-full max-w-[220px]">
              <TrickZone
                ref={trickZoneRef}
                plays={displayTrickPlays}
                mySeat={mySeat}
                isDropTarget={!!draggingCard && canPlayNow}
                celebrating={showTrickCelebration}
                leaderLabel={trickLeaderLabel}
                freshPlayKeys={freshPlayKeys}
              />
              {showTrickCelebration && (
                <TrickCelebration
                  data={trickCelebration}
                  mySeat={mySeat}
                  onDone={handleTrickCelebrationDone}
                />
              )}
              {nextLeaderId && !showTrickCelebration && displayTrickPlays.length === 0 && (() => {
                const leader = players.find((player) => player.id === nextLeaderId)
                if (!leader) return null
                return (
                  <NextLeaderPointer
                    leaderName={leader.id === myPlayerId ? "You" : leader.name.split(" ")[0]}
                    leaderSeat={leader.seat}
                    mySeat={mySeat}
                  />
                )
              })()}
              {roundEndSummary && (
                <RoundCompleteBanner
                  round={roundEndSummary.round}
                  scores={roundEndSummary.scores}
                  leaderId={roundEndSummary.leaderId}
                  isFinalRound={round >= totalRounds}
                  onDismiss={onRoundCompleteDismiss}
                />
              )}
            </div>
          )}
          <AnimatePresence>
            {isMyTurnToBid && (
              <YourTurnBanner key="bid-turn" message="Your turn to bid" className="-top-14" />
            )}
            {canPlayNow && !isBidding && <YourTurnBanner key="your-turn" />}
            {isComputerBidding && (
              <motion.div
                key="bot-bidding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 -top-12 z-40 mx-auto w-fit rounded-full border border-purple-400/30 bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-200"
              >
                {turnPlayer?.name} is bidding…
              </motion.div>
            )}
            {isComputerThinking && (
              <motion.div
                key="bot-thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 -top-12 z-40 mx-auto w-fit rounded-full border border-purple-400/30 bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-200"
              >
                {turnPlayer?.name} is playing…
              </motion.div>
            )}
            {showRoundBanner && (
              <motion.div
                key={`round-banner-${round}`}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -40, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={prefersReducedMotion ? reducedMotionProps.transition : { type: "spring", stiffness: 300, damping: 24 }}
                className={cn(
                  "pointer-events-none absolute inset-x-0 -top-16 z-50 mx-auto w-fit",
                  "rounded-xl border border-turn-active/40 bg-black/85 px-4 py-2 backdrop-blur-md",
                  "text-center shadow-[0_0_24px_rgba(34,197,94,0.35)]"
                )}
                role="status"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-turn-active">
                  Round {round}
                </p>
                <p className="text-sm font-bold text-white">
                  {cardsPerRound} card{cardsPerRound === 1 ? "" : "s"} dealt each
                </p>
              </motion.div>
            )}
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
        <div className="relative flex flex-col">
          <div className="px-2 pt-1.5">
            {!isBidding && canPlayNow && legalCards && legalCards.length > 0 && (
              <p className="mb-1 text-center text-[9px] uppercase tracking-widest text-turn-active animate-pulse">
                {displayTrickPlays.length === 0 && lastCompletedTrick?.winnerId === myPlayerId
                  ? "You won — play your card"
                  : leadSuit
                    ? `Follow ${SUIT_SYMBOL[leadSuit]} or play ♠ to cut`
                    : "Your turn — tap a card"}
              </p>
            )}
            {!isBidding && hasPlayedThisTrick && (
              <p className="mb-1 text-center text-[9px] uppercase tracking-widest text-white/40">
                {isMyTurn && !trickPlays.some((p) => p.playerId === myPlayerId)
                  ? "Syncing your play…"
                  : "Waiting for others…"}
              </p>
            )}
            {!isBidding && !isMyTurn && !hasPlayedThisTrick && turnPlayer && displayTrickPlays.length > 0 && (
              <p className="mb-1 text-center text-[9px] uppercase tracking-widest text-white/40">
                {turnPlayer.name}&apos;s turn
              </p>
            )}
            <PlayerHand
              cards={displayHand}
              legalCards={isBidding ? undefined : legalCards}
              onPlayCard={handlePlayCard}
              disabled={playing || isBidding || !canPlayNow || hasPlayedThisTrick}
              myPlayerId={myPlayerId}
              fan={displayHand.length > 1}
              dealAnimation
              dealKey={round}
              enableDrag={canPlayNow && !playing && displayHand.length >= 1}
              onDragStateChange={setDraggingCard}
              dropZoneRef={trickZoneRef}
            />
          </div>
          {isBidding && bidding && onSubmitBid && (
            <BiddingOverlay
              round={round}
              isMyTurnToBid={bidding.isMyTurnToBid}
              isIndividualMode={isIndividualMode}
              isTeamLeader={bidding.isTeamLeader}
              hasSubmittedBid={bidding.hasSubmittedBid}
              myBid={bidding.myBid}
              maxBid={cardsPerRound}
              submittedCount={bidding.submittedCount}
              totalBidders={bidding.totalBidders}
              onSubmitBid={handleSubmitBid}
            />
          )}
        </div>
      }
    />
    <CardFlyOverlay request={flyRequest} onComplete={handleFlyComplete} />
    </LayoutGroup>
  )
}
