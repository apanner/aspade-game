// 📱 Mobile Utilities
// Handles full-screen mode and mobile-specific features

export class MobileUtils {
  private static isFullScreen = false

  // Check if device is mobile
  static isMobile(): boolean {
    if (typeof window === 'undefined') return false
    
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768
  }

  // Check if device is iOS
  static isIOS(): boolean {
    if (typeof window === 'undefined') return false
    
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }

  // Check if device is Android
  static isAndroid(): boolean {
    if (typeof window === 'undefined') return false
    
    return /Android/.test(navigator.userAgent)
  }

  // Request full-screen mode
  static async requestFullScreen(): Promise<boolean> {
    if (typeof document === 'undefined') return false

    try {
      const element = document.documentElement

      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen()
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen()
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen()
      }

      this.isFullScreen = true
      return true
    } catch (error) {
      console.warn('Failed to enter full-screen mode:', error)
      return false
    }
  }

  // Exit full-screen mode
  static async exitFullScreen(): Promise<boolean> {
    if (typeof document === 'undefined') return false

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen()
      }

      this.isFullScreen = false
      return true
    } catch (error) {
      console.warn('Failed to exit full-screen mode:', error)
      return false
    }
  }

  // Check if currently in full-screen mode
  static isInFullScreen(): boolean {
    if (typeof document === 'undefined') return false

    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    )
  }

  // Toggle full-screen mode
  static async toggleFullScreen(): Promise<boolean> {
    if (this.isInFullScreen()) {
      return await this.exitFullScreen()
    } else {
      return await this.requestFullScreen()
    }
  }

  // Lock screen orientation (mobile only)
  static async lockOrientation(orientation: 'portrait' | 'landscape'): Promise<boolean> {
    if (typeof screen === 'undefined' || !screen.orientation) return false

    try {
      // Type assertion to handle TypeScript type mismatch
      await (screen.orientation as any).lock(orientation)
      return true
    } catch (error) {
      console.warn('Failed to lock orientation:', error)
      return false
    }
  }

  // Unlock screen orientation
  static async unlockOrientation(): Promise<boolean> {
    if (typeof screen === 'undefined' || !screen.orientation) return false

    try {
      // Type assertion to handle TypeScript type mismatch
      await (screen.orientation as any).unlock()
      return true
    } catch (error) {
      console.warn('Failed to unlock orientation:', error)
      return false
    }
  }

  // Add mobile-specific CSS classes
  static addMobileClasses(): void {
    if (typeof document === 'undefined') return

    const html = document.documentElement
    const body = document.body

    // Add mobile classes
    html.classList.add('mobile-device')
    body.classList.add('mobile-device')

    if (this.isIOS()) {
      html.classList.add('ios-device')
      body.classList.add('ios-device')
    }

    if (this.isAndroid()) {
      html.classList.add('android-device')
      body.classList.add('android-device')
    }
  }

  // Remove mobile-specific CSS classes
  static removeMobileClasses(): void {
    if (typeof document === 'undefined') return

    const html = document.documentElement
    const body = document.body

    html.classList.remove('mobile-device', 'ios-device', 'android-device')
    body.classList.remove('mobile-device', 'ios-device', 'android-device')
  }

  // Prevent zoom on mobile
  static preventZoom(): void {
    if (typeof document === 'undefined') return

    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    }
  }

  // Enable zoom on mobile
  static enableZoom(): void {
    if (typeof document === 'undefined') return

    const viewport = document.querySelector('meta[name="viewport"]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
    }
  }

  // Hide mobile browser UI (iOS Safari)
  static hideMobileUI(): void {
    if (typeof document === 'undefined') return

    // Add classes to hide mobile UI
    document.documentElement.classList.add('hide-mobile-ui')
    document.body.classList.add('hide-mobile-ui')
  }

  // Show mobile browser UI
  static showMobileUI(): void {
    if (typeof document === 'undefined') return

    document.documentElement.classList.remove('hide-mobile-ui')
    document.body.classList.remove('hide-mobile-ui')
  }
}

// Export singleton instance
export default MobileUtils
