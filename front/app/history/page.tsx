"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GameHistoryCard } from "@/components/game-history-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import apiService from "@/lib/api-service"
import { 
  History, 
  Trophy, 
  Users, 
  Calendar, 
  TrendingUp, 
  Target, 
  Clock,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Eye,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { GameDetailModal } from "@/components/game-detail-modal"

interface GameHistory {
  gameId: string
  gameCode: string
  title: string
  hostName: string
  completedAt: number
  formattedDate: string
  duration: number
  totalRounds: number
  playerScore: number
  isWinner: boolean
  winners: string[]
  winnerName: string
  gameMode: string
  playerCount: number
  allPlayersScores: Array<{
    playerId: string
    name: string
    totalScore: number
    team: string | null
    isWinner: boolean
    isComputer: boolean
  }>
  rounds: Array<{
    round: number
    bid: number
    tricks: number
    score: number
    status: string
  }>
  fullRoundScores: Record<string, Record<string, number>>
}

interface PlayerStats {
  totalGames: number
  gamesWon: number
  winRate: number
  averageScore: number
  bestScore: number
  totalRounds: number
  currentStreak: number
  longestStreak: number
  bidAccuracy: number
  lastGameAt?: number
}

export default function HistoryPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("recent")
  const [selectedGame, setSelectedGame] = useState<GameHistory | null>(null)
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user?.name) {
      loadHistory()
    }
  }, [user?.name])

  const loadHistory = async () => {
    if (!user?.name) return
    try {
      setLoading(true)
      // Call the frontend API route directly instead of using apiService
      const response = await fetch(`/api/players/history/${encodeURIComponent(user.name)}`)
      if (!response.ok) {
        if (response.status === 404) {
          // No games yet, treat as empty state
          setGameHistory([])
          setPlayerStats(null)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setGameHistory(data.games || [])
      setPlayerStats(data.stats || null)
      
      // Auto-expand the latest game
      if (data.games && data.games.length > 0) {
        setExpandedGames(new Set([data.games[0].gameId]))
      }
    } catch (error) {
      console.error('Failed to load history', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to load game history. Please check your connection and try again."
      toast({
        title: "Failed to Load History",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadHistory()
    setRefreshing(false)
  }

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev)
      if (newSet.has(gameId)) {
        newSet.delete(gameId)
      } else {
        newSet.add(gameId)
      }
      return newSet
    })
  }

  const getRecentGames = () => gameHistory
  const getWinningGames = () => gameHistory.filter(game => game.isWinner)
  const getLosingGames = () => gameHistory.filter(game => !game.isWinner)

  const renderGameCard = (game: GameHistory, index: number, isLatest: boolean = false) => {
    const isExpanded = expandedGames.has(game.gameId)
    
    if (isExpanded || isLatest) {
      // Show full card with collapse option
      return (
        <Card 
          key={game.gameId} 
          className="bg-slate-800/80 border-slate-700/50 shadow-xl backdrop-blur-sm rounded-xl"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Trophy className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <h3 className="font-semibold text-white truncate text-sm sm:text-base">{game.title}</h3>
                <Badge 
                  variant={game.isWinner ? "default" : "secondary"}
                  className={`flex-shrink-0 text-xs ${game.isWinner ? "bg-amber-500 text-white" : "bg-slate-600 text-slate-300"}`}
                >
                  {game.isWinner ? "Winner" : "Runner-up"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleGameExpansion(game.gameId)}
                className="text-slate-400 hover:text-white p-1 flex-shrink-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2 text-sm text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate">{game.formattedDate}</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{game.playerCount} Players</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{game.totalRounds} Rounds</span>
                <span className="hidden sm:inline">•</span>
                <span className="truncate">{game.gameMode}</span>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <div className="text-right">
                  <div className={`text-sm sm:text-lg font-bold ${game.isWinner ? 'text-amber-400' : 'text-slate-400'}`}>
                    {game.isWinner ? '+' : ''}{game.playerScore}
                  </div>
                  <div className="text-xs text-slate-500">points</div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs sm:text-sm"
                  onClick={() => setSelectedGame(game)}
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View Details</span>
                  <span className="sm:hidden">Details</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    } else {
      // Show collapsed single line
      return (
        <Card 
          key={game.gameId} 
          className="bg-slate-800/80 border-slate-700/50 shadow-xl backdrop-blur-sm rounded-xl cursor-pointer hover:bg-slate-700/80 transition-all duration-300"
          onClick={() => toggleGameExpansion(game.gameId)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                  <Trophy className="h-4 w-4 text-amber-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white truncate text-sm sm:text-base">{game.title}</h3>
                    <Badge 
                      variant={game.isWinner ? "default" : "secondary"}
                      className={`flex-shrink-0 text-xs ${game.isWinner ? "bg-amber-500 text-white" : "bg-slate-600 text-slate-300"}`}
                    >
                      {game.isWinner ? "Winner" : "Runner-up"}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400 mt-1">
                    <span className="truncate">{game.formattedDate}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">{game.playerCount}P</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">{game.totalRounds}R</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="truncate">{game.gameMode}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <div className={`text-sm sm:text-lg font-bold ${game.isWinner ? 'text-amber-400' : 'text-slate-400'}`}>
                    {game.isWinner ? '+' : ''}{game.playerScore}
                  </div>
                  <div className="text-xs text-slate-500">pts</div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white p-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedGame(game)
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-sm">
        {/* Game Logo and Title */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-3 md:p-4 rounded-lg shadow-2xl border border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <div className="bg-amber-500/20 rounded-full p-2 md:p-2.5 border-2 border-amber-500/30">
              <History className="h-8 w-8 md:h-10 md:w-10 text-amber-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">A-SPADE Online</h1>
              <p className="text-xs text-amber-400/90 font-medium">Where Every Bid Counts</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="no-underline">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <History className="h-6 w-6" />
                Game History
              </h1>
              <p className="text-slate-400 text-sm">Your spades journey</p>
            </div>
          </div>
          
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {refreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {/* Player Stats - Mobile Optimized */}
        {playerStats && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-amber-400">{playerStats.totalGames}</div>
                  <div className="text-xs sm:text-sm text-slate-300">Total Games</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-400">{playerStats.gamesWon}</div>
                  <div className="text-xs sm:text-sm text-slate-300">Games Won</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-400">{(playerStats.winRate * 100).toFixed(1)}%</div>
                  <div className="text-xs sm:text-sm text-slate-300">Win Rate</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm rounded-xl sm:rounded-2xl">
              <CardContent className="p-3 sm:p-4">
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-400">{playerStats.averageScore.toFixed(1)}</div>
                  <div className="text-xs sm:text-sm text-slate-300">Avg Score</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Game History Tabs - Mobile Optimized */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700/50 rounded-xl sm:rounded-2xl p-1">
            <TabsTrigger 
              value="recent" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-xs sm:text-sm font-semibold py-2 sm:py-3 rounded-lg sm:rounded-xl"
            >
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Recent
            </TabsTrigger>
            <TabsTrigger 
              value="wins" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-xs sm:text-sm font-semibold py-2 sm:py-3 rounded-lg sm:rounded-xl"
            >
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Wins
            </TabsTrigger>
            <TabsTrigger 
              value="losses" 
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-xs sm:text-sm font-semibold py-2 sm:py-3 rounded-lg sm:rounded-xl"
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Losses
            </TabsTrigger>
          </TabsList>
          
          {/* Recent Games - Mobile Optimized */}
          <TabsContent value="recent" className="space-y-4 mt-6">
            {getRecentGames().length > 0 ? (
              getRecentGames().map((game, index) => 
                renderGameCard(game, index, index === 0)
              )
            ) : (
              <div className="text-center py-12">
                <History className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">No games yet</h3>
                <p className="text-sm text-slate-400">Play your first game to see history here!</p>
              </div>
            )}
          </TabsContent>
          
          {/* Winning Games - Mobile Optimized */}
          <TabsContent value="wins" className="space-y-4 mt-6">
            {getWinningGames().length > 0 ? (
              getWinningGames().map((game, index) => 
                renderGameCard(game, index, index === 0)
              )
            ) : (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">No wins yet</h3>
                <p className="text-sm text-slate-400">Win your first game to see it here!</p>
              </div>
            )}
          </TabsContent>
          
          {/* Losing Games - Mobile Optimized */}
          <TabsContent value="losses" className="space-y-4 mt-6">
            {getLosingGames().length > 0 ? (
              getLosingGames().map((game, index) => 
                renderGameCard(game, index, index === 0)
              )
            ) : (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">No losses yet</h3>
                <p className="text-sm text-slate-400">Keep up the winning streak!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Game Detail Modal */}
        {selectedGame && (
          <GameDetailModal
            game={selectedGame}
            onClose={() => setSelectedGame(null)}
            currentPlayerName={user?.name || ''}
          />
        )}
      </div>
    </div>
  )
} 