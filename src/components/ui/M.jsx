import { T, card } from '../../utils/design.js'

export default function M({ label, value, unit, color }) {
  return (
    <div style={{ ...card(), padding: '0.75rem' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || T.text }}>{value}</div>
      {unit && <div style={{ fontSize: 10, color: T.textMuted }}>{unit}</div>}
    </div>
  )
}
