# Game Connectivity Optimization Plan

## 🔍 Current Problem Analysis

### Issues:
1. **Constant Polling**: Game polls every 1-5 seconds regardless of user activity
   - Lobby: 5 seconds
   - Bidding: 2 seconds  
   - Playing: 2 seconds
   - Trick Review: 3 seconds
   - Scoring: 3 seconds
   - Completed: 3 seconds (waiting for extensions)

2. **Multiple Pollers**: Both dashboard and game screen run separate pollers
3. **Network Errors**: Excessive requests cause rate limiting and connection issues
4. **Unnecessary Traffic**: Polling continues even when user is idle

### For a Scoring Game:
- **NOT real-time interactive** (like chess or poker)
- Players take turns submitting bids/tricks
- Game state only changes when:
  - User clicks a button (submit bid, submit tricks, etc.)
  - Round completes (all players submitted)
  - Host starts next round

## ✅ Solution: Event-Driven Updates

### Strategy:
1. **Stop Automatic Polling** - Remove constant polling intervals
2. **Fetch Only When Needed**:
   - After user actions (button clicks)
   - When round number changes
   - When game status changes
   - Manual refresh button for users

3. **Optimistic Updates** - Update UI immediately, verify with server

### Implementation:

#### Phase 1: Smart Polling (Hybrid Approach)
- Keep polling but make it **much smarter**:
  - Stop polling when user is idle (no actions for 30+ seconds)
  - Increase intervals significantly (10-30 seconds instead of 1-5)
  - Only poll during active phases (bidding, playing)
  - Stop polling in completed games (unless host is active)

#### Phase 2: Event-Driven (Recommended)
- **Remove polling entirely**
- Fetch game state:
  - Immediately after any user action (submitBid, submitTricks, etc.)
  - When component detects round/status change
  - On manual refresh button click
  - On window focus (user returns to tab)

### Benefits:
- ✅ 90%+ reduction in network requests
- ✅ No more rate limiting errors
- ✅ Better battery life on mobile
- ✅ Faster response (no polling delay)
- ✅ More reliable (fewer connection errors)

## 🎯 Recommended Approach: Event-Driven

Since this is a scoring game (not real-time), event-driven is perfect:
- User clicks "Submit Bid" → Fetch game state
- User clicks "Submit Tricks" → Fetch game state  
- Round completes → Fetch game state
- User clicks "Next Round" → Fetch game state
- Window gains focus → Fetch game state (optional)

No need for constant polling!

