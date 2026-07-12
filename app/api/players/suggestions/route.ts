import { NextRequest, NextResponse } from 'next/server'
import { storage } from '../../../../lib/storage-gateway'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = (searchParams.get('q') || '').trim().toLowerCase()

    if (query.length < 3) {
      return NextResponse.json({ suggestions: [] })
    }

    const profileFiles = await storage.listFiles('player_profiles/')
    const suggestions: string[] = []

    for (const file of profileFiles) {
      if (!file.endsWith('.json')) continue
      try {
        const profileData = await storage.loadFile(file)
        const profile =
          typeof profileData === 'string' ? JSON.parse(profileData) : profileData
        if (profile?.name && String(profile.name).toLowerCase().includes(query)) {
          suggestions.push(profile.name)
        }
      } catch {
        continue
      }
    }

    suggestions.sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      if (aLower === query) return -1
      if (bLower === query) return 1
      if (aLower.startsWith(query) && !bLower.startsWith(query)) return -1
      if (bLower.startsWith(query) && !aLower.startsWith(query)) return 1
      return a.localeCompare(b)
    })

    const unique = [...new Set(suggestions.map((s) => s.trim()).filter(Boolean))]

    return NextResponse.json({ suggestions: unique.slice(0, 5) })
  } catch (error) {
    console.error('Error getting player suggestions:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
