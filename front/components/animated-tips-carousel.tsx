"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Users, Trophy, Target, Clock, Sparkles, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TipsCarouselProps {
  onComplete?: () => void
  showSkip?: boolean
}

const tips = [
  {
    id: 1,
    title: "Welcome to A-SPADE Online",
    description: "Experience the classic card game with modern features and AI opponents",
    icon: Gamepad2,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10"
  },
  {
    id: 2,
    title: "Quick Start",
    description: "Type 'auto' to instantly play with AI players - perfect for practice!",
    icon: Play,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10"
  },
  {
    id: 3,
    title: "Team Play",
    description: "Join forces with friends or AI partners in exciting team matches",
    icon: Users,
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10"
  },
  {
    id: 4,
    title: "Smart Bidding",
    description: "Master the art of bidding - predict your tricks and outsmart opponents",
    icon: Target,
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-500/10"
  },
  {
    id: 5,
    title: "Track Progress",
    description: "Monitor your performance with detailed stats and game history",
    icon: Trophy,
    color: "from-yellow-500 to-amber-500",
    bgColor: "bg-yellow-500/10"
  },
  {
    id: 6,
    title: "Play Anywhere",
    description: "Seamlessly continue games across devices with cloud save",
    icon: Clock,
    color: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-500/10"
  }
]

export function AnimatedTipsCarousel({ onComplete, showSkip = true }: TipsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  const handleNext = () => {
    if (currentIndex < tips.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleComplete = () => {
    setIsCompleted(true)
    setTimeout(() => {
      onComplete?.()
    }, 300)
  }

  const handleSkip = () => {
    handleComplete()
  }

  const currentTip = tips[currentIndex]

  return (
    <AnimatePresence>
      {!isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <span className="text-white font-semibold">A-SPADE Tips</span>
              </div>
              {showSkip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-white/70 hover:text-white"
                >
                  Skip
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm"
              >
                <div className={`bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 ${currentTip.bgColor}`}>
                  <div className="text-center space-y-6">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                      className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-r ${currentTip.color} flex items-center justify-center`}
                    >
                      <currentTip.icon className="w-12 h-12 text-white" />
                    </motion.div>

                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-white">{currentTip.title}</h3>
                      <p className="text-slate-300 text-base leading-relaxed">{currentTip.description}</p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-2">
                      {tips.map((_, index) => (
                        <motion.div
                          key={index}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                          }`}
                          animate={{
                            scale: index === currentIndex ? 1.2 : 1
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Navigation */}
            <div className="px-6 pb-8 space-y-4">
              <div className="flex gap-4">
                <Button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  variant="outline"
                  className="flex-1 border-slate-600 text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                >
                  {currentIndex === tips.length - 1 ? 'Get Started' : 'Next'}
                  {currentIndex < tips.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Swiper-based version for more advanced carousel
export function SwiperTipsCarousel({ onComplete, showSkip = true }: TipsCarouselProps) {
  const [isCompleted, setIsCompleted] = useState(false)

  const handleComplete = () => {
    setIsCompleted(true)
    setTimeout(() => {
      onComplete?.()
    }, 300)
  }

  const handleSkip = () => {
    handleComplete()
  }

  return (
    <AnimatePresence>
      {!isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                <span className="text-white font-semibold">A-SPADE Tips</span>
              </div>
              {showSkip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-white/70 hover:text-white"
                >
                  Skip
                </Button>
              )}
            </div>

            {/* Simple carousel with Framer Motion */}
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="w-full max-w-sm">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50"
                >
                  <div className="text-center space-y-6">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                      className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center"
                    >
                      <Gamepad2 className="w-10 h-10 text-white" />
                    </motion.div>

                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-white">Welcome to A-SPADE Online</h3>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        Experience the classic card game with modern features and AI opponents
                      </p>
                    </div>

                    <div className="text-xs text-slate-400">
                      Swipe to explore features
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Get Started Button */}
            <div className="px-6 pb-8">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={handleComplete}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3 rounded-xl"
                >
                  Get Started
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
