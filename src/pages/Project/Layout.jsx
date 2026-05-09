import { useRef, useEffect, useState, useCallback } from 'react'
import { T, btn } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import {
  snapToGrid, panelDims, getCellAtPoint, cellIndex,
  drawLayout, drawPreview, drawRoofBoundary, drawObstacles,
  countCellRect, roofBoundaryDims, obstacleFromMeters,
} from '../../utils/canvasRender.js'

const CANVAS_W = 1400
const CANVAS_H = 900

function newFieldId() { return Math.random().toString(36).slice(2, 10) }

function fieldBounds(field, panel) {
  const { w: pw, h: ph } = panelDims(panel, field.orientation)
  return { x: field.x, y: field.y, w: field.cols * pw, h: field.rows * ph }
}

const OBSTACLE_LABELS = ['Skorsten', 'Takfönster', 'Ventilation', 'Övrigt']

export default function Layout() {
  const { openProjectData, updateCanvasFields, updateCanvasObstacles } = useProjectStore()
  const canvasRef = useRef(null)

  const planes = openProjectData?.roofPlanes || []
  const panel  = openProjectData?.activePanel || { width: 1.1, height: 1.7 }

  const [selectedPlaneId, setSelectedPlaneId] = useState(() => planes[0]?.id ?? 1)
  const [selectedFieldId, setSelectedFieldId]  = useState(null)
  const [selectedObsId, setSelectedObsId]      = useState(null)
  const [mode, setMode]                         = useState('draw') // 'draw'|'move'|'obstacle'
  const [showObsForm, setShowObsForm]           = useState(false)
  const [drawState, setDrawState]               = useState(null)
  const [moveState, setMoveState]               = useState(null)  // { fieldId, offX, offY }
  const [obsDrawState, setObsDrawState]         = useState(null)
  const [obsForm, setObsForm] = useState({ label: 'Skorsten', fromLeft: 0, fromTop: 0, width: 0.5, height: 0.5 })

  const planeData  = openProjectData?.canvasData?.[selectedPlaneId] || { fields: [], obstacles: [] }
  const fields     = planeData.fields    || []
  const obstacles  = planeData.obstacles || []
  const selectedPlane = planes.find(p => p.id === selectedPlaneId) || planes[0] || {}

  useEffect(() => {
    if (planes.length > 0 && !planes.some(p => p.id === selectedPlaneId)) {
      setSelectedPlaneId(planes[0].id)
    }
  }, [planes, selectedPlaneId])

  const redraw = useCallback((preview = null, ghostField = null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    drawRoofBoundary(ctx, selectedPlane)
    drawLayout(ctx, { fields: ghostField ? fields.map(f => f.id === ghostField.id ? ghostField : f) : fields, obstacles }, panel, {
      gridW: CANVAS_W, gridH: CANVAS_H, showGrid: true, selectedId: selectedFieldId,
    })
    if (preview) {
      const { x1, y1, x2, y2 } = preview
      if (x2 > x1 && y2 > y1) drawPreview(ctx, x1, y1, x2, y2)
    }
  }, [fields, obstacles, panel, selectedFieldId, selectedPlane])

  useEffect(() => { redraw() }, [redraw])

  const canvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // --- DRAW MODE ---
  const onMouseDownDraw = (x, y) => {
    for (const field of fields) {
      const b = fieldBounds(field, panel)
      const inRect = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
      const onBorder = x < b.x + 3 || x > b.x + b.w - 3 || y < b.y + 3 || y > b.y + b.h - 3
      if (inRect && onBorder) { setSelectedFieldId(field.id); setSelectedObsId(null); return }
    }
    for (const field of fields) {
      const { w: pw, h: ph } = panelDims(panel, field.orientation)
      const cell = getCellAtPoint(x, y, field, pw, ph)
      if (cell) {
        const [col, row] = cell
        const idx = cellIndex(col, row, field.cols)
        const newRemoved = field.removed.includes(idx) ? field.removed.filter(i => i !== idx) : [...field.removed, idx]
        updateCanvasFields(selectedPlaneId, fields.map(f => f.id === field.id ? { ...f, removed: newRemoved } : f))
        setSelectedFieldId(field.id); setSelectedObsId(null); return
      }
    }
    setSelectedFieldId(null); setSelectedObsId(null)
    setDrawState({ x1: snapToGrid(x), y1: snapToGrid(y) })
  }

  // --- MOVE MODE ---
  const onMouseDownMove = (x, y) => {
    for (const field of fields) {
      const b = fieldBounds(field, panel)
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        setSelectedFieldId(field.id); setSelectedObsId(null)
        setMoveState({ fieldId: field.id, offX: x - field.x, offY: y - field.y })
        return
      }
    }
    setSelectedFieldId(null)
  }

  // --- OBSTACLE MODE ---
  const onMouseDownObstacle = (x, y) => {
    for (const obs of obstacles) {
      if (x >= obs.x && x <= obs.x + obs.w && y >= obs.y && y <= obs.y + obs.h) {
        setSelectedObsId(obs.id); setSelectedFieldId(null); return
      }
    }
    setSelectedObsId(null); setSelectedFieldId(null)
    setObsDrawState({ x1: snapToGrid(x), y1: snapToGrid(y) })
  }

  const onMouseDown = (e) => {
    const { x, y } = canvasPos(e)
    if (mode === 'draw')     onMouseDownDraw(x, y)
    else if (mode === 'move')     onMouseDownMove(x, y)
    else if (mode === 'obstacle') onMouseDownObstacle(x, y)
  }

  const onMouseMove = (e) => {
    const { x, y } = canvasPos(e)
    if (mode === 'draw' && drawState) {
      const x2 = Math.max(drawState.x1 + 10, snapToGrid(x))
      const y2 = Math.max(drawState.y1 + 10, snapToGrid(y))
      redraw({ x1: drawState.x1, y1: drawState.y1, x2, y2 })
    } else if (mode === 'move' && moveState) {
      const nx = snapToGrid(x - moveState.offX), ny = snapToGrid(y - moveState.offY)
      const ghost = fields.find(f => f.id === moveState.fieldId)
      if (ghost) redraw(null, { ...ghost, x: nx, y: ny })
    } else if (mode === 'obstacle' && obsDrawState) {
      const x2 = Math.max(obsDrawState.x1 + 10, snapToGrid(x))
      const y2 = Math.max(obsDrawState.y1 + 10, snapToGrid(y))
      redraw({ x1: obsDrawState.x1, y1: obsDrawState.y1, x2, y2 })
    }
  }

  const onMouseUp = (e) => {
    const { x, y } = canvasPos(e)
    if (mode === 'draw' && drawState) {
      const { w: pw, h: ph } = panelDims(panel, 'portrait')
      const x2 = snapToGrid(x), y2 = snapToGrid(y)
      const cols = Math.max(1, Math.floor((x2 - drawState.x1) / pw))
      const rows = Math.max(1, Math.floor((y2 - drawState.y1) / ph))
      if (x2 > drawState.x1 && y2 > drawState.y1) {
        updateCanvasFields(selectedPlaneId, [...fields, { id: newFieldId(), x: drawState.x1, y: drawState.y1, cols, rows, orientation: 'portrait', removed: [] }])
      }
      setDrawState(null)
    } else if (mode === 'move' && moveState) {
      const nx = snapToGrid(x - moveState.offX), ny = snapToGrid(y - moveState.offY)
      updateCanvasFields(selectedPlaneId, fields.map(f => f.id === moveState.fieldId ? { ...f, x: nx, y: ny } : f))
      setMoveState(null)
    } else if (mode === 'obstacle' && obsDrawState) {
      const x2 = snapToGrid(x), y2 = snapToGrid(y)
      if (x2 > obsDrawState.x1 && y2 > obsDrawState.y1) {
        updateCanvasObstacles(selectedPlaneId, [...obstacles, { id: newFieldId(), x: obsDrawState.x1, y: obsDrawState.y1, w: x2 - obsDrawState.x1, h: y2 - obsDrawState.y1, label: 'Övrigt' }])
      }
      setObsDrawState(null)
    }
  }

  const toggleOrientation = () => {
    if (!selectedFieldId) return
    updateCanvasFields(selectedPlaneId, fields.map(f => f.id !== selectedFieldId ? f : { ...f, orientation: f.orientation === 'portrait' ? 'landscape' : 'portrait' }))
  }

  const deleteField = () => {
    if (!selectedFieldId) return
    updateCanvasFields(selectedPlaneId, fields.filter(f => f.id !== selectedFieldId))
    setSelectedFieldId(null)
  }

  const deleteObstacle = () => {
    if (!selectedObsId) return
    updateCanvasObstacles(selectedPlaneId, obstacles.filter(o => o.id !== selectedObsId))
    setSelectedObsId(null)
  }

  const placeObsFromForm = () => {
    const obs = obstacleFromMeters(obsForm)
    updateCanvasObstacles(selectedPlaneId, [...obstacles, obs])
    setShowObsForm(false)
  }

  const { w: roofW, h: roofH } = roofBoundaryDims(selectedPlane)
  const outOfBounds = fields.some(f => {
    const b = fieldBounds(f, panel)
    return b.x + b.w > roofW || b.y + b.h > roofH
  })

  const totalPanels  = fields.reduce((s, f) => s + countCellRect(f), 0)
  const selectedField = fields.find(f => f.id === selectedFieldId)
  const selectedObs   = obstacles.find(o => o.id === selectedObsId)

  const modeBtn = (m, icon, label) => (
    <button onClick={() => { setMode(m); setShowObsForm(false) }}
      style={{ ...btn(mode === m ? 'primary' : 'secondary'), fontSize: 11, padding: '4px 12px' }}>
      {icon} {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {planes.map(p => (
            <button key={p.id} onClick={() => { setSelectedPlaneId(p.id); setSelectedFieldId(null); setSelectedObsId(null) }}
              style={{ ...btn(selectedPlaneId === p.id ? 'primary' : 'secondary'), fontSize: 11, padding: '4px 12px' }}>
              Takplan {p.id}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: T.border }} />
        {modeBtn('draw',     '▦', 'Rita fält')}
        {modeBtn('move',     '✥', 'Flytta')}
        {modeBtn('obstacle', '⊗', 'Rita hinder')}
        <button onClick={() => { setMode('obstacle'); setShowObsForm(v => !v) }}
          style={{ ...btn(showObsForm ? 'primary' : 'secondary'), fontSize: 11, padding: '4px 12px' }}>
          + Hinder (mått)
        </button>
        <div style={{ width: 1, height: 20, background: T.border }} />
        <span style={{ fontSize: 12, color: T.textMuted }}>
          Paneler: <strong style={{ color: T.blue }}>{totalPanels}</strong>
        </span>
        {outOfBounds && <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>⚠ Fält utanför takplanet</span>}
        {selectedField && (
          <>
            <div style={{ width: 1, height: 20, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textMuted }}>{selectedField.cols}×{selectedField.rows} ({countCellRect(selectedField)} paneler)</span>
            <button onClick={toggleOrientation} style={{ ...btn('secondary'), fontSize: 11, padding: '4px 12px' }}>
              {selectedField.orientation === 'portrait' ? 'Portrait→Landscape' : 'Landscape→Portrait'}
            </button>
            <button onClick={deleteField} style={{ ...btn('danger'), fontSize: 11, padding: '4px 12px' }}>Ta bort fält</button>
          </>
        )}
        {selectedObs && (
          <>
            <div style={{ width: 1, height: 20, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textMuted }}>Hinder: {selectedObs.label}</span>
            <button onClick={deleteObstacle} style={{ ...btn('danger'), fontSize: 11, padding: '4px 12px' }}>Ta bort hinder</button>
          </>
        )}
      </div>

      {/* Hinderdialog */}
      {showObsForm && (
        <div style={{ background: '#f0f4f9', padding: '12px 16px', borderRadius: 8, marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', flexShrink: 0 }}>
          <label style={{ fontSize: 11 }}>Typ<br />
            <select value={obsForm.label} onChange={e => setObsForm(f => ({ ...f, label: e.target.value }))}
              style={{ padding: '3px 8px', borderRadius: 4, border: `1px solid ${T.border}` }}>
              {OBSTACLE_LABELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </label>
          {[['fromLeft','Från vänster (m)'],['fromTop','Från överkant (m)'],['width','Bredd (m)'],['height','Höjd (m)']].map(([k, lbl]) => (
            <label key={k} style={{ fontSize: 11 }}>{lbl}<br />
              <input type="number" step="0.1" min="0" value={obsForm[k]}
                onChange={e => setObsForm(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }))}
                style={{ width: 80, padding: '3px 6px', borderRadius: 4, border: `1px solid ${T.border}` }} />
            </label>
          ))}
          <button onClick={placeObsFromForm} style={{ ...btn('primary'), fontSize: 11, padding: '5px 16px' }}>Placera</button>
          <button onClick={() => setShowObsForm(false)} style={{ ...btn('secondary'), fontSize: 11, padding: '5px 12px' }}>Avbryt</button>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, overflow: 'auto', border: `1px solid ${T.border}`, borderRadius: T.radius, background: '#fafcff' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block', cursor: (drawState || obsDrawState) ? 'crosshair' : mode === 'move' ? 'grab' : 'default' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { setDrawState(null); setMoveState(null); setObsDrawState(null) }}
        />
      </div>
    </div>
  )
}
