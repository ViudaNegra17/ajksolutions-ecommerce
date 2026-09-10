export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (
    path.startsWith('/admin') ||
    path.startsWith('/api/admin') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/api/_auth')
  ) {
    setHeader(event, 'Cache-Control', 'no-store')
  }
})
