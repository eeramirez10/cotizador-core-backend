import { CommercialReportDirectory, type ReportActor } from "../../domain/contracts/commercial-report";
import { prisma } from "../database/prisma-client";

export class PrismaCommercialReportDirectory extends CommercialReportDirectory {
  async options(actor: ReportActor) {
    const scope = actor.role === "ADMIN" ? {} : { branchId: actor.branchId };
    const [branches, users] = await Promise.all([
      prisma.branch.findMany({ where: actor.role === "ADMIN" ? {} : { id: actor.branchId },
        select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }),
      prisma.user.findMany({
        where: { ...scope, role: { in: ["ADMIN", "MANAGER", "SELLER"] }, ...(actor.role === "SELLER" ? { id: actor.id } : {}) },
        select: { id: true, firstName: true, lastName: true, branchId: true, isActive: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);
    return { branches, sellers: users.map(user => ({
      id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), branchId: user.branchId, isActive: user.isActive,
    })) };
  }
}
