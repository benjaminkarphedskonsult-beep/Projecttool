import { T, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import StatusBadge, { STATUSES } from '../../components/StatusBadge.jsx'
import { calcProject } from '../../utils/calc.js'

export default function Stats() {
  const { projects } = useProjectStore()

  const byStatus = STATUSES.map(s => ({ status: s, count: projects.filter(p => (p.data?.status || 'Lead') === s).length }))
  const total = projects.length || 1

  const calcs = projects.map(p => { try { return calcProject(p.data) } catch { return null } }).filter(Boolean)
  const totalKWp = calcs.reduce((s, c) => s + c.totalKWp, 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ ...card() }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.blueDark, marginBottom: 12 }}>Statusfördelning</div>
        {byStatus.map(({ status, count }) => (
          <div key={status} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <StatusBadge status={status} size="sm" />
              <span style={{ fontSize: 12, color: T.textMuted }}>{count} projekt</span>
            </div>
            <div style={{ background: T.borderLight, borderRadius: 4, height: 6 }}>
              <div style={{ background: T.blue, borderRadius: 4, height: 6, width: `${(count / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card() }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.blueDark, marginBottom: 12 }}>Total kapacitet</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: T.blue }}>{totalKWp.toFixed(1)}</div>
        <div style={{ fontSize: 12, color: T.textMuted }}>kWp i pipeline</div>
        <div style={{ marginTop: 16, fontSize: 12, color: T.textMuted }}>
          Snitt per projekt: <strong>{projects.length ? (totalKWp / projects.length).toFixed(1) : 0} kWp</strong>
        </div>
      </div>
    </div>
  )
}
