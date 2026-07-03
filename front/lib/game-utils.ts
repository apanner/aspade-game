import { storage } from './storage-gateway';

// Types for game data structures
export interface Player {
  id: string;
  name: string;
  team?: string | null;
  status: 'active' | 'inactive';
  bid?: number | null;
  tricks: number;
  score: number;
  roundScores: number[];
  lastActivity: number;
  isHost: boolean;
  isComputer: boolean;
  isTeamLeader?: boolean;
  personality?: 'conservative' | 'smart' | 'aggressive';
  joinedAt?: number;
}

export interface Round {
  round: number;
  bids: Record<string, number>;
  tricks: Record<string, number>;
  scores: Record<string, number>;
  status: 'bidding' | 'playing' | 'reviewing' | 'review' | 'completed';
}

export interface Game {
  id: string;
  code: string;
  title: string;
  description?: string;
  hostName: string;
  hostId: string;
  status: 'lobby' | 'bidding' | 'playing' | 'reviewing' | 'trick_review' | 'scoring' | 'completed' | 'cancelled';
  state: string;
  maxPlayers: number;
  currentRound: number;
  maxRounds: number;
  totalRounds: number;
  players: Record<string, Player>;
  rounds: Round[];
  roundScores: Record<number, Record<string, number>>;
  gameMode: string;
  teamConfig?: {
    gameMode: string;
    numberOfTeams: number;
    playersPerTeam: number;
    autoAssignTeams: boolean;
  };
  teamConfigs?: Array<{
    id: string;
    name: string;
    color: string;
    colorName: string;
    bg: string;
  }>;
  createdAt: number;
  lastActivity: number;
  completedAt?: number;
  scores?: Record<string, number>; // Added for team scores
  originalPlayers?: Array<{
    playerId: string;
    name: string;
  }>;
  playMode?: 'manual' | 'live';
  liveState?: {
    phase: string;
    dealerSeat: number;
    seats: Record<string, number>;
    currentTurn: string | null;
    spadesBroken: boolean;
    myHand?: string[];
    legalCards?: string[];
    currentTrick?: {
      plays: Array<{ playerId: string; card: string; seat: number }>;
    } | null;
    tricksWon?: Record<string, number>;
    roundBids?: Record<string, number>;
    turnExpiresAt?: number | null;
    completedTricks?: Array<{
      winnerId?: string;
      plays: Array<{ playerId: string; card: string; seat: number }>;
    }>;
  };
}

export interface PlayerProfile {
  name: string;
  avatar: string;
  createdAt: number;
  lastAccess: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost?: number;
  totalScore: number;
  bestScore?: number;
  loginCount: number;
  achievements?: string[];
  favoriteTeammates?: string[];
  winRate?: number;
  averageScore?: number;
  totalBids?: number;
  bidsMade?: number;
  bidAccuracy?: number;
}

// Generate unique IDs
export function generateGameCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Storage helper functions
export async function saveGameToFile(gameId: string, game: Game): Promise<boolean> {
  console.log(`💾 Saving game ${gameId} to storage (${storage.getStatus().provider})`);
  return await storage.saveFile(`games/${gameId}.json`, game);
}

export async function loadGameFromFile(gameId: string): Promise<Game | null> {
  const data = await storage.loadFile(`games/${gameId}.json`);
  return data as Game | null;
}

export async function deleteGameFile(gameId: string): Promise<boolean> {
  return await storage.deleteFile(`games/${gameId}.json`);
}

export async function savePlayerSession(playerId: string, sessionData: Record<string, unknown>): Promise<boolean> {
  // 🎯 FIX: Use ONE session file per player (no timestamps)
  return await storage.saveFile(`sessions/session_${playerId}.json`, sessionData);
}

export async function loadPlayerSession(playerId: string): Promise<Record<string, unknown> | null> {
  // 🎯 FIX: Use ONE session file per player (no timestamps)
  try {
    return await storage.loadFile(`sessions/session_${playerId}.json`) as Record<string, unknown>;
  } catch (error) {
    return null;
  }
}

export async function deletePlayerSession(playerId: string): Promise<boolean> {
  // 🎯 FIX: Use ONE session file per player (no timestamps)
  try {
    return await storage.deleteFile(`sessions/session_${playerId}.json`);
  } catch (error) {
    return false;
  }
}

export async function savePlayerToFile(playerId: string, playerData: Record<string, unknown>): Promise<boolean> {
  return await storage.saveFile(`players/${playerId}.json`, {
    ...playerData,
    lastSaved: Date.now()
  });
}

export async function loadPlayerFromFile(playerId: string): Promise<Record<string, unknown> | null> {
  return await storage.loadFile(`players/${playerId}.json`) as Record<string, unknown> | null;
}

export async function savePlayerProfile(name: string, profile: PlayerProfile): Promise<boolean> {
  return await storage.saveFile(`player_profiles/${name}.json`, {
    ...profile,
    lastUpdated: Date.now()
  });
}

export async function loadPlayerProfile(name: string): Promise<PlayerProfile | null> {
  // First try exact match
  let data = await storage.loadFile(`player_profiles/${name}.json`);
  if (data) return data as PlayerProfile;

  // If not found, try case-insensitive search
  const files = await storage.listFiles('player_profiles/');
  const matchingFile = files.find(file => 
    file.toLowerCase() === `player_profiles/${name.toLowerCase()}.json`
  );

  if (matchingFile) {
    data = await storage.loadFile(matchingFile);
    return data as PlayerProfile;
  }

  return null;
}

export async function createPlayerProfile(name: string): Promise<PlayerProfile> {
  const profile: PlayerProfile = {
    name: name.trim(),
    avatar: '👤',
    createdAt: Date.now(),
    lastAccess: Date.now(),
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalScore: 0,
    bestScore: 0,
    loginCount: 1,
    achievements: [],
    favoriteTeammates: [],
    winRate: 0,
    averageScore: 0,
    totalBids: 0,
    bidsMade: 0,
    bidAccuracy: 0
  };
  
  await savePlayerProfile(name, profile);
  console.log(`✅ Created new player profile for ${name}`);
  return profile;
}

export async function updatePlayerProfile(name: string, updates: Partial<PlayerProfile>): Promise<PlayerProfile | null> {
  const existing = await loadPlayerProfile(name);
  if (!existing) return null;
  
  const updated = { ...existing, ...updates, lastAccess: Date.now() };
  await savePlayerProfile(name, updated);
  return updated;
}

// Game helper functions
export function assignPlayerToTeam(players: Record<string, Player>, game: Game): string | null {
  if (game.teamConfig?.gameMode !== 'teams') return null;
  
  const teamCounts: Record<string, number> = {};
  const maxTeams = game.teamConfig.numberOfTeams || 2;
  
  // Count existing players in each team
  Object.values(players).forEach(player => {
    if (player.team) {
      teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
    }
  });
  
  // Find team with least players
  for (let i = 1; i <= maxTeams; i++) {
    const teamName = `team${i}`; // Always lowercase to avoid mobile capitalization issues
    if ((teamCounts[teamName] || 0) < (game.teamConfig.playersPerTeam || 2)) {
      return teamName;
    }
  }
  
  return 'team1'; // Fallback - always lowercase
}

export function shouldBeTeamLeader(players: Record<string, Player>, team: string | null, gameMode: string): boolean {
  if (gameMode !== 'teams' || !team) return false;
  
  // Check if team already has a leader
  const teamMembers = Object.values(players).filter(p => p.team === team);
  return !teamMembers.some(p => p.isTeamLeader);
}

// AI Player functions
export function generateAIBid(personality: string, round: number): number {
  switch (personality) {
    case 'conservative':
      return Math.max(0, Math.floor(round * 0.3) + Math.floor(Math.random() * 2));
    case 'smart':
      return Math.max(0, Math.floor(round * 0.4) + Math.floor(Math.random() * 2));
    case 'aggressive':
      return Math.max(0, Math.floor(round * 0.6) + Math.floor(Math.random() * 3));
    default:
      return Math.floor(Math.random() * Math.min(round, 3));
  }
}

export function processAITricks(game: Game, aiPlayers: Array<[string, Player]>): void {
  const currentRound = game.rounds[game.currentRound - 1];
  let totalTricksSubmitted = 0;
  
  // Count already submitted tricks
  Object.values(currentRound.tricks).forEach(tricks => {
    if (tricks !== undefined) totalTricksSubmitted += tricks;
  });
  
  console.log(`🔍 AI Players to process tricks: ${aiPlayers.length}`);
  console.log(`🔍 Current tricks state:`, currentRound.tricks);
  
  let runningTotal = totalTricksSubmitted;
  
  // Process AI players except the last one
  for (let i = 0; i < aiPlayers.length - 1; i++) {
    const [pid, player] = aiPlayers[i];
    const bid = currentRound.bids[pid] || 0;
    const maxPossible = Math.max(0, game.currentRound - runningTotal);
    
    console.log(`   - ${player.name} (${pid}): isComputer=${player.isComputer}, hasTricks=${currentRound.tricks[pid] !== undefined}`);
    
    let generatedTricks = generateAITricks(player.personality || 'conservative', bid, game.currentRound);
    generatedTricks = Math.min(generatedTricks, maxPossible);
    
    currentRound.tricks[pid] = generatedTricks;
    runningTotal += generatedTricks;
    
    console.log(`🤖 ${player.name} generated ${generatedTricks}, capped at ${generatedTricks} (${maxPossible} remaining, total was ${totalTricksSubmitted})`);
    console.log(`🤖 ${player.name} (${player.personality}) got ${generatedTricks} tricks (bid: ${bid})`);
    console.log(`   Running total after ${player.name}: ${runningTotal}`);
  }
  
  // Last AI player gets remaining tricks
  if (aiPlayers.length > 0) {
    const [lastPid, lastPlayer] = aiPlayers[aiPlayers.length - 1];
    const lastBid = currentRound.bids[lastPid] || 0;
    const remainingTricks = Math.max(0, game.currentRound - runningTotal);
    
    console.log(`🤖 ${lastPlayer.name} (last AI player) gets remaining ${remainingTricks} tricks (total was ${totalTricksSubmitted})`);
    currentRound.tricks[lastPid] = remainingTricks;
    runningTotal += remainingTricks;
    
    console.log(`🤖 ${lastPlayer.name} (${lastPlayer.personality}) got ${remainingTricks} tricks (bid: ${lastBid})`);
    console.log(`   Running total after ${lastPlayer.name}: ${runningTotal}`);
  }
}

function generateAITricks(personality: string, bid: number, maxTricks: number): number {
  const randomFactor = Math.random();
  
  switch (personality) {
    case 'conservative':
      // Conservative: usually gets close to bid, slightly under
      return Math.max(0, Math.min(maxTricks, bid + Math.floor((randomFactor - 0.6) * 2)));
    case 'smart':
      // Smart: usually gets exactly bid or close
      return Math.max(0, Math.min(maxTricks, bid + Math.floor((randomFactor - 0.5) * 2)));
    case 'aggressive':
      // Aggressive: might get more or fewer tricks than bid
      return Math.max(0, Math.min(maxTricks, bid + Math.floor((randomFactor - 0.4) * 3)));
    default:
      return Math.floor(randomFactor * Math.min(maxTricks, bid + 2));
  }
}

// Create preset auto game for testing
export function createPresetAutoGame(status: 'new' | 'bidding' | 'playing' = 'new'): Game {
  const gameId = 'AUTO';
  const hostId = 'auto_host_001';
  
  const game: Game = {
    id: gameId,
    code: gameId,
    title: 'Auto Game',
    description: 'Automated game for testing',
    hostName: 'Human Player',
    hostId: hostId,
    status: status === 'new' ? 'lobby' : status as any,
    state: status === 'new' ? 'lobby' : status,
    maxPlayers: 4,
    currentRound: status === 'new' ? 0 : 1,
    maxRounds: 13,
    totalRounds: 13,
    players: {
      [hostId]: {
        id: hostId,
        name: 'Human Player',
        team: 'team1', // Always lowercase to avoid mobile capitalization issues
        status: 'active',
        bid: null,
        tricks: 0,
        score: 0,
        roundScores: [],
        lastActivity: Date.now(),
        isHost: true,
        isComputer: false,
        isTeamLeader: true
      },
      'auto_comp_001': {
        id: 'auto_comp_001',
        name: 'Rookie Bot',
        team: 'team1', // Always lowercase to avoid mobile capitalization issues
        status: 'active',
        bid: null,
        tricks: 0,
        score: 0,
        roundScores: [],
        lastActivity: Date.now(),
        isHost: false,
        isComputer: true,
        isTeamLeader: false,
        personality: 'conservative'
      },
      'auto_comp_002': {
        id: 'auto_comp_002',
        name: 'Strategic Sam',
        team: 'team2', // Always lowercase to avoid mobile capitalization issues
        status: 'active',
        bid: null,
        tricks: 0,
        score: 0,
        roundScores: [],
        lastActivity: Date.now(),
        isHost: false,
        isComputer: true,
        isTeamLeader: true,
        personality: 'smart'
      },
      'auto_comp_003': {
        id: 'auto_comp_003',
        name: 'Aggressive Alice',
        team: 'team2', // Always lowercase to avoid mobile capitalization issues
        status: 'active',
        bid: null,
        tricks: 0,
        score: 0,
        roundScores: [],
        lastActivity: Date.now(),
        isHost: false,
        isComputer: true,
        isTeamLeader: false,
        personality: 'aggressive'
      }
    },
    rounds: [],
    roundScores: {},
    gameMode: 'teams',
    teamConfig: {
      gameMode: 'teams',
      numberOfTeams: 2,
      playersPerTeam: 2,
      autoAssignTeams: true
    },
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  
  // Initialize first round if not in lobby
  if (status !== 'new') {
    game.rounds.push({
      round: 1,
      bids: {},
      tricks: {},
      scores: {},
      status: status as any
    });
  }
  
  return game;
}

// Helper to get all game files
export async function getAllGameFiles(): Promise<string[]> {
  const files = await storage.listFiles('games/');
  return files.filter(file => file.endsWith('.json')).map(file => 
    file.replace('games/', '').replace('.json', '')
  );
}

// Helper to get all player files
export async function getAllPlayerFiles(): Promise<string[]> {
  const files = await storage.listFiles('players/');
  return files.filter(file => file.endsWith('.json')).map(file => 
    file.replace('players/', '').replace('.json', '')
  );
}

// Fix game data structure issues
export function fixGameDataStructure(game: Game): Game {
  // Ensure scores object exists
  if (!game.scores) {
    game.scores = {};
  }
  
  // Ensure roundScores object exists
  if (!game.roundScores) {
    game.roundScores = {};
  }
  
  // Fix team naming consistency (normalize to lowercase)
  // This handles mobile auto-capitalization and ensures consistency across all devices
  Object.values(game.players).forEach(player => {
    if (player.team) {
      // Normalize team names to lowercase for consistency
      // Mobile devices auto-capitalize, so we need to handle both "Team1" and "team1"
      player.team = player.team.toLowerCase();
    }
  });
  
  // Recalculate scores for completed rounds
  game.rounds.forEach((round, index) => {
    if (round.status === 'completed' || round.status === 'review' || round.status === 'reviewing') {
      const roundNumber = index + 1;
      calculateRoundScores(game, roundNumber);
    }
  });
  
  return game;
}

// Find active games for a player
export async function findPlayerActiveGames(playerName: string): Promise<Array<{
  gameId: string;
  game: Game;
  playerId: string;
  player: Player;
}>> {
  const activeGames: Array<{
    gameId: string;
    game: Game;
    playerId: string;
    player: Player;
  }> = [];
  
  try {
    const gameFiles = await getAllGameFiles();
    
    for (const gameId of gameFiles) {
      try {
        const game = await loadGameFromFile(gameId);
        if (!game) continue;
        
        // Check if game is active (not completed or cancelled)
        if (game.status === 'completed' || game.status === 'cancelled') continue;
        
        // Find player in this game
        for (const [playerId, player] of Object.entries(game.players)) {
          if (player.name.toLowerCase() === playerName.toLowerCase()) {
            activeGames.push({
              gameId,
              game,
              playerId,
              player
            });
            break; // Found player in this game, move to next game
          }
        }
      } catch (error) {
        console.warn(`Failed to load game ${gameId}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error('Error finding active games:', error);
  }
  
  return activeGames;
}

// Calculate round scores
export function calculateRoundScores(game: Game, roundNumber: number): void {
  const round = game.rounds[roundNumber - 1];
  if (!round || (round.status !== 'completed' && round.status !== 'review' && round.status !== 'reviewing')) return;
  
  round.scores = {};
  
  // Initialize team scores if not exists
  if (!game.scores) game.scores = {};
  
  Object.keys(game.players).forEach(playerId => {
    const player = game.players[playerId];
    const bid = round.bids[playerId] || 0;
    const tricks = round.tricks[playerId] || 0;
    
    // Use backend scoring logic
    let score = 0;
    
    // Nil bid rules
    if (bid === 0) {
      score = tricks; // Bid 0: get 0 points if win 0 tricks, get number of tricks if win any
    }
    // Made bid exactly
    else if (tricks === bid) {
      score = bid * 10; // Made bid = 10 × bid value
    }
    // Overtricks (bags)
    else if (tricks > bid) {
      score = (bid * 10) + (tricks - bid); // Made bid + 1 point per extra trick
    }
    // Failed bid
    else {
      score = (tricks * 10) - ((bid - tricks) * 10);
    }
    
    round.scores[playerId] = score;
    player.score += score;
    if (!player.roundScores) player.roundScores = [];
    player.roundScores.push(score);
    
    // Update team scores
    if (player.team && game.scores) {
      const teamKey = player.team; // Use exact team name from player data
      if (!game.scores[teamKey]) game.scores[teamKey] = 0;
      game.scores[teamKey] += score;
    }
  });
  
  // Store in roundScores for easy access
  if (!game.roundScores) game.roundScores = {};
  game.roundScores[roundNumber] = { ...round.scores };
} 