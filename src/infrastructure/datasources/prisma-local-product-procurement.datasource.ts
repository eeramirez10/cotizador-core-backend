import {
  FindProcurementProductsParams,
  FindProcurementProductsResult,
  LocalProductProcurementDatasource,
  ProcurementAccessScope,
  SaveProcurementOfferParams,
} from "../../domain/datasources/local-product-procurement.datasource";
import {
  LocalProductProcurementEntity,
  LocalProductProcurementOfferEntity,
} from "../../domain/entities/local-product-procurement.entity";
import type { ProductProcurementStatus } from "../database/generated/enums";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

const userSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
} satisfies Prisma.UserSelect;

const procurementProductInclude = {
  branch: {
    select: { id: true, code: true, name: true },
  },
  createdByUser: {
    select: userSummarySelect,
  },
  procurementUpdatedByUser: {
    select: userSummarySelect,
  },
  procurementOffers: {
    where: { isActive: true },
    include: {
      createdByUser: { select: userSummarySelect },
      updatedByUser: { select: userSummarySelect },
    },
    orderBy: [{ isSelected: "desc" as const }, { createdAt: "desc" as const }],
  },
} satisfies Prisma.ProductInclude;

type ProcurementProductRow = Prisma.ProductGetPayload<{ include: typeof procurementProductInclude }>;
type ProcurementOfferRow = ProcurementProductRow["procurementOffers"][number];

export class PrismaLocalProductProcurementDatasource extends LocalProductProcurementDatasource {
  async findPaginated(params: FindProcurementProductsParams): Promise<FindProcurementProductsResult> {
    const where = this.productWhere(params.scope, {
      ...(params.status ? { procurementStatus: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { description: { contains: params.search, mode: "insensitive" as const } },
              { code: { contains: params.search, mode: "insensitive" as const } },
              { ean: { contains: params.search, mode: "insensitive" as const } },
              {
                procurementOffers: {
                  some: {
                    isActive: true,
                    supplierName: { contains: params.search, mode: "insensitive" as const },
                  },
                },
              },
            ],
          }
        : {}),
    });
    const [total, rows] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: procurementProductInclude,
        orderBy: [{ procurementUpdatedAt: "desc" }, { createdAt: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return { total, items: rows.map((row) => this.mapProduct(row)) };
  }

  async findById(
    productId: string,
    scope: ProcurementAccessScope,
  ): Promise<LocalProductProcurementEntity | null> {
    const row = await prisma.product.findFirst({
      where: this.productWhere(scope, { id: productId }),
      include: procurementProductInclude,
    });
    return row ? this.mapProduct(row) : null;
  }

  async createOffer(params: SaveProcurementOfferParams): Promise<LocalProductProcurementOfferEntity | null> {
    const product = await prisma.product.findFirst({
      where: this.productWhere(params.scope, { id: params.productId }),
      select: { id: true, procurementStatus: true },
    });
    if (!product) return null;

    const offer = await prisma.$transaction(async (tx) => {
      const created = await tx.localProductProcurementOffer.create({
        data: {
          productId: product.id,
          supplierName: params.supplierName,
          contactName: params.contactName,
          email: params.email,
          phone: params.phone,
          unitCost: params.unitCost,
          currency: params.currency,
          minimumQty: params.minimumQty,
          deliveryTime: params.deliveryTime,
          validUntil: params.validUntil,
          notes: params.notes,
          createdByUserId: params.actorUserId,
          updatedByUserId: params.actorUserId,
        },
        include: {
          createdByUser: { select: userSummarySelect },
          updatedByUser: { select: userSummarySelect },
        },
      });
      await tx.product.update({
        where: { id: product.id },
        data: {
          procurementStatus: product.procurementStatus === "PENDING_REVIEW"
            || product.procurementStatus === "REJECTED"
            ? "QUOTING"
            : undefined,
          procurementUpdatedAt: new Date(),
          procurementUpdatedByUserId: params.actorUserId,
        },
      });
      return created;
    });

    return this.mapOffer(offer);
  }

  async updateOffer(
    params: SaveProcurementOfferParams & { offerId: string },
  ): Promise<LocalProductProcurementOfferEntity | null> {
    const existing = await prisma.localProductProcurementOffer.findFirst({
      where: {
        id: params.offerId,
        productId: params.productId,
        isActive: true,
        product: this.productWhere(params.scope),
      },
      select: { id: true, productId: true, isSelected: true },
    });
    if (!existing) return null;

    const updated = await prisma.$transaction(async (tx) => {
      const offer = await tx.localProductProcurementOffer.update({
        where: { id: existing.id },
        data: {
          supplierName: params.supplierName,
          contactName: params.contactName,
          email: params.email,
          phone: params.phone,
          unitCost: params.unitCost,
          currency: params.currency,
          minimumQty: params.minimumQty,
          deliveryTime: params.deliveryTime,
          validUntil: params.validUntil,
          notes: params.notes,
          updatedByUserId: params.actorUserId,
        },
        include: {
          createdByUser: { select: userSummarySelect },
          updatedByUser: { select: userSummarySelect },
        },
      });
      await tx.product.update({
        where: { id: existing.productId },
        data: {
          ...(existing.isSelected
            ? {
                averageCost: params.unitCost,
                lastCost: params.unitCost,
                currency: params.currency,
              }
            : {}),
          procurementUpdatedAt: new Date(),
          procurementUpdatedByUserId: params.actorUserId,
        },
      });
      return offer;
    });

    return this.mapOffer(updated);
  }

  async deactivateOffer(
    offerId: string,
    actorUserId: string,
    scope: ProcurementAccessScope,
  ): Promise<boolean> {
    const existing = await prisma.localProductProcurementOffer.findFirst({
      where: {
        id: offerId,
        isActive: true,
        isSelected: false,
        product: this.productWhere(scope),
      },
      select: { id: true, productId: true },
    });
    if (!existing) return false;

    await prisma.$transaction([
      prisma.localProductProcurementOffer.update({
        where: { id: existing.id },
        data: { isActive: false, updatedByUserId: actorUserId },
      }),
      prisma.product.update({
        where: { id: existing.productId },
        data: {
          procurementUpdatedAt: new Date(),
          procurementUpdatedByUserId: actorUserId,
        },
      }),
    ]);
    return true;
  }

  async selectOffer(
    productId: string,
    offerId: string,
    actorUserId: string,
    scope: ProcurementAccessScope,
  ): Promise<LocalProductProcurementEntity | null> {
    const offer = await prisma.localProductProcurementOffer.findFirst({
      where: {
        id: offerId,
        productId,
        isActive: true,
        product: this.productWhere(scope),
      },
      select: { id: true, productId: true, unitCost: true, currency: true },
    });
    if (!offer) return null;

    await prisma.$transaction([
      prisma.localProductProcurementOffer.updateMany({
        where: { productId, isActive: true },
        data: { isSelected: false, updatedByUserId: actorUserId },
      }),
      prisma.localProductProcurementOffer.update({
        where: { id: offer.id },
        data: { isSelected: true, updatedByUserId: actorUserId },
      }),
      prisma.product.update({
        where: { id: offer.productId },
        data: {
          selectedProcurementOfferId: offer.id,
          procurementStatus: "COSTED",
          procurementNotes: null,
          averageCost: offer.unitCost,
          lastCost: offer.unitCost,
          currency: offer.currency,
          procurementUpdatedAt: new Date(),
          procurementUpdatedByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
      }),
    ]);

    return this.findById(productId, scope);
  }

  async updateStatus(
    productId: string,
    status: ProductProcurementStatus,
    notes: string | null,
    actorUserId: string,
    scope: ProcurementAccessScope,
  ): Promise<LocalProductProcurementEntity | null> {
    const product = await prisma.product.findFirst({
      where: this.productWhere(scope, { id: productId }),
      select: { id: true },
    });
    if (!product) return null;

    const clearsSelection = status === "PENDING_REVIEW" || status === "QUOTING" || status === "REJECTED";
    await prisma.$transaction(async (tx) => {
      if (clearsSelection) {
        await tx.localProductProcurementOffer.updateMany({
          where: { productId: product.id, isActive: true },
          data: { isSelected: false, updatedByUserId: actorUserId },
        });
      }
      await tx.product.update({
        where: { id: product.id },
        data: {
          procurementStatus: status,
          procurementNotes: notes,
          selectedProcurementOfferId: clearsSelection ? null : undefined,
          procurementUpdatedAt: new Date(),
          procurementUpdatedByUserId: actorUserId,
        },
      });
    });

    return this.findById(productId, scope);
  }

  private productWhere(
    scope: ProcurementAccessScope,
    extra: Prisma.ProductWhereInput = {},
  ): Prisma.ProductWhereInput {
    const hasGlobalAccess = scope.role === "ADMIN" || scope.role === "PURCHASING";
    return {
      source: "LOCAL_TEMP",
      isActive: true,
      ...(hasGlobalAccess ? {} : { branchId: scope.branchId }),
      ...extra,
    };
  }

  private mapProduct(row: ProcurementProductRow): LocalProductProcurementEntity {
    return {
      id: row.id,
      description: row.description,
      unit: row.unit,
      currency: row.currency,
      averageCost: this.number(row.averageCost),
      lastCost: this.number(row.lastCost),
      branch: row.branch,
      createdBy: row.createdByUser ? this.user(row.createdByUser) : null,
      procurementStatus: row.procurementStatus,
      procurementNotes: row.procurementNotes,
      procurementUpdatedAt: row.procurementUpdatedAt,
      procurementUpdatedBy: row.procurementUpdatedByUser
        ? this.user(row.procurementUpdatedByUser)
        : null,
      selectedProcurementOfferId: row.selectedProcurementOfferId,
      offers: row.procurementOffers.map((offer) => this.mapOffer(offer)),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapOffer(row: ProcurementOfferRow): LocalProductProcurementOfferEntity {
    return {
      id: row.id,
      productId: row.productId,
      supplierName: row.supplierName,
      contactName: row.contactName,
      email: row.email,
      phone: row.phone,
      unitCost: Number(row.unitCost.toString()),
      currency: row.currency,
      minimumQty: this.number(row.minimumQty),
      deliveryTime: row.deliveryTime,
      validUntil: row.validUntil,
      notes: row.notes,
      isSelected: row.isSelected,
      isActive: row.isActive,
      createdBy: this.user(row.createdByUser),
      updatedBy: row.updatedByUser ? this.user(row.updatedByUser) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private user(user: { id: string; firstName: string; lastName: string }) {
    return {
      id: user.id,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
    };
  }

  private number(value: { toString(): string } | number | null): number | null {
    if (value === null) return null;
    return typeof value === "number" ? value : Number(value.toString());
  }
}
