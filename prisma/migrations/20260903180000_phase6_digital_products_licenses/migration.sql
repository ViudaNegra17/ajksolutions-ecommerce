-- Phase 6: encrypted digital license inventory and fulfillment.
ALTER TYPE "AvailabilitySource" ADD VALUE IF NOT EXISTS 'DIGITAL_LICENSE';
ALTER TYPE "AvailabilitySource" ADD VALUE IF NOT EXISTS 'DIGITAL';

CREATE TYPE "LicenseStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ASSIGNED', 'REVOKED', 'EXPIRED');
CREATE TYPE "DigitalLicenseHistoryAction" AS ENUM ('CREATED', 'IMPORTED', 'UPDATED', 'RESERVED', 'RELEASED', 'ASSIGNED', 'REVOKED');
CREATE TYPE "DigitalFulfillmentStatus" AS ENUM ('PENDING', 'RESERVED', 'READY', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE "DigitalDeliveryMethod" AS ENUM ('MANUAL', 'EMAIL', 'DOWNLOAD', 'LICENSE_KEY');

ALTER TABLE "order_items"
  ADD COLUMN "productTypeSnapshot" "ProductType" NOT NULL DEFAULT 'PHYSICAL';

CREATE TABLE "digital_licenses" (
  "id" UUID NOT NULL,
  "licenseCode" VARCHAR(20) NOT NULL,
  "productId" UUID NOT NULL,
  "variantId" UUID,
  "encryptedValue" TEXT NOT NULL,
  "encryptionVersion" INTEGER NOT NULL DEFAULT 1,
  "licenseFingerprint" CHAR(64) NOT NULL,
  "licenseLast4" VARCHAR(8) NOT NULL,
  "status" "LicenseStatus" NOT NULL DEFAULT 'AVAILABLE',
  "supplierId" UUID,
  "supplierReference" VARCHAR(255),
  "cost" DECIMAL(12,2),
  "orderItemId" UUID,
  "reservedAt" TIMESTAMPTZ(3),
  "assignedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3),
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "digital_licenses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digital_licenses_encryption_version_check" CHECK ("encryptionVersion" = 1),
  CONSTRAINT "digital_licenses_last4_check" CHECK (char_length("licenseLast4") BETWEEN 1 AND 8),
  CONSTRAINT "digital_licenses_state_check" CHECK (
    ("status" = 'AVAILABLE' AND "orderItemId" IS NULL AND "reservedAt" IS NULL AND "assignedAt" IS NULL AND "revokedAt" IS NULL)
    OR ("status" = 'RESERVED' AND "orderItemId" IS NOT NULL AND "reservedAt" IS NOT NULL AND "assignedAt" IS NULL AND "revokedAt" IS NULL)
    OR ("status" = 'ASSIGNED' AND "orderItemId" IS NOT NULL AND "reservedAt" IS NOT NULL AND "assignedAt" IS NOT NULL AND "revokedAt" IS NULL)
    OR ("status" = 'REVOKED' AND "revokedAt" IS NOT NULL)
    OR ("status" = 'EXPIRED')
  )
);

CREATE TABLE "digital_license_history" (
  "id" UUID NOT NULL,
  "licenseId" UUID NOT NULL,
  "action" "DigitalLicenseHistoryAction" NOT NULL,
  "fromStatus" "LicenseStatus",
  "toStatus" "LicenseStatus" NOT NULL,
  "orderItemId" UUID,
  "userId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digital_license_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "digital_fulfillments" (
  "id" UUID NOT NULL,
  "orderItemId" UUID NOT NULL,
  "status" "DigitalFulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  "deliveryMethod" "DigitalDeliveryMethod" NOT NULL,
  "fulfilledAt" TIMESTAMPTZ(3),
  "fulfilledByUserId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "digital_fulfillments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digital_fulfillments_delivery_check" CHECK (
    ("status" = 'DELIVERED' AND "fulfilledAt" IS NOT NULL)
    OR ("status" <> 'DELIVERED')
  )
);

CREATE UNIQUE INDEX "digital_licenses_licenseCode_key" ON "digital_licenses"("licenseCode");
CREATE UNIQUE INDEX "digital_licenses_licenseFingerprint_key" ON "digital_licenses"("licenseFingerprint");
CREATE INDEX "digital_licenses_productId_variantId_status_idx" ON "digital_licenses"("productId", "variantId", "status");
CREATE INDEX "digital_licenses_orderItemId_idx" ON "digital_licenses"("orderItemId");
CREATE INDEX "digital_licenses_supplierId_idx" ON "digital_licenses"("supplierId");
CREATE INDEX "digital_licenses_expiresAt_idx" ON "digital_licenses"("expiresAt");
CREATE INDEX "digital_licenses_deletedAt_idx" ON "digital_licenses"("deletedAt");
CREATE INDEX "digital_license_history_licenseId_createdAt_idx" ON "digital_license_history"("licenseId", "createdAt");
CREATE INDEX "digital_license_history_orderItemId_idx" ON "digital_license_history"("orderItemId");
CREATE INDEX "digital_license_history_userId_idx" ON "digital_license_history"("userId");
CREATE UNIQUE INDEX "digital_fulfillments_orderItemId_key" ON "digital_fulfillments"("orderItemId");
CREATE INDEX "digital_fulfillments_status_createdAt_idx" ON "digital_fulfillments"("status", "createdAt");
CREATE INDEX "digital_fulfillments_fulfilledByUserId_idx" ON "digital_fulfillments"("fulfilledByUserId");
CREATE INDEX "order_items_productTypeSnapshot_idx" ON "order_items"("productTypeSnapshot");

ALTER TABLE "digital_licenses"
  ADD CONSTRAINT "digital_licenses_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "digital_licenses_productId_variantId_fkey" FOREIGN KEY ("productId", "variantId") REFERENCES "product_variants"("productId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "digital_licenses_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "digital_licenses_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "digital_license_history"
  ADD CONSTRAINT "digital_license_history_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "digital_licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "digital_license_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "digital_fulfillments"
  ADD CONSTRAINT "digital_fulfillments_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "digital_fulfillments_fulfilledByUserId_fkey" FOREIGN KEY ("fulfilledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_digital_shipping_consistency"
  CHECK (
    "deliveryType" <> 'DIGITAL'
    OR (
      "addressId" IS NULL
      AND "shipping" = 0
      AND "shippingPendingQuote" = false
    )
  );
