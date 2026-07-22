import { LocalProductSemanticMatch, LocalProductSemanticPort } from "../../domain/contracts/local-product-semantic.port";
import { ProductEntity } from "../../domain/entities/product.entity";

interface SemanticSearchResponse {
  items?: Array<{ productId?: string; score?: number }>;
}

export class GptLocalProductSemanticAdapter implements LocalProductSemanticPort {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly apiKey?: string,
  ) {}

  async search(input: { description: string; unit: string; topK: number }): Promise<LocalProductSemanticMatch[]> {
    const response = await this.request("/search", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const payload = await response.json() as SemanticSearchResponse;
    return (payload.items ?? []).flatMap((item) => {
      if (!item.productId || typeof item.score !== "number") return [];
      return [{ productId: item.productId, score: item.score }];
    });
  }

  async upsert(product: ProductEntity): Promise<void> {
    await this.request(`/${encodeURIComponent(product.id)}`, {
      method: "PUT",
      body: JSON.stringify(this.toPayload(product)),
    });
  }

  async upsertMany(products: ProductEntity[]): Promise<void> {
    if (products.length === 0) return;

    const batchSize = 200;
    for (let offset = 0; offset < products.length; offset += batchSize) {
      const batch = products.slice(offset, offset + batchSize);
      await this.request("/sync", {
        method: "POST",
        body: JSON.stringify({
          products: batch.map((product) => ({ productId: product.id, ...this.toPayload(product) })),
        }),
      });
    }
  }

  async remove(productId: string): Promise<void> {
    await this.request(`/${encodeURIComponent(productId)}`, { method: "DELETE" });
  }

  private toPayload(product: ProductEntity) {
    return {
      description: product.description,
      unit: product.unit,
      branchId: product.branchId,
    };
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          ...(this.apiKey ? { "x-internal-api-key": this.apiKey } : {}),
          ...(init.headers ?? {}),
        },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Local product semantic service failed (${response.status}): ${body.slice(0, 300)}`);
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
