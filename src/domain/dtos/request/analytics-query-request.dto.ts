interface AnalyticsQueryRequestDtoProps {
  from: Date;
  toExclusive: Date;
  branchId?: string;
  userId?: string;
  currency: "MXN" | "USD";
}

export class AnalyticsQueryRequestDto {
  public readonly from: Date;
  public readonly toExclusive: Date;
  public readonly branchId?: string;
  public readonly userId?: string;
  public readonly currency: "MXN" | "USD";

  constructor(props: AnalyticsQueryRequestDtoProps) {
    this.from = props.from;
    this.toExclusive = props.toExclusive;
    this.branchId = props.branchId;
    this.userId = props.userId;
    this.currency = props.currency;
  }

  static create(input: unknown): [string?, AnalyticsQueryRequestDto?] {
    const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
    const today = new Date();
    const defaultTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const defaultFrom = new Date(defaultTo);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

    const from = AnalyticsQueryRequestDto.parseDate(source.from) ?? defaultFrom;
    const to = AnalyticsQueryRequestDto.parseDate(source.to) ?? defaultTo;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return ["from and to must use YYYY-MM-DD format."];
    if (from.getTime() > to.getTime()) return ["from must be before or equal to to."];
    if ((to.getTime() - from.getTime()) / 86_400_000 > 366) return ["The analytics period cannot exceed 366 days."];

    const toExclusive = new Date(to);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const branchId = AnalyticsQueryRequestDto.parseOptionalString(source.branchId);
    const userId = AnalyticsQueryRequestDto.parseOptionalString(source.userId);
    const currencyRaw = typeof source.currency === "string" ? source.currency.trim().toUpperCase() : "MXN";
    if (currencyRaw !== "MXN" && currencyRaw !== "USD") return ["currency must be MXN or USD."];

    return [, new AnalyticsQueryRequestDto({ from, toExclusive, branchId, userId, currency: currencyRaw })];
  }

  private static parseDate(value: unknown): Date | null {
    if (typeof value === "undefined") return null;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return new Date(Number.NaN);
    const date = new Date(`${value.trim()}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? new Date(Number.NaN) : date;
  }

  private static parseOptionalString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
}
