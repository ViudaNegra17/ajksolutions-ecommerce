export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (
    path.startsWith('/admin') ||
    path.startsWith('/api/admin') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/_auth') ||
    path.startsWith('/api/checkout') ||
    path.startsWith('/api/orders') ||
    path.startsWith('/api/tickets') ||
    path === '/carrito' ||
    path.startsWith('/checkout') ||
    path.startsWith('/pedido/') ||
    /^\/productos\/[^/]+\/comprar\/?$/.test(path)
  ) {
    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'Pragma', 'no-cache')
  }
})
