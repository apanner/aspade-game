/** Table size, team layout, and live-vs-manual play rules. */

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

export const PLAYER_COUNT_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => i + MIN_PLAYERS
) as readonly number[]

export type TablePlayerCount = (typeof PLAYER_COUNT_OPTIONS)[number]

/** Team size: 1 = individual (cutthroat), 2–4 = team partners per side. */
export const TEAM_SIZE_OPTIONS = [1, 2, 3, 4] as const
export type TeamSizeChoice = (typeof TEAM_SIZE_OPTIONS)[number]

export const TEAM_COLOR_PALETTE = [
  { name: "Cyan Kings", color: "#00e5ff" },
  { name: "Orange Aces", color: "#ff6b35" },
  { name: "Violet Vipers", color: "#a78bfa" },
  { name: "Lime Legends", color: "#84cc16" },
  { name: "Rose Rebels", color: "#f472b6" },
  { name: "Gold Giants", color: "#facc15" },
  { name: "Sky Sharks", color: "#38bdf8" },
  { name: "Crimson Crew", color: "#ef4444" },
  { name: "Mint Mavericks", color: "#2dd4bf" },
  { name: "Amber Aces", color: "#f59e0b" },
  { name: "Indigo Icons", color: "#6366f1" },
  { name: "Pearl Panthers", color: "#e2e8f0" },
] as const

export type TableTeamConfig = {
  id: string
  name: string
  color: string
  colorName: string
  bg: string
}

export type TableLayout = {
  valid: boolean
  maxPlayers: number
  playersPerTeam: TeamSizeChoice
  numberOfTeams: number
  gameMode: "teams" | "individual"
  message?: string
}

export function computeTableLayout(maxPlayers: number, playersPerTeam: TeamSizeChoice): TableLayout {
  if (maxPlayers < MIN_PLAYERS || maxPlayers > MAX_PLAYERS) {
    return {
      valid: false,
      maxPlayers,
      playersPerTeam,
      numberOfTeams: 0,
      gameMode: playersPerTeam === 1 ? "individual" : "teams",
      message: `Player count must be between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`,
    }
  }

  if (playersPerTeam === 1) {
    return {
      valid: true,
      maxPlayers,
      playersPerTeam: 1,
      numberOfTeams: maxPlayers,
      gameMode: "individual",
    }
  }

  if (maxPlayers % playersPerTeam !== 0) {
    return {
      valid: false,
      maxPlayers,
      playersPerTeam,
      numberOfTeams: 0,
      gameMode: "teams",
      message: `${maxPlayers} players does not divide evenly into teams of ${playersPerTeam}. Pick another count or team size.`,
    }
  }

  const numberOfTeams = maxPlayers / playersPerTeam
  if (numberOfTeams < 2) {
    return {
      valid: false,
      maxPlayers,
      playersPerTeam,
      numberOfTeams,
      gameMode: "teams",
      message: "Need at least 2 teams for team play.",
    }
  }

  return {
    valid: true,
    maxPlayers,
    playersPerTeam,
    numberOfTeams,
    gameMode: "teams",
  }
}

/** Live animated card table uses the 4-seat engine. Larger tables use scoring mode. */
export function supportsLiveCardTable(maxPlayers: number): boolean {
  return maxPlayers === 4
}

export function usesLiveCardEngine(game: {
  maxPlayers?: number
  liveState?: unknown | null
}): boolean {
  return (game.maxPlayers ?? 4) === 4 && game.liveState != null
}

export function isScoringTable(game: { maxPlayers?: number }): boolean {
  return (game.maxPlayers ?? 4) > 4
}

export function describeTableLayout(layout: TableLayout): string {
  if (!layout.valid) return layout.message ?? "Invalid table setup"

  if (layout.gameMode === "individual") {
    return `${layout.maxPlayers} players · individual (solo scoring)`
  }

  return `${layout.maxPlayers} players · ${layout.numberOfTeams} teams × ${layout.playersPerTeam}`
}

export function describePlayMode(maxPlayers: number): string {
  if (supportsLiveCardTable(maxPlayers)) {
    return "Live card table — deal, bid, and play cards on screen"
  }
  return "Scoring table — invite players, track bids and books together"
}

export function buildTeamConfigs(numberOfTeams: number): TableTeamConfig[] {
  return Array.from({ length: numberOfTeams }, (_, index) => {
    const preset = TEAM_COLOR_PALETTE[index % TEAM_COLOR_PALETTE.length]
    const teamId = `team${index + 1}`
    return {
      id: teamId,
      name: preset.name,
      color: preset.color,
      colorName: preset.name,
      bg: `team-${index + 1}`,
    }
  })
}

/** Keep custom names when team count changes; add defaults for new teams. */
export function syncTeamConfigs(
  previous: TableTeamConfig[],
  numberOfTeams: number
): TableTeamConfig[] {
  const fresh = buildTeamConfigs(numberOfTeams)
  return fresh.map((team, index) => {
    const prior = previous[index]
    const customName = prior?.name?.trim()
    if (!customName) return team
    return { ...team, name: customName, colorName: customName }
  })
}

export function normalizeTeamConfigs(configs: TableTeamConfig[]): TableTeamConfig[] {
  return configs.map((team, index) => {
    const fallback = TEAM_COLOR_PALETTE[index % TEAM_COLOR_PALETTE.length].name
    const name = team.name.trim() || fallback
    return { ...team, name, colorName: name }
  })
}

export function teamSizeLabel(size: TeamSizeChoice): string {
  if (size === 1) return "Individual"
  return `Teams of ${size}`
}

export function teamSizeDescription(maxPlayers: number, size: TeamSizeChoice): string {
  if (size === 1) return `${maxPlayers} solo players — cutthroat scoring`
  if (maxPlayers % size !== 0) return `Not valid — ${maxPlayers} is not divisible by ${size}`
  const teams = maxPlayers / size
  if (teams < 2) return "Need at least 2 teams"
  return `${teams} teams · ${size} players each`
}

export function isTeamSizeValidForPlayers(maxPlayers: number, size: TeamSizeChoice): boolean {
  if (size === 1) return true
  if (maxPlayers % size !== 0) return false
  return maxPlayers / size >= 2
}
