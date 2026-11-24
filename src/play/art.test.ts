import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { art3dFile, art3dUrl, splitEmoji } from './art'
import { ART3D } from './art3d.generated'

describe('3D picture map', () => {
  it('maps common emoji to their Fluent picture', () => {
    expect(art3dUrl('🍎')).toBe('/art3d/1f34e.webp')
    expect(art3dFile('🐶')).toBe('1f436')
  })
  it('ignores the emoji variation selector', () => {
    const heart = art3dFile('❤️')
    expect(heart).toBeTruthy()
    expect(art3dFile('❤')).toBe(heart)
  })
  it('returns null for text and unknown symbols', () => {
    expect(art3dUrl('A')).toBeNull()
    expect(art3dUrl('★')).toBeNull()
  })
  it('every mapped picture is shipped in public/art3d', () => {
    const dir = path.resolve(__dirname, '../../public/art3d')
    for (const f of new Set(Object.values(ART3D))) expect(fs.existsSync(path.join(dir, `${f}.webp`)), f).toBe(true)
  })
  it('splits text into words and pictures', () => {
    const parts = splitEmoji('Apple 🍎 and dog 🐶')
    expect(parts.map((p) => p.text)).toEqual(['Apple ', '🍎', ' and dog ', '🐶'])
    expect(parts[1].art).toBe('/art3d/1f34e.webp')
    expect(parts[0].art).toBeNull()
  })
  it('keeps flags and ZWJ sequences whole', () => {
    expect(splitEmoji('🇮🇳').length).toBe(1)
    expect(splitEmoji('👨‍👩‍👧').length).toBe(1)
  })
})
