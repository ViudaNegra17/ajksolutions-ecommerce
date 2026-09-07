import { describe, expect, it } from 'vitest'
import { loginSchema } from '../../shared/schemas/auth.schema'

describe('loginSchema', () => {
  it('normaliza un login válido', () => {
    expect(loginSchema.parse({ email: ' ADMIN@EXAMPLE.COM ', password: 'strong-password' }).email).toBe(
      'admin@example.com'
    )
  })

  it('rechaza correo inválido y contraseña corta', () => {
    expect(loginSchema.safeParse({ email: 'invalid', password: '123' }).success).toBe(false)
  })
})
