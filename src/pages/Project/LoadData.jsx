import { T, inp, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import F from '../../components/ui/F.jsx'
import SH from '../../components/ui/SH.jsx'
import { SOLAR_H, LOAD_PROFILES } from '../../utils/calc.js'

const PROFILES = ['industri','brf','handel','lantbruk']

function DayProfileSVG({ profile, solar }) {
  const w = 480, h = 120, pad = 10
  const max = Math.max(...profile, ...solar)
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
