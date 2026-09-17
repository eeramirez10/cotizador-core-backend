import type { WhatsAppAssistantPrincipal } from "../../domain/entities/whatsapp-assistant.entity";
import { WhatsAppParticipantResolverPort } from "../../domain/contracts/whatsapp-participant-resolver.port";
import { prisma } from "../database/prisma-client";

export class PrismaWhatsAppParticipantResolver extends WhatsAppParticipantResolverPort {
  async resolve(participantPhoneE164: string): Promise<WhatsAppAssistantPrincipal> {
    const user = await prisma.user.findUnique({
      where: { whatsappPhoneE164: participantPhoneE164 },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: { select: { name: true } },
        whatsappInternalVerification: {
          select: { phoneE164: true, verifiedUntil: true },
        },
        receivedManagerReports: {
          where: { isActive: true, reportType: "QUOTE_PERFORMANCE" },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { scope: true, branchId: true, reportRange: true },
        },
      },
    });

    if (user?.isActive) {
      const report = user.receivedManagerReports[0] ?? null;
      const verification = user.whatsappInternalVerification;
      return {
        audience: "INTERNAL_USER",
        displayName: `${user.firstName} ${user.lastName}`.trim(),
        phoneE164: participantPhoneE164,
        userId: user.id,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch.name,
        reportScope: report?.scope ?? null,
        reportBranchId: report?.branchId ?? null,
        reportRange: report?.reportRange ?? null,
        isVerified: Boolean(
          verification
          && verification.phoneE164 === participantPhoneE164
          && verification.verifiedUntil
          && verification.verifiedUntil > new Date(),
        ),
      };
    }

    const delivery = await prisma.quoteDeliveryAttempt.findFirst({
      where: {
        channel: "WHATSAPP",
        recipient: participantPhoneE164,
        status: { not: "FAILED" },
      },
      orderBy: { sentAt: "desc" },
      select: {
        customerContact: { select: { name: true } },
        quote: {
          select: {
            customer: { select: { legalName: true, displayName: true } },
          },
        },
      },
    });
    if (delivery) {
      return {
        audience: "CUSTOMER",
        displayName: delivery.customerContact?.name
          || delivery.quote.customer.legalName
          || delivery.quote.customer.displayName
          || "Cliente",
        phoneE164: participantPhoneE164,
        userId: null,
        role: null,
        branchId: null,
        branchName: null,
        reportScope: null,
        reportBranchId: null,
        reportRange: null,
        isVerified: false,
      };
    }

    return {
      audience: "UNKNOWN",
      displayName: "Usuario de WhatsApp",
      phoneE164: participantPhoneE164,
      userId: null,
      role: null,
      branchId: null,
      branchName: null,
      reportScope: null,
      reportBranchId: null,
      reportRange: null,
      isVerified: false,
    };
  }
}
