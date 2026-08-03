import type { UserRole } from "../../infrastructure/database/generated/enums";
import { CreateCustomerContactRequestDto } from "../dtos/request/create-customer-contact-request.dto";
import { CustomerContactResponseDto } from "../dtos/response/customer-contact-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface CreateCustomerContactActorContext {
  role: UserRole;
  branchId: string;
}

export class CreateCustomerContactUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(
    customerId: string,
    dto: CreateCustomerContactRequestDto,
    actor: CreateCustomerContactActorContext
  ): Promise<CustomerContactResponseDto> {
    const customer = await this.customerRepository.findById({
      id: customerId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!customer) throw new Error("Customer not found.");
    const hasDeliveryChannel = Boolean(
      dto.email
      || dto.mobile
      || customer.email
      || customer.whatsapp
      || customer.contacts.some((contact) => contact.email || contact.mobile)
    );
    if (!hasDeliveryChannel) {
      throw new Error("El cliente debe tener al menos un correo o WhatsApp.");
    }

    const contact = await this.customerRepository.createContact({
      customerId,
      data: {
        name: dto.name,
        jobTitle: dto.jobTitle,
        label: dto.label,
        email: dto.email,
        phone: dto.phone,
        phoneExtension: dto.phoneExtension,
        mobile: dto.mobile,
        isPrimary: dto.isPrimary,
      },
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!contact) throw new Error("Customer not found.");
    return new CustomerContactResponseDto(contact);
  }
}
