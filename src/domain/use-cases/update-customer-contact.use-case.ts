import type { UserRole } from "../../infrastructure/database/generated/enums";
import { UpdateCustomerContactRequestDto } from "../dtos/request/update-customer-contact-request.dto";
import { CustomerContactResponseDto } from "../dtos/response/customer-contact-response.dto";
import { CustomerRepository } from "../repositories/customer.repository";

interface UpdateCustomerContactActorContext {
  role: UserRole;
  branchId: string;
}

export class UpdateCustomerContactUseCase {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async execute(
    customerId: string,
    contactId: string,
    dto: UpdateCustomerContactRequestDto,
    actor: UpdateCustomerContactActorContext
  ): Promise<CustomerContactResponseDto> {
    const customer = await this.customerRepository.findById({
      id: customerId,
      scope: {
        role: actor.role,
        branchId: actor.branchId,
      },
    });

    if (!customer) throw new Error("Customer not found.");

    const current = customer.contacts.find((contact) => contact.id === contactId);
    if (!current) throw new Error("Customer contact not found.");
    const nextContacts = customer.contacts.map((contact) => contact.id === contactId
      ? {
          ...contact,
          email: typeof dto.email === "undefined" ? contact.email : dto.email,
          mobile: typeof dto.mobile === "undefined" ? contact.mobile : dto.mobile,
        }
      : contact);
    if (!nextContacts.some((contact) => contact.email || contact.mobile)) {
      throw new Error("El cliente debe conservar al menos un correo o WhatsApp.");
    }

    const updated = await this.customerRepository.updateContact({
      customerId,
      contactId,
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

    if (!updated) throw new Error("Customer contact not found.");
    return new CustomerContactResponseDto(updated);
  }
}
