# ASAPDE Game — Implementation Plan (ChatGPT)

**Document:** Engineering execution plan  
**Date:** July 3, 2026  
**Inputs:** `asapde_game_prd.md`, `fullgame_plan.md`, `aspade_railway/front`, `design/*`  
**Companion:** `architect_plan_gemini.md` (architecture deep-dive)

---

## 1. Plan Summary

Build **live multiplayer Spades** by **extending the existing mobile score-tracker** (`aspade_railway/front`), not rewriting it. New game-engine code lives in `aspade_game/engine/` and is imported into the Next.js app once stable.

**Two play modes from day one:**

| Mode | Who uses it | UI path |
|------|-------------|---------|
| **Manual** | Physical cards + digital scoring | Existing screens (unchanged) |
| **Live** | Full online play | New card table + engine |

**Recommended base repo:** `aspade_railway/front` (most complete mobile implementation)  
**Sandbox for new code:** `aspade_game/` (engine, table components, hooks)  
**Deploy target:** Railway (existing) → PWA install later

---

## 2. Key Decisions (Defaults)

Resolve open PRD questions with these defaults so work can start immediately:

| Question | Decision | Rationale |
|----------|----------|-----------|
| Monorepo vs greenfield | **Evolve `aspade_railway/front` in place** | 90% of mobile parity already built |
| Backend shape | **Next.js API routes + server-side engine** | Matches serverless/Railway setup; no Go split in v1 |
| Realtime | **Supabase Realtime broadcast + HTTP polling fallback** | Already in `package.json`; keep `GamePoller` as safety net |
| Live player count | **Require 4 players to start live mode** | Standard Spades; manual mode stays 2+ |
| Sandbags | **Defer to v1.1** | Ship standard 10×bid scoring first |
| Nil / blind nil | **Regular nil in v1.1; blind nil v2** | Reduces engine complexity for MVP |
| Turn timer auto-play | **Host opt-in, default off** | Avoid surprise plays |
| Voice | **LiveKit, P1 after playable table** | Table + sync is the critical path |
| Design source | **`aspade_game/design/*.png`** | Lobby, table, bidding, scoreboard mockups |

---

## 3. What We Reuse vs Build New

### Reuse as-is (copy or import from `aspade_railway/front`)

```
components/
  game-lobby.tsx          game-screen.tsx         bidding-screen.tsx
  trick-tracking-screen.tsx   leaderboard-screen.tsx   round-celebration.tsx
  game-completion-fireworks.tsx   mobile-game-wrapper.tsx   mini-login-modal.tsx
  create-game-form.tsx    join-game-form.tsx      dashboard.tsx
  auth-provider.tsx       floating-score-button.tsx

lib/
  api.ts                  game-utils.ts           mobile-utils.ts
  session handling        scoring helpers         team leader logic

app/api/
  create, join, action, game/[gameId], session/*, players/*
```

### Build new

```
aspade_game/
├── engine/               # Pure TS, no React — unit-testable
├── components/table/     # Card table UI
├── hooks/                # useGameSync, useAudioFX
└── lib/realtime.ts       # Supabase channel wrapper

aspade_railway/front/ (additions)
├── app/api/voice/token/route.ts
├── components/card-table/     # re-export or move from aspade_game
└── playMode toggle in create-game-form
```

---

## 4. Architecture (One Page)

```
┌─────────────────────────────────────────────────────────────┐
│  Mobile PWA Client (Next.js)                                │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Manual flow │  │ Live table   │  │ GamePoller fallback │ │
│  │ (existing)  │  │ (new)        │  │ (existing)          │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                      │             │
│         └────────────────┼──────────────────────┘             │
│                          │ POST /api/action                   │
│                          │ GET  /api/game/[id]                │
│                          │ subscribe game:{id}                 │
└──────────────────────────┼──────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js API Routes                                          │
│  action handler → SpadesEngine.apply(action) → save game JSON  │
│                → supabase.channel.broadcast(event)           │
└──────────────────────────┬───────────────────────────────────┘
                           ▼
              Storage (S3/FTP/local) + Supabase Realtime
```

**Rule:** Clients never shuffle, deal, or validate plays. They send intent; server returns truth.

---

## 5. Design Alignment

Reference mockups in `aspade_game/design/`:

| Asset | Screen | Implementation target |
|-------|--------|----------------------|
| `spades_dashboard_*.png` | Dashboard | Existing `dashboard.tsx` — minor polish only |
| `spades_game_lobby_*.png` | Lobby | Existing `game-lobby.tsx` + presence dots |
| `spades_bidding_*.png` | Bidding | Reuse `bidding-screen.tsx`; live mode auto-advance |
| `spades_card_table_*.png` | Live play | **New** `CardTable` — primary build |
| `spades_scoreboard_*.png` | Scoring | Existing `leaderboard-screen.tsx` |

**Mobile layout rules (from Gemini plan + existing wrapper):**

- Use `100dvh`, not `100vh`
- `env(safe-area-inset-*)` on game shell
- `touch-action: manipulation`; 44px min tap targets
- Bottom = player hand; top = partner; sides = opponents
- Web Audio unlock on first user tap (lobby Start or table touch)

---

## 6. Engine Module Spec (`aspade_game/engine/`)

Build as **pure functions + state machine** with zero Next.js imports.

### 6.1 Files

| File | Responsibility |
|------|----------------|
| `types.ts` | `Card`, `Suit`, `Rank`, `Trick`, `LiveState`, `EngineAction` |
| `deck.ts` | Create 52-card deck, Fisher-Yates shuffle |
| `deal.ts` | Assign 13 cards per seat; rotate dealer |
| `legal-plays.ts` | Follow suit, spades broken, lead restrictions |
| `trick-resolver.ts` | Winner from 4 cards; spade trump logic |
| `bidding.ts` | Validate bids; team aggregation |
| `scorer.ts` | Round score from bids + tricks won |
| `state-machine.ts` | `apply(state, action) → { state, events }` |
| `index.ts` | Public `SpadesEngine` class |
| `__tests__/` | Full 4-player simulated rounds |

### 6.2 Card encoding

Use compact strings: `"AS"` (Ace Spades), `"10D"`, `"KH"`. Suits: `S H D C`.

### 6.3 Engine actions (server accepts)

```typescript
type EngineAction =
  | { type: 'START_LIVE_GAME' }
  | { type: 'SUBMIT_BID'; playerId: string; bid: number }
  | { type: 'PLAY_CARD'; playerId: string; card: string }
  | { type: 'ADVANCE_PHASE' }          // host only, manual transitions
```

### 6.4 Definition of done — Engine

- [ ] 100% unit test coverage on `legal-plays` and `trick-resolver`
- [ ] Simulated 13-trick round completes without error
- [ ] Invalid plays throw typed errors (turn, suit, spades lead)
- [ ] Team bid totals match mobile scoring output

---

## 7. API Integration Plan

### 7.1 Extend `Game` type (`lib/game-utils.ts`)

Add:

```typescript
playMode: 'live' | 'manual'   // default 'manual'
liveState?: LiveState        // only when playMode === 'live'
```

### 7.2 Extend `/api/action` handler

| Action | Manual today | Live (new) |
|--------|--------------|------------|
| `startGame` | → bidding | If live: deal + bidding |
| `submitBid` | ✓ | Engine validates |
| `submitTricks` | ✓ | N/A in live |
| `playCard` | — | **New** — engine validates |
| `approveTricks` | ✓ | Skipped in live |

### 7.3 Extend `GET /api/game/[gameId]`

- Accept `playerId` query param
- Strip other players' hands from `liveState.hands`
- Return only requesting player's 13 cards

### 7.4 Broadcast after every successful action

```typescript
await supabase.channel(`game:${gameId}`).send({
  type: 'broadcast',
  event: 'GAME_EVENT',
  payload: { type: 'CARD_PLAYED', playerId, card, trickComplete?, winnerId? }
})
```

### 7.5 Client hook: `useGameSync(gameId, playerId)`

1. Subscribe Supabase channel on mount
2. On event → merge into local `game` state (or trigger refetch)
3. On disconnect → existing `GamePoller` takes over
4. On reconnect → full snapshot fetch

---

## 8. UI Build Plan — Card Table

### 8.1 Component tree

```
CardTable
├── TableLayout          # 4 seats, dvh shell, safe areas
│   ├── SeatNorth        # partner (top)
│   ├── SeatWest / SeatEast
│   └── SeatSouth        # self (bottom)
├── TrickZone            # 4 cards center, framer-motion enter
├── PlayerHand           # horizontal scroll fan, sorted S>H>D>C, rank
│   └── PlayingCard      # tap + double-tap play; illegal = opacity 40%
├── TableHUD             # round, scores, turn arrow, spades broken badge
├── VoiceControls        # Phase 4 — mute button in header slot
└── ConnectionBadge      # reuse game-screen pattern
```

### 8.2 `game-screen.tsx` routing change

```typescript
if (game.playMode === 'live' && game.status === 'playing') {
  return <CardTable game={game} currentPlayerId={currentPlayerId} onGameAction={handleAction} />
}
// existing manual screens unchanged
```

### 8.3 Interactions

| Gesture | Behavior |
|---------|----------|
| Single tap legal card | Play immediately |
| Double tap | Play (accessibility alt) |
| Drag to center | Play if legal on release |
| Illegal card tap | Shake animation + toast |

### 8.4 Definition of done — Card Table

- [ ] 4-player live round playable on iPhone Safari
- [ ] Cards sync across devices within 500ms p95
- [ ] Hand persists after tab background + return
- [ ] Matches `spades_card_table_*.png` layout intent

---

## 9. Phased Execution (14 Weeks)

### Phase 0 — Foundation (Week 1–2)

**Goal:** Manual mode untouched; scaffolding ready.

| Task | Owner | Output |
|------|-------|--------|
| Add `playMode` to create form + game JSON | FE | Toggle in UI, default manual |
| Copy shared types into `aspade_game/engine/types.ts` | BE | Shared interfaces |
| Supabase project + env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) | DevOps | `.env.example` updated |
| Realtime POC: broadcast ping/pong in lobby | BE | Console proof |
| PWA manifest stub + icons | FE | Installable shell |
| Port `MobileGameWrapper` patterns to table shell | FE | `TableLayout` empty state |

**Exit criteria:** Create manual game works as before; live game creates with `playMode: 'live'` but shows "Coming soon" in lobby.

---

### Phase 1 — Engine (Week 3–5)

**Goal:** Server can run a full round headlessly.

| Week | Tasks |
|------|-------|
| 3 | `deck.ts`, `deal.ts`, `types.ts`; seat assignment on start |
| 4 | `legal-plays.ts`, `trick-resolver.ts`, `bidding.ts` |
| 5 | `scorer.ts`, `state-machine.ts`, wire into `/api/action`; Jest/Vitest suite |

**Exit criteria:** POST `playCard` × 52 deals completes round; scores match manual calculator; 20+ unit tests green.

---

### Phase 2 — Card Table + Sync (Week 6–8)

**Goal:** Two phones can play one live round.

| Week | Tasks |
|------|-------|
| 6 | `PlayingCard`, `PlayerHand`, card SVG assets |
| 7 | `TrickZone`, `TableLayout`, `CardTable`; wire `playCard` action |
| 8 | `useGameSync` hook; optimistic play + rollback; turn indicator |

**Exit criteria:** 4-browser test completes 13 tricks; reconnect restores hand.

---

### Phase 3 — Mobile Parity + Polish (Week 9–10)

**Goal:** Live mode feels as polished as manual mode.

| Task | Notes |
|------|-------|
| Auto-populate tricks/scores from engine → leaderboard | Remove manual trick entry in live |
| Round celebration triggers from engine round end | Reuse existing component |
| Sound FX (shuffle, play, win) | Web Audio unlock in lobby |
| framer-motion deal + trick animations | ≤ 400ms |
| iOS Chrome session + live state recovery | Extend `ios-chrome-session-manager` |
| Appendix A regression pass for manual mode | No regressions |

**Exit criteria:** Full 13-round live game with celebrations; manual checklist 100% pass.

---

### Phase 4 — Voice + PWA (Week 11–12)

| Task | Notes |
|------|-------|
| LiveKit Cloud project | Free tier |
| `/api/voice/token` | JWT scoped to `gameId` room |
| `VoiceControls` mute/unmute | Default muted |
| `@serwist/next` service worker | Cache card assets |
| Install prompt on dashboard | After 2nd visit |

**Exit criteria:** 4 players voice chat during live game; Lighthouse PWA ≥ 90.

---

### Phase 5 — Beta + Launch (Week 13–14)

| Task | Notes |
|------|-------|
| Load test 50–100 concurrent games | k6 or Artillery |
| iOS Safari + Android Chrome bug bash | Real devices |
| Analytics: `live_game_started`, `round_completed`, `disconnect_recovery` | Simple event log |
| Soft launch to existing users | Feature flag `LIVE_MODE_ENABLED` |

**Exit criteria:** KPI baselines captured; zero P0 bugs; launch checklist signed.

---

## 10. Testing Strategy

### 10.1 Engine (automated)

```
aspade_game/engine/__tests__/
  legal-plays.test.ts      # follow suit, spades broken edge cases
  trick-resolver.test.ts   # trump vs lead suit
  full-round.test.ts       # 4 players, 13 tricks, deterministic seed
  scoring.test.ts          # bid made/missed, team totals
```

### 10.2 Integration

- Script: `scripts/simulate-live-game.ts` — 4 fake players POST actions via API
- CI: run engine tests on every PR

### 10.3 Manual QA matrix

| Device | Browser | Live | Manual |
|--------|---------|------|--------|
| iPhone 14+ | Safari | ✓ | ✓ |
| iPhone | Chrome | ✓ | ✓ |
| Android | Chrome | ✓ | ✓ |
| Desktop | Chrome | ✓ | ✓ |

**Critical paths:**

1. Quick join → lobby → live start → full round → scoreboard
2. Disconnect 30s mid-trick → reconnect → correct hand
3. Manual game full flow (existing)
4. Extend game after final round (both modes)

---

## 11. File Migration Path

Keep risk low by integrating in layers:

```
Step 1   aspade_game/engine/*           (standalone, tested)
Step 2   aspade_railway/front/lib/spades-engine.ts   (re-export engine)
Step 3   API action route calls engine
Step 4   aspade_game/components/table/*  → front/components/card-table/*
Step 5   game-screen.tsx branches on playMode
Step 6   Delete duplicate stubs; aspade_game becomes docs + engine source
```

---

## 12. Risk Register (Execution Focus)

| Risk | Early signal | Mitigation |
|------|--------------|------------|
| Supabase Realtime latency | > 1s card sync in dev | Polling fallback always on; delta + full snapshot |
| iOS audio blocked | No sound on first trick | Unlock context on lobby Start button |
| Hand leak to client | Other player's cards in network tab | Server-side filter on GET; code review gate |
| Scope creep | Building bots/tournaments | Strict phase gates; manual mode for 2-player |
| Merge conflicts with mobile fixes | Parallel edits to `game-screen.tsx` | Feature branch `feat/live-spades`; weekly merge from main |

---

## 13. Immediate Next Steps (This Week)

Ordered checklist to start Phase 0 tomorrow:

1. **Create branch** `feat/live-spades` from latest `aspade_railway/front`
2. **Scaffold** `aspade_game/engine/` with `types.ts`, `deck.ts`, empty tests
3. **Add** `playMode: 'manual' | 'live'` to create-game form (live disabled behind flag)
4. **Confirm** Supabase project; add env vars to Railway
5. **Spike** Realtime broadcast from `/api/action` after `startGame`
6. **Export** one card SVG + render in Storybook or `/debug` page

---

## 14. Success Gates Per Phase

| Phase | Gate | Demo |
|-------|------|------|
| 0 | Manual regression green | Create → bid → score manual game |
| 1 | Engine tests green | Terminal sim prints 13-trick scores |
| 2 | 2-device sync | Phone + laptop play one trick |
| 3 | Full live game | 4 humans, 13 rounds, fireworks |
| 4 | Voice + install | Home screen icon + muted voice room |
| 5 | Launch | 10 beta games/day for 1 week |

---

## 15. Out of Scope Reminder

Do not build in v1:

- Bot/AI players
- Video chat
- Native App Store binaries
- Tournament brackets
- Sandbag penalties (v1.1)
- In-app payments

---

*Plan author: ChatGPT / Cursor agent*  
*Review with: `asapde_game_prd.md` §13 roadmap, `architect_plan_gemini.md` §2–4*  
*Next action: Phase 0, Step 1 — create `feat/live-spades` branch and engine scaffold*
