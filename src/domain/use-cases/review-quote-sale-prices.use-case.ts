import type { UserRole } from "../../infrastructure/database/generated/enums";
import { QuoteResponseDto } from "../dtos/response/quote-response.dto";
import { QuoteRepository } from "../repositories/quote.repository";

export class ReviewQuoteSalePricesUseCase {
  constructor(private readonly quotes: QuoteRepository) {}

  async execute(quoteId: string, input: unknown, actor: { id: string; role: UserRole; branchId: string }) {
    if (actor.role !== "SELLER") throw new Error("Solo el vendedor puede confirmar precios de venta.");
    const body = input as { items?: Array<{ itemId?: unknown; expectedUnitCost?: unknown; unitPrice?: unknown }> } | null;
    if (!body || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
      throw new Error("Selecciona entre 1 y 100 partidas para revisar.");
    }
    const items = body.items.map((item) => ({
      itemId: item?.itemId,
      expectedUnitCost: item?.expectedUnitCost,
      unitPrice: item?.unitPrice,
    }));
    if (items.some((item) => typeof item.itemId !== "string" || !item.itemId.trim()
      || typeof item.expectedUnitCost !== "number" || !Number.isFinite(item.expectedUnitCost) || item.expectedUnitCost < 0
      || typeof item.unitPrice !== "number" || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0)
      || new Set(items.map((item) => item.itemId)).size !== items.length) {
      throw new Error("Las partidas, costos y precios de venta deben ser válidos y sin duplicados.");
    }
    const updated = await this.quotes.reviewSalePrices({ quoteId,
      scope: { role: actor.role, userId: actor.id, branchId: actor.branchId }, actorUserId: actor.id,
      items: items as Array<{ itemId: string; expectedUnitCost: number; unitPrice: number }>,
    });
    if (!updated) throw new Error("Cotización no encontrada.");
    return new QuoteResponseDto(updated);
  }
}
