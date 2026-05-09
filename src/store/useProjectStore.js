import { create } from 'zustand'
import { supabase } from '../lib/supabase.js'
import { calcProject } from '../utils/calc.js'

const DEFAULT_PROJECT_DATA = {
  status: 'Lead',
  notes: '',
  customer: { name: '', orgNr: '', contact: '', email: '', phone: '', address: '', propertyType: 'Industri', taxCategory: 'Företag' },
  activePanel: { model: '', wp: 400, width: 1.1, height: 1.7, voc: 40.5, isc: 10.2 },
  roofPlanes: [{ id: 1, length: 10, width: 6, tilt: 35, azimuth: 0, panels: 0, marginN: 0.5, marginS: 0.5, marginE: 0.5, marginW: 0.5 }],
  electrical: { fuse: 63, phases: 3, voltage: 400, inverterEff: 0.97, stringVMax: 1000 },
  loadData: { annualLoad: 0, profile: 'industri', gridTariff: 0.6, spotPrice: 0.8, peakTariff: 80, hasBattery: false, battCapacity: 0, taxYear: '2026' },
  canvasData: {},
}

let saveTimer = null
let authSubscription = null

const useProjectStore = create((set, get) => ({
  // Auth
  user: null,
  userRole: 'user',
  authLoading: true,

  // Navigation
  view: 'crm',
  crmTab: 'pipeline',
  projectTab: 1,

  // Data
  projects: [],
  openProjectId: null,
  openProjectData: null,
  calc: null,
  panelLibrary: [],

  // Actions
  setView: (view) => set({ view }),
  setCrmTab: (crmTab) => set({ crmTab }),
  setProjectTab: (projectTab) => set({ projectTab }),

  initAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      set({ user: session.user, userRole: profile?.role ?? 'user', authLoading: false })
    } else {
      set({ authLoading: false })
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data: profile }) => {
            set({ user: session.user, userRole: profile?.role ?? 'user' })
          })
      } else {
        set({ user: null, userRole: 'user', openProjectId: null, openProjectData: null, calc: null })
      }
    })
    authSubscription = subscription
  },

  signOut: async () => { await supabase.auth.signOut() },

  cleanupAuth: () => {
    authSubscription?.unsubscribe()
    authSubscription = null
  },

  loadProjects: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase.from('projects').select('id, data, created_at, updated_at').eq('user_id', user.id).order('created_at', { ascending: false })
    set({ projects: data || [] })
  },

  openProject: async (id) => {
    const { data } = await supabase.from('projects').select('id, data').eq('id', id).single()
    if (!data) return
    const projectData = deepMerge(DEFAULT_PROJECT_DATA, data.data)
    set({ openProjectId: id, openProjectData: projectData, view: 'project', projectTab: 1, calc: calcProject(projectData) })
  },

  createProject: async () => {
    const { user } = get()
    if (!user) return null
    const { data } = await supabase.from('projects').insert({ user_id: user.id, data: DEFAULT_PROJECT_DATA }).select().single()
    if (!data) return null
    await get().loadProjects()
    return data.id
  },

  deleteProject: async (id) => {
    const { user } = get()
    if (!user) return
    await supabase.from('projects').delete().eq('user_id', user.id).eq('id', id)
    await get().loadProjects()
  },

  updateProjectData: (patch) => {
    const current = get().openProjectData
    if (!current) return
    const updated = deepMerge(current, patch)
    const calc = calcProject(updated)
    set({ openProjectData: updated, calc })
    scheduleSave(get().openProjectId, updated)
  },

  loadPanelLibrary: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase.from('panel_library').select('panels').eq('user_id', user.id).single()
    set({ panelLibrary: data?.panels || [] })
  },
  savePanelLibrary: async (panels) => {
    const { user } = get()
    if (!user) return
    set({ panelLibrary: panels })
    await supabase.from('panel_library').upsert({ user_id: user.id, panels }, { onConflict: 'user_id' })
  },

  updateCanvasFields: (roofPlaneId, fields) => {
    const { openProjectData } = get()
    if (!openProjectData) return
    const planeExists = openProjectData.roofPlanes.some(p => p.id === roofPlaneId)
    if (!planeExists) return
    const panelCount = countCanvasPanels(fields)
    const updatedPlanes = openProjectData.roofPlanes.map(p =>
      p.id === roofPlaneId ? { ...p, panels: panelCount } : p
    )
    get().updateProjectData({
      canvasData: { ...openProjectData.canvasData, [roofPlaneId]: fields },
      roofPlanes: updatedPlanes,
    })
  },
}))

export function countCanvasPanels(fields) {
  return (fields || []).reduce((sum, f) => sum + f.cols * f.rows - (f.removed?.length ?? 0), 0)
}

function deepMerge(base, patch) {
  const result = { ...base }
  for (const key of Object.keys(patch)) {
    if (patch[key] !== null && typeof patch[key] === 'object' && !Array.isArray(patch[key])) {
      result[key] = deepMerge(base[key] || {}, patch[key])
    } else {
      result[key] = patch[key]
    }
  }
  return result
}

function scheduleSave(id, data) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const { error } = await supabase.from('projects').update({ data, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) console.error('[scheduleSave] failed:', error)
  }, 500)
}

export default useProjectStore
