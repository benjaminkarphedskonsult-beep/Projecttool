import { useEffect } from 'react'
import { T, card } from '../../utils/design.js'
import { calcProject } from '../../utils/calc.js'
import useProjectStore from '../../store/useProjectStore.js'
import Pipeline from './Pipeline.jsx'
import ProjectList from './ProjectList.jsx'
import Stats from './Stats.jsx'

function safeCalc(data) {
  if (!data) return null
  try { return calcProject(data) } catch { return null }
}

export default function CRMView() {
  const { crmTab, projects, loadProjects } = useProjectStore()
  useEffect(() => { loadProjects() }, [])

  const total    = projects.length
  const totalKWp = projects.reduce((s, p) => s + (safeCalc(p.data)?.totalKWp || 0), 0)
  const won      = projects.filter(p => p.data?.status === 'Vunnet').length

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Totalt projekt', value: total },
          { label: 'Total kWp',      value: totalKWp.toFixed(1) },
          { label: 'Vunna affärer',  value: won },
        ].map(k => (
          <div key={k.label} style={{ ...card(), padding: '1rem' }}>
            <div style={{ fontSize: 10, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.blueDark }}>{k.value}</div>
          </div>
        ))}
      </div>

      {crmTab === 'pipeline' && <Pipeline />}
      {crmTab === 'list'     && <ProjectList />}
      {crmTab === 'stats'    && <Stats />}
    </div>
  )
}
