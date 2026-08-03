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
    const deliveryContact = dto.contacts?.find((contact) => contact.isPrimary && (contact.email || contact.mobile))
      || dto.contacts?.find((contact) => contact.email || contact.mobile);

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
        email: dto.contacts ? deliveryContact?.email ?? null : dto.email,
        phone: dto.contacts ? deliveryContact?.phone ?? null : dto.phone,
        whatsapp: dto.contacts ? deliveryContact?.mobile ?? "" : dto.whatsapp,
        taxId: dto.taxId,
        taxRegime: dto.taxRegime,
        billingStreet: dto.billingStreet,
        billingExteriorNumber: dto.billingExteriorNumber,
        billingInteriorNumber: dto.billingInteriorNumber,
        billingNeighborhood: dto.billingNeighborhood,
        billingCity: dto.billingCity,
        billingState: dto.billingState,
        billingPostalCode: dto.billingPostalCode,
        billingCountry: dto.billingCountry,
        profileStatus: dto.profileStatus,
        notes: dto.notes,
        updatedByUserId: actor.id,
        contacts: dto.contacts,
      },
    });

    if (!customer) throw new Error("Customer not found.");

    return new CustomerResponseDto(customer);
  }
}
