"use client"

import { useEffect, useState } from "react"
import { Trophy, Crown, Sparkles } from "lucide-react"

interface RoundCelebrationProps {
  isWinner: boolean
  roundNumber: number
  teamName?: string
  playerName?: string
  onComplete?: () => void
  onNextRound?: () => void
  isHost?: boolean
  isGameComplete?: boolean
  isFinalRound?: boolean
}

// Sound effects using Web Audio API
const playSound = (frequency: number, duration: number, type: 'win' | 'lose' | 'complete') => {
  if (typeof window === 'undefined') return
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Different sound patterns for win/lose
    if (type === 'win') {
      // Victory fanfare: ascending notes
      const notes = [261.63, 329.63, 392.00, 523.25] // C, E, G, C
      notes.forEach((note, index) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          osc.connect(gain)
          gain.connect(audioContext.destination)
          osc.frequency.value = note
          osc.type = 'sine'
          gain.gain.setValueAtTime(0.3, audioContext.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          osc.start(audioContext.currentTime)
          osc.stop(audioContext.currentTime + 0.3)
        }, index * 150)
      })
    } else if (type === 'lose') {
      // Subtle descending note
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    }
  } catch (error) {
    console.log('Audio not available:', error)
  }
}

export function RoundCelebration({ 
  isWinner, 
  roundNumber, 
  teamName, 
  playerName,
  onComplete,
  onNextRound,
  isHost = false,
  isGameComplete = false,
  isFinalRound = false
}: RoundCelebrationProps) {
  const [show, setShow] = useState(true)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    // Play sound effect
    if (isWinner) {
      playSound(440, 0.5, 'win')
    } else {
      playSound(220, 0.3, 'lose')
    }

    // Generate confetti particles for winners
    if (isWinner) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        delay: Math.random() * 0.5
      }))
      setParticles(newParticles)
    }

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Auto-advance after animation (only if host, game not complete, and NOT final round)
    const timer = setTimeout(() => {
      setShow(false)
      onComplete?.()
      
      // Auto-advance to next round if host, game not complete, and NOT final round
      // If it's the final round, show extend game option instead
      if (isHost && !isGameComplete && !isFinalRound && onNextRound) {
        console.log('🎮 Auto-advancing to next round...')
        onNextRound()
      } else if (isHost && isFinalRound) {
        console.log('🎮 Final round completed - showing extend game option...')
        // Don't auto-advance - let the extend game dialog show
      }
    }, 3000)

    return () => {
      clearTimeout(timer)
      clearInterval(countdownInterval)
    }
  }, [isWinner, onComplete, onNextRound, isHost, isGameComplete])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full h-full flex items-center justify-center ${
        isWinner ? 'animate-pulse' : ''
      }`}>
        {/* Winner Animation */}
        {isWinner && (
          <>
            {/* Confetti Particles */}
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute w-2 h-2 rounded-full animate-bounce"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  backgroundColor: ['#fbbf24', '#3b82f6', '#10b981', '#f472b6', '#8b5cf6'][particle.id % 5],
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${2 + Math.random()}s`
                }}
              />
            ))}

            {/* Main Celebration Card */}
            <div className="relative z-10 text-center animate-scale-in">
              <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl p-8 shadow-2xl border-4 border-yellow-300 transform rotate-3 animate-bounce-slow">
                <div className="space-y-4">
                  <Trophy className="h-20 w-20 mx-auto text-yellow-800 animate-spin-slow" />
                  <h2 className="text-5xl font-bold text-yellow-900 animate-pulse">
                    🎉 Round {roundNumber} Won! 🎉
                  </h2>
                  {teamName && (
                    <p className="text-2xl font-semibold text-yellow-800">
                      {teamName} Team Wins!
                    </p>
                  )}
                  {playerName && !teamName && (
                    <p className="text-2xl font-semibold text-yellow-800">
                      {playerName} Wins!
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-yellow-800 animate-pulse" />
                    <span className="text-lg text-yellow-800">Great Job!</span>
                    <Sparkles className="h-6 w-6 text-yellow-800 animate-pulse" />
                  </div>
                  
                  {/* Countdown Timer - Only show if not final round */}
                  {isHost && !isGameComplete && !isFinalRound && (
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-500/20 border-4 border-yellow-400">
                        <span className="text-2xl font-bold text-yellow-900">{countdown}</span>
                      </div>
                      <p className="text-sm text-yellow-800 mt-2">Starting next round...</p>
                    </div>
                  )}
                  
                  {/* Final Round Message */}
                  {isHost && isFinalRound && (
                    <div className="mt-4 text-center">
                      <div className="bg-yellow-500/20 border-2 border-yellow-400 rounded-lg p-4">
                        <p className="text-lg font-bold text-yellow-900">🎯 Final Round Complete!</p>
                        <p className="text-sm text-yellow-800 mt-2">Extend game option will appear...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Burst Effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-96 rounded-full bg-yellow-400/30 animate-ping" />
              <div className="absolute w-80 h-80 rounded-full bg-yellow-500/20 animate-ping" style={{ animationDelay: '0.2s' }} />
              <div className="absolute w-64 h-64 rounded-full bg-yellow-600/10 animate-ping" style={{ animationDelay: '0.4s' }} />
            </div>
          </>
        )}

        {/* Loser Animation */}
        {!isWinner && (
          <div className="relative z-10 text-center animate-fade-in">
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-6 shadow-xl border-2 border-slate-600">
              <div className="space-y-3">
                <div className="text-4xl">😔</div>
                <h2 className="text-3xl font-bold text-slate-200">
                  Round {roundNumber} Complete
                </h2>
                <p className="text-lg text-slate-400">
                  Better luck next round!
                </p>
                
                {/* Countdown Timer - Only show if not final round */}
                {isHost && !isGameComplete && !isFinalRound && (
                  <div className="mt-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-600/20 border-4 border-slate-500">
                      <span className="text-2xl font-bold text-slate-200">{countdown}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2">Starting next round...</p>
                  </div>
                )}
                
                {/* Final Round Message */}
                {isHost && isFinalRound && (
                  <div className="mt-4">
                    <div className="bg-slate-600/20 border-2 border-slate-500 rounded-lg p-4">
                      <p className="text-lg font-bold text-slate-200">🎯 Final Round Complete!</p>
                      <p className="text-sm text-slate-400 mt-2">Extend game option will appear...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
            transform: translateY(0) rotate(3deg);
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
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
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}

