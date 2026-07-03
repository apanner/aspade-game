"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { sessionStorage } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MiniLoginModal } from "@/components/mini-login-modal"
import { useToast } from "@/hooks/use-toast"

// Helper function to check for persistent login session
const getPersistentPlayerId = (): string | null => {
  if (typeof window !== 'undefined') {
    // Check localStorage for persistent login (from main login page)
    return localStorage.getItem('player_id') || localStorage.getItem('user_id')
  }
  return null
}

export default function QuickJoinPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const gameId = params.gameId as string
  const [loading, setLoading] = useState(true)
  const [showMiniLogin, setShowMiniLogin] = useState(false)
  const [gameExists, setGameExists] = useState(false)
  const [gameDetails, setGameDetails] = useState<any>(null)

  useEffect(() => {
    const checkGameAndSession = async () => {
      try {
        // First check if the game exists
        const gameResponse = await fetch(`/api/game/${gameId}`)
        if (!gameResponse.ok) {
          console.error('Game not found:', gameId)
          toast({
            title: "Game Not Found",
            description: "The game you are trying to join does not exist or has ended.",
            variant: "destructive",
          })
          router.push('/join-game?error=game-not-found')
          return
        }
        
        const gameData = await gameResponse.json()
        setGameDetails(gameData.game) // Use data.game since the API returns { game: ... }
        setGameExists(true)
        
        // --- Enhanced Session Management Logic ---
        
        // 1. Check for persistent login session first
        const persistentPlayerId = getPersistentPlayerId()
        if (persistentPlayerId) {
          console.log('✅ Persistent session found, attempting to join game directly:', persistentPlayerId)
          try {
            // First, get the player name from the persistent session
            const playerName = localStorage.getItem('player_name') || localStorage.getItem('user_name')
            
            if (playerName) {
              const joinResponse = await fetch('/api/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  code: gameId,
                  playerName: playerName,
                }),
              })

              if (joinResponse.ok) {
                const joinData = await joinResponse.json()
                // Successfully joined with persistent session
                await sessionStorage.savePlayerSession(gameId, joinData.playerId, playerName)
                console.log('✅ Joined with persistent session as:', playerName)
                router.push(`/games/${gameId}`)
                return
              } else {
                console.warn('⚠️ Failed to join with persistent session, falling back to mini-login')
                // If joining with persistent session fails, fall back to mini-login
                setShowMiniLogin(true)
                setLoading(false)
                return
              }
            } else {
              console.warn('⚠️ Persistent session found but no player name, falling back to mini-login')
              setShowMiniLogin(true)
              setLoading(false)
              return
            }
          } catch (error) {
            console.error('❌ Error joining with persistent session:', error)
            setShowMiniLogin(true)
            setLoading(false)
            return
          }
        }

        // 2. No persistent session, check for temporary game session
        const tempSession = await sessionStorage.getPlayerSession()
        
        if (tempSession && tempSession.gameId === gameId && tempSession.playerId) {
          console.log('✅ Existing temporary session for this game found, continuing:', tempSession.playerId)
          // Attempt to re-join with existing temporary session
          try {
            const joinResponse = await fetch('/api/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code: gameId,
                playerId: tempSession.playerId,
              }),
            })

            if (joinResponse.ok) {
              console.log('✅ Re-joined with existing temporary session')
              router.push(`/games/${gameId}`)
              return
            } else {
              console.warn('⚠️ Failed to re-join with existing temporary session, clearing and showing mini-login')
              await sessionStorage.clearPlayerSession() // Clear invalid session
              setShowMiniLogin(true)
              setLoading(false)
              return
            }
          } catch (error) {
            console.error('❌ Error re-joining with existing temporary session:', error)
            await sessionStorage.clearPlayerSession() // Clear session on error
            setShowMiniLogin(true)
            setLoading(false)
            return
          }
        } else if (tempSession && tempSession.gameId !== gameId) {
          console.log('🔄 Existing temporary session for a DIFFERENT game, clearing and showing mini-login.')
          await sessionStorage.clearPlayerSession() // Clear session for a different game
          setShowMiniLogin(true)
          setLoading(false)
          return
        } else if (tempSession && !tempSession.playerId) {
          console.log('🔄 Existing temporary session is incomplete, clearing and showing mini-login.')
          await sessionStorage.clearPlayerSession() // Clear incomplete session
          setShowMiniLogin(true)
          setLoading(false)
          return
        }

        // 3. No session at all (persistent or valid temporary), show mini-login
        console.log('🤷 No valid session found, showing mini-login modal.')
        setShowMiniLogin(true)
        setLoading(false)

      } catch (error) {
        console.error('Error checking game:', error)
        toast({
          title: "Connection Error",
          description: "Failed to connect to the game. Please try again.",
          variant: "destructive",
        })
        router.push('/join-game?error=connection-error')
      }
    }

    if (gameId) {
      checkGameAndSession()
    }
  }, [gameId, router, toast])

  const handleMiniLoginSuccess = (playerName: string) => {
    console.log('✅ Mini login successful for:', playerName)
    // MiniLoginModal already handles setting the session and joining the game
    // We just need to redirect to the game page
    router.push(`/games/${gameId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Joining game...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mini Login Modal */}
      <MiniLoginModal
        gameId={gameId}
        onLoginSuccess={handleMiniLoginSuccess}
        isVisible={showMiniLogin}
      />
    </div>
  )
}
