import { NextRequest, NextResponse } from 'next/server'
import { 
  getAllGameFiles,
  loadGameFromFile
} from '../../../../lib/game-utils'
import { storage } from '../../../../lib/storage-gateway'

export async function POST(request: NextRequest) {
  try {
    console.log(`🔄 Starting leaderboard update...`)
    
    // Get all game files
    const allGameIds = await getAllGameFiles()
    const playerStats = new Map()
    const teamStats = new Map()
    const teamNameMapping = new Map() // Store custom team names
    
    console.log(`📊 Processing ${allGameIds.length} games for leaderboard update`)
    
    // Process all completed games
    // IMPORTANT: Team games only update team leaderboard, individual games only update player leaderboard
    for (const gameId of allGameIds) {
      const game = await loadGameFromFile(gameId)
      if (game && game.status === 'completed' && game.players) {
        
        // Calculate individual player stats ONLY for individual games
        if (game.teamConfig?.gameMode !== 'teams') {
          // Individual game - calculate player scores based on final game scores
          Object.values(game.players).forEach(player => {
            if (player.isComputer) return
            
            const playerName = player.name
            
            if (!playerStats.has(playerName)) {
              playerStats.set(playerName, {
                name: playerName,
                gamesPlayed: 0,
                gamesWon: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                winRate: 0,
                lastGame: null,
                lastActivity: null
              })
            }
            
            const stats = playerStats.get(playerName)
            stats.gamesPlayed++
            
            // Use the player's final score from the game
            const finalScore = player.score || 0
            stats.totalScore += finalScore
            stats.bestScore = Math.max(stats.bestScore, finalScore)
            stats.lastGame = gameId
            stats.lastActivity = game.lastActivity || game.createdAt
            
            // Calculate if player is winner (highest score in individual game)
            const allScores = Object.values(game.players)
              .filter(p => !p.isComputer)
              .map(p => p.score || 0)
            const maxScore = Math.max(...allScores)
            if (finalScore === maxScore && allScores.filter(s => s === maxScore).length === 1) {
              stats.gamesWon++
            }
          })
        }
        
        // Calculate team stats for team games
        if (game.teamConfig?.gameMode === 'teams') {
          // Store custom team names from this game
          if (game.teamConfigs && Array.isArray(game.teamConfigs)) {
            game.teamConfigs.forEach((config: any) => {
              if (config.id && config.name) {
                teamNameMapping.set(config.id, config.name)
              }
            })
          }
          
          // Use the actual team scores from the game
          const gameTeamScores = game.scores || {}
          const teamPlayers: Record<string, string[]> = {}
          
          // Group players by team
          Object.values(game.players).forEach(player => {
            if (player.isComputer) return
            if (player.team) {
              if (!teamPlayers[player.team]) {
                teamPlayers[player.team] = []
              }
              teamPlayers[player.team].push(player.name)
            }
          })
          
          // Find winning team based on game scores
          let winningTeam: string | null = null
          let highestScore = -Infinity
          Object.entries(gameTeamScores).forEach(([teamName, teamScore]) => {
            const score = teamScore as number || 0
            if (score > highestScore) {
              highestScore = score
              winningTeam = teamName
            }
          })
          
          // Update team stats using actual team scores
          Object.entries(gameTeamScores).forEach(([teamName, teamScore]) => {
            const finalTeamScore = teamScore as number || 0
            
            if (!teamStats.has(teamName)) {
              teamStats.set(teamName, {
                name: teamName,
                gamesPlayed: 0,
                gamesWon: 0,
                totalScore: 0,
                averageScore: 0,
                bestScore: 0,
                winRate: 0,
                players: new Set(),
                lastGame: null,
                lastActivity: null
              })
            }
            
            const stats = teamStats.get(teamName)
            stats.gamesPlayed++
            stats.totalScore += finalTeamScore
            stats.bestScore = Math.max(stats.bestScore, finalTeamScore)
            
            // Add team members
            if (teamPlayers[teamName]) {
              teamPlayers[teamName].forEach(player => stats.players.add(player))
            }
            
            stats.lastGame = gameId
            stats.lastActivity = game.lastActivity || game.createdAt
            
            if (teamName === winningTeam) {
              stats.gamesWon++
            }
          })
          
          // DO NOT update individual player stats for team games
          // Team games should only affect team leaderboard, not individual player leaderboard
        }
      }
    }
    
    // Calculate averages and win rates
    playerStats.forEach(stats => {
      stats.averageScore = Math.round(stats.totalScore / stats.gamesPlayed)
      stats.winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0
    })
    
    teamStats.forEach(stats => {
      stats.averageScore = Math.round(stats.totalScore / stats.gamesPlayed)
      stats.winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0
      stats.players = Array.from(stats.players)
    })
    
    // Sort and prepare final leaderboard data
    const playerLeaderboard = Array.from(playerStats.values())
      .sort((a, b) => {
        // Primary: Win rate (most important for competitive ranking)
        if (b.winRate !== a.winRate) return b.winRate - a.winRate
        // Secondary: Total score
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
        // Tertiary: Best score
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore
        // Quaternary: Games played (more games = higher rank)
        return b.gamesPlayed - a.gamesPlayed
      })
    
    // Process team leaderboard with custom names
    const teamLeaderboard = Array.from(teamStats.values()).map(team => {
      let displayName = team.name.replace('team', 'Team ')
      
      // Use custom team name if available
      const customName = teamNameMapping.get(team.name)
      if (customName) {
        displayName = customName
      } else {
        // Fallback to default team names
        const defaultTeamNames = ['Kings', 'Queens', 'Aces', 'Jacks']
        const teamNumber = parseInt(team.name.replace('team', '')) - 1
        displayName = defaultTeamNames[teamNumber] || displayName
      }
      
      return {
        ...team,
        name: displayName
      }
    }).sort((a, b) => {
      // Primary: Win rate (most important for competitive ranking)
      if (b.winRate !== a.winRate) return b.winRate - a.winRate
      // Secondary: Total score
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
      // Tertiary: Best score
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore
      // Quaternary: Games played (more games = higher rank)
      return b.gamesPlayed - a.gamesPlayed
    })
    
    // Save the updated leaderboard data to separate files
    const playerLeaderboardData = {
      topPlayers: playerLeaderboard,
      lastUpdated: new Date().toISOString()
    }
    
    const teamLeaderboardData = {
      topTeams: teamLeaderboard,
      lastUpdated: new Date().toISOString()
    }
    
    // Save to separate files
    await storage.saveFile('player_leaderboard.json', playerLeaderboardData)
    await storage.saveFile('team_leaderboard.json', teamLeaderboardData)
    
    console.log(`✅ Leaderboard updated: ${playerLeaderboard.length} players, ${teamLeaderboard.length} teams`)
    console.log(`📊 Sample player data:`, playerLeaderboard.slice(0, 2))
    console.log(`📊 Sample team data:`, teamLeaderboard.slice(0, 2))
    
    return NextResponse.json({
      success: true,
      message: 'Leaderboard updated successfully',
      players: playerLeaderboard.length,
      teams: teamLeaderboard.length,
      lastUpdated: playerLeaderboardData.lastUpdated
    })
    
  } catch (error) {
    console.error('Error updating leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to update leaderboard' },
      { status: 500 }
    )
  }
}
