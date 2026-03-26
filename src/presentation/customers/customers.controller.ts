import { Request, Response } from "express";
import { CreateCustomerRequestDto } from "../../domain/dtos/request/create-customer-request.dto";
import { CreateCustomerContactRequestDto } from "../../domain/dtos/request/create-customer-contact-request.dto";
import { GetCustomersQueryRequestDto } from "../../domain/dtos/request/get-customers-query-request.dto";
import { UpdateCustomerContactRequestDto } from "../../domain/dtos/request/update-customer-contact-request.dto";
import { UpdateCustomerRequestDto } from "../../domain/dtos/request/update-customer-request.dto";
import { CreateCustomerContactUseCase } from "../../domain/use-cases/create-customer-contact.use-case";
import { CreateCustomerUseCase } from "../../domain/use-cases/create-customer.use-case";
import { DeleteCustomerContactUseCase } from "../../domain/use-cases/delete-customer-contact.use-case";
import { DeleteCustomerUseCase } from "../../domain/use-cases/delete-customer.use-case";
import { GetCustomerByIdUseCase } from "../../domain/use-cases/get-customer-by-id.use-case";
import { GetCustomerContactsUseCase } from "../../domain/use-cases/get-customer-contacts.use-case";
import { GetCustomersUseCase } from "../../domain/use-cases/get-customers.use-case";
import { UpdateCustomerContactUseCase } from "../../domain/use-cases/update-customer-contact.use-case";
import { UpdateCustomerUseCase } from "../../domain/use-cases/update-customer.use-case";

export class CustomersController {
  constructor(
    private readonly getCustomersUseCase: GetCustomersUseCase,
    private readonly getCustomerByIdUseCase: GetCustomerByIdUseCase,
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly deleteCustomerUseCase: DeleteCustomerUseCase,
    private readonly getCustomerContactsUseCase: GetCustomerContactsUseCase,
    private readonly createCustomerContactUseCase: CreateCustomerContactUseCase,
    private readonly updateCustomerContactUseCase: UpdateCustomerContactUseCase,
    private readonly deleteCustomerContactUseCase: DeleteCustomerContactUseCase
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [error, dto] = GetCustomersQueryRequestDto.create(req.query);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await this.getCustomersUseCase.execute(dto!, {
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(200).json(result.toJSON());
    } catch {
      res.status(500).json({ error: "Unexpected error while listing customers." });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const id = this.getSingleParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Customer id is required." });
      return;
    }

    try {
      const result = await this.getCustomerByIdUseCase.execute(id, {
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while getting customer.";
      if (message === "Customer not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const [error, dto] = CreateCustomerRequestDto.create(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await this.createCustomerUseCase.execute(dto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(201).json(result.toJSON());
    } catch {
      res.status(500).json({ error: "Unexpected error while creating customer." });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const id = this.getSingleParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Customer id is required." });
      return;
    }

    const [error, dto] = UpdateCustomerRequestDto.create(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    try {
      const result = await this.updateCustomerUseCase.execute(id, dto!, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(200).json(result.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while updating customer.";
      if (message === "Customer not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const id = this.getSingleParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Customer id is required." });
      return;
    }

    try {
      await this.deleteCustomerUseCase.execute(id, {
        id: req.user.id,
        role: req.user.role,
        branchId: req.user.branchId,
      });
      res.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while deleting customer.";
      if (message === "Customer not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  listContacts = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const customerId = this.getSingleParam(req.params.id);
    if (!customerId) {
      res.status(400).json({ error: "Customer id is required." });
      return;
    }

    try {
      const contacts = await this.getCustomerContactsUseCase.execute(customerId, {
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(200).json({ items: contacts.map((contact) => contact.toJSON()) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while listing customer contacts.";
      if (message === "Customer not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  createContact = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const customerId = this.getSingleParam(req.params.id);
    if (!customerId) {
      res.status(400).json({ error: "Customer id is required." });
      return;
    }

    const [error, dto] = CreateCustomerContactRequestDto.create(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    try {
      const contact = await this.createCustomerContactUseCase.execute(customerId, dto!, {
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(201).json(contact.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while creating customer contact.";
      if (message === "Customer not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  updateContact = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const customerId = this.getSingleParam(req.params.id);
    if (!customerId) {
      res.status(400).json({ error: "Customer id is required." });
      return;
    }

    const contactId = this.getSingleParam(req.params.contactId);
    if (!contactId) {
      res.status(400).json({ error: "Contact id is required." });
      return;
    }

    const [error, dto] = UpdateCustomerContactRequestDto.create(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    try {
      const contact = await this.updateCustomerContactUseCase.execute(customerId, contactId, dto!, {
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(200).json(contact.toJSON());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while updating customer contact.";
      if (message === "Customer not found." || message === "Customer contact not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  removeContact = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const customerId = this.getSingleParam(req.params.id);
    if (!customerId) {
      res.status(400).json({ error: "Customer id is required." });
      return;
    }

    const contactId = this.getSingleParam(req.params.contactId);
    if (!contactId) {
      res.status(400).json({ error: "Contact id is required." });
      return;
    }

    try {
      await this.deleteCustomerContactUseCase.execute(customerId, contactId, {
        role: req.user.role,
        branchId: req.user.branchId,
      });

      res.status(204).send();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while deleting customer contact.";
      if (message === "Customer not found." || message === "Customer contact not found.") {
        res.status(404).json({ error: message });
        return;
      }
      res.status(400).json({ error: message });
    }
  };

  private getSingleParam(value: string | string[] | undefined): string | null {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return null;
  }
}
