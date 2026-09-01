import { useEffect, useMemo, useState } from 'react'
import {
  formatUnits,
  parseUnits,
} from 'viem'
import {
  useConnection,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { TARGET_CHAIN } from '../../config/wagmi.js'
import {
  APPROVAL_SPENDER_ADDRESS,
  APPROVAL_SPENDER_LABEL,
  ERC20_ABI,
  explorerAddressUrl,
  explorerTransactionUrl,
  SAFE_READ_ADDRESS,
  TOKEN_CONTRACTS,
} from '../../config/tokens.js'

function shortenAddress(address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function getErrorMessage(error, fallback) {
  if (!error) return ''
  if (error.name === 'UserRejectedRequestError' || error.name === 'UserRejectedError') {
    return 'The wallet rejected this request.'
  }
  return error.shortMessage || fallback
}

function readResult(data, index) {
  return data?.[index]?.status === 'success' ? data[index].result : undefined
}

function formatTokenAmount(value, decimals) {
  if (typeof value !== 'bigint') return '—'
  return formatUnits(value, decimals)
}

function TokenRow({ token, address }) {
  const [approvalAmount, setApprovalAmount] = useState('1')
  const isReadEnabled = Boolean(address && token.address && APPROVAL_SPENDER_ADDRESS)
  const { data, isLoading, isError, refetch } = useReadContracts({
    chainId: TARGET_CHAIN.id,
    contracts: [
      {
        address: token.address || SAFE_READ_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'name',
      },
      {
        address: token.address || SAFE_READ_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: token.address || SAFE_READ_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'decimals',
      },
      {
        address: token.address || SAFE_READ_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address || SAFE_READ_ADDRESS],
      },
      {
        address: token.address || SAFE_READ_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address || SAFE_READ_ADDRESS, APPROVAL_SPENDER_ADDRESS || SAFE_READ_ADDRESS],
      },
    ],
    query: { enabled: isReadEnabled },
  })
  const {
    writeContract,
    data: transactionHash,
    error: writeError,
    isPending: isWriting,
  } = useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmationError,
    error: confirmationError,
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    chainId: TARGET_CHAIN.id,
    query: { enabled: Boolean(transactionHash) },
  })

  const onchainName = readResult(data, 0)
  const onchainSymbol = readResult(data, 1)
  const onchainDecimals = readResult(data, 2)
  const decimals = typeof onchainDecimals === 'number' ? onchainDecimals : token.decimals
  const balance = readResult(data, 3)
  const allowance = readResult(data, 4)
  const displayName = typeof onchainName === 'string' ? onchainName : token.name
  const displaySymbol = typeof onchainSymbol === 'string' ? onchainSymbol : token.symbol

  useEffect(() => {
    if (isConfirmed) refetch()
  }, [isConfirmed, refetch])

  const handleApprove = () => {
    if (!token.address || !APPROVAL_SPENDER_ADDRESS) return

    try {
      const amount = parseUnits(approvalAmount.trim(), decimals)
      if (amount <= 0n) return

      writeContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [APPROVAL_SPENDER_ADDRESS, amount],
        chainId: TARGET_CHAIN.id,
      })
    } catch {
      // The invalid amount is surfaced by the disabled state and helper copy.
    }
  }

  const amountError = useMemo(() => {
    if (!approvalAmount.trim()) return 'Enter an amount to approve.'
    try {
      return parseUnits(approvalAmount.trim(), decimals) <= 0n ? 'Amount must be greater than zero.' : ''
    } catch {
      return 'Enter a valid token amount.'
    }
  }, [approvalAmount, decimals])

  const isBusy = isWriting || isConfirming

  return (
    <article className="token-card">
      <div className="token-card__heading">
        <div>
          <p className="panel-heading__eyebrow">ERC-20 token</p>
          <h3>{displayName} <span>{displaySymbol}</span></h3>
        </div>
        {token.address && (
          <a href={explorerAddressUrl(token.address)} target="_blank" rel="noreferrer">
            {shortenAddress(token.address)} ↗
          </a>
        )}
      </div>

      {isLoading ? (
        <p className="token-card__muted">Reading token data from Sepolia…</p>
      ) : isError ? (
        <p className="token-card__error" role="alert">Token data is unavailable. Check the contract configuration.</p>
      ) : (
        <div className="token-card__stats">
          <div>
            <span>Wallet balance</span>
            <strong>{formatTokenAmount(balance, decimals)} {displaySymbol}</strong>
          </div>
          <div>
            <span>Approved allowance</span>
            <strong>{formatTokenAmount(allowance, decimals)} {displaySymbol}</strong>
          </div>
        </div>
      )}

      <div className="token-card__approval">
        <label className="field">
          <span>Approval amount</span>
          <input
            type="text"
            inputMode="decimal"
            value={approvalAmount}
            onChange={(event) => setApprovalAmount(event.target.value)}
            disabled={isBusy}
            aria-describedby={`${token.key}-approval-help`}
          />
        </label>
        <button
          className="token-card__button"
          type="button"
          onClick={handleApprove}
          disabled={isBusy || Boolean(amountError) || !APPROVAL_SPENDER_ADDRESS}
        >
          {isWriting ? 'Confirm in wallet…' : isConfirming ? 'Waiting for confirmation…' : `Approve ${displaySymbol}`}
        </button>
      </div>

      <p className="token-card__help" id={`${token.key}-approval-help`}>
        Approval target: {APPROVAL_SPENDER_ADDRESS ? `${APPROVAL_SPENDER_LABEL} (${shortenAddress(APPROVAL_SPENDER_ADDRESS)})` : 'not configured'}.
        {' '}Only the amount entered above is approved.
      </p>
      {amountError && <p className="token-card__error" role="alert">{amountError}</p>}
      {writeError && <p className="token-card__error" role="alert">{getErrorMessage(writeError, 'Approval could not be submitted.')}</p>}
      {transactionHash && (
        <p className="token-card__status" role="status">
          Transaction submitted: <a href={explorerTransactionUrl(transactionHash)} target="_blank" rel="noreferrer">{shortenAddress(transactionHash)} ↗</a>
        </p>
      )}
      {isConfirmed && <p className="token-card__status" role="status">Approval confirmed on Sepolia.</p>}
      {isConfirmationError && (
        <p className="token-card__error" role="alert">
          {getErrorMessage(confirmationError, 'The approval transaction failed or was reverted.')}
        </p>
      )}
    </article>
  )
}

function TokenSystem() {
  const { address, chainId, isConnected } = useConnection()
  const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN.id

  return (
    <section className="dashboard-panel token-system" aria-labelledby="token-system-title">
      <div className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Phase 6 · Testnet tokens</p>
          <h2 id="token-system-title">Token balances & approvals</h2>
        </div>
        <span className="panel-status">Sepolia</span>
      </div>

      {!isConnected ? (
        <p className="empty-state">Connect a browser wallet to read token balances and allowances.</p>
      ) : isWrongNetwork ? (
        <p className="empty-state">Switch your connected wallet to Sepolia to continue.</p>
      ) : (
        <>
          <p className="data-note token-system__notice">
            Testnet-only approval flow. PulseTrade does not execute swaps or real trades.
          </p>
          <div className="token-system__grid">
            {TOKEN_CONTRACTS.map((token) => (
              <TokenRow key={token.key} token={token} address={address} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default TokenSystem
