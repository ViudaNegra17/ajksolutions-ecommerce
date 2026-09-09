export default defineEventHandler((event) => {
  if (getRequestURL(event).pathname.startsWith('/admin')) setHeader(event, 'Cache-Control', 'no-store')
})
