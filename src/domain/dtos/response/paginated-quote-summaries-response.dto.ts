import { QuoteListSummaryResponseDto } from "./quote-list-summary-response.dto";

interface PaginatedQuoteSummariesResponseDtoProps {
  items: Array<{
    current: QuoteListSummaryResponseDto;
    relatedVersions: QuoteListSummaryResponseDto[];
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export class PaginatedQuoteSummariesResponseDto {
  constructor(private readonly props: PaginatedQuoteSummariesResponseDtoProps) {}

  toJSON() {
    const totalPages = Math.max(1, Math.ceil(this.props.total / this.props.pageSize));

    return {
      items: this.props.items.map((item) => ({
        ...item.current.toJSON(),
        relatedVersions: item.relatedVersions.map((version) => ({
          ...version.toJSON(),
          relatedVersions: [],
        })),
      })),
      total: this.props.total,
      page: this.props.page,
      pageSize: this.props.pageSize,
      totalPages,
      hasPrevPage: this.props.page > 1,
      hasNextPage: this.props.page < totalPages,
    };
  }
}
