import { useRef } from 'react'
import { T, inp, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import F from '../../components/ui/F.jsx'
import SH from '../../components/ui/SH.jsx'
import { SOLAR_H, LOAD_PROFILES } from '../../utils/calc.js'

const PROFILES = ['industri','brf','handel','lantbruk']

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  const values = []
  for (const line of lines) {
    // Stöd: komma, semikolon, tab. Ta sista kolumnen om fler finns (datum;kWh-format)
    const cols = line.split(/[;,\t]/)
    const raw = cols[cols.length - 1].replace(',', '.').trim()
    const v = parseFloat(raw)
    if (!isNaN(v)) values.push(v)
  }
  return values
}

function toHourlyProfile(values) {
  // Aggregera 8760 (eller 8784) timvärden till 24h-medelprofil
  const sums = new Array(24).fill(0)
  const counts = new Array(24).fill(0)
  for (let i = 0; i < values.length; i++) {
    const h = i % 24
    sums[h] += values[i]
    counts[h]++
  }
  return sums.map((s, h) => s / (counts[h] || 1))
}

function DayProfileSVG({ profile, solar }) {
  const w = 480, h = 120, pad = 10
  const max = Math.max(...profile, ...solar, 0.001)
  const scaleY = (v) => h - pad - ((v / max) * (h - 2 * pad))
  const pts = (arr) => arr.map((v, i) => `${pad + i * ((w - 2 * pad) / 23)},${scaleY(v)}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts(solar)} fill="none" stroke={T.orange} strokeWidth="2" />
      <polyline points={pts(profile)} fill="none" stroke={T.blue} strokeWidth="2" />
      {[0,6,12,18,23].map(hr => (
        <text key={hr} x={pad + hr * ((w - 2 * pad) / 23)} y={h - 2} fontSize="9" fill={T.textMuted} textAnchor="middle">{hr}:00</text>
      ))}
      <text x={w - 4} y={16} fontSize="9" fill={T.orange} textAnchor="end">Sol</text>
      <text x={w - 4} y={28} fontSize="9" fill={T.blue} textAnchor="end">Last</text>
    </svg>
  )
}

export default function LoadData() {
  const { openProjectData, updateProjectData } = useProjectStore()
  const ld = openProjectData?.loadData || {}
  const taxCategory = openProjectData?.customer?.taxCategory
  const set = (field, val) => updateProjectData({ loadData: { [field]: val } })
  const fileRef = useRef()

  const activeProfile = ld.customProfile || LOAD_PROFILES[ld.profile] || LOAD_PROFILES.industri

  function handleCSV(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const values = parseCSV(ev.target.result)
      if (values.length < 24) {
        alert(`Ogiltigt CSV — hittade bara ${values.length} värden. Behöver minst 24.`)
        return
      }
      const profile = toHourlyProfile(values)
      const annualTotal = values.reduce((s, v) => s + v, 0)
      updateProjectData({ loadData: {
        customProfile: profile,
        csvFileName: file.name,
        annualLoad: Math.round(annualTotal),
      }})
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  function clearCSV() {
    updateProjectData({ loadData: { customProfile: null, csvFileName: null } })
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <SH>Förbrukningsprofil</SH>

          {ld.csvFileName ? (
            <div style={{ ...card({ padding: '10px 14px' }), marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: T.green }}>📄 {ld.csvFileName}</span>
              <button onClick={clearCSV} style={{ fontSize: 11, color: T.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Ta bort</button>
            </div>
          ) : (
            <F label="Schablonprofil">
              <select style={inp} value={ld.profile || 'industri'} onChange={e => set('profile', e.target.value)}>
                {PROFILES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </F>
          )}

          <div style={{ marginBottom: 16 }}>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleCSV} />
            <button
              onClick={() => fileRef.current?.click()}
              style={{ fontSize: 12, padding: '6px 14px', background: T.blueLight, color: T.blue, border: `1px solid ${T.border}`, borderRadius: 6, cursor: 'pointer' }}
            >
              {ld.csvFileName ? 'Byt CSV-fil' : '↑ Importera CSV (8760 h)'}
            </button>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
              En kolumn kWh/h, eller datum;kWh — 8 760 rader (ett år)
            </div>
          </div>

          <F label={`Årsförbrukning: ${(ld.annualLoad || 0).toLocaleString('sv-SE')} kWh`}>
            <input type="range" min="0" max="5000000" step="1000" value={ld.annualLoad || 0}
              onChange={e => set('annualLoad', +e.target.value)}
              style={{ width: '100%', accentColor: T.blue }} />
          </F>

          <SH>Tariffer</SH>
          <F label="Elnätstariff (kr/kWh)"><input style={inp} type="number" step="0.01" value={ld.gridTariff ?? 0.6} onChange={e => set('gridTariff', +e.target.value)} /></F>
          <F label="Spotpris (kr/kWh)"><input style={inp} type="number" step="0.01" value={ld.spotPrice ?? 0.8} onChange={e => set('spotPrice', +e.target.value)} /></F>
          <F label="Effekttariff (kr/kW/mån)"><input style={inp} type="number" step="1" value={ld.peakTariff ?? 80} onChange={e => set('peakTariff', +e.target.value)} /></F>
          {taxCategory === 'Privatperson' && (
            <F label="Skattemodell (privatperson)">
              <select value={ld.taxYear ?? '2026'} onChange={e => set('taxYear', e.target.value)} style={{ ...inp }}>
                <option value="2025">Inkomstår 2025 — 60 öre/kWh (max 18 000 kr)</option>
                <option value="2026">Fr.o.m. 2026 — avskaffad skattereduktion</option>
              </select>
            </F>
          )}
        </div>

        <div>
          <SH>Batterilager</SH>
          <F label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={ld.hasBattery || false} onChange={e => set('hasBattery', e.target.checked)} style={{ accentColor: T.blue }} />
              Inkludera batterilager
            </label>
          </F>
          {ld.hasBattery && (
            <>
            <F label="Kapacitet (kWh)"><input style={inp} type="number" value={ld.battCapacity || 0} onChange={e => set('battCapacity', +e.target.value)} /></F>
            {(!ld.battCapacity || ld.battCapacity <= 0) && (
              <div style={{ fontSize: 11, color: '#d97706', marginBottom: 10 }}>⚠ Ange kapacitet i kWh för att räkna med batteribesparing</div>
            )}
            </>
          )}

          <SH>Dygnsprofil</SH>
          <div style={{ ...card({ padding: '12px' }) }}>
            <DayProfileSVG profile={activeProfile} solar={SOLAR_H} />
          </div>
          {ld.csvFileName && (
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6, textAlign: 'center' }}>
              Visar medeldygn från importerad CSV
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
