import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoundFlow, starsFor } from './roundFlow'

describe('round flow', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('auto-advances about 1.5 s after a success, with no Next button', () => {
    const onAdvance = vi.fn()
    const f = createRoundFlow({ total: 3, onAdvance, effects: false })
    expect(f.success()).toBe(true)
    expect(f.get().phase).toBe('celebrate')
    vi.advanceTimersByTime(1400)
    expect(onAdvance).not.toHaveBeenCalled()
    expect(f.get().round).toBe(0)
    vi.advanceTimersByTime(100)
    expect(onAdvance).toHaveBeenCalledWith(1)
    expect(f.get()).toMatchObject({ round: 1, phase: 'play', locked: false })
  })

  it('locks input while celebrating, so a double tap never skips a round', () => {
    const f = createRoundFlow({ total: 5, effects: false })
    expect(f.success()).toBe(true)
    expect(f.success()).toBe(false)
    expect(f.miss()).toBe(false)
    vi.advanceTimersByTime(1500)
    expect(f.get().round).toBe(1)
    expect(f.get().wins).toBe(1)
  })

  it('a miss is gentle: same round, short lock, then play again', () => {
    const f = createRoundFlow({ total: 3, retryMs: 700, effects: false })
    expect(f.miss()).toBe(true)
    expect(f.get()).toMatchObject({ phase: 'retry', locked: true, round: 0, misses: 1 })
    expect(f.miss()).toBe(false)
    expect(f.success()).toBe(false)
    vi.advanceTimersByTime(700)
    expect(f.get()).toMatchObject({ phase: 'play', locked: false, round: 0 })
    expect(f.success()).toBe(true)
  })

  it('lock() holds input while the game checks an answer, success still lands', () => {
    const f = createRoundFlow({ total: 2, effects: false })
    f.lock()
    expect(f.get().locked).toBe(true)
    expect(f.miss()).toBe(false)
    expect(f.success()).toBe(true)
  })

  it('completes after the last round, once, and Replay starts over', () => {
    const onComplete = vi.fn()
    const onAdvance = vi.fn()
    const f = createRoundFlow({ total: 2, onComplete, onAdvance, effects: false })
    f.success()
    vi.advanceTimersByTime(1500)
    f.success()
    vi.advanceTimersByTime(1500)
    expect(f.get().phase).toBe('done')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(f.success()).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(f.stars()).toBe(3)
    f.replay()
    expect(f.get()).toMatchObject({ round: 0, phase: 'play', wins: 0, misses: 0 })
    expect(onAdvance).toHaveBeenLastCalledWith(0)
  })

  it('destroy cancels a pending advance', () => {
    const onAdvance = vi.fn()
    const f = createRoundFlow({ total: 3, onAdvance, effects: false })
    f.success()
    f.destroy()
    vi.advanceTimersByTime(3000)
    expect(onAdvance).not.toHaveBeenCalled()
  })

  it('stars: 3 with no misses, 2 with a few, 1 with many', () => {
    expect(starsFor(5, 0)).toBe(3)
    expect(starsFor(4, 2)).toBe(2)
    expect(starsFor(2, 5)).toBe(1)
    expect(starsFor(0, 0)).toBe(0)
  })
})

describe('round flow reveal', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('reveal() moves on without a win, a bit later than a success', () => {
    const onAdvance = vi.fn()
    const f = createRoundFlow({ total: 3, onAdvance, effects: false })
    expect(f.reveal()).toBe(true)
    expect(f.get().locked).toBe(true)
    vi.advanceTimersByTime(1500)
    expect(onAdvance).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1200)
    expect(onAdvance).toHaveBeenCalledWith(1)
    expect(f.get()).toMatchObject({ wins: 0, misses: 1 })
  })
})
