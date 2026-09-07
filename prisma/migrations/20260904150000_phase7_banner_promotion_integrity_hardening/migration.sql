BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "banners"
    WHERE "startsAt" IS NOT NULL
      AND "endsAt" IS NOT NULL
      AND "startsAt" >= "endsAt"
  ) THEN
    RAISE EXCEPTION
      'PHASE7_BANNER_INVALID_SCHEDULE_REQUIRES_MANUAL_REVIEW: banners contains an invalid schedule; review the affected rows before retrying';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "promotions"
    WHERE "startsAt" IS NOT NULL
      AND "endsAt" IS NOT NULL
      AND "startsAt" >= "endsAt"
  ) THEN
    RAISE EXCEPTION
      'PHASE7_PROMOTION_INVALID_SCHEDULE_REQUIRES_MANUAL_REVIEW: promotions contains an invalid schedule; review the affected rows before retrying';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "banners"
    WHERE ("ctaLabel" IS NULL) <> ("ctaUrl" IS NULL)
      OR ("ctaLabel" IS NOT NULL AND length(trim("ctaLabel")) = 0)
      OR ("ctaUrl" IS NOT NULL AND length(trim("ctaUrl")) = 0)
  ) THEN
    RAISE EXCEPTION
      'PHASE7_BANNER_INCOMPLETE_CTA_REQUIRES_MANUAL_REVIEW: banners contains an incomplete CTA; review the affected rows before retrying';
  END IF;
END
$$;

ALTER TABLE "banners"
  ADD CONSTRAINT "banners_valid_schedule"
  CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt");

ALTER TABLE "promotions"
  ADD CONSTRAINT "promotions_valid_schedule"
  CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt");

ALTER TABLE "banners"
  ADD CONSTRAINT "banners_complete_cta"
  CHECK (
    ("ctaLabel" IS NULL AND "ctaUrl" IS NULL)
    OR (
      "ctaLabel" IS NOT NULL
      AND "ctaUrl" IS NOT NULL
      AND length(trim("ctaLabel")) > 0
      AND length(trim("ctaUrl")) > 0
    )
  );

COMMIT;
