"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { 
  ArrowLeft, 
  Trash2, 
  Users, 
  GamepadIcon,
  Search,
  RefreshCw,
  Crown,
  Calendar,
  Clock,
  Trophy,
  Settings,
  LogOut
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AdminStorageSettings } from "./admin-storage-settings"
import { ConnectionAdmin } from "./connection-admin"
import { StorageAdmin } from "./storage-admin"
import { useAuth } from "@/components/auth-provider"
import { getSmartBackendUrl } from "@/lib/backend-config"

type Player = {
  id: string
  name: string
  email?: string
  gamesPlayed: number
  lastSeen: string
  isOnline: boolean
  storageLocation?: string
}

type Game = {
  id: string
  title: string
  code: string
  host: string
  players: number
  status: "lobby" | "playing" | "completed"
  createdAt: string
  lastActivity: string
  storageLocation?: string
}

export function AdminPanel() {
  const { toast } = useToast()
  const router = useRouter()
  
  // Session timeout duration (5 minutes for better security)
  const SESSION_TIMEOUT_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
  
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set())
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set())
  const [searchPlayers, setSearchPlayers] = useState("")
  const [searchGames, setSearchGames] = useState("")
  const [activeTab, setActiveTab] = useState<"players" | "games" | "connection" | "storage">("games")
  const [refreshKey, setRefreshKey] = useState(0)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null)
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(SESSION_TIMEOUT_DURATION)
  const [isCheckingAuth, setIsCheckingAuth] = useState(false)
  const { user } = useAuth()

  // Check admin authentication on mount
  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      checkAdminAuth()
    }
  }, [isCheckingAuth])

  // Session timeout effect
  useEffect(() => {
    if (isAuthenticated) {
      resetSessionTimeout()
      
      // Add event listeners for user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      const handleActivity = () => resetSessionTimeout()
      
      events.forEach(event => {
        document.addEventListener(event, handleActivity)
      })
      
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity)
        })
        if (sessionTimeout) {
          clearTimeout(sessionTimeout)
        }
      }
    }
  }, [isAuthenticated])

  // Session countdown timer
  useEffect(() => {
    if (isAuthenticated && sessionTimeLeft > 0) {
      const countdown = setInterval(() => {
        setSessionTimeLeft(prev => {
          if (prev <= 1000) {
            clearInterval(countdown)
            return 0
          }
          return prev - 1000
        })
      }, 1000)

      return () => clearInterval(countdown)
    }
  }, [isAuthenticated, sessionTimeLeft])

  const resetSessionTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout)
    }
    
    setSessionTimeLeft(SESSION_TIMEOUT_DURATION)
    
    const timeout = setTimeout(() => {
      handleSessionTimeout()
    }, SESSION_TIMEOUT_DURATION)
    
    setSessionTimeout(timeout)
  }

  const formatTimeLeft = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = Math.floor((milliseconds % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getSessionStatusColor = (): string => {
    const minutesLeft = sessionTimeLeft / 60000
    if (minutesLeft <= 1) return 'text-red-400' // Red when 1 minute or less
    if (minutesLeft <= 2) return 'text-yellow-400' // Yellow when 2 minutes or less
    return 'text-green-400' // Green when more than 2 minutes
  }

  const handleSessionTimeout = () => {
    setIsAuthenticated(false)
    setPlayers([])
    setGames([])
    setSelectedPlayers(new Set())
    setSelectedGames(new Set())
    
    toast({
      title: "⏰ Session Expired",
      description: "Admin session expired after 5 minutes. Please log in again.",
      variant: "destructive",
    })
    
    // Clear admin token from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('admin_token')
    window.history.replaceState({}, '', url.toString())
    
    // Redirect to home page
    router.push('/')
  }

  const handleDeleteSelectedPlayers = async () => {
    try {
      const playerIds = Array.from(selectedPlayers)
      
      const response = await fetch('/api/admin/players', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerIds }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Refresh the players list
        await fetchData()
        setSelectedPlayers(new Set())
        
        toast({
          title: "✅ Players Deleted Successfully",
          description: result.message || `Deleted ${playerIds.length} player(s) and all related files`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete players')
      }
    } catch (error) {
      console.error('Delete players error:', error)
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to delete players",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSelectedGames = async () => {
    try {
      const gameIds = Array.from(selectedGames)
      
      const response = await fetch('/api/admin/games', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameIds }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Refresh the games list
        await fetchData()
        setSelectedGames(new Set())
        
        toast({
          title: "✅ Games Deleted Successfully",
          description: result.message || `Deleted ${gameIds.length} game(s) and all related files`,
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete games')
      }
    } catch (error) {
      console.error('Delete games error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete games", 
        variant: "destructive",
      })
    }
  }

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1)
    await fetchData()
  }

  const handleUpdateLeaderboards = async () => {
    try {
      setLoading(true)
      
      const backendUrl = await getSmartBackendUrl()
      const response = await fetch(`${backendUrl}/api/admin/update-leaderboards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to update leaderboards')
      }
      
      const result = await response.json()
      
      toast({
        title: "Leaderboards Updated",
        description: `Updated ${result.playerLeaderboard?.topPlayers?.length || 0} players and ${result.teamLeaderboard?.topTeams?.length || 0} teams`,
      })
      
    } catch (error) {
      console.error('Error updating leaderboards:', error)
      toast({
        title: "Error",
        description: "Failed to update leaderboards",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePlayerSelection = (playerId: string, checked: boolean) => {
    const newSelected = new Set(selectedPlayers)
    if (checked) {
      newSelected.add(playerId)
    } else {
      newSelected.delete(playerId)
    }
    setSelectedPlayers(newSelected)
  }

  const handleGameSelection = (gameId: string, checked: boolean) => {
    const newSelected = new Set(selectedGames)
    if (checked) {
      newSelected.add(gameId)
    } else {
      newSelected.delete(gameId)
    }
    setSelectedGames(newSelected)
  }

  const handleManualLogout = async () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout)
    }
    
    // Clear local state (no cookie-based session to clear)
    setIsAuthenticated(false)
    setPlayers([])
    setGames([])
    setSelectedPlayers(new Set())
    setSelectedGames(new Set())
    
    toast({
      title: "✅ Logged Out",
      description: "You have been logged out successfully. Redirecting to home page.",
      variant: "default",
    })
    
    // Redirect to home page
    router.push('/')
  }

  async function handleCleanStorage() {
    // First warning - basic confirmation
    if (!window.confirm('⚠️ WARNING: This will delete ALL game data including:\n\n• All games (games/ folder)\n• All player sessions (players/ folder)\n• All player profiles (player_profiles/ folder)\n• All game history (game_history/ folder)\n• All user data (users/ folder)\n• All team statistics (team_stats/ folder)\n• Leaderboard files (player_leaderboard.json, team_leaderboard.json)\n• Global history (game_history.json)\n\nThis action CANNOT be undone!\n\nDo you want to continue?')) {
      return
    }

    // Second confirmation - password required
    const password = prompt('🔐 ADMIN CONFIRMATION REQUIRED\n\nEnter admin password to confirm storage cleanup:')
    if (!password) {
      toast({
        title: "❌ Cancelled",
        description: "Storage cleanup cancelled - no password provided",
        variant: "destructive",
      })
      return
    }

    // Verify admin password
    try {
      const authRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (!authRes.ok) {
        toast({
          title: "❌ Access Denied",
          description: "Invalid admin password. Storage cleanup cancelled.",
          variant: "destructive",
        })
        return
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to verify admin password. Storage cleanup cancelled.",
        variant: "destructive",
      })
      return
    }

    // Final confirmation after password verification
    if (!window.confirm('🔐 PASSWORD VERIFIED\n\nFinal confirmation: Are you absolutely sure you want to delete ALL storage data?\n\nThis will:\n• Delete all games, players, and history\n• Reset all leaderboards\n• Clear all user sessions\n• Remove all team statistics\n\nThis action is PERMANENT and cannot be undone!\n\nType "DELETE ALL" to confirm:')) {
      toast({
        title: "❌ Cancelled",
        description: "Storage cleanup cancelled - final confirmation denied",
        variant: "destructive",
      })
      return
    }

    // Proceed with cleanup
    setIsCleaning(true)
    try {
      const res = await fetch('/api/admin/storage/cleanup', {
        method: 'POST',
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
      }
      
      const result = await res.json()
      toast({ 
        title: '🗑️ Storage Cleaned', 
        description: result.message || `Successfully deleted ${result.deleted} files. All data has been reset.`, 
        variant: 'default' 
      })
    } catch (err) {
      console.error('Cleanup error:', err)
      toast({ 
        title: '❌ Error', 
        description: err instanceof Error ? err.message : String(err), 
        variant: 'destructive' 
      })
    } finally {
      setIsCleaning(false)
    }
  }



  const checkAdminAuth = async () => {
    if (isCheckingAuth) return // Prevent multiple simultaneous auth checks
    
    setIsCheckingAuth(true)
    console.log('🔍 Admin panel: Starting authentication check (no cookie sessions)')
    
    // Always prompt for password - no cookie-based session checking
    console.log('🔍 Admin panel: Always requiring password authentication')
    const password = prompt('🔐 ADMIN AUTHENTICATION REQUIRED\n\nEnter admin password to access admin panel:')
    
    if (!password) {
      console.log('❌ Admin panel: No password provided')
      toast({ 
        title: '❌ Access Denied', 
        description: 'Admin password required. Redirecting to home page.', 
        variant: 'destructive' 
      })
      setIsCheckingAuth(false)
      router.push('/') // Redirect to home page
      return
    }
    
    // Attempt login with password
    try {
      console.log('🔍 Admin panel: Attempting login with password...')
      const loginRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })
      
      console.log('🔍 Admin panel: Login response:', { status: loginRes.status, ok: loginRes.ok })
      
      if (loginRes.ok) {
        console.log('✅ Admin panel: Login successful')
        setIsAuthenticated(true)
        await fetchData(true) // Force fetch since we just authenticated
        toast({ 
          title: '✅ Login Successful', 
          description: 'Welcome to Admin Panel. Session expires in 5 minutes.', 
          variant: 'default' 
        })
      } else {
        const errorData = await loginRes.json()
        console.log('❌ Admin panel: Login failed:', errorData)
        toast({ 
          title: '❌ Access Denied', 
          description: errorData.error || 'Invalid password. Redirecting to home page.', 
          variant: 'destructive' 
        })
        router.push('/') // Redirect to home page on failed login
      }
    } catch (error) {
      console.log('❌ Admin panel: Login error:', error)
      toast({ 
        title: '❌ Error', 
        description: 'Failed to authenticate. Redirecting to home page.', 
        variant: 'destructive' 
      })
      router.push('/') // Redirect to home page on error
    }
    
    setIsCheckingAuth(false)
  }

  // Fetch data from API
  const fetchData = async (forceFetch = false) => {
    if (!isAuthenticated && !forceFetch) {
      console.log('❌ fetchData: Not authenticated, skipping')
      return
    }
    
    console.log('🔍 fetchData: Starting to fetch admin data')
    
    try {
      setLoading(true)
      
      // Fetch games from API (no need to pass token, uses session cookie)
      console.log('🔍 fetchData: Fetching games...')
      const gamesResponse = await fetch('/api/admin/games')
      console.log('🔍 fetchData: Games response:', { status: gamesResponse.status, ok: gamesResponse.ok })
      
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json()
        console.log('✅ fetchData: Games loaded:', { count: gamesData.games?.length || 0 })
        const validGames = (gamesData.games || []).filter((game: Game) => game && game.id)
        setGames(validGames)
      } else {
        console.error('❌ fetchData: Failed to fetch games:', gamesResponse.status)
        setGames([])
      }
      
      // Fetch players from API (no need to pass token, uses session cookie)
      console.log('🔍 fetchData: Fetching players...')
      const playersResponse = await fetch('/api/admin/players')
      console.log('🔍 fetchData: Players response:', { status: playersResponse.status, ok: playersResponse.ok })
      
      if (playersResponse.ok) {
        const playersData = await playersResponse.json()
        console.log('✅ fetchData: Players loaded:', { count: playersData.players?.length || 0 })
        const validPlayers = (playersData.players || []).filter((player: Player) => player && player.id && player.name)
        setPlayers(validPlayers)
      } else {
        console.error('❌ fetchData: Failed to fetch players:', playersResponse.status)
        setPlayers([])
      }
      
    } catch (error) {
      console.error('❌ fetchData: Failed to fetch admin data:', error)
      setGames([])
      setPlayers([])
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = players.filter(player => {
    if (!player || !player.name) return false
    const playerName = player.name.toLowerCase()
    const searchTerm = searchPlayers.toLowerCase()
    const nameMatch = playerName.includes(searchTerm)
    const emailMatch = player.email && player.email.toLowerCase().includes(searchTerm)
    return nameMatch || emailMatch
  })

  const filteredGames = games.filter(game => {
    if (!game) return false
    const searchTerm = searchGames.toLowerCase()
    const titleMatch = game.title && game.title.toLowerCase().includes(searchTerm)
    const codeMatch = game.code && game.code.toLowerCase().includes(searchTerm)
    const hostMatch = game.host && game.host.toLowerCase().includes(searchTerm)
    return titleMatch || codeMatch || hostMatch
  })

  const getStatusBadge = (status: Game["status"]) => {
    switch (status) {
      case "lobby":
        return <Badge variant="secondary">Lobby</Badge>
      case "playing":
        return <Badge className="bg-gradient-team-blue text-white">Playing</Badge>
      case "completed":
        return <Badge className="bg-gradient-team-green text-white">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStorageLocationBadge = (location?: string) => {
    if (!location) return <Badge variant="outline">Unknown</Badge>
    
    switch (location.toLowerCase()) {
      case 's3':
      case 'supabase':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">S3/Supabase</Badge>
      case 'local':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Local</Badge>
      case 'google_drive':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Google Drive</Badge>
      case 'ftp':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">FTP</Badge>
      default:
        return <Badge variant="outline">{location}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center gap-2 text-amber-400">
          <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full"></div>
          <span className="text-lg">Loading admin panel...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-start justify-center">
      <div key={`admin-${refreshKey}-${games.length}-${players.length}`} className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 rounded-lg shadow-2xl border border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-1 text-slate-300 hover:text-amber-400 hover:bg-slate-700/50">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Session expires in:</span>
                  <span className={`${getSessionStatusColor()} font-mono font-bold`}>
                    {formatTimeLeft(sessionTimeLeft)}
                  </span>
                </div>
              )}
              {isAuthenticated && (
                <Button 
                  onClick={handleManualLogout} 
                  variant="outline" 
                  size="sm" 
                  className="gap-1 bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              )}
              <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-1 bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-600/50">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                onClick={handleUpdateLeaderboards} 
                variant="outline" 
                size="sm" 
                className="gap-1 bg-amber-600/20 border-amber-500/50 text-amber-300 hover:bg-amber-600/30"
              >
                <Trophy className="h-4 w-4" />
                Update Leaderboards
              </Button>
            </div>
          </div>
          <div className="mt-3 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Crown className="h-6 w-6 text-amber-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Admin Panel
              </h1>
            </div>
            <p className="text-xs text-amber-400/90 font-medium">A-SPADE ONLINE MANAGEMENT</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{players.length}</div>
              <div className="text-sm text-slate-400">Total Players</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <GamepadIcon className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{games.length}</div>
              <div className="text-sm text-slate-400">Total Games</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Trophy className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{players.filter(p => p.isOnline).length}</div>
              <div className="text-sm text-slate-400">Online Now</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg w-fit border border-slate-700/50">
          <Button
            variant={activeTab === "games" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("games")}
            className={`gap-1 ${activeTab === "games" ? "bg-amber-500 text-white" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
          >
            <GamepadIcon className="h-4 w-4" />
            Games
          </Button>
          <Button
            variant={activeTab === "players" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("players")}
            className={`gap-1 ${activeTab === "players" ? "bg-amber-500 text-white" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
          >
            <Users className="h-4 w-4" />
            Players
          </Button>
          <Button
            variant={activeTab === "connection" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("connection")}
            className={`gap-1 ${activeTab === "connection" ? "bg-amber-500 text-white" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
          >
            <RefreshCw className="h-4 w-4" />
            Connection
          </Button>
          <Button
            variant={activeTab === "storage" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("storage")}
            className={`gap-1 ${activeTab === "storage" ? "bg-amber-500 text-white" : "text-slate-300 hover:text-white hover:bg-slate-700/50"}`}
          >
            <Settings className="h-4 w-4" />
            Storage
          </Button>
        </div>

        {/* Games Tab */}
        {activeTab === "games" && (
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <GamepadIcon className="h-5 w-5 text-amber-400" />
                    Games Management
                  </CardTitle>
                  <CardDescription className="text-slate-400">Manage game history and active games</CardDescription>
                </div>
              <div className="flex items-center gap-2">
                {selectedGames.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1">
                        <Trash2 className="h-4 w-4" />
                        Delete ({selectedGames.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Games</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedGames.size} game(s)? This will permanently remove their data files and cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelectedGames}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search games..."
                value={searchGames}
                onChange={(e) => setSearchGames(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedGames.size === filteredGames.length && filteredGames.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGames(new Set(filteredGames.map(g => g.id)))
                        } else {
                          setSelectedGames(new Set())
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedGames.has(game.id)}
                        onCheckedChange={(checked) => handleGameSelection(game.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{game.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{game.code}</Badge>
                    </TableCell>
                    <TableCell>{game.host}</TableCell>
                    <TableCell>{game.players}</TableCell>
                    <TableCell>{getStatusBadge(game.status)}</TableCell>
                    <TableCell>{getStorageLocationBadge(game.storageLocation)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {game.createdAt}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {game.lastActivity}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredGames.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No games found matching your search.
              </div>
            )}
          </CardContent>
        </Card>
      )}

        {/* Players Tab */}
        {activeTab === "players" && (
          <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="h-5 w-5 text-amber-400" />
                    Players Management
                  </CardTitle>
                  <CardDescription className="text-slate-400">Manage player accounts and data</CardDescription>
                </div>
              <div className="flex items-center gap-2">
                {selectedPlayers.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1">
                        <Trash2 className="h-4 w-4" />
                        Delete ({selectedPlayers.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Players</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedPlayers.size} player(s)? This will permanently remove their accounts and game history.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteSelectedPlayers}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                value={searchPlayers}
                onChange={(e) => setSearchPlayers(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPlayers.size === filteredPlayers.length && filteredPlayers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPlayers(new Set(filteredPlayers.map(p => p.id)))
                        } else {
                          setSelectedPlayers(new Set())
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Games Played</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlayers.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedPlayers.has(player.id)}
                        onCheckedChange={(checked) => handlePlayerSelection(player.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {player.isOnline && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                        {player.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{player.email}</TableCell>
                    <TableCell>{player.gamesPlayed}</TableCell>
                    <TableCell>
                      <Badge variant={player.isOnline ? "default" : "secondary"}>
                        {player.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStorageLocationBadge(player.storageLocation)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{player.lastSeen}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredPlayers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No players found matching your search.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection Tab */}
      {activeTab === "connection" && (
        <div className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm rounded-lg p-6">
          <ConnectionAdmin />
        </div>
      )}

      {/* Storage Tab */}
      {activeTab === "storage" && (
        <div className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm rounded-lg p-6">
          <div className="space-y-6">
            <StorageAdmin />
            <div className="border-t border-slate-700/50 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Legacy Storage Settings</h3>
              <AdminStorageSettings />
            </div>
            {/* Only show to admin users */}
            {/* TODO: Restrict to admin users only if/when user roles are implemented */}
            <section className="mt-8 border-t border-slate-700/50 pt-6">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                    <span className="text-red-400 text-lg">⚠️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
                    <p className="text-sm text-red-300">Complete storage cleanup - irreversible action</p>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-red-300 mb-2">Complete S3 Storage Cleanup - This will delete ALL:</h3>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>🎮 <strong>S3 Games folder</strong> (games/) - All game data files</li>
                    <li>👥 <strong>S3 Players folder</strong> (players/) - All player sessions</li>
                    <li>📋 <strong>S3 Player Profiles folder</strong> (player_profiles/) - User profiles</li>
                    <li>📚 <strong>S3 Game History folder</strong> (game_history/) - Individual histories</li>
                    <li>👤 <strong>S3 Users folder</strong> (users/) - User account data</li>
                    <li>📊 <strong>S3 Team Stats folder</strong> (team_stats/) - Team statistics</li>
                    <li>🔧 <strong>S3 Sessions folder</strong> (sessions/) - Active sessions</li>
                    <li>🧪 <strong>S3 Test folder</strong> (test/) - Test files</li>
                    <li>📁 <strong>S3 Profiles folder</strong> (profiles/) - Profile backups</li>
                    <li>💾 <strong>S3 Backups folder</strong> (backups/) - Backup files</li>
                    <li>🏆 <strong>S3 Leaderboard files</strong> - Global rankings</li>
                    <li>🗂️ <strong>Local serv/ directory</strong> - All cached files</li>
                    <li>📂 <strong>Local reference files</strong> - Cached data copies</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-300">
                    <strong>⚠️ WARNING:</strong> This action requires admin password verification and cannot be undone. 
                    This performs a complete S3 storage cleanup, removing ALL game files from S3 bucket and local cache.
                    All players will need to create new accounts. This will affect all existing game data permanently.
                  </p>
                  <div className="mt-2 p-2 bg-amber-900/30 rounded border border-amber-500/30">
                    <p className="text-xs text-amber-200">
                      📊 <strong>Total storage areas cleaned:</strong> 13 different folders/files across S3 and local storage
                    </p>
                  </div>
                </div>
                
                <button
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2"
                  onClick={handleCleanStorage}
                  disabled={isCleaning}
                  aria-label="Clean up all storage with password confirmation"
                >
                  {isCleaning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Cleaning Storage...
                    </>
                  ) : (
                    <>
                      <span>🗑️</span>
                      Clean Up Storage
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
      </div>
    </div>
  )
} 