import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { Client } from 'pg'

const source = process.env.DATABASE_URL
if (!source) throw new Error('DATABASE_URL is required')

const databaseName = `ajk_visual_${process.pid}_${randomBytes(4).toString('hex')}`
const adminUrl = new URL(source)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const visualUrl = new URL(source)
visualUrl.pathname = `/${databaseName}`
const command = 'pnpm'
const updateSnapshots = process.argv.includes('--update-snapshots')
const screens = process.argv.find((arg) => arg.startsWith('--screens='))?.slice('--screens='.length)
const allowedScreens = new Set([
  'home',
  'products',
  'detail',
  'cart',
  'checkout',
  'digital',
  'services',
  'service-detail',
  'admin-dashboard',
  'admin-products',
  'admin-settings'
])
if (screens && screens.split(',').some((screen) => !allowedScreens.has(screen)))
  throw new Error('Unknown visual screen; pass comma-separated screen names with --screens=')

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        DATABASE_URL: visualUrl.toString(),
        VISUAL_SCREEN_FILTER: screens || '',
        PLAYWRIGHT_BASE_URL: 'http://127.0.0.1:3013'
      }
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
    )
  })
}

const admin = new Client({ connectionString: adminUrl.toString() })
await admin.connect()
await admin.query(`CREATE DATABASE "${databaseName}"`)

try {
  await run(['db:deploy'])
  await run(['db:seed'])
  const args = ['exec', 'playwright', 'test', 'tests/e2e/visual-phase7-5.spec.ts']
  if (updateSnapshots) args.push('--update-snapshots')
  await run(args)
} finally {
  await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', [
    databaseName
  ])
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
  await admin.end()
}
