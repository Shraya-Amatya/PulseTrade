function stringify(value) {
  return value == null ? null : value.toString()
}

function normalizeBlockEvent({ blockNumber, observedAt = Date.now() }) {
  if (blockNumber == null) return null
  return {
    type: 'block',
    network: 'sepolia',
    blockNumber: stringify(blockNumber),
    observedAt,
  }
}

function normalizeSwapEvent(log, { observedAt = Date.now() } = {}) {
  if (!log?.address || !log?.args) return null
  return {
    type: 'chain_swap',
    network: 'sepolia',
    pool: log.address,
    transactionHash: log.transactionHash || null,
    blockNumber: stringify(log.blockNumber),
    logIndex: stringify(log.logIndex),
    sender: log.args.sender || null,
    recipient: log.args.recipient || null,
    amount0: stringify(log.args.amount0),
    amount1: stringify(log.args.amount1),
    observedAt,
  }
}

module.exports = { normalizeBlockEvent, normalizeSwapEvent };
