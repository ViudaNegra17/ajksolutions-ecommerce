-- Phase 6.1: fail fast. Existing inconsistencies must be reviewed, never repaired silently.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM digital_licenses dl
    JOIN order_items oi ON oi.id = dl."orderItemId"
    WHERE dl."orderItemId" IS NOT NULL
      AND (
        oi."productTypeSnapshot" <> 'LICENSE'
        OR oi."productId" IS DISTINCT FROM dl."productId"
        OR oi."variantId" IS DISTINCT FROM dl."variantId"
      )
  ) THEN
    RAISE EXCEPTION 'LICENSE_ORDER_ITEM_MISMATCH: existing DigitalLicense relation is invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM digital_fulfillments df
    JOIN order_items oi ON oi.id = df."orderItemId"
    WHERE oi."productTypeSnapshot" = 'PHYSICAL'
       OR (oi."productTypeSnapshot" = 'LICENSE' AND df."deliveryMethod" <> 'LICENSE_KEY')
       OR (oi."productTypeSnapshot" = 'DIGITAL' AND df."deliveryMethod" = 'LICENSE_KEY')
  ) THEN
    RAISE EXCEPTION 'DIGITAL_FULFILLMENT_ITEM_INVALID: existing fulfillment relation is invalid';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM digital_license_history dlh
    LEFT JOIN order_items oi ON oi.id = dlh."orderItemId"
    WHERE dlh."orderItemId" IS NOT NULL AND oi.id IS NULL
  ) THEN
    RAISE EXCEPTION 'LICENSE_HISTORY_ORDER_ITEM_INVALID: existing history relation is orphaned';
  END IF;
END
$$;

ALTER TABLE digital_fulfillments
  DROP CONSTRAINT "digital_fulfillments_orderItemId_fkey",
  ADD CONSTRAINT "digital_fulfillments_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES order_items(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE digital_license_history
  ADD CONSTRAINT "digital_license_history_orderItemId_fkey"
    FOREIGN KEY ("orderItemId") REFERENCES order_items(id) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION validate_digital_license_order_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  linked_item order_items%ROWTYPE;
BEGIN
  IF NEW."orderItemId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO linked_item FROM order_items WHERE id = NEW."orderItemId";
  IF NOT FOUND
    OR linked_item."productTypeSnapshot" <> 'LICENSE'
    OR linked_item."productId" IS DISTINCT FROM NEW."productId"
    OR linked_item."variantId" IS DISTINCT FROM NEW."variantId"
  THEN
    RAISE EXCEPTION 'LICENSE_ORDER_ITEM_MISMATCH'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER digital_license_order_item_integrity
BEFORE INSERT OR UPDATE OF "orderItemId", "productId", "variantId"
ON digital_licenses
FOR EACH ROW
EXECUTE FUNCTION validate_digital_license_order_item();

CREATE OR REPLACE FUNCTION validate_digital_fulfillment_order_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  item_type "ProductType";
BEGIN
  SELECT "productTypeSnapshot" INTO item_type FROM order_items WHERE id = NEW."orderItemId";
  IF NOT FOUND
    OR item_type = 'PHYSICAL'
    OR (item_type = 'LICENSE' AND NEW."deliveryMethod" <> 'LICENSE_KEY')
    OR (item_type = 'DIGITAL' AND NEW."deliveryMethod" = 'LICENSE_KEY')
  THEN
    RAISE EXCEPTION 'DIGITAL_FULFILLMENT_ITEM_INVALID'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER digital_fulfillment_order_item_integrity
BEFORE INSERT OR UPDATE OF "orderItemId", "deliveryMethod"
ON digital_fulfillments
FOR EACH ROW
EXECUTE FUNCTION validate_digital_fulfillment_order_item();

CREATE OR REPLACE FUNCTION protect_order_item_digital_relations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM digital_licenses dl
    WHERE dl."orderItemId" = NEW.id
      AND (
        NEW."productTypeSnapshot" <> 'LICENSE'
        OR NEW."productId" IS DISTINCT FROM dl."productId"
        OR NEW."variantId" IS DISTINCT FROM dl."variantId"
      )
  ) THEN
    RAISE EXCEPTION 'LICENSE_ORDER_ITEM_MISMATCH'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM digital_fulfillments df
    WHERE df."orderItemId" = NEW.id
      AND (
        NEW."productTypeSnapshot" = 'PHYSICAL'
        OR (NEW."productTypeSnapshot" = 'LICENSE' AND df."deliveryMethod" <> 'LICENSE_KEY')
        OR (NEW."productTypeSnapshot" = 'DIGITAL' AND df."deliveryMethod" = 'LICENSE_KEY')
      )
  ) THEN
    RAISE EXCEPTION 'DIGITAL_FULFILLMENT_ITEM_INVALID'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER order_item_digital_relation_integrity
BEFORE UPDATE OF "productId", "variantId", "productTypeSnapshot"
ON order_items
FOR EACH ROW
EXECUTE FUNCTION protect_order_item_digital_relations();
