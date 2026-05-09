import { useRef, useEffect } from 'react'
import { T, btn } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import { MONTHLY_F, MON_DAYS } from '../../utils/calc.js'
import { drawLayout, drawRoofBoundary } from '../../utils/canvasRender.js'

const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
const DEFAULT_PANEL = { model: '', wp: 400, width: 1.1, height: 1.7 }

const PRINT_CSS = `
@media print {
  body * { visibility: hidden; }
  #report-page-1, #report-page-1 *,
  #report-page-2, #report-page-2 *,
  #report-page-3, #report-page-3 * { visibility: visible; }
  .no-print { display: none !important; }
  @page { size: A4; margin: 0; }
  #report-page-2 { page-break-before: always; }
  #report-page-3 { page-break-before: always; }
}`
const fmt = (n, dec = 0) => (n != null && isFinite(n)) ? n.toLocaleString('sv-SE', { maximumFractionDigits: dec }) : '—'
const A4_W = 794
const A4_H = 1123

const pageStyle = {
  width: A4_W,
  minHeight: A4_H,
  background: '#fff',
  padding: '40px 48px',
  boxSizing: 'border-box',
  fontFamily: 'Arial, sans-serif',
  fontSize: 11,
  color: '#1a2332',
  marginBottom: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
}

function PageHeader({ title }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, borderBottom: '2px solid #1557a0', paddingBottom: 12 }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#0d2444' }}>Karpheds Energikonsult AB</div>
        <div style={{ fontSize: 12, color: '#5a6a7a', marginTop: 2 }}>Solenergi CRM Pro — {title}</div>
      </div>
      <div style={{ textAlign: 'right', fontSize: 10, color: '#8a9ab0' }}>
        <div>karphedskonsult.com</div>
        <div>{new Date().toLocaleDateString('sv-SE')}</div>
      </div>
    </div>
  )
}

function PageFooter({ page }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #dce4ef', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#8a9ab0' }}>
      <span>Karpheds Energikonsult AB · karphedskonsult.com</span>
      <span>Sida {page} av 3</span>
    </div>
  )
}

function KV({ label, value, unit }) {
  return (
    <div style={{ padding: '8px 12px', background: '#f0f4f9', borderRadius: 6, minWidth: 120 }}>
      <div style={{ fontSize: 9, color: '#5a6a7a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: '#1557a0', marginTop: 2 }}>{value}</div>
      {unit && <div style={{ fontSize: 9, color: '#8a9ab0' }}>{unit}</div>}
    </div>
  )
}

export default function Report() {
  const { openProjectData, calc } = useProjectStore()
  const canvasRefs = useRef([])

  const cust   = openProjectData?.customer || {}
  const panel  = openProjectData?.activePanel || DEFAULT_PANEL
  const planes = openProjectData?.roofPlanes || []
  const load   = openProjectData?.loadData || {}
  const elec   = openProjectData?.electrical || {}
  const canvasData = openProjectData?.canvasData || {}

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = PRINT_CSS
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

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

  const handlePrint = () => window.print()

  const totalPanels = planes.reduce((s, p) => s + (p.panels || 0), 0)

  return (
    <>
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={handlePrint} style={{ ...btn('primary') }}>
          🖨️ Skriv ut / Exportera PDF
        </button>
        <span style={{ fontSize: 11, color: T.textMuted }}>Rapport genereras som 3-sidig A4-PDF</span>
      </div>

      {/* Sida 1 */}
      <div id="report-page-1" style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="Teknisk Offert" />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Kund</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {[
                ['Namn / Org.', cust.name || '—'],
                ['Org.nr', cust.orgNr || '—'],
                ['Kontakt', cust.contact || '—'],
                ['E-post', cust.email || '—'],
                ['Telefon', cust.phone || '—'],
                ['Adress', cust.address || '—'],
                ['Fastighetstyp', cust.propertyType || '—'],
                ['Skattekategori', cust.taxCategory || '—'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '3px 8px 3px 0', color: '#5a6a7a', width: 140 }}>{k}</td>
                  <td style={{ padding: '3px 0', fontWeight: 500 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Systemspecifikation</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {[
                ['Panelmodell', panel.model || '—'],
                ['Effekt per panel', `${panel.wp} Wp`],
                ['Antal paneler (totalt)', totalPanels],
                ['Total systemstorlek', `${fmt(calc?.totalKWp, 1)} kWp`],
                ['Inverterverkningsgrad', `${((elec.inverterEff || 0.97) * 100).toFixed(0)} %`],
                ['Säkring', `${elec.fuse || '—'} A / ${elec.phases || '—'}-fas`],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #eef2f7' }}>
                  <td style={{ padding: '5px 8px 5px 0', color: '#5a6a7a', width: 200 }}>{k}</td>
                  <td style={{ padding: '5px 0', fontWeight: 600 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Nyckeltal</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <KV label="Årsproduktion"     value={fmt(calc?.annualProd)}     unit="kWh/år" />
            <KV label="Egenanvändning"    value={fmt(calc?.totSelf)}         unit="kWh/år" />
            <KV label="Nätexport"         value={fmt(calc?.totExp)}          unit="kWh/år" />
            <KV label="Självförsörjning"  value={fmt(calc?.selfPct, 1)}      unit="%" />
            <KV label="Nettobesparing"    value={fmt(calc?.netAfterTax)}     unit="kr/år" />
            <KV label="Återbetalningstid" value={fmt(calc?.payback, 1)}      unit="år" />
            <KV label="CO₂-besparing"     value={fmt(calc?.co2saved)}        unit="kg/år" />
          </div>
        </div>

        <div style={{ marginBottom: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Takplan</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#e8f0fb' }}>
                {['#','Längd (m)','Bredd (m)','Lutning','Azimut','Paneler'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#1557a0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planes.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eef2f7' }}>
                  <td style={{ padding: '5px 8px' }}>{i + 1}</td>
                  <td style={{ padding: '5px 8px' }}>{p.length}</td>
                  <td style={{ padding: '5px 8px' }}>{p.width}</td>
                  <td style={{ padding: '5px 8px' }}>{p.tilt}°</td>
                  <td style={{ padding: '5px 8px' }}>{p.azimuth}°</td>
                  <td style={{ padding: '5px 8px', fontWeight: 600 }}>{p.panels}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PageFooter page={1} />
      </div>

      {/* Sida 2 */}
      <div id="report-page-2" style={{ ...pageStyle, display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="Ekonomisk Analys" />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Ekonomisk sammanställning</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {[
                ['Energibesparing',           `${fmt(calc?.energySave)} kr/år`],
                ['Effektbesparing',           `${fmt(calc?.peakSave)} kr/år`],
                ['Skatt / avgift',            `${fmt(calc?.taxAmt)} kr/år`],
                ...(calc?.energyTax > 0 ? [['Energiskatt (≥500 kWp)', `${fmt(calc?.energyTax)} kr/år`]] : []),
                ['Nettobesparing efter skatt',`${fmt(calc?.netAfterTax)} kr/år`],
                ['Investering (est.)',         `${fmt(calc?.invest)} kr`],
                ['Återbetalningstid',          `${fmt(calc?.payback, 1)} år`],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #eef2f7' }}>
                  <td style={{ padding: '5px 8px 5px 0', color: '#5a6a7a', width: 240 }}>{k}</td>
                  <td style={{ padding: '5px 0', fontWeight: 600, color: '#1a2332' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Skatteanalys</div>
          <div style={{ background: '#f0f4f9', borderRadius: 6, padding: '10px 14px', fontSize: 11 }}>
            <div><strong>Kategori:</strong> {cust.taxCategory || '—'}</div>
            <div><strong>Taxeringsår:</strong> {load.taxYear || '2026'}</div>
            <div><strong>Exportintäkt:</strong> {fmt(calc?.exportRevenue)} kr/år</div>
            <div style={{ marginTop: 8, color: '#5a6a7a', fontSize: 10 }}>
              {cust.taxCategory === 'Privatperson'
                ? load.taxYear === '2025'
                  ? 'Kapitalskatt 30 % på (exportintäkt − 40 000 kr), minus skattereduktion 0,60 kr/kWh (max 30 000 kWh)'
                  : '30 % kapitalskatt på (exportintäkt − 40 000 kr)'
                : '20,6 % bolagsskatt på exportintäkt'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 'auto' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Månadsproduktion vs Förbrukning</div>
          {calc?.monthlyProd && (
            <svg width={698} height={160} style={{ display: 'block' }}>
              {(() => {
                const mp   = calc.monthlyProd
                const ml   = MONTHLY_F.map((f, mi) => (load.annualLoad || 0) / 12 * MON_DAYS[mi] / 30)
                const maxV = Math.max(...mp, ...ml, 1)
                const bW = 22, gap = 4, barGap = 2, h = 120, pad = 20
                return MONTHS.map((m, mi) => {
                  const ph2 = (mp[mi] / maxV) * h
                  const lh2 = (ml[mi] / maxV) * h
                  const x   = pad + mi * (bW * 2 + gap + barGap)
                  return (
                    <g key={mi}>
                      <rect x={x}           y={h - ph2 + pad} width={bW} height={ph2} fill="#d97706" rx="2" opacity="0.85" />
                      <rect x={x + bW + gap} y={h - lh2 + pad} width={bW} height={lh2} fill="#1557a0" rx="2" opacity="0.7" />
                      <text x={x + bW} y={h + pad + 14} textAnchor="middle" fontSize="8" fill="#5a6a7a">{m}</text>
                    </g>
                  )
                })
              })()}
              <text x={20} y={14} fontSize="9" fill="#d97706">■ Produktion</text>
              <text x={100} y={14} fontSize="9" fill="#1557a0">■ Förbrukning</text>
            </svg>
          )}
        </div>

        <PageFooter page={2} />
      </div>

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
    </>
  )
}
