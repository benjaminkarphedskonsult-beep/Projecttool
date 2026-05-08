import { T } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import KPI from '../../components/ui/KPI.jsx'
import M from '../../components/ui/M.jsx'
import SH from '../../components/ui/SH.jsx'

const fmt = (n, dec = 0) => n != null && isFinite(n) ? n.toLocaleString('sv-SE', { maximumFractionDigits: dec }) : '—'

export default function Dashboard() {
  const { calc, openProjectData, updateProjectData } = useProjectStore()
  const notes = openProjectData?.notes || ''

  return (
    <div>
      <SH>Systemöversikt</SH>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <KPI icon="⚡" label="Systemstorlek"     value={fmt(calc?.totalKWp, 1)}    unit="kWp"  color={T.blue} />
        <KPI icon="☀" label="Årsproduktion"     value={fmt(calc?.annualProd)}       unit="kWh/år" />
        <KPI icon="💰" label="Netto / år"        value={fmt(calc?.netAfterTax)}     unit="kr/år" color={T.green} />
        <KPI icon="📅" label="Återbetalningstid" value={fmt(calc?.payback, 1)}      unit="år" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        <M label="Totala paneler"  value={fmt(calc?.totalPanels)} />
        <M label="Egenanvändning" value={fmt(calc?.selfPct, 1)}  unit="%" />
        <M label="Nätexport"      value={fmt(calc?.totExp)}       unit="kWh/år" />
        <M label="CO₂-besparing"  value={fmt(calc?.co2saved)}     unit="kg/år" color={T.green} />
      </div>

      <SH>Anteckningar</SH>
      <textarea
        value={notes}
        onChange={e => updateProjectData({ notes: e.target.value })}
        placeholder="Skriv anteckningar om projektet..."
        style={{ width: '100%', minHeight: 120, padding: '10px 12px', fontSize: 13, color: T.text,
          background: '#f5f8fc', border: `1.5px solid ${T.border}`, borderRadius: 8, resize: 'vertical', outline: 'none' }}
      />
    </div>
  )
}
