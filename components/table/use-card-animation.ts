export const cardMotionVariants = {
  deal: (i: number) => ({
    initial: { opacity: 0, y: -120, x: 0, scale: 0.6, rotate: -10 + i * 3 },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      rotate: 0,
      transition: { delay: i * 0.04, duration: 0.35, type: "spring", stiffness: 260, damping: 22 },
    },
  }),
  play: {
    initial: { scale: 1 },
    animate: {
      scale: [1, 1.12, 1],
      transition: { duration: 0.28 },
    },
  },
  trickWin: {
    animate: {
      opacity: [1, 1, 0],
      scale: [1, 1.05, 0.8],
      y: [0, -8, -40],
      transition: { duration: 0.4 },
    },
  },
}

export const reducedMotionProps = {
  transition: { duration: 0.01 },
}
