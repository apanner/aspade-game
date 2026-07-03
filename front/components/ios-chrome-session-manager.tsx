"use client"

import { useEffect, useRef } from 'react'
import { sessionStorage } from '@/lib/api'

export function IOSChromeSessionManager() {
  const sessionRefreshInterval = useRef<NodeJS.Timeout | null>(null)
  const visibilityRefreshTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if it's iPhone Chrome browser
    const isIPhoneChrome = typeof window !== 'undefined' && 
      /iPhone|iPad|iPod/.test(navigator.userAgent) && 
      /CriOS/.test(navigator.userAgent)
    
    if (!isIPhoneChrome) {
      return // Only run for iOS Chrome
    }

    console.log('📱 iOS Chrome Session Manager: Initializing...')

    // Function to refresh session
    const refreshSession = async () => {
      try {
        const session = await sessionStorage.getPlayerSession()
        if (session && session.gameId) {
          console.log('📱 iOS Chrome: Refreshing session for game:', session.gameId)
          
          // Update session timestamp
          await sessionStorage.savePlayerSession(
            session.gameId,
            session.playerId,
            session.playerName
          )
        }
      } catch (error) {
        console.warn('📱 iOS Chrome: Failed to refresh session:', error)
      }
    }

    // Handle page visibility changes (when user switches apps and returns)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 iOS Chrome: Page became visible, refreshing session...')
        
        // Clear any existing timeout
        if (visibilityRefreshTimeout.current) {
          clearTimeout(visibilityRefreshTimeout.current)
        }
        
        // Refresh session after a short delay to ensure everything is loaded
        visibilityRefreshTimeout.current = setTimeout(() => {
          refreshSession()
        }, 500)
      }
    }

    // Handle focus events (when user returns to the tab)
    const handleFocus = () => {
      console.log('📱 iOS Chrome: Window focused, refreshing session...')
      refreshSession()
    }

    // Handle beforeunload (when user is about to leave)
    const handleBeforeUnload = () => {
      console.log('📱 iOS Chrome: Page unloading, ensuring session is saved...')
      refreshSession()
    }

    // Set up periodic session refresh (every 2 minutes)
    sessionRefreshInterval.current = setInterval(() => {
      if (!document.hidden) {
        refreshSession()
      }
    }, 120000) // 2 minutes

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Initial session refresh
    refreshSession()

    console.log('📱 iOS Chrome Session Manager: Setup complete')

    // Cleanup function
    return () => {
      console.log('📱 iOS Chrome Session Manager: Cleaning up...')
      
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current)
      }
      
      if (visibilityRefreshTimeout.current) {
        clearTimeout(visibilityRefreshTimeout.current)
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // This component doesn't render anything
  return null
}
