"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Mic, MicOff, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGameVoice } from "@/components/voice/game-voice-provider"

/** Floating mic prompt — overlays the table, never steals layout space. */
export function MicPermissionFloater() {
  const {
    micPromptVisible,
    micPermission,
    micPermissionHint,
    isRequestingMicPermission,
    requestMicPermission,
    dismissMicPrompt,
  } = useGameVoice()

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!micPromptVisible) return

    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }

    dismissTimerRef.current = setTimeout(() => {
      dismissMicPrompt()
    }, 7000)

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [dismissMicPrompt, micPromptVisible])

  const isDenied = micPermission === "denied"

  return (
    <AnimatePresence>
      {micPromptVisible && (
        <motion.div
          key="mic-prompt"
          initial={{ opacity: 0, y: -16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-auto mx-auto w-full max-w-[300px]"
          role="alertdialog"
          aria-label="Microphone permission"
        >
          <div
            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
              isDenied
                ? "border-team-them/35 bg-[#1a1010]/92"
                : "border-team-us/35 bg-[#0a1418]/92"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isDenied ? "bg-team-them/15 text-team-them" : "bg-team-us/15 text-team-us"
              }`}
            >
              {isDenied ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white leading-tight">
                {isDenied ? "Mic blocked" : "Voice needs mic access"}
              </p>
              <p className="text-[10px] text-white/55 leading-snug mt-0.5">
                {micPermissionHint || (isDenied ? "Allow in browser settings" : "Tap allow when prompted")}
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold bg-team-us text-black hover:bg-team-us/90"
              disabled={isRequestingMicPermission}
              onClick={() => {
                void unlockVoiceAudio()
                void requestMicPermission()
              }}
            >
              {isRequestingMicPermission ? "…" : "Allow"}
            </Button>

            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white/70"
              onClick={dismissMicPrompt}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
