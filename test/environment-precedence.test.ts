import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("production environment and Prisma migration target cannot be overridden by .env", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "core-env-precedence-"));

  try {
    writeFileSync(path.join(directory, ".env"), [
      "NODE_ENV=development",
      "DATABASE_URL=postgresql://file:file@localhost:5432/file",
      "ENV_PRECEDENCE_TEST=from_file",
      "ENV_FILE_ONLY_TEST=from_file",
    ].join("\n"));

    const envModule = new URL("../src/config/envs.ts", import.meta.url).href;
    const prismaConfigModule = new URL("../prisma.config.ts", import.meta.url).href;
    const script = `await import(${JSON.stringify(envModule)}); const prismaModule = await import(${JSON.stringify(prismaConfigModule)}); const prismaConfig = prismaModule.default.default ?? prismaModule.default; process.stdout.write("\\n" + JSON.stringify({ nodeEnv: process.env.NODE_ENV, databaseUrl: prismaConfig.datasource.url, existing: process.env.ENV_PRECEDENCE_TEST, fallback: process.env.ENV_FILE_ONLY_TEST }));`;
    const result = spawnSync(
      process.execPath,
      ["--import", createRequire(import.meta.url).resolve("tsx"), "--input-type=module", "-e", script],
      {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://compose:compose@localhost:5432/compose",
          ENV_PRECEDENCE_TEST: "from_compose",
          ENV_FILE_ONLY_TEST: undefined,
        },
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim().split("\n").at(-1) || ""), {
      nodeEnv: "production",
      databaseUrl: "postgresql://compose:compose@localhost:5432/compose",
      existing: "from_compose",
      fallback: "from_file",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
