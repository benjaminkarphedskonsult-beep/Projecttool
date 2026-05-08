export const T = {
  blue: '#1557a0', blueLight: '#e8f0fb', blueDark: '#0d2444',
  accent: '#2196f3', accentLight: '#e3f2fd',
  green: '#16a34a', greenLight: '#dcfce7',
  orange: '#d97706', orangeLight: '#fef3c7',
  text: '#1a2332', textMuted: '#5a6a7a', textLight: '#8a9ab0',
  bg: '#f0f4f9', bgCard: '#ffffff', bgSidebar: '#0d2444',
  border: '#dce4ef', borderLight: '#eef2f7',
  radius: '10px', radiusSm: '6px',
  shadow: '0 2px 8px rgba(0,0,0,0.08)',
}

export const card = (x = {}) => ({
  background: T.bgCard,
  borderRadius: T.radius,
  boxShadow: T.shadow,
  border: `1px solid ${T.border}`,
  padding: '1.25rem',
  ...x,
})

export const inp = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#f5f8fc',
  border: `1.5px solid ${T.border}`,
  borderRadius: T.radiusSm,
  padding: '8px 12px',
  fontSize: '14px',
  color: T.text,
  outline: 'none',
}

export const btn = (variant = 'primary', extra = {}) => {
  const base = {
    border: 'none', borderRadius: T.radiusSm,
    padding: '8px 16px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', ...extra,
  }
  if (variant === 'primary')   return { ...base, background: T.blue, color: '#fff' }
  if (variant === 'secondary') return { ...base, background: T.blueLight, color: T.blue }
  if (variant === 'danger')    return { ...base, background: '#dc2626', color: '#fff' }
  if (variant === 'ghost')     return { ...base, background: 'transparent', color: T.textMuted }
  return base
}

export const secH = {
  fontSize: '11px', fontWeight: 700,
  color: T.textMuted, textTransform: 'uppercase',
  letterSpacing: '0.07em', marginBottom: '12px',
  paddingBottom: '6px', borderBottom: `2px solid ${T.blueLight}`,
}
