import { ProductEntity } from "../../entities/product.entity";
import { ProductResponseDto } from "./product-response.dto";

export interface SimilarLocalProductCandidate {
  matchType: "EXACT" | "SEMANTIC";
  similarity: number;
  product: ProductEntity;
}

export class SimilarLocalProductsResponseDto {
  constructor(
    private readonly candidates: SimilarLocalProductCandidate[],
    private readonly semanticAvailable: boolean,
  ) {}

  toJSON() {
    return {
      semanticAvailable: this.semanticAvailable,
      items: this.candidates.map((candidate) => ({
        matchType: candidate.matchType,
        similarity: Number(candidate.similarity.toFixed(6)),
        similarityPercent: Number((candidate.similarity * 100).toFixed(1)),
        product: new ProductResponseDto(candidate.product).toJSON(),
      })),
    };
  }
}
