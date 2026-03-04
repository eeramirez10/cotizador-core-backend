import { AuthDatasource } from "../../domain/datasources/auth.datasource";
import { AuthUserEntity } from "../../domain/entities/auth-user.entity";
import { UserRole } from "../database/generated/enums";
import { prisma } from "../database/prisma-client";


export class PrismaAuthDatasource implements AuthDatasource {
  async findActiveByEmail(email: string): Promise<AuthUserEntity | null> {

    
    const row = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        isActive: true,
      },
      include: {
        branch: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      role: row.role as UserRole,
      isActive: row.isActive,
      branchId: row.branchId,
      branchName: row.branch.name,
      erpUserCode: row.erpUserCode ?? null,
      passwordHash: row.passwordHash,
    };
  }

  async findActiveById(id: string): Promise<AuthUserEntity | null> {
    const row = await prisma.user.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        branch: true,
      },
    });

    if (!row) return null;

    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      role: row.role as UserRole,
      isActive: row.isActive,
      branchId: row.branchId,
      branchName: row.branch.name,
      erpUserCode: row.erpUserCode ?? null,
      passwordHash: row.passwordHash,
    };
  }

}