import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { FileStoragePort, type SaveFileInput, type SavedFile, type StoredFileContent } from "../../domain/contracts/file-storage.port";

const EXTENSIONS_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export class LocalFileStorageAdapter extends FileStoragePort {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    super();
    this.rootPath = path.resolve(rootPath);
  }

  async save(input: SaveFileInput): Promise<SavedFile> {
    const now = new Date();
    const extension = EXTENSIONS_BY_MIME[input.mimeType] || path.extname(input.originalName).toLowerCase();
    const storageKey = [
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      `${randomUUID()}${extension}`,
    ].join("/");
    const filePath = this.resolveKey(storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.content, { flag: "wx" });
    return {
      storageKey,
      sizeBytes: input.content.byteLength,
      checksumSha256: createHash("sha256").update(input.content).digest("hex"),
    };
  }

  async read(storageKey: string): Promise<StoredFileContent | null> {
    try {
      return { content: await readFile(this.resolveKey(storageKey)) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.resolveKey(storageKey), { force: true });
  }

  private resolveKey(storageKey: string): string {
    const resolved = path.resolve(this.rootPath, storageKey);
    if (resolved !== this.rootPath && !resolved.startsWith(`${this.rootPath}${path.sep}`)) {
      throw new Error("Invalid storage key.");
    }
    return resolved;
  }
}
