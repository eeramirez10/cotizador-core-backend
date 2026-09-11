import type { Request, Response } from "express";
import type { GetManagerReportDocumentUseCase } from "../../domain/use-cases/get-manager-report-document.use-case";
import { createManagerReportTemplateSamplePdf } from "./manager-report-template-sample-pdf";

export class ManagerReportsController {
  constructor(private readonly getDocument: GetManagerReportDocumentUseCase) {}

  sample = (_req: Request, res: Response): void => {
    const content = createManagerReportTemplateSamplePdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(content.byteLength));
    res.setHeader("Content-Disposition", 'inline; filename="tuvansa-reporte-cotizaciones-muestra.pdf"');
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(content);
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.params.token;
    const token = Array.isArray(rawToken) ? rawToken[0] || "" : rawToken || "";
    try {
      const content = await this.getDocument.execute(token);
      if (!content) return void res.status(404).json({ error: "Manager report link is invalid or expired." });
      const rawFileName = req.params.fileName;
      const requestedFileName = Array.isArray(rawFileName) ? rawFileName[0] : rawFileName;
      const fileName = requestedFileName?.replace(/[^a-zA-Z0-9_.-]/g, "_") || "Reporte-Cotizaciones.pdf";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", String(content.byteLength));
      res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.status(200).send(content);
    } catch (error) {
      console.error("manager_report_document_failed", error);
      res.status(500).json({ error: "Manager report could not be generated." });
    }
  };
}
