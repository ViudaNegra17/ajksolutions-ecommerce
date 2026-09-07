import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

function validationMessage(issues: Array<{ path: PropertyKey[]; message: string }>, fallback: string) {
  const issue = issues[0]
  if (!issue) return fallback
  const path = issue.path.map(String).join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

export async function parseValidatedBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) {
    throw apiError(422, 'VALIDATION_ERROR', validationMessage(result.error.issues, 'Datos inválidos.'))
  }
  return result.data
}

export function parseValidatedQuery<T>(event: H3Event, schema: ZodType<T>): T {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) {
    throw apiError(422, 'VALIDATION_ERROR', validationMessage(result.error.issues, 'Consulta inválida.'))
  }
  return result.data
}

export function requireRouteId(event: H3Event): string {
  const id = getRouterParam(event, 'id')
  if (!id) throw apiError(400, 'ROUTE_ID_REQUIRED', 'Falta el identificador del recurso.')
  return id
}
