import { describe, it, expect } from 'vitest'
import { countCellRect, snapToGrid, getCellAtPoint, panelDims, fieldRect } from '../canvasRender.js'
import { roofBoundaryDims, obstacleFromMeters } from '../canvasRender.js'

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

describe('panelDims', () => {
  it('portrait: w=110, h=170 för 1.1m x 1.7m panel', () => {
    expect(panelDims({ width: 1.1, height: 1.7 }, 'portrait')).toEqual({ w: 110, h: 170 })
  })
  it('landscape: w=170, h=110 för 1.1m x 1.7m panel', () => {
    expect(panelDims({ width: 1.1, height: 1.7 }, 'landscape')).toEqual({ w: 170, h: 110 })
  })
  it('defaultar till 1.1m x 1.7m vid saknad panel', () => {
    expect(panelDims({}, 'portrait')).toEqual({ w: 110, h: 170 })
  })
})

describe('fieldRect', () => {
  it('portrait 3x2 fält ger korrekt rect', () => {
    const field = { x: 20, y: 10, cols: 3, rows: 2, orientation: 'portrait' }
    const panel = { width: 1.1, height: 1.7 }
    expect(fieldRect(field, panel)).toEqual({ x: 20, y: 10, width: 330, height: 340 })
  })
})

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
