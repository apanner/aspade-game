"use client"

import { useState, useEffect } from 'react'
import { MobileUtils } from '@/lib/mobile-utils'

interface MobileGameWrapperProps {
  children: React.ReactNode
}

export function MobileGameWrapper({ 
  children 
}: MobileGameWrapperProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    // Check if device is mobile
    const mobile = MobileUtils.isMobile()
    setIsMobile(mobile)

    // Get screen dimensions
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)

      if (mobile) {
    // Add mobile-specific classes
    MobileUtils.addMobileClasses()
    
    // Prevent zoom on mobile
    MobileUtils.preventZoom()
    
    // Auto-hide controls after 2 seconds (faster)
    const timer = setTimeout(() => {
      setShowControls(false)
    }, 2000)

      return () => {
        clearTimeout(timer)
        MobileUtils.removeMobileClasses()
        MobileUtils.enableZoom()
        window.removeEventListener('resize', updateScreenSize)
      }
    }

    return () => {
      window.removeEventListener('resize', updateScreenSize)
    }
  }, [])

  const handleTouchStart = () => {
    // Show controls on touch
    setShowControls(true)
    setTimeout(() => setShowControls(false), 3000)
  }

  if (!isMobile) {
    return <>{children}</>
  }

  // Check if it's a large mobile screen (iPhone Pro Max, etc.)
  const isLargeMobile = screenSize.width >= 428 || screenSize.height >= 926

  return (
    <div 
      className={`
        mobile-game-container mobile-safe-area
        ${isLargeMobile ? 'large-mobile-optimized' : ''}
      `}
      onTouchStart={handleTouchStart}
      style={{ 
        paddingBottom: isLargeMobile ? '120px' : '80px', // Extra padding for floating elements
        overflow: 'visible' // FIXED: Ensure scrolling works
      }}
    >
      {/* Game Content with improved scrolling */}
      <div className={`
        w-full relative
        ${isLargeMobile ? 'max-w-2xl mx-auto' : ''}
        ${isLargeMobile ? 'px-4' : ''}
      `}>
        {children}
      </div>

      {/* Mobile Instructions - Completely hidden for cleaner look */}
      {/* Removed the blue instruction text to make the interface cleaner */}

      {/* Large screen optimization indicator */}
      {isLargeMobile && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs">
            Large Screen Mode
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for mobile game features
export function useMobileGame() {
  const [isMobile, setIsMobile] = useState(false)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    setIsMobile(MobileUtils.isMobile())
    
    const updateScreenSize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)

    return () => {
      window.removeEventListener('resize', updateScreenSize)
    }
  }, [])

  const showMobileNotification = (message: string, duration = 2000) => {
    if (!isMobile) return

    const notification = document.createElement('div')
    notification.className = 'mobile-notification'
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, duration)
  }

  const isLargeMobile = screenSize.width >= 428 || screenSize.height >= 926

  return {
    isMobile,
    isLargeMobile,
    screenSize,
    showMobileNotification
  }
}
