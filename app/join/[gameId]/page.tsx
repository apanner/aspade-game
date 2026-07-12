import { JoinGameForm } from "@/components/shell/join-game-form"

type JoinByIdPageProps = {
  params: Promise<{ gameId: string }>
}

export default async function JoinByIdPage({ params }: JoinByIdPageProps) {
  const { gameId } = await params
  return <JoinGameForm presetCode={gameId} />
}
