import { T, inp } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import F from '../../components/ui/F.jsx'
import SH from '../../components/ui/SH.jsx'

const PROPERTY_TYPES = ['Industri','BRF','Handel','Lantbruk','Kommun']
const TAX_CATEGORIES = ['Företag','BRF','Privatperson']

export default function CustomerData() {
  const { openProjectData, updateProjectData } = useProjectStore()
  const c = openProjectData?.customer || {}
  const set = (field, val) => updateProjectData({ customer: { [field]: val } })

  return (
    <div>
      <SH>Företagsinformation</SH>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <F label="Företagsnamn"><input style={inp} value={c.name || ''} onChange={e => set('name', e.target.value)} placeholder="Svensson Industri AB" /></F>
        <F label="Org.nr" style={{ paddingLeft: 12 }}><input style={inp} value={c.orgNr || ''} onChange={e => set('orgNr', e.target.value)} placeholder="556xxx-xxxx" /></F>
        <F label="Kontaktperson"><input style={inp} value={c.contact || ''} onChange={e => set('contact', e.target.value)} /></F>
        <F label="E-post" style={{ paddingLeft: 12 }}><input style={inp} type="email" value={c.email || ''} onChange={e => set('email', e.target.value)} /></F>
        <F label="Telefon"><input style={inp} value={c.phone || ''} onChange={e => set('phone', e.target.value)} /></F>
        <F label="Adress" style={{ paddingLeft: 12 }}><input style={inp} value={c.address || ''} onChange={e => set('address', e.target.value)} /></F>
      </div>

      <SH>Klassificering</SH>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <F label="Fastighetstyp">
          <select style={inp} value={c.propertyType || 'Industri'} onChange={e => set('propertyType', e.target.value)}>
            {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </F>
        <F label="Skattekategori" style={{ paddingLeft: 12 }}>
          <select style={inp} value={c.taxCategory || 'Företag'} onChange={e => set('taxCategory', e.target.value)}>
            {TAX_CATEGORIES.map(t => <option key={t}>{t}</option>)}
          </select>
        </F>
      </div>
    </div>
  )
}
