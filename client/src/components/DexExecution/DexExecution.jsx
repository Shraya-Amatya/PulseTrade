import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatEther, formatUnits, parseUnits, zeroAddress } from 'viem'
import {
  useConnection,
  useGasPrice,
  useReadContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi'
import { TARGET_CHAIN } from '../../config/wagmi.js'
import {
  DEX_CONTRACTS,
  ERC20_ABI,
  TOKEN_CONTRACTS,
  explorerAddressUrl,
  explorerTransactionUrl,
} from '../../config/tokens.js'
import {
  UNISWAP_V3_FACTORY_ABI,
  UNISWAP_V3_FEE,
  UNISWAP_V3_QUOTER_V2_ABI,
  UNISWAP_V3_ROUTER_ABI,
} from '../../config/dex.js'
import { useMarketPrice } from '../../hooks/useMarketPrices.js'

const MAX_SLIPPAGE_BPS = 5000
const QUOTE_DEADLINE_MINUTES = 20

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 8,
})

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function shorten(value) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function errorMessage(error, fallback) {
  if (!error) return ''
  if (error.name === 'UserRejectedRequestError' || error.name === 'UserRejectedError') {
    return 'The wallet rejected this request.'
  }
  return error.shortMessage || fallback
}

function parseAmount(value, decimals) {
  try {
    const parsed = parseUnits(value.trim(), decimals)
    return parsed > 0n ? parsed : 0n
  } catch {
    return 0n
  }
}

function formatAmount(value, decimals, symbol) {
  if (typeof value !== 'bigint') return '—'
  return `${numberFormatter.format(Number(formatUnits(value, decimals)))} ${symbol}`
}

function loadHistory() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem('pulsetrade.dex.transactions') || '[]')
  } catch {
    return []
  }
}

function DexExecution() {
  const { address, chainId, isConnected } = useConnection()
  const ethPrice = useMarketPrice('ETHUSDT')
  const [tokenInKey, setTokenInKey] = useState('usdc')
  const [tokenOutKey, setTokenOutKey] = useState('weth')
  const [amountInput, setAmountInput] = useState('10')
  const [slippageInput, setSlippageInput] = useState('0.50')
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [quoteGeneratedAt, setQuoteGeneratedAt] = useState(0)
  const [transactionHistory, setTransactionHistory] = useState(loadHistory)
  const recordedHashes = useRef(new Set())

  const tokenIn = TOKEN_CONTRACTS.find((token) => token.key === tokenInKey) || TOKEN_CONTRACTS[0]
  const tokenOut = TOKEN_CONTRACTS.find((token) => token.key === tokenOutKey) || TOKEN_CONTRACTS[1]
  const isCorrectNetwork = isConnected && chainId === TARGET_CHAIN.id
  const amountIn = useMemo(() => parseAmount(amountInput, tokenIn.decimals), [amountInput, tokenIn.decimals])
  const slippageBps = Number(slippageInput) * 100
  const isValidSlippage = slippageInput.trim() !== '' && Number.isFinite(slippageBps) && slippageBps >= 0 && slippageBps <= MAX_SLIPPAGE_BPS
  const readEnabled = Boolean(isCorrectNetwork && tokenIn.address && tokenOut.address && tokenIn.address !== tokenOut.address)

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (transactionHistory.length > 0 && typeof window !== 'undefined') {
      window.localStorage.setItem('pulsetrade.dex.transactions', JSON.stringify(transactionHistory))
    }
  }, [transactionHistory])

  const { data: poolAddress, isLoading: isPoolLoading, isError: isPoolError } = useReadContract({
    address: DEX_CONTRACTS.factory,
    abi: UNISWAP_V3_FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenIn.address || zeroAddress, tokenOut.address || zeroAddress, UNISWAP_V3_FEE],
    chainId: TARGET_CHAIN.id,
    query: { enabled: readEnabled },
  })
  const hasPool = typeof poolAddress === 'string' && poolAddress !== zeroAddress

  const { data: quoteData, isLoading: isQuoteLoading, isError: isQuoteError, error: quoteError } = useReadContract({
    address: DEX_CONTRACTS.quoterV2,
    abi: UNISWAP_V3_QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [{
      tokenIn: tokenIn.address || zeroAddress,
      tokenOut: tokenOut.address || zeroAddress,
      amountIn,
      fee: UNISWAP_V3_FEE,
      sqrtPriceLimitX96: 0n,
    }],
    chainId: TARGET_CHAIN.id,
    query: { enabled: Boolean(readEnabled && hasPool && amountIn > 0n && isValidSlippage) },
  })

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: tokenIn.address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address || zeroAddress],
    chainId: TARGET_CHAIN.id,
    query: { enabled: Boolean(readEnabled && address) },
  })
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address || zeroAddress, DEX_CONTRACTS.swapRouter02 || zeroAddress],
    chainId: TARGET_CHAIN.id,
    query: { enabled: Boolean(readEnabled && address && DEX_CONTRACTS.swapRouter02) },
  })
  const { data: gasPrice } = useGasPrice({
    chainId: TARGET_CHAIN.id,
    query: { refetchInterval: 15000 },
  })

  const quoteAmountOut = Array.isArray(quoteData) && typeof quoteData[0] === 'bigint' ? quoteData[0] : null
  const amountOutMinimum = quoteAmountOut == null || !isValidSlippage
    ? 0n
    : (quoteAmountOut * BigInt(10000 - Math.round(slippageBps))) / 10000n
  const quoteReady = Boolean(quoteAmountOut != null && amountIn > 0n && isValidSlippage && hasPool)
  const insufficientBalance = typeof tokenBalance === 'bigint' && amountIn > tokenBalance
  const allowanceSufficient = typeof allowance === 'bigint' && allowance >= amountIn
  const deadline = (quoteGeneratedAt || currentTime) + QUOTE_DEADLINE_MINUTES * 60 * 1000
  const quoteExpired = Boolean(deadline && currentTime > deadline)

  const swapArgs = useMemo(() => [{
    tokenIn: tokenIn.address || zeroAddress,
    tokenOut: tokenOut.address || zeroAddress,
    fee: UNISWAP_V3_FEE,
    recipient: address || zeroAddress,
    amountIn,
    amountOutMinimum,
    sqrtPriceLimitX96: 0n,
  }], [address, amountIn, amountOutMinimum, tokenIn.address, tokenOut.address])
  const simulation = useSimulateContract({
    address: DEX_CONTRACTS.swapRouter02,
    abi: UNISWAP_V3_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: swapArgs,
    account: address,
    chainId: TARGET_CHAIN.id,
    query: { enabled: Boolean(readEnabled && quoteReady && allowanceSufficient && !insufficientBalance && !quoteExpired) },
  })

  const {
    writeContract: writeApproval,
    data: approvalHash,
    error: approvalWriteError,
    isPending: isApprovalPending,
  } = useWriteContract()
  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalConfirmed,
    isError: isApprovalFailed,
    error: approvalReceiptError,
  } = useWaitForTransactionReceipt({ hash: approvalHash, chainId: TARGET_CHAIN.id, query: { enabled: Boolean(approvalHash) } })
  const {
    writeContract: writeSwap,
    data: swapHash,
    error: swapWriteError,
    isPending: isSwapPending,
  } = useWriteContract()
  const {
    isLoading: isSwapConfirming,
    isSuccess: isSwapConfirmed,
    isError: isSwapFailed,
    error: swapReceiptError,
  } = useWaitForTransactionReceipt({ hash: swapHash, chainId: TARGET_CHAIN.id, query: { enabled: Boolean(swapHash) } })

  const addTransaction = useCallback((entry) => {
    setTransactionHistory((history) => history.some((item) => item.hash === entry.hash)
      ? history
      : [entry, ...history].slice(0, 8))
  }, [])

  useEffect(() => {
    if (isApprovalConfirmed && approvalHash && !recordedHashes.current.has(approvalHash)) {
      recordedHashes.current.add(approvalHash)
      addTransaction({ hash: approvalHash, type: 'Approval', pair: `${tokenIn.symbol} → router`, timestamp: Date.now() })
      refetchAllowance()
    }
  }, [addTransaction, approvalHash, isApprovalConfirmed, refetchAllowance, tokenIn.symbol])

  useEffect(() => {
    if (isSwapConfirmed && swapHash && !recordedHashes.current.has(swapHash)) {
      recordedHashes.current.add(swapHash)
      addTransaction({ hash: swapHash, type: 'Swap', pair: `${tokenIn.symbol} → ${tokenOut.symbol}`, timestamp: Date.now() })
      refetchAllowance()
      refetchBalance()
    }
  }, [addTransaction, isSwapConfirmed, refetchAllowance, refetchBalance, swapHash, tokenIn.symbol, tokenOut.symbol])

  const handleApprove = () => {
    if (!address || !tokenIn.address || amountIn <= 0n || !DEX_CONTRACTS.swapRouter02) return
    writeApproval({
      address: tokenIn.address,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [DEX_CONTRACTS.swapRouter02, amountIn],
      account: address,
      chainId: TARGET_CHAIN.id,
    })
  }

  const handleSwap = () => {
    if (!simulation.data?.request || quoteExpired) return
    writeSwap(simulation.data.request)
  }

  const gasEstimate = simulation.data?.request?.gas || (Array.isArray(quoteData) && typeof quoteData[3] === 'bigint' ? quoteData[3] : null)
  const gasCost = typeof gasEstimate === 'bigint' && typeof gasPrice === 'bigint'
    ? Number(formatEther(gasEstimate * gasPrice))
    : null
  const gasUsd = gasCost != null && typeof ethPrice === 'number' ? gasCost * ethPrice : null
  const isBusy = isApprovalPending || isApprovalConfirming || isSwapPending || isSwapConfirming
  const quoteFailure = tokenInKey === tokenOutKey
    ? 'Choose two different tokens for the swap.'
    : isPoolError
    ? 'Unable to find the Uniswap v3 pool on Sepolia.'
    : !isPoolLoading && readEnabled && !hasPool
      ? 'No direct 0.30% Uniswap v3 pool was found for this pair on Sepolia.'
      : isQuoteError
        ? errorMessage(quoteError, 'The on-chain quote could not be calculated.')
        : !isValidSlippage
          ? 'Slippage must be between 0% and 50%.'
          : amountIn <= 0n
            ? 'Enter an amount greater than zero.'
            : ''

  if (!isConnected) {
    return (
      <section className="dashboard-panel dex-execution" aria-labelledby="dex-execution-title">
        <div className="panel-heading"><div><p className="panel-heading__eyebrow">Phase 9 · Testnet DEX</p><h2 id="dex-execution-title">Uniswap v3 execution</h2></div><span className="panel-status">Sepolia only</span></div>
        <p className="empty-state">Connect a wallet to request an on-chain quote and execute a testnet swap.</p>
      </section>
    )
  }

  if (chainId !== TARGET_CHAIN.id) {
    return (
      <section className="dashboard-panel dex-execution" aria-labelledby="dex-execution-title">
        <div className="panel-heading"><div><p className="panel-heading__eyebrow">Phase 9 · Testnet DEX</p><h2 id="dex-execution-title">Uniswap v3 execution</h2></div><span className="panel-status">Sepolia only</span></div>
        <p className="empty-state">Switch your wallet to Sepolia before requesting quotes or transactions.</p>
      </section>
    )
  }

  return (
    <section className="dashboard-panel dex-execution" aria-labelledby="dex-execution-title">
      <div className="panel-heading">
        <div><p className="panel-heading__eyebrow">Phase 9 · Testnet DEX</p><h2 id="dex-execution-title">Uniswap v3 execution</h2></div>
        <span className="panel-status">Direct · 0.30%</span>
      </div>

      <div className="dex-execution__controls">
        <label className="field"><span>Sell token</span><select value={tokenInKey} onChange={(event) => { setTokenInKey(event.target.value); setQuoteGeneratedAt(Date.now()) }}><option value="usdc">USDC</option><option value="weth">WETH</option></select></label>
        <label className="field"><span>Buy token</span><select value={tokenOutKey} onChange={(event) => { setTokenOutKey(event.target.value); setQuoteGeneratedAt(Date.now()) }}><option value="weth">WETH</option><option value="usdc">USDC</option></select></label>
      </div>
      <label className="field"><span>Exact input</span><div className="swap-input"><input type="text" inputMode="decimal" value={amountInput} onChange={(event) => { setAmountInput(event.target.value); setQuoteGeneratedAt(Date.now()) }} aria-label={`${tokenIn.symbol} amount to swap`} /><strong>{tokenIn.symbol}</strong></div></label>
      <div className="dex-execution__quote">
        <div><span>On-chain quote</span><strong>{isQuoteLoading ? 'Loading…' : quoteReady ? formatAmount(quoteAmountOut, tokenOut.decimals, tokenOut.symbol) : '—'}</strong></div>
        <div><span>Minimum received ({slippageInput || '—'}%)</span><strong>{quoteReady ? formatAmount(amountOutMinimum, tokenOut.decimals, tokenOut.symbol) : '—'}</strong></div>
        <div><span>Wallet balance</span><strong>{formatAmount(tokenBalance, tokenIn.decimals, tokenIn.symbol)}</strong></div>
        <div><span>Allowance to router</span><strong>{formatAmount(allowance, tokenIn.decimals, tokenIn.symbol)}</strong></div>
      </div>
      <label className="field"><span>Slippage tolerance</span><div className="swap-input swap-input--compact"><input type="text" inputMode="decimal" value={slippageInput} onChange={(event) => { setSlippageInput(event.target.value); setQuoteGeneratedAt(Date.now()) }} aria-label="Swap slippage tolerance percentage" /><strong>%</strong></div></label>
      <p className="dex-execution__route">Route: {tokenIn.symbol} → {tokenOut.symbol} through the direct Uniswap v3 {UNISWAP_V3_FEE / 10000}% pool. Pool: {isPoolLoading ? 'checking…' : hasPool ? <a href={explorerAddressUrl(poolAddress)} target="_blank" rel="noreferrer">{shorten(poolAddress)} ↗</a> : 'not found'}.</p>

      {quoteFailure && <p className="dex-execution__error" role="alert">{quoteFailure}</p>}
      {insufficientBalance && <p className="dex-execution__error" role="alert">Insufficient {tokenIn.symbol} balance for this swap.</p>}
      {quoteExpired && <p className="dex-execution__error" role="alert">This quote expired. Change the amount or wait for a fresh quote.</p>}

      <div className="dex-execution__actions">
        {!allowanceSufficient && <button className="dex-execution__button" type="button" onClick={handleApprove} disabled={isBusy || amountIn <= 0n || insufficientBalance}>{isApprovalPending ? 'Confirm approval…' : isApprovalConfirming ? 'Confirming approval…' : `Approve ${tokenIn.symbol}`}</button>}
        <button className="dex-execution__button dex-execution__button--primary" type="button" onClick={handleSwap} disabled={isBusy || !simulation.data?.request || insufficientBalance || quoteExpired}>{isSwapPending ? 'Confirm swap…' : isSwapConfirming ? 'Confirming swap…' : `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`}</button>
      </div>
      <p className="dex-execution__route">Quote expires at {deadline ? new Date(deadline).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}. Estimated gas: {gasEstimate ? `${gasEstimate.toString()} units${gasUsd != null ? ` · ${currencyFormatter.format(gasUsd)}` : ''}` : '—'}.</p>

      {approvalWriteError && <p className="dex-execution__error" role="alert">{errorMessage(approvalWriteError, 'Approval transaction could not be submitted.')}</p>}
      {isApprovalFailed && <p className="dex-execution__error" role="alert">{errorMessage(approvalReceiptError, 'Approval transaction failed or reverted.')}</p>}
      {approvalHash && <p className="dex-execution__status" role="status">Approval: <a href={explorerTransactionUrl(approvalHash)} target="_blank" rel="noreferrer">{shorten(approvalHash)} ↗</a></p>}
      {swapWriteError && <p className="dex-execution__error" role="alert">{errorMessage(swapWriteError, 'Swap transaction could not be submitted.')}</p>}
      {isSwapFailed && <p className="dex-execution__error" role="alert">{errorMessage(swapReceiptError, 'Swap transaction failed or reverted. Check slippage, balance, and gas, then retry.')}</p>}
      {swapHash && <p className="dex-execution__status" role="status">Swap: <a href={explorerTransactionUrl(swapHash)} target="_blank" rel="noreferrer">{shorten(swapHash)} ↗</a>{isSwapConfirmed ? ' · confirmed' : isSwapConfirming ? ' · confirming' : ' · submitted'}</p>}

      {transactionHistory.length > 0 && <div className="dex-history"><h3>Recent on-chain activity</h3>{transactionHistory.map((transaction) => <div key={transaction.hash}><span>{transaction.type} · {transaction.pair}</span><a href={explorerTransactionUrl(transaction.hash)} target="_blank" rel="noreferrer">{shorten(transaction.hash)} ↗</a></div>)}</div>}
      <p className="data-note">Real testnet interaction. This panel can move ERC-20 tokens on Sepolia after explicit wallet confirmation; simulated trading remains available above.</p>
    </section>
  )
}

export default DexExecution
