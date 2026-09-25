import type { SendManagerReportMessage } from "../../domain/contracts/manager-report-messaging.port";

interface ManagerReportTemplateContent {
  types?: Record<string, unknown>;
}

export const managerReportContentVariables = (
  message: SendManagerReportMessage,
  mediaVariable: string,
): Record<string, string> => {
  const money = (amount: number) => amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    "1": message.recipientName,
    "2": message.scopeName,
    "3": message.periodLabel,
    "4": String(message.generatedCount),
    "5": `$${money(message.quotedMxn)}`,
    "6": `USD ${money(message.quotedUsd)}`,
    [mediaVariable]: message.reportMediaPath,
  };
};

export const assertManagerReportTemplateMatches = (
  template: ManagerReportTemplateContent,
  message: SendManagerReportMessage,
  mediaVariable: string,
): void => {
  const content = template.types?.["twilio/media"] as { body?: unknown; media?: unknown } | undefined;
  const body = content?.body;
  const mediaUrl = Array.isArray(content?.media) ? content.media[0] : undefined;
  if (typeof body !== "string" || typeof mediaUrl !== "string") {
    throw new Error("The manager report template must be a Media template with a PDF URL.");
  }
  for (let index = 1; index <= 6; index += 1) {
    if (!body.includes(`{{${index}}}`)) {
      throw new Error(`The manager report template is missing body variable {{${index}}}.`);
    }
  }
  const placeholder = `{{${mediaVariable}}}`;
  if (body.includes(placeholder) || !mediaUrl.includes(placeholder)) {
    throw new Error(`The manager report template must use ${placeholder} in its Media URL, not in its body.`);
  }
  if (mediaUrl.replace(placeholder, message.reportMediaPath) !== message.reportUrl) {
    throw new Error("The manager report template Media URL does not match the real report PDF URL.");
  }
};
