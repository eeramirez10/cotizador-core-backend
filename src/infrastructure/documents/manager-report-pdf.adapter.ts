import { readFileSync } from "node:fs";
import path from "node:path";
import {
  ManagerReportPdfPort,
  type ManagerReportSellerRow,
  type ManagerReportSnapshot,
} from "../../domain/contracts/manager-report-pdf.port";

const object = (id: number, body: string): string => `${id} 0 obj\n${body}\nendobj\n`;
const latinToAscii = (value: string): string => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "");
const escapePdf = (value: string): string => latinToAscii(value).replace(/([\\()])/g, "\\$1");
const money = (value: number, currency: "MXN" | "USD"): string => `${currency} ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fit = (value: string, width: number): string => {
  const normalized = latinToAscii(value);
  return normalized.length > width ? `${normalized.slice(0, Math.max(0, width - 1))}~` : normalized.padEnd(width, " ");
};

const logo = readFileSync(path.resolve(__dirname, "assets/logo-tuvansa.jpg"));

export class ManagerReportPdfAdapter extends ManagerReportPdfPort {
  create(snapshot: ManagerReportSnapshot): Buffer {
    const chunks = this.chunkSellers(snapshot.sellers);
    const streams = chunks.map((rows, index) => this.pageStream(snapshot, rows, index, chunks.length));
    const fontRegularId = 3;
    const fontBoldId = 4;
    const logoImageId = 5;
    const pageObjectIds = streams.map((_, index) => 6 + index * 2);
    const objects: Array<{ id: number; body: string }> = [
      { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
      { id: 2, body: `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${streams.length} >>` },
      { id: fontRegularId, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
      { id: fontBoldId, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>" },
      { id: logoImageId, body: this.logoImageObject() },
    ];
    streams.forEach((stream, index) => {
      const pageId = pageObjectIds[index];
      const contentId = pageId + 1;
      objects.push({
        id: pageId,
        body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> /XObject << /Logo ${logoImageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      });
      objects.push({ id: contentId, body: `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream` });
    });
    return this.buildPdf(objects);
  }

  private pageStream(snapshot: ManagerReportSnapshot, sellers: ManagerReportSellerRow[], pageIndex: number, pageCount: number): string {
    const commands: string[] = [];
    const text = (x: number, y: number, value: string, font = "F1", size = 9) => {
      commands.push(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(value)}) Tj ET`);
    };
    commands.push("q 106 0 0 35.55 36 543 cm /Logo Do Q");
    text(156, 565, "Reporte de rendimiento de cotizaciones", "F2", 14);
    text(156, 548, `Alcance: ${snapshot.scopeName}  |  Periodo: ${snapshot.periodFrom} al ${snapshot.periodTo}`, "F1", 9);
    text(690, 570, `Pagina ${pageIndex + 1}/${pageCount}`, "F1", 8);

    let y = 500;
    if (pageIndex === 0) {
      text(36, y, `Generadas: ${snapshot.totals.created}    Cotizadas: ${snapshot.totals.quoted}    Aprobadas por cliente: ${snapshot.totals.approved}    Pendientes: ${snapshot.totals.pending}    Pedidos: ${snapshot.totals.ordersGenerated}`, "F2", 9);
      y -= 18;
      text(36, y, `Total cotizado: ${money(snapshot.totals.quotedMxn, "MXN")}    |    ${money(snapshot.totals.quotedUsd, "USD")}`, "F1", 9);
      y -= 16;
      text(36, y, `Total aprobado: ${money(snapshot.totals.approvedMxn, "MXN")}    |    ${money(snapshot.totals.approvedUsd, "USD")}`, "F1", 9);
      y -= 30;
    }

    text(36, y, this.tableHeader(), "F2", 7);
    y -= 9;
    commands.push(`0.82 G 36 ${y} m 756 ${y} l S`);
    y -= 15;
    for (const seller of sellers) {
      text(36, y, this.tableRow(seller), "F1", 7);
      y -= 17;
    }
    if (snapshot.sellers.length === 0) text(36, y, "No hay actividad de vendedores en el periodo seleccionado.", "F1", 9);
    text(36, 24, `Generado: ${snapshot.generatedAt.slice(0, 19).replace("T", " ")} UTC`, "F1", 7);
    return commands.join("\n");
  }

  private logoImageObject(): string {
    const encoded = `${logo.toString("hex").toUpperCase()}>`;
    return `<< /Type /XObject /Subtype /Image /Width 176 /Height 59 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${encoded.length} >>\nstream\n${encoded}\nendstream`;
  }

  private tableHeader(): string {
    return [fit("VENDEDOR", 25), fit("COT.", 6), fit("APROB.", 7), fit("CONV.", 7), fit("COTIZADO MXN", 18), fit("COTIZADO USD", 18), fit("APROBADO MXN", 18), fit("APROBADO USD", 18)].join(" ");
  }

  private tableRow(row: ManagerReportSellerRow): string {
    return [fit(row.name, 25), fit(String(row.quotes), 6), fit(String(row.approved), 7), fit(`${row.conversionRate.toFixed(1)}%`, 7), fit(money(row.quotedMxn, "MXN"), 18), fit(money(row.quotedUsd, "USD"), 18), fit(money(row.approvedMxn, "MXN"), 18), fit(money(row.approvedUsd, "USD"), 18)].join(" ");
  }

  private chunkSellers(rows: ManagerReportSellerRow[]): ManagerReportSellerRow[][] {
    if (rows.length === 0) return [[]];
    const chunks: ManagerReportSellerRow[][] = [rows.slice(0, 20)];
    for (let index = 20; index < rows.length; index += 25) chunks.push(rows.slice(index, index + 25));
    return chunks;
  }

  private buildPdf(entries: Array<{ id: number; body: string }>): Buffer {
    const sorted = [...entries].sort((a, b) => a.id - b.id);
    const maxId = sorted.at(-1)?.id || 0;
    let pdf = "%PDF-1.4\n%TUVANSA\n";
    const offsets = new Map<number, number>();
    for (const entry of sorted) {
      offsets.set(entry.id, Buffer.byteLength(pdf, "ascii"));
      pdf += object(entry.id, entry.body);
    }
    const xrefOffset = Buffer.byteLength(pdf, "ascii");
    pdf += `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= maxId; id += 1) {
      const offset = offsets.get(id);
      pdf += offset === undefined ? "0000000000 00000 f \n" : `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, "ascii");
  }
}
