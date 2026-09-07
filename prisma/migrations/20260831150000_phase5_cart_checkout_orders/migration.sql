-- Phase 5: cart checkout, orders, immutable snapshots and inventory reservation lifecycle.

CREATE TYPE "DeliveryType" AS ENUM ('PICKUP', 'DELIVERY', 'DIGITAL');
CREATE TYPE "OrderStatus" AS ENUM (
  'NEW', 'CONTACTED', 'CONFIRMED', 'PAYMENT_PENDING', 'PAID',
  'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED'
);
CREATE TYPE "OrderSource" AS ENUM ('WEB', 'ADMIN', 'WHATSAPP', 'PHONE', 'OTHER');
CREATE TYPE "AvailabilitySource" AS ENUM ('OWN_STOCK', 'SUPPLIER_STOCK');

ALTER TABLE "inventory_movements"
  DROP CONSTRAINT "inventory_movements_createdById_fkey";
ALTER TABLE "inventory_movements"
  ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "addresses" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "label" VARCHAR(80) NOT NULL DEFAULT 'Principal',
  "recipientName" VARCHAR(220) NOT NULL,
  "country" VARCHAR(2) NOT NULL,
  "province" VARCHAR(120) NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "addressLine1" VARCHAR(255) NOT NULL,
  "addressLine2" VARCHAR(255),
  "reference" VARCHAR(500) NOT NULL,
  "postalCode" VARCHAR(30),
  "phone" VARCHAR(30),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" UUID NOT NULL,
  "orderNumber" VARCHAR(20) NOT NULL,
  "requestId" UUID NOT NULL,
  "checkoutFingerprint" CHAR(43) NOT NULL,
  "customerId" UUID NOT NULL,
  "addressId" UUID,
  "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
  "deliveryType" "DeliveryType" NOT NULL,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "tax" DECIMAL(14,2) NOT NULL,
  "shipping" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "shippingPendingQuote" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "source" "OrderSource" NOT NULL DEFAULT 'WEB',
  "whatsappHandoffTokenHash" CHAR(64),
  "whatsappOpenedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "confirmedAt" TIMESTAMPTZ(3),
  "paidAt" TIMESTAMPTZ(3),
  "cancelledAt" TIMESTAMPTZ(3),
  "completedAt" TIMESTAMPTZ(3),
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_addresses" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "recipientName" VARCHAR(220) NOT NULL,
  "country" VARCHAR(2) NOT NULL,
  "province" VARCHAR(120) NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "addressLine1" VARCHAR(255) NOT NULL,
  "addressLine2" VARCHAR(255),
  "reference" VARCHAR(500) NOT NULL,
  "postalCode" VARCHAR(30),
  "phone" VARCHAR(30),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "productId" UUID,
  "variantId" UUID,
  "productCodeSnapshot" VARCHAR(20) NOT NULL,
  "skuSnapshot" VARCHAR(100) NOT NULL,
  "productNameSnapshot" VARCHAR(220) NOT NULL,
  "variantSnapshot" VARCHAR(255),
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "taxRate" DECIMAL(5,2) NOT NULL,
  "taxAmount" DECIMAL(14,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "priceIncludesTax" BOOLEAN NOT NULL,
  "availabilitySource" "AvailabilitySource" NOT NULL,
  "estimatedLeadTimeDays" INTEGER,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_status_history" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "userId" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE UNIQUE INDEX "orders_requestId_key" ON "orders"("requestId");
CREATE UNIQUE INDEX "orders_whatsappHandoffTokenHash_key" ON "orders"("whatsappHandoffTokenHash");
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");
CREATE INDEX "orders_whatsappOpenedAt_idx" ON "orders"("whatsappOpenedAt");
CREATE INDEX "orders_deliveryType_createdAt_idx" ON "orders"("deliveryType", "createdAt");
CREATE INDEX "addresses_customerId_deletedAt_idx" ON "addresses"("customerId", "deletedAt");
CREATE UNIQUE INDEX "order_addresses_orderId_key" ON "order_addresses"("orderId");
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");
CREATE INDEX "order_items_availabilitySource_idx" ON "order_items"("availabilitySource");
CREATE INDEX "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");
CREATE INDEX "order_status_history_userId_idx" ON "order_status_history"("userId");

ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey"
  FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_variantId_fkey"
  FOREIGN KEY ("productId", "variantId") REFERENCES "product_variants"("productId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_non_negative_totals" CHECK (
  "subtotal" >= 0 AND "discount" >= 0 AND "tax" >= 0 AND "shipping" >= 0 AND "total" >= 0
);
ALTER TABLE "orders" ADD CONSTRAINT "orders_total_consistency" CHECK (
  "total" = "subtotal" - "discount" + "tax" + "shipping"
);
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_canonical" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_fingerprint_format" CHECK (
  "checkoutFingerprint" ~ '^[A-Za-z0-9_-]{43}$'
);
ALTER TABLE "orders" ADD CONSTRAINT "orders_handoff_hash_format" CHECK (
  "whatsappHandoffTokenHash" IS NULL OR "whatsappHandoffTokenHash" ~ '^[0-9a-f]{64}$'
);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_valid_values" CHECK (
  "quantity" > 0 AND "unitPrice" > 0 AND "taxRate" >= 0 AND "taxRate" <= 100
  AND "taxAmount" >= 0 AND "subtotal" > 0 AND "total" > 0
  AND ("estimatedLeadTimeDays" IS NULL OR "estimatedLeadTimeDays" >= 0)
);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_total_consistency" CHECK (
  "total" = "subtotal" + "taxAmount"
);
