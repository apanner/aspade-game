"use client"

import { GameScreen } from "@/components/game-screen"
import { useParams } from "next/navigation"

export default function GamePage() {
  const params = useParams()
  const gameId = params.gameId as string
  
  return <GameScreen gameId={gameId} />
} 