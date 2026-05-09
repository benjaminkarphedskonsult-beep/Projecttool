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
