import { describe, it, expect } from 'vitest'
import { T, card, btn } from '../design.js'

describe('T tokens', () => {
  it('har blue-färg', () => expect(T.blue).toBe('#1557a0'))
  it('har blueDark-färg', () => expect(T.blueDark).toBe('#0d2444'))
})

describe('card()', () => {
  it('returnerar bas-stilar', () => {
    const s = card()
    expect(s.background).toBe(T.bgCard)
    expect(s.borderRadius).toBe(T.radius)
  })
  it('mergar extra stilar', () => {
    const s = card({ padding: '2rem' })
    expect(s.padding).toBe('2rem')
    expect(s.background).toBe(T.bgCard)
  })
})

describe('btn()', () => {
  it('primary har blå bakgrund', () => {
    expect(btn('primary').background).toBe(T.blue)
  })
  it('danger har röd bakgrund', () => {
    expect(btn('danger').background).toBe('#dc2626')
  })
})
