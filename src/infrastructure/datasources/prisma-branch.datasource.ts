import { BranchDatasource } from "../../domain/datasources/branch.datasource";
import { BranchEntity } from "../../domain/entities/branch.entity";
import { prisma } from "../database/prisma-client";
import { BranchMapper } from "../mappers/branch.mapper";

export class PrismaBranchDatasource implements BranchDatasource {
  async findAllActive(): Promise<BranchEntity[]> {
    const rows = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });

    return rows.map((row) => BranchMapper.toEntity(row));
  }

  async findActiveByCode(code: string): Promise<BranchEntity | null> {
    const row = await prisma.branch.findFirst({
      where: {
        code: code.trim().toUpperCase(),
        isActive: true,
      },
    });

    if (!row) return null;
    return BranchMapper.toEntity(row);
  }
}
