import { LiveGameLoader } from "@/components/game/live-game-loader"

type GamePageProps = {
  params: Promise<{ gameId: string }>
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params
  return <LiveGameLoader gameId={gameId} />
}
