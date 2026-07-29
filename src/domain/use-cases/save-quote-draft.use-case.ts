import type { UserRole } from "../../infrastructure/database/generated/enums";
import { SaveQuoteDraftRequestDto } from "../dtos/request/save-quote-draft-request.dto";
import { SaveQuoteDraftResponseDto } from "../dtos/response/save-quote-draft-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { UserRepository } from "../repositories/user.repository";
import { isImportedExcelItemReady, isQuoteItemReady } from "./quote-item-review.helper";
import { convertQuoteAmount } from "./quote-currency.helper";

interface SaveQuoteDraftActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const round4 = (value: number): number => Number(value.toFixed(4));
const isErpWithoutEnoughStock = (item: {
  externalProductCode: string | null;
  stock: number | null;
  qty: number;
}): boolean => {
  return Boolean(item.externalProductCode?.trim())
    && Math.max(0, item.stock ?? 0) < item.qty;
};

const buildQuoteNumber = (): string => {
  const now = new Date();
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
  return `QT-${date}-${Math.floor(100000 + Math.random() * 900000)}`;
};

export class SaveQuoteDraftUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly userRepository: UserRepository,
    private readonly internalApprovalEnabled = true
  ) {}

  async execute(
    clientDraftId: string,
    dto: SaveQuoteDraftRequestDto,
    actor: SaveQuoteDraftActorContext
  ): Promise<SaveQuoteDraftResponseDto> {
    if (!clientDraftId || clientDraftId.length > 80) {
      throw new Error("clientDraftId must contain between 1 and 80 characters.");
    }

    const customer = await this.customerRepository.findById({
      id: dto.quote.customerId,
      scope: { role: actor.role, branchId: actor.branchId },
    });
    if (!customer) throw new Error("Customer not found.");

    const providedByUser = dto.quote.providedByUserId
      ? await this.userRepository.findActiveById(dto.quote.providedByUserId)
      : null;
    if (dto.quote.providedByUserId && !providedByUser) {
      throw new Error("Provided by user not found or inactive.");
    }

    const items = dto.items.map((item) => {
      let unitPrice: number;
      let marginPct: number;
      const quoteCurrencyCost = convertQuoteAmount(
        item.cost,
        item.costCurrency,
        dto.quote.currency,
        dto.quote.exchangeRate
      );

      const sourceCurrency = dto.quote.captureMethod === "EXCEL_IMPORT"
        ? item.sourceCurrency ?? dto.quote.currency
        : null;
      const sourceUnitPrice = dto.quote.captureMethod === "EXCEL_IMPORT"
        ? typeof item.sourceUnitPrice === "number"
          ? item.sourceUnitPrice
          : typeof item.unitPrice === "number"
            ? item.unitPrice
            : 0
        : null;
      const sourceSubtotal = dto.quote.captureMethod === "EXCEL_IMPORT"
        ? typeof item.sourceSubtotal === "number"
          ? item.sourceSubtotal
          : round4(item.qty * (sourceUnitPrice ?? 0))
        : null;

      if (dto.quote.captureMethod === "EXCEL_IMPORT") {
        const importedUnitPrice = sourceUnitPrice ?? 0;
        unitPrice = round4(convertQuoteAmount(importedUnitPrice, sourceCurrency!, dto.quote.currency, dto.quote.exchangeRate));
        marginPct = quoteCurrencyCost === 0 ? 0 : round4(((unitPrice - quoteCurrencyCost) / quoteCurrencyCost) * 100);
      } else if (typeof item.unitPrice === "number" && typeof item.marginPct === "number") {
        unitPrice = round4(item.unitPrice);
        marginPct = quoteCurrencyCost === 0 ? 0 : round4(((unitPrice - quoteCurrencyCost) / quoteCurrencyCost) * 100);
      } else if (typeof item.unitPrice === "number") {
        unitPrice = round4(item.unitPrice);
        marginPct = quoteCurrencyCost === 0 ? 0 : round4(((unitPrice - quoteCurrencyCost) / quoteCurrencyCost) * 100);
      } else if (typeof item.marginPct === "number") {
        marginPct = round4(item.marginPct);
        unitPrice = round4(quoteCurrencyCost * (1 + marginPct / 100));
      } else {
        unitPrice = round4(quoteCurrencyCost);
        marginPct = 0;
      }

      const readinessInput = {
        productId: item.productId,
        externalProductCode: item.externalProductCode,
        ean: item.ean,
        erpDescription: item.erpDescription,
        customerDescription: item.customerDescription,
        qty: item.qty,
        unit: item.unit,
        unitPrice,
        deliveryTime: item.deliveryTime,
      };
      const requiresReview = dto.quote.captureMethod === "EXCEL_IMPORT"
        ? !isImportedExcelItemReady(readinessInput)
        : !isQuoteItemReady(readinessInput);

      return {
        clientItemId: item.clientItemId,
        productId: item.productId,
        externalProductCode: item.externalProductCode,
        ean: item.ean,
        customerDescription: item.customerDescription,
        customerUnit: item.customerUnit,
        erpDescription: item.erpDescription,
        unit: item.unit,
        qty: round4(item.qty),
        stock: item.stock === null ? null : round4(item.stock),
        deliveryTime: item.deliveryTime,
        itemComment: item.itemComment,
        sellerSupplierId: item.sellerSupplierId,
        sellerSupplierNameSnapshot: item.sellerSupplierNameSnapshot,
        sellerQuotedUnitCost: item.sellerQuotedUnitCost === null ? null : round4(item.sellerQuotedUnitCost),
        sellerQuotedCurrency: item.sellerQuotedCurrency,
        sellerQuotedBrand: item.sellerQuotedBrand,
        sellerOriginRestrictions: item.sellerOriginRestrictions,
        sellerDeliveryState: item.sellerDeliveryState,
        sellerSupplierDeliveryTime: item.sellerSupplierDeliveryTime,
        purchaseStandard: item.purchaseStandard,
        purchaseDiameter: item.purchaseDiameter,
        purchaseThickness: item.purchaseThickness,
        purchaseBore: item.purchaseBore,
        cost: round4(item.cost),
        costCurrency: item.costCurrency,
        marginPct,
        sourceCurrency,
        sourceUnitPrice: sourceUnitPrice === null ? null : round4(sourceUnitPrice),
        sourceSubtotal: sourceSubtotal === null ? null : round4(sourceSubtotal),
        unitPrice,
        subtotal: round4(item.qty * unitPrice),
        sourceRequiresReview: item.sourceRequiresReview,
        requiresReview,
      };
    });

    if (dto.action === "SUBMIT_FOR_APPROVAL") {
      if (items.length === 0) throw new Error("Quote must contain at least one item before submitting for approval.");
      if (dto.quote.sourceChannel === "UNSPECIFIED") {
        throw new Error("Quote source channel is required before submitting for approval.");
      }
      if (!dto.quote.commercialConditions?.trim()) {
        throw new Error("Commercial conditions are required before submitting for approval.");
      }
      if (dto.quote.captureMethod !== "EXCEL_IMPORT" && items.some((item) => !item.productId && !item.externalProductCode)) {
        throw new Error("All quote items must be linked to an ERP or local product before submitting for approval.");
      }
      if (items.some((item) => item.requiresReview)) {
        throw new Error("All quote items must be reviewed before submitting for approval.");
      }
      if (items.some((item) => item.unitPrice <= 0)) {
        throw new Error("All quote items must have a seller price before submitting for approval.");
      }
      if (items.some((item) => item.marginPct < -0.0001 && !isErpWithoutEnoughStock(item))) {
        throw new Error("Seller price cannot be lower than ERP cost.");
      }
      if (dto.quote.captureMethod !== "EXCEL_IMPORT") {
        const incompletePurchaseData = items.filter((item) => {
          const hasErpCode = Boolean(item.externalProductCode?.trim());
          const isLocalProduct = !hasErpCode && Boolean(item.productId);
          const requiresPurchasing = isLocalProduct || (hasErpCode && Math.max(0, item.stock ?? 0) < item.qty);
          if (!requiresPurchasing) return false;
          return !item.sellerSupplierNameSnapshot?.trim()
            || !item.sellerQuotedCurrency
            || item.sellerQuotedUnitCost === null
            || item.sellerQuotedUnitCost <= 0
            || !item.sellerDeliveryState?.trim()
            || !item.sellerSupplierDeliveryTime?.trim();
        });
        if (incompletePurchaseData.length > 0) {
          throw new Error("Complete supplier, quoted cost, delivery state and supplier delivery time for every local or out-of-stock item.");
        }
      }
    }

    const result = await this.quoteRepository.saveDraft({
      clientDraftId,
      quoteId: dto.quoteId,
      quoteNumber: buildQuoteNumber(),
      action: dto.action,
      submissionStatus: this.internalApprovalEnabled ? "PENDING_APPROVAL" : "QUOTED",
      data: {
        origin: dto.quote.origin,
        captureMethod: dto.quote.captureMethod,
        originalQuoteDate: dto.quote.originalQuoteDate,
        sourceChannel: dto.quote.sourceChannel,
        currency: dto.quote.currency,
        exchangeRate: dto.quote.exchangeRate,
        exchangeRateDate: dto.quote.exchangeRateDate,
        taxRate: dto.quote.taxRate,
        deliveryPlace: dto.quote.deliveryPlace,
        paymentTerms: dto.quote.paymentTerms,
        commercialConditions: dto.quote.commercialConditions,
        validityDays: dto.quote.validityDays,
        branchId: actor.branchId,
        customerId: dto.quote.customerId,
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
        providedByUserId: providedByUser?.id ?? null,
        providedByNameSnapshot: providedByUser ? `${providedByUser.firstName} ${providedByUser.lastName}`.trim() : null,
        providedByBranchNameSnapshot: providedByUser?.branch.name ?? null,
        providedAt: providedByUser ? new Date() : null,
        providedByAssignedByUserId: providedByUser ? actor.id : null,
        notes: dto.quote.notes,
      },
      items,
      scope: { role: actor.role, userId: actor.id, branchId: actor.branchId },
    });

    return new SaveQuoteDraftResponseDto(result);
  }
}
