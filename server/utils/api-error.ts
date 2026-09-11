import { createError } from 'h3'

export function apiError(statusCode: number, code: string, message: string) {
  const publicMessage = statusCode >= 500 ? 'Servicio temporalmente no disponible.' : message
  return createError({
    statusCode,
    statusMessage: publicMessage,
    data: { success: false, error: { code, message: publicMessage } }
  })
}
