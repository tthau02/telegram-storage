export type CloudFileDto = {
  id: number;
  fileName: string;
  telegramMessageId: number;
  fileHash: string;
  fileSize: number;
  mimeType: string;
  thumbnailFileId?: number | null;
  thumbnailUrl?: string | null;
  /** Giống User: ISO 8601 từ `DateTimeOffset` (JSON). */
  createdAt: string;
};

export type CloudFileSearchParams = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  isDesc?: boolean;
  fileName?: string;
  mimeType?: string;
  minFileSize?: number;
  maxFileSize?: number;
  createdFrom?: string;
  createdTo?: string;
  sourceUrl?: string;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  sortedBy: string;
  isDesc: boolean;
};

export type MirrorUploadRequest = {
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
};
