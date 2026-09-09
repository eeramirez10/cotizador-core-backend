export class WhatsAppPhone {
  private constructor(public readonly value: string) {}

  static create(input: string | null | undefined): WhatsAppPhone | null {
    let digits = `${input ?? ""}`.replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("521")) digits = `52${digits.slice(3)}`;
    if (digits.length === 10) digits = `52${digits}`;
    if (digits.length < 11 || digits.length > 15) return null;
    return new WhatsAppPhone(`+${digits}`);
  }
}
