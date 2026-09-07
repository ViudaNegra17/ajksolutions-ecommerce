-- CreateEnum
CREATE TYPE "ServicePriceMode" AS ENUM ('FIXED', 'FROM', 'QUOTE');

-- CreateEnum
CREATE TYPE "ServiceFormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'DATE', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_REVIEW', 'WAITING_CUSTOMER', 'QUOTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('WEB', 'ADMIN', 'WHATSAPP', 'PHONE', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketMessageType" AS ENUM ('CUSTOMER', 'STAFF', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TicketHistoryAction" AS ENUM ('TICKET_CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNED', 'UNASSIGNED');

-- CreateTable
CREATE TABLE "service_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "imageUrl" VARCHAR(2048),
    "icon" VARCHAR(100),
    "parentId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "serviceCode" VARCHAR(20) NOT NULL,
    "name" VARCHAR(220) NOT NULL,
    "slug" VARCHAR(250) NOT NULL,
    "shortDescription" VARCHAR(500),
    "description" TEXT,
    "categoryId" UUID NOT NULL,
    "priceMode" "ServicePriceMode" NOT NULL DEFAULT 'QUOTE',
    "price" DECIMAL(12,2),
    "priceIncludesTax" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DECIMAL(5,2),
    "estimatedDuration" VARCHAR(150),
    "warranty" VARCHAR(255),
    "remoteAvailable" BOOLEAN NOT NULL DEFAULT false,
    "onsiteAvailable" BOOLEAN NOT NULL DEFAULT true,
    "homeServiceAvailable" BOOLEAN NOT NULL DEFAULT false,
    "requiresDevice" BOOLEAN NOT NULL DEFAULT false,
    "allowAttachments" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" VARCHAR(2048),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "metaTitle" VARCHAR(255),
    "metaDescription" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_form_fields" (
    "id" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "label" VARCHAR(180) NOT NULL,
    "description" VARCHAR(500),
    "placeholder" VARCHAR(255),
    "type" "ServiceFormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "validationConfig" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "service_form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_form_field_options" (
    "id" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "value" VARCHAR(150) NOT NULL,
    "label" VARCHAR(180) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_form_field_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "customerCode" VARCHAR(20) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "documentType" VARCHAR(30),
    "documentNumber" VARCHAR(50),
    "email" VARCHAR(320),
    "phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "ticketCode" VARCHAR(20) NOT NULL,
    "requestId" VARCHAR(100),
    "customerId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedUserId" UUID,
    "source" "TicketSource" NOT NULL DEFAULT 'WEB',
    "whatsappOpenedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_field_values" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "fieldId" UUID,
    "fieldKey" VARCHAR(100) NOT NULL,
    "fieldLabel" VARCHAR(180) NOT NULL,
    "fieldType" "ServiceFormFieldType" NOT NULL,
    "textValue" TEXT,
    "numberValue" DECIMAL(18,4),
    "booleanValue" BOOLEAN,
    "dateValue" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_field_value_options" (
    "id" UUID NOT NULL,
    "ticketFieldValueId" UUID NOT NULL,
    "optionId" UUID,
    "optionValue" VARCHAR(150) NOT NULL,
    "optionLabel" VARCHAR(180) NOT NULL,

    CONSTRAINT "ticket_field_value_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorUserId" UUID,
    "customerId" UUID,
    "type" "TicketMessageType" NOT NULL,
    "message" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "messageId" UUID,
    "fileName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(150) NOT NULL,
    "size" INTEGER NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "uploadedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_history" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "userId" UUID,
    "action" "TicketHistoryAction" NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus",
    "fromPriority" "TicketPriority",
    "toPriority" "TicketPriority",
    "fromAssignedUserId" UUID,
    "toAssignedUserId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_slug_key" ON "service_categories"("slug");

-- CreateIndex
CREATE INDEX "service_categories_parentId_idx" ON "service_categories"("parentId");

-- CreateIndex
CREATE INDEX "service_categories_active_sortOrder_idx" ON "service_categories"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "service_categories_deletedAt_idx" ON "service_categories"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "services_serviceCode_key" ON "services"("serviceCode");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_categoryId_active_idx" ON "services"("categoryId", "active");

-- CreateIndex
CREATE INDEX "services_featured_active_idx" ON "services"("featured", "active");

-- CreateIndex
CREATE INDEX "services_priceMode_idx" ON "services"("priceMode");

-- CreateIndex
CREATE INDEX "services_deletedAt_idx" ON "services"("deletedAt");

-- CreateIndex
CREATE INDEX "service_form_fields_serviceId_active_sortOrder_idx" ON "service_form_fields"("serviceId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "service_form_fields_serviceId_key_key" ON "service_form_fields"("serviceId", "key");

-- CreateIndex
CREATE INDEX "service_form_field_options_fieldId_active_sortOrder_idx" ON "service_form_field_options"("fieldId", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "service_form_field_options_fieldId_value_key" ON "service_form_field_options"("fieldId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_documentNumber_key" ON "customers"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_whatsapp_key" ON "customers"("whatsapp");

-- CreateIndex
CREATE INDEX "customers_firstName_lastName_idx" ON "customers"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "customers_active_deletedAt_idx" ON "customers"("active", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketCode_key" ON "tickets"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_requestId_key" ON "tickets"("requestId");

-- CreateIndex
CREATE INDEX "tickets_status_createdAt_idx" ON "tickets"("status", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_priority_createdAt_idx" ON "tickets"("priority", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_serviceId_createdAt_idx" ON "tickets"("serviceId", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_customerId_createdAt_idx" ON "tickets"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_assignedUserId_status_idx" ON "tickets"("assignedUserId", "status");

-- CreateIndex
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

-- CreateIndex
CREATE INDEX "ticket_field_values_fieldId_idx" ON "ticket_field_values"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_field_values_ticketId_fieldKey_key" ON "ticket_field_values"("ticketId", "fieldKey");

-- CreateIndex
CREATE INDEX "ticket_field_value_options_optionId_idx" ON "ticket_field_value_options"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_field_value_options_ticketFieldValueId_optionValue_key" ON "ticket_field_value_options"("ticketFieldValueId", "optionValue");

-- CreateIndex
CREATE INDEX "ticket_messages_ticketId_createdAt_idx" ON "ticket_messages"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ticket_attachments_ticketId_createdAt_idx" ON "ticket_attachments"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ticket_attachments_messageId_idx" ON "ticket_attachments"("messageId");

-- CreateIndex
CREATE INDEX "ticket_history_ticketId_createdAt_idx" ON "ticket_history"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ticket_history_userId_idx" ON "ticket_history"("userId");

-- RenameForeignKey
ALTER TABLE "product_attribute_value_options" RENAME CONSTRAINT "product_attribute_value_options_attribute_option_fkey" TO "product_attribute_value_options_attributeId_optionId_fkey";

-- RenameForeignKey
ALTER TABLE "product_attribute_value_options" RENAME CONSTRAINT "product_attribute_value_options_value_attribute_fkey" TO "product_attribute_value_options_productAttributeValueId_at_fkey";

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_form_fields" ADD CONSTRAINT "service_form_fields_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_form_field_options" ADD CONSTRAINT "service_form_field_options_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "service_form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_field_values" ADD CONSTRAINT "ticket_field_values_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_field_values" ADD CONSTRAINT "ticket_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "service_form_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_field_value_options" ADD CONSTRAINT "ticket_field_value_options_ticketFieldValueId_fkey" FOREIGN KEY ("ticketFieldValueId") REFERENCES "ticket_field_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_field_value_options" ADD CONSTRAINT "ticket_field_value_options_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "service_form_field_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_history" ADD CONSTRAINT "ticket_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Phase 4 domain integrity beyond what Prisma can express.
ALTER TABLE "service_categories"
  ADD CONSTRAINT "service_categories_not_self_parent"
  CHECK ("parentId" IS NULL OR "parentId" <> "id");

ALTER TABLE "services"
  ADD CONSTRAINT "services_price_mode_valid"
  CHECK (
    ("priceMode" IN ('FIXED', 'FROM') AND "price" IS NOT NULL AND "price" > 0)
    OR ("priceMode" = 'QUOTE' AND "price" IS NULL)
  ),
  ADD CONSTRAINT "services_tax_rate_valid"
  CHECK ("taxRate" IS NULL OR ("taxRate" >= 0 AND "taxRate" <= 100));

ALTER TABLE "service_form_fields"
  ADD CONSTRAINT "service_form_fields_key_valid"
  CHECK ("key" ~ '^[a-z][a-z0-9_]{1,99}$');

ALTER TABLE "ticket_field_values"
  ADD CONSTRAINT "ticket_field_values_shape_valid"
  CHECK (
    ("fieldType" IN ('TEXT', 'TEXTAREA', 'EMAIL', 'PHONE') AND "textValue" IS NOT NULL
      AND "numberValue" IS NULL AND "booleanValue" IS NULL AND "dateValue" IS NULL)
    OR ("fieldType" = 'NUMBER' AND "numberValue" IS NOT NULL
      AND "textValue" IS NULL AND "booleanValue" IS NULL AND "dateValue" IS NULL)
    OR ("fieldType" = 'BOOLEAN' AND "booleanValue" IS NOT NULL
      AND "textValue" IS NULL AND "numberValue" IS NULL AND "dateValue" IS NULL)
    OR ("fieldType" = 'DATE' AND "dateValue" IS NOT NULL
      AND "textValue" IS NULL AND "numberValue" IS NULL AND "booleanValue" IS NULL)
    OR ("fieldType" IN ('SELECT', 'MULTISELECT')
      AND "textValue" IS NULL AND "numberValue" IS NULL AND "booleanValue" IS NULL AND "dateValue" IS NULL)
  );

ALTER TABLE "ticket_messages"
  ADD CONSTRAINT "ticket_messages_author_valid"
  CHECK (
    ("type" = 'STAFF' AND "authorUserId" IS NOT NULL AND "customerId" IS NULL)
    OR ("type" = 'CUSTOMER' AND "customerId" IS NOT NULL AND "authorUserId" IS NULL)
    OR ("type" = 'SYSTEM' AND "customerId" IS NULL)
  ),
  ADD CONSTRAINT "ticket_messages_not_blank"
  CHECK (length(btrim("message")) > 0);

ALTER TABLE "ticket_attachments"
  ADD CONSTRAINT "ticket_attachments_size_valid"
  CHECK ("size" >= 0);
