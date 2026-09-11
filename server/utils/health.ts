export type ReadinessProbe = () => Promise<unknown>

export async function probeReadiness(checkDatabase: ReadinessProbe) {
  try {
    await checkDatabase()
    return { ready: true as const, status: { status: 'ok' as const } }
  } catch {
    return { ready: false as const, status: { status: 'unavailable' as const } }
  }
}
