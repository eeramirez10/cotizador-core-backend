export interface BranchEntity {
  id: string;
  code: string;
  name: string;
  address: string | null;
  street: string | null;
  exteriorNumber: string | null;
  interiorNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  municipality: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  isActive: boolean;
}
