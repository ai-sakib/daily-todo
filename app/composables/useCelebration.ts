const PHRASES = [
  'Tasks: absolutely crushed',
  'The deed is done — legendary',
  'Call the fire department, you are on fire',
  'The to-do list has left the chat',
  'Bullseye. No prisoners taken',
  'Productivity level: cyborg',
  'Brighter than a supernova',
  'Power-up acquired: day complete',
  'Zen level maximum, tasks zero',
  "That's a wrap. No re-takes",
  'Riding the wave of success',
  'Boss battle won',
  'Every single box, ticked',
  'Nothing left but the victory lap',
] as const

/** Full-day completion celebration: confetti plus a randomised hype line. */
export function useCelebration() {
  const visible = ref(false)
  const phrase = ref('')

  function dismiss() {
    visible.value = false
  }

  async function fireConfetti() {
    if (!import.meta.client) return

    const { default: confetti } = await import('canvas-confetti')
    const colors = ['#6366f1', '#a855f7', '#ec4899']
    const endAt = Date.now() + 2500

    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors })
      if (Date.now() < endAt) requestAnimationFrame(frame)
    }
    frame()
  }

  /** @param withConfetti false when restoring an already-finished day on load. */
  function celebrate(withConfetti = true) {
    phrase.value = PHRASES[Math.floor(Math.random() * PHRASES.length)]!
    visible.value = true
    if (withConfetti) void fireConfetti()
  }

  return { visible, phrase, celebrate, dismiss }
}
