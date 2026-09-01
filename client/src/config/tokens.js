import { erc20Abi, getAddress, isAddress, zeroAddress } from 'viem'

const env = import.meta.env ?? {}

const SEPOLIA_CONTRACTS = {
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  weth: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
}

function resolveAddress(candidate, fallback = null) {
  const value = candidate || fallback
  return value && isAddress(value) ? getAddress(value) : null
}

export const APPROVAL_SPENDER_ADDRESS = resolveAddress(
  env.VITE_APPROVAL_SPENDER_ADDRESS,
  SEPOLIA_CONTRACTS.permit2,
)

export const APPROVAL_SPENDER_LABEL = 'Permit2 (Sepolia)'

export const TOKEN_CONTRACTS = [
  {
    key: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    address: resolveAddress(env.VITE_USDC_ADDRESS, SEPOLIA_CONTRACTS.usdc),
  },
  {
    key: 'weth',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    address: resolveAddress(env.VITE_WETH_ADDRESS, SEPOLIA_CONTRACTS.weth),
  },
]

export const ERC20_ABI = erc20Abi
export const SAFE_READ_ADDRESS = zeroAddress

export function explorerAddressUrl(address) {
  return `https://sepolia.etherscan.io/address/${address}`
}

export function explorerTransactionUrl(hash) {
  return `https://sepolia.etherscan.io/tx/${hash}`
}
