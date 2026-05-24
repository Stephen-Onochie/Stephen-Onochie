let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export async function playChime(): Promise<void> {
  const ctx = getAudioContext()
  if (!ctx) return

  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  const now = ctx.currentTime
  const notes = [523.25, 659.25, 783.99]

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, now + i * 0.12)
    gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.12 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + i * 0.12)
    osc.stop(now + i * 0.12 + 0.4)
  })
}
