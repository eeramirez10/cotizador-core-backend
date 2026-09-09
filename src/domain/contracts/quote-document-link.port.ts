export abstract class QuoteDocumentLinkPort {
  abstract createToken(fileAssetId: string): string;
  abstract verify(token: string): string | null;
}
