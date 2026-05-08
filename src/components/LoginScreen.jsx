import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { T, card, btn, inp } from '../utils/design.js'

export default function LoginScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) setError(error.message)
      else setError('Kontot skapat — logga in.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...card(), width: 360, padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.blueDark }}>Karpheds Energikonsult AB</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Solenergi CRM Pro</div>
        </div>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>Namn</label>
              <input style={inp} value={name} onChange={e => setName(e.target.value)} required placeholder="Ditt namn" />
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>E-post</label>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="din@email.se" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>Lösenord</label>
            <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{error}</div>}
          <button type="submit" style={{ ...btn('primary'), width: '100%', padding: '10px' }} disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
            style={{ ...btn('ghost'), fontSize: 12 }}>
            {mode === 'login' ? 'Skapa konto' : 'Tillbaka till inloggning'}
          </button>
        </div>
      </div>
    </div>
  )
}
