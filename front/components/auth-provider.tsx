"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import apiService from '@/lib/api-service'
import { forceEnvironmentConnection } from '@/lib/backend-config'

interface User {
  id: string
  name: string
  email: string
  isGuest: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signInAsGuest: (name: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cookie utilities
const setCookie = (name: string, value: string, days: number = 30) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/;`
}

const getCookie = (name: string): string | null => {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

// Register player with server
const registerPlayer = async (name: string, playerId: string) => {
  try {
    await apiService.playerRegister({ 
      playerId, 
      name, 
      joinedAt: Date.now(),
      isOnline: true 
    })
  } catch (error) {
    console.error('Failed to register player:', error)
  }
}

// Update player status
const updatePlayerStatus = async (playerId: string, isOnline: boolean) => {
  try {
    await apiService.playerStatus({ playerId, isOnline, lastSeen: Date.now() })
  } catch (error) {
    console.error('Failed to update player status:', error)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Force environment connection for development
    forceEnvironmentConnection()
    
    // Check for existing guest user in cookies first, then server storage
    const checkExistingUser = async () => {
      const cookieUser = getCookie('guestUser')
      const cookieUserId = getCookie('guestUserId')
      
      let savedUser = null
      
      if (cookieUser) {
        try {
          savedUser = JSON.parse(cookieUser)
        } catch (error) {
          console.error('Error parsing cookie user:', error)
        }
      } else if (cookieUserId) {
        // Try to load user from server using userId
        try {
          const response = await apiService.getUser({ userId: cookieUserId })
          
          if (response.success && response.user) {
            savedUser = response.user
            // Update cookie with full user data
            setCookie('guestUser', JSON.stringify(savedUser))
          }
        } catch (error) {
          console.error('Error loading user from server:', error)
        }
      } else {
        // Check localStorage for migration (legacy support)
        try {
          const localStorageUser = localStorage.getItem('guestUser')
          if (localStorageUser) {
            savedUser = JSON.parse(localStorageUser)
                      // Don't migrate to server storage - let the login API handle profile creation
          // This prevents duplicate files in users/ folder
          setCookie('guestUserId', savedUser.id)
          setCookie('guestUser', localStorageUser)
          localStorage.removeItem('guestUser')
          console.log('✅ Migrated user from localStorage to cookies only')
          }
        } catch (error) {
          console.error('Error migrating from localStorage:', error)
        }
      }

      if (savedUser && savedUser.name) {
        setUser(savedUser)
        // Don't register player here - let the login API handle profile creation
        // This prevents duplicate files in players/ folder
      }
      
      setLoading(false)
    }

    checkExistingUser()
  }, [])

  // Update player status when window becomes visible/hidden
  useEffect(() => {
    if (!user) return

    let lastHeartbeat = 0
    const HEARTBEAT_THROTTLE = 30000 // 30 seconds minimum between heartbeats

    const handleVisibilityChange = () => {
      const isOnline = !document.hidden
      updatePlayerStatus(user.id, isOnline)
    }

    const handleBeforeUnload = () => {
      updatePlayerStatus(user.id, false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Send heartbeat every 2 minutes (less frequent)
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden) {
        const now = Date.now()
        if (now - lastHeartbeat >= HEARTBEAT_THROTTLE) {
          lastHeartbeat = now
          updatePlayerStatus(user.id, true)
        }
      }
    }, 120000) // 2 minutes

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(heartbeatInterval)
    }
  }, [user])

  const signInAsGuest = async (name: string) => {
    const guestUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      email: `guest@aspade.online`,
      isGuest: true,
    }
    
    setUser(guestUser)
    
    // Don't save user to server storage - let the login API handle profile creation
    // This prevents duplicate files in users/ folder
    try {
      // Save user data and userId to cookies only
      const userString = JSON.stringify(guestUser)
      setCookie('guestUser', userString)
      setCookie('guestUserId', guestUser.id)
      console.log('✅ User saved to cookies only')
    } catch (error) {
      console.error('❌ User save error:', error)
      // Fallback to localStorage
      localStorage.setItem('guestUser', JSON.stringify(guestUser))
    }
    
    // Don't register player on server - let the login API handle profile creation
    // This prevents duplicate files in players/ folder
  }

  const signOut = () => {
    if (user) {
      // Update player status to offline
      updatePlayerStatus(user.id, false)
    }
    
    setUser(null)
    deleteCookie('guestUser')
    deleteCookie('guestUserId')
    localStorage.removeItem('guestUser') // Legacy cleanup
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 