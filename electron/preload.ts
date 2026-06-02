import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  linkFolder:        () => ipcRenderer.invoke('link-folder'),
  getDirectories:    () => ipcRenderer.invoke('get-directories'),
  removeDirectory:   (id: number) => ipcRenderer.invoke('remove-directory', id),
  renameDirectory:   (id: number, alias: string) => ipcRenderer.invoke('rename-directory', id, alias),
  getAssets: (filters: {
    dirId?: number; subPath?: string; tagId?: number; search?: string; rating?: number;
    untagged?: boolean; recentDays?: number; typeFilter?: string; favorited?: boolean;
  }) => ipcRenderer.invoke('get-assets', filters),
  updateAsset: (id: number, updates: {
    title?: string; description?: string; rating?: number; source_url?: string; favorited?: number;
  }) => ipcRenderer.invoke('update-asset', id, updates),
  createTag:   (name: string, color?: string) => ipcRenderer.invoke('create-tag', name, color),
  getTags:     () => ipcRenderer.invoke('get-tags'),
  assignTag:   (assetId: number, tagId: number) => ipcRenderer.invoke('assign-tag', assetId, tagId),
  removeTag:   (assetId: number, tagId: number) => ipcRenderer.invoke('remove-tag', assetId, tagId),
  openFile:    (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  openUrl:     (url: string) => ipcRenderer.invoke('open-url', url),
  revealFile:  (filePath: string) => ipcRenderer.invoke('reveal-file', filePath),
  deleteAssets: (ids: number[]) => ipcRenderer.invoke('delete-assets', ids),
  renameAssets: (ids: number[], strategy: { type: 'prefix' | 'suffix' | 'replace', value: string }) => ipcRenderer.invoke('rename-assets', ids, strategy),
  duplicateAssets: (ids: number[]) => ipcRenderer.invoke('duplicate-assets', ids),
  moveAssets:  (ids: number[], targetDirPath: string) => ipcRenderer.invoke('move-assets', ids, targetDirPath),
  pickFolder:  () => ipcRenderer.invoke('pick-folder'),
  saveProcessedImage: (originalPath: string, buffer: Uint8Array) => ipcRenderer.invoke('save-processed-image', originalPath, buffer),
  createDirectory: (parentDirId: number, folderName: string) => ipcRenderer.invoke('create-directory', parentDirId, folderName),
  getSetting:  (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting:  (key: string, value: string) => ipcRenderer.invoke('set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('get-all-settings'),
  clearThumbnailCache: () => ipcRenderer.invoke('clear-thumbnail-cache'),
  optimizeDatabase: () => ipcRenderer.invoke('optimize-database'),

  onAssetProcessed: (callback: () => void) => {
    const sub = () => callback()
    ipcRenderer.on('asset-processed', sub)
    return () => ipcRenderer.removeListener('asset-processed', sub)
  },
  onDirectoriesUpdated: (callback: () => void) => {
    const sub = () => callback()
    ipcRenderer.on('directories-updated', sub)
    return () => ipcRenderer.removeListener('directories-updated', sub)
  },
})
