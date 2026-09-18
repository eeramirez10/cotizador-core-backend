import type { FileStoragePort } from "../contracts/file-storage.port";
import type {
  WhatsAppConversationDeletionResult,
  WhatsAppInboxActor,
} from "../entities/whatsapp-inbox.entity";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";

export class DeleteWhatsAppConversationUseCase {
  constructor(
    private readonly repository: WhatsAppInboxRepository,
    private readonly storage: FileStoragePort,
    private readonly realtime?: WhatsAppRealtimePublisher,
  ) {}

  async execute(
    conversationId: string,
    actor: WhatsAppInboxActor,
  ): Promise<WhatsAppConversationDeletionResult> {
    if (actor.role !== "ADMIN") {
      throw new Error("Only ADMIN can delete WhatsApp conversations.");
    }
    const id = conversationId.trim();
    if (!id) throw new Error("Conversation id is required.");

    const deleted = await this.repository.deleteConversation({ conversationId: id, actor });
    if (!deleted) throw new Error("Conversación no encontrada.");

    const cleanup = await Promise.allSettled(
      deleted.storageKeysToDelete.map((storageKey) => this.storage.delete(storageKey)),
    );
    const failedFileCount = cleanup.filter((result) => result.status === "rejected").length;
    if (failedFileCount > 0) {
      console.error("whatsapp_conversation_file_cleanup_failed", {
        conversationId: id,
        failedFileCount,
      });
    }

    await this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId: deleted.conversationId,
      reason: "CONVERSATION_DELETED",
      occurredAt: new Date().toISOString(),
      deleted: true,
      audience: deleted.audience,
    });

    return {
      conversationId: deleted.conversationId,
      deletedProspect: deleted.deletedProspect,
      deletedFileCount: cleanup.length - failedFileCount,
      failedFileCount,
      preservedQuoteCount: deleted.preservedQuoteCount,
      preservedQuoteFileCount: deleted.preservedQuoteFileCount,
    };
  }
}
