"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

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

const setCookie = (name: string, value: string, days = 30) => {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/;`
}

const getCookie = (name: string): string | null => {
  const nameEQ = `${name}=`
  const ca = document.cookie.split(";")
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === " ") c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cookieUser = getCookie("guestUser")
    if (cookieUser) {
      try {
        const parsed = JSON.parse(cookieUser)
        if (parsed?.name) {
          setUser(parsed)
          setLoading(false)
          return
        }
      } catch {
        deleteCookie("guestUser")
      }
    }

    const legacyName = localStorage.getItem("playerName")
    if (legacyName) {
      const guestUser: User = {
        id: Math.random().toString(36).slice(2, 11),
        name: legacyName,
        email: "guest@aspade.online",
        isGuest: true,
      }
      setUser(guestUser)
      setCookie("guestUser", JSON.stringify(guestUser))
    }

    setLoading(false)
  }, [])

  const signInAsGuest = (name: string) => {
    const guestUser: User = {
      id: Math.random().toString(36).slice(2, 11),
      name: name.trim(),
      email: "guest@aspade.online",
      isGuest: true,
    }
    setUser(guestUser)
    setCookie("guestUser", JSON.stringify(guestUser))
    localStorage.setItem("playerName", guestUser.name)
  }

  const signOut = () => {
    setUser(null)
    deleteCookie("guestUser")
    localStorage.removeItem("playerName")
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
