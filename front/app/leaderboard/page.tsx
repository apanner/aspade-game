"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Trophy, Users, User, Crown, Star, TrendingUp, Medal, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import apiService from "@/lib/api-service"

interface PlayerLeaderboardEntry {
  name: string
  gamesPlayed: number
  gamesWon: number
  winRate: number
  totalScore: number
  averageScore: number
  bestScore: number
  lastGame?: string
  lastActivity?: number
}

interface TeamLeaderboardEntry {
  name: string
  teamName?: string
  gamesPlayed: number
  gamesWon: number
  winRate: number
  totalScore: number
  averageScore: number
  bestScore: number
  players: string[]
  lastGame?: string
  lastActivity?: number
}

export default function LeaderboardPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"players" | "teams">("players")
  const [playerLeaderboard, setPlayerLeaderboard] = useState<PlayerLeaderboardEntry[]>([])
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)

  const fetchLeaderboards = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      console.log('🔄 Fetching leaderboard data...')
      
      // Fetch both player and team data from the optimized leaderboard API
      try {
        // Get player leaderboard
        const playerResponse = await apiService.getLeaderboard()
        console.log('📊 Player leaderboard response:', playerResponse)
        
        // Get team leaderboard
        const teamResponse = await apiService.getTeamsLeaderboard()
        console.log('📊 Team leaderboard response:', teamResponse)
        
        // Process player data (backend returns { leaderboard: leaderboard.topPlayers })
        const players = playerResponse.leaderboard || []
        const validatedPlayers = players.map((player: any) => ({
          ...player,
          gamesPlayed: player.gamesPlayed || 0,
          gamesWon: player.gamesWon || 0,
          winRate: player.winRate || 0,
          totalScore: player.totalScore || 0,
          averageScore: player.averageScore || 0,
          bestScore: player.bestScore || 0
        }))
        
        // Process team data (backend returns { teamLeaderboard: teamLeaderboard.topTeams })
        const teams = teamResponse.teamLeaderboard || []
        const validatedTeams = teams.map((team: any) => ({
          ...team,
          teamName: team.teamName || team.name,
          players: team.players || [],
          gamesPlayed: team.gamesPlayed || 0,
          gamesWon: team.gamesWon || 0,
          winRate: team.winRate || 0,
          totalScore: team.totalScore || 0,
          averageScore: team.averageScore || 0,
          bestScore: team.bestScore || 0
        }))
        
        console.log(`✅ Loaded ${validatedPlayers.length} players and ${validatedTeams.length} teams`)
        console.log('📊 Player data sample:', validatedPlayers.slice(0, 3))
        console.log('📊 Team data sample:', validatedTeams.slice(0, 3))
        
        // Set the data (already sorted by the API)
        setPlayerLeaderboard(validatedPlayers.slice(0, 10))
        setTeamLeaderboard(validatedTeams.slice(0, 10))
        
        // Store last updated time
        setLastUpdated(playerResponse.lastUpdated || teamResponse.lastUpdated || new Date().toISOString())
        
        // If no data and this is the initial load, try to trigger an update
        if (!isRefresh && validatedPlayers.length === 0 && validatedTeams.length === 0) {
          console.log('🔄 No leaderboard data found, triggering initial update...')
          setInitializing(true)
          try {
            await fetch('/api/leaderboard/update', { method: 'POST' })
            console.log('✅ Initial leaderboard update triggered')
            
            // Wait a moment and try to fetch again
            setTimeout(() => {
              setInitializing(false)
              fetchLeaderboards(true)
            }, 3000)
          } catch (error) {
            console.error('Failed to trigger initial leaderboard update:', error)
            setInitializing(false)
          }
        }
        
        if (isRefresh) {
          toast({
            title: "✅ Updated",
            description: `Leaderboard refreshed: ${validatedPlayers.length} players, ${validatedTeams.length} teams`,
            duration: 2000,
          })
        }
      } catch (err) {
        console.error('Failed to load leaderboard data:', err)
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace'
        })
        setError('Failed to load leaderboard data')
        setPlayerLeaderboard([])
        setTeamLeaderboard([])
        // Ensure loading state is cleared even on error
        if (isRefresh) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
        toast({
          title: "Error",
          description: "Failed to load leaderboard data",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error('Unexpected error in fetchLeaderboards:', err)
      setError('Failed to load leaderboard data')
      // Ensure loading state is cleared even on error
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
      toast({
        title: "Error",
        description: "Failed to load leaderboard data",
        variant: "destructive",
      })
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    // Load leaderboard data on mount
    fetchLeaderboards(false)
    
    // Fallback: if loading takes too long, force render
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ Loading timeout - forcing render')
        setLoading(false)
      }
    }, 10000) // 10 second timeout
    
    return () => clearTimeout(timeout)
  }, [])

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 2:
        return <Medal className="h-5 w-5 text-orange-500" />
      default:
        return <span className="text-muted-foreground font-bold">#{index + 1}</span>
    }
  }

  const getRankBadgeColor = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-500 text-white"
      case 1:
        return "bg-gray-400 text-white"
      case 2:
        return "bg-orange-500 text-white"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  // Add debugging
  console.log('🔍 Leaderboard page state:', { 
    loading, 
    refreshing, 
    initializing, 
    playerCount: playerLeaderboard.length, 
    teamCount: teamLeaderboard.length,
    activeTab,
    playerData: playerLeaderboard.slice(0, 2),
    teamData: teamLeaderboard.slice(0, 2)
  })

  if (loading || refreshing) {
    return <LoadingSpinner message={refreshing ? "Refreshing leaderboards..." : "Loading leaderboards..."} size="xl" fullScreen={true} showMessage={true} />
  }

  if (initializing) {
    return <LoadingSpinner message="Generating leaderboard data..." size="xl" fullScreen={true} showMessage={true} />
  }

  // Fallback: if we have data but still showing loading, force render
  if (playerLeaderboard.length > 0 || teamLeaderboard.length > 0) {
    console.log('✅ Forcing render with available data')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container max-w-md mx-auto p-4 space-y-4 md:space-y-6">
        {/* Game Logo and Title */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-3 md:p-4 rounded-lg shadow-2xl border border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <div className="bg-amber-500/20 rounded-full p-2 md:p-2.5 border-2 border-amber-500/30">
              <Trophy className="h-8 w-8 md:h-10 md:w-10 text-amber-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">A-SPADE Online</h1>
              <p className="text-xs text-amber-400/90 font-medium">Where Every Bid Counts</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-slate-800/50 p-3 rounded-lg shadow-xl border border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 hover:scale-105 transition-transform text-slate-300 hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={async () => {
                // Force clear any cached data and refresh
                setPlayerLeaderboard([])
                setTeamLeaderboard([])
                
                // First trigger a leaderboard update, then fetch fresh data
                try {
                  console.log('🔄 Triggering leaderboard update...')
                  await fetch('/api/admin/update-leaderboard', { method: 'POST' })
                  console.log('✅ Leaderboard update triggered')
                  
                  // Wait a moment for the update to complete, then fetch fresh data
                  setTimeout(() => {
                    fetchLeaderboards(true)
                  }, 1000)
                } catch (error) {
                  console.error('Failed to trigger leaderboard update:', error)
                  // Still try to fetch current data
                  fetchLeaderboards(true)
                }
              }}
              disabled={refreshing}
              className="gap-2 hover:scale-105 transition-transform text-slate-300 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Update & Refresh'}
            </Button>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Leaderboards
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Top 10 by highest scores
            </p>
            {lastUpdated && (
              <p className="text-xs text-slate-500 mt-1">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          console.log('🔄 Tab switching from', activeTab, 'to', value)
          setActiveTab(value as "players" | "teams")
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700/50 h-12">
            <TabsTrigger value="players" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-sm md:text-base">
              <User className="h-4 w-4 mr-1 md:mr-2" />
              Players
            </TabsTrigger>
            <TabsTrigger value="teams" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-sm md:text-base">
              <Users className="h-4 w-4 mr-1 md:mr-2" />
              Teams
            </TabsTrigger>
          </TabsList>
          {/* Players Leaderboard */}
          <TabsContent value="players" className="space-y-4">
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-slate-500 p-2 bg-slate-900/50 rounded">
                Debug: Players tab - {playerLeaderboard.length} players loaded
              </div>
            )}
            <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-base md:text-lg">
                  <Trophy className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                  Top Players
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs md:text-sm">
                  Ranked by highest scores (Top 10)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {playerLeaderboard.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <Trophy className="h-10 w-10 md:h-12 md:w-12 text-slate-600 mx-auto mb-3 md:mb-4" />
                    <p className="text-slate-400 text-sm">No player data available yet</p>
                    <p className="text-xs text-slate-500 mt-1">Play some games to see rankings!</p>
                    <Button 
                      onClick={() => fetchLeaderboards(true)}
                      className="mt-3 md:mt-4 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-y-2 md:gap-y-3">
                    {playerLeaderboard.map((player, index) => (
                      <div
                        key={player.name}
                        className={`flex items-center justify-between p-3 md:p-4 rounded-lg border transition-all duration-300 ${
                          index === 0 
                            ? 'bg-amber-500/20 border-amber-500/30 ring-1 ring-amber-500/30' 
                            : 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                            {getRankIcon(index)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                              <span className={`font-semibold ${index === 0 ? 'text-amber-400' : 'text-white'} text-sm md:text-lg truncate`}>
                                {player.name}
                              </span>
                              {index < 3 && (
                                <Badge className={`text-xs ${getRankBadgeColor(index)} flex-shrink-0`}>
                                  {index === 0 ? 'Champion' : index === 1 ? '2nd Place' : '3rd Place'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-400 mt-1">
                              <span>{player.gamesPlayed} games</span>
                              <span>{player.winRate.toFixed(1)}% win rate</span>
                              <span>Avg: {player.averageScore.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-lg md:text-xl font-bold text-amber-400">
                            {player.bestScore}
                          </div>
                          <div className="text-xs text-slate-400">
                            Total: {player.totalScore}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Teams Leaderboard */}
          <TabsContent value="teams" className="space-y-4">
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-slate-500 p-2 bg-slate-900/50 rounded">
                Debug: Teams tab - {teamLeaderboard.length} teams loaded
              </div>
            )}
            <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-base md:text-lg">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                  Top Teams
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs md:text-sm">
                  Ranked by highest scores (Top 10)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {teamLeaderboard.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <Users className="h-10 w-10 md:h-12 md:w-12 text-slate-600 mx-auto mb-3 md:mb-4" />
                    <p className="text-slate-400 text-sm">No team data available yet</p>
                    <p className="text-xs text-slate-500 mt-1">Play some team games to see rankings!</p>
                    <Button 
                      onClick={() => fetchLeaderboards(true)}
                      className="mt-3 md:mt-4 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-y-2 md:gap-y-3">
                    {teamLeaderboard.map((team, index) => (
                      <div
                        key={team.name}
                        className={`flex items-center justify-between p-3 md:p-4 rounded-lg border transition-all duration-300 ${
                          index === 0 
                            ? 'bg-amber-500/20 border-amber-500/30 ring-1 ring-amber-500/30' 
                            : 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                            {getRankIcon(index)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                              <span className={`font-semibold ${index === 0 ? 'text-amber-400' : 'text-white'} text-sm md:text-lg truncate`}>
                                {team.teamName || team.name}
                              </span>
                              {index < 3 && (
                                <Badge className={`text-xs ${getRankBadgeColor(index)} flex-shrink-0`}>
                                  {index === 0 ? 'Top Team' : index === 1 ? '2nd Place' : '3rd Place'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-400 mt-1">
                              <span>{team.gamesPlayed} games</span>
                              <span>{team.winRate.toFixed(1)}% win rate</span>
                              <span>Best Score: {team.bestScore}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-lg md:text-xl font-bold text-amber-400">
                            {team.bestScore}
                          </div>
                          <div className="text-xs text-slate-400">
                            Total: {team.totalScore}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Card className="bg-slate-800/80 border-slate-700/50">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-slate-400">Active Players</p>
                  <p className="text-lg md:text-xl font-bold text-white">{playerLeaderboard.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/80 border-slate-700/50">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-slate-400">Active Teams</p>
                  <p className="text-lg md:text-xl font-bold text-white">{teamLeaderboard.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 