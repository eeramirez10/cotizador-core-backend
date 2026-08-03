import {
  AiPlatformFile,
  AiPlatformGateway,
  AiPlatformResponse,
} from "../../domain/contracts/ai-platform.gateway";

export class AiPlatformHttpGateway extends AiPlatformGateway {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly internalApiKey?: string,
  ) {
    super();
  }

  public async requestJson(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<AiPlatformResponse> {
    return this.request(path, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  public async requestFile(path: string, file: AiPlatformFile): Promise<AiPlatformResponse> {
    const form = new FormData();
    const content = new ArrayBuffer(file.content.byteLength);
    new Uint8Array(content).set(file.content);
    form.append(
      "file",
      new Blob([content], { type: file.mimeType || "application/octet-stream" }),
      file.originalName,
    );
    return this.request(path, { method: "POST", body: form });
  }

  private async request(path: string, init: RequestInit): Promise<AiPlatformResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(
        `${this.baseUrl.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`,
        {
          ...init,
          signal: controller.signal,
          headers: {
            ...(this.internalApiKey ? { "x-internal-api-key": this.internalApiKey } : {}),
            ...(init.headers ?? {}),
          },
        },
      );
      const text = await response.text();
      return { status: response.status, body: this.parseBody(text) };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI platform request timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseBody(value: string): unknown {
    if (!value) return null;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return { error: value.slice(0, 1_000) };
    }
  }
}
