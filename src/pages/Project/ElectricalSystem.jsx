import { T, inp, card } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import F from '../../components/ui/F.jsx'
import SH from '../../components/ui/SH.jsx'

const Check = ({ ok, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px solid ${T.borderLight}`, fontSize: 13 }}>
    <span>{ok ? '✅' : '❌'}</span>
    <span style={{ color: ok ? T.text : '#dc2626' }}>{label}</span>
  </div>
)

export default function ElectricalSystem() {
  const { openProjectData, updateProjectData, calc } = useProjectStore()
  const e = openProjectData?.electrical || {}
  const set = (field, val) => updateProjectData({ electrical: { [field]: val } })

  const dcac = calc?.dcacRatio || 0
  const dcacOk = dcac >= 1.05 && dcac <= 1.35

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div>
        <SH>Indata</SH>
        <F label="Säkring (A)">
          <select style={inp} value={e.fuse || 63} onChange={ev => set('fuse', +ev.target.value)}>
            {[16,20,25,32,40,50,63,80,100,125].map(v => <option key={v}>{v}</option>)}
          </select>
        </F>
        <F label="Faser">
          <select style={inp} value={e.phases || 3} onChange={ev => set('phases', +ev.target.value)}>
            <option value={1}>1-fas</option>
            <option value={3}>3-fas</option>
          </select>
        </F>
        <F label="Spänning (V)">
          <select style={inp} value={e.voltage || 400} onChange={ev => set('voltage', +ev.target.value)}>
            <option value={230}>230 V</option>
            <option value={400}>400 V</option>
          </select>
        </F>
        <F label="Växelriktarverkningsgrad (%)">
          <input style={inp} type="number" min="80" max="100" step="0.1"
            value={Math.round((e.inverterEff || 0.97) * 100)}
            onChange={ev => set('inverterEff', +ev.target.value / 100)} />
        </F>
        <F label="Max strängspänning (V)">
          <input style={inp} type="number" value={e.stringVMax || 1000} onChange={ev => set('stringVMax', +ev.target.value)} />
        </F>
      </div>

      <div>
        <SH>Beräknat utdata</SH>
        {calc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              ['Systemstorlek', `${calc.totalKWp.toFixed(2)} kWp`],
              ['Rekomm. växelriktare', `${calc.recInverter.toFixed(2)} kW`],
              ['DC/AC-kvot', `${calc.dcacRatio.toFixed(2)} (opt. 1.05–1.35)`],
              ['Max AC', `${calc.maxAC.toFixed(1)} kW`],
              ['Paneler/sträng', `${calc.panPerStr} st`],
              ['Antal strängar', `${calc.stringsNeeded} st`],
            ].map(([label, value]) => (
              <div key={label} style={{ ...card({ padding: '8px 12px' }), display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: T.textMuted }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <SH>Systemkontroller</SH>
        {calc ? (
          <>
            <Check ok={calc.totalKWp > 0}                    label="Systemstorlek definierad" />
            <Check ok={dcacOk}                               label={`DC/AC-kvot ${calc.dcacRatio.toFixed(2)} (1.05–1.35)`} />
            <Check ok={calc.panPerStr > 0}                   label={`Paneler/sträng: ${calc.panPerStr}`} />
            <Check ok={calc.maxAC >= calc.recInverter * 0.9} label="Säkring tillräcklig för växelriktare" />
          </>
        ) : (
          <div style={{ fontSize: 13, color: T.textMuted }}>Fyll i takplan och panelbibliotek först.</div>
        )}
      </div>
    </div>
  )
}
