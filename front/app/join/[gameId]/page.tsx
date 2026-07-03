"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { sessionStorage } from "@/lib/api"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MiniLoginModal } from "@/components/mini-login-modal"

export default function JoinGameDirectPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  const [loading, setLoading] = useState(true)
  const [showMiniLogin, setShowMiniLogin] = useState(false)
  const [gameExists, setGameExists] = useState(false)

  useEffect(() => {
    const checkGameAndSession = async () => {
      try {
        // First check if the game exists
        const gameResponse = await fetch(`/api/games/${gameId}`)
        if (!gameResponse.ok) {
          console.error('Game not found:', gameId)
          router.push('/join-game?error=game-not-found')
          return
        }
        
        setGameExists(true)
        
        // Check if user has a session
        const session = await sessionStorage.getPlayerSession()
        
        if (!session) {
          // No session - show mini login
          console.log('No session found, showing mini login')
          setShowMiniLogin(true)
          setLoading(false)
          return
        }

        // Check if session is for this game
        if (session.gameId === gameId) {
          // User is already in this game - redirect to game
          console.log('User already in this game, redirecting')
          router.push(`/games/${gameId}`)
          return
        }

        // Check if user can join this game with existing name
        try {
          const joinResponse = await fetch('/api/join', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: gameId,
              playerName: session.playerName,
            }),
          })

          if (joinResponse.ok) {
            const joinData = await joinResponse.json()
            // Update session for this game
            await sessionStorage.savePlayerSession(gameId, joinData.playerId, session.playerName)
            router.push(`/games/${gameId}`)
            return
          }
        } catch (error) {
          console.warn('Failed to join with existing name:', error)
        }

        // If we get here, show mini login
        setShowMiniLogin(true)
        setLoading(false)
      } catch (error) {
        console.error('Error checking game:', error)
        router.push('/join-game?error=connection-error')
      }
    }

    if (gameId) {
      checkGameAndSession()
    }
  }, [gameId, router])

  const handleMiniLoginSuccess = (playerName: string) => {
    console.log('Mini login successful, redirecting to game')
    router.push(`/games/${gameId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Checking game...</p>
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
