import { Prisma } from '@prisma/client'

export function throwDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw apiError(
        409,
        'RESOURCE_CONFLICT',
        'Ya existe un registro con uno de los valores únicos enviados.'
      )
    }
    if (error.code === 'P2025') throw apiError(404, 'RESOURCE_NOT_FOUND', 'El registro no existe.')
    if (error.code === 'P2003') {
      throw apiError(
        409,
        'RESOURCE_IN_USE',
        'El registro está relacionado con otra información y no puede modificarse así.'
      )
    }
    if (error.code === 'P2004') {
      throw apiError(422, 'DATA_INTEGRITY_VIOLATION', 'Los datos incumplen una regla de integridad.')
    }
  }
  throw error
}
