export abstract class QuoteDocumentLinkPort {
  abstract create(fileAssetId: string): string;
  abstract verify(token: string): string | null;
}
