import assert from "node:assert/strict";
import test from "node:test";
import type { ErpOrderLookupPort } from "../src/domain/contracts/erp-order-lookup.port";
import { RegisterErpOrderRequestDto } from "../src/domain/dtos/request/register-erp-order-request.dto";
import type { CustomerEntity } from "../src/domain/entities/customer.entity";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import type { CustomerRepository } from "../src/domain/repositories/customer.repository";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";
import { RegisterErpOrderUseCase } from "../src/domain/use-cases/register-erp-order.use-case";

const actor = { id: "seller-1", role: "SELLER" as const, branchId: "branch-1" };

function setup(options: {
  branchCode?: string;
  captureMethod?: "SYSTEM" | "EXCEL_IMPORT";
  status?: "APPROVED" | "QUOTED";
  orderStatus?: "GENERATED" | "NOT_GENERATED";
  currentOrderNumber?: string | null;
  customerCode?: string | null;
  erpCustomerCode?: string | null;
  found?: boolean;
} = {}) {
  const quote = {
    id: "quote-1", customerId: "customer-1", archivedAt: null,
    branch: { code: options.branchCode ?? "01" },
    status: options.status ?? "APPROVED",
    captureMethod: options.captureMethod ?? "SYSTEM",
    orderStatus: options.orderStatus ?? "GENERATED",
    erpOrderNumber: options.currentOrderNumber ?? null,
  } as QuoteEntity;
  const calls = { lookup: 0, registered: 0 };
  const quotes = {
    findById: async () => quote,
    registerErpOrder: async ({ erpOrderNumber }: { erpOrderNumber: string }) => {
      calls.registered++;
      return { ...quote, erpOrderNumber };
    },
  } as QuoteRepository;
  const customers = {
    findById: async () => ({ code: options.customerCode === undefined ? "CLI-1" : options.customerCode }) as CustomerEntity,
  } as CustomerRepository;
  const lookup = {
    findByNumber: async (orderNumber: string) => {
      calls.lookup++;
      return options.found === false ? null : {
        orderNumber,
        customerCode: options.erpCustomerCode === undefined ? "CLI-1" : options.erpCustomerCode,
      };
    },
  } as ErpOrderLookupPort;
  return { useCase: new RegisterErpOrderUseCase(quotes, customers, lookup), calls };
}

const dto = (erpOrderNumber: string) => RegisterErpOrderRequestDto.create({ erpOrderNumber })[1]!;

test("ERP order link requires an approved system quote with generated TXT", async () => {
  for (const options of [
    { captureMethod: "EXCEL_IMPORT" as const },
    { status: "QUOTED" as const },
    { orderStatus: "NOT_GENERATED" as const },
  ]) {
    const { useCase, calls } = setup(options);
    await assert.rejects(useCase.execute("quote-1", dto("P021827"), actor));
    assert.equal(calls.lookup, 0);
  }
});

test("ERP order prefix must match the quote branch", async () => {
  const cases = [
    ["01", "P021827"], ["02", "PB021827"], ["03", "PE021827"],
    ["04", "PD021827"], ["05", "PF021827"], ["06", "PG021827"], ["07", "PH021827"],
  ];
  for (const [branchCode, number] of cases) {
    const { useCase, calls } = setup({ branchCode });
    await useCase.execute("quote-1", dto(number), actor);
    assert.equal(calls.registered, 1);
  }
  const mexico = setup();
  await assert.rejects(mexico.useCase.execute("quote-1", dto("PB021827"), actor), /must start with P/);
  assert.equal(mexico.calls.lookup, 0);
});

test("ERP order must exist and belong to the linked customer", async () => {
  const missing = setup({ found: false });
  await assert.rejects(missing.useCase.execute("quote-1", dto("P021827"), actor), /does not exist/);
  const otherCustomer = setup({ erpCustomerCode: "CLI-OTHER" });
  await assert.rejects(otherCustomer.useCase.execute("quote-1", dto("P021827"), actor), /different customer/);
  assert.equal(otherCustomer.calls.registered, 0);
});

test("linking the same ERP order is idempotent", async () => {
  const { useCase, calls } = setup({ currentOrderNumber: "P021827" });
  await useCase.execute("quote-1", dto("P021827"), actor);
  assert.equal(calls.lookup, 0);
  assert.equal(calls.registered, 0);
});

test("local customer can link an existing ERP order without an ERP customer code", async () => {
  const { useCase, calls } = setup({ customerCode: null });
  await useCase.execute("quote-1", dto("P021827"), actor);
  assert.equal(calls.registered, 1);
});
