# Architectural Plan: Real-Time Playable Spades Game Engine & Native iOS PWA

This document outlines the technical architecture, data model, state-machine transitions, and design constraints required to transform ASAPDE from a score tracker into a fully playable, server-authoritative, real-time multiplayer Spades PWA.

---

## 1. Design & Platform Philosophy (Native iOS PWA)

To make the web app feel like a native iOS/Android application under mobile Safari and Chrome OS, we will enforce strict CSS and viewport policies:

### 1.1 Viewport & Layout Handling
*   **Viewport Sizing:** Avoid `100vh` due to the dynamic address bar resizing in iOS Safari. Use `100dvh` (Dynamic Viewport Height) for full-screen wraps to prevent vertical scrolling.
*   **Safe Areas:** Leverage iOS native safe-area variables in padding:
    ```css
    .ios-safe-wrap {
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    }
    ```
*   **Touch Action & Gestures:** Disable user pinch-and-zoom to prevent accidental interface scaling:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    ```
    And apply CSS rule globally:
    ```css
    body, button, a, [role="button"] {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    ```

### 1.2 Web Audio API & iOS Restrictions
iOS Safari blocks programmatic audio play unless it is direct user-initiated.
*   **Audio Manager Class:** Implement a preloading sequence that initializes and unlocks the browser Web Audio context on the first screen tap (e.g. Lobby Join button or table touch).
*   **Preloaded FX:** Sound sprites or individual files for card shuffles, deals, plays, and trick wins cached via PWA Service Worker.

---

## 2. Technical Stack & Connectivity (Evolving Vercel v2)

We will preserve the Serverless architecture principles defined in `asapde_vercel_v2` while augmenting the state layer for real-time play.

```
+-------------------------------------------------------------------------------+
|                             Client (Next.js PWA)                              |
+-------+--------------------+------------------------+--------------------+----+
        |                    |                        |                    |
        | Rest API           | Realtime Broadcast     | Presence           | WebRTC
        | (State Sync)       | (Card Play/Bids)       | (Online/Offline)   | (LiveKit Room)
        v                    v                        v                    v
+-------+------------+ +-----+----------------+ +----+---------------+ +----+----+
| Next.js API Routes | |   Supabase Realtime  | | Supabase Presence | | LiveKit |
| (Serverless)       | | (Websockets Channel) | | Channel           | | Cloud   |
+-------+------------+ +-----+----------------+ +----+---------------+ +---------+
        |                    |                        |
        +---------+----------+                        |
                  |                                   |
                  v                                   v
        +---------+----------+              +---------+---------+
        |   S3 Storage       |              | PostgreSQL (State)|
        |  (Supabase Bucket) |              +-------------------+
        +--------------------+
```

### 2.1 Backend Connectivity Paradigm
1.  **State Initialization:** The client fetches the base game state from Next.js serverless routes (`/api/games/[id]`).
2.  **WebSocket Channel:** Clients connect directly to a Supabase broadcast channel corresponding to the game ID (`game:${gameId}`).
3.  **Client-to-Server Actions:** Players perform actions (such as `playCard` or `submitBid`) by sending POST requests to `/api/games/[id]/action`.
    *   *Why?* Next.js serverless functions process the engine rules and update the S3 JSON file. Direct client-to-client WebSockets are bypassable, so all rules must be validated server-side.
4.  **Server-to-Client Broadcast:** On successful action processing, the serverless handler broadcasts the updated game state or delta event through the Supabase Realtime channel to notify the remaining 3 players.

---

## 3. Server-Authoritative Game Engine

The game engine logic will reside in a stateless class `SpadesEngine` to support serverless invocations.

```
                           +---------+
                           |  Lobby  |
                           +----+----+
                                | (Start Game)
                                v
                           +----+----+
                           | Dealing |
                           +----+----+
                                | (Fisher-Yates Deal)
                                v
                           +----+----+
                           | Bidding |
                           +----+----+
                                | (All Bids Submitted)
                                v
                           +----+----+
                           | Playing | <-------+
                           +----+----+         |
                                |              | (Next card led)
                                v              |
                           +----+----+         |
                           | Trick   +---------+
                           | Resolv. |
                           +----+----+
                                | (All 13 Tricks played)
                                v
                           +----+----+
                           | Scoring |
                           +----+----+
                                | (Check round limit)
                                v
                         +------+------+
                         | Game Over / |
                         | Completed   |
                         +-------------+
```

### 3.1 State Definition & PostgreSQL Schema Additions
To the base `Game` model, we add a `live_state` JSON document:

```typescript
export interface LiveState {
  phase: 'lobby' | 'dealing' | 'bidding' | 'playing' | 'scoring' | 'completed';
  dealerSeat: number;          // 0 = North, 1 = East, 2 = South, 3 = West
  currentTurn: string | null;   // playerId currently active
  spadesBroken: boolean;       // Have spades been played yet?
  hands: Record<string, string[]>; // Map of playerId -> array of card codes (e.g. "AS", "10D")
  playedCards: Array<{         // Current trick cards in the center
    playerId: string;
    card: string;
  }>;
  tricksWon: Record<string, number>; // Map of playerId -> count of tricks won this round
}
```

### 3.2 Core Engine Rules Implementation
*   **Dealing:** Server-side execution of a secure random Fisher-Yates shuffle. 13 cards are allocated per seat. The API handler sanitizes payloads: players only receive their private `hands[playerId]` array.
*   **Bid Checking:** Validates that bids are within legal limits (0 to 13). Team modes aggregate individual player bids into a team-total bid.
*   **Lead Card Validation:** The first card played in a trick determines the `leadSuit`.
*   **Follow Suit Check:** If a player's hand contains cards of the `leadSuit`, the server must block them from playing any other suit.
*   **Spades Trump Rule:** Spades cannot be led unless `spadesBroken = true` (a spade was already discarded on another suit) or the player has nothing but spades in their hand.
*   **Trick Resolution:**
    *   Tricks are evaluated once `playedCards.length === 4`.
    *   The winning card is the highest Spade (if any were played) or the highest card matching the `leadSuit`.
    *   The winning player receives the trick point, and is designated as `currentTurn` to lead the next trick.

---

## 4. Real-Time Synchronization Protocol

### 4.1 Supabase Realtime Channels
We construct a dedicated room channel on the client:
```typescript
const channel = supabase.channel(`game:${gameId}`, {
  config: {
    broadcast: { self: false },
    presence: { key: playerId }
  }
});
```

### 4.2 Events Schema

| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `PRESENCE_SYNC` | Bidirectional | `{ onlineAt, seat }` | Syncs who is active/away in the lobby. |
| `GAME_START` | Server -> Client | `{ dealerSeat }` | Triggers shuffle & deals local cards. |
| `BID_SUBMITTED` | Server -> Client | `{ playerId, bid }` | Updates score tracking panels. |
| `CARD_PLAYED` | Server -> Client | `{ playerId, card }` | Animates card flying to the center. |
| `TRICK_COMPLETED` | Server -> Client| `{ winnerId, tricksWon }` | Sweeps cards, increments score counter. |
| `PHASE_CHANGED` | Server -> Client | `{ phase, scores }` | Transitions screens (Bidding -> Play -> Score). |

### 4.3 Reconnection & Session Persistence
*   Clients persist their `playerId` and `gameId` in `localStorage`.
*   If the WebSocket drops, the client automatically falls back to smart HTTP polling (adaptive intervals of 1.5s to 5s depending on turn status).
*   Upon reconnect, a full state request `/api/games/[id]/state` is made, triggering state reconciliation on the client to snap-update the hand and center trick layout.

---

## 5. File & Directory Architecture

We isolate the Live Spades logic within `aspade_game` structure, strictly preserving base connectivity classes:

```
aspade_game/
├── plan/
│   └── architect_plan_gemini.md  # This document
├── engine/
│   ├── index.ts                  # Engine interface
│   ├── deck.ts                   # Cards shuffler & dealer
│   ├── rules.ts                  # Legal plays & follow-suit validation
│   └── resolver.ts               # Trick score calculators
├── components/
│   ├── table/
│   │   ├── TableLayout.tsx       # 4-seat responsive table container
│   │   ├── PlayerHand.tsx        # Horizontal fan hand with gestures
│   │   ├── TrickZone.tsx         # Center cards pile
│   │   └── VoiceIndicator.tsx    # LiveKit Speaking wave halo
│   └── forms/
│       └── BiddingDial.tsx       # Bidding interface
├── hooks/
│   ├── useGameSync.ts            # Supabase Realtime hook
│   └── useAudioFX.ts             # Web Audio controller
└── pages/
    └── games/
        └── [id]/
            └── live.tsx          # Standalone playing page
```

---

## 6. Implementation Checklist & Phased Roadmap

### Phase 1: Stateless Core Engine (Backend)
- [ ] Implement deck generator and Fisher-Yates shuffler in `engine/deck.ts`.
- [ ] Code legal play checks (follow-suit, Spades broken) in `engine/rules.ts`.
- [ ] Create test suite simulating a 4-player game play-through.

### Phase 2: Supabase WebSockets & Action Handlers
- [ ] Implement `/api/games/[id]/action` Next.js API endpoint.
- [ ] Set up Supabase Realtime broadcast channels for turn-swaps.
- [ ] Establish Presence trackers to flag away players.

### Phase 3: Mobile iOS UI & Gesture Integration
- [ ] Construct the circular `TableLayout` using `dvh` and Safe Areas.
- [ ] Add touch-manipulation and double-tap logic to `PlayerHand.tsx`.
- [ ] Setup Web Audio hook to pre-unlock audio context.

### Phase 4: Voice Integration & PWA Service Workers
- [ ] Connect token authorization endpoint to LiveKit Cloud rooms.
- [ ] Implement speaking wave overlays.
- [ ] Build offline asset cache manifests.
