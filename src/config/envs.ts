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
}
