export interface ElectronAPI {
  linkFolder:      () => Promise<{ id: number; absolute_path: string; error?: string } | null>;
  getDirectories:  () => Promise<any[]>;
  removeDirectory: (id: number) => Promise<boolean>;
  renameDirectory: (id: number, alias: string) => Promise<boolean>;
  getAssets: (filters: {
    dirId?: number; subPath?: string; tagId?: number; search?: string; rating?: number;
    untagged?: boolean; recentDays?: number; typeFilter?: string; favorited?: boolean;
  }) => Promise<any[]>;
  updateAsset: (id: number, updates: {
    title?: string; description?: string; rating?: number; source_url?: string; favorited?: number;
  }) => Promise<boolean>;
  createTag:   (name: string, color?: string) => Promise<any>;
  getTags:     () => Promise<any[]>;
  assignTag:   (assetId: number, tagId: number) => Promise<boolean>;
  removeTag:   (assetId: number, tagId: number) => Promise<boolean>;
  openFile:    (filePath: string) => Promise<boolean>;
  openUrl:     (url: string) => Promise<boolean>;
  revealFile:  (filePath: string) => Promise<boolean>;
  deleteAssets: (ids: number[]) => Promise<boolean>;
  renameAssets: (ids: number[], strategy: { type: 'prefix' | 'suffix' | 'replace', value: string }) => Promise<boolean>;
  duplicateAssets: (ids: number[]) => Promise<boolean>;
  moveAssets:  (ids: number[], targetDirPath: string) => Promise<boolean>;
  pickFolder:  () => Promise<string | null>;
  saveProcessedImage: (originalPath: string, buffer: Uint8Array) => Promise<string>;
  createDirectory: (parentDirId: number, folderName: string) => Promise<boolean>;
  getSetting:  (key: string) => Promise<string | null>;
  setSetting:  (key: string, value: string) => Promise<boolean>;
  getAllSettings: () => Promise<Record<string, string>>;
  clearThumbnailCache: () => Promise<boolean>;
  optimizeDatabase: () => Promise<boolean>;
  onAssetProcessed:     (callback: () => void) => () => void;
  onDirectoriesUpdated: (callback: () => void) => () => void;
}

declare global {
  interface Window { electronAPI: ElectronAPI }
}
