import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateCustomerRequestDto } from "../dtos/request/create-customer-request.dto";
import { CustomerResponseDto } from "../dtos/response/customer-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface CreateCustomerActorContext {
  id: string;
  role: UserRole;
  branchId: string;
}

export class CreateCustomerUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(dto: CreateCustomerRequestDto, actor: CreateCustomerActorContext): Promise<CustomerResponseDto> {
    const displayName = dto.displayName ?? `${dto.firstName} ${dto.lastName}`.trim();

    const customer = await this.customerRepository.create({
      source: dto.source,
      externalId: dto.externalId,
      externalSystem: dto.externalSystem,
      code: dto.code,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName,
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
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
    });

    return new CustomerResponseDto(customer);
  }
}
