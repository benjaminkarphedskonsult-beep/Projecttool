const STATUS_STYLES = {
  'Lead':        { background: '#f3f4f6', color: '#6b7280' },
  'Kontaktad':   { background: '#dbeafe', color: '#2563eb' },
  'Offert':      { background: '#fef3c7', color: '#d97706' },
  'Vunnet':      { background: '#dcfce7', color: '#16a34a' },
  'Förlorat':    { background: '#fee2e2', color: '#dc2626' },
  'Installerat': { background: '#ede9fe', color: '#7c3aed' },
}

export const STATUSES = Object.keys(STATUS_STYLES)

export default function StatusBadge({ status, size = 'md' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Lead']
  return (
    <span style={{
      ...s,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: 20,
      fontSize: size === 'sm' ? 10 : 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}
