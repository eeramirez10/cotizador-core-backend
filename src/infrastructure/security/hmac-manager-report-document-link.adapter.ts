import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ManagerReportDocumentLinkPort,
  type ManagerReportDocumentDescriptor,
} from "../../domain/contracts/manager-report-document-link.port";

interface TokenPayload extends ManagerReportDocumentDescriptor {
  expiresAt: number;
}

export class HmacManagerReportDocumentLinkAdapter extends ManagerReportDocumentLinkPort {
  constructor(
    private readonly signingSecret: string,
    private readonly ttlSeconds: number,
  ) {
    super();
  }

  createToken(descriptor: ManagerReportDocumentDescriptor): string {
    const payload = Buffer.from(JSON.stringify({
      ...descriptor,
      expiresAt: Math.floor(Date.now() / 1000) + this.ttlSeconds,
    } satisfies TokenPayload)).toString("base64url");
    return `${payload}.${this.sign(payload)}.pdf`;
  }

  verify(rawToken: string): ManagerReportDocumentDescriptor | null {
    const token = rawToken.endsWith(".pdf") ? rawToken.slice(0, -4) : rawToken;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = this.sign(payload);
    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<TokenPayload>;
      if (!parsed.subscriptionId || !parsed.from || !parsed.to) return null;
      if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
      if (Number.isNaN(Date.parse(parsed.from)) || Number.isNaN(Date.parse(parsed.to))) return null;
      return { subscriptionId: parsed.subscriptionId, from: parsed.from, to: parsed.to };
    } catch {
      return null;
    }
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.signingSecret).update(payload).digest("base64url");
  }
}
