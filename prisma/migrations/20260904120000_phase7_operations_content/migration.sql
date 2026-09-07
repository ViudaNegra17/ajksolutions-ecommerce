CREATE TYPE "BannerPlacement" AS ENUM ('HOME_HERO', 'HOME_SECONDARY', 'PRODUCTS_TOP');
CREATE TYPE "PromotionType" AS ENUM ('INFORMATIONAL');

CREATE TABLE "banners" (
  "id" UUID NOT NULL,
  "code" VARCHAR(20) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "subtitle" VARCHAR(220),
  "description" VARCHAR(500),
  "imageUrl" VARCHAR(2048) NOT NULL,
  "mobileImageUrl" VARCHAR(2048),
  "ctaLabel" VARCHAR(80),
  "ctaUrl" VARCHAR(2048),
  "placement" "BannerPlacement" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMPTZ(3),
  "endsAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotions" (
  "id" UUID NOT NULL,
  "code" VARCHAR(20) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "description" VARCHAR(500),
  "badge" VARCHAR(40) NOT NULL,
  "type" "PromotionType" NOT NULL DEFAULT 'INFORMATIONAL',
  "startsAt" TIMESTAMPTZ(3),
  "endsAt" TIMESTAMPTZ(3),
  "active" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "promotion_products" (
  "promotionId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("promotionId", "productId")
);

CREATE TABLE "promotion_categories" (
  "promotionId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  CONSTRAINT "promotion_categories_pkey" PRIMARY KEY ("promotionId", "categoryId")
);

CREATE UNIQUE INDEX "banners_code_key" ON "banners"("code");
CREATE INDEX "banners_placement_active_sortOrder_idx" ON "banners"("placement", "active", "sortOrder");
CREATE INDEX "banners_startsAt_endsAt_idx" ON "banners"("startsAt", "endsAt");
CREATE INDEX "banners_deletedAt_idx" ON "banners"("deletedAt");
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_active_priority_idx" ON "promotions"("active", "priority");
CREATE INDEX "promotions_startsAt_endsAt_idx" ON "promotions"("startsAt", "endsAt");
CREATE INDEX "promotions_deletedAt_idx" ON "promotions"("deletedAt");
CREATE INDEX "promotion_products_productId_idx" ON "promotion_products"("productId");
CREATE INDEX "promotion_categories_categoryId_idx" ON "promotion_categories"("categoryId");

ALTER TABLE "promotion_products"
  ADD CONSTRAINT "promotion_products_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_products"
  ADD CONSTRAINT "promotion_products_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_categories"
  ADD CONSTRAINT "promotion_categories_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_categories"
  ADD CONSTRAINT "promotion_categories_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
