import { useMemo } from 'react'
import { T, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import StatusBadge, { STATUSES } from '../../components/StatusBadge.jsx'
import { calcProject } from '../../utils/calc.js'

export default function Pipeline() {
  const { projects, openProject, openProjectId } = useProjectStore()

  const grouped = useMemo(
    () => Object.fromEntries(STATUSES.map(s => [s, projects.filter(p => (p.data?.status || 'Lead') === s)])),
    [projects]
  )

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {STATUSES.map(status => (
        <div key={status} style={{ minWidth: 220, flex: '0 0 220px' }}>
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusBadge status={status} size="sm" />
            <span style={{ fontSize: 11, color: T.textMuted }}>{grouped[status].length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped[status].map(p => {
              const calc = safeCalc(p.data)
              return (
                <div key={p.id} onClick={() => openProject(p.id)}
                  style={{ ...card(), padding: '12px', cursor: 'pointer', borderLeft: `3px solid ${T.blue}`,
                    outline: p.id === openProjectId ? `2px solid ${T.blue}` : 'none' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 2 }}>
                    {p.data?.customer?.name || 'Namnlöst projekt'}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>
                    {p.data?.customer?.address || '—'}
                  </div>
                  {calc && (
                    <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <span style={{ color: T.blue, fontWeight: 600 }}>{calc.totalKWp.toFixed(1)} kWp</span>
                      <span style={{ color: T.green }}>{Math.round(calc.netAfterTax).toLocaleString('sv-SE')} kr/år</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function safeCalc(data) {
  if (!data) return null
  try { return calcProject(data) } catch { return null }
}
