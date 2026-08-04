import { DEFAULT_MEASUREMENT_UNIT, normalizeMeasurementUnit } from "../../constants/measurement-unit.constants";
import { canonicalizeProductText } from "../../utils/canonical-product-text";

export class SearchSimilarLocalProductsRequestDto {
  constructor(
    public readonly description: string,
    public readonly unit: string,
    public readonly topK: number,
  ) {}

  static create(input: unknown): [string?, SearchSimilarLocalProductsRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const description = typeof body.description === "string"
      ? canonicalizeProductText(body.description)
      : "";
    if (!description) return ["description is required."];
    if (description.length > 500) return ["description must contain at most 500 characters."];

    const unit = normalizeMeasurementUnit(body.unit) ?? DEFAULT_MEASUREMENT_UNIT;
    const topKCandidate = Number(body.topK);
    const topK = Number.isInteger(topKCandidate) && topKCandidate >= 1 && topKCandidate <= 20
      ? topKCandidate
      : 8;
    return [, new SearchSimilarLocalProductsRequestDto(description, unit, topK)];
  }
}
