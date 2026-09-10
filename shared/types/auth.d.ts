declare module '#auth-utils' {
  interface User {
    id: string
    firstName: string
    lastName: string
    email: string
    roles: string[]
    permissions: string[]
  }
  interface UserSession {
    loggedInAt: string
    lastActivityAt: string
    lastValidatedAt: string
    expiresAt?: string
    idleExpiresAt?: string
  }
}

export {}
