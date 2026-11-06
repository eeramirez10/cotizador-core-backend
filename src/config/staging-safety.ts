export function assertStagingDatabase(env: NodeJS.ProcessEnv): void {
  if (env.STAGING_MODE !== "true") throw new Error("STAGING_MODE must be true.");
  const url = new URL(env.DATABASE_URL || env.STAGING_DATABASE_URL || "");
  const host = url.hostname.replace(/-pooler(?=\.)/, "");
  const pinned = (env.STAGING_DATABASE_HOST || "").replace(/-pooler(?=\.)/, "");
  const production = (env.PRODUCTION_DATABASE_HOST || "ep-cold-queen-aiakczbm.c-4.us-east-1.aws.neon.tech").replace(/-pooler(?=\.)/, "");
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !host.endsWith(".neon.tech")
      || !pinned || host !== pinned || host === production
      || host.startsWith("ep-cold-queen-aiakczbm.") || !url.searchParams.get("sslmode")
      || url.searchParams.get("sslmode") === "disable") {
    throw new Error("Staging requires its explicitly pinned, non-production Neon database with TLS.");
  }
}
