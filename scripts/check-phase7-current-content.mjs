import 'dotenv/config'
import assert from 'node:assert/strict'
import pg from 'pg'

const { Client } = pg
assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required')
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const result = await client.query(`
    SELECT
      (SELECT count(*)::int FROM banners
       WHERE "startsAt" IS NOT NULL AND "endsAt" IS NOT NULL AND "startsAt" >= "endsAt")
        AS invalid_banner_schedule,
      (SELECT count(*)::int FROM promotions
       WHERE "startsAt" IS NOT NULL AND "endsAt" IS NOT NULL AND "startsAt" >= "endsAt")
        AS invalid_promotion_schedule,
      (SELECT count(*)::int FROM banners
       WHERE ("ctaLabel" IS NULL) <> ("ctaUrl" IS NULL)
          OR ("ctaLabel" IS NOT NULL AND length(trim("ctaLabel")) = 0)
          OR ("ctaUrl" IS NOT NULL AND length(trim("ctaUrl")) = 0))
        AS invalid_banner_cta
  `)
  assert.deepEqual(result.rows[0], {
    invalid_banner_schedule: 0,
    invalid_promotion_schedule: 0,
    invalid_banner_cta: 0
  })
  const constraints = await client.query(`
    SELECT conname
    FROM pg_constraint
    WHERE conname IN ('banners_valid_schedule', 'promotions_valid_schedule', 'banners_complete_cta')
    ORDER BY conname
  `)
  assert.deepEqual(
    constraints.rows.map((row) => row.conname),
    ['banners_complete_cta', 'banners_valid_schedule', 'promotions_valid_schedule']
  )
  console.log('PASS current data and catalog: no invalid rows and all content constraints exist')
} finally {
  await client.end()
}
