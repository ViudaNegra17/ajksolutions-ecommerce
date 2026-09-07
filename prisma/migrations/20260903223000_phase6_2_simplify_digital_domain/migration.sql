-- Phase 6.2: DIGITAL unifies all public digital/license commerce.
-- Operational digital history is never discarded silently.
DO $$
DECLARE
  has_rows boolean;
BEGIN
  -- History is checked first because a valid row also requires a license row.
  IF to_regclass('public.digital_license_history') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.digital_license_history LIMIT 1)' INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION
        'PHASE6_2_DIGITAL_LICENSE_HISTORY_REQUIRES_MANUAL_REVIEW: digital_license_history contains rows; review and remove them explicitly before retrying';
    END IF;
  END IF;

  IF to_regclass('public.digital_fulfillments') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.digital_fulfillments LIMIT 1)' INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION
        'PHASE6_2_DIGITAL_FULFILLMENT_DATA_REQUIRES_MANUAL_REVIEW: digital_fulfillments contains rows; review and remove them explicitly before retrying';
    END IF;
  END IF;

  IF to_regclass('public.digital_licenses') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.digital_licenses LIMIT 1)' INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION
        'PHASE6_2_DIGITAL_LICENSE_DATA_REQUIRES_MANUAL_BACKUP: digital_licenses contains rows; back up and remove them explicitly before retrying';
    END IF;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS order_item_digital_relation_integrity ON order_items;
DROP TRIGGER IF EXISTS digital_license_order_item_integrity ON digital_licenses;
DROP TRIGGER IF EXISTS digital_fulfillment_order_item_integrity ON digital_fulfillments;
DROP FUNCTION IF EXISTS protect_order_item_digital_relations();
DROP FUNCTION IF EXISTS validate_digital_license_order_item();
DROP FUNCTION IF EXISTS validate_digital_fulfillment_order_item();

UPDATE products SET "productType" = 'DIGITAL' WHERE "productType" = 'LICENSE';
UPDATE products SET "manageStock" = false WHERE "productType" = 'DIGITAL';
UPDATE order_items SET "productTypeSnapshot" = 'DIGITAL' WHERE "productTypeSnapshot" = 'LICENSE';
UPDATE order_items SET "availabilitySource" = 'DIGITAL' WHERE "availabilitySource" = 'DIGITAL_LICENSE';

DROP TABLE digital_license_history;
DROP TABLE digital_fulfillments;
DROP TABLE digital_licenses;

CREATE TYPE "ProductType_phase6_2" AS ENUM ('PHYSICAL', 'DIGITAL');
ALTER TABLE products ALTER COLUMN "productType" DROP DEFAULT;
ALTER TABLE order_items ALTER COLUMN "productTypeSnapshot" DROP DEFAULT;
ALTER TABLE products ALTER COLUMN "productType" TYPE "ProductType_phase6_2"
  USING ("productType"::text::"ProductType_phase6_2");
ALTER TABLE order_items ALTER COLUMN "productTypeSnapshot" TYPE "ProductType_phase6_2"
  USING ("productTypeSnapshot"::text::"ProductType_phase6_2");
DROP TYPE "ProductType";
ALTER TYPE "ProductType_phase6_2" RENAME TO "ProductType";
ALTER TABLE products ALTER COLUMN "productType" SET DEFAULT 'PHYSICAL';
ALTER TABLE order_items ALTER COLUMN "productTypeSnapshot" SET DEFAULT 'PHYSICAL';

CREATE TYPE "AvailabilitySource_phase6_2" AS ENUM ('OWN_STOCK', 'SUPPLIER_STOCK', 'DIGITAL');
ALTER TABLE order_items ALTER COLUMN "availabilitySource" TYPE "AvailabilitySource_phase6_2"
  USING ("availabilitySource"::text::"AvailabilitySource_phase6_2");
DROP TYPE "AvailabilitySource";
ALTER TYPE "AvailabilitySource_phase6_2" RENAME TO "AvailabilitySource";

DROP TYPE "LicenseStatus";
DROP TYPE "DigitalLicenseHistoryAction";
DROP TYPE "DigitalFulfillmentStatus";
DROP TYPE "DigitalDeliveryMethod";
