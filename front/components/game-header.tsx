"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Copy, Users, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useState } from "react"

type User = {
  id: string
  name: string
  email: string
}

type GameData = {
  id: string
  title: string
  hostId: string
  hostName: string
  status: string
  currentRound: number
  totalRounds: number
  players: Record<string, any>
}

export function GameHeader({
  gameData,
  user,
  isHost,
}: {
  gameData: GameData
  user: User
  isHost: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const playerCount = Object.keys(gameData.players || {}).length

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameData.id)
    setCopied(true)
    toast({
      title: "Game Code Copied",
      description: "Share this code with your friends to join",
      duration: 2000,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusBadge = () => {
    switch (gameData.status) {
      case "lobby":
        return (
          <Badge variant="outline" className="border-casino-subtle text-casino-primary">
            Lobby
          </Badge>
        )
      case "bidding":
        return (
          <Badge className="bg-casino-accent text-accent-foreground">
            Bidding • Round {gameData.currentRound}
          </Badge>
        )
      case "playing":
        return (
          <Badge className="bg-casino-primary text-primary-foreground">
            Playing • Round {gameData.currentRound}
          </Badge>
        )
      case "scoring":
        return (
          <Badge className="bg-casino-accent text-accent-foreground">
            Scoring • Round {gameData.currentRound}
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="secondary" className="bg-secondary/60">
            Completed
          </Badge>
        )
      default:
        return (
          <Badge className="bg-casino-primary text-primary-foreground">
            Round {gameData.currentRound}/{gameData.totalRounds}
          </Badge>
        )
    }
  }

  return (
    <Card className="bg-casino-surface shadow-casino-card border-casino-subtle transition-casino">
      <div className="p-3">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          <Link href="/dashboard">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-accent-hover transition-casino transform-casino-hover"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          {/* Game Title and Code */}
          <div className="flex flex-col items-center space-y-1">
            <h1 className="text-lg font-semibold text-casino-primary">
              {gameData.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Game Code: {gameData.id}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-accent-hover transition-casino transform-casino-hover" 
                onClick={copyGameCode}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Status and Player Count */}
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full">
              <Users className="h-3 w-3" />
              <span className="font-medium">{playerCount}/4</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
} 