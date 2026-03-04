import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../src/infrastructure/database/prisma-client";

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Tuvansa123!";

const branches = [
  { code: "01", name: "Mexico", address: "CDMX" },
  { code: "02", name: "Monterrey", address: "Monterrey, NL" },
  { code: "03", name: "Veracruz", address: "Veracruz, VER" },
  { code: "04", name: "Mexicali", address: "Mexicali, BC" },
  { code: "05", name: "Queretaro", address: "Queretaro, QRO" },
  { code: "06", name: "Cancun", address: "Cancun, QROO" },
] as const;

const users = [
  {
    firstName: "System",
    lastName: "Admin",
    username: "admin",
    email: "admin@tuvansa.com",
    phone: "5550000000",
    role: "ADMIN",
    branchCode: "01",
  },
  {
    firstName: "Ricardo",
    lastName: "Flores",
    username: "manager",
    email: "manager@tuvansa.com",
    phone: "8110000000",
    role: "MANAGER",
    branchCode: "02",
  },
  {
    firstName: "Mariana",
    lastName: "Sanchez",
    username: "msanchez",
    email: "mariana.sanchez@tuvansa.com",
    phone: "5512345678",
    role: "SELLER",
    branchCode: "01",
  },
  {
    firstName: "Carlos",
    lastName: "Garcia",
    username: "cgarcia",
    email: "carlos.garcia@tuvansa.com",
    phone: "8112345678",
    role: "SELLER",
    branchCode: "02",
  },
  {
    firstName: "Fernanda",
    lastName: "Lopez",
    username: "flopez",
    email: "fernanda.lopez@tuvansa.com",
    phone: "2291234567",
    role: "SELLER",
    branchCode: "03",
  },
  {
    firstName: "Diana",
    lastName: "Ramirez",
    username: "dramirez",
    email: "diana.ramirez@tuvansa.com",
    phone: "6861234567",
    role: "SELLER",
    branchCode: "04",
  },
  {
    firstName: "Alan",
    lastName: "Torres",
    username: "atorres",
    email: "alan.torres@tuvansa.com",
    phone: "4421234567",
    role: "SELLER",
    branchCode: "05",
  },
] as const;

const run = async (): Promise<void> => {
  const passwordHash = await hash(DEFAULT_PASSWORD, 10);

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: {
        name: branch.name,
        address: branch.address,
        isActive: true,
      },
      create: {
        code: branch.code,
        name: branch.name,
        address: branch.address,
        isActive: true,
      },
    });
  }

  const branchRows = await prisma.branch.findMany({
    where: { code: { in: branches.map((branch) => branch.code) } },
    select: { id: true, code: true },
  });

  const branchIdByCode = new Map(branchRows.map((branch) => [branch.code, branch.id]));

  for (const user of users) {
    const branchId = branchIdByCode.get(user.branchCode);
    if (!branchId) {
      throw new Error(`Missing branch '${user.branchCode}' while seeding users.`);
    }

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        phone: user.phone,
        role: user.role,
        branchId,
        isActive: true,
        passwordHash,
      },
      create: {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branchId,
        isActive: true,
        passwordHash,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed completed.");
  // eslint-disable-next-line no-console
  console.log(`Default password: ${DEFAULT_PASSWORD}`);
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
