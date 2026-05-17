export type FolderDto = {
  id: number;
  name: string;
  ownerId: number;
  parentId: number | null;
  isStarred: boolean;
  createdAt: string;
  fileCount: number;
  childrenCount: number;
};

export type CreateFolderRequest = {
  name: string;
  parentId?: number | null;
};

export type RenameFolderRequest = {
  name: string;
};
