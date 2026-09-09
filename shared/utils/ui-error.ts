/** Only application-authored messages are suitable for display; never FetchError/SQL/stack text. */
export function uiErrorMessage(cause: unknown): string {
  const error = cause as {
    statusCode?: number
    status?: number
    data?: {
      data?: { error?: { code?: string; message?: string } }
      error?: { code?: string; message?: string }
    }
  } | null
  const detail = error?.data?.data?.error || error?.data?.error
  const status = error?.statusCode || error?.status || 0
  if (status >= 500) return 'No pudimos completar la operación. Intenta nuevamente en unos momentos.'
  if (
    detail?.code &&
    detail.message &&
    !/Prisma|SQL|stack|token|Invalid input|expected |received |fingerprint/i.test(detail.message)
  )
    return detail.message
  if (status === 401) return 'Tu sesión ha terminado. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permiso para realizar esta acción.'
  if (status === 409)
    return 'Los datos cambiaron o ya existe un registro similar. Revisa la información e intenta nuevamente.'
  if (status === 429) return 'Has realizado varios intentos. Espera un momento antes de continuar.'
  return 'Revisa los campos obligatorios y vuelve a intentarlo.'
}
