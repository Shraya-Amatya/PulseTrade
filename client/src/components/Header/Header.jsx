function Header({ status }) {
  const isConnected = status === 'connected'
  const statusLabel = isConnected
    ? 'Connected'
    : status === 'reconnecting'
      ? 'Reconnecting'
      : 'Connecting'

  return (
    <header className="app-header">
      <a className="app-header__brand" href="/" aria-label="PulseTrade home">
        PulseTrade
      </a>

      <div className="app-header__account">
        <span className="demo-badge">Demo Account</span>
        <span
          className={`connection-status connection-status--${isConnected ? 'online' : 'pending'}`}
          role="status"
        >
          <span aria-hidden="true">●</span>
          {statusLabel}
        </span>
      </div>
    </header>
  )
}

export default Header
