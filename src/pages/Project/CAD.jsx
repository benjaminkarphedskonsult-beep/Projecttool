import { useRef, useEffect, useState, useCallback } from 'react'
import { T, btn } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import { drawRoofBoundary, drawLayout, roofBoundaryDims } from '../../utils/canvasRender.js'
import { generateDxf, downloadDxf } from '../../utils/dxfExport.js'

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40">
  <rect width="120" height="40" rx="4" fill="#0d2444"/>
  <text x="8" y="16" font-family="Arial" font-size="10" font-weight="bold" fill="#f59e0b">KARPHEDS</text>
  <text x="8" y="30" font-family="Arial" font-size="8" fill="#93c5fd">Energikonsult AB</text>
  <polygon points="100,6 110,6 116,16 110,26 100,26 94,16" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
  <polygon points="105,11 105,21" stroke="#f59e0b" stroke-width="2"/>
  <circle cx="105" cy="16" r="2" fill="#f59e0b"/>
</svg>`

export default function CAD() {
  const { openProjectData, calc } = useProjectStore()
  const canvasRef = useRef(null)

  const planes     = openProjectData?.roofPlanes  || []
  const panel      = openProjectData?.activePanel || { width: 1.1, height: 1.7 }
  const canvasData = openProjectData?.canvasData  || {}
  const cust       = openProjectData?.customer    || {}

  const [selectedPlaneId, setSelectedPlaneId] = useState(() => planes[0]?.id ?? 1)
  const selectedPlane = planes.find(p => p.id === selectedPlaneId) || planes[0] || {}
  const planeData = canvasData[selectedPlaneId] || { fields: [], obstacles: [] }

  useEffect(() => {
    if (planes.length > 0 && !planes.some(p => p.id === selectedPlaneId)) {
      setSelectedPlaneId(planes[0].id)
    }
  }, [planes, selectedPlaneId])

  const { w: roofW, h: roofH } = roofBoundaryDims(selectedPlane)
  const CANVAS_W = Math.min(900, roofW + 60)
  const CANVAS_H = Math.min(700, roofH + 60)

  const drawTechnical = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const scale = canvas.width / (roofW + 60)
    ctx.save()
    ctx.scale(scale, scale)
    ctx.translate(30, 30)
    drawRoofBoundary(ctx, selectedPlane)
    drawLayout(ctx, planeData, panel, { gridW: roofW, gridH: roofH, showGrid: true })
    ctx.restore()
  }, [selectedPlane, planeData, panel, roofW, roofH])

  useEffect(() => { drawTechnical() }, [drawTechnical])

  const handleDxf = () => {
    const content = generateDxf(selectedPlane, planeData, panel)
    const name = cust.name?.replace(/\s+/g, '-').toLowerCase() || 'projekt'
    downloadDxf(`${name}-takplan-${selectedPlane.id}.dxf`, content)
  }

  const handlePng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    const name = cust.name?.replace(/\s+/g, '-').toLowerCase() || 'projekt'
    a.download = `${name}-takplan-${selectedPlane.id}.png`
    a.click()
  }

  const planeIndex = planes.findIndex(p => p.id === selectedPlaneId)
  const panelCount = (planeData.fields || []).reduce((s, f) => s + f.cols * f.rows - (f.removed?.length ?? 0), 0)
  const today = new Date().toLocaleDateString('sv-SE')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {planes.map(p => (
            <button key={p.id} onClick={() => setSelectedPlaneId(p.id)}
              style={{ ...btn(selectedPlaneId === p.id ? 'primary' : 'secondary'), fontSize: 11, padding: '4px 12px' }}>
              Takplan {p.id}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: T.border }} />
        <button onClick={handleDxf} style={{ ...btn('primary'), fontSize: 11, padding: '4px 14px' }}>
          ⬇ Ladda ner DXF
        </button>
        <button onClick={handlePng} style={{ ...btn('secondary'), fontSize: 11, padding: '4px 14px' }}>
          ⬇ Exportera PNG
        </button>
      </div>

      {/* Ritning + ritningshuvud */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 0, border: `1px solid ${T.border}`, borderRadius: T.radius }}>
        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', background: '#fff', padding: 0 }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ display: 'block' }}
          />
        </div>

        {/* Ritningshuvud */}
        <div style={{ width: 180, borderLeft: `2px solid #1557a0`, background: '#fff', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 }}>
          {/* Logga */}
          <div style={{ marginBottom: 12 }} dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
          <div style={{ borderTop: `1px solid #dce4ef`, paddingTop: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: '#8a9ab0', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Kund</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0d2444' }}>{cust.name || '—'}</div>
            {cust.address && <div style={{ fontSize: 10, color: '#5a6a7a', marginTop: 2 }}>{cust.address}</div>}
          </div>
          <div style={{ borderTop: `1px solid #dce4ef`, paddingTop: 10, marginBottom: 10 }}>
            {[
              ['Projekt-ID', openProjectData?.id?.slice(0,8) || '—'],
              ['Datum', today],
              ['Skala', '1:100'],
              ['Ritad av', 'R. Karphed'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: '#8a9ab0' }}>{k}</span>
                <span style={{ fontWeight: 600, color: '#1a2332' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid #dce4ef`, paddingTop: 10, marginTop: 'auto' }}>
            {[
              ['Takplan', `${planeIndex + 1} av ${planes.length}`],
              ['Mått', `${selectedPlane.length}×${selectedPlane.width} m`],
              ['Paneler', `${panelCount} st`],
              ['System', `${calc?.totalKWp?.toFixed(1) || '—'} kWp`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: '#8a9ab0' }}>{k}</span>
                <span style={{ fontWeight: 700, color: '#1557a0' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
