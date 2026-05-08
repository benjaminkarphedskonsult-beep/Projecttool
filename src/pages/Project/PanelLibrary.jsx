import { useState, useEffect } from 'react'
import { T, inp, btn, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import SH from '../../components/ui/SH.jsx'
import F from '../../components/ui/F.jsx'

const EMPTY_PANEL = { model: '', wp: 400, width: 1.1, height: 1.7, voc: 40.5, isc: 10.2 }

export default function PanelLibrary() {
  const { panelLibrary, loadPanelLibrary, savePanelLibrary, openProjectData, updateProjectData } = useProjectStore()
  const [form, setForm] = useState(EMPTY_PANEL)
  const activePanel = openProjectData?.activePanel

  useEffect(() => { loadPanelLibrary() }, [loadPanelLibrary])

  const addPanel = () => {
    if (!form.model) return
    savePanelLibrary([...panelLibrary, { ...form, id: Date.now() }])
    setForm(EMPTY_PANEL)
  }

  const removePanel = (id) => savePanelLibrary(panelLibrary.filter(p => p.id !== id))
  const selectPanel = (panel) => updateProjectData({ activePanel: panel })

  return (
    <div>
      <SH>Aktiv panel i projektet</SH>
      {activePanel?.model ? (
        <div style={{ ...card({ borderLeft: `3px solid ${T.green}` }), marginBottom: 20, padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{activePanel.model}</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>{activePanel.wp} Wp · {activePanel.width}×{activePanel.height} m · Voc {activePanel.voc}V</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>Ingen panel vald — välj nedan.</div>
      )}

      <SH>Bibliotek</SH>
      {panelLibrary.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {panelLibrary.map(panel => (
            <div key={panel.id} style={{ ...card({ padding: '10px 14px' }), display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{panel.model}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{panel.wp} Wp · {panel.width}×{panel.height} m · Voc {panel.voc}V · Isc {panel.isc}A</div>
              </div>
              <button onClick={() => selectPanel(panel)} style={{ ...btn(activePanel?.id === panel.id ? 'primary' : 'secondary'), fontSize: 11 }}>
                {activePanel?.id === panel.id ? 'Aktiv' : 'Välj'}
              </button>
              <button onClick={() => removePanel(panel.id)} style={{ ...btn('ghost'), fontSize: 11, color: '#dc2626' }}>Ta bort</button>
            </div>
          ))}
        </div>
      )}

      <SH>Lägg till panel</SH>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
        <F label="Modellnamn" style={{ gridColumn: '1/-1' }}><input style={inp} value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Ex. JA Solar JAM72S30 540W" /></F>
        <F label="Wp"><input style={inp} type="number" value={form.wp} onChange={e => setForm(f => ({ ...f, wp: +e.target.value }))} /></F>
        <F label="Bredd (m)" style={{ padding: '0 8px' }}><input style={inp} type="number" step="0.01" value={form.width} onChange={e => setForm(f => ({ ...f, width: +e.target.value }))} /></F>
        <F label="Höjd (m)"><input style={inp} type="number" step="0.01" value={form.height} onChange={e => setForm(f => ({ ...f, height: +e.target.value }))} /></F>
        <F label="Voc (V)"><input style={inp} type="number" step="0.1" value={form.voc} onChange={e => setForm(f => ({ ...f, voc: +e.target.value }))} /></F>
        <F label="Isc (A)" style={{ padding: '0 8px' }}><input style={inp} type="number" step="0.1" value={form.isc} onChange={e => setForm(f => ({ ...f, isc: +e.target.value }))} /></F>
      </div>
      <button onClick={addPanel} style={{ ...btn('primary'), marginTop: 4 }}>+ Lägg till i bibliotek</button>
    </div>
  )
}
