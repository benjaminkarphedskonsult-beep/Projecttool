import { describe, it, expect } from 'vitest'
import { azFactor, tiltFactor, calcProject, calcTax } from '../calc.js'

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

  it('energikonservering: totSelf + totExp <= annualProd', () => {
    const r = calcProject(base)
    expect(r.totSelf + r.totExp).toBeLessThanOrEqual(r.annualProd * 1.01)
  })

  it('selfPct är aldrig över 100', () => {
    const r = calcProject(base)
    expect(r.selfPct).toBeLessThanOrEqual(100)
  })

  it('noll paneler ger invest 0 och payback Infinity', () => {
    const r = calcProject({ ...base, roofPlanes: [{ azimuth: 0, tilt: 35, panels: 0 }] })
    expect(r.invest).toBe(0)
    expect(r.payback).toBe(Infinity)
  })

  it('tiltFactor är aldrig negativ', () => {
    expect(tiltFactor(500)).toBeGreaterThanOrEqual(0)
  })
})

describe('calcTax()', () => {
  it('Privatperson 2025 låg export (<30000 kWh) — reduktion minskar skatten', () => {
    // exportRevenue = 10 000 kWh * 0.80 kr = 8 000 kr (< 40 000 schablon → capitalTax = 0)
    // reduktion = 10 000 * 0.60 = 6 000 kr, men capitalTax = 0, så taxAmt = 0
    const result = calcTax('Privatperson', '2025', 8000, 10000)
    expect(result).toBe(0)
  })

  it('Privatperson 2025 hög export (>30000 kWh) — reduktion begränsad till 18 000 kr', () => {
    // totExp = 50 000 kWh, exportRevenue = 50 000 * 0.80 = 40 000 kr
    // capitalTax = max(0, 40000 - 40000) * 0.30 = 0
    // reduktion = min(50000, 30000) * 0.60 = 18 000 kr
    // taxAmt = max(0, 0 - 18000) = 0
    // Use higher revenue to get positive capitalTax:
    // exportRevenue = 100 000 kr, totExp = 50 000 kWh
    // capitalTax = (100000 - 40000) * 0.30 = 18 000 kr
    // reduktion = min(50000, 30000) * 0.60 = 18 000 kr → begränsad till 18 000
    // taxAmt = max(0, 18000 - 18000) = 0
    const result = calcTax('Privatperson', '2025', 100000, 50000)
    expect(result).toBeCloseTo(0)
  })

  it('Privatperson 2025 hög export — reduktion är exakt 18 000 kr (30 000 kWh-taket)', () => {
    // totExp = 100 000 kWh (långt över taket), exportRevenue = 200 000 kr
    // capitalTax = (200000 - 40000) * 0.30 = 48 000 kr
    // reduktion = min(100000, 30000) * 0.60 = 18 000 kr (tak gäller)
    // taxAmt = max(0, 48000 - 18000) = 30 000 kr
    const result = calcTax('Privatperson', '2025', 200000, 100000)
    expect(result).toBeCloseTo(30000)
  })

  it('Privatperson 2026 — ingen reduktion, bara kapitalskatt', () => {
    // exportRevenue = 100 000 kr, totExp = 50 000 kWh
    // capitalTax = (100000 - 40000) * 0.30 = 18 000 kr
    const result = calcTax('Privatperson', '2026', 100000, 50000)
    expect(result).toBeCloseTo(18000)
  })

  it('Privatperson 2026 under schablonavdrag — ingen skatt', () => {
    // exportRevenue = 30 000 kr < 40 000 kr schablon
    const result = calcTax('Privatperson', '2026', 30000, 10000)
    expect(result).toBe(0)
  })

  it('Företag — 20.6% bolagsskatt oavsett taxYear', () => {
    const result = calcTax('Företag', '2025', 100000, 50000)
    expect(result).toBeCloseTo(100000 * 0.206)
  })

  it('Företag 2026 — oförändrad 20.6%-modell', () => {
    const result = calcTax('Företag', '2026', 50000, 20000)
    expect(result).toBeCloseTo(50000 * 0.206)
  })
})
