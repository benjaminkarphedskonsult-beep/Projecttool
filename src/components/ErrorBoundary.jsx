import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#fff1f0', border: '1px solid #fca5a5', borderRadius: 8, margin: 20 }}>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Något gick fel i den här vyn</div>
          <pre style={{ fontSize: 11, color: '#7f1d1d', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
