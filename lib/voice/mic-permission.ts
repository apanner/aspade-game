import { detectVoiceBrowser, micPermissionHint, type VoiceBrowserKind } from './mobile-audio'

export type MicPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unsupported'

const MIC_CONSTRAINTS_FULL: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

type GetUserMediaFn = (constraints: MediaStreamConstraints) => Promise<MediaStream>

function resolveGetUserMedia(): GetUserMediaFn | null {
  if (typeof navigator === 'undefined') return null

  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
  }

  const legacy = navigator as Navigator & {
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      success: (stream: MediaStream) => void,
      error: (err: Error) => void
    ) => void
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      success: (stream: MediaStream) => void,
      error: (err: Error) => void
    ) => void
  }

  const legacyFn = legacy.webkitGetUserMedia ?? legacy.mozGetUserMedia
  if (!legacyFn) return null

  return (constraints: MediaStreamConstraints) =>
    new Promise<MediaStream>((resolve, reject) => {
      legacyFn.call(navigator, constraints, resolve, reject)
    })
}

export function isMicApiSupported(): boolean {
  return resolveGetUserMedia() !== null
}

export function getVoiceBrowser(): VoiceBrowserKind {
  return detectVoiceBrowser()
}

export function getMicHint(permission: MicPermissionStatus): string {
  return micPermissionHint(detectVoiceBrowser(), permission)
}

export async function queryMicPermission(): Promise<MicPermissionStatus> {
  if (!isMicApiSupported()) return 'unsupported'

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'unsupported'
  }

  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      })
      if (result.state === 'granted') return 'granted'
      if (result.state === 'denied') return 'denied'
      return 'prompt'
    }
  } catch {
    // iOS Safari often does not support permissions.query for microphone.
  }

  return 'prompt'
}

async function tryGetUserMedia(getUserMedia: GetUserMediaFn, constraints: MediaStreamConstraints): Promise<MediaStream> {
  return getUserMedia(constraints)
}

/** Request mic — tries full constraints, then basic, then audio:true (mobile fallback). */
export async function requestMicStream(): Promise<MediaStream> {
  const getUserMedia = resolveGetUserMedia()
  if (!getUserMedia) {
    throw new DOMException('Microphone not supported', 'NotSupportedError')
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new DOMException('Microphone requires HTTPS', 'SecurityError')
  }

  const attempts: MediaStreamConstraints[] = [
    { audio: MIC_CONSTRAINTS_FULL, video: false },
    { audio: { echoCancellation: true }, video: false },
    { audio: true, video: false },
  ]

  let lastError: unknown = null

  for (const constraints of attempts) {
    try {
      return await tryGetUserMedia(getUserMedia, constraints)
    } catch (err) {
      lastError = err
      const overconstrained =
        err instanceof DOMException &&
        (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError')
      if (!overconstrained) break
    }
  }

  throw lastError instanceof Error ? lastError : new DOMException('Could not access microphone', 'NotAllowedError')
}

export function stopMicStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop())
}

export function micErrorMessage(error: unknown): string {
  const browser = detectVoiceBrowser()

  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return micPermissionHint(browser, 'denied')
    }
    if (error.name === 'SecurityError') {
      return 'Microphone requires a secure connection (HTTPS). Open the game via https://.'
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return browser.startsWith('ios')
        ? 'No microphone detected. Check Settings → Privacy → Microphone.'
        : 'No microphone found on this device.'
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Microphone is in use by another app. Close other apps and try again.'
    }
    if (error.name === 'AbortError') {
      return 'Microphone request was cancelled. Tap the voice button to try again.'
    }
  }

  if (error instanceof Error && error.message) return error.message
  return 'Could not access microphone. Tap the headphones icon to retry.'
}
