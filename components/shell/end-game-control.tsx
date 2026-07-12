"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, OctagonX } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { useToast } from "@/hooks/use-toast"
import { gameAPI, sessionStorage } from "@/lib/api"
import { cn } from "@/lib/utils"

type EndGameControlProps = {
  gameId: string
  playerId: string
  isHost: boolean
  variant?: "button" | "icon" | "destructive" | "ghost"
  className?: string
  onEnded?: () => void
}

export function EndGameControl({
  gameId,
  playerId,
  isHost,
  variant = "button",
  className,
  onEnded,
}: EndGameControlProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [ending, setEnding] = useState(false)

  const handleLeave = async () => {
    setEnding(true)
    try {
      await sessionStorage.clearPlayerSession()
      onEnded?.()
      router.push("/dashboard")
    } catch {
      router.push("/dashboard")
    } finally {
      setEnding(false)
      setOpen(false)
    }
  }

  const handleEndGame = async () => {
    setEnding(true)
    try {
      await gameAPI.cancelGame(gameId, playerId)
      await sessionStorage.clearPlayerSession()
      toast({ title: "Game ended", description: "This table is closed for everyone." })
      onEnded?.()
      router.push("/dashboard")
    } catch (err) {
      toast({
        title: "Could not end game",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setEnding(false)
      setOpen(false)
    }
  }

  const title = isHost ? "End this game?" : "Leave this table?"
  const description = isHost
    ? "This closes the table for all players. Scores are saved but no one can keep playing. This cannot be undone."
    : "You will leave the table. The game continues for other players."

  const confirmLabel = isHost ? "End game" : "Leave table"
  const onConfirm = isHost ? handleEndGame : handleLeave

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        aria-label={isHost ? "End game" : "Leave table"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-destructive/20 hover:border-destructive/40 hover:text-destructive transition-colors",
          className
        )}
      >
        <OctagonX className="w-4 h-4" />
      </button>
    ) : variant === "ghost" ? (
      <Button variant="ghost" size="sm" className={cn("text-muted-foreground", className)}>
        <OctagonX className="w-4 h-4 mr-2" />
        End game
      </Button>
    ) : variant === "destructive" ? (
      <Button variant="destructive" className={cn("w-full", className)} disabled={ending}>
        <OctagonX className="w-4 h-4 mr-2" />
        End game
      </Button>
    ) : (
      <Button variant="outline" className={cn("border-white/10", className)} disabled={ending}>
        <OctagonX className="w-4 h-4 mr-2" />
        End game
      </Button>
    )

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="border-white/10 bg-[#0a0f1a] text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={ending} className="border-white/10">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={ending}
            onClick={(e) => {
              e.preventDefault()
              void onConfirm()
            }}
            className={isHost ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {ending ? "Please wait…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Compact leave link for non-host players on lobby screens */
export function LeaveTableButton({ className }: { className?: string }) {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const handleLeave = async () => {
    setLeaving(true)
    try {
      await sessionStorage.clearPlayerSession()
    } finally {
      router.push("/dashboard")
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("text-muted-foreground", className)}
      disabled={leaving}
      onClick={() => void handleLeave()}
    >
      <LogOut className="w-4 h-4 mr-2" />
      {leaving ? "Leaving…" : "Leave table"}
    </Button>
  )
}
