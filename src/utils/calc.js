export const MONTHLY_F = [0.30,0.50,0.80,1.10,1.30,1.35,1.30,1.20,0.95,0.65,0.35,0.25]
export const MON_DAYS  = [31,28,31,30,31,30,31,31,30,31,30,31]

const SOLAR_H = [0,0,0,0,0,0,0.01,0.04,0.09,0.14,0.17,0.18,0.17,0.16,0.13,0.08,0.03,0.01,0,0,0,0,0,0]

const LOAD_PROFILES = {
  industri: [0.3,0.2,0.2,0.2,0.2,0.2,0.4,0.7,1.0,1.0,1.0,1.0,1.0,1.0,0.9,0.9,0.8,0.6,0.5,0.4,0.4,0.4,0.3,0.3],
  brf:      [0.6,0.5,0.5,0.5,0.6,0.7,0.8,0.9,1.0,0.9,0.8,0.7,0.6,0.5,0.5,0.5,0.6,0.8,1.0,1.0,0.9,0.8,0.7,0.6],
  handel:   [0.2,0.2,0.2,0.2,0.2,0.3,0.5,0.8,1.0,1.0,1.0,1.0,1.0,1.0,0.9,0.8,0.6,0.4,0.3,0.2,0.2,0.2,0.2,0.2],
  lantbruk: [0.4,0.3,0.3,0.3,0.4,0.5,0.7,0.9,1.0,1.0,0.9,0.8,0.8,0.9,1.0,0.9,0.8,0.7,0.6,0.5,0.5,0.4,0.4,0.4],
}

export const azFactor = (az) =>
  Math.max(0.45, 0.775 + 0.225 * Math.cos(az * Math.PI / 180))

export const tiltFactor = (tilt) =>
  1 - 0.003 * Math.abs(tilt - 35)

export function calcProject(data) {
  const { roofPlanes = [], activePanel = {}, electrical = {}, loadData = {}, customer = {} } = data

  const wp         = activePanel.wp || 0
  const voc        = activePanel.voc || 1
  const invEff     = electrical.inverterEff || 0.97
  const stringVMax = electrical.stringVMax || 1000
  const fuse       = electrical.fuse || 63
  const phases     = electrical.phases || 3
  const voltage    = electrical.voltage || 400

  const totalPanels = roofPlanes.reduce((s, p) => s + (p.panels || 0), 0)
  const totalKWp    = totalPanels * wp / 1000

  const weightedFactor = totalPanels === 0 ? 1 :
    roofPlanes.reduce((s, p) => s + (p.panels || 0) * azFactor(p.azimuth || 0) * tiltFactor(p.tilt ?? 35), 0) / totalPanels

  const monthlyProd = MONTHLY_F.map((f, mi) =>
    totalKWp * 900 * f / 12 * MON_DAYS[mi] / 30 * weightedFactor * invEff
  )
  const annualProd = monthlyProd.reduce((s, v) => s + v, 0)

  const profile     = LOAD_PROFILES[loadData.profile] || LOAD_PROFILES.industri
  const profileSum  = profile.reduce((s, v) => s + v, 0)
  const annualLoad  = loadData.annualLoad || 0
  let totSelf = 0, totExp = 0, totPeak = 0

  for (let mi = 0; mi < 12; mi++) {
    for (let h = 0; h < 24; h++) {
      const solarH = monthlyProd[mi] * SOLAR_H[h] * MONTHLY_F[mi] * 1.8 / MON_DAYS[mi]
      const loadH  = annualLoad / 12 * MON_DAYS[mi] / 30 * profile[h] / profileSum / MON_DAYS[mi]
      totSelf += Math.min(solarH, loadH) * MON_DAYS[mi]
      totExp  += Math.max(0, solarH - loadH) * MON_DAYS[mi]
      if (h >= 8 && h <= 17) totPeak += Math.min(solarH, loadH)
    }
  }

  const exportRevenue = totExp * (loadData.spotPrice || 0)
  const battSave  = loadData.hasBattery ? annualLoad * 0.15 * ((loadData.spotPrice || 0) + (loadData.gridTariff || 0)) : 0
  const energySave = totSelf * ((loadData.spotPrice || 0) + (loadData.gridTariff || 0))
                   + totExp  * ((loadData.spotPrice || 0) + 0.08)
                   + battSave
  const peakSave  = totPeak / 12 * (loadData.peakTariff || 0)

  const taxCat = customer.taxCategory || 'Företag'
  const taxAmt = taxCat === 'Privatperson'
    ? Math.max(0, exportRevenue - 40000) * 0.30
    : exportRevenue * 0.206
  const energyTax    = totalKWp >= 500 ? totExp * 0.439 : 0
  const netAfterTax  = energySave + peakSave - taxAmt - energyTax
  const invest       = totalKWp * 8500 + (loadData.hasBattery ? (loadData.battCapacity || 0) * 3500 : 0)
  const payback      = netAfterTax > 0 ? invest / netAfterTax : Infinity

  let lcc = -invest
  for (let y = 1; y <= 25; y++) {
    lcc += netAfterTax * Math.pow(1 - 0.005, y - 1) / Math.pow(1.05, y)
  }

  const panPerStr     = voc > 0 ? Math.floor(stringVMax / voc) : 0
  const stringsNeeded = panPerStr > 0 ? Math.ceil(totalPanels / panPerStr) : 0
  const recInverter   = totalKWp * 0.85
  const dcacRatio     = recInverter > 0 ? totalKWp / recInverter : 0
  const maxAC         = voltage * fuse * (phases === 3 ? Math.sqrt(3) : 1) / 1000

  const co2saved = annualProd * 0.41
  const selfPct  = annualProd > 0 ? (totSelf / annualProd) * 100 : 0

  return {
    totalKWp, totalPanels, annualProd, monthlyProd,
    totSelf, totExp, selfPct,
    energySave, peakSave, battSave,
    taxAmt, energyTax, netAfterTax,
    invest, payback, lcc,
    panPerStr, stringsNeeded, recInverter, dcacRatio, maxAC,
    co2saved,
    exportRevenue,
  }
}
