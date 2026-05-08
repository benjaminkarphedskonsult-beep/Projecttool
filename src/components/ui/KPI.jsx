import { T, card } from '../../utils/design.js'

export default function KPI({ icon, label, value, unit, color }) {
  return (
    <div style={{ ...card(), padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || T.blueDark, lineHeight: 1 }}>{value}</div>
      {unit && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{unit}</div>}
    </div>
  )
}
