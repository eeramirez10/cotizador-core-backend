import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync, readFileSync } from "node:fs";
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
  cpSync(resolve("scripts/staging.sh"), resolve(core, "scripts/staging.sh"));
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
  writeFileSync(resolve(root, "bin/docker"), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(resolve(root, "docker.log"))}, JSON.stringify(args) + '\\n');
if (args.includes('config')) {
  process.stdout.write(fs.readFileSync(${JSON.stringify(resolve(root, "compose.json"))}, 'utf8'));
} else if (args[0] === 'run') {
  const result = require('node:child_process').spawnSync(process.execPath,
    [${JSON.stringify(resolve(core, "scripts/staging.mjs"))}, 'doctor', '--config-stdin'], {stdio: 'inherit'});
  process.exit(result.status ?? 1);
} else if (!args.includes('build')) process.exit(90);
`, { mode: 0o700 });
  return {
    root, core, ai, files, config,
    run(command = "doctor", options: { wrapper?: boolean; input?: string; stdin?: boolean } = {}) {
      for (const [path, values] of Object.entries(files)) writeFileSync(path, Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n"));
      writeFileSync(resolve(root, "compose.json"), JSON.stringify(config));
      return spawnSync(options.wrapper ? "bash" : process.execPath,
        [resolve(core, options.wrapper ? "scripts/staging.sh" : "scripts/staging.mjs"), command, ...(options.stdin ? ["--config-stdin"] : [])], {
        input: options.input, encoding: "utf8", env: { ...process.env, PATH: `${resolve(root, "bin")}${delimiter}${dirname(process.execPath)}${delimiter}${process.env.PATH}` },
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

test("staging doctor accepts piped config without dependencies and redacts malformed JSON", () => {
  const f = fixture();
  try {
    assert.equal(f.run("doctor", { stdin: true, input: JSON.stringify(f.config) }).status, 0);
    const invalid = f.run("doctor", { stdin: true, input: '{"password":"private-credential"' });
    assert.notEqual(invalid.status, 0);
    assert.doesNotMatch(invalid.stdout + invalid.stderr, /private-credential/);
    assert.notEqual(f.run("deploy", { stdin: true, input: JSON.stringify(f.config) }).status, 0);
  } finally { f.close(); }
});

test("Docker-only launcher validates read-only without mounting the Docker socket", () => {
  const f = fixture();
  try {
    const result = f.run("doctor", { wrapper: true });
    assert.equal(result.status, 0, result.stderr);
    const calls: string[][] = readFileSync(resolve(f.root, "docker.log"), "utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.equal(calls.length, 2);
    const helper = calls.find(args => args[0] === "run")!;
    assert.ok(helper.includes("--read-only"));
    assert.ok(helper.includes("none"));
    assert.ok(helper.includes("--config-stdin"));
    assert.match(helper[helper.indexOf("--mount") + 1], /,readonly$/);
    assert.doesNotMatch(JSON.stringify(calls), /docker\.sock|postgresql:|password@/);
  } finally { f.close(); }
});

test("Docker-only launcher builds serially and aborts before building unsafe config", () => {
  const f = fixture();
  try {
    assert.equal(f.run("build", { wrapper: true }).status, 0);
    let calls: string[][] = readFileSync(resolve(f.root, "docker.log"), "utf8").trim().split("\n").map(line => JSON.parse(line));
    const build = calls.find(args => args.includes("build"))!;
    assert.equal(build[build.indexOf("--parallel") + 1], "1");
    writeFileSync(resolve(f.root, "docker.log"), "");
    f.config.services.core.ports[0].host_ip = "0.0.0.0";
    assert.notEqual(f.run("build", { wrapper: true }).status, 0);
    calls = readFileSync(resolve(f.root, "docker.log"), "utf8").trim().split("\n").map(line => JSON.parse(line));
    assert.ok(calls.every(args => !args.includes("build")));
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
