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
      .default("http://localhost:5500/api/local-products-semantic")
      .asString();
  }

  static get gptLocalProductsApiKey(): string | undefined {
    return get("GPT_LOCAL_PRODUCTS_API_KEY").asString();
  }

  static get gptLocalProductsTimeoutMs(): number {
    return get("GPT_LOCAL_PRODUCTS_TIMEOUT_MS").default("45000").asIntPositive();
  }

  static get localProductSemanticMinScore(): number {
    return get("LOCAL_PRODUCT_SEMANTIC_MIN_SCORE").default("0.72").asFloatPositive();
  }
}
