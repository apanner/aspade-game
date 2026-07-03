"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, TrendingUp, Target, Award, BarChart3, Clock, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface GameStatisticsProps {
  playerName: string
  stats: {
    totalGames: number
    winRate: number
    bestScore: number
    averageScore: number
    gamesWon: number
    gamesLost: number
    currentStreak?: number
    longestStreak?: number
    bidAccuracy?: number
    averageGameDuration?: number
  }
}

export function GameStatistics({ playerName, stats }: GameStatisticsProps) {
  const winRateColor = stats.winRate >= 60 ? 'text-green-400' : stats.winRate >= 40 ? 'text-yellow-400' : 'text-red-400'
  const streakColor = (stats.currentStreak || 0) > 0 ? 'text-green-400' : 'text-slate-400'

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Performance Overview
          </CardTitle>
          <CardDescription>Your game statistics and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Total Games */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-slate-400">Games Played</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{stats.totalGames}</div>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-xs text-slate-400">Win Rate</span>
              </div>
              <div className={`text-2xl font-bold ${winRateColor}`}>{stats.winRate}%</div>
            </div>

            {/* Best Score */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-400">Best Score</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{stats.bestScore}</div>
            </div>

            {/* Average Score */}
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-slate-400">Avg Score</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{stats.averageScore}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Win/Loss Breakdown */}
      <Card className="bg-slate-800/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-lg">Win/Loss Record</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 rounded-full p-3">
                <Trophy className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.gamesWon}</div>
                <div className="text-xs text-slate-400">Wins</div>
              </div>
            </div>
            <div className="text-slate-500">vs</div>
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 rounded-full p-3">
                <Trophy className="h-5 w-5 text-red-400 rotate-180" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{stats.gamesLost}</div>
                <div className="text-xs text-slate-400">Losses</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streaks & Advanced Stats */}
      {(stats.currentStreak !== undefined || stats.longestStreak !== undefined || stats.bidAccuracy !== undefined) && (
        <Card className="bg-slate-800/80 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg">Advanced Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.currentStreak !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm text-slate-300">Current Streak</span>
                </div>
                <Badge variant={stats.currentStreak > 0 ? "default" : "secondary"} className={streakColor}>
                  {stats.currentStreak > 0 ? '+' : ''}{stats.currentStreak}
                </Badge>
              </div>
            )}

            {stats.longestStreak !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-slate-300">Longest Streak</span>
                </div>
                <Badge variant="outline" className="text-amber-400">
                  {stats.longestStreak}
                </Badge>
              </div>
            )}

            {stats.bidAccuracy !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-slate-300">Bid Accuracy</span>
                </div>
                <Badge variant="outline" className="text-blue-400">
                  {stats.bidAccuracy}%
                </Badge>
              </div>
            )}

            {stats.averageGameDuration !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-slate-300">Avg Game Duration</span>
                </div>
                <Badge variant="outline" className="text-purple-400">
                  {Math.round(stats.averageGameDuration / 60)} min
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

