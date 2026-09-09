import type { Request, Response } from "express";
import type { QuoteDocumentLinkPort } from "../../domain/contracts/quote-document-link.port";
import type { FileAttachmentsUseCase } from "../../domain/use-cases/file-attachments.use-case";
import { createQuoteTemplateSamplePdf } from "./quote-template-sample-pdf";

export class QuoteDocumentsController {
  constructor(
    private readonly links: QuoteDocumentLinkPort,
    private readonly attachments: FileAttachmentsUseCase,
  ) {}

  sample = (_req: Request, res: Response): void => {
    const content = createQuoteTemplateSamplePdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(content.byteLength));
    res.setHeader("Content-Disposition", 'inline; filename="tuvansa-cotizacion-muestra.pdf"');
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(content);
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const raw = req.params.token;
    const token = Array.isArray(raw) ? raw[0] || "" : raw || "";
    const fileAssetId = this.links.verify(token);
    if (!fileAssetId) return void res.status(404).json({ error: "Quote document link is invalid or expired." });
    try {
      const file = await this.attachments.downloadPublicQuotePdf(fileAssetId);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", String(file.content.byteLength));
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.status(200).send(Buffer.from(file.content));
    } catch {
      res.status(404).json({ error: "Quote document not found." });
    }
  };
}
