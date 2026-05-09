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

  const handlePdf = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const imgData = canvas.toDataURL('image/png')
    const name = cust.name?.replace(/\s+/g, '-').toLowerCase() || 'projekt'
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${name}-takplan-${selectedPlane.id}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1a2332; height: 100vh; }
  .wrap { display: flex; height: 100%; }
  .drawing { flex: 1; display: flex; align-items: center; justify-content: center; padding: 4mm; border: 1px solid #dce4ef; }
  .drawing img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .tb { width: 52mm; border-left: 2px solid #1557a0; padding: 10px 8px; display: flex; flex-direction: column; }
  .co { font-weight: 800; font-size: 12px; color: #0d2444; }
  .co2 { font-size: 9px; color: #5a6a7a; margin-top: 1px; margin-bottom: 10px; }
  .sec { border-top: 1px solid #dce4ef; padding-top: 8px; margin-bottom: 8px; }
  .lbl { font-size: 7px; color: #8a9ab0; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
  .nm { font-size: 11px; font-weight: 700; color: #0d2444; }
  .ad { font-size: 9px; color: #5a6a7a; margin-top: 2px; }
  .rw { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 3px; }
  .rw .k { color: #8a9ab0; }
  .rw .v { font-weight: 600; }
  .rw.bl .v { color: #1557a0; font-weight: 700; }
  .bot { margin-top: auto; border-top: 1px solid #dce4ef; padding-top: 8px; }
</style></head><body>
<div class="wrap">
  <div class="drawing"><img src="${imgData}"/></div>
  <div class="tb">
    <div class="co">KARPHEDS</div>
    <div class="co2">Energikonsult AB</div>
    <div class="sec">
      <div class="lbl">Kund</div>
      <div class="nm">${cust.name || '—'}</div>
      ${cust.address ? `<div class="ad">${cust.address}</div>` : ''}
    </div>
    <div class="sec">
      <div class="rw"><span class="k">Projekt-ID</span><span class="v">${openProjectData?.id?.slice(0, 8) || '—'}</span></div>
      <div class="rw"><span class="k">Datum</span><span class="v">${today}</span></div>
      <div class="rw"><span class="k">Skala</span><span class="v">1:100</span></div>
      <div class="rw"><span class="k">Ritad av</span><span class="v">R. Karphed</span></div>
    </div>
    <div class="bot">
      <div class="rw bl"><span class="k">Takplan</span><span class="v">${planeIndex + 1} av ${planes.length}</span></div>
      <div class="rw bl"><span class="k">Mått</span><span class="v">${selectedPlane.length}×${selectedPlane.width} m</span></div>
      <div class="rw bl"><span class="k">Paneler</span><span class="v">${panelCount} st</span></div>
      <div class="rw bl"><span class="k">System</span><span class="v">${calc?.totalKWp?.toFixed(1) || '—'} kWp</span></div>
    </div>
  </div>
</div>
<script>window.onload=()=>window.print()<\/script>
</body></html>`)
    win.document.close()
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
        <button onClick={handlePdf} style={{ ...btn('secondary'), fontSize: 11, padding: '4px 14px' }}>
          ⬇ Exportera PDF
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
