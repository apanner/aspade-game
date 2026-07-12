"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { gameAPI, sessionStorage } from "@/lib/api"
import { navigateToGame } from "@/lib/navigate-to-game"

type JoinGameFormProps = {
  presetCode?: string
}

export function JoinGameForm({ presetCode }: JoinGameFormProps) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { toast } = useToast()
  const [code, setCode] = useState(presetCode ?? "")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  const handleJoin = async () => {
    if (!user?.name) return
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode) {
      toast({ title: "Enter game code", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const result = await gameAPI.joinGame(trimmedCode, user.name)
      await sessionStorage.savePlayerSession(result.game.id, result.playerId, user.name)
      toast({ title: "Joined!", description: "Entering lobby…" })
      navigateToGame(result.game.id)
    } catch (err) {
      toast({
        title: "Could not join",
        description: err instanceof Error ? err.message : "Check code and try again",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <div className="felt-page flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-team-us" />
      </div>
    )
  }

  return (
    <div className="felt-page min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-md space-y-5">
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl glass-panel">
            <LogIn className="w-7 h-7 text-team-us" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Join Game</h1>
            <p className="text-sm text-muted-foreground">Playing as {user.name}</p>
          </div>
        </div>

        <Card className="glass-panel border-white/10 bg-transparent">
          <CardHeader>
            <CardTitle>Enter code</CardTitle>
            <CardDescription>Tables support 2–12 players — join with your host&apos;s code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Game code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="h-14 bg-black/30 border-white/10 font-mono text-2xl tracking-[0.3em] text-center uppercase"
                placeholder="ABCD"
                maxLength={8}
                autoFocus
              />
            </div>
            <Button
              className="btn-pill-primary w-full h-14 text-base"
              onClick={handleJoin}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Take a seat"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
