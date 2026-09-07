export type TicketAssignmentCandidate = {
  active: boolean
  deletedAt: Date | string | null
  roles: Array<{ code: string; permissions: string[] }>
}

export function isTicketAssignmentEligible(candidate: TicketAssignmentCandidate) {
  if (!candidate.active || candidate.deletedAt) return false
  return candidate.roles.some(
    (role) => role.code === 'SUPER_ADMIN' || role.permissions.includes('tickets.assign')
  )
}
