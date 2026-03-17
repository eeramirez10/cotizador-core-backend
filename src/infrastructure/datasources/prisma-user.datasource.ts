import {
  CreateUserDatasourceParams,
  FindUserByIdDatasourceParams,
  FindUsersDatasourceParams,
  FindUsersDatasourceResult,
  SoftDeactivateUserByIdDatasourceParams,
  UpdateUserByIdDatasourceParams,
  UserAccessScope,
  UserDatasource,
} from "../../domain/datasources/user.datasource";
import { UserEntity } from "../../domain/entities/user.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { UserMapper } from "../mappers/user.mapper";

const userInclude = {
  branch: true,
} satisfies Prisma.UserInclude;

export class PrismaUserDatasource implements UserDatasource {
  async findPaginated(params: FindUsersDatasourceParams): Promise<FindUsersDatasourceResult> {
    const skip = (params.page - 1) * params.pageSize;

    const where: Prisma.UserWhereInput = {};

    if (typeof params.isActive === "boolean") {
      where.isActive = params.isActive;
    }

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
        include: userInclude,
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }, { id: "asc" }],
        skip,
        take: params.pageSize,
      }),
    ]);

    return {
      total,
      items: rows.map((row) => UserMapper.toEntity(row)),
    };
  }

  async findById(params: FindUserByIdDatasourceParams): Promise<UserEntity | null> {
    const row = await prisma.user.findFirst({
      where: {
        id: params.id,
        ...this.buildScopeWhere(params.scope),
      },
      include: userInclude,
    });

    if (!row) return null;
    return UserMapper.toEntity(row);
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
      include: userInclude,
    });

    return UserMapper.toEntity(row);
  }

  async updateById(params: UpdateUserByIdDatasourceParams): Promise<UserEntity | null> {
    const updated = await prisma.user.updateMany({
      where: {
        id: params.id,
        isActive: true,
        ...this.buildScopeWhere(params.scope),
      },
      data: {
        firstName: params.data.firstName,
        lastName: params.data.lastName,
        username: params.data.username,
        email: params.data.email,
        role: params.data.role,
        phone: params.data.phone,
        erpUserCode: params.data.erpUserCode,
        branchId: params.data.branchId,
        ...(params.data.passwordHash ? { passwordHash: params.data.passwordHash } : {}),
      },
    });

    if (updated.count === 0) return null;
    return this.findById({
      id: params.id,
      scope: params.scope,
    });
  }

  async softDeactivateById(params: SoftDeactivateUserByIdDatasourceParams): Promise<boolean> {
    const updated = await prisma.user.updateMany({
      where: {
        id: params.id,
        isActive: true,
        ...this.buildScopeWhere(params.scope),
      },
      data: {
        isActive: false,
      },
    });

    return updated.count > 0;
  }

  private buildScopeWhere(scope: UserAccessScope): Prisma.UserWhereInput {
    if (scope.role === "ADMIN") {
      return {};
    }

    return {
      branchId: scope.branchId,
      role: {
        not: "ADMIN",
      },
    };
  }
}
