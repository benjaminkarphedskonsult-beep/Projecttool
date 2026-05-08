import { T } from '../utils/design.js'
import useProjectStore from '../store/useProjectStore.js'
import StatusBadge from './StatusBadge.jsx'

const NAV_ITEMS = [
  { key: 'pipeline', label: 'Pipeline', icon: '📊' },
  { key: 'list',     label: 'Lista',    icon: '📋' },
  { key: 'stats',    label: 'Statistik',icon: '📈' },
]

const PROJECT_TABS = [
  { n: 1,  icon: '⊞', label: 'Översikt',  fas: 1 },
  { n: 2,  icon: '🏢', label: 'Kunddata', fas: 1 },
  { n: 3,  icon: '☀',  label: 'Paneler',  fas: 1 },
  { n: 4,  icon: '⬡',  label: 'Takplan',  fas: 1 },
  { n: 5,  icon: '▦',  label: 'Layout',   fas: 2 },
  { n: 6,  icon: '⚡',  label: 'Elsystem', fas: 1 },
  { n: 7,  icon: '📊', label: 'Timdata',  fas: 1 },
  { n: 8,  icon: '📈', label: 'Analys',   fas: 1 },
  { n: 9,  icon: '📐', label: 'CAD',      fas: 3 },
  { n: 10, icon: '📄', label: 'Rapport',  fas: 2 },
]

export default function Sidebar() {
  const { user, userRole, view, crmTab, projectTab, openProjectId, openProjectData, projects,
          setView, setCrmTab, setProjectTab, openProject, createProject, signOut, loadProjects } = useProjectStore()

  const handleNewProject = async () => {
    const id = await createProject()
    if (id) openProject(id)
  }

  const currentProject = projects.find(p => p.id === openProjectId)
  const projectName = currentProject?.data?.customer?.name || 'Nytt projekt'

  return (
    <div style={{ width: 220, background: T.bgSidebar, color: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh', overflowY: 'auto' }}>
      <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Karpheds</div>
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>Energikonsult AB</div>
      </div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
        {userRole === 'admin' && <span style={{ background: T.blue, color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>ADMIN</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
      </div>

      <div style={{ padding: '12px 8px' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>CRM</div>
        {NAV_ITEMS.map(item => (
          <SidebarItem key={item.key} icon={item.icon} label={item.label}
            active={view === 'crm' && crmTab === item.key}
            onClick={() => { setView('crm'); setCrmTab(item.key); if (!projects.length) loadProjects() }} />
        ))}
        <button onClick={handleNewProject} style={{ width: '100%', marginTop: 4, background: 'rgba(255,255,255,0.08)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 10px', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer', textAlign: 'left' }}>
          + Nytt projekt
        </button>
      </div>

      {openProjectId && (
        <div style={{ padding: '0 8px 12px' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 6 }}>Projekt</div>
          <div style={{ padding: '6px 10px', fontSize: 11, color: '#a8d8ea', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </div>
          {PROJECT_TABS.map(tab => (
            <SidebarItem key={tab.n} icon={tab.icon} label={tab.label}
              active={view === 'project' && projectTab === tab.n}
              disabled={tab.fas > 1}
              onClick={() => { if (tab.fas === 1) { setView('project'); setProjectTab(tab.n) } }} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 'auto', padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={signOut} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
          Logga ut
        </button>
      </div>
    </div>
  )
}

function SidebarItem({ icon, label, active, disabled, onClick }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={disabled ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
      style={{
        padding: '7px 10px', borderRadius: 6, marginBottom: 2,
        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: disabled ? 'rgba(255,255,255,0.25)' : active ? '#fff' : 'rgba(255,255,255,0.65)',
        cursor: disabled ? 'default' : 'pointer',
      }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
      {disabled && <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>fas 2+</span>}
    </div>
  )
}
