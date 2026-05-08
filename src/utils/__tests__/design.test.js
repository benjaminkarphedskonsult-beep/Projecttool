import { describe, it, expect } from 'vitest'
import { T, card, btn, inp, secH } from '../design.js'

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
  it('secondary har blueLight bakgrund', () => {
    expect(btn('secondary').background).toBe(T.blueLight)
  })
  it('ghost har transparent bakgrund', () => {
    expect(btn('ghost').background).toBe('transparent')
  })
  it('okänd variant returnerar bas utan background', () => {
    const s = btn('unknown')
    expect(s.background).toBeUndefined()
    expect(s.cursor).toBe('pointer')
  })
})

describe('inp', () => {
  it('täcker hela bredden', () => expect(inp.width).toBe('100%'))
  it('har korrekt bakgrundsfärg', () => expect(inp.background).toBe(T.bgInput))
})

describe('secH', () => {
  it('har rätt textstorlek', () => expect(secH.fontSize).toBe('11px'))
  it('är uppercase', () => expect(secH.textTransform).toBe('uppercase'))
})
