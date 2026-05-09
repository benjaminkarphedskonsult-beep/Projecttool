import { T } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import StatusBadge, { STATUSES } from '../../components/StatusBadge.jsx'
import Dashboard from './Dashboard.jsx'
import CustomerData from './CustomerData.jsx'
import PanelLibrary from './PanelLibrary.jsx'
import RoofPlanes from './RoofPlanes.jsx'
import ElectricalSystem from './ElectricalSystem.jsx'
import LoadData from './LoadData.jsx'
import Analysis from './Analysis.jsx'
import Layout from './Layout.jsx'
import Report from './Report.jsx'

const TABS = [
  { n: 1,  icon: '⊞', label: 'Översikt' },
  { n: 2,  icon: '🏢', label: 'Kund' },
  { n: 3,  icon: '☀',  label: 'Paneler' },
  { n: 4,  icon: '⬡',  label: 'Takplan' },
  { n: 5,  icon: '▦',  label: 'Layout' },
  { n: 6,  icon: '⚡',  label: 'Elsystem' },
  { n: 7,  icon: '📊', label: 'Timdata' },
  { n: 8,  icon: '📈', label: 'Analys' },
  { n: 10, icon: '📄', label: 'Rapport' },
]

export default function ProjectView() {
  const { openProjectData, projectTab, setProjectTab, updateProjectData } = useProjectStore()
  if (!openProjectData) return null

  const name = openProjectData.customer?.name || 'Namnlöst projekt'
  const status = openProjectData.status || 'Lead'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div style={{ background: '#fff', borderBottom: `1px solid ${T.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.blueDark }}>{name}</div>
        <select value={status} onChange={e => updateProjectData({ status: e.target.value })}
          style={{ border: 'none', background: 'transparent', fontSize: 12, color: T.text, cursor: 'pointer' }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <StatusBadge status={status} size="sm" />
      </div>

      <div style={{ background: '#fff', borderBottom: `1px solid ${T.border}`, padding: '0 20px', display: 'flex', gap: 2, flexShrink: 0 }}>
        {TABS.map(tab => (
          <button key={tab.n} onClick={() => setProjectTab(tab.n)}
            style={{ padding: '10px 14px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: projectTab === tab.n ? 700 : 400,
              color: projectTab === tab.n ? T.blue : T.textMuted,
              borderBottom: projectTab === tab.n ? `2px solid ${T.blue}` : '2px solid transparent',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {projectTab === 1 && <Dashboard />}
        {projectTab === 2 && <CustomerData />}
        {projectTab === 3 && <PanelLibrary />}
        {projectTab === 4 && <RoofPlanes />}
        {projectTab === 6 && <ElectricalSystem />}
        {projectTab === 7 && <LoadData />}
        {projectTab === 8 && <Analysis />}
        {projectTab === 5  && <Layout />}
        {projectTab === 10 && <Report />}
      </div>
    </div>
  )
}
