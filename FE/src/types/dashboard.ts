export interface DashboardDailyStats {
  date: string; // Định dạng yyyy-MM-dd
  bytesUploaded: number;
  filesUploaded: number;
}

export interface DashboardStats {
  totalBytesUploaded: number;
  totalFilesUploaded: number;
  uploadLocalBytes: number;
  uploadMirrorBytes: number;
  uploadLocalCount: number;
  uploadMirrorCount: number;
  currentStorageBytes: number;
  currentFilesCount: number;
  dailyStats: DashboardDailyStats[];
}

export type DashboardSearchParams = {
  fromDate?: string; // yyyy-MM-dd
  toDate?: string; // yyyy-MM-dd
};
