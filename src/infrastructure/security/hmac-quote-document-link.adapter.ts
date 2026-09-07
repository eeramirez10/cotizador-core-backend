import { createHmac, timingSafeEqual } from "node:crypto";
import { QuoteDocumentLinkPort } from "../../domain/contracts/quote-document-link.port";

interface TokenPayload {
  fileAssetId: string;
  expiresAt: number;
}

export class HmacQuoteDocumentLinkAdapter extends QuoteDocumentLinkPort {
  constructor(
    private readonly publicApiUrl: string,
    private readonly signingSecret: string,
    private readonly ttlSeconds: number,
  ) {
    super();
  }

  create(fileAssetId: string): string {
    const payload = Buffer.from(JSON.stringify({
      fileAssetId,
      expiresAt: Math.floor(Date.now() / 1000) + this.ttlSeconds,
    } satisfies TokenPayload)).toString("base64url");
    const signature = this.sign(payload);
    return `${this.publicApiUrl.replace(/\/$/, "")}/api/public/quote-documents/${payload}.${signature}`;
  }

  verify(token: string): string | null {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = this.sign(payload);
    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<TokenPayload>;
      if (typeof parsed.fileAssetId !== "string" || !parsed.fileAssetId.trim()) return null;
      if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;
      return parsed.fileAssetId;
    } catch {
      return null;
    }
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.signingSecret).update(payload).digest("base64url");
  }
}
