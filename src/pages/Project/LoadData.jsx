import { T, inp, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import F from '../../components/ui/F.jsx'
import SH from '../../components/ui/SH.jsx'
import { MONTHLY_F } from '../../utils/calc.js'

const PROFILES = ['industri','brf','handel','lantbruk']
const SOLAR_H = [0,0,0,0,0,0,0.01,0.04,0.09,0.14,0.17,0.18,0.17,0.16,0.13,0.08,0.03,0.01,0,0,0,0,0,0]
const LOAD_PROFILES = {
  industri: [0.3,0.2,0.2,0.2,0.2,0.2,0.4,0.7,1.0,1.0,1.0,1.0,1.0,1.0,0.9,0.9,0.8,0.6,0.5,0.4,0.4,0.4,0.3,0.3],
  brf:      [0.6,0.5,0.5,0.5,0.6,0.7,0.8,0.9,1.0,0.9,0.8,0.7,0.6,0.5,0.5,0.5,0.6,0.8,1.0,1.0,0.9,0.8,0.7,0.6],
  handel:   [0.2,0.2,0.2,0.2,0.2,0.3,0.5,0.8,1.0,1.0,1.0,1.0,1.0,1.0,0.9,0.8,0.6,0.4,0.3,0.2,0.2,0.2,0.2,0.2],
  lantbruk: [0.4,0.3,0.3,0.3,0.4,0.5,0.7,0.9,1.0,1.0,0.9,0.8,0.8,0.9,1.0,0.9,0.8,0.7,0.6,0.5,0.5,0.4,0.4,0.4],
}

function DayProfileSVG({ profile, solar }) {
  const w = 480, h = 120, pad = 10
  const max = Math.max(...profile, ...solar)
  const scaleY = (v) => h - pad - ((v / max) * (h - 2 * pad))
  const pts = (arr) => arr.map((v, i) => `${pad + i * ((w - 2 * pad) / 23)},${scaleY(v)}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts(solar)} fill="none" stroke={T.orange} strokeWidth="2" />
      <polyline points={pts(profile)} fill="none" stroke={T.blue} strokeWidth="2" />
      {[0,6,12,18,23].map(h => (
        <text key={h} x={pad + h * ((w - 2 * pad) / 23)} y={h - 2} fontSize="9" fill={T.textMuted} textAnchor="middle">{h}:00</text>
      ))}
      <text x={w - 4} y={16} fontSize="9" fill={T.orange} textAnchor="end">Sol</text>
      <text x={w - 4} y={28} fontSize="9" fill={T.blue} textAnchor="end">Last</text>
    </svg>
  )
}

export default function LoadData() {
  const { openProjectData, updateProjectData } = useProjectStore()
  const ld = openProjectData?.loadData || {}
  const set = (field, val) => updateProjectData({ loadData: { [field]: val } })

  const profile = LOAD_PROFILES[ld.profile] || LOAD_PROFILES.industri

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <SH>Förbrukningsprofil</SH>
          <F label="Schablonprofil">
            <select style={inp} value={ld.profile || 'industri'} onChange={e => set('profile', e.target.value)}>
              {PROFILES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </F>
          <F label={`Årsförbrukning: ${(ld.annualLoad || 0).toLocaleString('sv-SE')} kWh`}>
            <input type="range" min="0" max="5000000" step="1000" value={ld.annualLoad || 0}
              onChange={e => set('annualLoad', +e.target.value)}
              style={{ width: '100%', accentColor: T.blue }} />
          </F>

          <SH>Tariffer</SH>
          <F label="Elnätstariff (kr/kWh)"><input style={inp} type="number" step="0.01" value={ld.gridTariff ?? 0.6} onChange={e => set('gridTariff', +e.target.value)} /></F>
          <F label="Spotpris (kr/kWh)"><input style={inp} type="number" step="0.01" value={ld.spotPrice ?? 0.8} onChange={e => set('spotPrice', +e.target.value)} /></F>
          <F label="Effekttariff (kr/kW/mån)"><input style={inp} type="number" step="1" value={ld.peakTariff ?? 80} onChange={e => set('peakTariff', +e.target.value)} /></F>
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
            <F label="Kapacitet (kWh)"><input style={inp} type="number" value={ld.battCapacity || 0} onChange={e => set('battCapacity', +e.target.value)} /></F>
          )}

          <SH>Dygnsprofil</SH>
          <div style={{ ...card({ padding: '12px' }) }}>
            <DayProfileSVG profile={profile} solar={SOLAR_H} />
          </div>
        </div>
      </div>
    </div>
  )
}
