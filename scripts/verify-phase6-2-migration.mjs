import 'dotenv/config'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Client } = pg
const targetMigration = '20260903223000_phase6_2_simplify_digital_domain'
const migrationsRoot = path.resolve('prisma/migrations')
const sourceUrl = process.env.DATABASE_URL

if (!sourceUrl) throw new Error('DATABASE_URL is required')

const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
const databasePrefix = 'ajksolutions_phase62_safety_'
const runId = Date.now().toString(36)

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
  assert.match(name, /^ajksolutions_phase62_safety_[a-z0-9_]+$/)
  await adminQuery(`CREATE DATABASE ${quoteIdentifier(name)}`)
}

async function dropDatabase(name) {
  assert.match(name, /^ajksolutions_phase62_safety_[a-z0-9_]+$/)
  await adminQuery(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${name}' AND pid <> pg_backend_pid()
  `)
  await adminQuery(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)}`)
}

async function databaseClient(name) {
  const url = new URL(sourceUrl)
  url.pathname = `/${name}`
  const client = new Client({ connectionString: url.toString() })
  await client.connect()
  return client
}

async function migrationSql(name) {
  return readFile(path.join(migrationsRoot, name, 'migration.sql'), 'utf8')
}

async function applyLegacyMigrations(client) {
  const migrations = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name < targetMigration)
    .map((entry) => entry.name)
    .sort()

  assert.equal(migrations.length, 9)
  for (const migration of migrations) await client.query(await migrationSql(migration))
}

const ids = {
  category: '10000000-0000-4000-8000-000000000001',
  product: '10000000-0000-4000-8000-000000000002',
  customer: '10000000-0000-4000-8000-000000000003',
  order: '10000000-0000-4000-8000-000000000004',
  request: '10000000-0000-4000-8000-000000000005',
  item: '10000000-0000-4000-8000-000000000006',
  license: '10000000-0000-4000-8000-000000000007',
  history: '10000000-0000-4000-8000-000000000008',
  fulfillment: '10000000-0000-4000-8000-000000000009'
}

async function insertProduct(client, productType) {
  await client.query(
    `
      INSERT INTO categories (id, name, slug, active, "createdAt", "updatedAt")
      VALUES ($1, 'Temporal digital', 'temporal-digital', true, now(), now())
    `,
    [ids.category]
  )
  await client.query(
    `
      INSERT INTO products (
        id, "productCode", sku, name, slug, "productType", "priceMode", price,
        "categoryId", "manageStock", active, "createdAt", "updatedAt"
      )
      VALUES ($1, 'TMP-000001', 'TMP-DIGITAL-1', 'Temporal digital',
              'temporal-digital-product', $2, 'FIXED', 10, $3, false, true, now(), now())
    `,
    [ids.product, productType, ids.category]
  )
}

async function insertHistoricalOrder(client, productType, availabilitySource) {
  await client.query(
    `
      INSERT INTO customers (
        id, "customerCode", "firstName", "lastName", email, whatsapp, active,
        "createdAt", "updatedAt"
      )
      VALUES ($1, 'CLI-900001', 'Cliente', 'Temporal', 'phase62@example.test',
              '+593999999999', true, now(), now())
    `,
    [ids.customer]
  )
  await client.query(
    `
      INSERT INTO orders (
        id, "orderNumber", "requestId", "checkoutFingerprint", "customerId",
        status, "deliveryType", subtotal, discount, tax, shipping, total,
        currency, "shippingPendingQuote", source, "createdAt", "updatedAt"
      )
      VALUES ($1, 'ORD-900001', $2, repeat('a', 43), $3, 'NEW', 'DIGITAL',
              10, 0, 0, 0, 10, 'USD', false, 'WEB', now(), now())
    `,
    [ids.order, ids.request, ids.customer]
  )
  await client.query(
    `
      INSERT INTO order_items (
        id, "orderId", "productId", "productCodeSnapshot", "skuSnapshot",
        "productNameSnapshot", "unitPrice", "taxRate", "taxAmount", quantity,
        subtotal, total, "priceIncludesTax", "availabilitySource",
        "productTypeSnapshot", "createdAt"
      )
      VALUES ($1, $2, $3, 'TMP-000001', 'TMP-DIGITAL-1', 'Temporal digital',
              10, 0, 0, 1, 10, 10, false, $4, $5, now())
    `,
    [ids.item, ids.order, ids.product, availabilitySource, productType]
  )
}

async function insertLicense(client) {
  await client.query(
    `
      INSERT INTO digital_licenses (
        id, "licenseCode", "productId", "encryptedValue", "encryptionVersion",
        "licenseFingerprint", "licenseLast4", status, "createdAt", "updatedAt"
      )
      VALUES ($1, 'LIC-900001', $2, 'test-envelope', 1, repeat('f', 64),
              'ABCD', 'AVAILABLE', now(), now());
    `,
    [ids.license, ids.product]
  )
}

async function assertLegacySchemaIntact(client) {
  const result = await client.query(`
    SELECT
      to_regclass('public.digital_licenses') IS NOT NULL AS licenses,
      to_regclass('public.digital_license_history') IS NOT NULL AS history,
      to_regclass('public.digital_fulfillments') IS NOT NULL AS fulfillments,
      EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'ProductType' AND e.enumlabel = 'LICENSE'
      ) AS license_enum,
      EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'AvailabilitySource' AND e.enumlabel = 'DIGITAL_LICENSE'
      ) AS availability_enum
  `)
  assert.deepEqual(result.rows[0], {
    licenses: true,
    history: true,
    fulfillments: true,
    license_enum: true,
    availability_enum: true
  })
}

async function expectAbort(caseName, expectedCode, expectedCounts, fixture) {
  const name = `${databasePrefix}${runId}_${caseName}`
  await createDatabase(name)
  const client = await databaseClient(name)
  try {
    await applyLegacyMigrations(client)
    await fixture(client)
    await assert.rejects(client.query(await migrationSql(targetMigration)), new RegExp(expectedCode))
    await assertLegacySchemaIntact(client)
    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM digital_licenses) AS licenses,
        (SELECT count(*)::int FROM digital_license_history) AS history,
        (SELECT count(*)::int FROM digital_fulfillments) AS fulfillments
    `)
    assert.deepEqual(counts.rows[0], expectedCounts)
    console.log(`PASS abort ${caseName}: ${expectedCode}`)
  } finally {
    await client.end()
    await dropDatabase(name)
  }
}

async function verifySuccessfulMigration() {
  const name = `${databasePrefix}${runId}_empty`
  await createDatabase(name)
  const client = await databaseClient(name)
  try {
    await applyLegacyMigrations(client)
    await insertProduct(client, 'LICENSE')
    await insertHistoricalOrder(client, 'LICENSE', 'DIGITAL_LICENSE')
    await client.query(await migrationSql(targetMigration))

    const result = await client.query(
      `
        SELECT
          to_regclass('public.digital_licenses') IS NULL AS licenses_absent,
          to_regclass('public.digital_license_history') IS NULL AS history_absent,
          to_regclass('public.digital_fulfillments') IS NULL AS fulfillments_absent,
          (SELECT "productType"::text FROM products WHERE id = $1) AS product_type,
          (SELECT "productTypeSnapshot"::text FROM order_items WHERE id = $2) AS item_type,
          (SELECT "availabilitySource"::text FROM order_items WHERE id = $2) AS availability_source,
          (SELECT count(*)::int FROM orders WHERE id = $3) AS order_count,
          (SELECT count(*)::int FROM order_items WHERE id = $2) AS item_count
      `,
      [ids.product, ids.item, ids.order]
    )
    assert.deepEqual(result.rows[0], {
      licenses_absent: true,
      history_absent: true,
      fulfillments_absent: true,
      product_type: 'DIGITAL',
      item_type: 'DIGITAL',
      availability_source: 'DIGITAL',
      order_count: 1,
      item_count: 1
    })
    console.log('PASS empty/data migration: tables removed and historical Order preserved')
  } finally {
    await client.end()
    await dropDatabase(name)
  }
}

await expectAbort(
  'license',
  'PHASE6_2_DIGITAL_LICENSE_DATA_REQUIRES_MANUAL_BACKUP',
  { licenses: 1, history: 0, fulfillments: 0 },
  async (client) => {
    await insertProduct(client, 'LICENSE')
    await insertLicense(client)
  }
)

await expectAbort(
  'fulfillment',
  'PHASE6_2_DIGITAL_FULFILLMENT_DATA_REQUIRES_MANUAL_REVIEW',
  { licenses: 0, history: 0, fulfillments: 1 },
  async (client) => {
    await insertProduct(client, 'DIGITAL')
    await insertHistoricalOrder(client, 'DIGITAL', 'DIGITAL')
    await client.query(
      `
        INSERT INTO digital_fulfillments (
          id, "orderItemId", status, "deliveryMethod", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, 'PENDING', 'MANUAL', now(), now())
      `,
      [ids.fulfillment, ids.item]
    )
  }
)

await expectAbort(
  'history',
  'PHASE6_2_DIGITAL_LICENSE_HISTORY_REQUIRES_MANUAL_REVIEW',
  { licenses: 1, history: 1, fulfillments: 0 },
  async (client) => {
    await insertProduct(client, 'LICENSE')
    await insertLicense(client)
    await client.query(
      `
        INSERT INTO digital_license_history (
          id, "licenseId", action, "toStatus", notes, "createdAt"
        )
        VALUES ($1, $2, 'CREATED', 'AVAILABLE', 'Temporal safety test', now())
      `,
      [ids.history, ids.license]
    )
  }
)

await verifySuccessfulMigration()
