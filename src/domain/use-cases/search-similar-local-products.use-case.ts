import { LocalProductSemanticPort } from "../contracts/local-product-semantic.port";
import { SearchSimilarLocalProductsRequestDto } from "../dtos/request/search-similar-local-products-request.dto";
import { SimilarLocalProductsResponseDto } from "../dtos/response/similar-local-products-response.dto";
import { ProductRepository } from "../repositories/product.repository";

export class SearchSimilarLocalProductsUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly semanticPort: LocalProductSemanticPort,
    private readonly minimumScore: number,
  ) {}

  async execute(dto: SearchSimilarLocalProductsRequestDto): Promise<SimilarLocalProductsResponseDto> {
    const exact = await this.productRepository.findActiveLocalTempByDescriptionAndUnit({
      description: dto.description,
      unit: dto.unit,
    });
    if (exact) {
      return new SimilarLocalProductsResponseDto([{
        matchType: "EXACT",
        similarity: 1,
        product: exact,
      }], true);
    }

    try {
      const matches = await this.semanticPort.search({
        description: dto.description,
        unit: dto.unit,
        topK: dto.topK,
      });
      const eligible = matches.filter((match) => match.score >= this.minimumScore);
      const products = await this.productRepository.findActiveLocalTempsByIds(
        eligible.map((match) => match.productId),
      );
      const productById = new Map(products.map((product) => [product.id, product]));
      const normalizedUnit = dto.unit.trim().toUpperCase();
      const candidates = eligible.flatMap((match) => {
        const product = productById.get(match.productId);
        if (!product || product.unit.trim().toUpperCase() !== normalizedUnit) return [];
        return [{ matchType: "SEMANTIC" as const, similarity: match.score, product }];
      });
      return new SimilarLocalProductsResponseDto(candidates, true);
    } catch (error) {
      console.error("Local product semantic search is unavailable.", error);
      return new SimilarLocalProductsResponseDto([], false);
    }
  }
}
