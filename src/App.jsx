import { useEffect } from 'react'
import useProjectStore from './store/useProjectStore.js'
import LoginScreen from './components/LoginScreen.jsx'
import Sidebar from './components/Sidebar.jsx'
import CRMView from './pages/CRM/CRMView.jsx'
import ProjectView from './pages/Project/ProjectView.jsx'
import { T } from './utils/design.js'

export default function App() {
  const { user, authLoading, view, initAuth, cleanupAuth } = useProjectStore()

  useEffect(() => { initAuth(); return () => cleanupAuth() }, [])

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 13, color: T.textMuted }}>Laddar...</div>
    </div>
  )

  if (!user) return <LoginScreen />

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'crm' && <CRMView />}
        {view === 'project' && <ProjectView />}
      </div>
    </div>
  )
}
