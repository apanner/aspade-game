"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Bot,
  RefreshCw,
  Shuffle,
  Spade,
  Sparkles,
  Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { gameAPI, sessionStorage } from "@/lib/api"
import { navigateToGame } from "@/lib/navigate-to-game"
import {
  defaultDeckCountForPlayers,
  describeDeckSetup,
  DECK_COUNT_OPTIONS,
  isDeckSetupValid,
  type DeckCountChoice,
} from "@/lib/deck-config"
import {
  buildTeamConfigs,
  computeTableLayout,
  describePlayMode,
  describeTableLayout,
  isTeamSizeValidForPlayers,
  normalizeTeamConfigs,
  PLAYER_COUNT_OPTIONS,
  supportsLiveCardTable,
  syncTeamConfigs,
  TEAM_SIZE_OPTIONS,
  teamSizeDescription,
  type TableTeamConfig,
  type TeamSizeChoice,
} from "@/lib/table-config"
import { cn } from "@/lib/utils"

const TITLE_PREFIXES = ["Friday Night", "Weekend", "Epic", "Neon", "Kitchen Table"]
const TITLE_SUFFIXES = ["Spades", "Showdown", "Legends", "Battle", "Championship"]

function randomTitle(): string {
  const p = TITLE_PREFIXES[Math.floor(Math.random() * TITLE_PREFIXES.length)]
  const s = TITLE_SUFFIXES[Math.floor(Math.random() * TITLE_SUFFIXES.length)]
  return `${p} ${s}`
}

export function CreateGameForm() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [totalRounds, setTotalRounds] = useState("13")
  const [submitting, setSubmitting] = useState(false)
  const [withComputers, setWithComputers] = useState(false)
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [teamSize, setTeamSize] = useState<TeamSizeChoice>(2)
  const [deckCount, setDeckCount] = useState<DeckCountChoice>(2)
  const [teamConfigs, setTeamConfigs] = useState<TableTeamConfig[]>(() => buildTeamConfigs(2))

  const tablePlayers = withComputers ? 4 : maxPlayers
  const effectiveTeamSize: TeamSizeChoice = withComputers ? 1 : teamSize
  const tableLayout = useMemo(
    () => computeTableLayout(tablePlayers, effectiveTeamSize),
    [tablePlayers, effectiveTeamSize]
  )
  const recommendedDeckCount = defaultDeckCountForPlayers(tablePlayers)
  const deckSummary = describeDeckSetup(tablePlayers, deckCount)
  const roundsNum = parseInt(totalRounds, 10)
  const deckValidation = isDeckSetupValid(tablePlayers, deckCount, roundsNum)
  const playModeDescription = describePlayMode(tablePlayers)
  const usesLiveCards = supportsLiveCardTable(tablePlayers) && !withComputers

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!title) setTitle(randomTitle())
  }, [title])

  useEffect(() => {
    setDeckCount(defaultDeckCountForPlayers(tablePlayers) as DeckCountChoice)
  }, [tablePlayers])

  useEffect(() => {
    if (!isTeamSizeValidForPlayers(tablePlayers, teamSize)) {
      const fallback =
        TEAM_SIZE_OPTIONS.find((size) => isTeamSizeValidForPlayers(tablePlayers, size)) ?? 1
      setTeamSize(fallback)
    }
  }, [tablePlayers, teamSize])

  useEffect(() => {
    if (tableLayout.valid && tableLayout.gameMode === "teams") {
      setTeamConfigs((prev) => syncTeamConfigs(prev, tableLayout.numberOfTeams))
    }
  }, [tableLayout.numberOfTeams, tableLayout.gameMode, tableLayout.valid])

  const handleTeamNameChange = (index: number, name: string) => {
    setTeamConfigs((prev) =>
      prev.map((team, i) => (i === index ? { ...team, name, colorName: name } : team))
    )
  }

  const handleCreate = async () => {
    if (!user?.name) return

    if (!tableLayout.valid) {
      toast({
        title: "Invalid table setup",
        description: tableLayout.message,
        variant: "destructive",
      })
      return
    }

    if (!deckValidation.ok) {
      toast({
        title: "Deck setup too small",
        description: deckValidation.message,
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const configsForGame =
        tableLayout.gameMode === "teams" ? normalizeTeamConfigs(teamConfigs) : []

      const result = await gameAPI.createGame({
        hostName: user.name,
        playMode: "live",
        gameMode: tableLayout.gameMode,
        numberOfTeams: tableLayout.numberOfTeams,
        playersPerTeam: tableLayout.playersPerTeam,
        maxPlayers: tablePlayers,
        deckCount,
        totalRounds: roundsNum,
        autoAssignTeams: tableLayout.gameMode === "teams",
        withComputers,
        autoStart: withComputers,
        title: title.trim() || (withComputers ? `${user.name} vs Computer` : `${user.name}'s Game`),
        teamConfigs: configsForGame,
      })

      await sessionStorage.savePlayerSession(result.gameId, result.playerId, user.name)
      toast({ title: "Game created!", description: `Code: ${result.code}` })
      navigateToGame(result.gameId)
    } catch (err) {
      setSubmitting(false)
      toast({
        title: "Could not create game",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    }
  }

  if (loading || !user) {
    return (
      <div className="felt-page flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-team-us" />
      </div>
    )
  }

  return (
    <div className="felt-page min-h-[100dvh] px-4 py-6 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md space-y-5">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl glass-panel glow-us">
            <Spade className="w-7 h-7 text-team-us" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Create Live Game</h1>
            <p className="text-sm text-muted-foreground">
              {tableLayout.valid ? describeTableLayout(tableLayout) : "Configure your table"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-team-us/15 text-team-us border-team-us/30 gap-1">
            <Sparkles className="w-3 h-3" />
            {usesLiveCards || withComputers ? "Live Card Play" : "Scoring Table"}
          </Badge>
          {tableLayout.valid && tableLayout.gameMode === "teams" && (
            <Badge variant="outline" className="border-white/15">
              {tableLayout.numberOfTeams} teams
            </Badge>
          )}
        </div>

        <Card className="glass-panel border-white/10 bg-transparent">
          <CardHeader>
            <CardTitle className="text-lg">Table setup</CardTitle>
            <CardDescription>Host: {user.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Table name</Label>
              <div className="flex gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 bg-black/30 border-white/10 flex-1"
                  placeholder="Friday Night Spades"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 border-white/10 shrink-0"
                  onClick={() => setTitle(randomTitle())}
                  aria-label="Random title"
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max players (2–12)</Label>
              {withComputers ? (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-sm">
                  <p className="font-medium text-purple-100">4 seats — you + 3 computer bots</p>
                </div>
              ) : (
                <Select value={String(maxPlayers)} onValueChange={(v) => setMaxPlayers(Number(v))}>
                  <SelectTrigger className="h-11 bg-black/30 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200] bg-[#0c1219] border-white/10">
                    {PLAYER_COUNT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} players
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {!withComputers && (
              <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">Team size</Label>
                  <span className="text-xs text-muted-foreground">
                    {teamSizeDescription(tablePlayers, teamSize)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Team size">
                  {TEAM_SIZE_OPTIONS.map((size) => {
                    const valid = isTeamSizeValidForPlayers(tablePlayers, size)
                    const selected = teamSize === size
                    const title =
                      size === 1 ? "Solo" : size === 2 ? "Pairs" : size === 3 ? "Trios" : "Quads"
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!valid}
                        onClick={() => setTeamSize(size)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-all",
                          !valid && "opacity-35 cursor-not-allowed",
                          selected && valid && size === 1 && "border-win-gold/50 bg-win-gold/10",
                          selected && valid && size !== 1 && "border-team-us/50 bg-team-us/10",
                          !selected && valid && "border-white/10 bg-black/30 hover:border-white/20"
                        )}
                        aria-pressed={selected}
                      >
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            selected && size === 1 && "text-win-gold",
                            selected && size !== 1 && "text-team-us",
                            !selected && "text-white"
                          )}
                        >
                          {title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {valid
                            ? size === 1
                              ? "Everyone plays alone"
                              : `${tablePlayers / size} teams · ${size} each`
                            : "Not valid for this count"}
                        </p>
                      </button>
                    )
                  })}
                </div>
                {tableLayout.valid && tableLayout.gameMode === "teams" && (
                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <Label className="text-xs text-muted-foreground">Team names</Label>
                    <div
                      className={cn(
                        "grid gap-2",
                        teamConfigs.length > 4 ? "max-h-36 overflow-y-auto pr-1" : ""
                      )}
                    >
                      {teamConfigs.map((team, index) => (
                        <div key={team.id} className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: team.color }}
                            aria-hidden
                          />
                          <Input
                            value={team.name}
                            onChange={(e) => handleTeamNameChange(index, e.target.value)}
                            maxLength={24}
                            placeholder={`Team ${index + 1}`}
                            className="h-9 bg-black/30 border-white/10 text-sm"
                            style={{ borderColor: `${team.color}44` }}
                            aria-label={`Name for ${team.id}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!tableLayout.valid && tableLayout.message && (
                  <p className="text-xs text-amber-400/90">{tableLayout.message}</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Layers className="w-3.5 h-3.5" />
                  Decks
                </Label>
                <Select
                  value={String(deckCount)}
                  onValueChange={(v) => setDeckCount(Number(v) as DeckCountChoice)}
                >
                  <SelectTrigger className="h-11 bg-black/30 border-white/10">
                    <SelectValue>{deckCount} deck{deckCount === 1 ? "" : "s"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[200] bg-[#0c1219] border-white/10">
                    {DECK_COUNT_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} deck{n === 1 ? "" : "s"} · {52 * n} cards
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Rounds</Label>
                <Select value={totalRounds} onValueChange={setTotalRounds}>
                  <SelectTrigger className="h-11 bg-black/30 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200] bg-[#0c1219] border-white/10">
                    {["7", "10", "13", "15"].map((n) => (
                      <SelectItem key={n} value={n}>
                        {n} rounds
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p
              className={cn(
                "text-xs -mt-2",
                deckValidation.ok ? "text-muted-foreground" : "text-amber-400/90"
              )}
            >
              {deckValidation.ok
                ? `${deckSummary} · ${totalRounds} rounds OK`
                : deckValidation.message}
              {deckValidation.ok && deckCount !== recommendedDeckCount && (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="text-team-us hover:underline"
                    onClick={() => setDeckCount(recommendedDeckCount as DeckCountChoice)}
                  >
                    Use {recommendedDeckCount} decks
                  </button>
                </>
              )}
            </p>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-muted-foreground">
              {playModeDescription}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-300" />
                  Play vs Computer
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Solo scoring — you vs 3 AI bots (4 players, individual)
                </p>
              </div>
              <Switch checked={withComputers} onCheckedChange={setWithComputers} />
            </div>

            <Button
              className="btn-pill-primary w-full h-14 text-base"
              onClick={handleCreate}
              disabled={submitting || !tableLayout.valid || !deckValidation.ok}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  {withComputers
                    ? "Start vs Computer"
                    : usesLiveCards
                      ? "Open lobby & invite friends"
                      : "Create scoring table"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
