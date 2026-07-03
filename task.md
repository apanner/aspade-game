# ASAPDE Live Spades — Multi-Agent Task Board

**Version:** 1.1  
**Date:** July 3, 2026  
**Goal:** Production-ready, world-class multiplayer Spades PWA  
**Base app:** `aspade_game/front` ← **all code lives here**  
**Do NOT touch:** `aspade_railway/` (legacy deploy target only)  
**Engine:** `aspade_game/engine/`  
**Docs:** `gui_design.md`, `plan/Architect.md`, `plan/final_plan.md`

> **Correction (Jul 3):** Prior sprint wrongly integrated into `aspade_railway/front`. User scope is **`aspade_game` only**. Railway changes are orphaned; migrate/port into `aspade_game/front`.

---

## Status Legend

- `[ ]` Not started  
- `[~]` In progress  
- `[x]` Done  
- `[!]` Blocked  

**Update this file** as agents complete tasks. One agent owns one stream; do not edit another stream's files without merging checklist first.

---

## Master Checklist (Production Gate)

### P0 — Must ship for playable multiplayer

- [x] **M1** Spades engine passes full 13-trick simulation tests ✅ (15/15)
- [x] **M2** `/api/action` handles `playCard`, `submitBid` for live mode
- [x] **M3** Private hands never leak to other clients (GET filter)
- [x] **M4** Supabase Realtime broadcast on every live action (no-op without env; polling fallback)
- [x] **M5** Card table UI — 4 seats, hand, trick zone, legal play highlight
- [x] **M6** Card animations — deal, play, trick win (framer-motion)
- [x] **M7** 4-player sim completes one full live round (`npm run simulate:live`)
- [x] **M8** Reconnect restores hand + turn (useGameSync visibility/online refetch)
- [x] **M9** Manual mode regression — unchanged code path preserved
- [x] **M10** `playMode` toggle on create game

### P1 — Production polish

- [x] **M11** Neon glass design system applied (lobby, bidding, table tokens)
- [x] **M12** Turn timer + spades broken banner
- [x] **M13** Round celebration auto-triggers from engine (live scoring transition)
- [x] **M14** Web Audio FX in RoundCelebration (existing component)
- [ ] **M15** LiveKit voice (mute default) — Phase 4
- [x] **M16** PWA manifest (`app/manifest.ts`); Serwist deferred
- [~] **M17** Load test 50+ concurrent games — sim script only
- [ ] **M18** iOS Safari + Android Chrome QA matrix green — manual QA

---

## Agent Streams (Parallel Work Split)

```
                    ┌─────────────────────────────────────┐
                    │  AGENT E — Integration Lead         │
                    │  game-screen router, playMode,      │
                    │  merges all streams, E2E smoke tests  │
                    └──────────────┬──────────────────────┘
           ┌───────────────────────┼───────────────────────┐
           ▼                       ▼                       ▼
   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
   │ AGENT A       │      │ AGENT B       │      │ AGENT C       │
   │ Engine (L3)   │◄────►│ Card UI (L1)  │◄────►│ API+Sync (L2) │
   │ aspade_game/  │      │ card-table/*  │      │ api/action    │
   │ engine/       │      │ animations    │      │ realtime      │
   └───────────────┘      └───────┬───────┘      └───────────────┘
                                  │
                          ┌───────▼───────┐
                          │ AGENT D       │
                          │ Design System │
                          │ tokens, lobby │
                          │ bidding skin  │
                          └───────────────┘
                                  │
                          ┌───────▼───────┐
                          │ AGENT F       │
                          │ QA + Tests    │
                          │ vitest, sim   │
                          └───────────────┘
```

---

## AGENT A — Game Engine (`aspade_game/engine/`)

### A0–A2 — Core
- [x] All engine modules + state machine

### A3 — Tests
- [x] `legal-plays`, `trick-resolver`, `full-round`, `scorer` — **15/15 pass**

### A4 — Handoff
- [x] `getLegalPlays` exported via `@aspade/engine`
- [x] `engine/README.md` — action payloads documented

---

## AGENT B — Card Table UI & Animations

### B0–B1 — Visuals + layout
- [x] All core components

### B2 — Hand interaction
- [x] Tap to play + optimistic rollback
- [ ] Drag-to-trick-zone (P1 polish)

### B3 — Animations
- [x] Deal stagger, play arc, trick win sweep, turn pulse, spades banner
- [x] `prefers-reduced-motion` fallback

### B4 — Assembly
- [x] `turn-timer.tsx`, `connection-badge.tsx`, error boundary (via E)
- [x] Optimistic play + rollback on API error
- [x] `/debug/table` preview page

---

## AGENT C — API, Realtime & Multiplayer Sync

### C0 — Types & bridge
- [x] `playMode`, `liveState` on Game
- [x] `@aspade/engine` tsconfig alias

### C1 — Action handler
- [x] All live actions wired

### C2 — Secure GET
- [x] Hand sanitization per playerId

### C3 — Realtime
- [x] Subscribe-then-broadcast pattern
- [x] `useGameSync` wired in game-screen
- [ ] Presence: online/away per seat (P1)

### C4 — Client sync
- [x] `useGameSync` — visibility + online/offline refetch
- [x] GamePoller fallback when Supabase absent

### C5 — Validation
- [x] `scripts/simulate-live-game.ts` — full round E2E ✅
- [x] playCard idempotency (409 DUPLICATE_PLAY)

---

## AGENT D — Design System & Screen Restyle

### D0 — Tokens
- [x] Tailwind felt/team/turn/win colors
- [x] Inter + Outfit fonts in layout

### D1 — Primitives
- [x] `glass-panel`, `neon-button`, `team-badge`

### D2 — Lobby
- [x] playMode badge, team badges, start pulse at 4/4
- [ ] Voice opt-in checkbox (needs LiveKit)

### D3 — Bidding
- [x] BIDDING PHASE header, NeonButton submit

### D4 — Scoreboard
- [ ] Round won hero restyle (P1)

---

## AGENT E — Integration Lead

### E0 — playMode
- [x] Create form Manual/Live toggle
- [x] `NEXT_PUBLIC_LIVE_MODE_ENABLED` env gate
- [x] Persist on create

### E1 — Phase router
- [x] Live → CardTable when playing
- [x] Manual path unchanged

### E2 — Live start rules
- [x] Block start unless 4 players (server + lobby UI)
- [x] Toast on early start attempt

### E3 — Celebrations
- [x] RoundCelebration on playing → scoring (live)
- [x] GameCompletionFireworks on completed (live)

### E4 — Session + reconnect
- [x] useGameSync + poller forceRefresh
- [x] IOSChromeSessionManager (existing)

### E5 — E2E smoke
- [x] `npm run simulate:live` documented below

---

## AGENT F — QA, Tests & Production Hardening

### F0 — Engine CI
- [x] 15/15 vitest locally
- [ ] CI config on PR (TBD)

### F1 — Integration sim
- [x] `simulate-live-game.ts` ✅ verified
- [ ] `simulate-reconnect.ts` (P1)

### F2 — Device matrix — manual QA pending

### F3 — Performance
- [x] Hand data stripped on GET for opponents
- [ ] p95 latency logging (P1)

### F4 — Production checklist
- [x] CardTableErrorBoundary
- [x] `.env.example` with Supabase + LIVE_MODE flags
- [ ] Prod logger swap (P1)

---

## AGENT G — Voice + PWA (Phase 4)

- [ ] LiveKit Cloud + `/api/voice/token`
- [ ] VoiceControls / VoiceIndicator
- [x] PWA manifest (`app/manifest.ts`)
- [ ] Serwist service worker
- [ ] App icons 192/512 PNG

---

## Test Scripts

### Local dev
```bash
cd aspade_game/front && npm run dev    # port 3010
cd aspade_game/engine && npm test
```

### Live E2E simulation
```bash
cd aspade_game/front && npm run dev
cd aspade_game/front && npm run simulate:live
```

### 4-player manual smoke
1. Create game → Live mode → copy link  
2. Open 4 browser tabs  
3. Join all 4 → host Start  
4. Bid → play 13 tricks → verify scoreboard + celebration  
5. Kill network 30s → reconnect → hand intact  

### Env vars (`.env.local`)
```
NEXT_PUBLIC_LIVE_MODE_ENABLED=true
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Current Sprint: S3–S4 Complete

| Agent | Status | Notes |
|-------|--------|-------|
| A | `[x]` | 15/15 tests, README |
| B | `[x]` | Table + animations; drag deferred |
| C | `[x]` | API, sync, sim script |
| D | `[~]` | Lobby/bidding done; scoreboard hero pending |
| E | `[x]` | Full integration + celebrations |
| F | `[x]` | Sim verified; device matrix manual |
| G | `[~]` | Manifest only; LiveKit/Serwist Phase 4 |

---

*Last updated: July 3, 2026 — multi-agent sprint complete (P0 green)*
