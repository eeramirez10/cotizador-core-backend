import { BranchContactData } from "../../datasources/branch.datasource";
import { BranchContactRequestDto } from "./branch-contact-request.dto";

interface CreateBranchRequestDtoProps {
  code: string;
  name: string;
  contact: BranchContactData;
}

export class CreateBranchRequestDto {
  public readonly code: string;
  public readonly name: string;
  public readonly contact: BranchContactData;

  constructor(props: CreateBranchRequestDtoProps) {
    this.code = props.code;
    this.name = props.name;
    this.contact = props.contact;
  }

  static create(input: unknown): [string?, CreateBranchRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const [contactError, contact] = BranchContactRequestDto.create(body);

    if (!code) return ["code is required."];
    if (code.length > 10) return ["code must contain at most 10 characters."];
    if (!name) return ["name is required."];
    if (name.length > 120) return ["name must contain at most 120 characters."];
    if (contactError) return [contactError];

    return [
      ,
      new CreateBranchRequestDto({
        code,
        name,
        contact: contact!,
      }),
    ];
  }
}
