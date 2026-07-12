"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MessageSquare, Send, Users, X } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useGameChat } from "@/components/chat/game-chat-provider"
import { cn } from "@/lib/utils"

type TablePlayer = {
  id: string
  name: string
}

type TableChatDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  myPlayerId: string
  players: TablePlayer[]
}

function shortenName(name: string, max = 10): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export function TableChatDrawer({
  open,
  onOpenChange,
  myPlayerId,
  players,
}: TableChatDrawerProps) {
  const { messages, sendMessage, markRead, openDmWith, setOpenDmWith } = useGameChat()
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("table")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openDmWith) {
      setActiveTab(openDmWith)
      onOpenChange(true)
    }
  }, [onOpenChange, openDmWith])

  useEffect(() => {
    if (open) {
      markRead()
    }
  }, [markRead, open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, activeTab, open])

  const tabs = useMemo(
    () => [
      { id: "table", label: "Table", icon: Users },
      ...players
        .filter((player) => player.id !== myPlayerId)
        .map((player) => ({ id: player.id, label: player.name, icon: MessageSquare })),
    ],
    [myPlayerId, players]
  )

  const visibleMessages = useMemo(() => {
    if (activeTab === "table") {
      return messages.filter((message) => message.to === "table")
    }
    return messages.filter(
      (message) =>
        (message.from === myPlayerId && message.to === activeTab) ||
        (message.from === activeTab && message.to === myPlayerId)
    )
  }, [activeTab, messages, myPlayerId])

  const handleSend = async () => {
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      await sendMessage(draft, activeTab)
      setDraft("")
    } finally {
      setSending(false)
    }
  }

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setOpenDmWith(null)
    }
  }

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "Chat"

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className={cn(
          "mobile-chat-sheet",
          "flex flex-col gap-0 p-0",
          "h-[min(38dvh,280px)] rounded-t-2xl border border-white/10 border-b-0",
          "bg-[#0a1018]/98 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.55)]",
          "pb-[env(safe-area-inset-bottom)]",
          "[&>button.absolute]:hidden"
        )}
      >
        <SheetHeader className="shrink-0 space-y-1 border-b border-white/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="font-display text-left text-base">Table chat</SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-full"
              onClick={() => handleClose(false)}
              aria-label="Close chat"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-left text-[11px] text-muted-foreground">
            To <span className="text-team-us font-medium">{activeLabel}</span>
          </p>
        </SheetHeader>

        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                activeTab === tab.id
                  ? "border-team-us/50 bg-team-us/15 text-team-us"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
              )}
            >
              {shortenName(tab.label)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5 space-y-1.5">
          {visibleMessages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">
              {activeTab === "table" ? "Message the table." : "Send a direct message."}
            </p>
          ) : (
            visibleMessages.map((message) => {
              const mine = message.from === myPlayerId
              return (
                <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] rounded-xl px-2.5 py-1.5 text-xs",
                      mine
                        ? "bg-team-us/20 border border-team-us/30 text-white"
                        : "bg-white/10 border border-white/10 text-white/90"
                    )}
                  >
                    {!mine && (
                      <p className="text-[9px] font-semibold text-team-us mb-0.5">
                        {shortenName(message.fromName, 14)}
                      </p>
                    )}
                    <p className="leading-snug break-words">{message.text}</p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-white/10 px-3 py-2 flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleSend()
              }
            }}
            placeholder={activeTab === "table" ? "Table message…" : "Direct message…"}
            className="h-9 rounded-full border-white/10 bg-black/40 text-sm"
            maxLength={500}
          />
          <Button
            type="button"
            className="h-9 w-9 shrink-0 rounded-full btn-pill-primary p-0"
            disabled={!draft.trim() || sending}
            onClick={() => void handleSend()}
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
