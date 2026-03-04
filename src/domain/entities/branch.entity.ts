export interface BranchEntity {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
}
