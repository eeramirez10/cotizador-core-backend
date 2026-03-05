import { QuoteResponseDto } from "./quote-response.dto";

interface PaginatedQuotesResponseDtoProps {
  items: QuoteResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class PaginatedQuotesResponseDto {
  private readonly items: QuoteResponseDto[];
  private readonly total: number;
  private readonly page: number;
  private readonly pageSize: number;

  constructor(props: PaginatedQuotesResponseDtoProps) {
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
