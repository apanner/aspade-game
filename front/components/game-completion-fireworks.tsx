"use client"

import { useEffect, useState, useRef } from "react"
import { Trophy, Crown, Sparkles, Star } from "lucide-react"

interface GameCompletionFireworksProps {
  winningTeam?: string
  winningPlayer?: string
  teamNames?: string[]
  totalRounds: number
  onComplete?: () => void
}

// Fireworks particle class
class Firework {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number

  constructor(x: number, y: number, color: string) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 8
    this.vy = (Math.random() - 0.5) * 8
    this.color = color
    this.maxLife = 60 + Math.random() * 40
    this.life = this.maxLife
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += 0.2 // gravity
    this.vx *= 0.98 // friction
    this.life--
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  isDead() {
    return this.life <= 0
  }
}

export function GameCompletionFireworks({
  winningTeam,
  winningPlayer,
  teamNames = [],
  totalRounds,
  onComplete
}: GameCompletionFireworksProps) {
  const [show, setShow] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fireworksRef = useRef<Firework[]>([])
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    // Play victory sound
    playVictorySound()

    // Initialize canvas
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Create initial fireworks
    const colors = ['#fbbf24', '#3b82f6', '#10b981', '#f472b6', '#8b5cf6', '#ef4444', '#06b6d4']
    
    const createFirework = (x: number, y: number) => {
      const color = colors[Math.floor(Math.random() * colors.length)]
      const particles: Firework[] = []
      
      for (let i = 0; i < 30; i++) {
        particles.push(new Firework(x, y, color))
      }
      
      return particles
    }

    // Launch fireworks periodically
    const launchFireworks = () => {
      const interval = setInterval(() => {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height * 0.5
        fireworksRef.current.push(...createFirework(x, y))
      }, 500)

      return interval
    }

    const interval = launchFireworks()

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw fireworks
      fireworksRef.current = fireworksRef.current.filter(firework => {
        firework.update()
        firework.draw(ctx)
        return !firework.isDead()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Auto-hide after 8 seconds
    const timer = setTimeout(() => {
      setShow(false)
      onComplete?.()
    }, 8000)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [onComplete])

  // Victory sound effect
  const playVictorySound = () => {
    if (typeof window === 'undefined') return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Victory fanfare: multiple ascending notes
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99] // C major scale
      
      notes.forEach((note, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.value = note
          oscillator.type = 'sine'
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
          gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.5)
        }, index * 100)
      })
    } catch (error) {
      console.log('Audio not available:', error)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Fireworks Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.9) 100%)' }}
      />

      {/* Celebration Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-6 animate-scale-in">
          {/* Trophy Icon */}
          <div className="relative">
            <Trophy className="h-32 w-32 mx-auto text-yellow-400 animate-bounce-slow drop-shadow-2xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Star className="h-16 w-16 text-yellow-300 animate-spin-slow" />
            </div>
          </div>

          {/* Main Title */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 animate-pulse drop-shadow-2xl">
              🎉 GAME COMPLETE! 🎉
            </h1>
            <p className="text-2xl md:text-4xl text-yellow-300 font-semibold">
              {totalRounds} Rounds Completed!
            </p>
          </div>

          {/* Winner Announcement */}
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-lg rounded-3xl p-8 border-4 border-yellow-400 shadow-2xl">
            <div className="space-y-4">
              <Crown className="h-16 w-16 mx-auto text-yellow-400 animate-pulse" />
              
              {winningTeam ? (
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-2">
                    {winningTeam} Team Wins!
                  </h2>
                  <p className="text-xl text-yellow-200">
                    🏆 Champions of the Game! 🏆
                  </p>
                </div>
              ) : winningPlayer ? (
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-2">
                    {winningPlayer} Wins!
                  </h2>
                  <p className="text-xl text-yellow-200">
                    🏆 Champion of the Game! 🏆
                  </p>
                </div>
              ) : null}

              {/* All Teams Display */}
              {teamNames.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-lg text-yellow-200 font-semibold">All Teams:</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {teamNames.map((team, index) => (
                      <div
                        key={team}
                        className={`px-4 py-2 rounded-lg font-bold text-lg ${
                          team === winningTeam
                            ? 'bg-yellow-400 text-yellow-900 animate-pulse'
                            : 'bg-yellow-600/30 text-yellow-200'
                        }`}
                      >
                        {team}
                        {team === winningTeam && <Crown className="inline-block h-5 w-5 ml-2" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sparkles Effect */}
          <div className="flex items-center justify-center gap-4">
            <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
            <span className="text-2xl text-yellow-300 font-semibold">Congratulations!</span>
            <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-scale-in {
          animation: scale-in 1s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
      `}</style>
    </div>
  )
}

