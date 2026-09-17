import type { WhatsAppLeadStatus } from "../database/generated/enums";
import type { WhatsAppLeadEntity, WhatsAppLeadProfilePatch } from "../../domain/entities/whatsapp-lead.entity";
import { WhatsAppLeadRepository } from "../../domain/repositories/whatsapp-lead.repository";
import { prisma } from "../database/prisma-client";

const leadInclude = {
  assignedSeller: { select: { firstName: true, lastName: true } },
  assignedBranch: { select: { name: true } },
} as const;

export class PrismaWhatsAppLeadRepository extends WhatsAppLeadRepository {
  async findByConversationId(conversationId: string): Promise<WhatsAppLeadEntity | null> {
    const row = await prisma.whatsAppLead.findUnique({
      where: { conversationId },
      include: leadInclude,
    });
    return row ? this.map(row) : null;
  }

  async updateProfile(input: {
    conversationId: string;
    patch: WhatsAppLeadProfilePatch;
    status: WhatsAppLeadStatus;
  }): Promise<WhatsAppLeadEntity | null> {
    const updated = await prisma.whatsAppLead.updateMany({
      where: { conversationId: input.conversationId, status: { notIn: ["CONVERTED", "DISCARDED"] } },
      data: { ...input.patch, status: input.status },
    });
    if (!updated.count) return this.findByConversationId(input.conversationId);
    return this.findByConversationId(input.conversationId);
  }

  async assign(input: {
    conversationId: string;
    sellerId: string;
    actor: { id: string; role: "ADMIN" | "MANAGER" | "SELLER" | "PURCHASING"; branchId: string };
    assignedAt: Date;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const lead = await tx.whatsAppLead.findUnique({
        where: { conversationId: input.conversationId },
        select: { id: true, status: true, assignedSellerId: true, assignedBranchId: true },
      });
      if (!lead) throw new Error("Prospecto de WhatsApp no encontrado.");
      if (["CONVERTED", "DISCARDED"].includes(lead.status)) {
        throw new Error("El prospecto ya no se puede asignar.");
      }
      if (input.actor.role === "MANAGER" && lead.assignedBranchId && lead.assignedBranchId !== input.actor.branchId) {
        throw new Error("No puedes reasignar un prospecto de otra sucursal.");
      }
      const seller = await tx.user.findUnique({
        where: { id: input.sellerId },
        select: { id: true, role: true, branchId: true, isActive: true },
      });
      if (!seller?.isActive || seller.role !== "SELLER") throw new Error("El vendedor seleccionado no está disponible.");
      if (input.actor.role === "MANAGER" && seller.branchId !== input.actor.branchId) {
        throw new Error("Solo puedes asignar vendedores de tu sucursal.");
      }

      if (lead.assignedSellerId && lead.assignedSellerId !== seller.id) {
        await tx.whatsAppConversationAccess.deleteMany({
          where: {
            conversationId: input.conversationId,
            userId: lead.assignedSellerId,
            customerId: null,
            quoteId: null,
          },
        });
      }
      await tx.whatsAppConversationAccess.upsert({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: seller.id } },
        create: {
          conversationId: input.conversationId,
          userId: seller.id,
          branchId: seller.branchId,
        },
        update: { branchId: seller.branchId },
      });
      await tx.whatsAppLead.update({
        where: { id: lead.id },
        data: {
          status: "ASSIGNED",
          assignedSellerId: seller.id,
          assignedBranchId: seller.branchId,
          assignedAt: input.assignedAt,
        },
      });
      await tx.whatsAppLeadAssignment.create({
        data: {
          leadId: lead.id,
          sellerId: seller.id,
          branchId: seller.branchId,
          assignedByUserId: input.actor.id,
          assignedAt: input.assignedAt,
        },
      });
    });
  }

  async convert(input: {
    conversationId: string;
    customerId: string;
    customerContactId: string | null;
    actor: { id: string; role: "ADMIN" | "MANAGER" | "SELLER" | "PURCHASING"; branchId: string };
    convertedAt: Date;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const lead = await tx.whatsAppLead.findUnique({
        where: { conversationId: input.conversationId },
        include: {
          conversation: { select: { id: true } },
          assignedSeller: { select: { id: true, branchId: true, isActive: true } },
        },
      });
      if (!lead) throw new Error("Prospecto de WhatsApp no encontrado.");
      if (lead.status === "DISCARDED") throw new Error("El prospecto fue descartado y no se puede convertir.");
      if (!lead.assignedSeller?.isActive) throw new Error("Asigna un vendedor activo antes de convertir el prospecto.");
      if (lead.status === "CONVERTED" && lead.customerId && lead.customerId !== input.customerId) {
        throw new Error("El prospecto ya está vinculado con otro cliente.");
      }
      if (input.actor.role === "SELLER" && lead.assignedSellerId !== input.actor.id) {
        throw new Error("Solo el vendedor asignado puede convertir este prospecto.");
      }
      if (input.actor.role === "MANAGER" && lead.assignedBranchId !== input.actor.branchId) {
        throw new Error("Solo puedes convertir prospectos asignados a tu sucursal.");
      }

      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, isActive: true },
        include: { contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] } },
      });
      if (!customer) throw new Error("Cliente no encontrado o inactivo.");
      const requestedContact = input.customerContactId
        ? customer.contacts.find((contact) => contact.id === input.customerContactId)
        : null;
      if (input.customerContactId && !requestedContact) {
        throw new Error("El contacto seleccionado no pertenece al cliente.");
      }

      const leadPhone = this.phoneKey(lead.phoneE164);
      let contact = customer.contacts.find((candidate) => (
        this.phoneKey(candidate.mobile) === leadPhone || this.phoneKey(candidate.phone) === leadPhone
      ));
      if (!contact) {
        contact = await tx.customerContact.create({
          data: {
            customerId: customer.id,
            name: lead.contactName?.trim() || requestedContact?.name || customer.displayName,
            jobTitle: null,
            label: "Prospecto WhatsApp",
            email: lead.email,
            phone: null,
            phoneExtension: null,
            mobile: lead.phoneE164,
            isPrimary: customer.contacts.length === 0,
          },
        });
      }

      await tx.whatsAppConversationAccess.upsert({
        where: {
          conversationId_userId: {
            conversationId: lead.conversationId,
            userId: lead.assignedSeller.id,
          },
        },
        create: {
          conversationId: lead.conversationId,
          userId: lead.assignedSeller.id,
          branchId: lead.assignedSeller.branchId,
          customerId: customer.id,
          customerContactId: contact.id,
        },
        update: {
          branchId: lead.assignedSeller.branchId,
          customerId: customer.id,
          customerContactId: contact.id,
        },
      });
      await tx.whatsAppConversation.update({
        where: { id: lead.conversation.id },
        data: {
          participantType: "CUSTOMER",
          internalUserId: null,
          principalResolvedAt: input.convertedAt,
          previousResponseId: null,
        },
      });
      await tx.whatsAppLead.update({
        where: { id: lead.id },
        data: {
          status: "CONVERTED",
          customerId: customer.id,
          convertedByUserId: input.actor.id,
          convertedAt: lead.convertedAt ?? input.convertedAt,
        },
      });
    });
  }

  private map(row: Awaited<ReturnType<typeof prisma.whatsAppLead.findUniqueOrThrow>> & {
    assignedSeller?: { firstName: string; lastName: string } | null;
    assignedBranch?: { name: string } | null;
  }): WhatsAppLeadEntity {
    return {
      id: row.id,
      conversationId: row.conversationId,
      phoneE164: row.phoneE164,
      contactName: row.contactName,
      companyName: row.companyName,
      email: row.email,
      location: row.location,
      requestSummary: row.requestSummary,
      status: row.status,
      assignedSellerId: row.assignedSellerId,
      assignedSellerName: row.assignedSeller
        ? `${row.assignedSeller.firstName} ${row.assignedSeller.lastName}`.trim()
        : null,
      assignedBranchId: row.assignedBranchId,
      assignedBranchName: row.assignedBranch?.name ?? null,
      assignedAt: row.assignedAt,
      customerId: row.customerId,
      convertedByUserId: row.convertedByUserId,
      convertedAt: row.convertedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private phoneKey(value: string | null): string {
    const digits = (value || "").replace(/\D/g, "");
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
}
