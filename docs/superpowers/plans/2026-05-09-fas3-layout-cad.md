# Fas 3 — Layout-förbättringar + CAD-flik Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Förbättra Layout-canvasen med flytta-fält, hinder, takram; fixa Rapport sida 3; bygg ny CAD-flik (flik 9) med teknisk ritning och DXF-export.

**Architecture:** Lägesbaserad canvas (draw/move/obstacle), separat hinderlista i canvasData bredvid fields-arrayen, bakåtkompatibel datamigrering vid inläsning, DXF genereras som ren textsträng utan externa beroenden. CAD-fliken återanvänder canvasRender.js med nya ritfunktioner.

**Tech Stack:** React 18 + Vite, HTML5 Canvas API, Zustand, inline styles (T-designtokens). Inga nya npm-beroenden.

---

## Filstruktur

| Fil | Åtgärd | Ansvar |
|-----|--------|--------|
| `src/store/useProjectStore.js` | Modifiera | Datamigrering + `updateCanvasObstacles` |
| `src/utils/canvasRender.js` | Modifiera | `drawRoofBoundary`, `drawObstacles`, uppdatera `drawLayout` |
| `src/utils/__tests__/canvasRender.test.js` | Modifiera | Tester för nya pure functions |
| `src/pages/Project/Layout.jsx` | Modifiera | Lägesväljare, flytta-logik, hinder-formulär, takram |
| `src/pages/Project/Report.jsx` | Modifiera | Per-takplan canvas-sektioner |
| `src/utils/dxfExport.js` | Skapa | DXF R12-generator |
| `src/utils/__tests__/dxfExport.test.js` | Skapa | Tester för DXF-output |
| `src/pages/Project/CAD.jsx` | Skapa | Teknisk ritning + ritningshuvud + export |
| `src/pages/Project/ProjectView.jsx` | Modifiera | Aktivera flik 9 (CAD) |

---

## Task 1: Store — datamigrering + updateCanvasObstacles

**Filer:**
- Modify: `src/store/useProjectStore.js`

Nuvarande `canvasData[id]` lagras som en flat array av fields. Nytt format: `{ fields: [...], obstacles: [...] }`. Migrering sker vid `openProject`.

- [ ] **Steg 1: Lägg till migreringsfunktion och uppdatera openProject**

Ersätt `openProject`-funktionen och lägg till `updateCanvasObstacles` samt uppdatera `updateCanvasFields` i `src/store/useProjectStore.js`:

```js
// Lägg till denna hjälpfunktion UTANFÖR create(), ovanför countCanvasPanels:
function migrateCanvasPlane(data) {
  if (!data) return { fields: [], obstacles: [] }
  if (Array.isArray(data)) return { fields: data, obstacles: [] }
  return { fields: data.fields || [], obstacles: data.obstacles || [] }
}
```

Ersätt `openProject`:
```js
openProject: async (id) => {
  const { data } = await supabase.from('projects').select('id, data').eq('id', id).single()
  if (!data) return
  const projectData = deepMerge(DEFAULT_PROJECT_DATA, data.data)
  const migratedCanvas = {}
  for (const [k, v] of Object.entries(projectData.canvasData || {})) {
    migratedCanvas[k] = migrateCanvasPlane(v)
  }
  const migrated = { ...projectData, canvasData: migratedCanvas }
  set({ openProjectId: id, openProjectData: migrated, view: 'project', projectTab: 1, calc: calcProject(migrated) })
},
```

Ersätt `updateCanvasFields`:
```js
updateCanvasFields: (roofPlaneId, fields) => {
  const { openProjectData } = get()
  if (!openProjectData) return
  const planeExists = openProjectData.roofPlanes.some(p => p.id === roofPlaneId)
  if (!planeExists) return
  const panelCount = countCanvasPanels(fields)
  const current = openProjectData.canvasData[roofPlaneId] || { fields: [], obstacles: [] }
  const updatedPlanes = openProjectData.roofPlanes.map(p =>
    p.id === roofPlaneId ? { ...p, panels: panelCount } : p
  )
  get().updateProjectData({
    canvasData: { ...openProjectData.canvasData, [roofPlaneId]: { ...current, fields } },
    roofPlanes: updatedPlanes,
  })
},
```

Lägg till `updateCanvasObstacles` direkt efter `updateCanvasFields`:
```js
updateCanvasObstacles: (roofPlaneId, obstacles) => {
  const { openProjectData } = get()
  if (!openProjectData) return
  const current = openProjectData.canvasData[roofPlaneId] || { fields: [], obstacles: [] }
  get().updateProjectData({
    canvasData: { ...openProjectData.canvasData, [roofPlaneId]: { ...current, obstacles } },
  })
},
```

- [ ] **Steg 2: Kör testerna — allt ska fortfarande vara grönt**

```bash
cd /home/ai/Projecttool && npm test -- --run
```
Förväntat: 47 passed.

- [ ] **Steg 3: Commit**

```bash
git add src/store/useProjectStore.js
git commit -m "feat: canvasData migrering till {fields,obstacles}, updateCanvasObstacles"
```

---

## Task 2: canvasRender.js — drawRoofBoundary + drawObstacles

**Filer:**
- Modify: `src/utils/canvasRender.js`
- Modify: `src/utils/__tests__/canvasRender.test.js`

- [ ] **Steg 1: Skriv failande tester**

Lägg till i slutet av `src/utils/__tests__/canvasRender.test.js`:

```js
import { roofBoundaryDims, obstacleFromMeters } from '../canvasRender.js'

describe('roofBoundaryDims', () => {
  it('konverterar plane.length och plane.width till px', () => {
    expect(roofBoundaryDims({ length: 8.4, width: 6.0 })).toEqual({ w: 840, h: 600 })
  })
  it('defaultar till 10x6 vid saknade värden', () => {
    expect(roofBoundaryDims({})).toEqual({ w: 1000, h: 600 })
  })
})

describe('obstacleFromMeters', () => {
  it('konverterar meter-mått till snappade px-värden', () => {
    const obs = obstacleFromMeters({ fromLeft: 2.0, fromTop: 1.5, width: 0.5, height: 0.5, label: 'Skorsten' })
    expect(obs.x).toBe(200)
    expect(obs.y).toBe(150)
    expect(obs.w).toBe(50)
    expect(obs.h).toBe(50)
    expect(obs.label).toBe('Skorsten')
    expect(typeof obs.id).toBe('string')
  })
  it('snappar till närmaste 10 px', () => {
    const obs = obstacleFromMeters({ fromLeft: 0.23, fromTop: 0.17, width: 0.45, height: 0.33, label: 'Övrigt' })
    expect(obs.x % 10).toBe(0)
    expect(obs.y % 10).toBe(0)
    expect(obs.w % 10).toBe(0)
    expect(obs.h % 10).toBe(0)
  })
})
```

- [ ] **Steg 2: Kör — ska faila**

```bash
npm test -- --run
```
Förväntat: 2 test suites failing (roofBoundaryDims, obstacleFromMeters not defined).

- [ ] **Steg 3: Implementera nya pure functions och uppdatera drawLayout**

Lägg till i `src/utils/canvasRender.js` efter `fieldRect`:

```js
export function roofBoundaryDims(plane) {
  return {
    w: Math.round((plane.length || 10) * PX_PER_M),
    h: Math.round((plane.width  || 6)  * PX_PER_M),
  }
}

export function obstacleFromMeters({ fromLeft, fromTop, width, height, label }) {
  return {
    id: Math.random().toString(36).slice(2, 10),
    x: snapToGrid(Math.round((fromLeft || 0) * PX_PER_M)),
    y: snapToGrid(Math.round((fromTop  || 0) * PX_PER_M)),
    w: Math.max(10, snapToGrid(Math.round((width  || 0.5) * PX_PER_M))),
    h: Math.max(10, snapToGrid(Math.round((height || 0.5) * PX_PER_M))),
    label: label || 'Övrigt',
  }
}

export function drawRoofBoundary(ctx, plane) {
  const { w, h } = roofBoundaryDims(plane)
  ctx.fillStyle = '#f5f8ff'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#1557a0'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, w, h)
  ctx.fillStyle = '#1557a0'
  ctx.font = '12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(`${plane.length || 10} m`, w / 2, -4)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(w + 18, h / 2)
  ctx.rotate(Math.PI / 2)
  ctx.fillText(`${plane.width || 6} m`, 0, 0)
  ctx.restore()
}

export function drawObstacles(ctx, obstacles) {
  if (!obstacles?.length) return
  for (const obs of obstacles) {
    ctx.fillStyle = 'rgba(239,68,68,0.12)'
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h)
    ctx.setLineDash([5, 3])
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = 1.5
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h)
    ctx.setLineDash([])
    ctx.fillStyle = '#dc2626'
    ctx.font = 'bold 10px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(obs.label || 'Hinder', obs.x + 4, obs.y + 3)
  }
}
```

Uppdatera `drawLayout` — ersätt signaturen och lägg till obstacle-rendering:

```js
export function drawLayout(ctx, planeData, panel, opts = {}) {
  const fields    = Array.isArray(planeData) ? planeData : (planeData?.fields    || [])
  const obstacles = Array.isArray(planeData) ? []        : (planeData?.obstacles || [])
  const { gridW = 1200, gridH = 800, showGrid = true } = opts
  const COLORS = {
    gridLine: '#e0e8f0',
    fieldBg: '#e8f0fb',
    panelFill: '#dbeafe',
    panelBorder: '#1557a0',
    removedFill: '#f3f4f6',
    removedX: '#9ca3af',
    selected: '#f59e0b',
  }

  if (showGrid) {
    ctx.strokeStyle = COLORS.gridLine
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let x = 0; x <= gridW; x += SNAP) { ctx.moveTo(x, 0); ctx.lineTo(x, gridH) }
    for (let y = 0; y <= gridH; y += SNAP) { ctx.moveTo(0, y); ctx.lineTo(gridW, y) }
    ctx.stroke()
  }

  for (const field of fields) {
    const { w: pw, h: ph } = panelDims(panel, field.orientation)
    const fw = field.cols * pw, fh = field.rows * ph
    ctx.fillStyle = COLORS.fieldBg
    ctx.fillRect(field.x, field.y, fw, fh)
    for (let r = 0; r < field.rows; r++) {
      for (let c = 0; c < field.cols; c++) {
        const idx = cellIndex(c, r, field.cols)
        const px = field.x + c * pw, py = field.y + r * ph
        const isRemoved = (field.removed || []).includes(idx)
        ctx.fillStyle = isRemoved ? COLORS.removedFill : COLORS.panelFill
        ctx.fillRect(px + 1, py + 1, pw - 2, ph - 2)
        ctx.strokeStyle = isRemoved ? COLORS.removedX : COLORS.panelBorder
        ctx.lineWidth = isRemoved ? 0.5 : 1
        ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2)
        if (isRemoved) {
          ctx.strokeStyle = COLORS.removedX
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(px + 4, py + 4); ctx.lineTo(px + pw - 4, py + ph - 4)
          ctx.moveTo(px + pw - 4, py + 4); ctx.lineTo(px + 4, py + ph - 4)
          ctx.stroke()
        }
      }
    }
    ctx.strokeStyle = opts.selectedId === field.id ? COLORS.selected : COLORS.panelBorder
    ctx.lineWidth = opts.selectedId === field.id ? 2 : 1.5
    ctx.strokeRect(field.x, field.y, fw, fh)
  }

  drawObstacles(ctx, obstacles)
}
```

- [ ] **Steg 4: Kör tester — ska vara gröna**

```bash
npm test -- --run
```
Förväntat: 49 passed (47 + 2 nya).

- [ ] **Steg 5: Commit**

```bash
git add src/utils/canvasRender.js src/utils/__tests__/canvasRender.test.js
git commit -m "feat: drawRoofBoundary, drawObstacles, obstacleFromMeters — canvasRender"
```

---

## Task 3: Layout.jsx — takram + lägesväljare

**Filer:**
- Modify: `src/pages/Project/Layout.jsx`

- [ ] **Steg 1: Ersätt hela Layout.jsx**

```jsx
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
```

- [ ] **Steg 2: Kör testerna**

```bash
npm test -- --run
```
Förväntat: 49 passed.

- [ ] **Steg 3: Starta dev-servern och verifiera manuellt**

```bash
npm run dev
```

Kontrollera:
- Lägesknapparna syns i toolbar
- Blå takram ritas utifrån takplanets mått
- Hinderdialogen öppnas med "+ Hinder (mått)"-knappen
- "Flytta"-läget byter markörtyp

- [ ] **Steg 4: Commit**

```bash
git add src/pages/Project/Layout.jsx
git commit -m "feat: layout-canvas lägesväljare, takram, flytta fält, rita/formulär hinder"
```

---

## Task 4: Report.jsx — per-takplan canvas

**Filer:**
- Modify: `src/pages/Project/Report.jsx`

- [ ] **Steg 1: Ersätt sida 3 i Report.jsx**

Ersätt `useRef(null)` i toppen med:
```js
const canvasRefs = useRef([])
```

Ersätt `useEffect` som ritar canvas (de två useEffect-blocken) med ett enda block:

```js
useEffect(() => {
  planes.forEach((plane, i) => {
    const canvas = canvasRefs.current[i]
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fafcff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const planeData = canvasData[plane.id] || { fields: [], obstacles: [] }
    drawRoofBoundary(ctx, plane)
    drawLayout(ctx, planeData, panel, { gridW: canvas.width, gridH: canvas.height, showGrid: false })
  })
}, [canvasData, panel, planes])
```

Ersätt hela Sida 3-blocket (`{/* Sida 3 */}`) med:

```jsx
{/* Sida 3 */}
<div id="report-page-3" style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
  <PageHeader title="Layoutritning" />
  <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 14 }}>Panellayout per takplan</div>
  <div style={{ fontSize: 10, color: '#5a6a7a', marginBottom: 16 }}>
    Totalt {totalPanels} paneler · Skala 1 px = 1 cm
  </div>
  {planes.map((plane, i) => {
    const pd = canvasData[plane.id] || { fields: [], obstacles: [] }
    const panelCount = (pd.fields || []).reduce((s, f) => s + f.cols * f.rows - (f.removed?.length ?? 0), 0)
    const cW = Math.min(698, Math.round((plane.length || 10) * 100))
    const cH = Math.round((plane.width || 6) * 100 * (cW / Math.round((plane.length || 10) * 100)))
    return (
      <div key={plane.id} style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 11, color: '#1557a0', marginBottom: 6, textTransform: 'uppercase' }}>
          Takplan {plane.id} — {plane.length} × {plane.width} m · {panelCount} paneler
        </div>
        <canvas
          ref={el => { canvasRefs.current[i] = el }}
          width={cW}
          height={cH}
          style={{ border: '1px solid #dce4ef', borderRadius: 4, display: 'block' }}
        />
      </div>
    )
  })}
  <PageFooter page={3} />
</div>
```

Ta bort den gamla `import { drawLayout }` och lägg till `drawRoofBoundary` i importen:
```js
import { drawLayout, drawRoofBoundary } from '../../utils/canvasRender.js'
```

- [ ] **Steg 2: Kör tester**

```bash
npm test -- --run
```
Förväntat: 49 passed.

- [ ] **Steg 3: Commit**

```bash
git add src/pages/Project/Report.jsx
git commit -m "feat: rapport sida 3 med ett canvas per takplan, takram och hinder"
```

---

## Task 5: dxfExport.js — DXF R12-generator

**Filer:**
- Create: `src/utils/dxfExport.js`
- Create: `src/utils/__tests__/dxfExport.test.js`

DXF R12-format: Y-axeln är inverterad mot canvas (Y ökar uppåt i DXF). Enheter i cm (1 px = 1 cm). Funktionen tar `plane` och `planeData` och returnerar en DXF-sträng.

- [ ] **Steg 1: Skriv failande tester**

Skapa `src/utils/__tests__/dxfExport.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { generateDxf } from '../dxfExport.js'

const panel = { width: 1.1, height: 1.7 }
const plane = { id: 1, length: 8.4, width: 6.0 }
const planeData = {
  fields: [{ id: 'f1', x: 0, y: 0, cols: 2, rows: 1, orientation: 'portrait', removed: [] }],
  obstacles: [{ id: 'o1', x: 200, y: 100, w: 50, h: 50, label: 'Skorsten' }],
}

describe('generateDxf', () => {
  it('returnerar en sträng som börjar med DXF-header', () => {
    const dxf = generateDxf(plane, planeData, panel)
    expect(typeof dxf).toBe('string')
    expect(dxf).toContain('SECTION')
    expect(dxf).toContain('ENTITIES')
    expect(dxf).toContain('ENDSEC')
    expect(dxf).toContain('EOF')
  })

  it('innehåller LINE-entiteter för takramen', () => {
    const dxf = generateDxf(plane, planeData, panel)
    expect(dxf).toContain('LINE')
  })

  it('innehåller TEXT-entitet med hindrets etikett', () => {
    const dxf = generateDxf(plane, planeData, panel)
    expect(dxf).toContain('Skorsten')
  })

  it('innehåller takplanets dimensioner', () => {
    const dxf = generateDxf(plane, planeData, panel)
    expect(dxf).toContain('840') // 8.4m * 100 = 840 cm
  })
})
```

- [ ] **Steg 2: Kör — ska faila**

```bash
npm test -- --run
```
Förväntat: dxfExport-testerna failar (modul ej skapad).

- [ ] **Steg 3: Implementera dxfExport.js**

Skapa `src/utils/dxfExport.js`:

```js
function line(x1, y1, x2, y2, layer = '0') {
  return `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n30\n0.0\n11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n31\n0.0`
}

function rect(x, y, w, h, layer = '0') {
  const x2 = x + w, y2 = y + h
  return [
    line(x, y, x2, y, layer),
    line(x2, y, x2, y2, layer),
    line(x2, y2, x, y2, layer),
    line(x, y2, x, y, layer),
  ].join('\n')
}

function text(x, y, content, height = 10, layer = '0') {
  return `0\nTEXT\n8\n${layer}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0.0\n40\n${height}\n1\n${content}`
}

// DXF Y-axel är inverterad: dxfY = totalH - canvasY
export function generateDxf(plane, planeData, panel) {
  const totalW = Math.round((plane.length || 10) * 100)
  const totalH = Math.round((plane.width  || 6)  * 100)
  const fields    = planeData?.fields    || []
  const obstacles = planeData?.obstacles || []
  const pw = Math.round((panel.width  || 1.1) * 100)
  const ph = Math.round((panel.height || 1.7) * 100)

  const flip = y => totalH - y  // canvas → DXF Y

  const entities = []

  // Takram
  entities.push(rect(0, 0, totalW, totalH, 'TAKRAM'))
  entities.push(text(totalW / 2, totalH + 12, `${plane.length}m`, 8, 'MATT'))
  entities.push(text(-20, totalH / 2, `${plane.width}m`, 8, 'MATT'))

  // Panelfält
  for (const field of fields) {
    for (let r = 0; r < field.rows; r++) {
      for (let c = 0; c < field.cols; c++) {
        const px = field.x + c * pw
        const py = field.y + r * ph
        const dxfY = flip(py + ph)
        entities.push(rect(px, dxfY, pw, ph, 'PANELER'))
      }
    }
  }

  // Hinder
  for (const obs of obstacles) {
    const dxfY = flip(obs.y + obs.h)
    entities.push(rect(obs.x, dxfY, obs.w, obs.h, 'HINDER'))
    entities.push(text(obs.x + 2, dxfY + 12, obs.label, 7, 'HINDER'))
  }

  return [
    '0\nSECTION\n2\nHEADER\n0\nENDSEC',
    '0\nSECTION\n2\nENTITIES',
    ...entities,
    '0\nENDSEC\n0\nEOF',
  ].join('\n')
}

export function downloadDxf(filename, content) {
  const blob = new Blob([content], { type: 'application/dxf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Steg 4: Kör tester**

```bash
npm test -- --run
```
Förväntat: 53 passed (49 + 4 nya).

- [ ] **Steg 5: Commit**

```bash
git add src/utils/dxfExport.js src/utils/__tests__/dxfExport.test.js
git commit -m "feat: DXF R12-generator för panellayout, takram och hinder"
```

---

## Task 6: CAD.jsx — teknisk ritning + ritningshuvud + export

**Filer:**
- Create: `src/pages/Project/CAD.jsx`

- [ ] **Steg 1: Skapa src/pages/Project/CAD.jsx**

```jsx
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

    // Offset så ram inte klipps
    ctx.save()
    ctx.translate(30, 30)
    drawRoofBoundary(ctx, selectedPlane)
    drawLayout(ctx, planeData, panel, { gridW: roofW, gridH: roofH, showGrid: true })
    ctx.restore()

    // Dimensionslinjer
    ctx.strokeStyle = '#1557a0'
    ctx.lineWidth = 0.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(30, 20); ctx.lineTo(30 + roofW, 20)  // överkant
    ctx.moveTo(20, 30); ctx.lineTo(20, 30 + roofH)  // vänsterkant
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#1557a0'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`${selectedPlane.length} m`, 30 + roofW / 2, 14)
    ctx.save(); ctx.translate(12, 30 + roofH / 2); ctx.rotate(-Math.PI / 2)
    ctx.fillText(`${selectedPlane.width} m`, 0, 0)
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
```

- [ ] **Steg 2: Kör tester**

```bash
npm test -- --run
```
Förväntat: 53 passed.

- [ ] **Steg 3: Commit**

```bash
git add src/pages/Project/CAD.jsx
git commit -m "feat: CAD-flik med teknisk ritning, ritningshuvud, DXF- och PNG-export"
```

---

## Task 7: ProjectView.jsx — aktivera flik 9

**Filer:**
- Modify: `src/pages/Project/ProjectView.jsx`

- [ ] **Steg 1: Importera CAD och aktivera flik 9**

Lägg till import i toppen:
```js
import CAD from './CAD.jsx'
```

Lägg till flik i `TABS`-arrayen efter Layout (flik 5):
```js
{ n: 5,  icon: '▦',  label: 'Layout' },
{ n: 9,  icon: '📐', label: 'CAD' },      // ← lägg till
{ n: 6,  icon: '⚡',  label: 'Elsystem' },
```

Lägg till rendering i JSX-blocket:
```jsx
{projectTab === 9  && <CAD />}
```

- [ ] **Steg 2: Kör tester**

```bash
npm test -- --run
```
Förväntat: 53 passed.

- [ ] **Steg 3: Starta dev-servern och verifiera alla funktioner**

```bash
npm run dev
```

Kontrollera:
- Flik 9 "📐 CAD" syns i navigationen
- CAD-fliken visar teknisk ritning med takram och måttsättning
- Ritningshuvud med Karpheds-logga syns till höger
- "Ladda ner DXF" laddar ner en .dxf-fil
- "Exportera PNG" laddar ner en .png-fil
- Layout-fliken: alla 4 lägen fungerar (rita/flytta/rita hinder/formulär)
- Rapport sida 3 visar ett canvas per takplan

- [ ] **Steg 4: Kör slutlig testsvit**

```bash
npm test -- --run
```
Förväntat: 53 passed.

- [ ] **Steg 5: Commit**

```bash
git add src/pages/Project/ProjectView.jsx
git commit -m "feat: aktivera CAD-flik (flik 9) i ProjectView"
```

---

## Testtäckning

| Funktion | Typ | Var |
|----------|-----|-----|
| `roofBoundaryDims` | Unit | canvasRender.test.js |
| `obstacleFromMeters` | Unit | canvasRender.test.js |
| `generateDxf` | Unit | dxfExport.test.js |
| Canvas-rendering (drawRoofBoundary, drawLayout, etc.) | Manuell | Dev-server |
| Layout-lägen (draw/move/obstacle/form) | Manuell | Dev-server |
| DXF-nedladdning | Manuell | Dev-server |
