"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Spade, Users, Play } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { GameCard } from "@/components/game-card"
import { useAuth } from "@/components/auth-provider"
import { getSmartBackendUrl } from "@/lib/backend-config"

type Game = {
  id: string
  title: string
  hostId: string
  hostName: string
  createdAt: number
  currentRound: number
  totalRounds: number
  players: Record<string, any>
  status?: string
}

export default function ActiveGamesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeGames, setActiveGames] = useState<Game[]>([])
  const [loadingGames, setLoadingGames] = useState(true)

  useEffect(() => {
    if (!user || loading) return

    const fetchActiveGames = async () => {
      try {
        setLoadingGames(true)
        // Call backend directly instead of frontend API
        const backendUrl = await getSmartBackendUrl();
        const response = await fetch(`${backendUrl}/api/players/${encodeURIComponent(user.name)}/dashboard`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch active games')
        }
        
        const data = await response.json()
        const filteredGames = (data.activeGames || []).filter(
          (game: Game) => game.status && game.status !== "completed" && game.status !== "cancelled"
        )
        
        // Use only the filtered active games from the backend
        
        setActiveGames(filteredGames)
      } catch (error) {
        console.error("Error fetching active games:", error)
        toast({
          title: "❌ Error",
          description: "Failed to load active games",
          variant: "destructive",
        })
      } finally {
        setLoadingGames(false)
      }
    }

    fetchActiveGames()
  }, [user, loading, toast])

  if (loading) {
    return <LoadingSpinner message="Loading..." size="xl" fullScreen={true} showMessage={true} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-md">
        {/* Game Logo and Title */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-3 md:p-4 rounded-lg shadow-2xl border border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <div className="bg-amber-500/20 rounded-full p-2 md:p-2.5 border-2 border-amber-500/30">
              <Spade className="h-8 w-8 md:h-10 md:w-10 text-amber-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">A-SPADE Online</h1>
              <p className="text-xs text-amber-400/90 font-medium">Where Every Bid Counts</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="hover:bg-slate-700/50 text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Active Games</h1>
            <p className="text-sm text-slate-400">Continue your ongoing games</p>
          </div>
        </div>

        {/* Active Games List */}
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Spade className="h-5 w-5 text-amber-400" />
              Your Active Games
              {activeGames.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400">
                  {activeGames.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Click on any game to continue playing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGames ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" message="Loading active games..." fullScreen={false} showMessage={true} />
              </div>
            ) : activeGames.length > 0 ? (
              <div className="space-y-4">
                {activeGames.map((game) => (
                  <GameCard key={game.id} game={game} currentPlayerId={user?.id} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-amber-500/10 rounded-full p-6 mb-4 mx-auto w-20 h-20 flex items-center justify-center">
                  <Spade className="h-8 w-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Active Games</h3>
                <p className="text-slate-400 text-sm mb-6">
                  You don't have any active games right now. Create a new game or join an existing one to get started!
                </p>
                <div className="space-y-3">
                  <Link href="/create-game" className="no-underline block">
                    <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                      <Play className="h-4 w-4 mr-2" />
                      Create New Game
                    </Button>
                  </Link>
                  <Link href="/join-game" className="no-underline block">
                    <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Users className="h-4 w-4 mr-2" />
                      Join Existing Game
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/create-game" className="no-underline">
            <div className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-2xl p-6 h-24 flex flex-col items-center justify-center gap-2 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 backdrop-blur-sm active:scale-95">
              <Play className="h-6 w-6 text-amber-400" />
              <span className="font-semibold text-sm text-white">Create Game</span>
            </div>
          </Link>
          <Link href="/join-game" className="no-underline">
            <div className="bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-2xl p-6 h-24 flex flex-col items-center justify-center gap-2 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 backdrop-blur-sm active:scale-95">
              <Users className="h-6 w-6 text-amber-400" />
              <span className="font-semibold text-sm text-white">Join Game</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
