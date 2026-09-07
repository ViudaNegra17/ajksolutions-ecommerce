-- Fase 4.1: customer identity and WhatsApp handoff hardening.
-- Customer identity fields already store their canonical values. PostgreSQL
-- unique indexes created in Fase 4 allow multiple NULL values and serialize
-- concurrent attempts for the same non-null identity.
ALTER TABLE "customers"
  ADD CONSTRAINT "customers_document_number_canonical"
    CHECK ("documentNumber" IS NULL OR "documentNumber" ~ '^[A-Z0-9]+$'),
  ADD CONSTRAINT "customers_email_canonical"
    CHECK ("email" IS NULL OR ("email" = lower(btrim("email")) AND length("email") > 0)),
  ADD CONSTRAINT "customers_whatsapp_canonical"
    CHECK ("whatsapp" IS NULL OR "whatsapp" ~ '^\+[0-9]{8,15}$');

ALTER TABLE "tickets"
  ADD COLUMN "whatsappHandoffTokenHash" CHAR(64);

CREATE UNIQUE INDEX "tickets_whatsappHandoffTokenHash_key"
  ON "tickets"("whatsappHandoffTokenHash");

ALTER TABLE "tickets"
  ADD CONSTRAINT "tickets_whatsapp_handoff_hash_valid"
    CHECK (
      "whatsappHandoffTokenHash" IS NULL
      OR "whatsappHandoffTokenHash" ~ '^[0-9a-f]{64}$'
    );
