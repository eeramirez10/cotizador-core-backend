import { hash } from "bcryptjs";
import { assertStagingDatabase } from "../src/config/staging-safety";
import { prisma } from "../src/infrastructure/database/prisma-client";

async function run(): Promise<void> {
  assertStagingDatabase(process.env);
  const password = process.env.STAGING_SEED_PASSWORD;
  if (!password || password.length < 16) throw new Error("STAGING_SEED_PASSWORD must contain at least 16 characters.");
  const passwordHash = await hash(password, 12);
  const branches = [
    ["01", "Mexico"], ["02", "Monterrey"], ["03", "Veracruz"], ["04", "Mexicali"],
    ["05", "Queretaro"], ["06", "Cancun"], ["07", "Los Cabos"],
  ];
  for (const [code, name] of branches) {
    const branch = await prisma.branch.upsert({ where: { code }, update: {}, create: { code, name, country: "Mexico" } });
    // Warehouse IDs are deliberately not inferred from the branch number.
    for (const role of ["SELLER", "PURCHASING", "CREDIT_COLLECTIONS", ...(code === "01" ? ["ADMIN"] : [])] as const) {
      const username = `${role.toLowerCase()}-${code}`;
      await prisma.user.upsert({
        where: { username }, update: {},
        create: { username, firstName: role, lastName: name,
          email: `${username}@staging.example`, role: role as "SELLER" | "PURCHASING" | "CREDIT_COLLECTIONS" | "ADMIN",
          branchId: branch.id, passwordHash, whatsappInboxEnabled: true },
      });
    }
  }
  console.log("Staging branches/users initialized; existing passwords and operational data were not changed.");
  console.log("Administrator: admin-01. Assign actual ERP warehouses through Administration before ERP searches.");
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
