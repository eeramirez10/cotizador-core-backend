export interface CustomerContactWriteDtoProps {
  name: string;
  jobTitle: string | null;
  label: string | null;
  email: string | null;
  phone: string | null;
  phoneExtension: string | null;
  mobile: string | null;
  isPrimary: boolean;
}

export class CustomerContactWriteDto {
  public readonly name: string;
  public readonly jobTitle: string | null;
  public readonly label: string | null;
  public readonly email: string | null;
  public readonly phone: string | null;
  public readonly phoneExtension: string | null;
  public readonly mobile: string | null;
  public readonly isPrimary: boolean;

  constructor(props: CustomerContactWriteDtoProps) {
    this.name = props.name;
    this.jobTitle = props.jobTitle;
    this.label = props.label;
    this.email = props.email;
    this.phone = props.phone;
    this.phoneExtension = props.phoneExtension;
    this.mobile = props.mobile;
    this.isPrimary = props.isPrimary;
  }

  static parseMany(input: unknown): [string?, CustomerContactWriteDto[]?] {
    if (typeof input === "undefined") return [];
    if (!Array.isArray(input)) return ["contacts must be an array."];

    const contacts: CustomerContactWriteDto[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const [error, contact] = this.parseOne(input[index], index);
      if (error) return [error];
      contacts.push(contact!);
    }

    const primaryCount = contacts.filter((contact) => contact.isPrimary).length;
    if (primaryCount > 1) return ["Only one customer contact can be primary."];
    if (contacts.length > 0 && primaryCount === 0) {
      const first = contacts[0];
      contacts[0] = new CustomerContactWriteDto({ ...first, isPrimary: true });
    }

    return [, contacts];
  }

  static hasDeliveryChannel(contacts: CustomerContactWriteDto[]): boolean {
    return contacts.some((contact) => Boolean(contact.email || contact.mobile));
  }

  private static parseOne(input: unknown, index: number): [string?, CustomerContactWriteDto?] {
    if (!input || typeof input !== "object") return [`contacts[${index}] is invalid.`];
    const body = input as Record<string, unknown>;
    const name = this.text(body.name);
    if (!name) return [`contacts[${index}].name is required.`];

    const email = this.email(body.email);
    const phone = this.text(body.phone);
    const mobile = this.text(body.mobile);
    if (!email && !phone && !mobile) {
      return [`contacts[${index}] requires email, phone, or WhatsApp.`];
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return [`contacts[${index}].email is invalid.`];
    if (phone && !this.isPhone(phone)) return [`contacts[${index}].phone is invalid.`];
    if (mobile && !this.isPhone(mobile)) return [`contacts[${index}].mobile is invalid.`];

    return [
      ,
      new CustomerContactWriteDto({
        name,
        jobTitle: this.text(body.jobTitle),
        label: this.text(body.label),
        email,
        phone,
        phoneExtension: this.text(body.phoneExtension),
        mobile,
        isPrimary: body.isPrimary === true,
      }),
    ];
  }

  private static text(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized || null;
  }

  private static email(value: unknown): string | null {
    return this.text(value)?.toLowerCase() || null;
  }

  private static isPhone(value: string): boolean {
    if (!/^\+?[\d\s().-]+$/.test(value)) return false;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }
}
