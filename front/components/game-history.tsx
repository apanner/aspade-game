"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { formatDistanceToNow } from "@/lib/utils"
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Crown,
  Target,
  Zap,
  Calendar,
  Clock
} from "lucide-react"

type User = {
  id: string
  name: string
  email: string
}

type Round = {
  roundNumber: number
  bids: Record<string, number>
  tricks: Record<string, number>
  scores: Record<string, number>
  teamScores: Record<string, number>
}

type Game = {
  id: string
  title: string
  hostId: string
  hostName: string
  completedAt: number
  totalRounds: number
  duration: number // in minutes
  players: Record<string, { name: string; team: string; avatar?: string }>
  rounds: Round[]
  finalScores: Record<string, number>
  teamFinalScores: Record<string, number>
  winnerTeam: string
}

const TEAM_COLORS = {
  red: "text-team-red border-team-red bg-gradient-team-red",
  blue: "text-team-blue border-team-blue bg-gradient-team-blue", 
  green: "text-team-green border-team-green bg-gradient-team-green",
  purple: "text-team-purple border-team-purple bg-gradient-team-purple"
}

const TEAM_SHADOWS = {
  red: "shadow-team-red",
  blue: "hover:shadow-lg",
  green: "hover:shadow-lg", 
  purple: "hover:shadow-lg"
}

export function GameHistory({
  user,
  games,
}: {
  user: User
  games: Game[]
}) {
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set())

  const toggleGameExpansion = (gameId: string) => {
    const newExpanded = new Set(expandedGames)
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId)
    } else {
      newExpanded.add(gameId)
    }
    setExpandedGames(newExpanded)
  }

  // Sort games by completion date (newest first)
  const sortedGames = [...games].sort((a, b) => b.completedAt - a.completedAt)

  const getTeamColor = (team: string) => {
    return TEAM_COLORS[team as keyof typeof TEAM_COLORS] || TEAM_COLORS.blue
  }

  const getPlayerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const isWinner = (game: Game, playerId: string) => {
    const playerTeam = game.players[playerId]?.team
    return playerTeam === game.winnerTeam
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6 animate-fade-in-up">
      {/* Hero Header */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 hover:scale-105 transition-transform">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Game History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sortedGames.length} games completed
          </p>
        </div>
        
        <div className="w-20"></div>
      </div>

      {sortedGames.length > 0 ? (
        <div className="space-y-4">
          {sortedGames.map((game) => {
            const isExpanded = expandedGames.has(game.id)
            const playerTeam = game.players[user.id]?.team
            const userIsWinner = isWinner(game, user.id)
            const userFinalScore = game.finalScores[user.id] || 0
            
            // Get team standings
            const teamStandings = Object.entries(game.teamFinalScores)
              .map(([team, score]) => ({ team, score }))
              .sort((a, b) => b.score - a.score)

            return (
              <Card 
                key={game.id} 
                className={`
                  bg-gradient-surface border-border/50 hover:border-border 
                  transition-all duration-300 overflow-hidden
                  ${userIsWinner ? 'ring-2 ring-victory/30 shadow-victory animate-glow-pulse' : 'shadow-gaming'}
                `}
              >
                <Collapsible 
                  open={isExpanded} 
                  onOpenChange={() => toggleGameExpansion(game.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {userIsWinner && (
                              <div className="animate-victory-pulse">
                                <Crown className="h-6 w-6 text-victory" />
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-xl font-bold flex items-center gap-2">
                                {game.title}
                                {userIsWinner && (
                                  <Badge className="bg-gradient-victory text-primary-foreground animate-float">
                                    Victory!
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(game.completedAt)} ago
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {game.duration}m
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {Object.keys(game.players).length} players
                                </span>
                              </CardDescription>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Your Score</div>
                              <div className={`text-2xl font-bold ${userIsWinner ? 'text-victory animate-score-bounce' : ''}`}>
                                {userFinalScore}
                              </div>
                              {playerTeam && (
                                <Badge className={`text-xs ${getTeamColor(playerTeam)}`}>
                                  {playerTeam.charAt(0).toUpperCase() + playerTeam.slice(1)} Team
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Team Standings Preview */}
                        <div className="flex gap-2 mt-3">
                          {teamStandings.map(({ team, score }, index) => (
                            <div 
                              key={team}
                              className={`
                                flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium
                                ${index === 0 ? getTeamColor(team) + ' text-background' : 'bg-muted text-muted-foreground'}
                              `}
                            >
                              {index === 0 && <Trophy className="h-3 w-3" />}
                              <span>{team.charAt(0).toUpperCase() + team.slice(1)}</span>
                              <span className="font-bold">{score}</span>
                            </div>
                          ))}
                        </div>
                </CardHeader>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-6">
                      {/* Round-by-Round Details */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-lg font-semibold">
                          <Target className="h-5 w-5 text-primary" />
                          Round Details
                        </div>
                        
                        <div className="grid gap-3">
                          {game.rounds.map((round) => (
                            <Card key={round.roundNumber} className="bg-muted/30 border-border/30">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-primary" />
                                    Round {round.roundNumber}
                                  </h4>
                                </div>
                                
                                {/* Player Performance Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {Object.entries(game.players).map(([playerId, player]) => {
                                    const bid = round.bids[playerId] || 0
                                    const tricks = round.tricks[playerId] || 0
                                    const score = round.scores[playerId] || 0
                                    const madeContract = bid === tricks
                                    
                                    return (
                                      <div 
                                        key={playerId}
                                        className={`
                                          flex items-center justify-between p-3 rounded-lg border
                                          ${madeContract ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}
                                          ${playerId === user.id ? 'ring-2 ring-primary/30' : ''}
                                        `}
                                      >
                                        <div className="flex items-center gap-3">
                                          <Avatar className="w-8 h-8">
                                            <AvatarImage src={player.avatar} />
                                            <AvatarFallback className={getTeamColor(player.team)}>
                                              {getPlayerInitials(player.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <div className="font-medium text-sm">
                                              {player.name}
                                              {playerId === user.id && (
                                                <span className="text-xs text-primary ml-1">(You)</span>
                                              )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {player.team ? player.team.charAt(0).toUpperCase() + player.team.slice(1) : 'Individual'}
                                            </div>
                                          </div>
                  </div>

                                        <div className="text-right">
                                          <div className="text-sm">
                                            <span className="text-muted-foreground">Bid:</span>
                                            <span className="font-bold ml-1">{bid}</span>
                                            <span className="text-muted-foreground mx-1">|</span>
                                            <span className="text-muted-foreground">Made:</span>
                                            <span className={`font-bold ml-1 ${madeContract ? 'text-green-400' : 'text-red-400'}`}>
                                              {tricks}
                                            </span>
                                          </div>
                                          <div className={`text-lg font-bold ${score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : ''}`}>
                                            {score > 0 ? '+' : ''}{score}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* Team Scores for Round */}
                                <div className="mt-4 pt-4 border-t border-border/30">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(round.teamScores).map(([team, score]) => (
                                      <div 
                                        key={team}
                                        className={`
                                          text-center p-2 rounded-lg border
                                          ${getTeamColor(team).includes(team) ? 'border-' + team + '/30' : 'border-border/30'}
                                        `}
                                      >
                                        <div className="text-xs text-muted-foreground">
                                          {team.charAt(0).toUpperCase() + team.slice(1)} Team
                                        </div>
                                        <div className="text-lg font-bold">
                                          {score > 0 ? '+' : ''}{score}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                    </div>
                      </div>

                      {/* Final Summary */}
                      <div className="bg-gradient-surface p-6 rounded-xl border border-border/50">
                        <div className="flex items-center gap-2 mb-4">
                          <Trophy className="h-6 w-6 text-victory" />
                          <h3 className="text-xl font-bold">Final Results</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Team Rankings */}
                          <div>
                            <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                              Team Rankings
                            </h4>
                            <div className="space-y-2">
                              {teamStandings.map(({ team, score }, index) => (
                                <div 
                                  key={team}
                                  className={`
                                    flex items-center justify-between p-3 rounded-lg border
                                    ${index === 0 ? getTeamColor(team) + ' text-background border-transparent' : 'border-border/30'}
                                  `}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-background/20 text-xs font-bold">
                                      {index + 1}
                                    </div>
                                    <span className="font-medium">
                                      {team.charAt(0).toUpperCase() + team.slice(1)} Team
                                    </span>
                                    {index === 0 && <Crown className="h-4 w-4" />}
                                  </div>
                                  <span className="text-2xl font-bold">{score}</span>
                                </div>
                              ))}
                    </div>
                  </div>

                          {/* Player Performance */}
                          <div>
                            <h4 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                              Your Performance
                            </h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                <span>Total Score</span>
                                <span className="text-2xl font-bold">{userFinalScore}</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                <span>Contracts Made</span>
                                <span className="font-bold">
                                  {game.rounds.filter(r => r.bids[user.id] === r.tricks[user.id]).length} / {game.rounds.length}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                <span>Best Round</span>
                                <span className="font-bold">
                                  +{Math.max(...game.rounds.map(r => r.scores[user.id] || 0))}
                    </span>
                              </div>
                            </div>
                          </div>
                        </div>
                  </div>
                </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-gradient-surface border-border/50 shadow-gaming">
          <CardContent className="p-12 text-center">
            <div className="animate-float mb-6">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Games Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start playing to build your legendary gaming history!
            </p>
            <Link href="/create-game">
              <Button className="bg-gradient-victory hover:scale-105 transition-transform text-primary-foreground">
                Create Your First Game
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}