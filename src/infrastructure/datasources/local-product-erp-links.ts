import { erpUnitsMatch, RequisitionErpLinkError } from "../../domain/use-cases/requisition-erp-link-rule";
import type { PurchaseRequisitionActor } from "../../domain/datasources/purchase-requisition.datasource";
import type { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

type LinkedItem = { productId?: string | null; externalProductCode?: string | null; unit: string };

export async function assertVerifiedLocalQuoteLinks(
  db: Pick<Prisma.TransactionClient, "product" | "localProductErpLink">,
  branchId: string,
  items: LinkedItem[],
) {
  const candidates = items.filter(item => item.productId && item.externalProductCode?.trim());
  if (!candidates.length) return;
  const ids = [...new Set(candidates.map(item => item.productId!))];
  const local = await db.product.findMany({ where: { id: { in: ids }, source: "LOCAL_TEMP" }, select: { id: true } });
  if (!local.length) return;
  const localIds = new Set(local.map(product => product.id));
  const links = await db.localProductErpLink.findMany({ where: { branchId, productId: { in: [...localIds] } } });
  const byProduct = new Map(links.map(link => [link.productId, link]));
  for (const item of candidates) {
    if (!localIds.has(item.productId!)) continue;
    const link = byProduct.get(item.productId!);
    if (!link || link.erpCode !== item.externalProductCode?.trim() || !erpUnitsMatch(item.unit, link.erpUnit)) {
      throw new RequisitionErpLinkError("La partida local necesita un código ERP verificado para esta sucursal y unidad.", 409);
    }
  }
}

export async function listLocalProductErpLinks(productId: string, actor: PurchaseRequisitionActor, includeRequisitions: boolean) {
  const product = await prisma.product.findFirst({ where: { id: productId, source: "LOCAL_TEMP" }, select: { id: true } });
  if (!product) return null;
  const branchScope = actor.role === "ADMIN" ? {} : { branchId: actor.branchId };
  const links = await prisma.localProductErpLink.findMany({
    where: { productId, ...branchScope },
    select: { branch: { select: { id: true, code: true, name: true } }, erpCode: true, erpEan: true, erpDescription: true, erpUnit: true, verifiedAt: true },
    orderBy: { branch: { code: "asc" } },
  });
  const items = includeRequisitions ? await prisma.purchaseRequisitionItem.findMany({
    where: { productId, status: { not: "CANCELLED" }, requisition: {
      ...branchScope, status: { not: "CANCELLED" },
      quote: { archivedAt: null, status: { notIn: ["CANCELLED", "REJECTED", "SUPERSEDED"] } },
      ...(actor.role === "SELLER" ? { requestedByUserId: actor.id } : {}),
      ...(actor.role === "PURCHASING" ? { status: { notIn: ["DRAFT", "CANCELLED"] } } : {}),
    } },
    select: { id: true, requisition: { select: { id: true, requisitionNumber: true, quote: { select: { status: true } }, branch: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" }, take: 50,
  }) : [];
  return { links, requisitions: items.map(({ id: itemId, requisition }) => ({
    itemId, id: requisition.id, number: requisition.requisitionNumber,
    branchName: requisition.branch.name, quoteStatus: requisition.quote.status,
  })) };
}
