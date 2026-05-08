import { useState } from 'react'
import { T, inp, btn } from '../../utils/design.js'
import useProjectStore from '../../store/useProjectStore.js'
import StatusBadge, { STATUSES } from '../../components/StatusBadge.jsx'
import { calcProject } from '../../utils/calc.js'

export default function ProjectList() {
  const { projects, openProject, deleteProject } = useProjectStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Alla')

  const filtered = projects.filter(p => {
    const name = p.data?.customer?.name?.toLowerCase() || ''
    const addr = p.data?.customer?.address?.toLowerCase() || ''
    const q = search.toLowerCase()
    const matchSearch = !q || name.includes(q) || addr.includes(q)
    const matchStatus = statusFilter === 'Alla' || p.data?.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input style={{ ...inp, maxWidth: 260 }} placeholder="Sök kund eller adress..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inp, maxWidth: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option>Alla</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {['Kund','Adress','Status','kWp','Netto/år','Skapad',''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const calc = safeCalc(p.data)
              return (
                <tr key={p.id} onClick={() => openProject(p.id)} style={{ cursor: 'pointer', borderBottom: `1px solid ${T.borderLight}` }}
                  onMouseEnter={e => e.currentTarget.style.background = T.bg}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{p.data?.customer?.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: T.textMuted }}>{p.data?.customer?.address || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={p.data?.status || 'Lead'} size="sm" /></td>
                  <td style={{ padding: '10px 14px' }}>{calc?.totalKWp.toFixed(1) || '—'}</td>
                  <td style={{ padding: '10px 14px', color: T.green, fontWeight: 600 }}>{calc ? Math.round(calc.netAfterTax).toLocaleString('sv-SE') + ' kr' : '—'}</td>
                  <td style={{ padding: '10px 14px', color: T.textMuted }}>{new Date(p.created_at).toLocaleDateString('sv-SE')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Ta bort projektet?')) deleteProject(p.id) }}
                      style={{ ...btn('ghost'), fontSize: 11, padding: '2px 8px', color: '#dc2626' }}>
                      Ta bort
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!filtered.length && <div style={{ padding: 24, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>Inga projekt hittades.</div>}
      </div>
    </div>
  )
}

function safeCalc(data) {
  try { return calcProject(data) } catch { return null }
}
