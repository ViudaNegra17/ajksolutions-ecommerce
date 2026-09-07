import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import pg from 'pg'

const { Client } = pg
const sourceUrl = process.env.DATABASE_URL
if (!sourceUrl) throw new Error('DATABASE_URL is required')

const name = `ajksolutions_phase7_empty_${Date.now().toString(36)}`
assert.match(name, /^ajksolutions_phase7_empty_[a-z0-9]+$/)
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
const targetUrl = new URL(sourceUrl)
targetUrl.pathname = `/${name}`

async function adminQuery(text) {
  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    await client.query(text)
  } finally {
    await client.end()
  }
}

function runPnpm(args) {
  const windows = process.platform === 'win32'
  const command = windows ? process.env.ComSpec || 'cmd.exe' : 'pnpm'
  const commandArgs = windows ? ['/d', '/s', '/c', ['pnpm', ...args].join(' ')] : args
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: targetUrl.toString() },
    stdio: 'inherit',
    shell: false
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`pnpm ${args.join(' ')} failed with ${result.status}`)
}

try {
  await adminQuery(`CREATE DATABASE ${quoteIdentifier(name)}`)
  runPnpm(['db:deploy'])
  runPnpm(['db:seed'])
  runPnpm(['exec', 'vitest', 'run', 'tests/integration/operations-phase7.test.ts'])

  const client = new Client({ connectionString: targetUrl.toString() })
  await client.connect()
  try {
    const result = await client.query(`
      SELECT
        to_regclass('public.banners') IS NOT NULL AS banners,
        to_regclass('public.promotions') IS NOT NULL AS promotions,
        (SELECT count(*)::int FROM pg_constraint
          WHERE conname IN ('banners_valid_schedule', 'promotions_valid_schedule', 'banners_complete_cta')
        ) AS content_constraints,
        (SELECT count(*)::int FROM permissions WHERE code = 'banners.view') AS banner_permission,
        (SELECT count(*)::int FROM settings WHERE key = 'inventory.lowStockThreshold') AS stock_setting
    `)
    assert.deepEqual(result.rows[0], {
      banners: true,
      promotions: true,
      content_constraints: 3,
      banner_permission: 1,
      stock_setting: 1
    })
  } finally {
    await client.end()
  }
  console.log('PASS Phase 7 empty database: migrations, seed and integration tests')
} finally {
  await adminQuery(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${name}' AND pid <> pg_backend_pid()
  `)
  await adminQuery(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)}`)
}
