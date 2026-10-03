import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { Client } from 'pg'

const source = process.env.DATABASE_URL
if (!source) throw new Error('DATABASE_URL is required')
const name = `ajk_phase85_empty_${process.pid}_${randomBytes(4).toString('hex')}`
assert.match(name, /^ajk_phase85_empty_\d+_[a-f0-9]+$/)
const adminUrl = new URL(source)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const targetUrl = new URL(source)
targetUrl.pathname = `/${name}`
const client = new Client({ connectionString: adminUrl.toString() })
await client.connect()

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, DATABASE_URL: targetUrl.toString() }
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`pnpm ${args.join(' ')} exited with ${code}`))
    )
  })
}

await client.query(`CREATE DATABASE "${name}"`)
try {
  await run(['db:deploy'])
  await run(['exec', 'prisma', 'migrate', 'status'])
  await run(['db:seed'])
  await run(['exec', 'vitest', 'run', 'tests/integration'])
  const verify = new Client({ connectionString: targetUrl.toString() })
  await verify.connect()
  try {
    const columns = await verify.query(
      `SELECT is_nullable, character_maximum_length FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode'`
    )
    assert.deepEqual(columns.rows, [{ is_nullable: 'YES', character_maximum_length: 100 }])
    const index = await verify.query(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'products' AND indexname = 'products_barcode_key'`
    )
    assert.match(index.rows[0]?.indexdef || '', /UNIQUE.*barcode/)
  } finally {
    await verify.end()
  }
  console.log('PASS Phase 8.5 empty database: all migrations, seed, integration and nullable unique barcode')
} finally {
  await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', [name])
  await client.query(`DROP DATABASE IF EXISTS "${name}"`)
  await client.end()
}
