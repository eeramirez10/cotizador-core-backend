import assert from "node:assert/strict";
import test from "node:test";
import { assertStagingDatabase } from "../src/config/staging-safety";

const host = "ep-staging-123.us-east-1.aws.neon.tech";
const env = { STAGING_MODE: "true", STAGING_DATABASE_HOST: host,
  DATABASE_URL: `postgresql://user:password@${host}/neondb?sslmode=require` };
test("staging accepts only the pinned Neon host with TLS", () => {
  assert.doesNotThrow(() => assertStagingDatabase(env));
  assert.doesNotThrow(() => assertStagingDatabase({ ...env, DATABASE_URL: env.DATABASE_URL.replace(host, host.replace(".", "-pooler.")) }));
  for (const change of [
    { STAGING_MODE: "false" }, { STAGING_DATABASE_HOST: "" },
    { STAGING_DATABASE_HOST: "different.neon.tech" },
    { DATABASE_URL: env.DATABASE_URL.replace("sslmode=require", "sslmode=disable") },
    { DATABASE_URL: "postgresql://localhost/staging?sslmode=require", STAGING_DATABASE_HOST: "localhost" },
  ]) assert.throws(() => assertStagingDatabase({ ...env, ...change }));
});
test("production is refused even if accidentally pinned", () => {
  const production = "ep-cold-queen-aiakczbm.c-4.us-east-1.aws.neon.tech";
  assert.throws(() => assertStagingDatabase({ ...env, STAGING_DATABASE_HOST: production,
    DATABASE_URL: `postgresql://user:password@${production}/neondb?sslmode=require` }));
});
