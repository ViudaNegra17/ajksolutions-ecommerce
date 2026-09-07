-- Phase 2.1: catalog and inventory integrity hardening.
-- Existing partial unique indexes from Phase 2 are intentionally preserved.

UPDATE "products" SET "sku" = upper(btrim("sku"));
UPDATE "product_variants" SET "sku" = upper(btrim("sku"));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "products" p
    JOIN "product_variants" v ON v."sku" = p."sku"
  ) THEN
    RAISE EXCEPTION 'Cannot apply Phase 2.1: a product and a variant share the same SKU';
  END IF;
END
$$;

ALTER TABLE "products"
  ADD CONSTRAINT "products_sku_not_blank" CHECK (length(btrim("sku")) > 0);
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_sku_not_blank" CHECK (length(btrim("sku")) > 0);

CREATE OR REPLACE FUNCTION enforce_catalog_sku_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."sku" := upper(btrim(NEW."sku"));
  IF NEW."sku" = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'catalog_sku_not_blank',
      MESSAGE = 'Catalog SKU cannot be blank';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."sku", 21001));

  IF TG_TABLE_NAME = 'products' THEN
    IF EXISTS (SELECT 1 FROM "product_variants" WHERE "sku" = NEW."sku") THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        CONSTRAINT = 'catalog_sku_global_unique',
        MESSAGE = 'SKU already exists in product_variants';
    END IF;
  ELSIF EXISTS (SELECT 1 FROM "products" WHERE "sku" = NEW."sku") THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      CONSTRAINT = 'catalog_sku_global_unique',
      MESSAGE = 'SKU already exists in products';
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER "products_normalize_and_check_sku"
BEFORE INSERT OR UPDATE OF "sku" ON "products"
FOR EACH ROW EXECUTE FUNCTION enforce_catalog_sku_integrity();

CREATE TRIGGER "product_variants_normalize_and_check_sku"
BEFORE INSERT OR UPDATE OF "sku" ON "product_variants"
FOR EACH ROW EXECUTE FUNCTION enforce_catalog_sku_integrity();

CREATE UNIQUE INDEX "product_variants_productId_id_key"
  ON "product_variants"("productId", "id");

ALTER TABLE "inventory_stocks" DROP CONSTRAINT "inventory_stocks_variantId_fkey";
ALTER TABLE "inventory_stocks"
  ADD CONSTRAINT "inventory_stocks_productId_variantId_fkey"
  FOREIGN KEY ("productId", "variantId")
  REFERENCES "product_variants"("productId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_variantId_fkey";
ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_productId_variantId_fkey"
  FOREIGN KEY ("productId", "variantId")
  REFERENCES "product_variants"("productId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_products" DROP CONSTRAINT "supplier_products_variantId_fkey";
ALTER TABLE "supplier_products"
  ADD CONSTRAINT "supplier_products_productId_variantId_fkey"
  FOREIGN KEY ("productId", "variantId")
  REFERENCES "product_variants"("productId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "attribute_options_attributeId_id_key"
  ON "attribute_options"("attributeId", "id");
CREATE UNIQUE INDEX "product_attribute_values_id_attributeId_key"
  ON "product_attribute_values"("id", "attributeId");

ALTER TABLE "variant_attribute_values"
  DROP CONSTRAINT "variant_attribute_values_optionId_fkey";
ALTER TABLE "variant_attribute_values"
  ADD CONSTRAINT "variant_attribute_values_attributeId_optionId_fkey"
  FOREIGN KEY ("attributeId", "optionId")
  REFERENCES "attribute_options"("attributeId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_attribute_value_options" ADD COLUMN "attributeId" UUID;
UPDATE "product_attribute_value_options" pavo
SET "attributeId" = pav."attributeId"
FROM "product_attribute_values" pav
WHERE pav."id" = pavo."productAttributeValueId";
ALTER TABLE "product_attribute_value_options" ALTER COLUMN "attributeId" SET NOT NULL;

ALTER TABLE "product_attribute_value_options"
  DROP CONSTRAINT "product_attribute_value_options_productAttributeValueId_fkey";
ALTER TABLE "product_attribute_value_options"
  DROP CONSTRAINT "product_attribute_value_options_optionId_fkey";
ALTER TABLE "product_attribute_value_options"
  ADD CONSTRAINT "product_attribute_value_options_value_attribute_fkey"
  FOREIGN KEY ("productAttributeValueId", "attributeId")
  REFERENCES "product_attribute_values"("id", "attributeId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_value_options"
  ADD CONSTRAINT "product_attribute_value_options_attribute_option_fkey"
  FOREIGN KEY ("attributeId", "optionId")
  REFERENCES "attribute_options"("attributeId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "product_attribute_value_options_attributeId_optionId_idx"
  ON "product_attribute_value_options"("attributeId", "optionId");

ALTER TABLE "products" DROP CONSTRAINT "products_valid_price";
ALTER TABLE "products"
  ADD CONSTRAINT "products_valid_price"
  CHECK (
    ("priceMode" = 'CONTACT' AND "price" IS NULL)
    OR ("priceMode" = 'FIXED' AND "price" IS NOT NULL AND "price" > 0)
  );

ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_valid_price";
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_valid_price"
  CHECK ("priceOverride" IS NULL OR "priceOverride" > 0);

CREATE OR REPLACE FUNCTION enforce_variant_price_mode()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."priceOverride" IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM "products"
       WHERE "id" = NEW."productId" AND "priceMode" = 'FIXED'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'product_variants_price_mode_consistency',
      MESSAGE = 'CONTACT products cannot define variant priceOverride';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER "product_variants_check_price_mode"
BEFORE INSERT OR UPDATE OF "productId", "priceOverride" ON "product_variants"
FOR EACH ROW EXECUTE FUNCTION enforce_variant_price_mode();

CREATE OR REPLACE FUNCTION enforce_product_variant_prices()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."priceMode" = 'CONTACT'
     AND EXISTS (
       SELECT 1 FROM "product_variants"
       WHERE "productId" = NEW."id" AND "priceOverride" IS NOT NULL
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'products_variant_price_mode_consistency',
      MESSAGE = 'CONTACT products cannot retain variant priceOverride';
  END IF;
  RETURN NULL;
END
$$;

CREATE CONSTRAINT TRIGGER "products_check_variant_prices"
AFTER INSERT OR UPDATE OF "priceMode" ON "products"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_product_variant_prices();
