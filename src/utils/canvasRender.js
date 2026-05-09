export const SNAP = 10   // 10 px = 10 cm
export const PX_PER_M = 100  // 100 px = 1 m

export function snapToGrid(val, grid = SNAP) {
  return Math.round(val / grid) * grid
}

export function panelDims(panel, orientation) {
  const pw = Math.round((panel.width  || 1.1) * PX_PER_M)
  const ph = Math.round((panel.height || 1.7) * PX_PER_M)
  return orientation === 'landscape' ? { w: ph, h: pw } : { w: pw, h: ph }
}

export function countCellRect(field) {
  return field.cols * field.rows - (field.removed?.length ?? 0)
}

export function fieldRect(field, panel) {
  const { w, h } = panelDims(panel, field.orientation)
  return { x: field.x, y: field.y, width: field.cols * w, height: field.rows * h }
}

export function getCellAtPoint(px, py, field, panelW, panelH) {
  const lx = px - field.x, ly = py - field.y
  if (lx < 0 || ly < 0) return null
  const col = Math.floor(lx / panelW)
  const row = Math.floor(ly / panelH)
  if (col >= field.cols || row >= field.rows) return null
  return [col, row]
}

export function cellIndex(col, row, cols) {
  return row * cols + col
}

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

export function drawPreview(ctx, x1, y1, x2, y2) {
  ctx.setLineDash([6, 3])
  ctx.strokeStyle = '#1557a0'
  ctx.lineWidth = 1.5
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
  ctx.setLineDash([])
}
