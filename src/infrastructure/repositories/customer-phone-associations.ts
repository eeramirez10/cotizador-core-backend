import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

export const phoneSuffix = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : null;
};

// A delivery is an association too: the number may not have been saved on the customer yet.
export const customerIdsForPhone = async (phone: string): Promise<string[]> => {
  const suffix = phoneSuffix(phone);
  if (!suffix) return [];
  const rows = await prisma.$queryRaw<{ customerId: string }[]>(Prisma.sql`
    SELECT DISTINCT matches.customer_id AS "customerId"
    FROM (
      SELECT c.id AS customer_id
      FROM customers c
      WHERE c.is_active = true AND (
        RIGHT(REGEXP_REPLACE(COALESCE(c.whatsapp, ''), '[^0-9]', '', 'g'), 10) = ${suffix}
        OR RIGHT(REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9]', '', 'g'), 10) = ${suffix}
      )
      UNION
      SELECT cc.customer_id
      FROM customer_contacts cc
      JOIN customers c ON c.id = cc.customer_id AND c.is_active = true
      WHERE RIGHT(REGEXP_REPLACE(COALESCE(cc.mobile, ''), '[^0-9]', '', 'g'), 10) = ${suffix}
        OR RIGHT(REGEXP_REPLACE(COALESCE(cc.phone, ''), '[^0-9]', '', 'g'), 10) = ${suffix}
      UNION
      SELECT q.customer_id
      FROM quote_delivery_attempts attempt
      JOIN quotes q ON q.id = attempt.quote_id AND q.archived_at IS NULL
      JOIN customers c ON c.id = q.customer_id AND c.is_active = true
      WHERE attempt.channel = 'WHATSAPP' AND attempt.status <> 'FAILED'
        AND RIGHT(REGEXP_REPLACE(attempt.recipient, '[^0-9]', '', 'g'), 10) = ${suffix}
    ) matches
  `);
  return rows.map((row) => row.customerId);
};

export const sharedCustomerPhones = async (
  phones: Array<string | null | undefined>,
  excludedCustomerId?: string,
): Promise<string[]> => {
  const unique = new Map<string, string>();
  for (const phone of phones) {
    if (!phone) continue;
    const suffix = phoneSuffix(phone);
    if (suffix && !unique.has(suffix)) unique.set(suffix, phone);
  }
  const conflicts: string[] = [];
  for (const [suffix, original] of unique) {
    const customerIds = await customerIdsForPhone(suffix);
    if (customerIds.some((id) => id !== excludedCustomerId)) conflicts.push(original);
  }
  return conflicts;
};
