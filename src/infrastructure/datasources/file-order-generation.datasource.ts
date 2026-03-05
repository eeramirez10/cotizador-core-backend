import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Envs } from "../../config/envs";
import {
  GenerateOrderResult,
  OrderGenerationDatasource,
} from "../../domain/datasources/order-generation.datasource";
import { QuoteEntity } from "../../domain/entities/quote.entity";

const sanitize = (value: string | null | undefined): string => {
  if (!value) return "";
  return value.replaceAll("|", " ").replaceAll("\n", " ").replaceAll("\r", " ").trim();
};

const formatNumber = (value: number): string => value.toFixed(4);

export class FileOrderGenerationDatasource implements OrderGenerationDatasource {
  async generateOrderFromQuote(quote: QuoteEntity): Promise<GenerateOrderResult> {
    const generatedAt = new Date();
    const timestamp = this.buildTimestamp(generatedAt);
    const orderReference = `ORD-${quote.quoteNumber}-${timestamp}`;
    const fileName = `${orderReference}.txt`;

    const lines: string[] = [];
    lines.push("H|ORDER_REFERENCE|QUOTE_NUMBER|CUSTOMER|CURRENCY|EXCHANGE_RATE|DATE");
    lines.push(
      [
        "H",
        orderReference,
        quote.quoteNumber,
        sanitize(quote.customer.displayName),
        quote.currency,
        formatNumber(quote.exchangeRate),
        quote.exchangeRateDate.toISOString().split("T")[0],
      ].join("|")
    );

    lines.push("D|LINE|CODE|EAN|DESCRIPTION|QTY|UNIT|UNIT_PRICE|CURRENCY|SUBTOTAL");

    quote.items.forEach((item, index) => {
      lines.push(
        [
          "D",
          String(index + 1),
          sanitize(item.externalProductCode ?? item.product?.code ?? ""),
          sanitize(item.ean ?? item.product?.ean ?? ""),
          sanitize(item.erpDescription ?? item.customerDescription ?? item.product?.description ?? ""),
          formatNumber(item.qty),
          sanitize(item.unit),
          formatNumber(item.unitPrice),
          quote.currency,
          formatNumber(item.subtotal),
        ].join("|")
      );
    });

    lines.push("T|SUBTOTAL|TAX|TOTAL");
    lines.push(["T", formatNumber(quote.subtotal), formatNumber(quote.tax), formatNumber(quote.total)].join("|"));

    const content = `${lines.join("\n")}\n`;

    const outboxPath = path.resolve(process.cwd(), Envs.erpOutboxDir);
    await mkdir(outboxPath, { recursive: true });
    await writeFile(path.join(outboxPath, fileName), content, "utf8");

    return {
      orderReference,
      generatedAt,
    };
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
