import {
  useBalance,
  useConnect,
  useConnection,
  useDisconnect,
  useSwitchChain,
} from 'wagmi'
import { TARGET_CHAIN } from '../../config/wagmi.js'

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function getErrorMessage(error, fallback) {
  if (!error) return ''
  if (error.name === 'UserRejectedRequestError' || error.name === 'UserRejectedError') {
    return 'Connection request was rejected in your wallet.'
  }
  return fallback
}

function WalletConnection() {
  const { address, chainId, isConnected } = useConnection()
  const { connectors, connect, error: connectError, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const {
    switchChain,
    error: switchError,
    isPending: isSwitching,
  } = useSwitchChain()
  const connector = connectors[0]
  const walletAvailable = typeof window !== 'undefined' && Boolean(window.ethereum)
  const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN.id
  const { data: balance, isLoading: isBalanceLoading, isError: isBalanceError } = useBalance({
    address,
    chainId: TARGET_CHAIN.id,
    query: { enabled: Boolean(address && !isWrongNetwork) },
  })

  if (!isConnected || !address) {
    return (
      <div className="wallet-connection">
        <button
          className="wallet-connection__button"
          type="button"
          onClick={() => connector && connect({ connector })}
          disabled={!connector || walletAvailable === false || isConnecting}
        >
          {isConnecting ? 'Connecting…' : walletAvailable === false ? 'Install MetaMask' : 'Connect wallet'}
        </button>
        {connectError && (
          <span className="wallet-connection__error" role="alert">
            {getErrorMessage(connectError, 'Unable to connect your wallet.')}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="wallet-connection">
      <div className="wallet-connection__identity">
        <strong>{shortenAddress(address)}</strong>
        <span>{isWrongNetwork ? 'Wrong network' : TARGET_CHAIN.name}</span>
      </div>

      {isWrongNetwork ? (
        <button
          className="wallet-connection__button wallet-connection__button--warning"
          type="button"
          onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
          disabled={isSwitching}
        >
          {isSwitching ? 'Switching…' : `Switch to ${TARGET_CHAIN.name}`}
        </button>
      ) : (
        <span className="wallet-connection__balance" role="status">
          {isBalanceLoading ? 'Loading balance…' : isBalanceError ? 'Balance unavailable' : `${balance?.formatted ?? '0'} ${balance?.symbol ?? 'ETH'}`}
        </span>
      )}

      <button className="wallet-connection__disconnect" type="button" onClick={() => disconnect()}>
        Disconnect
      </button>

      {switchError && (
        <span className="wallet-connection__error" role="alert">
          {getErrorMessage(switchError, `Switch to ${TARGET_CHAIN.name} in your wallet to continue.`)}
        </span>
      )}
      <span className="wallet-connection__hint">Simulated trading; on-chain writes are limited to testnet token approvals.</span>
    </div>
  )
}

export default WalletConnection
