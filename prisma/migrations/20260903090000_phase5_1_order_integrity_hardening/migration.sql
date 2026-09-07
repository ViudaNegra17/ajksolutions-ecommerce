-- Phase 5.1: ownership and transactional history integrity.
-- Abort instead of inventing ownership if legacy data is inconsistent.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "orders" o
    JOIN "addresses" a ON a."id" = o."addressId"
    WHERE o."addressId" IS NOT NULL
      AND o."customerId" <> a."customerId"
  ) THEN
    RAISE EXCEPTION
      'Phase 5.1 cannot add address ownership FK: orders with foreign customer addresses exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX "addresses_customerId_id_key"
  ON "addresses"("customerId", "id");

DROP INDEX IF EXISTS "orders_customerId_addressId_idx";
CREATE INDEX "orders_customerId_addressId_idx"
  ON "orders"("customerId", "addressId");

ALTER TABLE "orders"
  DROP CONSTRAINT "orders_addressId_fkey",
  ADD CONSTRAINT "orders_customerId_addressId_fkey"
    FOREIGN KEY ("customerId", "addressId")
    REFERENCES "addresses"("customerId", "id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  ADD CONSTRAINT "orders_pickup_shipping_consistency"
    CHECK (
      "deliveryType" <> 'PICKUP'
      OR (
        "addressId" IS NULL
        AND "shipping" = 0
        AND "shippingPendingQuote" = false
      )
    );

ALTER TABLE "order_items"
  DROP CONSTRAINT "order_items_productId_variantId_fkey",
  ADD CONSTRAINT "order_items_productId_variantId_fkey"
    FOREIGN KEY ("productId", "variantId")
    REFERENCES "product_variants"("productId", "id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
