import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../src/infrastructure/database/prisma-client";

const ADMIN_PASSWORD = "Ag7348Pop**";

const run = async (): Promise<void> => {
  const passwordHash = await hash(ADMIN_PASSWORD, 10);
  const branch = await prisma.branch.upsert({
    where: { code: "01" },
    update: { name: "Mexico", address: "CDMX", isActive: true },
    create: { code: "01", name: "Mexico", address: "CDMX", isActive: true },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      firstName: "System",
      lastName: "Admin",
      email: "admin@tuvansa.com",
      phone: "5550000000",
      role: "ADMIN",
      branchId: branch.id,
      isActive: true,
      passwordHash,
    },
    create: {
      firstName: "System",
      lastName: "Admin",
      username: "admin",
      email: "admin@tuvansa.com",
      phone: "5550000000",
      role: "ADMIN",
      branchId: branch.id,
      isActive: true,
      passwordHash,
    },
  });

  // eslint-disable-next-line no-console
  console.log("Seed completed.");
  // eslint-disable-next-line no-console
  console.log("Seeded administrator: admin");
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
