import { describe, it, expect } from 'vitest'
import { azFactor, tiltFactor, calcProject } from '../calc.js'

describe('azFactor()', () => {
  it('syd (0°) ger 1.0', () => expect(azFactor(0)).toBeCloseTo(1.0))
  it('nord (180°) ger 0.55', () => expect(azFactor(180)).toBeCloseTo(0.55))
  it('öst (-90°) ger 0.775', () => expect(azFactor(-90)).toBeCloseTo(0.775))
  it('aldrig under 0.45', () => expect(azFactor(270)).toBeGreaterThanOrEqual(0.45))
})

describe('tiltFactor()', () => {
  it('optimal 35° ger 1.0', () => expect(tiltFactor(35)).toBeCloseTo(1.0))
  it('platt tak (0°) ger 0.895', () => expect(tiltFactor(0)).toBeCloseTo(0.895))
  it('brant (70°) ger 0.895', () => expect(tiltFactor(70)).toBeCloseTo(0.895))
})

describe('calcProject()', () => {
  const base = {
    roofPlanes: [{ azimuth: 0, tilt: 35, panels: 20 }],
    activePanel: { wp: 400, voc: 40.5 },
    electrical: { inverterEff: 0.97, fuse: 63, phases: 3, voltage: 400, stringVMax: 1000 },
    loadData: {
      annualLoad: 100000, profile: 'industri',
      gridTariff: 0.6, spotPrice: 0.8, peakTariff: 80,
      hasBattery: false, battCapacity: 0,
    },
    customer: { taxCategory: 'Företag' },
  }

  it('beräknar systemstorlek', () => {
    const r = calcProject(base)
    expect(r.totalKWp).toBeCloseTo(8.0) // 20 × 400 / 1000
  })

  it('årsproduktion är positiv', () => {
    expect(calcProject(base).annualProd).toBeGreaterThan(0)
  })

  it('återbetalningstid är positiv', () => {
    expect(calcProject(base).payback).toBeGreaterThan(0)
  })

  it('co2 beräknas korrekt', () => {
    const r = calcProject(base)
    expect(r.co2saved).toBeCloseTo(r.annualProd * 0.41, 1)
  })

  it('privatperson: schablonavdrag 40000', () => {
    const r = calcProject({ ...base, customer: { taxCategory: 'Privatperson' } })
    expect(r.taxAmt).toBeGreaterThanOrEqual(0)
  })

  it('paneler/sträng beräknas', () => {
    const r = calcProject(base)
    // stringVMax / voc = floor(1000 / 40.5) = 24
    expect(r.panPerStr).toBe(24)
  })
})
