import { WhatsAppPhone } from "../../domain/utils/whatsapp-phone";

const normalizePhone = (value: string): string | null => WhatsAppPhone.create(value)?.value ?? null;

export const assertStagingRecipientAllowed = (recipient: string): void => {
  if (process.env.STAGING_MODE?.trim().toLowerCase() !== "true") return;

  const phone = normalizePhone(recipient);
  const allowed = (process.env.STAGING_TWILIO_ALLOWED_RECIPIENTS || "")
    .split(",")
    .map(normalizePhone);
  if (!phone || !allowed.includes(phone)) {
    throw new Error("Recipient is not allowlisted for staging.");
  }
};
