import {
  CreateUserDatasourceParams,
  FindUsersDatasourceParams,
  FindUsersDatasourceResult,
  UserDatasource,
} from "../../domain/datasources/user.datasource";
import { UserEntity } from "../../domain/entities/user.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { UserMapper } from "../mappers/user.mapper";

export class PrismaUserDatasource implements UserDatasource {
  async findPaginated(params: FindUsersDatasourceParams): Promise<FindUsersDatasourceResult> {
    const skip = (params.page - 1) * params.pageSize;

    const where: Prisma.UserWhereInput = {
      isActive: true,
    };

    if (params.branchId) {
      where.branchId = params.branchId;
    }

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { username: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          branch: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip,
        take: params.pageSize,
      }),
    ]);

    return {
      total,
      items: rows.map((row) => UserMapper.toEntity(row)),
    };
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
      },
      select: { id: true },
    });

    return !!user;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        username: username.trim().toLowerCase(),
      },
      select: { id: true },
    });

    return !!user;
  }

  async existsByErpUserCode(erpUserCode: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: {
        erpUserCode: erpUserCode.trim(),
      },
      select: { id: true },
    });

    return !!user;
  }

  async create(params: CreateUserDatasourceParams): Promise<UserEntity> {
    const row = await prisma.user.create({
      data: {
        firstName: params.firstName,
        lastName: params.lastName,
        username: params.username,
        email: params.email,
        passwordHash: params.passwordHash,
        role: params.role,
        phone: params.phone,
        erpUserCode: params.erpUserCode,
        branchId: params.branchId,
        isActive: true,
      },
      include: {
        branch: true,
      },
    });

    return UserMapper.toEntity(row);
  }
}
