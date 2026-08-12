import assert from "node:assert/strict";
import test from "node:test";
import type { SaveQuoteDraftDatasourceParams } from "../src/domain/datasources/quote.datasource";
import { CreateQuoteItemRequestDto } from "../src/domain/dtos/request/create-quote-item-request.dto";
import { CreateQuoteRequestDto } from "../src/domain/dtos/request/create-quote-request.dto";
import { SaveQuoteDraftRequestDto } from "../src/domain/dtos/request/save-quote-draft-request.dto";
import { CustomerRepository } from "../src/domain/repositories/customer.repository";
import { QuoteRepository } from "../src/domain/repositories/quote.repository";
import { UserRepository } from "../src/domain/repositories/user.repository";
import { SaveQuoteDraftUseCase } from "../src/domain/use-cases/save-quote-draft.use-case";

const item = (overrides: Partial<ConstructorParameters<typeof CreateQuoteItemRequestDto>[0]> = {}) =>
  new CreateQuoteItemRequestDto({
    clientItemId: "item-1",
    productId: "local-product-1",
    externalProductCode: null,
    ean: null,
    customerDescription: "VALVULA ESPECIAL",
    customerDescriptionOriginal: "VALVULA ESPECIAL",
    customerDescriptionEditedAt: null,
    customerUnit: "PZ",
    erpDescription: "VALVULA ESPECIAL",
    unit: "PZ",
    qty: 10,
    stock: 0,
    deliveryTime: "3-5 dias",
    itemComment: null,
    sellerSupplierId: null,
    sellerSupplierNameSnapshot: null,
    sellerQuotedUnitCost: null,
    sellerQuotedCurrency: null,
    sellerQuotedExchangeRate: null,
    sellerQuotedBrand: null,
    sellerSupplierDescription: null,
    sellerSupplierOrigin: null,
    sellerSupplierQuoteValidUntil: null,
    sellerSupplierQuoteReference: null,
    sellerSupplierQuoteNotes: null,
    sellerOriginRestrictions: [],
    sellerDeliveryState: null,
    sellerSupplierDeliveryTime: null,
    purchaseStandard: null,
    purchaseDiameter: null,
    purchaseThickness: null,
    purchaseBore: null,
    technicalFamily: null,
    technicalAttributes: {},
    cost: 0,
    costCurrency: "MXN",
    erpSaleCurrency: null,
    marginPct: 20,
    unitPrice: 100,
    sourceRequiresReview: false,
    requiresReview: false,
    ...overrides,
  });

test("local and out-of-stock items can be quoted without preliminary purchasing data", async () => {
  let savedParams: SaveQuoteDraftDatasourceParams | null = null;
  const quoteRepository = {
    saveDraft: async (params: SaveQuoteDraftDatasourceParams) => {
      savedParams = params;
      return {
        id: "quote-1",
        quoteNumber: "QT-TEST-1",
        clientDraftId: params.clientDraftId,
        status: params.submissionStatus,
      };
    },
  } as unknown as QuoteRepository;
  const customerRepository = {
    findById: async () => ({ id: "customer-1" }),
  } as unknown as CustomerRepository;
  const userRepository = {} as UserRepository;
  const useCase = new SaveQuoteDraftUseCase(
    quoteRepository,
    customerRepository,
    userRepository,
    false,
  );
  const quote = new CreateQuoteRequestDto({
    customerId: "customer-1",
    currency: "MXN",
    exchangeRate: 17.25,
    exchangeRateDate: new Date("2026-08-12T00:00:00.000Z"),
    taxRate: 0.16,
    deliveryPlace: "QUERETARO",
    paymentTerms: "CONTADO",
    commercialConditions: "CONDICIONES GENERALES",
    validityDays: 15,
    origin: "MANUAL",
    captureMethod: "SYSTEM",
    originalQuoteDate: null,
    sourceChannel: "PHONE",
    providedByUserId: null,
    notes: null,
  });
  const dto = new SaveQuoteDraftRequestDto(quote, null, "SUBMIT_FOR_APPROVAL", [
    item(),
    item({
      clientItemId: "item-2",
      productId: null,
      externalProductCode: "01300001",
      ean: "750000000001",
      stock: 2,
      qty: 10,
      cost: 50,
      erpSaleCurrency: "MXN",
    }),
  ]);

  const result = await useCase.execute("draft-1", dto, {
    id: "seller-1",
    role: "SELLER",
    branchId: "branch-1",
  });

  assert.equal(result.toJSON().status, "QUOTED");
  assert.ok(savedParams);
  assert.equal(savedParams.action, "SUBMIT_FOR_APPROVAL");
  assert.equal(savedParams.items.length, 2);
  assert.equal(savedParams.items[0].sellerSupplierId, null);
  assert.equal(savedParams.items[1].sellerQuotedUnitCost, null);
  assert.equal(savedParams.items[1].sellerCostSource, "ERP_COST");
});
