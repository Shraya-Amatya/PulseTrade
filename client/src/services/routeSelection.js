export function selectBestRoute(routes = []) {
  return routes
    .filter((route) => route?.pool && typeof route.amountOut === 'bigint')
    .reduce((best, route) => !best || route.amountOut > best.amountOut ? route : best, null)
}
