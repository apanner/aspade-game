
// 🎯 CENTRALIZED API - Now using the unified API service
// This file now re-exports the centralized API service for backward compatibility

import apiService, { 
  type Player, 
  type GameRound, 
  type Game, 
  type CreateGameResponse, 
  type JoinGameResponse, 
  type GameStateResponse, 
  type ActionResponse, 
  APIError 
} from './api-service';

// Import the new client-only session storage
import { sessionStorage as clientSessionStorage } from './client-session-storage';

// Re-export all types and the API service
export type {
  Player,
  GameRound,
  Game,
  CreateGameResponse,
  JoinGameResponse,
  GameStateResponse,
  ActionResponse,
};

export {
  APIError,
  apiService
};

// 🎯 Backward compatibility - export gameAPI as apiService
export const gameAPI = apiService;

// 🎯 Mobile-specific session management - with server-side safety
const isClient = typeof window !== 'undefined';
const isMobile = isClient && (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  window.innerWidth <= 768
);

// 🎯 iOS Chrome session persistence - keep sessions alive when switching apps
if (isClient) {
  const isIPhoneChrome = /iPhone|iPad|iPod/.test(navigator.userAgent) && /CriOS/.test(navigator.userAgent);
  
  if (isIPhoneChrome) {
    console.log('📱 iOS Chrome detected - setting up session persistence...');
    
    // Keep session alive when page becomes visible (user returns to Chrome)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 iOS Chrome: Page became visible, refreshing session...');
        
        // Refresh session timestamp using the new client session storage
        clientSessionStorage.getPlayerSession().then(session => {
          if (session) {
            console.log('📱 iOS Chrome: Session refreshed');
          }
        }).catch(error => {
          console.warn('⚠️ Failed to refresh iOS Chrome session:', error);
        });
      }
    };
    
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for focus events (when user returns to the tab)
    window.addEventListener('focus', handleVisibilityChange);
    
    // Keep session alive periodically (every 30 seconds)
    setInterval(() => {
      if (!document.hidden) {
        clientSessionStorage.getPlayerSession().catch(error => {
          console.warn('⚠️ Failed to update iOS Chrome session activity:', error);
        });
      }
    }, 30000); // 30 seconds
    
    console.log('📱 iOS Chrome: Session persistence setup complete');
  }
}

// 🎯 Game Poller class - OPTIMIZED: Smart Event-Driven Updates
// Fetches game state when needed: user actions, round changes, or smart polling during active phases
export class GamePoller {
  private callbacks: ((game: Game) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private gameId: string | null = null;
  private playerId: string | null = null;
  private lastKnownRound: number = 0;
  private lastKnownStatus: string = '';
  private lastKnownBidsCount: number = 0;
  private lastKnownTricksCount: number = 0;
  private isRefreshing: boolean = false;
  private focusHandler: (() => void) | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  
  // Static registry to prevent multiple pollers for the same game
  private static activePollers = new Map<string, GamePoller>();

  // Get smart polling interval based on game phase
  // More frequent during active phases where players need to see others' actions
  private getPollingInterval(gameStatus: string): number {
      switch (gameStatus) {
        case 'bidding':
        return 2000;
        case 'playing':
        return 1000;
        case 'trick_review':
        return 8000; // 8 seconds - less urgent but still active
        case 'scoring':
        return 10000; // 10 seconds - waiting for scores
        case 'lobby':
        return 15000; // 15 seconds - waiting for players
        case 'completed':
        return 30000; // 30 seconds - game done, just checking for extensions
        default:
        return 10000; // 10 seconds default
    }
  }

  // Initialize game poller with smart polling
  // Uses event-driven updates + smart polling during active phases
  initialize(gameId: string, initialGame?: Game, enableSmartPolling: boolean = true) {
    // Validate gameId
    if (!gameId || gameId === 'undefined') {
      console.error('❌ Invalid gameId for poller:', gameId);
      return;
    }
    
    // Stop any existing poller for this game
    const existingPoller = GamePoller.activePollers.get(gameId);
    if (existingPoller && existingPoller !== this) {
      console.log(`🔄 Stopping existing poller for game ${gameId}`);
      existingPoller.cleanup();
    }
    
    this.cleanup();
    this.gameId = gameId;
    GamePoller.activePollers.set(gameId, this);
    
    // Initialize tracking with initial game state if provided
    if (initialGame) {
      this.lastKnownRound = initialGame.currentRound || 0;
      this.lastKnownStatus = initialGame.status || 'lobby';
      
      // Track number of submitted bids/tricks to detect other players' actions
      const currentRound = initialGame.rounds?.[initialGame.currentRound - 1];
      if (currentRound) {
        this.lastKnownBidsCount = Object.keys(currentRound.bids || {}).length;
        this.lastKnownTricksCount = Object.keys(currentRound.tricks || {}).length;
      }
    }
    
    // Set up window focus handler (optional: refresh when user returns to tab)
    if (typeof window !== 'undefined') {
      this.focusHandler = () => {
        // Only refresh if user was away for more than 5 seconds
        const wasAway = document.hidden;
        if (!wasAway) {
          console.log('🔄 Window focused, checking for updates...');
          this.refresh();
        }
      };
      window.addEventListener('focus', this.focusHandler);
    }
    
    // Start smart polling if enabled
    if (enableSmartPolling) {
      this.startSmartPolling(initialGame?.status || 'lobby');
    }
    
    console.log('✅ GamePoller initialized (smart polling mode) for game:', gameId);
  }
  
  // Start smart polling with adaptive intervals
  private startSmartPolling(initialStatus: string = 'lobby') {
    this.stopSmartPolling();
    
    let currentStatus = initialStatus;
    let interval = this.getPollingInterval(initialStatus);
    
    const poll = async () => {
      if (!this.gameId) return;
      
      const game = await this.refresh();
      if (game) {
        // Update interval if status changed
        if (game.status !== currentStatus) {
          currentStatus = game.status;
          interval = this.getPollingInterval(currentStatus);
          this.stopSmartPolling();
          this.startSmartPolling(currentStatus);
        }
      }
    };
    
    // Initial poll
    poll();
    
    // Set up interval with current status
    this.pollingInterval = setInterval(poll, interval);
  }
  
  // Stop smart polling
  private stopSmartPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Refresh game state (replaces automatic polling)
  // Call this after user actions or when round/status might have changed
  async refresh(): Promise<Game | null> {
    if (!this.gameId) {
      console.warn('❌ Cannot refresh: no game ID set');
      return null;
    }
    
    // Prevent concurrent refreshes
    if (this.isRefreshing) {
      console.log('⏳ Refresh already in progress, skipping...');
      return null;
    }
    
    this.isRefreshing = true;
    console.log('🔄 Refreshing game state for:', this.gameId);
    
    try {
      const response = await apiService.getGameState(this.gameId, this.playerId ?? undefined);
        const game = response.game;
        
      // Check if round or status changed
      const roundChanged = game.currentRound !== this.lastKnownRound;
      const statusChanged = game.status !== this.lastKnownStatus;
      
      // Track submitted bids/tricks to detect other players' actions
      const currentRound = game.rounds?.[game.currentRound - 1];
      const currentBidsCount = currentRound ? Object.keys(currentRound.bids || {}).length : 0;
      const currentTricksCount = currentRound ? Object.keys(currentRound.tricks || {}).length : 0;
      const bidsChanged = currentBidsCount !== this.lastKnownBidsCount;
      const tricksChanged = currentTricksCount !== this.lastKnownTricksCount;
      
      if (roundChanged || statusChanged || bidsChanged || tricksChanged) {
        console.log(`📊 Game state changed: Round ${this.lastKnownRound}→${game.currentRound}, Status ${this.lastKnownStatus}→${game.status}, Bids ${this.lastKnownBidsCount}→${currentBidsCount}, Tricks ${this.lastKnownTricksCount}→${currentTricksCount}`);
        this.lastKnownRound = game.currentRound || 0;
        this.lastKnownStatus = game.status || 'lobby';
        this.lastKnownBidsCount = currentBidsCount;
        this.lastKnownTricksCount = currentTricksCount;
        }
        
        // Notify all callbacks
        this.callbacks.forEach(callback => callback(game));
        
      this.isRefreshing = false;
      return game;
      } catch (error) {
      console.error('❌ Refresh failed:', error);
      this.errorCallbacks.forEach(callback => callback(error as Error));
      this.isRefreshing = false;
      return null;
    }
  }

  // Force refresh game data immediately (kept for backward compatibility)
  forceRefresh() {
    return this.refresh();
          }

  // Cleanup poller resources
  cleanup() {
    this.stopSmartPolling();
    
    if (this.focusHandler && typeof window !== 'undefined') {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }
    
    // Remove from active pollers registry
    if (this.gameId) {
      GamePoller.activePollers.delete(this.gameId);
      this.gameId = null;
    }
    
    this.lastKnownRound = 0;
    this.lastKnownStatus = '';
    this.lastKnownBidsCount = 0;
    this.lastKnownTricksCount = 0;
    this.isRefreshing = false;
    }
    
  // Stop polling (kept for backward compatibility, now just cleans up)
  stopPolling() {
    this.cleanup();
  }

  // Start polling (DEPRECATED - kept for backward compatibility)
  // Now just initializes without automatic polling
  startPolling(gameId: string, initialStatus: string = 'lobby', playerId?: string) {
    if (playerId) {
      this.playerId = playerId;
    }
    this.initialize(gameId, undefined, true);
  }

  setPlayerId(playerId: string) {
    this.playerId = playerId;
  }

  // Add game update callback
  onGameUpdate(callback: (game: Game) => void) {
    this.callbacks.push(callback);
  }

  // Add error callback
  onError(callback: (error: Error) => void) {
    this.errorCallbacks.push(callback);
  }

  // Remove game update callback
  removeGameUpdate(callback: (game: Game) => void) {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  // Remove error callback
  removeError(callback: (error: Error) => void) {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  // Clear all callbacks
  clearCallbacks() {
    this.callbacks = [];
    this.errorCallbacks = [];
  }
  
  // Static method to stop all active pollers
  static stopAllPollers() {
    console.log(`Stopping ${GamePoller.activePollers.size} active pollers`);
    GamePoller.activePollers.forEach(poller => poller.stopPolling());
    GamePoller.activePollers.clear();
  }
  
  // Initialize cleanup on page unload
  static {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        GamePoller.stopAllPollers();
      });
    }
  }

  // Utility methods for game data
  getTeamMembers(game: Game, team: 'red' | 'blue'): Player[] {
    return Object.values(game.players).filter(player => player.team === team);
  }

  getCurrentRound(game: Game): GameRound | null {
    return game.rounds[game.currentRound - 1] || null;
  }

  hasPlayerBid(game: Game, playerId: string): boolean {
    const currentRound = this.getCurrentRound(game);
    return currentRound ? playerId in currentRound.bids : false;
  }

  hasPlayerTricks(game: Game, playerId: string): boolean {
    const currentRound = this.getCurrentRound(game);
    return currentRound ? playerId in currentRound.tricks : false;
  }

  getTeamRoundScore(game: Game, team: 'red' | 'blue'): number {
    const currentRound = this.getCurrentRound(game);
    if (!currentRound) return 0;
    
    return Object.entries(currentRound.scores)
      .filter(([playerId]) => game.players[playerId]?.team === team)
      .reduce((sum, [, score]) => sum + score, 0);
  }

  getWinningTeam(game: Game): 'red' | 'blue' | 'tie' | null {
    if (game.scores.red > game.scores.blue) return 'red';
    if (game.scores.blue > game.scores.red) return 'blue';
    if (game.scores.red === game.scores.blue) return 'tie';
    return null;
  }

  formatGameCode(code: string): string {
    return code.toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  }

  // 🎯 Save player session - Now uses client-only storage
  async savePlayerSession(gameId: string, playerId: string, playerName: string): Promise<string | null> {
    console.log('💾 Saving session...', { gameId, playerId, playerName });
    
    if (!isClient) {
      console.log('⚠️ Server-side execution detected, cannot save client session');
      return null;
    }
    
    // Use the new client-only session storage
    return await clientSessionStorage.savePlayerSession(gameId, playerId, playerName);
  }

  // 🎯 Get player session - Now uses client-only storage
  async getPlayerSession(): Promise<{ gameId: string; playerId: string; playerName: string } | null> {
    console.log('🔍 Retrieving session...', { isMobile });
    
    if (!isClient) {
      console.log('⚠️ Server-side execution detected, cannot retrieve client session');
      return null;
    }
    
    // Use the new client-only session storage
    return await clientSessionStorage.getPlayerSession();
  }

  // 🎯 Clear player session - Now uses client-only storage
  async clearPlayerSession(): Promise<void> {
    console.log('🗑️ Clearing session...', { isMobile });
    
    if (!isClient) {
      console.log('⚠️ Server-side execution detected, cannot clear client session');
      return;
    }
    
    // Use the new client-only session storage
    await clientSessionStorage.clearPlayerSession();
  }

  // Save player name only (for login without game)
  async savePlayerName(playerName: string): Promise<void> {
    if (!isClient) {
      console.log('⚠️ Server-side execution detected, cannot save player name');
      return;
    }
    
    // Use the new client-only session storage
    await clientSessionStorage.savePlayerName(playerName);
  }

  // 🎯 Get player name - Now uses client-only storage
  async getPlayerName(): Promise<string | null> {
    if (!isClient) {
      return null;
    }
    
    // Use the new client-only session storage
    return await clientSessionStorage.getPlayerName();
  }
}

export const gameUtils = {
  formatGameCode(code: string): string {
    return code.toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  },
  
  // Utility methods for game data
  getTeamMembers(game: Game, team: 'red' | 'blue'): Player[] {
    return Object.values(game.players).filter(player => player.team === team);
  },

  getCurrentRound(game: Game): GameRound | null {
    return game.rounds[game.currentRound - 1] || null;
  },

  hasPlayerBid(game: Game, playerId: string): boolean {
    const currentRound = this.getCurrentRound(game);
    return currentRound ? playerId in currentRound.bids : false;
  },

  hasPlayerTricks(game: Game, playerId: string): boolean {
    const currentRound = this.getCurrentRound(game);
    return currentRound ? playerId in currentRound.tricks : false;
  },

  getTeamRoundScore(game: Game, team: 'red' | 'blue'): number {
    const currentRound = this.getCurrentRound(game);
    if (!currentRound) return 0;
    
    return Object.entries(currentRound.scores)
      .filter(([playerId]) => game.players[playerId]?.team === team)
      .reduce((sum, [, score]) => sum + score, 0);
  },

  getWinningTeam(game: Game): 'red' | 'blue' | 'tie' | null {
    if (game.scores.red > game.scores.blue) return 'red';
    if (game.scores.blue > game.scores.red) return 'blue';
    if (game.scores.red === game.scores.blue) return 'tie';
    return null;
  }
};

// 🎯 Session storage - Now uses the new client-only session storage
export const sessionStorage = {
  // Save player session (for resume functionality) - Now uses client-only storage
  async savePlayerSession(gameId: string, playerId: string, playerName: string): Promise<string | null> {
    return await clientSessionStorage.savePlayerSession(gameId, playerId, playerName);
  },

  // Get player session (for resume functionality)
  async getPlayerSession(): Promise<{ gameId: string; playerId: string; playerName: string } | null> {
    return await clientSessionStorage.getPlayerSession();
  },

  // Clear player session
  async clearPlayerSession(): Promise<void> {
    return await clientSessionStorage.clearPlayerSession();
  },

  // Save player name only (for login without game)
  async savePlayerName(playerName: string): Promise<void> {
    return await clientSessionStorage.savePlayerName(playerName);
  },

  // Get player name
  async getPlayerName(): Promise<string | null> {
    return await clientSessionStorage.getPlayerName();
  },

  // 🎯 Mobile recovery function - Simplified version
  async checkAndRecoverMobileSession(): Promise<{
    recovered: boolean;
    gameId?: string;
    playerId?: string;
    playerName?: string;
  }> {
    // For now, return no recovery since we're using client-only storage
    // This prevents the build error while maintaining the API
    return { recovered: false };
  },

  // 🎯 Check game status - Simplified version
  async checkGameStatus(gameId: string): Promise<{
    exists: boolean;
    isActive: boolean;
    playerCount: number;
    status: string;
  }> {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (response.ok) {
        const gameData = await response.json();
        return {
          exists: true,
          isActive: gameData.status === 'lobby' || gameData.status === 'bidding' || gameData.status === 'playing',
          playerCount: Object.keys(gameData.players || {}).length,
          status: gameData.status
        };
      } else {
        return {
          exists: false,
          isActive: false,
          playerCount: 0,
          status: 'not_found'
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to check game status:', error);
      return {
        exists: false,
        isActive: false,
        playerCount: 0,
        status: 'error'
      };
    }
  },

  // 🎯 Get mobile recovery data - Simplified version
  async getMobileRecoveryData(): Promise<Array<{
    gameId: string;
    playerId: string;
    playerName: string;
    gameCode: string;
    timestamp: number;
    lastActivity: number;
    deviceInfo: Record<string, unknown>;
  }>> {
    // For now, return empty array since we're using client-only storage
    // This prevents the build error while maintaining the API
    return [];
  }
};

// 🎯 Health check function
export async function healthCheck(): Promise<{ status: string; activeGames: number; uptime: number }> {
  try {
    const response = await fetch('/api/health');
    if (response.ok) {
      return await response.json();
    } else {
      throw new Error(`Health check failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Health check error:', error);
    throw error;
  }
}

