import WalletConnection from '../WalletConnection/WalletConnection.jsx'

function Header({ status }) {
  const isConnected = status === 'connected'
  const statusLabel = {
    connected: 'Connected',
    reconnecting: 'Reconnecting',
    disconnected: 'Disconnected',
    error: 'Connection error',
    connecting: 'Connecting',
  }[status] || 'Connecting'

  return (
    <header className="app-header">
      <a className="app-header__brand" href="/" aria-label="PulseTrade home">
        PulseTrade
      </a>

      <div className="app-header__account">
        <span className="demo-badge">Demo Account</span>
        <span
          className={`connection-status connection-status--${isConnected ? 'online' : status === 'error' ? 'error' : 'pending'}`}
          role="status"
        >
          <span aria-hidden="true">●</span>
          {statusLabel}
        </span>
        <WalletConnection />
      </div>
    </header>
  )
}

export default Header
