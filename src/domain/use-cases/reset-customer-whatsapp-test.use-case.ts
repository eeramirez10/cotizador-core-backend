import type { FileStoragePort } from "../contracts/file-storage.port";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import type { CustomerRepository } from "../repositories/customer.repository";

interface Actor {
  id: string;
  role: string;
}

export class ResetCustomerWhatsAppTestUseCase {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly storage: FileStoragePort,
    private readonly enabled: boolean,
    private readonly realtime?: WhatsAppRealtimePublisher,
  ) {}

  async execute(customerId: string, confirmation: string, actor: Actor): Promise<void> {
    if (!this.enabled) throw new Error("WhatsApp test reset is only available in development.");
    if (actor.role !== "ADMIN") throw new Error("Only ADMIN can reset WhatsApp test identities.");
    if (confirmation.trim() !== "REINICIAR") throw new Error("Type REINICIAR to confirm the test reset.");

    const reset = await this.customerRepository.resetWhatsAppTestIdentity({
      id: customerId,
      actorUserId: actor.id,
    });
    if (!reset) throw new Error("Customer not found.");

    const cleanup = await Promise.allSettled(
      reset.storageKeysToDelete.map((storageKey) => this.storage.delete(storageKey)),
    );
    const failedFileCount = cleanup.filter((result) => result.status === "rejected").length;
    if (failedFileCount > 0) {
      console.error("customer_whatsapp_test_reset_file_cleanup_failed", { customerId, failedFileCount });
    }

    await Promise.all(reset.conversations.map((conversation) => this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId: conversation.id,
      reason: "CONVERSATION_DELETED",
      occurredAt: new Date().toISOString(),
      deleted: true,
      audience: conversation.audience,
    })));
  }
}
