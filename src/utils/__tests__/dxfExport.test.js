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
