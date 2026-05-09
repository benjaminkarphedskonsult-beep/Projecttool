import { describe, it, expect } from 'vitest'
import { countCellRect, snapToGrid, getCellAtPoint } from '../canvasRender.js'

describe('snapToGrid', () => {
  it('snaps 23 to 20 with grid 10', () => {
    expect(snapToGrid(23, 10)).toBe(20)
  })
  it('snaps 25 to 30 with grid 10', () => {
    expect(snapToGrid(25, 10)).toBe(30)
  })
})

describe('countCellRect', () => {
  it('counts 6x4 grid minus 2 removed = 22', () => {
    const field = { cols: 6, rows: 4, removed: [0, 5] }
    expect(countCellRect(field)).toBe(22)
  })
  it('counts 1x1 grid with no removed = 1', () => {
    expect(countCellRect({ cols: 1, rows: 1, removed: [] })).toBe(1)
  })
})

describe('getCellAtPoint', () => {
  it('returns correct [col, row] for a point inside a field', () => {
    const field = { x: 0, y: 0, cols: 3, rows: 2, orientation: 'portrait' }
    // panelW=110, panelH=170 (portrait, 1.1m x 1.7m)
    expect(getCellAtPoint(115, 5, field, 110, 170)).toEqual([1, 0])
  })
  it('returns null for a point outside the field', () => {
    const field = { x: 0, y: 0, cols: 2, rows: 2, orientation: 'portrait' }
    expect(getCellAtPoint(300, 5, field, 110, 170)).toBeNull()
  })
})
