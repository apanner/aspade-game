"use client"

import { useMemo, useState } from "react"
import { Copy, Crown, Play, Users, CheckCircle, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { Game } from "@/lib/api"
import { cn } from "@/lib/utils"
import { EndGameControl } from "@/components/shell/end-game-control"
import { TableHudComms } from "@/components/table/table-hud-comms"
import { MicPermissionFloater } from "@/components/voice/mic-permission-floater"
import { buildTeamConfigs, supportsLiveCardTable } from "@/lib/table-config"

type LiveLobbyProps = {
  game: Game
  currentPlayerId: string | null
  onStart: () => Promise<void>
}

export function LiveLobby({ game, currentPlayerId, onStart }: LiveLobbyProps) {
  const { toast } = useToast()
  const [starting, setStarting] = useState(false)
  const [copied, setCopied] = useState(false)

  const maxPlayers = game.maxPlayers ?? 4
  const isCardTable = supportsLiveCardTable(maxPlayers)
  const playersPerTeam = game.teamConfig?.playersPerTeam ?? 2
  const isIndividual = game.gameMode === "individual" || game.teamConfig?.gameMode === "individual"
  const numberOfTeams = isIndividual
    ? maxPlayers
    : game.teamConfig?.numberOfTeams ?? Math.max(2, Math.floor(maxPlayers / playersPerTeam))

  const players = useMemo(
    () =>
      Object.values(game.players).sort((a, b) => {
        if (a.isHost && !b.isHost) return -1
        if (!a.isHost && b.isHost) return 1
        return (a.joinedAt ?? 0) - (b.joinedAt ?? 0)
      }),
    [game.players]
  )

  const playerCount = players.length
  const isHost = currentPlayerId === game.hostId
  const canStart = playerCount === maxPlayers
  const playersNeeded = Math.max(0, maxPlayers - playerCount)

  const teamConfigs = useMemo(() => {
    if (game.teamConfigs && game.teamConfigs.length >= numberOfTeams) {
      return game.teamConfigs.slice(0, numberOfTeams)
    }
    return buildTeamConfigs(numberOfTeams)
  }, [game.teamConfigs, numberOfTeams])

  const playersByTeam = useMemo(() => {
    if (isIndividual) {
      return players.map((p) => ({ teamId: p.id, teamName: p.name, color: "#94a3b8", members: [p] }))
    }
    return teamConfigs.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      color: team.color ?? "#94a3b8",
      members: players.filter((p) => p.team === team.id),
    }))
  }, [isIndividual, players, teamConfigs])

  const inviteLink =
    typeof window !== "undefined" ? `${window.location.origin}/join/${game.id}` : ""

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink || game.code)
      setCopied(true)
      toast({ title: "Copied!", description: "Share with friends to fill seats" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Copy failed", variant: "destructive" })
    }
  }

  const handleStart = async () => {
    setStarting(true)
    try {
      await onStart()
    } finally {
      setStarting(false)
    }
  }

  const renderPlayer = (p: (typeof players)[0]) => (
    <li
      key={p.id}
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 border",
        p.id === currentPlayerId ? "border-team-us/40 bg-team-us/5 glow-us" : "border-white/5 bg-black/20"
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        {p.isHost && <Crown className="w-4 h-4 text-win-gold shrink-0" aria-label="Host" />}
        {p.isComputer && <Bot className="w-4 h-4 text-purple-400 shrink-0" aria-label="Computer" />}
        <span className="font-medium truncate">{p.name}</span>
        {p.id === currentPlayerId && <span className="text-xs text-team-us shrink-0">(you)</span>}
      </span>
      {p.isTeamLeader && !isIndividual && (
        <span className="text-[10px] uppercase text-muted-foreground shrink-0">captain</span>
      )}
    </li>
  )

  const layoutLabel = isIndividual
    ? `${maxPlayers} players · individual`
    : `${maxPlayers} players · ${numberOfTeams} teams × ${playersPerTeam}`

  return (
    <div className="felt-page flex min-h-[100dvh] flex-col p-4">
      <div className="relative mx-auto max-w-lg w-full flex-1 flex flex-col gap-5 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-2 z-50 flex justify-center px-3">
          <MicPermissionFloater />
        </div>
        {currentPlayerId && (
          <div className="absolute top-0 right-0 z-10">
            <EndGameControl
              gameId={game.id}
              playerId={currentPlayerId}
              isHost={isHost}
              variant="ghost"
            />
          </div>
        )}
        <header className="text-center space-y-3">
          <p className="phase-label">{isCardTable ? "Live table" : "Scoring lobby"}</p>
          <h1 className="text-2xl font-bold font-display">{game.title || "Spades lobby"}</h1>
          <p className="text-3xl font-mono tracking-[0.25em] text-team-us glow-us">{game.code}</p>
          <p className="text-sm text-muted-foreground">{layoutLabel}</p>
          <p className="text-xs text-muted-foreground">
            Share code — need {isCardTable ? 4 : maxPlayers} players to {isCardTable ? "deal" : "start"}
          </p>
        </header>

        <div className="flex items-center justify-between glass-panel px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            Players
          </span>
          <span
            className={cn(
              "font-semibold",
              canStart || (isCardTable ? playerCount === 4 : playerCount === maxPlayers)
                ? "text-turn-active"
                : "text-team-them"
            )}
          >
            {playerCount} / {isCardTable ? 4 : maxPlayers}
          </span>
        </div>

        <div
          className={cn(
            "grid gap-3",
            playersByTeam.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
          )}
        >
          {playersByTeam.map((group) => (
            <div
              key={group.teamId}
              className="glass-panel p-3 border"
              style={{ borderColor: `${group.color}44` }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2 text-center truncate"
                style={{ color: group.color }}
              >
                {group.teamName}
              </p>
              <ul className="space-y-2">
                {group.members.length > 0 ? (
                  group.members.map((p) => renderPlayer(p))
                ) : (
                  <li className="rounded-lg px-3 py-3 border border-dashed border-white/10 text-muted-foreground text-sm text-center">
                    Waiting…
                  </li>
                )}
                {!isIndividual &&
                  group.members.length < playersPerTeam &&
                  Array.from({ length: playersPerTeam - group.members.length }).map((_, i) => (
                    <li
                      key={`empty-${group.teamId}-${i}`}
                      className="rounded-lg px-3 py-2 border border-dashed border-white/10 text-muted-foreground text-xs text-center"
                    >
                      Open seat
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <Button variant="outline" className="border-white/10 h-12" onClick={handleCopy}>
          {copied ? <CheckCircle className="w-4 h-4 mr-2 text-turn-active" /> : <Copy className="w-4 h-4 mr-2" />}
          Copy invite link
        </Button>

        {isHost ? (
          <Button
            className={cn(
              "h-14 text-lg font-semibold rounded-2xl",
              canStart
                ? "bg-gradient-to-r from-team-us to-cyan-400 text-slate-950 glow-us"
                : "bg-white/10 text-muted-foreground"
            )}
            disabled={!canStart || starting}
            onClick={handleStart}
          >
            <Play className="w-5 h-5 mr-2" />
            {canStart
              ? starting
                ? "Starting…"
                : isCardTable
                  ? "Deal cards"
                  : "Start game"
              : `Need ${playersNeeded} more`}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">
            Waiting for host to start when the table is full…
          </p>
        )}

        {currentPlayerId && (
          <div className="flex justify-center pt-2">
            <TableHudComms
              myPlayerId={currentPlayerId}
              players={players.map((player) => ({ id: player.id, name: player.name }))}
            />
          </div>
        )}
      </div>
    </div>
  )
}
