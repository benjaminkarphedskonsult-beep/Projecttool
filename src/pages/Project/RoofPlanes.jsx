import { T, inp, btn, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import SH from '../../components/ui/SH.jsx'
import F from '../../components/ui/F.jsx'
import { azFactor, tiltFactor } from '../../utils/calc.js'

const QUICK_AZ = [
  { label: 'Syd',     az: 0   },
  { label: 'Sydöst',  az: -45  },
  { label: 'Sydväst', az: 45   },
  { label: 'Öst',     az: -90  },
  { label: 'Väst',    az: 90   },
  { label: 'Nord',    az: 180  },
]

function CompassSVG({ azimuth }) {
  const r = 36, cx = 44, cy = 44
  const rad = (azimuth - 90) * Math.PI / 180
  const x2 = cx + r * Math.cos(rad), y2 = cy + r * Math.sin(rad)
  return (
    <svg width="88" height="88" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill={T.blueLight} stroke={T.border} strokeWidth="1" />
      {['N','Ö','S','V'].map((d, i) => {
        const a = (i * 90 - 90) * Math.PI / 180
        return <text key={d} x={cx + (r - 10) * Math.cos(a)} y={cy + (r - 10) * Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={T.textMuted}>{d}</text>
      })}
      <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill={T.blue} />
    </svg>
  )
}

export default function RoofPlanes() {
  const { openProjectData, updateProjectData } = useProjectStore()
  const planes = openProjectData?.roofPlanes || []

  const updatePlane = (id, field, val) => {
    updateProjectData({ roofPlanes: planes.map(p => p.id === id ? { ...p, [field]: val } : p) })
  }

  const addPlane = () => {
    const newId = Math.max(0, ...planes.map(p => p.id)) + 1
    updateProjectData({ roofPlanes: [...planes, { id: newId, length: 10, width: 6, tilt: 35, azimuth: 0, panels: 0, marginN: 0.5, marginS: 0.5, marginE: 0.5, marginW: 0.5 }] })
  }

  const removePlane = (id) => updateProjectData({ roofPlanes: planes.filter(p => p.id !== id) })

  return (
    <div>
      {planes.map((plane, idx) => {
        const pf = azFactor(plane.azimuth) * tiltFactor(plane.tilt)
        return (
          <div key={plane.id} style={{ ...card(), marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.blueDark }}>Takplan {idx + 1}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: T.textMuted }}>Produktionsfaktor: <strong style={{ color: T.blue }}>{(pf * 100).toFixed(0)}%</strong></span>
                {planes.length > 1 && <button onClick={() => removePlane(plane.id)} style={{ ...btn('ghost'), fontSize: 11, color: '#dc2626' }}>Ta bort</button>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <CompassSVG azimuth={plane.azimuth} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
                  <F label="Längd (m)"><input style={inp} type="number" value={plane.length} onChange={e => updatePlane(plane.id, 'length', +e.target.value)} /></F>
                  <F label="Bredd (m)" style={{ padding: '0 8px' }}><input style={inp} type="number" value={plane.width} onChange={e => updatePlane(plane.id, 'width', +e.target.value)} /></F>
                  <F label="Antal paneler"><input style={inp} type="number" value={plane.panels} onChange={e => updatePlane(plane.id, 'panels', +e.target.value)} /></F>
                  <F label="Lutning (°)"><input style={inp} type="number" min="0" max="90" value={plane.tilt} onChange={e => updatePlane(plane.id, 'tilt', +e.target.value)} /></F>
                  <F label="Azimut (°)" style={{ padding: '0 8px' }}>
                    <input style={inp} type="number" min="-180" max="180" value={plane.azimuth} onChange={e => updatePlane(plane.id, 'azimuth', +e.target.value)} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {QUICK_AZ.map(q => (
                        <button key={q.label} onClick={() => updatePlane(plane.id, 'azimuth', q.az)}
                          style={{ ...btn(plane.azimuth === q.az ? 'primary' : 'secondary'), fontSize: 10, padding: '2px 8px' }}>
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </F>
                </div>

                <SH>Kantavstånd / brandgata (m)</SH>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
                  {[['Norr','marginN'],['Söder','marginS'],['Öster','marginE'],['Väster','marginW']].map(([label, field]) => (
                    <F key={field} label={label} style={{ paddingRight: field !== 'marginW' ? 8 : 0 }}>
                      <input style={inp} type="number" step="0.1" value={plane[field]} onChange={e => updatePlane(plane.id, field, +e.target.value)} />
                    </F>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <button onClick={addPlane} style={{ ...btn('secondary') }}>+ Lägg till takplan</button>
    </div>
  )
}
