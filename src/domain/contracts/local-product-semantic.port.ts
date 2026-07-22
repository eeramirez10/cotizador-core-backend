import { ProductEntity } from "../entities/product.entity";

export interface LocalProductSemanticMatch {
  productId: string;
  score: number;
}

export abstract class LocalProductSemanticPort {
  abstract search(input: {
    description: string;
    unit: string;
    topK: number;
  }): Promise<LocalProductSemanticMatch[]>;

  abstract upsert(product: ProductEntity): Promise<void>;
  abstract upsertMany(products: ProductEntity[]): Promise<void>;
  abstract remove(productId: string): Promise<void>;
}
