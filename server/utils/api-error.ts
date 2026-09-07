export function apiError(statusCode: number, code: string, message: string) {
  return createError({
    statusCode,
    statusMessage: message,
    data: { success: false, error: { code, message } }
  })
}
