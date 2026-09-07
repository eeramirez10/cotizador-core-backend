import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { get } from "env-var";

const isDevelopment = (process.env.NODE_ENV || "").toLowerCase() === "development";
const primaryEnvFile = isDevelopment ? ".env.development" : ".env";
const fallbackEnvFile = ".env";

const primaryPath = path.resolve(process.cwd(), primaryEnvFile);
const fallbackPath = path.resolve(process.cwd(), fallbackEnvFile);

if (existsSync(primaryPath)) {
  config({ path: primaryPath, override: true });
} else if (existsSync(fallbackPath)) {
  config({ path: fallbackPath, override: true });
}

export class Envs {
  static get port(): number {
    return get("PORT").default("4600").asPortNumber();
  }

  static get databaseUrl(): string {
    return get("DATABASE_URL").required().asString();
  }

  static get jwtSeed(): string {

    return get("JWT_SEED").required().asString()
  }

  static get jwtExpiresIn(): string {
    return get('JWT_EXPIRES_IN').default('8h').asString()
  }

  static get erpOutboxDir(): string {
    return get("ERP_OUTBOX_DIR").default("storage/erp-outbox").asString();
  }

  static get fileStorageRoot(): string {
    return get("FILE_STORAGE_ROOT").default("storage/attachments").asString();
  }

  static get fileUploadMaxMb(): number {
    return get("FILE_UPLOAD_MAX_MB").default("20").asIntPositive();
  }

  static get erpApiUrl(): string {
    return get("ERP_API_URL").default("http://localhost:3500").asString();
  }

  static get erpProductsBasePath(): string {
    return get("ERP_PRODUCTS_BASE_PATH").default("/api/erp/products").asString();
  }

  static get erpSuppliersBasePath(): string {
    return get("ERP_SUPPLIERS_BASE_PATH").default("/api/erp/suppliers").asString();
  }

  static get erpInternalApiKey(): string | undefined {
    return get("ERP_INTERNAL_API_KEY").asString();
  }

  static get erpApiTimeoutMs(): number {
    return get("ERP_API_TIMEOUT_MS").default("15000").asIntPositive();
  }

  static get gptLocalProductsUrl(): string {
    return get("GPT_LOCAL_PRODUCTS_URL")
      .default("http://localhost:4700/api/local-products-semantic")
      .asString();
  }

  static get gptLocalProductsApiKey(): string {
    return get("GPT_LOCAL_PRODUCTS_API_KEY")
      .default(Envs.aiPlatformInternalApiKey)
      .asString();
  }

  static get gptLocalProductsTimeoutMs(): number {
    return get("GPT_LOCAL_PRODUCTS_TIMEOUT_MS").default("45000").asIntPositive();
  }

  static get aiPlatformBaseUrl(): string {
    return get("AI_PLATFORM_BASE_URL").default("http://localhost:4700").asString();
  }

  static get aiPlatformInternalApiKey(): string {
    return get("AI_PLATFORM_INTERNAL_API_KEY").required().asString();
  }

  static get aiPlatformTimeoutMs(): number {
    return get("AI_PLATFORM_TIMEOUT_MS").default("75000").asIntPositive();
  }

  static get aiPlatformMaxUploadMb(): number {
    return get("AI_PLATFORM_MAX_UPLOAD_MB").default("15").asIntPositive();
  }

  static get localProductSemanticMinScore(): number {
    return get("LOCAL_PRODUCT_SEMANTIC_MIN_SCORE").default("0.72").asFloatPositive();
  }

  static get quoteInternalApprovalEnabled(): boolean {
    return get("QUOTE_INTERNAL_APPROVAL_ENABLED").default("false").asBool();
  }

  static get requisitionInternalApprovalEnabled(): boolean {
    return get("REQUISITION_INTERNAL_APPROVAL_ENABLED").default("false").asBool();
  }

  static get sellerExcelImportEnabled(): boolean {
    return get("SELLER_EXCEL_IMPORT_ENABLED").default("true").asBool();
  }

  static get publicApiUrl(): string {
    return get("PUBLIC_API_URL").default(`http://localhost:${Envs.port}`).asString();
  }

  static get quoteDocumentSigningSecret(): string {
    return get("QUOTE_DOCUMENT_SIGNING_SECRET").default(Envs.jwtSeed).asString();
  }

  static get quoteDocumentUrlTtlSeconds(): number {
    return get("QUOTE_DOCUMENT_URL_TTL_SECONDS").default("3600").asIntPositive();
  }

  static get twilioWhatsAppEnabled(): boolean {
    return get("TWILIO_WHATSAPP_ENABLED").default("false").asBool();
  }

  static get twilioWhatsAppUseTemplate(): boolean {
    return get("TWILIO_WHATSAPP_USE_TEMPLATE").default(isDevelopment ? "false" : "true").asBool();
  }

  static get twilioAccountSid(): string {
    return get("TWILIO_ACCOUNT_SID").default("").asString();
  }

  static get twilioAuthToken(): string {
    return get("TWILIO_AUTH_TOKEN").default("").asString();
  }

  static get twilioWhatsAppFrom(): string {
    return get("TWILIO_WHATSAPP_FROM").default("").asString();
  }

  static get twilioQuoteContentSid(): string {
    return get("TWILIO_WHATSAPP_QUOTE_CONTENT_SID").default("").asString();
  }

  static get twilioQuoteMediaVariable(): string {
    return get("TWILIO_WHATSAPP_QUOTE_MEDIA_VARIABLE").default("4").asString();
  }

  static get twilioStatusCallbackUrl(): string {
    const configured = get("TWILIO_STATUS_CALLBACK_URL").default("").asString().trim();
    return configured || `${Envs.publicApiUrl.replace(/\/$/, "")}/api/integrations/twilio/whatsapp/status`;
  }
}
