export interface AiPlatformResponse {
  status: number;
  body: unknown;
}

export interface AiPlatformFile {
  content: Uint8Array;
  originalName: string;
  mimeType: string;
}

export abstract class AiPlatformGateway {
  abstract requestJson(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<AiPlatformResponse>;

  abstract requestFile(path: string, file: AiPlatformFile): Promise<AiPlatformResponse>;
}
