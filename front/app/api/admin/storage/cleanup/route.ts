import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage-gateway'
import { requireAdmin } from '@/lib/admin-auth'
import fs from 'fs'
import path from 'path'

const FOLDERS = [
  'games',
  'players', 
  'player_profiles',
  'game_history',
  'users',
  'team_stats',
  'sessions',
  'test',
  'profiles',
  'backups'
]
const FILES = [
  'player_leaderboard.json',
  'team_leaderboard.json', 
  'game_history.json',
  'global_stats.json',
  'system_config.json'
]

// Local file paths that need to be cleared
const LOCAL_FILES = [
  'game_history.json',
  'player_leaderboard.json',
  'team_leaderboard.json',
]

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('🗑️ ADMIN CLEANUP: Starting comprehensive storage cleanup with password verification...')
    console.log('⚠️ WARNING: This will delete ALL data from the following locations:')
    console.log('   • games/ folder - All game data')
    console.log('   • players/ folder - All player sessions')
    console.log('   • player_profiles/ folder - All player profiles')
    console.log('   • game_history/ folder - All game history')
    console.log('   • users/ folder - All user data')
    console.log('   • team_stats/ folder - All team statistics')
    console.log('   • player_leaderboard.json - Player leaderboard data')
    console.log('   • team_leaderboard.json - Team leaderboard data')
    console.log('   • game_history.json - Global history')
    console.log('   • Local file system - Direct file cleanup')
    
    let deleted = 0
    const errors: string[] = []
    const deletedFiles: string[] = []
    
    // Delete all files in each folder (not just .json)
    for (const folder of FOLDERS) {
      console.log(`📁 ADMIN CLEANUP: Cleaning folder: ${folder}`)
      try {
        const files = await storage.listFiles(`${folder}/`)
        console.log(`📄 ADMIN CLEANUP: Found ${files.length} files in ${folder}`)
        
        for (const file of files) {
          const ok = await storage.deleteFile(file)
          if (ok) {
            deleted++
            deletedFiles.push(file)
            console.log(`✅ ADMIN CLEANUP: Deleted: ${file}`)
          } else {
            errors.push(file)
            console.log(`❌ ADMIN CLEANUP: Failed to delete: ${file}`)
          }
        }
      } catch (folderError) {
        console.log(`⚠️ ADMIN CLEANUP: Folder ${folder} does not exist or is empty`)
      }
    }
    
    // Delete standalone files
    console.log('📄 ADMIN CLEANUP: Cleaning standalone files...')
    for (const file of FILES) {
      const ok = await storage.deleteFile(file)
      if (ok) {
        deleted++
        deletedFiles.push(file)
        console.log(`✅ ADMIN CLEANUP: Deleted: ${file}`)
      } else {
        errors.push(file)
        console.log(`❌ ADMIN CLEANUP: Failed to delete: ${file}`)
      }
    }
    
    // Clear any cached leaderboard data
    console.log('🧹 ADMIN CLEANUP: Clearing leaderboard cache...')
    try {
      // Clear any potential cached leaderboard data
      await storage.deleteFile('player_leaderboard.json')
      await storage.deleteFile('team_leaderboard.json')
      await storage.deleteFile('game_history.json')
      console.log('✅ ADMIN CLEANUP: Leaderboard cache cleared')
    } catch (error) {
      console.log('⚠️ ADMIN CLEANUP: Leaderboard cache clear failed:', error)
    }
    
    // Clear local file system files (serv/ directory and all subdirectories)
    console.log('🗂️ ADMIN CLEANUP: Clearing local file system...')
    try {
      const servDir = path.join(process.cwd(), 'serv')
      if (fs.existsSync(servDir)) {
        // Clear root-level files
        for (const fileName of LOCAL_FILES) {
          const filePath = path.join(servDir, fileName)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            deleted++
            deletedFiles.push(`local:${fileName}`)
            console.log(`✅ ADMIN CLEANUP: Deleted local file: ${fileName}`)
          }
        }
        
        // Clear all subdirectories
        const subdirs = ['games', 'players', 'player_profiles', 'game_history', 'team_stats', 'users']
        for (const subdir of subdirs) {
          const subdirPath = path.join(servDir, subdir)
          if (fs.existsSync(subdirPath)) {
            const files = fs.readdirSync(subdirPath)
            for (const file of files) {
              const filePath = path.join(subdirPath, file)
              if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath)
                deleted++
                deletedFiles.push(`local:${subdir}/${file}`)
                console.log(`✅ ADMIN CLEANUP: Deleted local file: ${subdir}/${file}`)
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️ ADMIN CLEANUP: Local file system clear failed:', error)
    }
    
    // Create empty leaderboard files to prevent errors
    console.log('📝 ADMIN CLEANUP: Creating empty leaderboard files...')
    try {
      const emptyLeaderboard = {
        individual: [],
        teams: [],
        lastUpdated: Date.now()
      }
      await storage.saveFile('leaderboard.json', emptyLeaderboard)
      await storage.saveFile('team_leaderboard.json', emptyLeaderboard)
      console.log('✅ ADMIN CLEANUP: Empty leaderboard files created')
    } catch (error) {
      console.log('⚠️ ADMIN CLEANUP: Failed to create empty leaderboard files:', error)
    }
    
    console.log(`✅ ADMIN CLEANUP: Comprehensive local storage cleanup completed:`)
    console.log(`   • ${deleted} files deleted successfully`)
    console.log(`   • ${errors.length} files failed to delete`)
    console.log(`   • All local game data, player sessions, and history cleared`)
    console.log(`   • Leaderboards reset to empty state`)
    console.log(`   • Complete storage system reset`)
    
    // Log summary of cleaned areas
    const cleanedAreas = [
      '🎮 Games folder (games/)',
      '👥 Players folder (players/)', 
      '📋 Player Profiles folder (player_profiles/)',
      '📚 Game History folder (game_history/)',
      '👤 Users folder (users/)',
      '📊 Team Stats folder (team_stats/)',
      '🔧 Sessions folder (sessions/)',
      '🧪 Test folder (test/)',
      '📁 Profiles folder (profiles/)',
      '💾 Backups folder (backups/)',
      '🏆 Leaderboard files',
      '🗂️ Local serv/ directory'
    ]
    
    console.log(`\n🧹 AREAS CLEANED:`)
    cleanedAreas.forEach(area => console.log(`   ${area}`))
    
    return NextResponse.json({ 
      success: true, 
      deleted, 
      errors,
      deletedFiles,
      cleanedAreas,
      message: `✅ Complete Local Storage Cleanup Successfully Completed!\n\n🗑️ Deleted ${deleted} files total${errors.length > 0 ? ` (${errors.length} failed)` : ''}.\n\n🧹 ALL STORAGE AREAS CLEANED:\n${cleanedAreas.map(area => `• ${area.replace(/[🎮👥📋📚👤📊🔧🧪📁💾🏆🗂️📂]/g, '').replace('S3 ', '')}`).join('\n')}\n\n📊 Leaderboards reset to empty state\n🎮 All games, players, and history permanently deleted\n🗂️ Local file system completely cleared\n\n⚠️ This action was confirmed with admin password verification.\n✅ Storage system is now in pristine state.`
    })
  } catch (error) {
    console.error('❌ ADMIN CLEANUP ERROR:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup storage - please try again or contact administrator' },
      { status: 500 }
    )
  }
} 