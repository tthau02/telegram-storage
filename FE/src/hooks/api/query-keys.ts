import type { CloudFileSearchParams } from "@/types/cloud-storage";
import type { UserSearchParams } from "@/types/users";

export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (params: UserSearchParams) => ["users", "list", params] as const,
    detail: (id: number) => ["users", "detail", id] as const,
  },
  cloudFiles: {
    all: ["cloudFiles"] as const,
    list: (params: CloudFileSearchParams) =>
      ["cloudFiles", "list", params] as const,
  },
};
