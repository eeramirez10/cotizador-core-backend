interface GenerateOrderResponseDtoProps {
  quoteId: string;
  quoteNumber: string;
  status: string;
  orderReference: string;
  generatedAt: Date;
}

export class GenerateOrderResponseDto {
  private readonly quoteId: string;
  private readonly quoteNumber: string;
  private readonly status: string;
  private readonly orderReference: string;
  private readonly generatedAt: Date;

  constructor(props: GenerateOrderResponseDtoProps) {
    this.quoteId = props.quoteId;
    this.quoteNumber = props.quoteNumber;
    this.status = props.status;
    this.orderReference = props.orderReference;
    this.generatedAt = props.generatedAt;
  }

  toJSON() {
    return {
      quoteId: this.quoteId,
      quoteNumber: this.quoteNumber,
      status: this.status,
      orderReference: this.orderReference,
      generatedAt: this.generatedAt.toISOString(),
      message: "Order generated successfully.",
    };
  }
}
