import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Envs } from "../../config/envs";
import {
  GenerateOrderResult,
  GeneratedOrderFileResult,
  OrderGenerationDatasource,
} from "../../domain/datasources/order-generation.datasource";
import { QuoteEntity } from "../../domain/entities/quote.entity";

const TAB = "\t";
const CRLF = "\r\n";
const toSafeFileName = (value: string): string => value.replace(/[^A-Za-z0-9._-]/g, "_");

const formatUnitPrice = (value: number): string => value.toFixed(2);

const formatQty = (value: number): string => {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(4).replace(/\.?0+$/, "");
};

const resolveProductCode = (quote: QuoteEntity, index: number): string => {
  const item = quote.items[index];
  const code = (item.externalProductCode ?? item.product?.code ?? "").trim();
  if (!code) {
    throw new Error("All quote items must have an ERP product code to generate order file.");
  }
  return code;
};

export class FileOrderGenerationDatasource implements OrderGenerationDatasource {
  async generateOrderFromQuote(quote: QuoteEntity): Promise<GenerateOrderResult> {
    const generatedAt = new Date();
    const timestamp = this.buildTimestamp(generatedAt);
    const orderReference = `ORD-${quote.quoteNumber}-${timestamp}`;
    const fileName = `${toSafeFileName(quote.quoteNumber)}.txt`;

    const lines: string[] = [];
    lines.push(`${TAB}0`);
    lines.push("");

    quote.items.forEach((item, index) => {
      const code = resolveProductCode(quote, index);
      const unitPrice = formatUnitPrice(item.unitPrice);
      const qty = formatQty(item.qty);
      lines.push([code, unitPrice, qty].join(TAB));
    });

    const content = `${lines.join(CRLF)}${CRLF}`;

    const outboxPath = path.resolve(process.cwd(), Envs.erpOutboxDir);
    await mkdir(outboxPath, { recursive: true });
    await writeFile(path.join(outboxPath, fileName), content, "utf8");

    return {
      orderReference,
      fileName,
      generatedAt,
    };
  }

  async getOrderFileByFileName(fileName: string): Promise<GeneratedOrderFileResult | null> {
    const safeFileName = toSafeFileName(fileName.trim());
    if (!safeFileName) return null;

    const outboxPath = path.resolve(process.cwd(), Envs.erpOutboxDir);
    const filePath = path.join(outboxPath, safeFileName);

    try {
      const content = await readFile(filePath);
      return {
        fileName: safeFileName,
        contentType: "text/plain; charset=utf-8",
        content,
      };
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") return null;
      throw error;
    }
  }

  private buildTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hour}${minute}${second}`;
  }
}
