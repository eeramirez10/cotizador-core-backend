import { Prisma } from "../database/generated/client";
import type { WhatsAppAssistantPrincipal } from "../../domain/entities/whatsapp-assistant.entity";
import { WhatsAppParticipantResolverPort } from "../../domain/contracts/whatsapp-participant-resolver.port";
import { prisma } from "../database/prisma-client";

interface CustomerPhoneMatch {
  customerId: string;
  customerSource: "LOCAL" | "ERP";
  customerContactId: string | null;
  customerName: string;
  customerContactName: string | null;
  createdByUserId: string | null;
}

interface CustomerOwner {
  userId: string | null;
  branchId: string | null;
  quoteId: string | null;
}

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

    const customer = await this.findCustomerByPhone(participantPhoneE164);
    if (customer) {
      const owner = await this.findCustomerOwner(customer);
      return this.customerPrincipal(participantPhoneE164, customer, owner);
    }

    const delivery = await prisma.quoteDeliveryAttempt.findFirst({
      where: {
        channel: "WHATSAPP",
        recipient: participantPhoneE164,
        status: { not: "FAILED" },
      },
      orderBy: { sentAt: "desc" },
      select: {
        customerContact: { select: { id: true, name: true } },
        quote: {
          select: {
            id: true,
            customerId: true,
            createdByUserId: true,
            branchId: true,
            customer: { select: { legalName: true, displayName: true, source: true } },
          },
        },
      },
    });
    if (delivery) {
      const customerName = delivery.quote.customer.legalName
        || delivery.quote.customer.displayName
        || "Cliente";
      return this.customerPrincipal(participantPhoneE164, {
        customerId: delivery.quote.customerId,
        customerSource: delivery.quote.customer.source,
        customerContactId: delivery.customerContact?.id ?? null,
        customerName,
        customerContactName: delivery.customerContact?.name ?? null,
        createdByUserId: delivery.quote.createdByUserId,
      }, {
        userId: delivery.quote.createdByUserId,
        branchId: delivery.quote.branchId,
        quoteId: delivery.quote.id,
      });
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

  private async findCustomerByPhone(participantPhoneE164: string): Promise<CustomerPhoneMatch | null> {
    const nationalNumber = participantPhoneE164.replace(/\D/g, "").slice(-10);
    if (nationalNumber.length !== 10) return null;

    const contacts = await prisma.$queryRaw<CustomerPhoneMatch[]>(Prisma.sql`
      SELECT
        c.id AS "customerId",
        c.source AS "customerSource",
        cc.id AS "customerContactId",
        COALESCE(c.legal_name, c.display_name) AS "customerName",
        cc.name AS "customerContactName",
        c.created_by_user_id AS "createdByUserId"
      FROM customer_contacts cc
      INNER JOIN customers c ON c.id = cc.customer_id
      WHERE c.is_active = true
        AND (
          RIGHT(REGEXP_REPLACE(COALESCE(cc.mobile, ''), '[^0-9]', '', 'g'), 10) = ${nationalNumber}
          OR RIGHT(REGEXP_REPLACE(COALESCE(cc.phone, ''), '[^0-9]', '', 'g'), 10) = ${nationalNumber}
        )
      ORDER BY cc.is_primary DESC, cc.updated_at DESC
      LIMIT 1
    `);
    if (contacts[0]) return contacts[0];

    const customers = await prisma.$queryRaw<CustomerPhoneMatch[]>(Prisma.sql`
      SELECT
        c.id AS "customerId",
        c.source AS "customerSource",
        NULL::uuid AS "customerContactId",
        COALESCE(c.legal_name, c.display_name) AS "customerName",
        NULL::varchar AS "customerContactName",
        c.created_by_user_id AS "createdByUserId"
      FROM customers c
      WHERE c.is_active = true
        AND (
          RIGHT(REGEXP_REPLACE(COALESCE(c.whatsapp, ''), '[^0-9]', '', 'g'), 10) = ${nationalNumber}
          OR RIGHT(REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9]', '', 'g'), 10) = ${nationalNumber}
        )
      ORDER BY c.updated_at DESC
      LIMIT 1
    `);
    return customers[0] ?? null;
  }

  private async findCustomerOwner(customer: CustomerPhoneMatch): Promise<CustomerOwner> {
    const contactQuote = customer.customerContactId
      ? await prisma.quote.findFirst({
          where: {
            customerId: customer.customerId,
            customerContactId: customer.customerContactId,
            archivedAt: null,
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true, createdByUserId: true, branchId: true },
        })
      : null;
    const quote = contactQuote ?? await prisma.quote.findFirst({
      where: { customerId: customer.customerId, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, createdByUserId: true, branchId: true },
    });
    if (quote) {
      return { userId: quote.createdByUserId, branchId: quote.branchId, quoteId: quote.id };
    }

    if (customer.createdByUserId) {
      const creator = await prisma.user.findFirst({
        where: { id: customer.createdByUserId, isActive: true },
        select: { id: true, branchId: true },
      });
      if (creator) return { userId: creator.id, branchId: creator.branchId, quoteId: null };
    }
    return { userId: null, branchId: null, quoteId: null };
  }

  private customerPrincipal(
    phoneE164: string,
    customer: CustomerPhoneMatch,
    owner: CustomerOwner,
  ): WhatsAppAssistantPrincipal {
    return {
      audience: "CUSTOMER",
      displayName: customer.customerContactName || customer.customerName || "Cliente",
      phoneE164,
      userId: null,
      role: null,
      branchId: null,
      branchName: null,
      reportScope: null,
      reportBranchId: null,
      reportRange: null,
      isVerified: false,
      customerId: customer.customerId,
      customerSource: customer.customerSource,
      customerContactId: customer.customerContactId,
      customerOwnerUserId: owner.userId,
      customerOwnerBranchId: owner.branchId,
      customerQuoteId: owner.quoteId,
      customerName: customer.customerName,
      customerContactName: customer.customerContactName,
    };
  }
}
