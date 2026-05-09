import { useRef, useEffect, useState, useCallback } from 'react'
import { T, btn, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import {
  snapToGrid, panelDims, getCellAtPoint,
  cellIndex, drawLayout, drawPreview, countCellRect,
} from '../../utils/canvasRender.js'

const CANVAS_W = 1200
const CANVAS_H = 800

function newFieldId() {
  return Math.random().toString(36).slice(2, 10)
}

function fieldBounds(field, panel) {
  const { w: pw, h: ph } = panelDims(panel, field.orientation)
  return { x: field.x, y: field.y, w: field.cols * pw, h: field.rows * ph }
}

export default function Layout() {
  const { openProjectData, updateCanvasFields } = useProjectStore()
  const canvasRef = useRef(null)

  const planes = openProjectData?.roofPlanes || []
  const panel  = openProjectData?.activePanel || { width: 1.1, height: 1.7 }

  const [selectedPlaneId, setSelectedPlaneId] = useState(() => planes[0]?.id ?? 1)
  const [selectedFieldId, setSelectedFieldId]  = useState(null)
  const [drawState, setDrawState]              = useState(null)

  const fields = openProjectData?.canvasData?.[selectedPlaneId] || []

  const redraw = useCallback((preview = null) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    drawLayout(ctx, fields, panel, {
      gridW: CANVAS_W, gridH: CANVAS_H, showGrid: true, selectedId: selectedFieldId,
    })
    if (preview) {
      const { x1, y1, x2, y2 } = preview
      if (x2 > x1 && y2 > y1) drawPreview(ctx, x1, y1, x2, y2)
    }
  }, [fields, panel, selectedFieldId])

  useEffect(() => { redraw() }, [redraw])

  const canvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = (e) => {
    const { x, y } = canvasPos(e)

    // Check if clicking on a field's border (3 px rim) — select without removing panel
    for (const field of fields) {
      const b = fieldBounds(field, panel)
      const inRect = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
      const onBorder = x < b.x + 3 || x > b.x + b.w - 3 || y < b.y + 3 || y > b.y + b.h - 3
      if (inRect && onBorder) {
        setSelectedFieldId(field.id)
        return
      }
    }

    // Check if clicking on an existing panel cell
    for (const field of fields) {
      const { w: pw, h: ph } = panelDims(panel, field.orientation)
      const cell = getCellAtPoint(x, y, field, pw, ph)
      if (cell) {
        const [col, row] = cell
        const idx = cellIndex(col, row, field.cols)
        const newRemoved = field.removed.includes(idx)
          ? field.removed.filter(i => i !== idx)
          : [...field.removed, idx]
        const updated = fields.map(f => f.id === field.id ? { ...f, removed: newRemoved } : f)
        updateCanvasFields(selectedPlaneId, updated)
        setSelectedFieldId(field.id)
        return
      }
    }

    // Start drawing new field
    setSelectedFieldId(null)
    const sx = snapToGrid(x), sy = snapToGrid(y)
    setDrawState({ x1: sx, y1: sy })
  }

  const onMouseMove = (e) => {
    if (!drawState) return
    const { x, y } = canvasPos(e)
    const x2 = Math.max(drawState.x1 + 10, snapToGrid(x))
    const y2 = Math.max(drawState.y1 + 10, snapToGrid(y))
    redraw({ x1: drawState.x1, y1: drawState.y1, x2, y2 })
  }

  const onMouseUp = (e) => {
    if (!drawState) return
    const { x, y } = canvasPos(e)
    const { w: pw, h: ph } = panelDims(panel, 'portrait')
    const x2 = snapToGrid(x), y2 = snapToGrid(y)
    const rectW = x2 - drawState.x1, rectH = y2 - drawState.y1
    const cols = Math.max(1, Math.floor(rectW / pw))
    const rows = Math.max(1, Math.floor(rectH / ph))

    if (rectW > 0 && rectH > 0) {
      const newField = {
        id: newFieldId(),
        x: drawState.x1,
        y: drawState.y1,
        cols, rows,
        orientation: 'portrait',
        removed: [],
      }
      updateCanvasFields(selectedPlaneId, [...fields, newField])
    }
    setDrawState(null)
  }

  const toggleOrientation = () => {
    if (!selectedFieldId) return
    const updated = fields.map(f => {
      if (f.id !== selectedFieldId) return f
      return { ...f, orientation: f.orientation === 'portrait' ? 'landscape' : 'portrait' }
    })
    updateCanvasFields(selectedPlaneId, updated)
  }

  const deleteField = () => {
    if (!selectedFieldId) return
    updateCanvasFields(selectedPlaneId, fields.filter(f => f.id !== selectedFieldId))
    setSelectedFieldId(null)
  }

  const totalPanels = fields.reduce((s, f) => s + countCellRect(f), 0)
  const selectedField = fields.find(f => f.id === selectedFieldId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {planes.map(p => (
            <button key={p.id} onClick={() => { setSelectedPlaneId(p.id); setSelectedFieldId(null) }}
              style={{ ...btn(selectedPlaneId === p.id ? 'primary' : 'secondary'), fontSize: 11, padding: '4px 12px' }}>
              Takplan {p.id}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: T.border }} />

        <span style={{ fontSize: 12, color: T.textMuted }}>
          Paneler på takplan: <strong style={{ color: T.blue }}>{totalPanels}</strong>
        </span>

        {selectedField && (
          <>
            <div style={{ width: 1, height: 20, background: T.border }} />
            <span style={{ fontSize: 12, color: T.textMuted }}>
              Valt fält: <strong>{selectedField.cols} × {selectedField.rows}</strong>
              {' '}({countCellRect(selectedField)} paneler)
            </span>
            <button onClick={toggleOrientation}
              style={{ ...btn('secondary'), fontSize: 11, padding: '4px 12px' }}>
              {selectedField.orientation === 'portrait' ? 'Portrait → Landscape' : 'Landscape → Portrait'}
            </button>
            <button onClick={deleteField}
              style={{ ...btn('danger'), fontSize: 11, padding: '4px 12px' }}>
              Ta bort fält
            </button>
          </>
        )}

        <div style={{ marginLeft: 'auto', fontSize: 11, color: T.textLight }}>
          Dra för att skapa fält • Klicka panel för att ta bort
        </div>
      </div>

      {/* Canvas wrapper */}
      <div style={{ flex: 1, overflow: 'auto', border: `1px solid ${T.border}`, borderRadius: T.radius, background: '#fafcff' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block', cursor: drawState ? 'crosshair' : 'default' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { if (drawState) setDrawState(null) }}
        />
      </div>
    </div>
  )
}
