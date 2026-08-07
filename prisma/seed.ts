import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "../src/infrastructure/database/prisma-client";


const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD as string || null;

if(!ADMIN_PASSWORD) throw new Error('SEED_ADMIN_PASSWORD is required')



const run = async (): Promise<void> => {
  const passwordHash = await hash(ADMIN_PASSWORD, 10);
  const branch = await prisma.branch.upsert({
    where: { code: "01" },
    update: {
      name: "Mexico",
      address: "CDMX",
      street: "Av. Insurgentes Sur",
      exteriorNumber: "1602",
      neighborhood: "Crédito Constructor",
      city: "Ciudad de México",
      municipality: "Benito Juárez",
      state: "Ciudad de México",
      postalCode: "03940",
      country: "México",
      email: "ventas@tuvansa.com.mx",
      phone: "5550000000",
      secondaryPhone: "5550000001",
      isActive: true,
    },
    create: {
      code: "01",
      name: "Mexico",
      address: "CDMX",
      street: "Av. Insurgentes Sur",
      exteriorNumber: "1602",
      neighborhood: "Crédito Constructor",
      city: "Ciudad de México",
      municipality: "Benito Juárez",
      state: "Ciudad de México",
      postalCode: "03940",
      country: "México",
      email: "ventas@tuvansa.com.mx",
      phone: "5550000000",
      secondaryPhone: "5550000001",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      firstName: "System",
      lastName: "Admin",
      email: "admin@tuvansa.com.mx",
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
      email: "admin@tuvansa.com.mx",
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
