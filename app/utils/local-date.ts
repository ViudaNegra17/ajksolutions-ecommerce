/** datetime-local expects local wall time, not an ISO UTC string with its suffix removed. */
export function localDateInput(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
