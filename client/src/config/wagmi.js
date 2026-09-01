import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { sepolia } from 'wagmi/chains'

const rpcUrl = import.meta.env?.VITE_EVM_RPC_URL || undefined

export const TARGET_CHAIN = sepolia

export const wagmiConfig = createConfig({
  chains: [TARGET_CHAIN],
  connectors: [injected()],
  transports: {
    [TARGET_CHAIN.id]: http(rpcUrl),
  },
})
