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
const number = (value: number): string => value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (value: number, currency: "MXN" | "USD"): string => `${currency} ${number(value)}`;
const tableEdges = [36, 190, 232, 283, 334, 439, 544, 650, 756] as const;
const rowHeight = 17;
const numericWidth = (value: string, size: number): number => [...value].reduce((width, character) => {
  if (/[0-9]/.test(character)) return width + size * 0.556;
  if (character === "%") return width + size * 0.889;
  if (character === "-") return width + size * 0.333;
  return width + size * 0.278;
}, 0);

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
    const text = (x: number, y: number, value: string, font = "F1", size = 9, color = "0.13 0.20 0.28") => {
      commands.push(`BT ${color} rg /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdf(value)}) Tj ET`);
    };
    const fillRect = (x: number, y: number, width: number, height: number, color: string) => {
      commands.push(`q ${color} rg ${x} ${y} ${width} ${height} re f Q`);
    };
    const line = (x1: number, y1: number, x2: number, y2: number) => {
      commands.push(`q 0.79 0.84 0.88 RG 0.5 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
    };
    const rightText = (right: number, y: number, value: string, size = 7.2) => {
      text(right - numericWidth(value, size), y, value, "F1", size);
    };
    const centerHeader = (left: number, right: number, y: number, value: string, color: string) => {
      text((left + right - value.length * 4.2) / 2, y, value, "F2", 7.4, color);
    };
    commands.push("q 106 0 0 35.55 36 543 cm /Logo Do Q");
    text(156, 565, "Reporte de rendimiento de cotizaciones", "F2", 14);
    text(156, 548, `Alcance: ${snapshot.scopeName}  |  Periodo: ${snapshot.periodFrom} al ${snapshot.periodTo}`, "F1", 9);
    text(690, 570, `Pagina ${pageIndex + 1}/${pageCount}`, "F1", 8);
    line(36, 528, 756, 528);

    if (pageIndex === 0) {
      text(36, 512, "RESUMEN DEL PERIODO", "F2", 8);
      const metrics = [
        ["GENERADAS", snapshot.totals.created],
        ["COTIZADAS", snapshot.totals.quoted],
        ["APROBADAS", snapshot.totals.approved],
        ["PENDIENTES", snapshot.totals.pending],
        ["PEDIDOS", snapshot.totals.ordersGenerated],
      ] as const;
      const cardWidth = (720 - 4 * 8) / 5;
      metrics.forEach(([label, value], index) => {
        const x = 36 + index * (cardWidth + 8);
        fillRect(x, 470, cardWidth, 33, "0.93 0.96 0.98");
        text(x + 9, 490, label, "F2", 7.2);
        text(x + 9, 475, String(value), "F2", 11);
      });
      text(36, 452, "Cotizado", "F2", 8);
      text(115, 452, money(snapshot.totals.quotedMxn, "MXN"), "F1", 8);
      text(390, 452, money(snapshot.totals.quotedUsd, "USD"), "F1", 8);
      text(36, 436, "Aprobado", "F2", 8);
      text(115, 436, money(snapshot.totals.approvedMxn, "MXN"), "F1", 8);
      text(390, 436, money(snapshot.totals.approvedUsd, "USD"), "F1", 8);
    }

    const top = pageIndex === 0 ? 420 : 514;
    const dataTop = top - 41;
    const tableBottom = dataTop - (sellers.length || 1) * rowHeight;
    fillRect(36, top - 20, 720, 20, "0.08 0.22 0.35");
    fillRect(36, dataTop, 720, 21, "0.89 0.94 0.97");
    text(44, top - 14, "VENDEDOR", "F2", 8, "1 1 1");
    centerHeader(190, 334, top - 14, "ACTIVIDAD", "1 1 1");
    centerHeader(334, 544, top - 14, "COTIZADO", "1 1 1");
    centerHeader(544, 756, top - 14, "APROBADO", "1 1 1");
    text(44, dataTop + 7, "Nombre", "F2", 7.4);
    const headers = ["COTIZ.", "APROB.", "CONV.", "MXN", "USD", "MXN", "USD"];
    headers.forEach((header, index) => centerHeader(tableEdges[index + 1], tableEdges[index + 2], dataTop + 7, header, "0.13 0.20 0.28"));
    sellers.forEach((seller, index) => {
      const rowTop = dataTop - index * rowHeight;
      const baseline = rowTop - 11.5;
      if (index % 2 === 0) fillRect(36, rowTop - rowHeight, 720, rowHeight, "0.97 0.98 0.99");
      const name = latinToAscii(seller.name);
      text(44, baseline, name.length > 30 ? `${name.slice(0, 27)}...` : name, "F1", 7.5);
      const cells = [
        String(seller.quotes),
        String(seller.approved),
        `${seller.conversionRate.toFixed(1)}%`,
        number(seller.quotedMxn),
        number(seller.quotedUsd),
        number(seller.approvedMxn),
        number(seller.approvedUsd),
      ];
      cells.forEach((cell, cellIndex) => rightText(tableEdges[cellIndex + 2] - 8, baseline, cell));
      line(36, rowTop - rowHeight, 756, rowTop - rowHeight);
    });
    if (sellers.length === 0) {
      text(44, dataTop - 12, "No hay actividad de vendedores en el periodo seleccionado.", "F1", 8);
    }
    line(36, top, 756, top);
    line(36, dataTop, 756, dataTop);
    for (const edge of tableEdges) line(edge, top - 20, edge, tableBottom);
    for (const edge of [36, 190, 334, 544, 756]) line(edge, top, edge, top - 20);
    line(36, tableBottom, 756, tableBottom);
    text(36, 24, `Generado: ${snapshot.generatedAt.slice(0, 19).replace("T", " ")} UTC`, "F1", 7);
    return commands.join("\n");
  }

  private logoImageObject(): string {
    const encoded = `${logo.toString("hex").toUpperCase()}>`;
    return `<< /Type /XObject /Subtype /Image /Width 176 /Height 59 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${encoded.length} >>\nstream\n${encoded}\nendstream`;
  }

  private chunkSellers(rows: ManagerReportSellerRow[]): ManagerReportSellerRow[][] {
    if (rows.length === 0) return [[]];
    const chunks: ManagerReportSellerRow[][] = [rows.slice(0, 18)];
    const remaining = rows.length - 18;
    if (remaining <= 0) return chunks;
    const pageCount = Math.ceil(remaining / 25);
    const rowsPerPage = Math.ceil(remaining / pageCount);
    for (let index = 18; index < rows.length; index += rowsPerPage) {
      chunks.push(rows.slice(index, index + rowsPerPage));
    }
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
