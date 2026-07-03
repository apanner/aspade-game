# @aspade/engine

Pure TypeScript Spades game engine for live multiplayer mode.

## Actions

| Action | Payload | Description |
|--------|---------|-------------|
| `START_LIVE_GAME` | — | Deal cards, assign seats, enter bidding |
| `SUBMIT_BID` | `{ playerId, bid: 0–13 }` | Submit bid in turn order |
| `PLAY_CARD` | `{ playerId, card: CardCode }` | Play a legal card |
| `ADVANCE_ROUND` | — | Start next round after `round_end` |

## Card codes

`"AS"`, `"10D"`, `"KH"`, `"2C"` — rank + suit (`S|H|D|C`).

## Usage

```typescript
import { SpadesEngine, getLegalPlays } from '@aspade/engine'

const result = SpadesEngine.apply(engineGame, {
  type: 'PLAY_CARD',
  playerId: 'abc',
  card: 'AS',
})

const legal = getLegalPlays(hand, currentTrick, spadesBroken)
```

## Tests

```bash
cd aspade_game/engine && npm test
```
