import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const sourceUrl = process.env.DATABASE_URL
if (!sourceUrl) throw new Error('DATABASE_URL is required')

const targetMigration = '20260904150000_phase7_banner_promotion_integrity_hardening'
const migrationsRoot = path.resolve('prisma/migrations')
const prefix = 'ajksolutions_phase7_integrity_'
const runId = Date.now().toString(36)
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`

async function adminQuery(text) {
  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    return await client.query(text)
  } finally {
    await client.end()
  }
}

async function createDatabase(name) {
  assert.match(name, /^ajksolutions_phase7_integrity_[a-z0-9_]+$/)
  await adminQuery(`CREATE DATABASE ${quoteIdentifier(name)}`)
}

async function dropDatabase(name) {
  assert.match(name, /^ajksolutions_phase7_integrity_[a-z0-9_]+$/)
  await adminQuery(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${name}' AND pid <> pg_backend_pid()
  `)
  await adminQuery(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)}`)
}

async function connect(name) {
  const url = new URL(sourceUrl)
  url.pathname = `/${name}`
  const client = new Client({ connectionString: url.toString() })
  await client.connect()
  return client
}

async function migrationSql(name) {
  return readFile(path.join(migrationsRoot, name, 'migration.sql'), 'utf8')
}

async function applyPreviousMigrations(client) {
  const migrations = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name < targetMigration)
    .map((entry) => entry.name)
    .sort()
  assert.equal(migrations.length, 11)
  for (const migration of migrations) await client.query(await migrationSql(migration))
}

async function constraintCount(client) {
  const result = await client.query(`
    SELECT count(*)::int AS count
    FROM pg_constraint
    WHERE conname IN ('banners_valid_schedule', 'promotions_valid_schedule', 'banners_complete_cta')
  `)
  return result.rows[0].count
}

async function expectPrecheck(caseName, expectedMessage, fixture) {
  const name = `${prefix}${runId}_${caseName}`
  await createDatabase(name)
  const client = await connect(name)
  try {
    await applyPreviousMigrations(client)
    await fixture(client)
    await assert.rejects(client.query(await migrationSql(targetMigration)), new RegExp(expectedMessage))
    await client.query('ROLLBACK')
    assert.equal(await constraintCount(client), 0, 'A failed precheck must not leave partial constraints')
    console.log(`PASS precheck ${caseName}: ${expectedMessage}`)
  } finally {
    await client.end()
    await dropDatabase(name)
  }
}

async function insertBanner(client, code, startsAt = null, endsAt = null, ctaLabel = null, ctaUrl = null) {
  return client.query(
    `INSERT INTO banners (
       id, code, title, "imageUrl", placement, active, "startsAt", "endsAt",
       "ctaLabel", "ctaUrl", "createdAt", "updatedAt"
     ) VALUES (gen_random_uuid(), $1, $1, 'https://example.com/banner.jpg', 'HOME_HERO', true,
       $2, $3, $4, $5, now(), now())`,
    [code, startsAt, endsAt, ctaLabel, ctaUrl]
  )
}

async function insertPromotion(client, code, startsAt, endsAt) {
  return client.query(
    `INSERT INTO promotions (
       id, code, name, badge, type, active, "startsAt", "endsAt", "createdAt", "updatedAt"
     ) VALUES (gen_random_uuid(), $1, $1, 'Info', 'INFORMATIONAL', true, $2, $3, now(), now())`,
    [code, startsAt, endsAt]
  )
}

const start = new Date('2026-10-01T12:00:00Z')
const end = new Date('2026-10-02T12:00:00Z')

await expectPrecheck('banner_date', 'PHASE7_BANNER_INVALID_SCHEDULE_REQUIRES_MANUAL_REVIEW', (client) =>
  insertBanner(client, 'BAN-BAD-DATE', end, start)
)
await expectPrecheck('promotion_date', 'PHASE7_PROMOTION_INVALID_SCHEDULE_REQUIRES_MANUAL_REVIEW', (client) =>
  insertPromotion(client, 'PRO-BAD-DATE', end, start)
)
await expectPrecheck('banner_cta', 'PHASE7_BANNER_INCOMPLETE_CTA_REQUIRES_MANUAL_REVIEW', (client) =>
  insertBanner(client, 'BAN-BAD-CTA', null, null, 'Comprar', null)
)

const successName = `${prefix}${runId}_success`
await createDatabase(successName)
const success = await connect(successName)
try {
  await applyPreviousMigrations(success)
  await success.query(await migrationSql(targetMigration))
  assert.equal(await constraintCount(success), 3)

  await insertBanner(success, 'BAN-NO-DATES')
  await insertBanner(success, 'BAN-START-ONLY', start, null)
  await insertBanner(success, 'BAN-END-ONLY', null, end)
  await insertBanner(success, 'BAN-VALID-RANGE', start, end)
  await insertBanner(success, 'BAN-COMPLETE-CTA', null, null, 'Ver productos', '/productos')

  await assert.rejects(insertBanner(success, 'BAN-SAME-DATE', start, start), {
    constraint: 'banners_valid_schedule'
  })
  await assert.rejects(insertBanner(success, 'BAN-INVERTED', end, start), {
    constraint: 'banners_valid_schedule'
  })
  await assert.rejects(insertBanner(success, 'BAN-LABEL-ONLY', null, null, 'Comprar', null), {
    constraint: 'banners_complete_cta'
  })
  await assert.rejects(insertBanner(success, 'BAN-URL-ONLY', null, null, null, '/productos'), {
    constraint: 'banners_complete_cta'
  })

  await insertPromotion(success, 'PRO-VALID-RANGE', start, end)
  await assert.rejects(insertPromotion(success, 'PRO-SAME-DATE', start, start), {
    constraint: 'promotions_valid_schedule'
  })
  await assert.rejects(insertPromotion(success, 'PRO-INVERTED', end, start), {
    constraint: 'promotions_valid_schedule'
  })

  await assert.rejects(
    success.query(`UPDATE banners SET "endsAt" = "startsAt" WHERE code = 'BAN-VALID-RANGE'`),
    { constraint: 'banners_valid_schedule' }
  )
  await assert.rejects(
    success.query(`UPDATE promotions SET "endsAt" = "startsAt" WHERE code = 'PRO-VALID-RANGE'`),
    { constraint: 'promotions_valid_schedule' }
  )
  await assert.rejects(success.query(`UPDATE banners SET "ctaUrl" = NULL WHERE code = 'BAN-COMPLETE-CTA'`), {
    constraint: 'banners_complete_cta'
  })

  console.log('PASS direct SQL constraints: valid INSERTs and rejected INSERT/UPDATE mutations')
} finally {
  await success.end()
  await dropDatabase(successName)
}
