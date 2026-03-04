import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import { Envs } from "../../config/envs";

const adapter = new PrismaPg({ connectionString: Envs.databaseUrl });

export const prisma = new PrismaClient({ adapter });
