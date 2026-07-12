import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [mobileDebug, setMobileDebug] = React.useState<any>({})

  React.useEffect(() => {
    const checkMobile = () => {
      // Enhanced mobile detection with iOS Safari support
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|CriOS|FxiOS|Safari/i.test(navigator.userAgent)
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT || window.innerHeight <= 600
      const hasTouch = 'ontouchstart' in window
      const hasTouchPoints = navigator.maxTouchPoints > 0
      
      // iOS Safari specific detection
      const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                         /Safari/.test(navigator.userAgent) && 
                         !/CriOS|FxiOS/.test(navigator.userAgent)
      
      const mobileResult = isMobileDevice || isSmallScreen || hasTouch || hasTouchPoints
      
      // Debug information
      const debugInfo = {
        userAgent: navigator.userAgent,
        isMobile: mobileResult,
        isIOSSafari,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        hasTouch,
        maxTouchPoints: navigator.maxTouchPoints,
        platform: navigator.platform,
        isMobileDevice,
        isSmallScreen,
        hasTouchPoints
      }
      
      console.log(`📱 useIsMobile Debug:`, debugInfo)
      setMobileDebug(debugInfo)
      setIsMobile(mobileResult)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = checkMobile
    
    mql.addEventListener("change", onChange)
    checkMobile()
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return { isMobile: !!isMobile, debug: mobileDebug }
}
