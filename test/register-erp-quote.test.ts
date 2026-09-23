import assert from "node:assert/strict";
import test from "node:test";
import type { ErpQuoteLookupPort, ErpQuoteReference } from "../src/domain/contracts/erp-quote-lookup.port";
import { RegisterErpQuoteRequestDto } from "../src/domain/dtos/request/register-erp-quote-request.dto";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import type { CustomerEntity } from "../src/domain/entities/customer.entity";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";
import type { CustomerRepository } from "../src/domain/repositories/customer.repository";
import { RegisterErpQuoteUseCase } from "../src/domain/use-cases/register-erp-quote.use-case";

const actor = { id: "seller-1", role: "SELLER" as const, branchId: "branch-1" };
const [, dto] = RegisterErpQuoteRequestDto.create({ erpQuoteNumber: "COT-123" });

function setup(options: {
  captureMethod?: "SYSTEM" | "EXCEL_IMPORT";
  status?: "APPROVED" | "QUOTED";
  orderStatus?: "GENERATED" | "NOT_GENERATED";
  erpQuoteNumber?: string | null;
  customerCode?: string | null;
  erpCustomerCode?: string | null;
  found?: boolean;
} = {}) {
  const quote = {
    id: "quote-1", customerId: "customer-1", archivedAt: null,
    status: options.status ?? "APPROVED",
    captureMethod: options.captureMethod ?? "EXCEL_IMPORT",
    orderStatus: options.orderStatus ?? "GENERATED",
    erpQuoteNumber: options.erpQuoteNumber ?? null,
  } as QuoteEntity;
  const calls = { lookup: 0, registered: 0 };
  const quotes = {
    findById: async () => quote,
    registerErpQuote: async ({ erpQuoteNumber }: { erpQuoteNumber: string }) => {
      calls.registered++;
      return { ...quote, erpQuoteNumber };
    },
  } as QuoteRepository;
  const customers = {
    findById: async () => ({ code: options.customerCode ?? "CLI-1" }) as CustomerEntity,
  } as CustomerRepository;
  const lookup = {
    findByNumber: async (): Promise<ErpQuoteReference | null> => {
      calls.lookup++;
      return options.found === false ? null : {
        quoteNumber: "COT-123", customerCode: options.erpCustomerCode ?? "CLI-1",
      };
    },
  } as ErpQuoteLookupPort;
  return { useCase: new RegisterErpQuoteUseCase(quotes, customers, lookup), calls };
}

test("system quote cannot use the imported ERP quote field", async () => {
  const { useCase, calls } = setup({ captureMethod: "SYSTEM" });
  await assert.rejects(useCase.execute("quote-1", dto!, actor), /Only Excel-imported quotes/);
  assert.equal(calls.lookup, 0);
});

test("ERP folio must exist and belong to the quote customer", async () => {
  const missing = setup({ found: false });
  await assert.rejects(missing.useCase.execute("quote-1", dto!, actor), /does not exist in Proscai/);
  assert.equal(missing.calls.registered, 0);

  const otherCustomer = setup({ erpCustomerCode: "CLI-OTHER" });
  await assert.rejects(otherCustomer.useCase.execute("quote-1", dto!, actor), /different customer/);
  assert.equal(otherCustomer.calls.registered, 0);
});

test("validated folio is registered for an imported quote", async () => {
  const { useCase, calls } = setup();
  await useCase.execute("quote-1", dto!, actor);
  assert.equal(calls.lookup, 1);
  assert.equal(calls.registered, 1);
});

test("imported approved quote does not require TXT, but folio is still validated", async () => {
  const { useCase, calls } = setup({ captureMethod: "EXCEL_IMPORT", orderStatus: "NOT_GENERATED" });
  await useCase.execute("quote-1", dto!, actor);
  assert.equal(calls.lookup, 1);
  assert.equal(calls.registered, 1);
});

test("re-registering the same folio is idempotent", async () => {
  const { useCase, calls } = setup({ erpQuoteNumber: "COT-123" });
  await useCase.execute("quote-1", dto!, actor);
  assert.equal(calls.lookup, 0);
  assert.equal(calls.registered, 0);
});
