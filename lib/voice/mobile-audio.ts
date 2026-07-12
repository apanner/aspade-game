export type VoiceBrowserKind =
  | 'ios-safari'
  | 'ios-chrome'
  | 'ios-firefox'
  | 'android-chrome'
  | 'android-firefox'
  | 'desktop'
  | 'unknown'

export function detectVoiceBrowser(): VoiceBrowserKind {
  if (typeof navigator === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isIOS) {
    if (/CriOS/.test(ua)) return 'ios-chrome'
    if (/FxiOS/.test(ua)) return 'ios-firefox'
    if (/Safari/.test(ua)) return 'ios-safari'
    return 'ios-safari'
  }

  if (/Android/.test(ua)) {
    if (/Firefox/.test(ua)) return 'android-firefox'
    return 'android-chrome'
  }

  return 'desktop'
}

export function isSecureVoiceContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext === true
}

let sharedAudioContext: AudioContext | null = null

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioCtx()
  }
  return sharedAudioContext
}

/** Must run inside a user tap/click — unlocks iOS Safari & Android Chrome audio output. */
export async function unlockVoiceAudio(): Promise<void> {
  const ctx = getSharedAudioContext()
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume()
  }

  const silent = document.createElement('audio')
  silent.setAttribute('playsinline', 'true')
  silent.setAttribute('webkit-playsinline', 'true')
  silent.muted = true
  silent.src =
    'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
  silent.volume = 0
  document.body.appendChild(silent)
  try {
    await silent.play()
  } catch {
    // Some browsers block even silent play without gesture — caller is in gesture.
  } finally {
    silent.pause()
    silent.remove()
  }
}

export function configureMobileAudioElement(audio: HTMLAudioElement): void {
  audio.autoplay = true
  audio.setAttribute('autoplay', 'true')
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
  ;(audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true
  audio.volume = 1
}

export async function playRemoteAudioElement(audio: HTMLAudioElement): Promise<void> {
  configureMobileAudioElement(audio)
  try {
    await audio.play()
  } catch {
    await unlockVoiceAudio()
    try {
      await audio.play()
    } catch {
      // Remote audio may start after next user gesture.
    }
  }
}

export function micPermissionHint(
  browser: VoiceBrowserKind,
  permission: 'granted' | 'denied' | 'prompt' | 'unsupported'
): string {
  if (permission === 'unsupported') {
    return 'Voice needs HTTPS and a modern browser (Safari 14.3+ or Chrome).'
  }

  if (permission === 'denied') {
    switch (browser) {
      case 'ios-safari':
        return 'Settings → Safari → Microphone → Allow for this site, then reload.'
      case 'ios-chrome':
        return 'iOS Settings → Chrome → Microphone → Allow, then reload.'
      case 'android-chrome':
        return 'Tap the lock icon in the address bar → Permissions → Allow microphone.'
      default:
        return 'Allow microphone in your browser site settings, then reload.'
    }
  }

  switch (browser) {
    case 'ios-safari':
    case 'ios-chrome':
      return 'Tap Allow when iOS asks for microphone access.'
    case 'android-chrome':
      return 'Tap Allow when Chrome asks for microphone access.'
    default:
      return 'Tap Allow when your browser asks for microphone access.'
  }
}
