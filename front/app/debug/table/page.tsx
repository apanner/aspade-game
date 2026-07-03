"use client"

import { useState } from "react"
import { CardTable } from "@/components/card-table/card-table"
import type { CardCode } from "@/components/card-table/card-utils"

const MOCK_HAND: CardCode[] = ["AS", "KS", "QS", "2H", "5H", "9H", "AD", "KD", "3C", "7C", "JC", "10D", "4D"]
const LEGAL: CardCode[] = ["2H", "5H", "9H"]

export default function DebugTablePage() {
  const [hand, setHand] = useState(MOCK_HAND)
  const [plays, setPlays] = useState<Array<{ playerId: string; card: CardCode; seat: number }>>([
    { playerId: "p2", card: "AH", seat: 2 },
  ])

  const handlePlay = async (card: CardCode) => {
    setPlays((prev) => [...prev, { playerId: "p0", card, seat: 0 }])
    setHand((prev) => prev.filter((c) => c !== card))
  }

  return (
    <CardTable
      round={7}
      totalRounds={13}
      usScore={185}
      themScore={140}
      myPlayerId="p0"
      mySeat={0}
      myHand={hand}
      legalCards={LEGAL.filter((c) => hand.includes(c))}
      currentTurnId="p0"
      trickPlays={plays}
      spadesBroken={false}
      players={[
        { id: "p0", name: "You", seat: 0, bid: 4, books: 2, isPartner: false },
        { id: "p2", name: "Partner", seat: 2, bid: 3, books: 1, isPartner: true },
        { id: "p1", name: "Opp E", seat: 1, bid: 5, books: 2 },
        { id: "p3", name: "Opp W", seat: 3, bid: 4, books: 1 },
      ]}
      onPlayCard={handlePlay}
    />
  )
}
