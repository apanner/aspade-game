"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardTable } from "@/components/table/card-table"
import { CardTableErrorBoundary } from "@/components/table/card-table-error-boundary"
import type { ConnectionStatus } from "@/components/table/connection-badge"
import { LiveLobby } from "@/components/shell/live-lobby"
import { ScoreScreen } from "@/components/shell/score-screen"
import { GameLoading } from "@/components/shell/game-loading"
import { ManualGameGate } from "@/components/shell/manual-game-gate"
import { BiddingPanel } from "@/components/shell/bidding-panel"
import { ManualTricksPanel } from "@/components/shell/manual-tricks-panel"
import { EndGameControl } from "@/components/shell/end-game-control"
import { supportsLiveCardTable, isScoringTable } from "@/lib/table-config"
import { buildCardTableProps } from "@/lib/card-table-props"
import { gameAPI, sessionStorage, GamePoller, type Game } from "@/lib/api"
import { sanitizeLiveGameForPlayer } from "@/lib/live-game-client"
import { useGameSync } from "@/hooks/useGameSync"
import { useToast } from "@/hooks/use-toast"
import { GameVoiceProvider } from "@/components/voice/game-voice-provider"
import { GameChatProvider } from "@/components/chat/game-chat-provider"

type LiveGameProps = {
  gameId: string
}

export function LiveGame({ gameId }: LiveGameProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [cardTableKey, setCardTableKey] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting")
  const [trickPacing, setTrickPacing] = useState(false)
  const pollerRef = useRef<GamePoller | null>(null)
  const lastTrickCountRef = useRef(0)
  const roundAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const humanPlayerIds = useMemo(
    () =>
      game
        ? Object.entries(game.players)
            .filter(([, player]) => !player.isComputer)
            .map(([id]) => id)
        : [],
    [game]
  )

  const handleGameEvent = useCallback(() => {
    pollerRef.current?.forceRefresh()
  }, [])

  useGameSync({
    gameId,
    playerId: currentPlayerId,
    enabled: true,
    onGameEvent: handleGameEvent,
  })

  const announceTrickWin = useCallback(
    (g: Game, playerId: string | null) => {
      if (!playerId || !g.liveState) return
      const completed = g.liveState.completedTricks?.length ?? 0
      if (completed <= lastTrickCountRef.current) return

      const lastTrick = g.liveState.completedTricks?.[completed - 1]
      lastTrickCountRef.current = completed

      if (!lastTrick?.winnerId) return
      const winner = g.players[lastTrick.winnerId]
      if (!winner) return

      if (lastTrick.winnerId === playerId) {
        window.setTimeout(() => {
          toast({ title: "You won the trick! 🎉", description: "Books +1" })
        }, 1200)
      } else {
        window.setTimeout(() => {
          toast({ title: `${winner.name} wins the trick`, description: `${winner.name} takes the books` })
        }, 1200)
      }
    },
    [toast]
  )

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const session = await sessionStorage.getPlayerSession()
      if (!mounted) return

      if (!session || session.gameId !== gameId) {
        setError("Not in this game — join with your name first")
        setLoading(false)
        return
      }

      setCurrentPlayerId(session.playerId)

      const poller = new GamePoller()
      pollerRef.current = poller

      poller.onGameUpdate((g) => {
        if (!mounted) return
        setConnectionStatus("connected")
        announceTrickWin(g, session.playerId)
        setGame(g)
        setLoading(false)
        setError(null)
      })

      poller.onError((err) => {
        if (!mounted) return
        setConnectionStatus("disconnected")
        setError(err.message)
        setLoading(false)
      })

      try {
        setConnectionStatus("connecting")
        const { game: initial } = await gameAPI.getGameState(gameId, session.playerId)
        if (!mounted) return
        lastTrickCountRef.current = initial.liveState?.completedTricks?.length ?? 0
        setGame(initial)
        poller.initialize(gameId, initial, true)
        poller.setPlayerId(session.playerId)
        setConnectionStatus("connected")
        setLoading(false)
      } catch (err) {
        if (!mounted) return
        setConnectionStatus("disconnected")
        setError(err instanceof Error ? err.message : "Failed to load game")
        setLoading(false)
      }
    }

    init()

    const offlineHandler = () => setConnectionStatus("disconnected")
    const onlineHandler = () => {
      setConnectionStatus("connecting")
      pollerRef.current?.forceRefresh()
    }
    window.addEventListener("offline", offlineHandler)
    window.addEventListener("online", onlineHandler)

    return () => {
      mounted = false
      window.removeEventListener("offline", offlineHandler)
      window.removeEventListener("online", onlineHandler)
      pollerRef.current?.cleanup()
      pollerRef.current = null
    }
  }, [gameId, announceTrickWin])

  const handleGameAction = useCallback(async (action: string, data?: Record<string, unknown>) => {
    if (!currentPlayerId) {
      toast({ title: "Not logged in", variant: "destructive" })
      return
    }

    const applyActionGame = (raw: Game) => {
      announceTrickWin(raw, currentPlayerId)
      setGame(sanitizeLiveGameForPlayer(raw, currentPlayerId))
      pollerRef.current?.initialize(gameId, raw, false)
    }

    setConnectionStatus("connecting")
    try {
      switch (action) {
        case "startGame": {
          const res = await gameAPI.startGame(gameId, currentPlayerId)
          if (res.game) applyActionGame(res.game)
          break
        }
        case "submitBid": {
          const res = await gameAPI.submitBid(gameId, currentPlayerId, data?.bid as number)
          if (res.game) applyActionGame(res.game)
          break
        }
        case "playCard": {
          const res = await gameAPI.playCard(gameId, currentPlayerId, data?.card as string)
          if (res.game) applyActionGame(res.game)
          break
        }
        case "nextRound": {
          const res = await gameAPI.nextRound(gameId, currentPlayerId)
          if (res.game) applyActionGame(res.game)
          lastTrickCountRef.current = 0
          break
        }
        case "submitTricks": {
          const res = await gameAPI.submitTricks(gameId, currentPlayerId, data?.tricks as number)
          if (res.game) applyActionGame(res.game)
          break
        }
        case "approveTricks": {
          const res = await gameAPI.approveTricks(gameId, currentPlayerId)
          if (res.game) applyActionGame(res.game)
          break
        }
        default:
          throw new Error(`Unknown action: ${action}`)
      }
      pollerRef.current?.forceRefresh()
      setConnectionStatus("connected")
    } catch (err) {
      setConnectionStatus("connected")
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
      throw err
    }
  }, [currentPlayerId, gameId, toast, announceTrickWin])

  const hasComputers = game ? Object.values(game.players).some((p) => p.isComputer) : false

  useEffect(() => {
    if (!game?.liveState || !hasComputers) return
    if (trickPacing) return
    const phase = game.liveState.phase
    const turnId = game.liveState.currentTurn
    const isBotTurn = turnId && game.players[turnId]?.isComputer
    if (phase !== 'playing' && phase !== 'bidding') return
    if (!isBotTurn && phase === 'playing') return

    const interval = window.setInterval(() => {
      pollerRef.current?.forceRefresh()
    }, 2000)

    return () => window.clearInterval(interval)
  }, [game?.liveState?.phase, game?.liveState?.currentTurn, game?.players, hasComputers, trickPacing])

  useEffect(() => {
    if (!game?.liveState || !currentPlayerId) return
    if (game.liveState.phase !== "round_end") return
    if (game.status === "completed") return

    const isFinalRound = game.currentRound >= game.totalRounds
    const isHostPlayer = currentPlayerId === game.hostId

    // Mid-game: only auto-advance vs computer. Final round: host closes out the match.
    if (!isFinalRound && !hasComputers) return
    if (isFinalRound && !isHostPlayer) return

    if (roundAdvanceTimerRef.current) {
      clearTimeout(roundAdvanceTimerRef.current)
    }

    const delay = isFinalRound ? 3800 : 3200
    roundAdvanceTimerRef.current = setTimeout(() => {
      handleGameAction("nextRound").catch(() => {})
    }, delay)

    return () => {
      if (roundAdvanceTimerRef.current) {
        clearTimeout(roundAdvanceTimerRef.current)
      }
    }
  }, [
    game?.liveState?.phase,
    game?.currentRound,
    game?.totalRounds,
    game?.status,
    game?.hostId,
    currentPlayerId,
    hasComputers,
    handleGameAction,
  ])

  if (loading) {
    return <GameLoading message="Connecting to live table…" />
  }

  if (error || !game) {
    return (
      <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center p-6 gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-center text-muted-foreground">{error || "Game not found"}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <Button asChild variant="outline" className="border-white/10">
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/10">
            <Link href="/join-game">
              Join game
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => router.refresh()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const status = game.status || game.state
  const playerCount = Object.keys(game.players).length
  const maxPlayers = game.maxPlayers ?? 4
  const isHost = currentPlayerId === game.hostId
  const isFourSeatTable = supportsLiveCardTable(maxPlayers)
  const scoringTable = isScoringTable(game)
  const voiceEnabled = !!currentPlayerId && status !== "cancelled" && status !== "completed"

  let phaseContent: ReactNode

  if (status === "cancelled") {
    phaseContent = (
      <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center p-6 gap-4">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-center text-muted-foreground">This game was closed. Start a new table from the dashboard.</p>
        <Button asChild className="btn-pill-primary">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  } else if (
    isFourSeatTable &&
    playerCount < maxPlayers &&
    status !== "lobby" &&
    status !== "completed"
  ) {
    phaseContent = <ManualGameGate game={game} reason="incomplete" />
  } else if (status === "lobby") {
    phaseContent = (
      <LiveLobby
        game={game}
        currentPlayerId={currentPlayerId}
        onStart={() => handleGameAction("startGame")}
      />
    )
  } else if (status === "completed" && currentPlayerId) {
    phaseContent = (
      <ScoreScreen
        game={game}
        myPlayerId={currentPlayerId}
        isHost={isHost}
      />
    )
  } else if (
    isFourSeatTable &&
    currentPlayerId &&
    (status === "bidding" || status === "playing" || status === "scoring")
  ) {
    const tableProps = buildCardTableProps(game, currentPlayerId)
    phaseContent = tableProps ? (
      <CardTableErrorBoundary onReset={() => setCardTableKey((k) => k + 1)} key={cardTableKey}>
        <CardTable
          {...tableProps}
          gameId={gameId}
          isHost={isHost}
          connectionStatus={connectionStatus}
          onPlayCard={async (card) => {
            await handleGameAction("playCard", { card })
          }}
          onSubmitBid={async (bid) => {
            await handleGameAction("submitBid", { bid })
          }}
          onRoundCompleteDismiss={() => handleGameAction("nextRound")}
          onRequestSync={() => pollerRef.current?.forceRefresh()}
          onPacingChange={setTrickPacing}
        />
      </CardTableErrorBoundary>
    ) : null
  }

  if (!phaseContent && scoringTable && status === "bidding" && currentPlayerId) {
    phaseContent = (
      <BiddingPanel
        game={game}
        currentPlayerId={currentPlayerId}
        onSubmitBid={(bid) => handleGameAction("submitBid", { bid })}
      />
    )
  }

  if (
    !phaseContent &&
    scoringTable &&
    (status === "playing" || status === "reviewing") &&
    currentPlayerId
  ) {
    phaseContent = (
      <ManualTricksPanel
        game={game}
        currentPlayerId={currentPlayerId}
        isHost={isHost}
        onSubmitTricks={(tricks) => handleGameAction("submitTricks", { tricks })}
        onApproveTricks={
          isHost ? () => handleGameAction("approveTricks") : undefined
        }
      />
    )
  }

  if (!phaseContent && scoringTable && status === "scoring" && currentPlayerId) {
    phaseContent = (
      <ScoreScreen
        game={game}
        myPlayerId={currentPlayerId}
        isHost={isHost}
        onNextRound={() => handleGameAction("nextRound")}
      />
    )
  }

  if (!phaseContent && isFourSeatTable && currentPlayerId) {
    phaseContent = (
      <div className="felt-page flex min-h-[100dvh] flex-col items-center justify-center p-6 gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <div className="text-center space-y-2 max-w-sm">
          <p className="font-semibold text-white">Could not load the card table</p>
          <p className="text-sm text-muted-foreground">
            The game state may be out of sync. Try refreshing, or start a new game with all 4 players in the lobby.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-center">
          {currentPlayerId && (
            <EndGameControl
              gameId={gameId}
              playerId={currentPlayerId}
              isHost={isHost}
              variant="destructive"
            />
          )}
          <Button variant="outline" className="border-white/10" onClick={() => router.refresh()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button asChild className="btn-pill-primary">
            <Link href="/create-game">New game</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!phaseContent && status === "scoring" && game.liveState?.phase !== "round_end") {
    phaseContent = (
      <ScoreScreen
        game={game}
        myPlayerId={currentPlayerId}
        isHost={isHost}
        onNextRound={() => handleGameAction("nextRound")}
      />
    )
  }

  if (!phaseContent) {
    phaseContent = (
      <div className="felt-page flex min-h-[100dvh] items-center justify-center">
        <p className="text-muted-foreground">Phase: {status}</p>
      </div>
    )
  }

  return (
    <GameVoiceProvider
      gameId={gameId}
      playerId={currentPlayerId}
      humanPlayerIds={humanPlayerIds}
      enabled={voiceEnabled}
    >
      <GameChatProvider
        gameId={gameId}
        playerId={currentPlayerId}
        enabled={voiceEnabled}
      >
        {phaseContent}
      </GameChatProvider>
    </GameVoiceProvider>
  )
}
