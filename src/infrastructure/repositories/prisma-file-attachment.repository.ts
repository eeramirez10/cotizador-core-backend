import type { FileAttachmentEntity, DownloadableFileEntity } from "../../domain/entities/file-attachment.entity";
import {
  FileAttachmentRepository,
  type FileAttachmentActor,
  type StoredFileMetadata,
} from "../../domain/repositories/file-attachment.repository";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

const assetInclude = {
  uploadedBy: { select: { firstName: true, lastName: true } },
  quoteAttachments: { select: { quoteId: true, clientDraftId: true, clientItemId: true, category: true } },
  purchaseOfferAttachments: { select: { purchaseSupplierOfferId: true } },
} satisfies Prisma.FileAssetInclude;

type AssetRow = Prisma.FileAssetGetPayload<{ include: typeof assetInclude }>;

export class PrismaFileAttachmentRepository extends FileAttachmentRepository {
  async createQuoteAttachment(input: {
    clientDraftId: string;
    category: "SOURCE_DOCUMENT" | "SELLER_SUPPLIER_QUOTE";
    clientItemIds: string[];
    file: StoredFileMetadata;
    actor: FileAttachmentActor;
  }): Promise<FileAttachmentEntity> {
    if (input.actor.role !== "SELLER") throw new Error("Only sellers can attach quote documents.");
    const quote = await prisma.quote.findFirst({
      where: { clientDraftId: input.clientDraftId, createdByUserId: input.actor.id },
      select: { id: true, status: true, purchaseRequisition: { select: { status: true } } },
    });
    const canAttachPurchasingReference = input.category === "SELLER_SUPPLIER_QUOTE" && Boolean(
      quote && (
        quote.status === "QUOTED"
        || (quote.status === "APPROVED" && quote.purchaseRequisition?.status === "DRAFT")
      )
    );
    if (quote && !["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(quote.status) && !canAttachPurchasingReference) {
      throw new Error("Quote attachments cannot be changed in the current status.");
    }
    if (quote && input.clientItemIds.length > 0) {
      const itemCount = await prisma.quoteItem.count({
        where: { quoteId: quote.id, clientItemId: { in: input.clientItemIds } },
      });
      if (itemCount !== input.clientItemIds.length) throw new Error("One or more quote items were not found.");
    }

    const row = await prisma.$transaction(async (tx) => {
      const asset = await tx.fileAsset.create({
        data: {
          ...input.file,
          uploadedByUserId: input.actor.id,
          quoteAttachments: {
            create: input.category === "SOURCE_DOCUMENT"
              ? [{ quoteId: quote?.id ?? null, clientDraftId: input.clientDraftId, clientItemId: null, category: input.category }]
              : input.clientItemIds.map((clientItemId) => ({
                  quoteId: quote?.id ?? null,
                  clientDraftId: input.clientDraftId,
                  clientItemId,
                  category: input.category,
                })),
          },
        },
        include: assetInclude,
      });
      if (quote) {
        await tx.auditLog.create({
          data: {
            actorUserId: input.actor.id,
            entityType: "QUOTE",
            entityId: quote.id,
            action: "ATTACH_FILE",
            payload: { fileAssetId: asset.id, category: input.category, clientItemIds: input.clientItemIds },
          },
        });
      }
      return asset;
    });
    return this.toEntity(row);
  }

  async createPurchaseOfferAttachment(input: {
    requisitionId: string;
    purchaseOfferIds: string[];
    file: StoredFileMetadata;
    actor: FileAttachmentActor;
  }): Promise<FileAttachmentEntity> {
    if (!["ADMIN", "PURCHASING"].includes(input.actor.role)) {
      throw new Error("Only ADMIN or PURCHASING can attach supplier proposals.");
    }
    const offers = await prisma.purchaseSupplierOffer.findMany({
      where: {
        id: { in: input.purchaseOfferIds },
        requisitionItem: { requisitionId: input.requisitionId },
        isActive: true,
      },
      select: { id: true, supplierQuoteId: true },
    });
    if (offers.length !== input.purchaseOfferIds.length) throw new Error("One or more supplier offers were not found.");

    const row = await prisma.$transaction(async (tx) => {
      const asset = await tx.fileAsset.create({
        data: {
          ...input.file,
          uploadedByUserId: input.actor.id,
          purchaseOfferAttachments: {
            create: input.purchaseOfferIds.map((purchaseSupplierOfferId) => ({ purchaseSupplierOfferId })),
          },
        },
        include: assetInclude,
      });
      const supplierQuoteIds = [...new Set(offers.flatMap((offer) => offer.supplierQuoteId ? [offer.supplierQuoteId] : []))];
      if (supplierQuoteIds.length > 0) {
        await tx.purchaseSupplierQuote.updateMany({
          where: { id: { in: supplierQuoteIds } },
          data: { fileAssetId: asset.id, updatedByUserId: input.actor.id },
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserId: input.actor.id,
          entityType: "PURCHASE_REQUISITION",
          entityId: input.requisitionId,
          action: "ATTACH_SUPPLIER_PROPOSAL",
          payload: { fileAssetId: asset.id, purchaseOfferIds: input.purchaseOfferIds },
        },
      });
      return asset;
    });
    return this.toEntity(row);
  }

  async listQuoteDraft(clientDraftId: string, actor: FileAttachmentActor): Promise<FileAttachmentEntity[]> {
    const quote = await prisma.quote.findFirst({
      where: { clientDraftId, createdByUserId: actor.id },
      select: { id: true, rootQuoteId: true },
    });
    const quoteIds = quote ? await this.quoteChainIds(quote.id, quote.rootQuoteId) : [];
    const rows = await prisma.fileAsset.findMany({
      where: {
        status: "READY",
        uploadedByUserId: actor.id,
        quoteAttachments: {
          some: {
            OR: [
              { clientDraftId },
              ...(quoteIds.length > 0 ? [{ quoteId: { in: quoteIds } }] : []),
            ],
          },
        },
      },
      include: assetInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async listQuote(quoteId: string, actor: FileAttachmentActor): Promise<FileAttachmentEntity[]> {
    const quote = await prisma.quote.findFirst({
      where: { id: quoteId, ...this.quoteScope(actor) },
      select: { id: true, rootQuoteId: true },
    });
    if (!quote) throw new Error("Quote not found.");
    const quoteIds = await this.quoteChainIds(quote.id, quote.rootQuoteId);
    const rows = await prisma.fileAsset.findMany({
      where: { status: "READY", quoteAttachments: { some: { quoteId: { in: quoteIds } } } },
      include: assetInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toEntity(row));
  }

  async listPurchaseRequisition(requisitionId: string, actor: FileAttachmentActor): Promise<FileAttachmentEntity[]> {
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.requisitionScope(actor) },
      select: { id: true, quoteId: true, quote: { select: { rootQuoteId: true } } },
    });
    if (!requisition) throw new Error("Purchase requisition not found.");
    const quoteIds = await this.quoteChainIds(requisition.quoteId, requisition.quote.rootQuoteId);
    const [quoteFiles, offerFiles] = await Promise.all([
      prisma.fileAsset.findMany({
        where: { status: "READY", quoteAttachments: { some: { quoteId: { in: quoteIds } } } },
        include: assetInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.fileAsset.findMany({
        where: {
          status: "READY",
          purchaseOfferAttachments: {
            some: { purchaseSupplierOffer: { requisitionItem: { requisitionId } } },
          },
        },
        include: assetInclude,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    const unique = new Map([...quoteFiles, ...offerFiles].map((row) => [row.id, row]));
    return [...unique.values()].map((row) => this.toEntity(row));
  }

  async findDownload(fileId: string, actor: FileAttachmentActor): Promise<DownloadableFileEntity | null> {
    const row = await this.findAccessibleFile(fileId, actor);
    return row ? this.toDownload(row) : null;
  }

  async softDelete(fileId: string, actor: FileAttachmentActor): Promise<DownloadableFileEntity | null> {
    const row = await this.findAccessibleFile(fileId, actor);
    if (!row || (actor.role !== "ADMIN" && row.uploadedByUserId !== actor.id)) return null;
    if (actor.role !== "ADMIN") {
      const hasLockedQuoteAttachment = row.quoteAttachments.some((link) => {
        if (!link.quote) return false;
        if (["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(link.quote.status)) return false;
        return !(link.category === "SELLER_SUPPLIER_QUOTE" && (
          link.quote.status === "QUOTED"
          || (link.quote.status === "APPROVED" && link.quote.purchaseRequisition?.status === "DRAFT")
        ));
      });
      if (hasLockedQuoteAttachment) return null;
      const requisitionStatuses = row.purchaseOfferAttachments.map(
        (link) => link.purchaseSupplierOffer.requisitionItem.requisition.status,
      );
      if (requisitionStatuses.some((status) => ["COMPLETED", "CANCELLED"].includes(status))) return null;
    }
    await prisma.$transaction([
      prisma.fileAsset.update({ where: { id: row.id }, data: { status: "DELETED", deletedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          actorUserId: actor.id,
          entityType: "FILE_ASSET",
          entityId: row.id,
          action: "DELETE_ATTACHMENT",
          payload: { originalName: row.originalName },
        },
      }),
    ]);
    return this.toDownload(row);
  }

  private async findAccessibleFile(fileId: string, actor: FileAttachmentActor) {
    const row = await prisma.fileAsset.findFirst({
      where: { id: fileId, status: "READY" },
      include: {
        quoteAttachments: {
          include: { quote: { select: { branchId: true, createdByUserId: true, status: true, purchaseRequisition: { select: { id: true, status: true } } } } },
        },
        purchaseOfferAttachments: {
          include: {
            purchaseSupplierOffer: {
              select: { requisitionItem: { select: { requisition: { select: { branchId: true, requestedByUserId: true, status: true } } } } },
            },
          },
        },
      },
    });
    if (!row) return null;
    if (actor.role === "ADMIN" || row.uploadedByUserId === actor.id) return row;
    const quotes = row.quoteAttachments.flatMap((link) => link.quote ? [link.quote] : []);
    const requisitions = row.purchaseOfferAttachments.map((link) => link.purchaseSupplierOffer.requisitionItem.requisition);
    if (actor.role === "SELLER" && (quotes.some((quote) => quote.createdByUserId === actor.id) || requisitions.some((req) => req.requestedByUserId === actor.id))) return row;
    if (actor.role === "MANAGER" && (quotes.some((quote) => quote.branchId === actor.branchId) || requisitions.some((req) => req.branchId === actor.branchId))) return row;
    if (actor.role === "PURCHASING" && (
      requisitions.some((req) => req.status !== "DRAFT")
      || quotes.some((quote) => Boolean(
        quote.purchaseRequisition && quote.purchaseRequisition.status !== "DRAFT"
      ))
    )) return row;
    return null;
  }

  private quoteScope(actor: FileAttachmentActor): Prisma.QuoteWhereInput {
    if (actor.role === "SELLER") return { createdByUserId: actor.id };
    if (actor.role === "MANAGER") return { branchId: actor.branchId };
    if (actor.role === "PURCHASING") {
      return { purchaseRequisition: { is: { status: { not: "DRAFT" } } } };
    }
    return {};
  }

  private requisitionScope(actor: FileAttachmentActor): Prisma.PurchaseRequisitionWhereInput {
    if (actor.role === "SELLER") return { requestedByUserId: actor.id };
    if (actor.role === "MANAGER") return { branchId: actor.branchId };
    if (actor.role === "PURCHASING") return { status: { not: "DRAFT" } };
    return {};
  }

  private async quoteChainIds(quoteId: string, rootQuoteId: string | null): Promise<string[]> {
    const rootId = rootQuoteId ?? quoteId;
    const rows = await prisma.quote.findMany({
      where: { OR: [{ id: rootId }, { rootQuoteId: rootId }] },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private toEntity(row: AssetRow): FileAttachmentEntity {
    const quoteLink = row.quoteAttachments[0];
    return {
      id: row.id,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksumSha256: row.checksumSha256,
      category: quoteLink?.category ?? "PURCHASE_SUPPLIER_PROPOSAL",
      clientDraftId: quoteLink?.clientDraftId ?? null,
      quoteId: quoteLink?.quoteId ?? null,
      clientItemIds: [...new Set(row.quoteAttachments.flatMap((link) => link.clientItemId ? [link.clientItemId] : []))],
      purchaseOfferIds: [...new Set(row.purchaseOfferAttachments.map((link) => link.purchaseSupplierOfferId))],
      uploadedByUserId: row.uploadedByUserId,
      uploadedByName: `${row.uploadedBy.firstName} ${row.uploadedBy.lastName}`.trim(),
      createdAt: row.createdAt,
    };
  }

  private toDownload(row: { id: string; originalName: string; storageKey: string; mimeType: string }): DownloadableFileEntity {
    return { id: row.id, originalName: row.originalName, storageKey: row.storageKey, mimeType: row.mimeType };
  }
}
