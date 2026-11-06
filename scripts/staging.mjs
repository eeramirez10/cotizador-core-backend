import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.staging");
const command = process.argv[2] || "help";
const commands = ["doctor", "build", "deploy", "migrate", "seed", "sat-import", "up", "status", "logs", "down"];
if (command === "help" || !commands.includes(command)) {
  console.log(`Usage: node scripts/staging.mjs <${commands.join("|")}>`);
  console.log("Uses only compose.staging.yaml and project tuvansa-staging. down preserves all volumes.");
  process.exit(command === "help" ? 0 : 1);
}

const composeArgs = ["compose", "--project-name", "tuvansa-staging", "--env-file", envPath,
  "-f", resolve(root, "compose.staging.yaml")];
function compose(args, capture = false) {
  const result = spawnSync("docker", [...composeArgs, ...args], {
    cwd: root, stdio: capture ? "pipe" : "inherit", encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    // Compose may include credentials in config errors; never echo captured output.
    throw new Error(result.error ? "Docker could not start." : "Docker Compose failed. Check the configuration locally; secrets were not printed.");
  }
  return capture ? result.stdout : undefined;
}

function readEnv(path) {
  if (!existsSync(path)) throw new Error(`Missing environment file: ${path}`);
  return parse(readFileSync(path));
}
function required(env, key, minimum = 1) {
  const value = env[key] || "";
  if (value.length < minimum || /replace-with|STAGING_(?:USER|PASSWORD|NEON_HOST|PUBLIC_HOST)/i.test(value)) {
    throw new Error(`Configure ${key}; placeholders and empty values are not accepted.`);
  }
  return value;
}
function equal(left, leftKey, right, rightKey) {
  if (required(left, leftKey) !== required(right, rightKey)) throw new Error(`${leftKey} and ${rightKey} do not match.`);
}

function doctor() {
  const core = readEnv(envPath);
  const ai = readEnv(resolve(root, "../tuvansa-ai-platform/.env.staging"));
  const postgres = readEnv(resolve(root, "../tuvansa-ai-platform/.env.staging.postgres"));
  const erp = readEnv(resolve(root, core.STAGING_ERP_ENV_FILE || "../../tuvansa-backend-ca/.env.staging"));
  const db = new URL(required(core, "STAGING_DATABASE_URL"));
  const host = db.hostname.replace(/-pooler(?=\.)/, "");
  const pinned = required(core, "STAGING_DATABASE_HOST").replace(/-pooler(?=\.)/, "");
  const production = (core.PRODUCTION_DATABASE_HOST || "ep-cold-queen-aiakczbm.c-4.us-east-1.aws.neon.tech").replace(/-pooler(?=\.)/, "");
  if (!['postgres:', 'postgresql:'].includes(db.protocol) || !host.endsWith(".neon.tech") || host !== pinned
      || host === production || host.startsWith("ep-cold-queen-aiakczbm.")
      || !db.searchParams.get("sslmode") || db.searchParams.get("sslmode") === "disable") {
    throw new Error("Refusing unpinned, non-TLS or production Neon database.");
  }
  // Catch a new production hostname too, without printing its credentials.
  const productionFile = resolve(root, ".env");
  if (existsSync(productionFile)) {
    const url = parse(readFileSync(productionFile)).DATABASE_URL;
    if (url && new URL(url).hostname.replace(/-pooler(?=\.)/, "") === host) throw new Error("Staging cannot use this checkout's production database.");
  }
  const jwt = required(core, "JWT_SEED", 32);
  if (jwt === required(core, "QUOTE_DOCUMENT_SIGNING_SECRET", 32)) throw new Error("Use different JWT and document signing secrets.");
  required(core, "STAGING_SEED_PASSWORD", 16);
  const publicUrl = new URL(required(core, "PUBLIC_API_URL"));
  if (publicUrl.protocol !== "https:" || publicUrl.pathname.replace(/\/$/, "") !== "/cotizador-staging") {
    throw new Error("PUBLIC_API_URL must use HTTPS and /cotizador-staging.");
  }
  equal(core, "AI_PLATFORM_INTERNAL_API_KEY", ai, "INTERNAL_API_KEY");
  equal(core, "GPT_LOCAL_PRODUCTS_API_KEY", ai, "LOCAL_PRODUCTS_INTERNAL_API_KEY");
  equal(core, "WHATSAPP_ASSISTANT_INTERNAL_API_KEY", ai, "CORE_BACKEND_ASSISTANT_API_KEY");
  equal(core, "ERP_INTERNAL_API_KEY", erp, "INTERNAL_API_KEY");
  equal(core, "ERP_INTERNAL_API_KEY", ai, "ERP_PRODUCTS_API_KEY");
  for (const key of ["HOST_DB_MYSQL", "USER_MYSQL", "PASSWORD_MYSQL", "DATABASE_MYSQL"]) required(erp, key);
  if (![undefined, "false", "true"].includes(erp.STAGING_ERP_ALLOW_EXISTING_CREDENTIALS)) {
    throw new Error("STAGING_ERP_ALLOW_EXISTING_CREDENTIALS must be true or false.");
  }
  for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_OCR_MODEL", "PINECONE_API_KEY", "VOYAGEAI_API_KEY",
    "PINECONE_CATALOG_V2_INDEX", "PINECONE_CATALOG_VARIANTS_NAMESPACE"]) required(ai, key);
  const aiDb = new URL(required(ai, "DATABASE_URL"));
  if (aiDb.hostname !== "postgres" || aiDb.pathname !== "/tuvansa_ai" || aiDb.username !== "postgres"
      || (aiDb.port && aiDb.port !== "5432") || decodeURIComponent(aiDb.password) !== required(postgres, "POSTGRES_PASSWORD", 24)) {
    throw new Error("AI DATABASE_URL must match staging's Docker PostgreSQL database and password.");
  }
  if (ai.PINECONE_LOCAL_PRODUCTS_NAMESPACE !== "local-products-staging"
      || ai.PINECONE_CATALOG_VARIANTS_NAMESPACE === "local-products-staging") throw new Error("Invalid staging vector namespace separation.");
  if (core.TWILIO_WHATSAPP_ENABLED === "true") {
    for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "STAGING_TWILIO_WHATSAPP_FROM",
      "STAGING_TWILIO_WHATSAPP_QUOTE_CONTENT_SID", "STAGING_TWILIO_WHATSAPP_MANAGER_REPORT_CONTENT_SID",
      "STAGING_TWILIO_WHATSAPP_INTERNAL_ALERT_CONTENT_SID", "STAGING_TWILIO_ALLOWED_RECIPIENTS"]) required(core, key);
    const phones = core.STAGING_TWILIO_ALLOWED_RECIPIENTS.split(",").map((phone) => phone.trim());
    if (phones.some((phone) => !/^\+[1-9]\d{7,14}$/.test(phone))) throw new Error("Use complete E.164 phones in the staging allowlist.");
    if (!/^whatsapp:\+[1-9]\d{7,14}$/.test(core.STAGING_TWILIO_WHATSAPP_FROM)) throw new Error("Configure the development WhatsApp sender in E.164 format.");
  }
  const config = JSON.parse(compose(["--profile", "maintenance", "config", "--format", "json"], true));
  if (config.name !== "tuvansa-staging") throw new Error("Refusing a non-staging Compose project.");
  for (const service of Object.values(config.services)) {
    for (const port of service.ports || []) {
      if (port.host_ip !== "127.0.0.1" || !["4610", "4710"].includes(String(port.published))) throw new Error("Unexpected public staging port.");
    }
    if (service.environment?.DATABASE_URL && ![core.STAGING_DATABASE_URL, ai.DATABASE_URL].includes(service.environment.DATABASE_URL)) {
      throw new Error("Compose contains an unexpected database URL (check shell environment overrides).");
    }
  }
  if (Object.values(config.volumes).some((volume) => volume.external || !volume.name.startsWith("tuvansa-staging_"))) {
    throw new Error("Staging cannot mount external or production volumes.");
  }
  console.log(`Staging configuration OK. Neon host: ${db.hostname}. Project: tuvansa-staging.`);
  console.log("Secrets match; Docker storage is isolated.");
  console.log(erp.STAGING_ERP_ALLOW_EXISTING_CREDENTIALS === "true"
    ? "ERP uses operator-authorized existing credentials. The API remains query-only; database privileges are not certified."
    : "ERP credentials must also pass SELECT-only verification at startup.");
  return core;
}

function infrastructure() { compose(["up", "-d", "--wait", "postgres", "redis"]); }
function migrate() {
  infrastructure();
  for (const service of ["ai-migrate", "core-migrate"]) compose(["--profile", "maintenance", "run", "--rm", "--no-deps", service]);
}

try {
  if (["logs", "status", "down"].includes(command)) {
    compose(command === "logs" ? ["logs", "--tail", "100", "-f"] : command === "status" ? ["ps", "-a"] : ["down"]);
  } else {
    const env = doctor();
    if (["build", "deploy"].includes(command)) compose(["--profile", "maintenance", "build"]);
    if (["migrate", "deploy"].includes(command)) migrate();
    if (["up", "deploy"].includes(command)) compose(["up", "-d", "--wait", "--wait-timeout", "180"]);
    if (command === "seed") compose(["--profile", "maintenance", "run", "--rm", "--no-deps", "core-seed"]);
    if (command === "sat-import") {
      if (!existsSync(resolve(root, env.STAGING_SAT_CATALOG_FILE || "catalogs/sat.xlsx"))) throw new Error("Place the SAT workbook at STAGING_SAT_CATALOG_FILE first.");
      compose(["--profile", "maintenance", "run", "--rm", "ai-sat-import"]);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
