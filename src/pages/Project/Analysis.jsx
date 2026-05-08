import { T, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import M from '../../components/ui/M.jsx'
import SH from '../../components/ui/SH.jsx'
import { MONTHLY_F, MON_DAYS } from '../../utils/calc.js'

const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec']
const fmt = (n, dec = 0) => n != null && isFinite(n) ? n.toLocaleString('sv-SE', { maximumFractionDigits: dec }) : '—'

function BarChart({ monthlyProd, annualLoad }) {
  if (!monthlyProd) return null
  const monthlyLoad = MONTHLY_F.map((f, mi) => annualLoad / 12 * MON_DAYS[mi] / 30)
  const max = Math.max(...monthlyProd, ...monthlyLoad, 1)
  const barW = 28, gap = 6, h = 120, pad = 20

  return (
    <svg width={(barW * 2 + gap) * 12 + pad * 2} height={h + 30} style={{ display: 'block', maxWidth: '100%' }}>
      {monthlyProd.map((prod, mi) => {
        const load = monthlyLoad[mi]
        const ph = (prod / max) * h
        const lh = (load / max) * h
        const x = pad + mi * (barW * 2 + gap + 4)
        return (
          <g key={mi}>
            <rect x={x} y={h - ph + pad} width={barW} height={ph} fill={T.orange} rx="2" opacity="0.8" />
            <rect x={x + barW + gap} y={h - lh + pad} width={barW} height={lh} fill={T.blue} rx="2" opacity="0.6" />
            <text x={x + barW} y={h + pad + 14} textAnchor="middle" fontSize="9" fill={T.textMuted}>{MONTHS[mi]}</text>
          </g>
        )
      })}
      <text x={pad} y={14} fontSize="9" fill={T.orange}>■ Prod</text>
      <text x={pad + 48} y={14} fontSize="9" fill={T.blue}>■ Förb</text>
    </svg>
  )
}

export default function Analysis() {
  const { calc, openProjectData } = useProjectStore()
  const taxCat = openProjectData?.customer?.taxCategory || 'Företag'
  const annualLoad = openProjectData?.loadData?.annualLoad || 0

  return (
    <div>
      <SH>Nyckeltal</SH>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <M label="Årsproduktion"        value={fmt(calc?.annualProd)}       unit="kWh/år" />
        <M label="Egenanvändning"       value={fmt(calc?.totSelf)}           unit="kWh/år" />
        <M label="Nätexport"            value={fmt(calc?.totExp)}            unit="kWh/år" />
        <M label="Självförsörjning"     value={fmt(calc?.selfPct, 1)}        unit="%" />
        <M label="Energibesparing"      value={fmt(calc?.energySave)}        unit="kr/år" color={T.green} />
        <M label="Effekttoppsbesparing" value={fmt(calc?.peakSave)}          unit="kr/år" color={T.green} />
        <M label="Brutto"               value={fmt(calc ? calc.energySave + calc.peakSave : null)} unit="kr/år" />
        <M label="Netto (efter skatt)"  value={fmt(calc?.netAfterTax)}       unit="kr/år" color={T.green} />
      </div>

      <div style={{ ...card({ borderLeft: `3px solid ${T.orange}` }), marginBottom: 20, padding: '16px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.blueDark, marginBottom: 10 }}>Skatteanalys — {taxCat}</div>
        {taxCat === 'Privatperson' && (
          <>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Schablonavdrag: 40 000 kr/år · Kapitalskatt: 30% · 60-öringen borttagen 2026</div>
            <div style={{ fontSize: 13 }}>Skatt: <strong>{fmt(calc?.taxAmt)} kr/år</strong></div>
          </>
        )}
        {(taxCat === 'Företag' || taxCat === 'BRF') && (
          <>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Bolagsskatt: 20,6% · Momsskyldighet vid exportintäkt {'>'} 120 000 kr/år</div>
            <div style={{ fontSize: 13 }}>Skatt: <strong>{fmt(calc?.taxAmt)} kr/år</strong></div>
          </>
        )}
        {calc && calc.totalKWp >= 500 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#d97706' }}>⚠ Energiskatt tillkommer: {fmt(calc.energyTax)} kr/år (≥500 kWp)</div>
        )}
      </div>

      <SH>Produktion vs förbrukning</SH>
      <div style={{ ...card({ padding: '16px' }), overflowX: 'auto', marginBottom: 20 }}>
        <BarChart monthlyProd={calc?.monthlyProd} annualLoad={annualLoad} />
      </div>

      <SH>Månadsanalys</SH>
      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {['Månad','Prod (kWh)','Förb (kWh)','Egenanv','Export','Besparing'].map(col => (
                <th key={col} scope="col" style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${T.border}` }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((m, mi) => {
              const prod = calc?.monthlyProd?.[mi] || 0
              const load = annualLoad / 12 * MON_DAYS[mi] / 30
              const self = Math.min(prod, load)
              const exp  = Math.max(0, prod - load)
              const save = self * ((openProjectData?.loadData?.spotPrice ?? 0) + (openProjectData?.loadData?.gridTariff ?? 0))
              return (
                <tr key={m} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: '7px 12px', fontWeight: 600 }}>{m}</td>
                  <td style={{ padding: '7px 12px' }}>{fmt(prod)}</td>
                  <td style={{ padding: '7px 12px' }}>{fmt(load)}</td>
                  <td style={{ padding: '7px 12px' }}>{fmt(self)}</td>
                  <td style={{ padding: '7px 12px' }}>{fmt(exp)}</td>
                  <td style={{ padding: '7px 12px', color: T.green, fontWeight: 600 }}>{fmt(save)} kr</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
