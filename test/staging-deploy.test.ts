import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "staging-deploy-"));
  const core = resolve(root, "tuvansa/core");
  const ai = resolve(root, "tuvansa/tuvansa-ai-platform");
  const erp = resolve(root, "tuvansa-backend-ca");
  for (const path of [resolve(core, "scripts"), ai, erp, resolve(root, "bin")]) mkdirSync(path, { recursive: true });
  cpSync(resolve("scripts/staging.mjs"), resolve(core, "scripts/staging.mjs"));
  symlinkSync(resolve("node_modules"), resolve(core, "node_modules"), "dir");
  const host = "ep-staging-123.us-east-1.aws.neon.tech";
  const db = `postgresql://user:password@${host}/neondb?sslmode=require`;
  const aiDb = "postgresql://postgres:012345678901234567890123@postgres:5432/tuvansa_ai";
  const files: Record<string, Record<string, string>> = {
    [resolve(core, ".env.staging")]: {
      STAGING_DATABASE_URL: db, STAGING_DATABASE_HOST: host, JWT_SEED: "j".repeat(32),
      QUOTE_DOCUMENT_SIGNING_SECRET: "s".repeat(32), STAGING_SEED_PASSWORD: "p".repeat(20),
      PUBLIC_API_URL: "https://gateway.example/cotizador-staging", AI_PLATFORM_INTERNAL_API_KEY: "ai-key",
      GPT_LOCAL_PRODUCTS_API_KEY: "local-key", WHATSAPP_ASSISTANT_INTERNAL_API_KEY: "assistant-key", ERP_INTERNAL_API_KEY: "erp-key",
    },
    [resolve(ai, ".env.staging")]: { DATABASE_URL: aiDb, INTERNAL_API_KEY: "ai-key", LOCAL_PRODUCTS_INTERNAL_API_KEY: "local-key",
      CORE_BACKEND_ASSISTANT_API_KEY: "assistant-key", ERP_PRODUCTS_API_KEY: "erp-key", OPENAI_API_KEY: "openai-key",
      OPENAI_MODEL: "existing-model", OPENAI_OCR_MODEL: "existing-model", PINECONE_API_KEY: "pinecone-key", VOYAGEAI_API_KEY: "voyage-key",
      PINECONE_CATALOG_V2_INDEX: "existing-catalog", PINECONE_CATALOG_VARIANTS_NAMESPACE: "catalog", PINECONE_LOCAL_PRODUCTS_NAMESPACE: "local-products-staging" },
    [resolve(ai, ".env.staging.postgres")]: { POSTGRES_PASSWORD: "012345678901234567890123" },
    [resolve(erp, ".env.staging")]: { HOST_DB_MYSQL: "erp.example", USER_MYSQL: "reader", PASSWORD_MYSQL: "password", DATABASE_MYSQL: "proscai", INTERNAL_API_KEY: "erp-key" },
  };
  const config = { name: "tuvansa-staging", services: {
    core: { environment: { DATABASE_URL: db }, ports: [{ host_ip: "127.0.0.1", published: "4610" }] },
    ai: { environment: { DATABASE_URL: aiDb }, ports: [{ host_ip: "127.0.0.1", published: "4710" }] },
  }, volumes: { postgres_data: { name: "tuvansa-staging_postgres_data" } } };
  writeFileSync(resolve(root, "bin/docker"), `#!${process.execPath}\nif(!process.argv.includes('config'))process.exit(90);process.stdout.write(require('node:fs').readFileSync(${JSON.stringify(resolve(root, "compose.json"))},'utf8'));\n`, { mode: 0o700 });
  return {
    root, core, ai, files, config,
    run() {
      for (const [path, values] of Object.entries(files)) writeFileSync(path, Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n"));
      writeFileSync(resolve(root, "compose.json"), JSON.stringify(config));
      return spawnSync(process.execPath, [resolve(core, "scripts/staging.mjs"), "doctor"], {
        encoding: "utf8", env: { ...process.env, PATH: `${resolve(root, "bin")}${delimiter}${dirname(process.execPath)}${delimiter}${process.env.PATH}` },
      });
    },
    close() { rmSync(root, { recursive: true, force: true }); },
  };
}

test("staging doctor validates without exposing secrets or running deployment commands", () => {
  const f = fixture();
  try {
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /configuration OK/);
    assert.doesNotMatch(result.stdout + result.stderr, /postgresql:|012345678901234567890123|password@/);
  } finally { f.close(); }
});

test("staging doctor refuses secret mismatches and unsafe Docker resources", () => {
  for (const change of [
    (f: ReturnType<typeof fixture>) => { f.files[resolve(f.ai, ".env.staging")].INTERNAL_API_KEY = "wrong"; },
    (f: ReturnType<typeof fixture>) => { f.config.services.core.ports[0].host_ip = "0.0.0.0"; },
    (f: ReturnType<typeof fixture>) => { f.config.volumes.postgres_data.name = "production_postgres_data"; },
    (f: ReturnType<typeof fixture>) => { f.config.services.core.environment.DATABASE_URL = "postgresql://production/db"; },
    (f: ReturnType<typeof fixture>) => {
      const values = f.files[resolve(f.core, ".env.staging")];
      values.STAGING_DATABASE_HOST = "ep-cold-queen-aiakczbm.c-4.us-east-1.aws.neon.tech";
      values.STAGING_DATABASE_URL = `postgresql://user:secret@${values.STAGING_DATABASE_HOST}/neondb?sslmode=require`;
    },
  ]) {
    const f = fixture();
    try { change(f); assert.notEqual(f.run().status, 0); }
    finally { f.close(); }
  }
});

test("staging doctor reports explicitly authorized existing ERP credentials", () => {
  const f = fixture();
  try {
    const erp = f.files[resolve(f.root, "tuvansa-backend-ca/.env.staging")];
    erp.STAGING_ERP_ALLOW_EXISTING_CREDENTIALS = "true";
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /operator-authorized existing credentials/);
    assert.match(result.stdout, /database privileges are not certified/);
    erp.STAGING_ERP_ALLOW_EXISTING_CREDENTIALS = "yes";
    assert.notEqual(f.run().status, 0);
  } finally { f.close(); }
});
