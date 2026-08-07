import {
  AddQuoteItemDatasourceParams,
  ChangeQuoteStatusDatasourceParams,
  CreateQuoteDatasourceParams,
  CreateQuoteRevisionDatasourceParams,
  ArchiveQuoteDatasourceParams,
  RestoreQuoteDatasourceParams,
  DeleteQuoteDatasourceParams,
  FindQuoteByIdDatasourceParams,
  FindQuotesDatasourceParams,
  FindQuotesDatasourceResult,
  MarkQuoteOrderGeneratedDatasourceParams,
  QuoteAccessScope,
  QuoteDatasource,
  RecordQuoteDeliveryAttemptDatasourceParams,
  RegisterErpQuoteDatasourceParams,
  RemoveQuoteItemDatasourceParams,
  SaveQuoteDraftDatasourceParams,
  SaveQuoteDraftDatasourceResult,
  UpdateQuoteByIdDatasourceParams,
  UpdateQuoteItemDatasourceParams,
} from "../../domain/datasources/quote.datasource";
import { QuoteEntity } from "../../domain/entities/quote.entity";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";
import { QuoteMapper } from "../mappers/quote.mapper";

const quoteInclude = {
  branch: {
    select: {
      id: true,
      code: true,
      name: true,
      street: true,
      exteriorNumber: true,
      interiorNumber: true,
      neighborhood: true,
      city: true,
      municipality: true,
      state: true,
      postalCode: true,
      country: true,
      email: true,
      phone: true,
      secondaryPhone: true,
    },
  },
  customer: {
    select: {
      id: true,
      displayName: true,
      legalName: true,
      email: true,
      phone: true,
      whatsapp: true,
    },
  },
  createdByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      branchId: true,
      branch: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
  updatedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      branchId: true,
      branch: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  },
  rejectedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      branchId: true,
      branch: { select: { code: true, name: true } },
    },
  },
  cancelledByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      branchId: true,
      branch: { select: { code: true, name: true } },
    },
  },
  archivedByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      branchId: true,
      branch: { select: { code: true, name: true } },
    },
  },
  erpQuoteRegisteredByUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      branchId: true,
      branch: { select: { code: true, name: true } },
    },
  },
  items: {
    orderBy: {
      createdAt: "asc",
    },
    include: {
      product: {
        select: {
          id: true,
          code: true,
          ean: true,
          description: true,
          unit: true,
          currency: true,
        },
      },
      customerDescriptionEditedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      effectiveCostEvaluatedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  events: {
    orderBy: {
      createdAt: "desc",
    },
    include: {
      actorUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  nextVersions: {
    orderBy: { revisionNumber: "desc" },
    take: 1,
    select: {
      id: true,
      quoteNumber: true,
      status: true,
      revisionNumber: true,
    },
  },
} satisfies Prisma.QuoteInclude;

const round4 = (value: number): number => Number(value.toFixed(4));
const shouldMoveBackToQuoted = (status: string): boolean => status === "APPROVED" || status === "REJECTED";
const addDaysToDateOnly = (baseDate: Date, days: number): Date => {
  const dateOnly = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  dateOnly.setUTCDate(dateOnly.getUTCDate() + Math.max(0, days));
  return dateOnly;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

export class PrismaQuoteDatasource implements QuoteDatasource {
  async findPaginated(params: FindQuotesDatasourceParams): Promise<FindQuotesDatasourceResult> {
    const skip = (params.page - 1) * params.pageSize;
    const where: Prisma.QuoteWhereInput = {
      AND: [
        this.buildFindWhere(params),
        { nextVersions: { none: {} } },
      ],
    };

    const [total, rows] = await prisma.$transaction([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        include: quoteInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip,
        take: params.pageSize,
      }),
    ]);

    const currentIds = rows.map((row) => row.id);
    const rootIds = rows.map((row) => row.rootQuoteId ?? row.id);
    const relatedRows = rootIds.length > 0
      ? await prisma.quote.findMany({
          where: {
            AND: [
              this.buildScopeWhere(params.scope),
              {
                OR: [
                  { id: { in: rootIds } },
                  { rootQuoteId: { in: rootIds } },
                ],
              },
              { id: { notIn: currentIds } },
            ],
          },
          include: quoteInclude,
          orderBy: [{ revisionNumber: "desc" }, { createdAt: "desc" }],
        })
      : [];

    const relatedByRootId = new Map<string, QuoteEntity[]>();
    for (const row of relatedRows) {
      const rootId = row.rootQuoteId ?? row.id;
      const versions = relatedByRootId.get(rootId) ?? [];
      versions.push(QuoteMapper.toEntity(row));
      relatedByRootId.set(rootId, versions);
    }

    return {
      items: rows.map((row) => ({
        current: QuoteMapper.toEntity(row),
        relatedVersions: relatedByRootId.get(row.rootQuoteId ?? row.id) ?? [],
      })),
      total,
    };
  }

  async findById(params: FindQuoteByIdDatasourceParams): Promise<QuoteEntity | null> {
    return this.findByIdWithClient(params.id, params.scope, prisma);
  }

  async createDraft(params: CreateQuoteDatasourceParams): Promise<QuoteEntity> {
    const quote = await prisma.$transaction(async (tx) => {
      const created = await tx.quote.create({
        data: {
          quoteNumber: params.quoteNumber,
          status: "DRAFT",
          origin: params.origin,
          captureMethod: params.captureMethod,
          originalQuoteDate: params.originalQuoteDate,
          sourceChannel: params.sourceChannel,
          currency: params.currency,
          exchangeRate: params.exchangeRate,
          exchangeRateDate: params.exchangeRateDate,
          taxRate: params.taxRate,
          subtotal: 0,
          tax: 0,
          total: 0,
          deliveryPlace: params.deliveryPlace,
          paymentTerms: params.paymentTerms,
          commercialConditions: params.commercialConditions ?? null,
          validityDays: params.validityDays,
          validUntil: addDaysToDateOnly(params.exchangeRateDate, params.validityDays),
          branchId: params.branchId,
          customerId: params.customerId,
          createdByUserId: params.createdByUserId,
          updatedByUserId: params.updatedByUserId,
          providedByUserId: params.providedByUserId,
          providedByNameSnapshot: params.providedByNameSnapshot,
          providedByBranchNameSnapshot: params.providedByBranchNameSnapshot,
          providedAt: params.providedAt,
          providedByAssignedByUserId: params.providedByAssignedByUserId,
          notes: params.notes,
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: created.id,
          status: "DRAFT",
          note: params.providedByNameSnapshot
            ? `Quote created. Provided by ${params.providedByNameSnapshot}.`
            : "Quote created",
          actorUserId: params.createdByUserId,
        },
      });

      const detail = await this.findByIdWithClient(
        created.id,
        {
          role: "ADMIN",
          userId: params.createdByUserId,
          branchId: params.branchId,
        },
        tx
      );

      if (!detail) throw new Error("Quote created but not found.");
      return detail;
    });

    return quote;
  }

  async saveDraft(params: SaveQuoteDraftDatasourceParams): Promise<SaveQuoteDraftDatasourceResult> {
    const execute = async (): Promise<SaveQuoteDraftDatasourceResult> => prisma.$transaction(async (tx) => {
      const existing = params.quoteId
        ? await tx.quote.findFirst({
            where: { id: params.quoteId, ...this.buildScopeWhere(params.scope) },
            select: {
              id: true,
              quoteNumber: true,
              clientDraftId: true,
              status: true,
              archivedAt: true,
              providedByUserId: true,
            },
          })
        : await tx.quote.findUnique({
            where: {
              createdByUserId_clientDraftId: {
                createdByUserId: params.data.createdByUserId,
                clientDraftId: params.clientDraftId,
              },
            },
            select: {
              id: true,
              quoteNumber: true,
              clientDraftId: true,
              status: true,
              archivedAt: true,
              providedByUserId: true,
            },
          });

      if (params.quoteId && !existing) throw new Error("Quote not found.");
      if (existing?.archivedAt) throw new Error("Archived quotes are read-only.");
      if (existing?.clientDraftId && existing.clientDraftId !== params.clientDraftId) {
        throw new Error("Quote belongs to a different client draft.");
      }

      if (existing?.status === params.submissionStatus && params.action === "SUBMIT_FOR_APPROVAL") {
        return {
          id: existing.id,
          quoteNumber: existing.quoteNumber,
          clientDraftId: existing.clientDraftId ?? params.clientDraftId,
          status: existing.status,
        };
      }
      if (existing && !["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(existing.status)) {
        throw new Error("Quote cannot be edited in current status.");
      }

      const subtotal = round4(params.items.reduce((sum, item) => sum + item.subtotal, 0));
      const tax = round4(subtotal * params.data.taxRate);
      const total = round4(subtotal + tax);
      const validUntil = addDaysToDateOnly(params.data.exchangeRateDate, params.data.validityDays);
      const wasCreated = !existing;

      const quote = existing ?? await tx.quote.create({
        data: {
          quoteNumber: params.quoteNumber,
          clientDraftId: params.clientDraftId,
          status: "DRAFT",
          origin: params.data.origin,
          captureMethod: params.data.captureMethod,
          originalQuoteDate: params.data.originalQuoteDate,
          sourceChannel: params.data.sourceChannel,
          currency: params.data.currency,
          exchangeRate: params.data.exchangeRate,
          exchangeRateDate: params.data.exchangeRateDate,
          taxRate: params.data.taxRate,
          subtotal: 0,
          tax: 0,
          total: 0,
          deliveryPlace: params.data.deliveryPlace,
          paymentTerms: params.data.paymentTerms,
          commercialConditions: params.data.commercialConditions ?? null,
          validityDays: params.data.validityDays,
          validUntil,
          branchId: params.data.branchId,
          customerId: params.data.customerId,
          createdByUserId: params.data.createdByUserId,
          updatedByUserId: params.data.updatedByUserId,
          providedByUserId: params.data.providedByUserId,
          providedByNameSnapshot: params.data.providedByNameSnapshot,
          providedByBranchNameSnapshot: params.data.providedByBranchNameSnapshot,
          providedAt: params.data.providedAt,
          providedByAssignedByUserId: params.data.providedByAssignedByUserId,
          notes: params.data.notes,
        },
        select: {
          id: true,
          quoteNumber: true,
          clientDraftId: true,
          status: true,
          archivedAt: true,
          providedByUserId: true,
        },
      });

      if (wasCreated) {
        await tx.quoteEvent.create({
          data: {
            quoteId: quote.id,
            status: "DRAFT",
            note: params.data.providedByNameSnapshot
              ? `Quote created. Provided by ${params.data.providedByNameSnapshot}.`
              : "Quote created",
            actorUserId: params.data.createdByUserId,
          },
        });
      }

      await tx.quoteItem.deleteMany({ where: { quoteId: quote.id } });
      if (params.items.length > 0) {
        await tx.quoteItem.createMany({
          data: params.items.map((item) => ({ quoteId: quote.id, ...item })),
        });
      }

      const targetStatus = params.action === "SUBMIT_FOR_APPROVAL" ? params.submissionStatus : quote.status;
      await tx.quote.update({
        where: { id: quote.id },
        data: {
          clientDraftId: params.clientDraftId,
          status: targetStatus,
          origin: wasCreated ? params.data.origin : undefined,
          captureMethod: params.data.captureMethod,
          originalQuoteDate: params.data.originalQuoteDate,
          sourceChannel: params.data.sourceChannel,
          currency: params.data.currency,
          exchangeRate: params.data.exchangeRate,
          exchangeRateDate: params.data.exchangeRateDate,
          taxRate: params.data.taxRate,
          subtotal,
          tax,
          total,
          deliveryPlace: params.data.deliveryPlace,
          paymentTerms: params.data.paymentTerms,
          commercialConditions: params.data.commercialConditions ?? null,
          validityDays: params.data.validityDays,
          validUntil,
          customerId: params.data.customerId,
          updatedByUserId: params.data.updatedByUserId,
          providedByUserId: params.data.providedByUserId,
          providedByNameSnapshot: params.data.providedByNameSnapshot,
          providedByBranchNameSnapshot: params.data.providedByBranchNameSnapshot,
          providedAt: params.data.providedAt,
          providedByAssignedByUserId: params.data.providedByAssignedByUserId,
          notes: params.data.notes,
        },
      });

      const currentClientItemIds = params.items.map((item) => item.clientItemId);
      await tx.quoteAttachment.deleteMany({
        where: {
          clientDraftId: params.clientDraftId,
          quoteId: null,
          category: "SELLER_SUPPLIER_QUOTE",
          clientItemId: { notIn: currentClientItemIds },
          fileAsset: { uploadedByUserId: params.data.createdByUserId },
        },
      });
      await tx.quoteAttachment.updateMany({
        where: {
          clientDraftId: params.clientDraftId,
          quoteId: null,
          OR: [
            { category: "SOURCE_DOCUMENT" },
            { category: "SELLER_SUPPLIER_QUOTE", clientItemId: { in: currentClientItemIds } },
          ],
          fileAsset: {
            uploadedByUserId: params.data.createdByUserId,
            status: "READY",
          },
        },
        data: { quoteId: quote.id },
      });

      if (!wasCreated && quote.providedByUserId !== params.data.providedByUserId) {
        await tx.quoteEvent.create({
          data: {
            quoteId: quote.id,
            status: quote.status,
            note: params.data.providedByNameSnapshot
              ? `Provided by assigned to ${params.data.providedByNameSnapshot}.`
              : "Provided by attribution removed.",
            actorUserId: params.data.updatedByUserId,
          },
        });
      }

      if (params.action === "SUBMIT_FOR_APPROVAL" && quote.status !== params.submissionStatus) {
        const belowEffectiveCostCount = params.items.filter((item) => item.isBelowEffectiveCost).length;
        const effectiveCostNote = belowEffectiveCostCount > 0
          ? ` Contains ${belowEffectiveCostCount} item(s) below effective cost.`
          : "";
        await tx.quoteEvent.create({
          data: {
            quoteId: quote.id,
            status: params.submissionStatus,
            note: params.submissionStatus === "QUOTED"
              ? `Quote generated. Internal approval bypassed by system configuration.${effectiveCostNote}`
              : `Quote submitted for internal approval.${effectiveCostNote}`,
            actorUserId: params.data.updatedByUserId,
          },
        });
      }

      return {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        clientDraftId: params.clientDraftId,
        status: targetStatus,
      };
    }, { maxWait: 5_000, timeout: 15_000 });

    try {
      return await execute();
    } catch (error) {
      // A concurrent retry can race the first insert; the unique draft key makes the retry safe.
      if ((error as { code?: string }).code === "P2002" && !params.quoteId) return execute();
      throw error;
    }
  }

  async createRevision(params: CreateQuoteRevisionDatasourceParams): Promise<QuoteEntity> {
    return prisma.$transaction(async (tx) => {
      const source = await tx.quote.findFirst({
        where: {
          id: params.sourceQuoteId,
          ...this.buildScopeWhere(params.scope),
        },
        include: { items: true },
      });
      if (!source) throw new Error("Quote not found.");

      const rootQuoteId = source.rootQuoteId ?? source.id;
      const activeVersion = await tx.quote.findFirst({
        where: {
          OR: [{ id: rootQuoteId }, { rootQuoteId }],
          status: { notIn: ["CANCELLED", "SUPERSEDED"] },
        },
        orderBy: { revisionNumber: "desc" },
        select: { id: true, previousVersionId: true, revisionNumber: true },
      });
      if (activeVersion?.id !== source.id) {
        throw new Error("Only the latest active quote version can be revised.");
      }

      const pendingRevision = await tx.quote.findFirst({
        where: {
          rootQuoteId,
          status: { in: ["DRAFT", "PENDING", "PENDING_APPROVAL", "CHANGES_REQUESTED"] },
        },
        select: { id: true },
      });
      if (pendingRevision) throw new Error("This quote already has an active revision.");

      const latestRevision = await tx.quote.findFirst({
        where: { rootQuoteId },
        orderBy: { revisionNumber: "desc" },
        select: { revisionNumber: true },
      });
      const revisionNumber = (latestRevision?.revisionNumber ?? 0) + 1;
      const baseQuoteNumber = source.quoteNumber.replace(/-R\d+$/i, "");
      const quoteNumber = `${baseQuoteNumber}-R${String(revisionNumber).padStart(2, "0")}`;
      const today = new Date();

      const revision = await tx.quote.create({
        data: {
          quoteNumber,
          status: "DRAFT",
          origin: source.origin,
          captureMethod: source.captureMethod,
          originalQuoteDate: source.originalQuoteDate,
          sourceChannel: source.sourceChannel,
          currency: source.currency,
          exchangeRate: source.exchangeRate,
          exchangeRateDate: source.exchangeRateDate,
          taxRate: source.taxRate,
          subtotal: source.subtotal,
          tax: source.tax,
          total: source.total,
          deliveryPlace: source.deliveryPlace,
          paymentTerms: source.paymentTerms,
          commercialConditions: source.commercialConditions,
          validityDays: source.validityDays,
          validUntil: addDaysToDateOnly(today, source.validityDays),
          branchId: source.branchId,
          customerId: source.customerId,
          createdByUserId: params.actorUserId,
          updatedByUserId: params.actorUserId,
          providedByUserId: source.providedByUserId,
          providedByNameSnapshot: source.providedByNameSnapshot,
          providedByBranchNameSnapshot: source.providedByBranchNameSnapshot,
          providedAt: source.providedAt,
          providedByAssignedByUserId: source.providedByAssignedByUserId,
          rootQuoteId,
          previousVersionId: source.id,
          revisionNumber,
          revisionReason: params.reason,
          revisionComment: params.comment,
          notes: source.notes,
          items: {
            create: source.items.map((item) => ({
              clientItemId: item.clientItemId,
              productId: item.productId,
              externalProductCode: item.externalProductCode,
              ean: item.ean,
              customerDescription: item.customerDescription,
              customerDescriptionOriginal: item.customerDescriptionOriginal,
              customerDescriptionEditedAt: item.customerDescriptionEditedAt,
              customerDescriptionEditedByUserId: item.customerDescriptionEditedByUserId,
              customerUnit: item.customerUnit,
              erpDescription: item.erpDescription,
              unit: item.unit,
              qty: item.qty,
              stock: item.stock,
              deliveryTime: item.deliveryTime,
              itemComment: item.itemComment,
              sellerSupplierId: item.sellerSupplierId,
              sellerSupplierNameSnapshot: item.sellerSupplierNameSnapshot,
              sellerQuotedUnitCost: item.sellerQuotedUnitCost,
              sellerQuotedCurrency: item.sellerQuotedCurrency,
              sellerQuotedExchangeRate: item.sellerQuotedExchangeRate,
              sellerQuotedBrand: item.sellerQuotedBrand,
              sellerSupplierDescription: item.sellerSupplierDescription,
              sellerSupplierOrigin: item.sellerSupplierOrigin,
              sellerSupplierQuoteValidUntil: item.sellerSupplierQuoteValidUntil,
              sellerSupplierQuoteReference: item.sellerSupplierQuoteReference,
              sellerSupplierQuoteNotes: item.sellerSupplierQuoteNotes,
              sellerOriginRestrictions: item.sellerOriginRestrictions,
              sellerDeliveryState: item.sellerDeliveryState,
              sellerSupplierDeliveryTime: item.sellerSupplierDeliveryTime,
              purchaseStandard: item.purchaseStandard,
              purchaseDiameter: item.purchaseDiameter,
              purchaseThickness: item.purchaseThickness,
              purchaseBore: item.purchaseBore,
              technicalFamily: item.technicalFamily,
              technicalAttributes: item.technicalAttributes === null ? Prisma.JsonNull : item.technicalAttributes,
              cost: item.cost,
              costCurrency: item.costCurrency,
              marginPct: item.marginPct,
              effectiveCostAtQuote: item.effectiveCostAtQuote,
              isBelowEffectiveCost: item.isBelowEffectiveCost,
              effectiveCostVariance: item.effectiveCostVariance,
              effectiveCostVariancePct: item.effectiveCostVariancePct,
              effectiveCostEvaluatedAt: item.effectiveCostEvaluatedAt,
              effectiveCostEvaluatedByUserId: item.effectiveCostEvaluatedByUserId,
              sourceCurrency: item.sourceCurrency,
              sourceUnitPrice: item.sourceUnitPrice,
              sourceSubtotal: item.sourceSubtotal,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              sourceRequiresReview: item.sourceRequiresReview,
              requiresReview: item.requiresReview,
            })),
          },
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: revision.id,
          status: "DRAFT",
          note: `Revision R${String(revisionNumber).padStart(2, "0")} created from ${source.quoteNumber}. Reason: ${params.reason}.${params.comment ? ` ${params.comment}` : ""}`,
          actorUserId: params.actorUserId,
        },
      });

      const detail = await this.findByIdWithClient(revision.id, params.scope, tx);
      if (!detail) throw new Error("Quote revision created but not found.");
      return detail;
    });
  }

  async archive(params: ArchiveQuoteDatasourceParams): Promise<QuoteEntity | null> {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id: params.id }, select: { id: true, quoteNumber: true, archivedAt: true } });
      if (!quote) return null;
      if (quote.archivedAt) throw new Error("Quote is already archived.");

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          archivedAt: new Date(),
          archivedByUserId: params.actorUserId,
          archiveReason: params.reason,
          updatedByUserId: params.actorUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          entityType: "QUOTE",
          entityId: quote.id,
          action: "ARCHIVE",
          payload: { quoteNumber: quote.quoteNumber, reason: params.reason },
        },
      });

      return this.findByIdWithClient(quote.id, { role: "ADMIN", userId: params.actorUserId, branchId: "" }, tx);
    });
  }

  async restore(params: RestoreQuoteDatasourceParams): Promise<QuoteEntity | null> {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({ where: { id: params.id }, select: { id: true, quoteNumber: true, archivedAt: true } });
      if (!quote) return null;
      if (!quote.archivedAt) throw new Error("Quote is not archived.");

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          archivedAt: null,
          archivedByUserId: null,
          archiveReason: null,
          updatedByUserId: params.actorUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          entityType: "QUOTE",
          entityId: quote.id,
          action: "RESTORE",
          payload: { quoteNumber: quote.quoteNumber },
        },
      });

      return this.findByIdWithClient(quote.id, { role: "ADMIN", userId: params.actorUserId, branchId: "" }, tx);
    });
  }

  async deletePermanently(params: DeleteQuoteDatasourceParams): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          orderStatus: true,
          rootQuoteId: true,
          previousVersionId: true,
          supersededByQuoteId: true,
          revisionNumber: true,
          customerId: true,
          createdByUserId: true,
          subtotal: true,
          tax: true,
          total: true,
          _count: { select: { revisions: true, nextVersions: true } },
        },
      });
      if (!quote) return false;
      if (params.confirmation !== quote.quoteNumber) throw new Error("Quote number confirmation does not match.");
      if (!["DRAFT", "CANCELLED"].includes(quote.status)) {
        throw new Error("Only DRAFT or CANCELLED quotes can be permanently deleted.");
      }
      if (quote.orderStatus === "GENERATED") throw new Error("A quote with a generated order cannot be deleted.");
      const belongsToRevisionChain = Boolean(
        quote.rootQuoteId ||
        quote.previousVersionId ||
        quote.supersededByQuoteId ||
        quote.revisionNumber > 0 ||
        quote._count.revisions > 0 ||
        quote._count.nextVersions > 0
      );
      if (belongsToRevisionChain) throw new Error("A quote that belongs to a revision chain cannot be deleted.");

      await tx.auditLog.create({
        data: {
          actorUserId: params.actorUserId,
          entityType: "QUOTE",
          entityId: quote.id,
          action: "DELETE_PERMANENTLY",
          payload: {
            quoteNumber: quote.quoteNumber,
            reason: params.reason,
            status: quote.status,
            customerId: quote.customerId,
            createdByUserId: quote.createdByUserId,
            subtotal: quote.subtotal.toString(),
            tax: quote.tax.toString(),
            total: quote.total.toString(),
          },
        },
      });
      await tx.quote.delete({ where: { id: quote.id } });
      return true;
    });
  }

  async updateById(params: UpdateQuoteByIdDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const where = {
        id: params.id,
        ...this.buildScopeWhere(params.scope),
      };

      const existing = await tx.quote.findFirst({
        where,
        select: {
          id: true,
          status: true,
          subtotal: true,
          taxRate: true,
          exchangeRateDate: true,
          validityDays: true,
        },
      });
      if (!existing) return null;

      const subtotal = Number(existing.subtotal.toString());
      const nextTaxRate =
        typeof params.data.taxRate === "number" ? params.data.taxRate : Number(existing.taxRate.toString());
      const nextExchangeRateDate = params.data.exchangeRateDate ?? existing.exchangeRateDate;
      const nextValidityDays =
        typeof params.data.validityDays === "number" ? params.data.validityDays : existing.validityDays;
      const tax = round4(subtotal * nextTaxRate);
      const total = round4(subtotal + tax);
      const validUntil = addDaysToDateOnly(nextExchangeRateDate, nextValidityDays);

      await tx.quote.update({
        where: { id: existing.id },
        data: {
          status: shouldMoveBackToQuoted(existing.status) ? "QUOTED" : undefined,
          customerId: params.data.customerId,
          origin: params.data.origin,
          captureMethod: params.data.captureMethod,
          originalQuoteDate: params.data.originalQuoteDate,
          sourceChannel: params.data.sourceChannel,
          currency: params.data.currency,
          exchangeRate: params.data.exchangeRate,
          exchangeRateDate: params.data.exchangeRateDate,
          taxRate: params.data.taxRate,
          tax,
          total,
          deliveryPlace: params.data.deliveryPlace,
          paymentTerms: params.data.paymentTerms,
          commercialConditions: params.data.commercialConditions ?? null,
          validityDays: params.data.validityDays,
          validUntil,
          notes: params.data.notes,
          providedByUserId: params.data.providedByUserId,
          providedByNameSnapshot: params.data.providedByNameSnapshot,
          providedByBranchNameSnapshot: params.data.providedByBranchNameSnapshot,
          providedAt: params.data.providedAt,
          providedByAssignedByUserId: params.data.providedByAssignedByUserId,
          updatedByUserId: params.data.updatedByUserId,
        },
      });

      if (shouldMoveBackToQuoted(existing.status)) {
        await tx.quoteEvent.create({
          data: {
            quoteId: existing.id,
            status: "QUOTED",
            note: "Quote edited and moved back to QUOTED status.",
            actorUserId: params.data.updatedByUserId,
          },
        });
      }

      if (params.data.providerAttributionEventNote) {
        await tx.quoteEvent.create({
          data: {
            quoteId: existing.id,
            status: existing.status,
            note: params.data.providerAttributionEventNote,
            actorUserId: params.data.updatedByUserId,
          },
        });
      }

      return this.findByIdWithClient(existing.id, params.scope, tx);
    });
  }

  async addItem(params: AddQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.quoteId,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          status: true,
          taxRate: true,
        },
      });

      if (!quote) return null;

      await tx.quoteItem.create({
        data: {
          quoteId: quote.id,
          productId: params.data.productId,
          externalProductCode: params.data.externalProductCode,
          ean: params.data.ean,
          customerDescription: params.data.customerDescription,
          customerDescriptionOriginal: params.data.customerDescriptionOriginal,
          customerDescriptionEditedAt: params.data.customerDescriptionEditedAt,
          customerDescriptionEditedByUserId: params.data.customerDescriptionEditedByUserId,
          customerUnit: params.data.customerUnit,
          erpDescription: params.data.erpDescription,
          unit: params.data.unit,
          qty: params.data.qty,
          stock: params.data.stock,
          deliveryTime: params.data.deliveryTime,
          itemComment: params.data.itemComment,
          sellerSupplierId: params.data.sellerSupplierId,
          sellerSupplierNameSnapshot: params.data.sellerSupplierNameSnapshot,
          sellerQuotedUnitCost: params.data.sellerQuotedUnitCost,
          sellerQuotedCurrency: params.data.sellerQuotedCurrency,
          sellerQuotedExchangeRate: params.data.sellerQuotedExchangeRate,
          sellerQuotedBrand: params.data.sellerQuotedBrand,
          sellerSupplierDescription: params.data.sellerSupplierDescription,
          sellerSupplierOrigin: params.data.sellerSupplierOrigin,
          sellerSupplierQuoteValidUntil: params.data.sellerSupplierQuoteValidUntil,
          sellerSupplierQuoteReference: params.data.sellerSupplierQuoteReference,
          sellerSupplierQuoteNotes: params.data.sellerSupplierQuoteNotes,
          sellerOriginRestrictions: params.data.sellerOriginRestrictions,
          sellerDeliveryState: params.data.sellerDeliveryState,
          sellerSupplierDeliveryTime: params.data.sellerSupplierDeliveryTime,
          purchaseStandard: params.data.purchaseStandard,
          purchaseDiameter: params.data.purchaseDiameter,
          purchaseThickness: params.data.purchaseThickness,
          purchaseBore: params.data.purchaseBore,
          technicalFamily: params.data.technicalFamily,
          technicalAttributes: params.data.technicalAttributes,
          cost: params.data.cost,
          costCurrency: params.data.costCurrency,
          marginPct: params.data.marginPct,
          effectiveCostAtQuote: params.data.effectiveCostAtQuote,
          isBelowEffectiveCost: params.data.isBelowEffectiveCost,
          effectiveCostVariance: params.data.effectiveCostVariance,
          effectiveCostVariancePct: params.data.effectiveCostVariancePct,
          effectiveCostEvaluatedAt: params.data.effectiveCostEvaluatedAt,
          effectiveCostEvaluatedByUserId: params.data.effectiveCostEvaluatedByUserId,
          unitPrice: params.data.unitPrice,
          subtotal: params.data.subtotal,
          sourceRequiresReview: params.data.sourceRequiresReview,
          requiresReview: params.data.requiresReview,
        },
      });

      await this.recalculateQuoteTotals(
        tx,
        quote.id,
        Number(quote.taxRate.toString()),
        params.data.updatedByUserId
      );
      await this.moveToQuotedAfterEditionIfNeeded(tx, quote.id, quote.status, params.data.updatedByUserId);

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async updateItem(params: UpdateQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.quoteId,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          status: true,
          taxRate: true,
        },
      });
      if (!quote) return null;

      const updated = await tx.quoteItem.updateMany({
        where: {
          id: params.itemId,
          quoteId: quote.id,
        },
        data: {
          productId: params.data.productId,
          externalProductCode: params.data.externalProductCode,
          ean: params.data.ean,
          customerDescription: params.data.customerDescription,
          customerDescriptionEditedAt: params.data.customerDescriptionEditedAt,
          customerDescriptionEditedByUserId: params.data.customerDescriptionEditedByUserId,
          customerUnit: params.data.customerUnit,
          erpDescription: params.data.erpDescription,
          unit: params.data.unit,
          qty: params.data.qty,
          stock: params.data.stock,
          deliveryTime: params.data.deliveryTime,
          itemComment: params.data.itemComment,
          sellerSupplierId: params.data.sellerSupplierId,
          sellerSupplierNameSnapshot: params.data.sellerSupplierNameSnapshot,
          sellerQuotedUnitCost: params.data.sellerQuotedUnitCost,
          sellerQuotedCurrency: params.data.sellerQuotedCurrency,
          sellerQuotedExchangeRate: params.data.sellerQuotedExchangeRate,
          sellerQuotedBrand: params.data.sellerQuotedBrand,
          sellerSupplierDescription: params.data.sellerSupplierDescription,
          sellerSupplierOrigin: params.data.sellerSupplierOrigin,
          sellerSupplierQuoteValidUntil: params.data.sellerSupplierQuoteValidUntil,
          sellerSupplierQuoteReference: params.data.sellerSupplierQuoteReference,
          sellerSupplierQuoteNotes: params.data.sellerSupplierQuoteNotes,
          sellerOriginRestrictions: params.data.sellerOriginRestrictions,
          sellerDeliveryState: params.data.sellerDeliveryState,
          sellerSupplierDeliveryTime: params.data.sellerSupplierDeliveryTime,
          purchaseStandard: params.data.purchaseStandard,
          purchaseDiameter: params.data.purchaseDiameter,
          purchaseThickness: params.data.purchaseThickness,
          purchaseBore: params.data.purchaseBore,
          technicalFamily: params.data.technicalFamily,
          technicalAttributes: params.data.technicalAttributes,
          cost: params.data.cost,
          costCurrency: params.data.costCurrency,
          marginPct: params.data.marginPct,
          effectiveCostAtQuote: params.data.effectiveCostAtQuote,
          isBelowEffectiveCost: params.data.isBelowEffectiveCost,
          effectiveCostVariance: params.data.effectiveCostVariance,
          effectiveCostVariancePct: params.data.effectiveCostVariancePct,
          effectiveCostEvaluatedAt: params.data.effectiveCostEvaluatedAt,
          effectiveCostEvaluatedByUserId: params.data.effectiveCostEvaluatedByUserId,
          unitPrice: params.data.unitPrice,
          subtotal: params.data.subtotal,
          sourceRequiresReview: params.data.sourceRequiresReview,
          requiresReview: params.data.requiresReview,
        },
      });

      if (updated.count === 0) return null;

      await this.recalculateQuoteTotals(
        tx,
        quote.id,
        Number(quote.taxRate.toString()),
        params.data.updatedByUserId
      );
      await this.moveToQuotedAfterEditionIfNeeded(tx, quote.id, quote.status, params.data.updatedByUserId);

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async removeItem(params: RemoveQuoteItemDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.quoteId,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          status: true,
          taxRate: true,
        },
      });
      if (!quote) return null;

      const deleted = await tx.quoteItem.deleteMany({
        where: {
          id: params.itemId,
          quoteId: quote.id,
        },
      });
      if (deleted.count === 0) return null;

      await this.recalculateQuoteTotals(tx, quote.id, Number(quote.taxRate.toString()), params.updatedByUserId);
      await this.moveToQuotedAfterEditionIfNeeded(tx, quote.id, quote.status, params.updatedByUserId);
      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async changeStatus(params: ChangeQuoteStatusDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.id,
          ...this.buildScopeWhere(params.scope),
        },
        select: { id: true, previousVersionId: true, revisionNumber: true },
      });
      if (!quote) return null;

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: params.status,
          rejectionReason: params.rejectionReason,
          rejectionComment: params.rejectionComment,
          rejectedAt: params.status === "REJECTED" ? new Date() : null,
          rejectedByUserId: params.status === "REJECTED" ? params.actorUserId : null,
          cancellationReason: params.cancellationReason,
          cancellationComment: params.cancellationComment,
          cancelledAt: params.status === "CANCELLED" ? new Date() : null,
          cancelledByUserId: params.status === "CANCELLED" ? params.actorUserId : null,
          approvalReturnReason: params.approvalReturnReason,
          approvalReturnComment: params.approvalReturnComment,
          updatedByUserId: params.actorUserId,
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: quote.id,
          status: params.status,
          note: params.note,
          actorUserId: params.actorUserId,
        },
      });

      if (params.status === "QUOTED" && quote.previousVersionId) {
        await tx.quote.update({
          where: { id: quote.previousVersionId },
          data: {
            status: "SUPERSEDED",
            supersededAt: new Date(),
            supersededByQuoteId: quote.id,
            updatedByUserId: params.actorUserId,
          },
        });
        await tx.quoteEvent.create({
          data: {
            quoteId: quote.previousVersionId,
            status: "SUPERSEDED",
            note: `Superseded by authorized revision R${String(quote.revisionNumber).padStart(2, "0")}.`,
            actorUserId: params.actorUserId,
          },
        });
      }

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async recordDeliveryAttempt(params: RecordQuoteDeliveryAttemptDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.id,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          status: true,
          firstSentAt: true,
        },
      });
      if (!quote) return null;

      await tx.quoteDeliveryAttempt.create({
        data: {
          quoteId: quote.id,
          channel: params.data.channel,
          recipient: params.data.recipient,
          status: params.data.status,
          providerMessageId: params.data.providerMessageId,
          errorMessage: params.data.errorMessage,
          sentByUserId: params.actorUserId,
          sentAt: params.data.sentAt,
        },
      });

      if (params.data.status === "SENT") {
        await tx.quote.update({
          where: { id: quote.id },
          data: {
            deliveryStatus: "SENT",
            firstSentAt: quote.firstSentAt ?? params.data.sentAt,
            updatedByUserId: params.actorUserId,
          },
        });
      } else {
        await tx.quote.update({
          where: { id: quote.id },
          data: {
            updatedByUserId: params.actorUserId,
          },
        });
      }

      await tx.quoteEvent.create({
        data: {
          quoteId: quote.id,
          status: quote.status,
          note: params.data.note,
          actorUserId: params.actorUserId,
        },
      });

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async markOrderGenerated(params: MarkQuoteOrderGeneratedDatasourceParams): Promise<QuoteEntity | null> {
    return await prisma.$transaction(async (tx) => {
      const quote = await tx.quote.findFirst({
        where: {
          id: params.id,
          ...this.buildScopeWhere(params.scope),
        },
        select: {
          id: true,
          status: true,
        },
      });
      if (!quote) return null;

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          orderStatus: "GENERATED",
          orderGeneratedAt: params.data.generatedAt,
          orderReference: params.data.orderReference,
          updatedByUserId: params.actorUserId,
        },
      });

      await tx.quoteOrderExport.create({
        data: {
          quoteId: quote.id,
          orderReference: params.data.orderReference,
          fileName: params.data.fileName,
          transferStatus: "PENDING_UPLOAD",
          generatedByUserId: params.actorUserId,
          generatedAt: params.data.generatedAt,
        },
      });

      await tx.quoteEvent.create({
        data: {
          quoteId: quote.id,
          status: quote.status,
          note: params.data.note,
          actorUserId: params.actorUserId,
        },
      });

      return this.findByIdWithClient(quote.id, params.scope, tx);
    });
  }

  async registerErpQuote(params: RegisterErpQuoteDatasourceParams): Promise<QuoteEntity | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const quote = await tx.quote.findFirst({
          where: {
            id: params.id,
            ...this.buildScopeWhere(params.scope),
          },
          select: {
            id: true,
            status: true,
            captureMethod: true,
            archivedAt: true,
            erpQuoteNumber: true,
          },
        });
        if (!quote) return null;
        if (quote.archivedAt) throw new Error("Archived quotes are read-only.");
        if (quote.captureMethod !== "EXCEL_IMPORT") {
          throw new Error("Only Excel-imported quotes can be registered in ERP.");
        }
        if (quote.status !== "APPROVED") {
          throw new Error("Quote must be APPROVED before registering it in ERP.");
        }

        const registeredAt = new Date();
        await tx.quote.update({
          where: { id: quote.id },
          data: {
            erpQuoteNumber: params.erpQuoteNumber,
            erpQuoteRegisteredAt: registeredAt,
            erpQuoteRegisteredByUserId: params.actorUserId,
            updatedByUserId: params.actorUserId,
          },
        });

        const note = quote.erpQuoteNumber
          ? `ERP quote registration changed from ${quote.erpQuoteNumber} to ${params.erpQuoteNumber}.`
          : `ERP quote registered as ${params.erpQuoteNumber}.`;
        await tx.quoteEvent.create({
          data: {
            quoteId: quote.id,
            status: quote.status,
            note,
            actorUserId: params.actorUserId,
          },
        });

        return this.findByIdWithClient(quote.id, params.scope, tx);
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new Error("ERP quote number is already registered.");
      }
      throw error;
    }
  }

  private async findByIdWithClient(id: string, scope: QuoteAccessScope, client: DbClient): Promise<QuoteEntity | null> {
    const row = await client.quote.findFirst({
      where: {
        id,
        ...this.buildScopeWhere(scope),
      },
      include: quoteInclude,
    });

    if (!row) return null;
    return QuoteMapper.toEntity(row);
  }

  private buildFindWhere(params: FindQuotesDatasourceParams): Prisma.QuoteWhereInput {
    const andFilters: Prisma.QuoteWhereInput[] = [this.buildScopeWhere(params.scope)];
    andFilters.push({ archivedAt: params.archived ? { not: null } : null });

    if (params.branchId) {
      andFilters.push({ branchId: params.branchId });
    }

    if (params.status) {
      andFilters.push({ status: params.status });
    }

    if (params.search) {
      andFilters.push({
        OR: [
          { quoteNumber: { contains: params.search, mode: "insensitive" } },
          { erpQuoteNumber: { contains: params.search, mode: "insensitive" } },
          { notes: { contains: params.search, mode: "insensitive" } },
          {
            customer: {
              is: {
                displayName: { contains: params.search, mode: "insensitive" },
              },
            },
          },
          {
            customer: {
              is: {
                legalName: { contains: params.search, mode: "insensitive" },
              },
            },
          },
        ],
      });
    }

    return { AND: andFilters };
  }

  private buildScopeWhere(scope: QuoteAccessScope): Prisma.QuoteWhereInput {
    if (scope.role === "ADMIN") return {};
    if (scope.role === "SELLER") {
      return {
        branchId: scope.branchId,
        createdByUserId: scope.userId,
      };
    }
    return { branchId: scope.branchId };
  }

  private async recalculateQuoteTotals(
    tx: Prisma.TransactionClient,
    quoteId: string,
    taxRate: number,
    updatedByUserId: string
  ): Promise<void> {
    const aggregate = await tx.quoteItem.aggregate({
      where: { quoteId },
      _sum: { subtotal: true },
    });

    const subtotal = aggregate._sum.subtotal ? Number(aggregate._sum.subtotal.toString()) : 0;
    const tax = round4(subtotal * taxRate);
    const total = round4(subtotal + tax);

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        subtotal: round4(subtotal),
        tax,
        total,
        updatedByUserId,
      },
    });
  }

  private async moveToQuotedAfterEditionIfNeeded(
    tx: Prisma.TransactionClient,
    quoteId: string,
    currentStatus: string,
    actorUserId: string
  ): Promise<void> {
    if (!shouldMoveBackToQuoted(currentStatus)) return;

    await tx.quote.update({
      where: { id: quoteId },
      data: {
        status: "QUOTED",
        updatedByUserId: actorUserId,
      },
    });

    await tx.quoteEvent.create({
      data: {
        quoteId,
        status: "QUOTED",
        note: "Quote edited and moved back to QUOTED status.",
        actorUserId,
      },
    });
  }
}
