import { ProductResponseDto } from "./product-response.dto";

interface PaginatedProductsResponseDtoProps {
  items: ProductResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class PaginatedProductsResponseDto {
  private readonly items: ProductResponseDto[];
  private readonly total: number;
  private readonly page: number;
  private readonly pageSize: number;

  constructor(props: PaginatedProductsResponseDtoProps) {
    this.items = props.items;
    this.total = props.total;
    this.page = props.page;
    this.pageSize = props.pageSize;
  }

  toJSON() {
    const totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));

    return {
      items: this.items.map((item) => item.toJSON()),
      total: this.total,
      page: this.page,
      pageSize: this.pageSize,
      totalPages,
      hasPrevPage: this.page > 1,
      hasNextPage: this.page < totalPages,
    };
  }
}
