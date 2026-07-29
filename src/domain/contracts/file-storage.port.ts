export interface SaveFileInput {
  content: Uint8Array;
  originalName: string;
  mimeType: string;
}

export interface SavedFile {
  storageKey: string;
  sizeBytes: number;
  checksumSha256: string;
}

export interface StoredFileContent {
  content: Uint8Array;
}

export abstract class FileStoragePort {
  abstract save(input: SaveFileInput): Promise<SavedFile>;
  abstract read(storageKey: string): Promise<StoredFileContent | null>;
  abstract delete(storageKey: string): Promise<void>;
}
