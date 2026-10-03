-- Add a separate commercial identifier. Existing products remain NULL.
ALTER TABLE "products" ADD COLUMN "barcode" VARCHAR(100);
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");
