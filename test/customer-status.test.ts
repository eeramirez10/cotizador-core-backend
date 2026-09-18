import assert from "node:assert/strict";
import test from "node:test";
import { GetCustomersQueryRequestDto } from "../src/domain/dtos/request/get-customers-query-request.dto";
import type { CustomerRepository } from "../src/domain/repositories/customer.repository";
import { ReactivateCustomerUseCase } from "../src/domain/use-cases/reactivate-customer.use-case";
import { ResetCustomerWhatsAppTestUseCase } from "../src/domain/use-cases/reset-customer-whatsapp-test.use-case";
import { FileStoragePort } from "../src/domain/contracts/file-storage.port";

test("customer listings default to active customers", () => {
  const [error, dto] = GetCustomersQueryRequestDto.create({});
  assert.equal(error, undefined);
  assert.equal(dto?.active, true);
});

test("customer listings accept inactive and all filters", () => {
  const [, inactive] = GetCustomersQueryRequestDto.create({ active: "false" });
  const [, all] = GetCustomersQueryRequestDto.create({ active: "all" });
  assert.equal(inactive?.active, false);
  assert.equal(all?.active, undefined);
});

test("reactivates an inactive customer within the actor scope", async () => {
  let receivedActiveStatus: boolean | null = null;
  const repository = {
    setActiveStatus: async (params: { isActive: boolean }) => {
      receivedActiveStatus = params.isActive;
      return true;
    },
  } as unknown as CustomerRepository;

  await new ReactivateCustomerUseCase(repository).execute("customer-1", {
    id: "admin-1",
    role: "ADMIN",
    branchId: "branch-1",
  });
  assert.equal(receivedActiveStatus, true);
});

class StorageStub extends FileStoragePort {
  readonly deleted: string[] = [];
  async save(): Promise<never> { throw new Error("Not implemented."); }
  async read(): Promise<null> { return null; }
  async delete(storageKey: string): Promise<void> { this.deleted.push(storageKey); }
}

test("development admin can reset a customer WhatsApp test identity", async () => {
  const storage = new StorageStub();
  let resetCustomerId = "";
  const repository = {
    resetWhatsAppTestIdentity: async (params: { id: string }) => {
      resetCustomerId = params.id;
      return { customerId: params.id, storageKeysToDelete: ["temporary/test.pdf"], conversations: [] };
    },
  } as unknown as CustomerRepository;
  const useCase = new ResetCustomerWhatsAppTestUseCase(repository, storage, true);

  await useCase.execute("customer-1", "REINICIAR", { id: "admin-1", role: "ADMIN" });
  assert.equal(resetCustomerId, "customer-1");
  assert.deepEqual(storage.deleted, ["temporary/test.pdf"]);
});

test("WhatsApp test reset is unavailable outside development", async () => {
  const useCase = new ResetCustomerWhatsAppTestUseCase(
    {} as CustomerRepository,
    new StorageStub(),
    false,
  );
  await assert.rejects(
    () => useCase.execute("customer-1", "REINICIAR", { id: "admin-1", role: "ADMIN" }),
    /only available in development/i,
  );
});
