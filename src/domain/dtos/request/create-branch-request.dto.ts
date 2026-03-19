interface CreateBranchRequestDtoProps {
  code: string;
  name: string;
  address: string | null;
}

export class CreateBranchRequestDto {
  public readonly code: string;
  public readonly name: string;
  public readonly address: string | null;

  constructor(props: CreateBranchRequestDtoProps) {
    this.code = props.code;
    this.name = props.name;
    this.address = props.address;
  }

  static create(input: unknown): [string?, CreateBranchRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const address =
      typeof body.address === "string" && body.address.trim().length > 0 ? body.address.trim() : null;

    if (!code) return ["code is required."];
    if (code.length > 10) return ["code must contain at most 10 characters."];
    if (!name) return ["name is required."];
    if (name.length > 120) return ["name must contain at most 120 characters."];
    if (address && address.length > 255) return ["address must contain at most 255 characters."];

    return [
      ,
      new CreateBranchRequestDto({
        code,
        name,
        address,
      }),
    ];
  }
}
