# ASAPDE Game — Final Plan (Consolidated)

**Version:** 1.0  
**Date:** July 3, 2026  
**Status:** Approved for execution  
**Supersedes:** Individual plan drafts (merged below)  
**Companion docs:** `Architect.md`, `asapde_game_prd.md`

---

## 1. Document Lineage

This plan merges and resolves conflicts across all planning artifacts:

| Source | Focus | Kept / Dropped |
|--------|-------|----------------|
| `fullgame_plan.md` | High-level feasibility (5 pillars) | **Kept** pillar structure; expanded with detail |
| `asapde_game_prd.md` | Product requirements, dual mode, 14-week roadmap | **Kept** as product source of truth |
| `aspade_game_plan_chatgpt.md` | Execution tasks, reuse list, migration path | **Kept** as execution backbone |
| `architect_plan_gemini.md` | iOS PWA CSS, engine state machine, realtime protocol | **Kept** platform + sync details |
| `_gemini_prd.md` | Gemini PRD variant, mockup refs | **Merged** UX/visual items |

**Architecture detail lives in `Architect.md`.** This document is the **what, when, and why**.

---

## 2. Plan Comparison Matrix

### 2.1 Strategic Alignment (All Agree)

| Topic | Consensus |
|-------|-----------|
| Product goal | Score tracker → live multiplayer Spades PWA |
| Stack | Next.js, React, Tailwind, Supabase Realtime, LiveKit, Serwist |
| Authority model | Server-side engine; clients send intent only |
| Hardest problem | Reconnection + state sync |
| Voice | LiveKit (not raw WebRTC) |
| PWA | `@serwist/next`, standalone manifest |
| Mobile-first | Bottom = you, top = partner, sides = opponents |

### 2.2 Resolved Conflicts

| Topic | ChatGPT Plan | Gemini Architect | Gemini PRD | **Final Decision** |
|-------|--------------|------------------|------------|-------------------|
| Base codebase | `aspade_railway/front` | `asapde_vercel_v2` | Either | **`aspade_railway/front`** — most complete mobile app |
| Storage | S3/FTP/local JSON | PostgreSQL + S3 | PostgreSQL | **JSON file storage (existing)** for v1; optional Postgres mirror in v1.1 |
| API path | `/api/action` | `/api/games/[id]/action` | Both mentioned | **`/api/action`** (existing) + alias later if needed |
| Channel name | `game:${gameId}` | `game:${gameId}` | `room:${gameId}` | **`game:${gameId}`** |
| Manual mode | Explicit dual mode | Not emphasized | Fallback mode | **Dual mode P0** — manual unchanged |
| Phase count | 6 phases (0–5), 14 weeks | 4 phases | 5 phases in PRD | **6 phases, 14 weeks** (ChatGPT + PRD) |
| Live players | Require 4 | Implied 4 | Require 4 | **4 required for live start** |
| Nil / sandbags | Defer v1.1 | Not specified | Gemini recommends v1.1 | **Standard scoring v1; nil v1.1; sandbags v1.1** |
| Engine location | `aspade_game/engine/` | `aspade_game/engine/` | Same | **`aspade_game/engine/`** → import into front |
| Standalone live page | Branch in `game-screen` | `pages/games/[id]/live.tsx` | — | **Branch in `game-screen.tsx`** (less routing churn) |

### 2.3 Gaps Filled by Consolidation

| Gap in earlier docs | Final plan addition |
|---------------------|---------------------|
| No explicit plan comparison | Section 2 (this matrix) |
| Gemini: no manual regression gate | Phase 3 includes Appendix A checklist |
| ChatGPT: light on iOS CSS | Adopt Gemini viewport/audio rules in Architect |
| fullgame_plan: no weeks | 14-week schedule with exit criteria |
| PRD: open questions unresolved | Section 4 decision log |

---

## 3. Product Scope (Final)

### 3.1 In Scope — v1.0

- **Live mode:** 4-player server-authoritative Spades with virtual card table
- **Manual mode:** Existing score-tracker flow (zero regression)
- **Shared:** Lobby, teams, bidding UI, leaderboard, celebrations, extend game, history, dashboard, session recovery
- **Realtime:** Supabase broadcast + presence; HTTP polling fallback
- **Voice:** LiveKit mute/unmute (Phase 4)
- **PWA:** Installable, cached card assets (Phase 4)

### 3.2 Out of Scope — v1.0

Bots, video chat, native store apps, tournaments, sandbag penalties, blind nil, in-app payments, PostgreSQL migration

### 3.3 v1.1 Backlog

Regular nil, sandbag rules, turn-timer auto-play (host opt-in), away-player host controls, Postgres read replica for analytics

---

## 4. Decision Log (Final)

| ID | Decision | Owner |
|----|----------|-------|
| D1 | Evolve `aspade_railway/front`; sandbox in `aspade_game/` | Engineering |
| D2 | `playMode: 'manual' \| 'live'` on every game; default `manual` | Product |
| D3 | Feature flag `LIVE_MODE_ENABLED` until Phase 5 | Engineering |
| D4 | Engine is pure TypeScript, zero React/Next imports | Engineering |
| D5 | Card encoding: `"AS"`, `"10D"`, `"KH"` | Engineering |
| D6 | Private hands stripped server-side on GET | Security |
| D7 | LiveKit room name = `gameId` | Engineering |
| D8 | Web Audio unlock on first user gesture (lobby Start) | UX |
| D9 | Design mockups in `aspade_game/design/` are layout reference | Design |
| D10 | Branch: `feat/live-spades` until Phase 5 merge | Engineering |

---

## 5. System Overview (Reference)

Full split diagrams, module boundaries, and API contracts → **`Architect.md`**.

```
┌────────────────────────────────────────────────────────────┐
│  LAYER 1 — Client PWA (aspade_railway/front)               │
│  Manual screens │ Card Table │ Hooks │ GamePoller fallback │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│  LAYER 2 — API (Next.js routes)                            │
│  /api/action │ /api/game/[id] │ /api/voice/token           │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│  LAYER 3 — Engine (aspade_game/engine)                     │
│  SpadesEngine.apply(action) → state + events               │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│  LAYER 4 — Infrastructure                                  │
│  Game JSON storage │ Supabase Realtime │ LiveKit Cloud     │
└────────────────────────────────────────────────────────────┘
```

---

## 6. Reuse vs Build (Final)

### 6.1 Reuse unchanged (Manual + shared shell)

| Area | Files |
|------|-------|
| Auth | `auth-provider.tsx`, `login-screen.tsx`, `mini-login-modal.tsx` |
| Dashboard | `dashboard.tsx`, `game-history*.tsx`, `game-card.tsx` |
| Create/Join | `create-game-form.tsx`, `join-game-form.tsx`, `team-selection-modal.tsx` |
| Lobby | `game-lobby.tsx` |
| Manual play | `bidding-screen.tsx`, `trick-tracking-screen.tsx`, `trick-review-modal.tsx` |
| Scoring | `leaderboard-screen.tsx`, `round-celebration.tsx`, `game-completion-fireworks.tsx` |
| Mobile | `mobile-game-wrapper.tsx`, `mobile-recovery.tsx`, `ios-chrome-session-manager.tsx` |
| API | `create`, `join`, `action`, `game/[gameId]`, `session/*`, `players/*` |
| Lib | `api.ts`, `game-utils.ts`, `mobile-utils.ts` |

### 6.2 Build new

| Area | Location |
|------|----------|
| Spades engine | `aspade_game/engine/*` |
| Card table UI | `aspade_game/components/table/*` → integrate to `front/components/card-table/` |
| Realtime hook | `aspade_game/hooks/useGameSync.ts` |
| Audio hook | `aspade_game/hooks/useAudioFX.ts` |
| Voice token API | `front/app/api/voice/token/route.ts` |
| Voice UI | `VoiceControls.tsx`, `VoiceIndicator.tsx` |
| PWA | Serwist config, manifest, icons |

---

## 7. Design Reference Map

| Mockup | Screen | Action |
|--------|--------|--------|
| `design/spades_dashboard_*.png` | Dashboard | Polish only |
| `design/spades_game_lobby_*.png` | Lobby | Add presence dots |
| `design/spades_bidding_*.png` | Bidding | Reuse screen; live auto-advance |
| `design/spades_card_table_*.png` | **Live table** | **Primary new build** |
| `design/spades_scoreboard_*.png` | Leaderboard | Reuse; auto-fill from engine in live |

**Platform rules (from Gemini, adopted):** `100dvh`, safe-area insets, `touch-action: manipulation`, 44px taps, no pinch zoom on game shell.

---

## 8. Unified Roadmap (14 Weeks)

### Phase 0 — Foundation (Weeks 1–2)

| # | Task | Done when |
|---|------|-----------|
| 0.1 | Branch `feat/live-spades` | Branch exists |
| 0.2 | Add `playMode` to create form + Game type | JSON persists field |
| 0.3 | Scaffold `aspade_game/engine/types.ts`, `deck.ts` | Compiles |
| 0.4 | Supabase env + Realtime POC in lobby | Broadcast received |
| 0.5 | PWA manifest + icons stub | Lighthouse installable |
| 0.6 | Empty `TableLayout` with dvh + safe areas | Renders on iPhone |

**Gate:** Manual game create → bid → score works identically. Live game shows lobby with "Live mode — coming soon" until Phase 2.

---

### Phase 1 — Engine (Weeks 3–5)

| Week | Deliverables |
|------|--------------|
| 3 | `deck.ts`, `deal.ts`, seat assignment, Fisher-Yates |
| 4 | `legal-plays.ts`, `trick-resolver.ts`, `bidding.ts` |
| 5 | `scorer.ts`, `state-machine.ts`, `/api/action` integration, 20+ unit tests |

**Gate:** Headless API sim completes 13 tricks; scores match manual calculator.

---

### Phase 2 — Card Table + Sync (Weeks 6–8)

| Week | Deliverables |
|------|--------------|
| 6 | Card SVGs, `PlayingCard`, `PlayerHand` |
| 7 | `TrickZone`, `TableLayout`, `CardTable`, `playCard` wired |
| 8 | `useGameSync`, optimistic UI, reconnect snapshot |

**Gate:** 4 browsers finish one live round; hand restored after 30s disconnect.

---

### Phase 3 — Parity + Polish (Weeks 9–10)

| Deliverables |
|--------------|
| Engine → leaderboard auto-scoring (live) |
| Round celebration + fireworks from engine events |
| framer-motion animations (≤ 400ms) |
| Web Audio FX + unlock on lobby Start |
| iOS Chrome live session recovery |
| **Appendix A manual regression — 100% pass** |

**Gate:** Full 13-round live game with 4 humans; manual checklist green.

---

### Phase 4 — Voice + PWA (Weeks 11–12)

| Deliverables |
|--------------|
| LiveKit project + `/api/voice/token` |
| `VoiceControls` (default muted) |
| `@serwist/next` — cache cards, sounds, shell |
| Install prompt (2nd visit) |

**Gate:** 4-player voice during live game; Lighthouse PWA ≥ 90.

---

### Phase 5 — Beta + Launch (Weeks 13–14)

| Deliverables |
|--------------|
| Load test 50–100 concurrent games |
| Device bug bash (iOS Safari, iOS Chrome, Android) |
| Analytics events wired |
| `LIVE_MODE_ENABLED` on for beta cohort |
| Merge `feat/live-spades` → main |

**Gate:** 10 beta live games/day for 1 week; zero P0 bugs.

---

## 9. Testing Gates (Final)

| Layer | Tool | Minimum |
|-------|------|---------|
| Engine | Vitest/Jest | 100% on legal-plays + trick-resolver |
| Integration | `scripts/simulate-live-game.ts` | Full round via API |
| Manual | Device matrix | 4 devices × 2 modes |
| Load | k6 / Artillery | 100 concurrent games |
| Security | Manual network inspect | No leaked opponent hands |

**Critical paths:**

1. Quick join → live lobby → 4 players → full round → scoreboard  
2. Reconnect mid-trick → correct hand + turn  
3. Manual game full flow (unchanged)  
4. Extend game after final round (both modes)

---

## 10. Success Metrics (from PRD)

| Metric | 90-day target |
|--------|---------------|
| Weekly active games | 200+ |
| Live mode adoption | ≥ 60% new games |
| Game completion rate | ≥ 70% |
| Reconnect success | ≥ 95% within 60s |
| PWA installs | ≥ 25% returning players |
| Card play sync | < 500ms p95 |

---

## 11. Risk Register (Final)

| Risk | Mitigation |
|------|------------|
| Realtime desync | Authoritative server + snapshot on reconnect + polling fallback |
| Hand leak | Server-side filter; security review gate |
| iOS audio blocked | Unlock Web Audio on user gesture |
| iOS PWA limits | Session manager; install instructions |
| Scope creep | Phase gates; manual mode for 2-player |
| Parallel mobile fixes | Weekly merge from main into feature branch |

---

## 12. Immediate Actions (Week 1)

1. Create `feat/live-spades` from latest `aspade_railway/front`
2. Scaffold `aspade_game/engine/` (types, deck, test runner)
3. Add `playMode` to create-game form (live behind `LIVE_MODE_ENABLED=false`)
4. Provision Supabase; add env to Railway
5. Realtime spike: broadcast on lobby join
6. Render one card SVG on `/debug` or empty `TableLayout`
7. Read **`Architect.md`** before any API/engine implementation

---

## 13. Document Map

```
aspade_game/
├── asapde_game_prd.md          ← Product requirements (WHAT)
├── fullgame_plan.md            ← Original vision (historical)
├── plan/
│   ├── final_plan.md           ← THIS FILE — execution (WHEN)
│   ├── Architect.md            ← Architecture split (HOW)
│   ├── aspade_game_plan_chatgpt.md   ← Draft (archived reference)
│   └── architect_plan_gemini.md      ← Draft (archived reference)
└── design/                     ← UI mockups
```

---

*Approved for Phase 0 start.*  
*Next: implement per `Architect.md` Layer 3 (Engine) after Phase 0 scaffolding.*
