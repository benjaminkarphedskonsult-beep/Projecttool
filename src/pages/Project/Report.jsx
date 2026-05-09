import { useRef, useEffect } from 'react'
import { T, btn } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import { drawLayout } from '../../utils/canvasRender.js'
import { MONTHLY_F, MON_DAYS } from '../../utils/calc.js'

const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
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
  const canvasRef = useRef(null)

  const cust   = openProjectData?.customer || {}
  const panel  = openProjectData?.activePanel || { model: '', wp: 400, width: 1.1, height: 1.7 }
  const planes = openProjectData?.roofPlanes || []
  const load   = openProjectData?.loadData || {}
  const elec   = openProjectData?.electrical || {}
  const canvasData = openProjectData?.canvasData || {}

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fafcff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const allFields = Object.values(canvasData).flat()
    drawLayout(ctx, allFields, panel, { gridW: canvas.width, gridH: canvas.height, showGrid: true })
  }, [canvasData, panel])

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
    </>
  )
}
