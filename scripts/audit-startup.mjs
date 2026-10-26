import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import dotenv from 'dotenv'
import { stripVTControlCharacters } from 'node:util'

const mode = process.argv[2] || 'dev'
if (!['dev', 'build', 'preview', 'runtime'].includes(mode)) throw new Error('Unsupported diagnostic mode')
const devtools = process.env.AUDIT_DEVTOOLS === 'true'
const debugInherited = process.env.AUDIT_DEBUG_INHERIT === 'true'
const suffix = process.env.AUDIT_RUN || ''
if (!/^[a-z0-9-]*$/.test(suffix)) throw new Error('Invalid run suffix')
const baseLabel = mode === 'dev' ? (devtools ? 'devtools-on' : 'devtools-off') : `${mode}-no-debug`
const label = [baseLabel, debugInherited ? 'debug' : '', suffix].filter(Boolean).join('-')
const env = {
  ...process.env,
  NUXT_DEVTOOLS: String(devtools),
  NUXT_DEBUG: 'false',
  NODE_ENV: mode === 'dev' ? 'development' : 'production'
}
if (!debugInherited) delete env.DEBUG
if (mode === 'preview' || mode === 'runtime') {
  for (const key of ['NUXT_SESSION_PASSWORD', 'NUXT_CHECKOUT_SIGNING_SECRET', 'NUXT_ORDER_HANDOFF_SECRET'])
    env[key] = randomBytes(48).toString('base64url')
  env.NUXT_PUBLIC_APP_URL = 'https://audit.local.invalid'
  if (mode === 'runtime') {
    env.DATABASE_URL = dotenv.parse(await fs.readFile('.env')).DATABASE_URL
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.DATABASE_URL).hostname))
      throw new Error('Runtime audit DB must be local')
    env.NITRO_PORT = '3015'
    env.NITRO_HOST = '127.0.0.1'
  }
}
if (mode !== 'build')
  env.NODE_OPTIONS = (
    (env.NODE_OPTIONS || '') +
    ' --import=' +
    new URL('./audit-network.mjs', import.meta.url).href
  ).trim()
const command =
  mode === 'build'
    ? 'pnpm build'
    : mode === 'runtime'
      ? 'node .output/server/index.mjs'
      : mode === 'preview'
        ? 'pnpm preview --port 3015'
        : 'pnpm dev --host 127.0.0.1 --port 3016'
const start = performance.now(),
  lines = [],
  stages = []
await fs.mkdir('logs/performance-audit', { recursive: true })
const child =
  process.platform === 'win32'
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], {
        env,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
    : spawn(
        mode === 'runtime' ? process.execPath : 'pnpm',
        mode === 'runtime'
          ? ['.output/server/index.mjs']
          : mode === 'build'
            ? ['build']
            : mode === 'preview'
              ? ['preview', '--port', '3015']
              : ['dev', '--host', '127.0.0.1', '--port', '3016'],
        { env, stdio: ['ignore', 'pipe', 'pipe'] }
      )
let readyResolve, readyReject
const ready = new Promise((resolve, reject) => {
  readyResolve = resolve
  readyReject = reject
})
ready.catch(() => {})
function capture(chunk) {
  const text = stripVTControlCharacters(chunk.toString())
  lines.push(text)
  for (const line of text.split('\n'))
    if (
      /Vite client built|Vite server built|Nitro server built|Build complete|DevTools:|Module @nuxt\/devtools|Listening on|outbound-icon/.test(
        line
      )
    ) {
      const stage = { ms: Math.round(performance.now() - start), line: line.trim() }
      stages.push(stage)
      console.log(JSON.stringify(stage))
      if (/Nitro server built|Listening on/.test(line)) readyResolve()
    }
}
child.stdout.on('data', capture)
child.stderr.on('data', capture)
const exited = new Promise((resolve) =>
  child.on('exit', (code) => {
    readyReject(new Error('Server exited before readiness: ' + code))
    resolve(code)
  })
)
child.on('error', readyReject)
const timeout = setTimeout(() => readyReject(new Error('Startup exceeded 240s')), 240000)
function runNode(args, extraEnv) {
  return new Promise((resolve, reject) => {
    const diagnostic = spawn(process.execPath, args, {
      env: { ...env, ...extraEnv },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    diagnostic.stdout.on('data', (chunk) => console.log(chunk.toString().trim()))
    diagnostic.stderr.on('data', (chunk) => console.error(chunk.toString().trim()))
    diagnostic.on('error', reject)
    diagnostic.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('Diagnostic exited ' + code))))
  })
}
try {
  if (mode === 'build') {
    const code = await exited
    if (code !== 0) throw new Error('Build failed: ' + code)
  } else {
    await ready
    clearTimeout(timeout)
    const database = JSON.parse(await fs.readFile('logs/performance-audit/database.json'))
    const details = database.records.find((r) => r.stage === 'published.details')?.routes.join(',') || ''
    const extra = {
      AUDIT_BASE_URL:
        mode === 'preview' || mode === 'runtime' ? 'http://127.0.0.1:3015' : 'http://127.0.0.1:3016',
      AUDIT_LABEL: label,
      AUDIT_DETAIL_ROUTES: details,
      AUDIT_FRESH_PROCESS: 'true'
    }
    await runNode(['scripts/audit-performance.mjs', 'http'], extra)
    if (process.env.AUDIT_BROWSER !== '0') await runNode(['scripts/audit-performance.mjs', 'browser'], extra)
  }
} finally {
  clearTimeout(timeout)
  if (child.exitCode === null) {
    if (process.platform === 'win32')
      await new Promise((resolve) => {
        const stop = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
          windowsHide: true,
          stdio: 'ignore'
        })
        stop.on('exit', resolve)
        stop.on('error', resolve)
      })
    else child.kill('SIGTERM')
  }
  await fs.writeFile(
    `logs/performance-audit/${label}-startup.json`,
    JSON.stringify(
      {
        mode,
        devtools,
        debugInherited,
        startedAt: new Date(Date.now() - (performance.now() - start)).toISOString(),
        elapsedMs: Math.round(performance.now() - start),
        stages
      },
      null,
      2
    )
  )
  await fs.writeFile(`logs/performance-audit/${label}-startup.log`, lines.join(''))
}
