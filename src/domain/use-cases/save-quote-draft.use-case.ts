import type { UserRole } from "../../infrastructure/database/generated/enums";
import { SaveQuoteDraftRequestDto } from "../dtos/request/save-quote-draft-request.dto";
import { SaveQuoteDraftResponseDto } from "../dtos/response/save-quote-draft-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";
import { QuoteRepository } from "../repositories/quote.repository";
import { UserRepository } from "../repositories/user.repository";
import {
  formatQuoteItemReviewError,
  isImportedExcelItemReady,
  isQuoteItemReady,
} from "./quote-item-review.helper";
import { convertQuoteAmount } from "./quote-currency.helper";
import { getQuoteItemEffectiveCostAudit, getQuoteItemEffectiveUnitCost } from "./quote-item-fulfillment.helper";

interface SaveQuoteDraftActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

const round4 = (value: number): number => Number(value.toFixed(4));
const sameNumber = (left: number, right: number): boolean => Math.abs(left - right) < 0.0001;
const normalizedText = (value: string | null | undefined): string => (value || "").trim();
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
    private readonly internalApprovalEnabled = true,
    private readonly sellerExcelImportEnabled = true
  ) {}

  async execute(
    clientDraftId: string,
    dto: SaveQuoteDraftRequestDto,
    actor: SaveQuoteDraftActorContext
  ): Promise<SaveQuoteDraftResponseDto> {
    if (!clientDraftId || clientDraftId.length > 80) {
      throw new Error("clientDraftId must contain between 1 and 80 characters.");
    }

    const existingQuote = dto.quoteId
      ? await this.quoteRepository.findById({
          id: dto.quoteId,
          scope: { role: actor.role, userId: actor.id, branchId: actor.branchId },
        })
      : null;
    if (dto.quoteId && !existingQuote) throw new Error("Quote not found.");

    if (dto.quote.captureMethod === "EXCEL_IMPORT" && !this.sellerExcelImportEnabled) {
      throw new Error(existingQuote
        ? "Excel-imported quotes are read-only because seller Excel import is disabled."
        : "Seller Excel quote import is disabled.");
    }

    if (existingQuote?.captureMethod === "EXCEL_IMPORT") {
      if (dto.quote.captureMethod !== "EXCEL_IMPORT" || dto.quote.currency !== existingQuote.currency) {
        throw new Error("Capture method and currency are locked for Excel-imported quotes.");
      }

      const incomingItems = new Map(dto.items.map((item) => [item.clientItemId, item]));
      const itemsUnchanged = dto.items.length === existingQuote.items.length
        && existingQuote.items.every((item) => {
          const incoming = incomingItems.get(item.clientItemId || item.id);
          if (!incoming) return false;
          const incomingUnitPrice = incoming.sourceUnitPrice ?? incoming.unitPrice ?? 0;
          const incomingSourceCurrency = incoming.sourceCurrency ?? existingQuote.currency;
          const existingSourceCurrency = item.sourceCurrency ?? existingQuote.currency;
          const existingSourceUnitPrice = item.sourceUnitPrice ?? item.unitPrice;

          return normalizedText(incoming.productId) === normalizedText(item.productId)
            && normalizedText(incoming.externalProductCode) === normalizedText(item.externalProductCode)
            && normalizedText(incoming.ean) === normalizedText(item.ean)
            && normalizedText(incoming.customerDescription) === normalizedText(item.customerDescription)
            && normalizedText(incoming.customerUnit) === normalizedText(item.customerUnit)
            && normalizedText(incoming.unit) === normalizedText(item.unit)
            && sameNumber(incoming.qty, item.qty)
            && normalizedText(incoming.deliveryTime) === normalizedText(item.deliveryTime)
            && normalizedText(incoming.itemComment) === normalizedText(item.itemComment)
            && incomingSourceCurrency === existingSourceCurrency
            && sameNumber(incomingUnitPrice, existingSourceUnitPrice);
        });

      if (!itemsUnchanged) {
        throw new Error("Items from Excel-imported quotes are read-only.");
      }
    }

    if (
      dto.quote.captureMethod === "EXCEL_IMPORT"
      && dto.items.some((item) => item.productId || item.externalProductCode || item.ean)
    ) {
      throw new Error("Excel-imported quote items cannot be linked to ERP or local products.");
    }

    const customer = await this.customerRepository.findById({
      id: dto.quote.customerId,
      scope: { role: actor.role, branchId: actor.branchId },
    });
    if (!customer) throw new Error("Customer not found.");
    if (dto.quote.customerContactId && !customer.contacts.some((contact) => contact.id === dto.quote.customerContactId)) {
      throw new Error("Customer contact not found for selected customer.");
    }

    const providedByUser = dto.quote.providedByUserId
      ? await this.userRepository.findActiveById(dto.quote.providedByUserId)
      : null;
    if (dto.quote.providedByUserId && !providedByUser) {
      throw new Error("Provided by user not found or inactive.");
    }

    const existingItemsByClientId = new Map(
      (existingQuote?.items ?? []).map((item) => [item.clientItemId ?? item.id, item])
    );

    const effectiveCostEvaluatedAt = new Date();
    const items = dto.items.map((item) => {
      const existingItem = existingItemsByClientId.get(item.clientItemId);
      const customerDescriptionOriginal = existingItem?.customerDescriptionOriginal
        ?? item.customerDescriptionOriginal
        ?? item.customerDescription;
      const customerDescriptionChanged = existingItem
        ? normalizedText(existingItem.customerDescription) !== normalizedText(item.customerDescription)
        : Boolean(
            item.customerDescriptionEditedAt
            && normalizedText(customerDescriptionOriginal) !== normalizedText(item.customerDescription)
          );
      let unitPrice: number;
      let marginPct: number;
      const quoteCurrencyCost = getQuoteItemEffectiveUnitCost(
        {
          qty: item.qty,
          stock: item.stock,
          externalProductCode: item.externalProductCode,
          cost: item.cost,
          costCurrency: item.costCurrency,
          sellerQuotedUnitCost: item.sellerQuotedUnitCost,
          sellerQuotedCurrency: item.sellerQuotedCurrency,
          sellerQuotedExchangeRate: item.sellerQuotedExchangeRate,
        },
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
        const importedUnitPrice = convertQuoteAmount(
          sourceUnitPrice ?? 0,
          sourceCurrency ?? dto.quote.currency,
          dto.quote.currency,
          dto.quote.exchangeRate
        );
        unitPrice = round4(importedUnitPrice);
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

      const effectiveCostAudit = getQuoteItemEffectiveCostAudit({
        qty: item.qty,
        stock: item.stock,
        externalProductCode: item.externalProductCode,
        cost: item.cost,
        costCurrency: item.costCurrency,
        sellerQuotedUnitCost: item.sellerQuotedUnitCost,
        sellerQuotedCurrency: item.sellerQuotedCurrency,
        sellerQuotedExchangeRate: item.sellerQuotedExchangeRate,
        unitPrice,
      }, dto.quote.currency, dto.quote.exchangeRate);

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
        ? item.sourceRequiresReview || !isImportedExcelItemReady(readinessInput)
        : !isQuoteItemReady(readinessInput);

      return {
        clientItemId: item.clientItemId,
        productId: item.productId,
        externalProductCode: item.externalProductCode,
        ean: item.ean,
        customerDescription: item.customerDescription,
        customerDescriptionOriginal,
        customerDescriptionEditedAt: customerDescriptionChanged
          ? new Date()
          : existingItem?.customerDescriptionEditedAt ?? null,
        customerDescriptionEditedByUserId: customerDescriptionChanged
          ? actor.id
          : existingItem?.customerDescriptionEditedByUserId ?? null,
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
        sellerCostSource: item.sellerCostSource,
        sellerQuotedCurrency: item.sellerQuotedCurrency,
        sellerQuotedExchangeRate: item.sellerQuotedExchangeRate === null ? null : round4(item.sellerQuotedExchangeRate),
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
        technicalAttributes: item.technicalAttributes,
        cost: round4(item.cost),
        costCurrency: item.costCurrency,
        erpSaleCurrency: item.erpSaleCurrency,
        marginPct,
        effectiveCostAtQuote: round4(effectiveCostAudit.effectiveCostAtQuote),
        isBelowEffectiveCost: effectiveCostAudit.isBelowEffectiveCost,
        effectiveCostVariance: round4(effectiveCostAudit.effectiveCostVariance),
        effectiveCostVariancePct: round4(effectiveCostAudit.effectiveCostVariancePct),
        effectiveCostEvaluatedAt,
        effectiveCostEvaluatedByUserId: actor.id,
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
        throw new Error(formatQuoteItemReviewError(
          items.map((item) => ({
            productId: item.productId,
            externalProductCode: item.externalProductCode,
            ean: item.ean,
            erpDescription: item.erpDescription,
            customerDescription: item.customerDescription,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            deliveryTime: item.deliveryTime,
            sourceRequiresReview: item.sourceRequiresReview,
          })),
          dto.quote.captureMethod === "EXCEL_IMPORT",
          "Quote items require review"
        ));
      }
      if (items.some((item) => item.unitPrice <= 0)) {
        throw new Error("All quote items must have a seller price before submitting for approval.");
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
        customerContactId: dto.quote.customerContactId,
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
