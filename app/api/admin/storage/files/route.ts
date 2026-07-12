import { NextRequest, NextResponse } from 'next/server'
import { getSmartBackendUrl } from '@/lib/backend-config'

interface FileInfo {
  key: string
  size: number
  lastModified: string
  type: string
}

interface StorageStats {
  totalFiles: number
  totalSize: number
  totalSizeFormatted: string
  gameFiles: number
  gameSize: number
  gameSizeFormatted: string
  playerFiles: number
  playerSize: number
  playerSizeFormatted: string
  profileFiles: number
  profileSize: number
  profileSizeFormatted: string
  sessionFiles: number
  sessionSize: number
  sessionSizeFormatted: string
  otherFiles: number
  otherSize: number
  otherSizeFormatted: string
  lastSync: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Removed getFileSize function - backend provides file sizes directly

export async function GET(request: NextRequest) {
  try {
    console.log('📝 Storage Admin: Fetching files from backend (Docker volumes)')
    
    // Call backend API to get files from Docker volumes
    const backendUrl = await getSmartBackendUrl()
    const backendApiUrl = backendUrl ? `${backendUrl}/api/admin/storage/files` : 'http://backend:3001/api/admin/storage/files'
    
    console.log(`📡 Calling backend: ${backendApiUrl}`)
    
    const backendResponse = await fetch(backendApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`)
    }
    
    const backendData = await backendResponse.json()
    console.log(`✅ Backend returned ${backendData.files?.length || 0} files`)
    
    // Transform backend response to match frontend format
    const allFiles = backendData.files || []
    console.log(`📊 Found ${allFiles.length} files in Docker volumes`)
    
    // Backend already provides formatted files and stats
    const formattedFiles: FileInfo[] = allFiles.map((file: any) => ({
      key: file.key || file.path || file.name,
      size: file.size || 0,
      lastModified: file.lastModified || file.modified || new Date().toISOString(),
      type: file.type || 'other'
    }))
    
    // Use backend stats if available, otherwise calculate from files
    const stats: StorageStats = backendData.stats ? {
      totalFiles: backendData.stats.totalFiles || formattedFiles.length,
      totalSize: backendData.stats.totalSize || formattedFiles.reduce((sum, f) => sum + f.size, 0),
      totalSizeFormatted: formatBytes(backendData.stats.totalSize || formattedFiles.reduce((sum, f) => sum + f.size, 0)),
      gameFiles: backendData.stats.gameFiles || formattedFiles.filter(f => f.type === 'game').length,
      gameSize: 0, // Backend doesn't provide size breakdown
      gameSizeFormatted: '0 B',
      playerFiles: backendData.stats.playerFiles || formattedFiles.filter(f => f.type === 'player').length,
      playerSize: 0,
      playerSizeFormatted: '0 B',
      profileFiles: backendData.stats.profileFiles || formattedFiles.filter(f => f.type === 'profile').length,
      profileSize: 0,
      profileSizeFormatted: '0 B',
      sessionFiles: 0,
      sessionSize: 0,
      sessionSizeFormatted: '0 B',
      otherFiles: backendData.stats.leaderboardFiles || formattedFiles.filter(f => f.type === 'other').length,
      otherSize: 0,
      otherSizeFormatted: '0 B',
      lastSync: backendData.stats.lastSync || new Date().toISOString()
    } : {
      totalFiles: formattedFiles.length,
      totalSize: formattedFiles.reduce((sum, f) => sum + f.size, 0),
      totalSizeFormatted: formatBytes(formattedFiles.reduce((sum, f) => sum + f.size, 0)),
      gameFiles: formattedFiles.filter(f => f.type === 'game').length,
      gameSize: 0,
      gameSizeFormatted: '0 B',
      playerFiles: formattedFiles.filter(f => f.type === 'player').length,
      playerSize: 0,
      playerSizeFormatted: '0 B',
      profileFiles: formattedFiles.filter(f => f.type === 'profile').length,
      profileSize: 0,
      profileSizeFormatted: '0 B',
      sessionFiles: 0,
      sessionSize: 0,
      sessionSizeFormatted: '0 B',
      otherFiles: formattedFiles.filter(f => f.type === 'other').length,
      otherSize: 0,
      otherSizeFormatted: '0 B',
      lastSync: new Date().toISOString()
    }
    
    console.log(`✅ Storage Admin: Listed ${formattedFiles.length} files from Docker volumes`)
    console.log(`📊 Stats: ${stats.totalFiles} files total`)
    
    return NextResponse.json({
      success: true,
      files: formattedFiles,
      stats,
      provider: 'local' // Docker volumes = local storage
    })
    
  } catch (error) {
    console.error('❌ Storage files error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch storage files',
        files: [],
        stats: null 
      },
      { status: 500 }
    )
  }
} 