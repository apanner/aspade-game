"use client"

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, Sparkles, Crown } from 'lucide-react'
import Confetti from 'react-confetti'

interface VictoryCelebrationProps {
  winner: string
  score: number
  show: boolean
  onComplete?: () => void
}

export function VictoryCelebration({ winner, score, show, onComplete }: VictoryCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (show) {
      // Set dimensions for confetti
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
      
      // Create audio element for victory sound
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/victory.mp3')
        audioRef.current.volume = 0.7
      }
      
      // Play victory sound
      const playSound = async () => {
        try {
          await audioRef.current?.play()
        } catch (error) {
          console.log('Audio play failed:', error)
        }
      }
      
      // Trigger celebration sequence
      setTimeout(() => {
        setShowConfetti(true)
        playSound()
      }, 300)
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false)
        onComplete?.()
      }, 5000)
      
      return () => {
        clearTimeout(timer)
        audioRef.current?.pause()
      }
    }
  }, [show, onComplete])

  if (!show) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={dimensions.width}
            height={dimensions.height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.1}
            colors={['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e']}
          />
        )}

        {/* Victory Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="relative">
            {/* Trophy with glow effect */}
            <motion.div
              animate={{
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-amber-400/30 blur-xl rounded-full animate-pulse" />
              <Trophy className="w-32 h-32 text-amber-400 relative z-10" />
            </motion.div>

            {/* Winner text */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-6"
            >
              <h2 className="text-4xl font-bold text-white mb-2">Victory!</h2>
              <p className="text-2xl text-amber-400 font-semibold">{winner}</p>
              <p className="text-xl text-white mt-1">Score: {score > 0 ? '+' : ''}{score}</p>
            </motion.div>

            {/* Floating stars */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -100],
                  x: [0, (Math.random() - 0.5) * 100]
                }}
                transition={{
                  delay: 0.8 + i * 0.1,
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className="absolute"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`
                }}
              >
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </motion.div>
            ))}

            {/* Crown animation */}
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute -top-8 left-1/2 transform -translate-x-1/2"
            >
              <Crown className="w-12 h-12 text-amber-400 animate-bounce" />
            </motion.div>
          </div>
        </motion.div>

        {/* Background sparkles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                rotate: [0, 180, 360]
              }}
              transition={{
                delay: Math.random() * 2,
                duration: 2,
                repeat: Infinity,
                repeatDelay: Math.random() * 3
              }}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatePresence>
  )
}
