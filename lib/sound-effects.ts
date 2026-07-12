// 🎵 Sound Effects for Mobile Notifications
// Handles audio playback for game events on mobile devices

class SoundEffects {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()
  private isEnabled = true
  private volume = 0.7

  constructor() {
    // Initialize audio context for mobile
    if (typeof window !== 'undefined' && typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext()
    }
  }

  // Enable/disable sounds
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    if (enabled && this.audioContext?.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  // Generate simple beep sound
  private generateBeep(frequency: number, duration: number): AudioBuffer | null {
    if (!this.audioContext) return null

    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * this.volume
    }

    return buffer
  }

  // Play a sound
  private async playSound(buffer: AudioBuffer | null) {
    if (!this.isEnabled || !buffer || !this.audioContext) return

    try {
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      
      source.buffer = buffer
      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime)
      
      source.start()
    } catch (error) {
      console.warn('Failed to play sound:', error)
    }
  }

  // Game event sounds
  async playTrickWon() {
    const buffer = this.generateBeep(800, 0.2) // Higher pitch, short duration
    await this.playSound(buffer)
  }

  async playTrickLost() {
    const buffer = this.generateBeep(400, 0.2) // Lower pitch, short duration
    await this.playSound(buffer)
  }

  async playGameComplete() {
    // Play a victory sequence
    const frequencies = [523, 659, 784, 1047] // C, E, G, C (high)
    for (let i = 0; i < frequencies.length; i++) {
      const buffer = this.generateBeep(frequencies[i], 0.3)
      await this.playSound(buffer)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  async playBidSubmitted() {
    const buffer = this.generateBeep(600, 0.15)
    await this.playSound(buffer)
  }

  async playRoundComplete() {
    const buffer = this.generateBeep(700, 0.4)
    await this.playSound(buffer)
  }

  async playGameStart() {
    const frequencies = [440, 554, 659] // A, C#, E
    for (let i = 0; i < frequencies.length; i++) {
      const buffer = this.generateBeep(frequencies[i], 0.2)
      await this.playSound(buffer)
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }

  // Notification sound for mobile
  async playNotification() {
    const buffer = this.generateBeep(1000, 0.3)
    await this.playSound(buffer)
  }
}

// Create singleton instance
export const soundEffects = new SoundEffects()

// Export for use in components
export default soundEffects
