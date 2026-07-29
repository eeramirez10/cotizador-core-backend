CREATE TYPE "FileAssetStatus" AS ENUM ('READY', 'DELETED');
CREATE TYPE "QuoteAttachmentCategory" AS ENUM ('SOURCE_DOCUMENT', 'SELLER_SUPPLIER_QUOTE');

ALTER TABLE "quote_items" ADD COLUMN "client_item_id" VARCHAR(80);

CREATE TABLE "file_assets" (
    "id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum_sha256" CHAR(64) NOT NULL,
    "status" "FileAssetStatus" NOT NULL DEFAULT 'READY',
    "uploaded_by_user_id" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quote_attachments" (
    "id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "quote_id" UUID,
    "client_draft_id" VARCHAR(80) NOT NULL,
    "client_item_id" VARCHAR(80),
    "category" "QuoteAttachmentCategory" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_offer_attachments" (
    "id" UUID NOT NULL,
    "file_asset_id" UUID NOT NULL,
    "purchase_supplier_offer_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_offer_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quote_items_quote_id_client_item_id_key" ON "quote_items"("quote_id", "client_item_id");
CREATE UNIQUE INDEX "file_assets_storage_key_key" ON "file_assets"("storage_key");
CREATE INDEX "file_assets_uploaded_by_user_id_created_at_idx" ON "file_assets"("uploaded_by_user_id", "created_at");
CREATE INDEX "file_assets_checksum_sha256_idx" ON "file_assets"("checksum_sha256");
CREATE UNIQUE INDEX "quote_attachments_file_asset_id_client_draft_id_client_item_id_category_key" ON "quote_attachments"("file_asset_id", "client_draft_id", "client_item_id", "category");
CREATE INDEX "quote_attachments_client_draft_id_category_idx" ON "quote_attachments"("client_draft_id", "category");
CREATE INDEX "quote_attachments_quote_id_category_idx" ON "quote_attachments"("quote_id", "category");
CREATE INDEX "quote_attachments_client_item_id_idx" ON "quote_attachments"("client_item_id");
CREATE UNIQUE INDEX "purchase_offer_attachments_file_asset_id_purchase_supplier_offer_id_key" ON "purchase_offer_attachments"("file_asset_id", "purchase_supplier_offer_id");
CREATE INDEX "purchase_offer_attachments_purchase_supplier_offer_id_idx" ON "purchase_offer_attachments"("purchase_supplier_offer_id");

ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quote_attachments" ADD CONSTRAINT "quote_attachments_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quote_attachments" ADD CONSTRAINT "quote_attachments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_offer_attachments" ADD CONSTRAINT "purchase_offer_attachments_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_offer_attachments" ADD CONSTRAINT "purchase_offer_attachments_purchase_supplier_offer_id_fkey" FOREIGN KEY ("purchase_supplier_offer_id") REFERENCES "purchase_supplier_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
