export class UpdateManagerReportSubscriptionStatusRequestDto {
  constructor(public readonly isActive: boolean) {}

  static create(input: unknown): [string?, UpdateManagerReportSubscriptionStatusRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const value = (input as Record<string, unknown>).isActive;
    if (typeof value !== "boolean") return ["isActive must be a boolean."];
    return [, new UpdateManagerReportSubscriptionStatusRequestDto(value)];
  }
}
