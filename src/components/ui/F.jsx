import { T } from '../../utils/design.js'

export default function F({ label, children, style }) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <label style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {children}
      </label>
    </div>
  )
}
