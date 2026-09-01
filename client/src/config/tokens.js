import { erc20Abi, getAddress, isAddress, zeroAddress } from 'viem'

const env = import.meta.env ?? {}

const SEPOLIA_CONTRACTS = {
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  weth: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
  factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
  quoterV2: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
  swapRouter02: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
}

function resolveAddress(candidate, fallback = null) {
  const value = candidate || fallback
  return value && isAddress(value) ? getAddress(value) : null
}

export const DEX_CONTRACTS = {
  factory: resolveAddress(env.VITE_UNISWAP_V3_FACTORY_ADDRESS, SEPOLIA_CONTRACTS.factory),
  quoterV2: resolveAddress(env.VITE_UNISWAP_V3_QUOTER_ADDRESS, SEPOLIA_CONTRACTS.quoterV2),
  swapRouter02: resolveAddress(env.VITE_SWAP_ROUTER_ADDRESS, SEPOLIA_CONTRACTS.swapRouter02),
}

export const APPROVAL_SPENDER_ADDRESS = resolveAddress(
  env.VITE_APPROVAL_SPENDER_ADDRESS,
  DEX_CONTRACTS.swapRouter02,
)

export const APPROVAL_SPENDER_LABEL = env.VITE_APPROVAL_SPENDER_ADDRESS
  ? 'Configured approval spender'
  : 'Uniswap SwapRouter02 (Sepolia)'

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
