import assert from "node:assert/strict";
import test from "node:test";
import { FileStoragePort } from "../src/domain/contracts/file-storage.port";
import type { WhatsAppInboxRepository } from "../src/domain/repositories/whatsapp-inbox.repository";
import { DeleteWhatsAppConversationUseCase } from "../src/domain/use-cases/delete-whatsapp-conversation.use-case";

const actor = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "ADMIN" as const,
  branchId: "22222222-2222-4222-8222-222222222222",
};

class StorageStub extends FileStoragePort {
  readonly deleted: string[] = [];
  async save(): Promise<never> { throw new Error("Not implemented."); }
  async read(): Promise<null> { return null; }
  async delete(storageKey: string): Promise<void> { this.deleted.push(storageKey); }
}

test("deletes temporary chat files while preserving quote-related records", async () => {
  const storage = new StorageStub();
  const repository = {
    deleteConversation: async () => ({
      conversationId: "33333333-3333-4333-8333-333333333333",
      storageKeysToDelete: ["2026/09/chat-file.pdf"],
      deletedProspect: false,
      preservedQuoteCount: 2,
      preservedQuoteFileCount: 1,
      audience: {
        userIds: [actor.id],
        branchIds: [actor.branchId],
        assignedSellerId: actor.id,
        assignedBranchId: actor.branchId,
        visibleToUnassignedLeadManagers: false,
      },
    }),
  } as unknown as WhatsAppInboxRepository;
  const result = await new DeleteWhatsAppConversationUseCase(repository, storage).execute(
    "33333333-3333-4333-8333-333333333333",
    actor,
  );

  assert.deepEqual(storage.deleted, ["2026/09/chat-file.pdf"]);
  assert.equal(result.deletedFileCount, 1);
  assert.equal(result.failedFileCount, 0);
  assert.equal(result.preservedQuoteCount, 2);
  assert.equal(result.preservedQuoteFileCount, 1);
});

test("rejects deletion when the conversation is outside the actor scope", async () => {
  const repository = {
    deleteConversation: async () => null,
  } as unknown as WhatsAppInboxRepository;
  const storage = new StorageStub();

  await assert.rejects(
    () => new DeleteWhatsAppConversationUseCase(repository, storage).execute("missing", actor),
    /no encontrada/i,
  );
  assert.deepEqual(storage.deleted, []);
});

test("rejects conversation deletion for managers and sellers", async () => {
  let repositoryCalls = 0;
  const repository = {
    deleteConversation: async () => {
      repositoryCalls += 1;
      return null;
    },
  } as unknown as WhatsAppInboxRepository;
  const storage = new StorageStub();
  const useCase = new DeleteWhatsAppConversationUseCase(repository, storage);

  for (const role of ["MANAGER", "SELLER"] as const) {
    await assert.rejects(
      () => useCase.execute("33333333-3333-4333-8333-333333333333", { ...actor, role }),
      /Only ADMIN/,
    );
  }

  assert.equal(repositoryCalls, 0);
  assert.deepEqual(storage.deleted, []);
});
