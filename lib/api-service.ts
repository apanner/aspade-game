// 🎯 CENTRALIZED API SERVICE
// This is the SINGLE place for all API calls - change one place to work everywhere
// Uses the smart backend configuration system

import { smartFetch, getSmartApiUrl, BACKEND_CONFIG, getEndpoint, getSmartBackendUrl } from './backend-config';

// Types
export interface Player {
  id: string;
  name: string;
  team: 'red' | 'blue';
  isHost: boolean;
  joinedAt: number;
  totalScore: number;
  isComputer?: boolean;
  personality?: 'conservative' | 'smart' | 'aggressive';
  isTeamLeader?: boolean;
}

export interface GameRound {
  round: number;
  tricksThisRound: number;
  bids: Record<string, number>;
  tricks: Record<string, number>;
  scores: Record<string, number>;
  status: 'bidding' | 'playing' | 'review' | 'completed';
}

export interface Game {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  title?: string;
  createdAt: number;
  lastActivity?: number;
  status: 'lobby' | 'bidding' | 'playing' | 'trick_review' | 'scoring' | 'completed' | 'cancelled';
  state: 'lobby' | 'bidding' | 'playing' | 'trick_review' | 'scoring' | 'completed' | 'cancelled';
  currentRound: number;
  maxRounds: number;
  totalRounds: number;
  players: Record<string, Player>;
  rounds: GameRound[];
  scores: { red: number; blue: number };
  roundScores?: Record<number, Record<string, number>>;
  playMode?: 'manual' | 'live';
  teamConfigs?: Array<{
    id: string;
    name: string;
    color: string;
    colorName: string;
    bg: string;
  }>;
  liveState?: {
    phase: string;
    seats?: Record<string, number>;
    currentTurn?: string | null;
    spadesBroken?: boolean;
    myHand?: string[];
    legalCards?: string[];
    currentTrick?: {
      plays: Array<{ playerId: string; card: string; seat: number }>;
    } | null;
    turnExpiresAt?: number | null;
    tricksWon?: Record<string, number>;
    roundBids?: Record<string, number>;
    biddingOrder?: string[];
    biddingIndex?: number;
    cardsPerRound?: number;
    completedTricks?: Array<{
      winnerId?: string;
      plays: Array<{ playerId: string; card: string; seat: number }>;
    }>;
  };
  cancelledAt?: number;
  cancelledBy?: string;
  completedAt?: number;
}

export interface CreateGameResponse {
  gameId: string;
  code: string;
  playerId: string;
  game: Game;
}

export interface JoinGameResponse {
  playerId: string;
  game: Game;
  autoMode?: boolean;
  message?: string;
}

export interface GameStateResponse {
  game: Game;
}

export interface ActionResponse {
  success: boolean;
  game: Game;
}

// API Error class
export class APIError extends Error {
  constructor(public status: number, message: string, public errorData?: any) {
    super(message);
    this.name = 'APIError';
    if (errorData) {
      Object.assign(this, errorData);
    }
  }
}

// 🚀 Centralized API Service
export const apiService = {
  // Base request function using smart backend discovery
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await smartFetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(response.status, errorData.error || 'Request failed', errorData);
      }

      return response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(0, error instanceof Error ? error.message : 'Network error');
    }
  },

  // Game API functions
  async createGame(gameConfig: any): Promise<CreateGameResponse> {
    return this.request<CreateGameResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.CREATE, {
      method: 'POST',
      body: JSON.stringify(gameConfig),
    });
  },

  async joinGame(code: string, playerName: string, team?: string): Promise<JoinGameResponse> {
    return this.request<JoinGameResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.JOIN, {
      method: 'POST',
      body: JSON.stringify({ code, playerName, ...(team && { team }) }),
    });
  },

  async getGameState(gameId: string, playerId?: string): Promise<GameStateResponse> {
    const qs = playerId ? `?playerId=${encodeURIComponent(playerId)}` : ''
    return this.request<GameStateResponse>(`/api/game/${gameId}${qs}`)
  },

  async startGame(gameId: string, playerId: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'startGame',
      }),
    });
  },

  async submitBid(gameId: string, playerId: string, bid: number): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'submitBid',
        data: { bid },
      }),
    });
  },

  async submitTricks(gameId: string, playerId: string, tricks: number): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'submitTricks',
        data: { tricks },
      }),
    });
  },

  async playCard(gameId: string, playerId: string, card: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'playCard',
        data: { card },
      }),
    });
  },

  async nextRound(gameId: string, playerId: string): Promise<ActionResponse> {
    // Call backend directly for faster response
    const backendUrl = await getSmartBackendUrl();
    const apiUrl = `${backendUrl}/api/action`;
    
    console.log(`🚀 Direct backend call for nextRound: ${apiUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          playerId,
          action: 'nextRound',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(response.status, errorData.error || 'Request failed', errorData);
      }
      
      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new APIError(408, 'Request timeout - next round taking too long');
      }
      throw error;
    }
  },

  async startTrickTracking(gameId: string, playerId: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'startTrickTracking',
      }),
    });
  },

  async completeRound(gameId: string, playerId: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'completeRound',
      }),
    });
  },

  async leaveGame(gameId: string, playerId: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'leaveGame',
      }),
    });
  },

  async deleteGame(gameId: string, playerId: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'deleteGame',
      }),
    });
  },

  async cancelGame(gameId: string, playerId: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'cancelGame',
      }),
    });
  },

  async editPlayerTricks(gameId: string, playerId: string, targetPlayerId: string, newTricks: number): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'editPlayerTricks',
        data: { targetPlayerId, newTricks },
      }),
    });
  },

  async approveTricks(gameId: string, playerId: string): Promise<ActionResponse> {
    // Call backend directly for faster response (like test script)
    const backendUrl = await getSmartBackendUrl();
    const apiUrl = `${backendUrl}/api/action`;
    
    console.log('🚀 approveTricks: Calling backend directly at:', apiUrl);
    const startTime = Date.now();
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId,
          playerId,
          action: 'approveTricks',
        }),
      });

      const duration = Date.now() - startTime;
      console.log(`✅ approveTricks: Backend response in ${duration}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ approveTricks: Backend error:', errorData);
        throw new APIError(response.status, errorData.error || 'Request failed', errorData);
      }

      const result = await response.json();
      console.log('✅ approveTricks: Success response:', result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ approveTricks: Error after ${duration}ms:`, error);
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(0, error instanceof Error ? error.message : 'Network error');
    }
  },

  async promoteToTeamLeader(gameId: string, playerId: string, targetPlayerId: string): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'promoteToTeamLeader',
        data: { targetPlayerId },
      }),
    });
  },

  async updateGameRules(gameId: string, playerId: string, rules: { totalRounds?: number }): Promise<ActionResponse> {
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'updateGameRules',
        data: rules,
      }),
    });
  },

  async completeGame(gameId: string, playerId: string): Promise<ActionResponse> {
    // Check if it's iPhone Chrome browser - use longer timeout
    const isIPhoneChrome = typeof window !== 'undefined' && 
      /iPhone|iPad|iPod/.test(navigator.userAgent) && 
      /CriOS/.test(navigator.userAgent);
    
    const timeoutDuration = isIPhoneChrome ? 60000 : 30000; // 60s for iPhone Chrome, 30s for others
    
    return this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'completeGame',
      }),
      signal: AbortSignal.timeout(timeoutDuration) // Extended timeout for iPhone Chrome
    });
  },

  async extendGame(gameId: string, playerId: string, additionalRounds: number): Promise<ActionResponse> {
    console.log('🎯 API extendGame called:', { gameId, playerId, additionalRounds })
    const response = await this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'extendGame',
        data: { additionalRounds },
      }),
    });
    console.log('✅ API extendGame response:', response)
    return response
  },

  async endGame(gameId: string, playerId: string): Promise<ActionResponse> {
    console.log('🎯 API endGame called:', { gameId, playerId })
    const response = await this.request<ActionResponse>(BACKEND_CONFIG.ENDPOINTS.GAMES.ACTION, {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        playerId,
        action: 'endGame',
      }),
    });
    console.log('✅ API endGame response:', response)
    return response
  },

  async getGame(gameId: string): Promise<GameStateResponse> {
    return this.request<GameStateResponse>(`${BACKEND_CONFIG.ENDPOINTS.GAMES.DETAIL}/${gameId}`);
  },

  // Player API functions
  async playerLogin(name: string): Promise<any> {
    // Use frontend API route directly for login
    return this.request('/api/players/login', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async playerRegister(playerData: any): Promise<any> {
    // Use frontend API route directly
    return this.request('/api/players/register', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
  },

  async playerStatus(playerData: any): Promise<any> {
    // Use frontend API route directly
    return this.request('/api/players/status', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
  },

  async playerResume(playerData: any): Promise<any> {
    // Use frontend API route directly
    return this.request('/api/players/resume', {
      method: 'POST',
      body: JSON.stringify(playerData),
    });
  },

  async getPlayerSuggestions(query: string): Promise<any> {
    // Use frontend API route directly
    return this.request(`/api/players/suggestions?q=${encodeURIComponent(query)}`);
  },

  async getPlayerDashboard(name: string): Promise<any> {
    // Use local API route like the reference version
    return this.request(`/api/players/dashboard/${encodeURIComponent(name)}`);
  },

  async getPlayerHistory(name: string): Promise<any> {
    return this.request(`/api/players/history/${encodeURIComponent(name)}`);
  },

  async getPlayerProfile(name: string): Promise<any> {
    return this.request(`${BACKEND_CONFIG.ENDPOINTS.PLAYERS.PROFILE}/${encodeURIComponent(name)}`);
  },

  // Admin API functions
  async getAdminGames(): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.ADMIN.GAMES);
  },

  async getAdminPlayers(): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.ADMIN.PLAYERS);
  },

  async deleteAdminPlayers(playerIds: string[]): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.ADMIN.PLAYERS, {
      method: 'DELETE',
      body: JSON.stringify({ playerIds }),
    });
  },

  async deleteAdminGames(gameIds: string[]): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.ADMIN.GAMES, {
      method: 'DELETE',
      body: JSON.stringify({ gameIds }),
    });
  },

  async getStorageConfig(): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.ADMIN.STORAGE_CONFIG);
  },

  async updateStorageConfig(config: any): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.ADMIN.STORAGE_CONFIG, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async testStorage(): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.ADMIN.STORAGE_TEST, {
      method: 'POST',
    });
  },

  // Other API functions
  async getHistory(): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.HISTORY);
  },

  async getLeaderboard(): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.LEADERBOARD);
  },

  async getTeamsLeaderboard(): Promise<any> {
    return this.request(BACKEND_CONFIG.ENDPOINTS.TEAMS_LEADERBOARD);
  },

  async getGameDetails(gameId: string): Promise<any> {
    return this.request(`/api/game-detail/${gameId}`);
  },

  // Session management
  async saveSession(sessionData: any): Promise<any> {
    return this.request('/api/session/save', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  async getSession(sessionData: any): Promise<any> {
    return this.request('/api/session/get', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  async clearSession(sessionData: any): Promise<any> {
    return this.request('/api/session/clear', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  // User management
  async getUser(userData: any): Promise<any> {
    return this.request('/api/user/get', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async saveUser(userData: any): Promise<any> {
    return this.request('/api/user/save', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Health check
  async healthCheck(): Promise<any> {
    return this.request('/api/health');
  },
};

// 🎯 Export the centralized API service
export default apiService; 