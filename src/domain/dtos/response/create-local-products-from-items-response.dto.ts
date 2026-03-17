import { ProductResponseDto } from "./product-response.dto";

type BatchAction = "created" | "matched";

interface LocalProductsFromItemsResultDto {
  itemId: string;
  action: BatchAction;
  product: ProductResponseDto;
}

interface CreateLocalProductsFromItemsResponseDtoProps {
  items: LocalProductsFromItemsResultDto[];
}

export class CreateLocalProductsFromItemsResponseDto {
  private readonly items: LocalProductsFromItemsResultDto[];

  constructor(props: CreateLocalProductsFromItemsResponseDtoProps) {
    this.items = props.items;
  }

  toJSON() {
    const createdCount = this.items.filter((item) => item.action === "created").length;
    const matchedCount = this.items.filter((item) => item.action === "matched").length;

    return {
      createdCount,
      matchedCount,
      total: this.items.length,
      items: this.items.map((item) => ({
        itemId: item.itemId,
        action: item.action,
        product: item.product.toJSON(),
      })),
    };
  }
}
