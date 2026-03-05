import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateCustomerRequestDto } from "../dtos/request/update-customer-request.dto";
import { CustomerResponseDto } from "../dtos/response/customer-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface UpdateCustomerActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class UpdateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(id: string, dto: UpdateCustomerRequestDto, actor: UpdateCustomerActorContext): Promise<CustomerResponseDto> {
    const existing = await this.customerRepository.findById({
      id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!existing) throw new Error("Customer not found.");

    const nextFirstName = dto.firstName ?? existing.firstName;
    const nextLastName = dto.lastName ?? existing.lastName;

    const customer = await this.customerRepository.updateById({
      id,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
      data: {
        source: dto.source,
        externalId: dto.externalId,
        externalSystem: dto.externalSystem,
        code: dto.code,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName:
          typeof dto.displayName === "undefined"
            ? `${nextFirstName} ${nextLastName}`.trim()
            : dto.displayName ?? `${nextFirstName} ${nextLastName}`.trim(),
        legalName: dto.legalName,
        email: dto.email,
        phone: dto.phone,
        whatsapp: dto.whatsapp,
        taxId: dto.taxId,
        taxRegime: dto.taxRegime,
        billingStreet: dto.billingStreet,
        billingCity: dto.billingCity,
        billingState: dto.billingState,
        billingPostalCode: dto.billingPostalCode,
        billingCountry: dto.billingCountry,
        profileStatus: dto.profileStatus,
        notes: dto.notes,
        updatedByUserId: actor.id,
      },
    });

    if (!customer) throw new Error("Customer not found.");

    return new CustomerResponseDto(customer);
  }
}
