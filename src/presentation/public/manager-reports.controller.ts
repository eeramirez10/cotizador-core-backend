import type { Request, Response } from "express";
import { createManagerReportTemplateSamplePdf } from "./manager-report-template-sample-pdf";

export class ManagerReportsController {
  sample = (_req: Request, res: Response): void => {
    const content = createManagerReportTemplateSamplePdf();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(content.byteLength));
    res.setHeader("Content-Disposition", 'inline; filename="tuvansa-reporte-cotizaciones-muestra.pdf"');
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.status(200).send(content);
  };
}
