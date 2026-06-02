import { useEffect, useState, useRef, useMemo } from 'react'
import {
  FolderPlus, Search, Trash2, ExternalLink, Folder, Tag as TagIcon,
  Star, Plus, X, FileImage, RefreshCw, ChevronDown, ChevronRight,
  Layers, Hash, Link2, Copy, Clock, Pencil, Check, PanelRight,
  Heart, Music, Scissors
} from 'lucide-react'
import { useSettings } from './hooks/useSettings'
import { AssetGrid } from './components/AssetGrid'
import { SettingsPanel } from './components/SettingsPanel'
import { LightroomViewer } from './components/LightroomViewer'
import { CustomDialogModal } from './components/CustomDialogModal'
import { MoveToFolderModal } from './components/MoveToFolderModal'
import { cn } from './lib/utils'

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  const k = 1024, sizes = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/* ── Sidebar collapsible section ────────────────────────────────────────────── */
function SideSection({ label, count, action, children, defaultOpen = true }:
  { label: string; count?: number; action?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }
) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-0.5 group/section">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] hover:text-foreground transition-colors py-1 flex-1 text-left"
        >
          {open ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          {label}
          {count !== undefined && (
            <span className="ml-0.5 text-[9px] font-semibold bg-muted text-muted-foreground/70 px-1 py-px rounded-sm">{count}</span>
          )}
        </button>
        <div className="opacity-0 group-hover/section:opacity-100 transition-opacity">
          {action}
        </div>
      </div>
      {open && <div className="space-y-px">{children}</div>}
    </div>
  )
}

/* ── Editable Folder Nav Item ─────────────────────────────────────────────── */
function EditableFolderItem({
  dir, isActive, onClick, onRemove, onRename, onCreateSubfolder
}: {
  dir: any; isActive: boolean; onClick: () => void; onRemove: (e: React.MouseEvent) => void; onRename: (id: number, alias: string) => void; onCreateSubfolder: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(dir.alias || dir.absolute_path.split('/').pop() || dir.absolute_path)

  const handleSave = () => {
    setIsEditing(false)
    if (editValue.trim() !== dir.alias) onRename(dir.id, editValue.trim())
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setIsEditing(false); setEditValue(dir.alias || dir.absolute_path.split('/').pop() || dir.absolute_path) }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-background border border-accent rounded-md ml-1 mr-2">
        <input
          autoFocus type="text"
          value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave}
          className="flex-1 bg-transparent text-xs font-medium text-foreground focus:outline-none min-w-0"
        />
        <button onClick={handleSave} className="p-0.5 text-accent hover:text-accent/80 transition-colors">
          <Check className="h-3 w-3" />
        </button>
      </div>
    )
  }

  const displayName = dir.alias || dir.absolute_path.split('/').pop() || dir.absolute_path

  return (
    <div className="group relative">
      <button onClick={onClick} onDoubleClick={() => setIsEditing(true)} className={cn('nav-item pr-14', isActive ? 'active' : '')}>
        <Folder className={cn('h-3.5 w-3.5 flex-shrink-0', dir.status === 'scanning' && 'text-amber-500 animate-pulse')} />
        <span className="truncate flex-1 text-left" title={`Original: ${dir.absolute_path}`}>{displayName}</span>
        <span className="text-[10px] text-muted-foreground/60 tabular-nums">{dir.asset_count ?? ''}</span>
      </button>
      
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-all bg-card/80 backdrop-blur-sm rounded px-0.5 py-0.5 gap-0.5">
        <button onClick={(e) => { e.stopPropagation(); onCreateSubfolder() }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Create subfolder">
          <FolderPlus className="h-2.5 w-2.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true) }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all" title="Rename alias">
          <Pencil className="h-2.5 w-2.5" />
        </button>
        <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all" title="Remove folder">
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}


/* ── Color swatch strip ─────────────────────────────────────────────────────── */
function ColorPalette({ colors }: { colors: string[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopied(hex)
    setTimeout(() => setCopied(null), 1400)
  }
  return (
    <div className="flex items-center gap-1.5">
      {colors.map((hex, i) => (
        <button
          key={i} onClick={() => copy(hex)} title={`${hex} — click to copy`}
          className="relative group/swatch flex-1 h-7 rounded-md border border-black/10 dark:border-white/10 transition-all hover:scale-110 hover:shadow-md hover:z-10 active:scale-95"
          style={{ backgroundColor: hex }}
        >
          {copied === hex && (
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg animate-fade-up">Copied!</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ── Inspector field ────────────────────────────────────────────────────────── */
function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <span className="text-muted-foreground text-[11px]">{label}</span>
      <span className={cn('text-foreground text-right truncate text-[11px]', mono && 'font-mono text-[10px]')} title={value}>{value}</span>
    </>
  )
}

export default function App() {
  const { settings, updateSetting } = useSettings()

  const [directories, setDirectories] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [untaggedCount, setUntaggedCount] = useState(0)

  // Local editing states for inspector fields to avoid focus loss & lag
  const [localTitle, setLocalTitle] = useState('')
  const [localNotes, setLocalNotes] = useState('')
  const [localSourceUrl, setLocalSourceUrl] = useState('')

  // Filtering state
  const [selectedDirId, setSelectedDirId] = useState<number | undefined>()
  const [selectedSubPath, setSelectedSubPath] = useState<string | undefined>()
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [showInspector, setShowInspector] = useState(true)
  const [showUntagged, setShowUntagged] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [recentDays, setRecentDays] = useState<number | undefined>()
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [ratingFilter, setRatingFilter] = useState<number | undefined>()

  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null)

  // Custom move to folder state
  const [moveToFolderState, setMoveToFolderState] = useState<{
    isOpen: boolean
    assetIds: number[]
  }>({
    isOpen: false,
    assetIds: [],
  })

  const [showNewTagInput, setShowNewTagInput] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3b82f6')
  const [isScanning, setIsScanning] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  // Custom dialog state
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean
    type: 'alert' | 'confirm' | 'prompt'
    title: string
    message: string
    placeholder?: string
    defaultValue?: string
    onConfirm: (val?: string) => void
    onCancel: () => void
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  })

  const showCustomConfirm = (title: string, message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }))
          resolve(true)
        },
        onCancel: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }))
          resolve(false)
        }
      })
    })
  }

  const showCustomPrompt = (title: string, message: string, defaultValue = '', placeholder = ''): Promise<string | null> => {
    return new Promise(resolve => {
      setDialogConfig({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        onConfirm: (val) => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }))
          resolve(val ?? '')
        },
        onCancel: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }))
          resolve(null)
        }
      })
    })
  }

  const showCustomAlert = (title: string, message: string): Promise<void> => {
    return new Promise(resolve => {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }))
          resolve()
        },
        onCancel: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }))
          resolve()
        }
      })
    })
  }

  /* ── Data loaders ─────────────────────────────────────────────────────── */
  const loadNavigation = async () => {
    if (!window.electronAPI) return
    const [dirs, allTags] = await Promise.all([
      window.electronAPI.getDirectories(),
      window.electronAPI.getTags(),
    ])
    setDirectories(dirs)
    setTags(allTags)
    setIsScanning(dirs.some((d: any) => d.status === 'scanning'))
  }

  const loadAssets = async () => {
    if (!window.electronAPI) return
    const [list, all, untagged] = await Promise.all([
      window.electronAPI.getAssets({ dirId: selectedDirId, subPath: selectedSubPath, tagId: selectedTagId, search: searchQuery, untagged: showUntagged || undefined, recentDays, typeFilter, favorited: showFavorites || undefined }),
      window.electronAPI.getAssets({}),
      window.electronAPI.getAssets({ untagged: true }),
    ])
    setAssets(list)
    setTotalCount(all.length)
    setUntaggedCount(untagged.length)
    if (selectedAsset) {
      const updated = all.find((a: any) => a.id === selectedAsset.id)
      if (updated) {
        setSelectedAsset(updated)
      } else {
        setSelectedAsset(null)
      }
    }
  }

  useEffect(() => {
    loadNavigation()
    loadAssets()
    if (!window.electronAPI) return
    const u1 = window.electronAPI.onAssetProcessed(loadAssets)
    const u2 = window.electronAPI.onDirectoriesUpdated(loadNavigation)
    return () => { u1(); u2() }
  }, [selectedDirId, selectedSubPath, selectedTagId, searchQuery, showUntagged, showFavorites, recentDays, typeFilter])

  useEffect(() => { setIsScanning(directories.some(d => d.status === 'scanning')) }, [directories])

  // Sync local inspector fields with selectedAsset changes
  useEffect(() => {
    if (selectedAsset) {
      setLocalTitle(selectedAsset.title || '')
      setLocalNotes(selectedAsset.description || '')
      setLocalSourceUrl(selectedAsset.source_url || '')
    } else {
      setLocalTitle('')
      setLocalNotes('')
      setLocalSourceUrl('')
    }
  }, [selectedAsset?.id])

  /* ── Keyboard shortcut ────────────────────────────────────────────────── */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  /* ── Actions ──────────────────────────────────────────────────────────── */
  const handleLinkFolder = async () => {
    if (!window.electronAPI) return
    const res = await window.electronAPI.linkFolder()
    if (res && 'error' in res) {
      showCustomAlert('Link Folder Error', res.error || 'Failed to link folder.')
    } else {
      loadNavigation()
    }
  }

  const handleRemoveFolder = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.electronAPI) return
    if (await showCustomConfirm('Unlink Folder', 'Are you sure you want to unlink this folder? Beaver will remove all asset thumbnails and metadata from the database, but your original physical files will remain completely untouched.')) {
      await window.electronAPI.removeDirectory(id)
      if (selectedDirId === id) setSelectedDirId(undefined)
      loadNavigation(); loadAssets()
    }
  }

  const handleRenameFolder = async (id: number, alias: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.renameDirectory(id, alias)
    loadNavigation()
  }

  const handleDeleteAssets = async (ids: number[]) => {
    if (!window.electronAPI) return
    if (await showCustomConfirm('Move to Trash', `Are you sure you want to move ${ids.length} selected item(s) to the Trash? This will permanently delete the physical files from your local drive.`)) {
      await window.electronAPI.deleteAssets(ids)
      if (selectedAsset && ids.includes(selectedAsset.id)) setSelectedAsset(null)
      loadAssets()
    }
  }

  const handleRenameAssets = async (ids: number[]) => {
    if (!window.electronAPI) return
    
    // Find default value if single item
    let defaultVal = ''
    if (ids.length === 1 && selectedAsset) {
      const ext = selectedAsset.extension
      defaultVal = selectedAsset.filename
      if (defaultVal.toLowerCase().endsWith(ext.toLowerCase())) {
        defaultVal = defaultVal.slice(0, -ext.length)
      }
    }

    const renameTo = await showCustomPrompt(
      ids.length > 1 ? `Batch Rename ${ids.length} Items` : 'Rename File',
      ids.length > 1 
        ? `Enter a base name for the selected ${ids.length} items. We will append sequential suffixes automatically (e.g. "-1", "-2").`
        : 'Enter the new name for this file. The file extension will be preserved automatically.',
      defaultVal,
      'New name...'
    )
    
    if (renameTo && renameTo.trim()) {
      await window.electronAPI.renameAssets(ids, { type: 'replace', value: renameTo.trim() })
      loadAssets()
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim() || !window.electronAPI) return
    const res = await window.electronAPI.createTag(newTagName.trim(), newTagColor)
    if (res && !res.error) {
      setNewTagName('')
      setShowNewTagInput(false)
      loadNavigation()
    } else {
      showCustomAlert('Create Tag Error', res?.error || 'Failed to create tag.')
    }
  }

  const handleAssignTag   = async (tagId: number) => { if (!selectedAsset || !window.electronAPI) return; if (await window.electronAPI.assignTag(selectedAsset.id, tagId)) loadAssets() }
  const handleRemoveTag   = async (tagId: number) => { if (!selectedAsset || !window.electronAPI) return; if (await window.electronAPI.removeTag(selectedAsset.id, tagId)) loadAssets() }
  const handleUpdateAsset = async (u: { title?: string; description?: string; rating?: number; source_url?: string }) => {
    if (!selectedAsset || !window.electronAPI) return
    if (await window.electronAPI.updateAsset(selectedAsset.id, u)) loadAssets()
  }
  const handleOpenFile   = (p: string) => window.electronAPI?.openFile(p)
  const handleRevealFile = (p: string) => window.electronAPI?.revealFile(p)

  const handleToggleFavorite = async (asset: any) => {
    if (!window.electronAPI) return
    const next = asset.favorited ? 0 : 1
    await window.electronAPI.updateAsset(asset.id, { favorited: next })
    loadAssets()
  }

  const handleDuplicateAssets = async (ids: number[]) => {
    if (!window.electronAPI) return
    await window.electronAPI.duplicateAssets(ids)
    loadAssets()
  }

  const handleMoveAssets = async (ids: number[]) => {
    setMoveToFolderState({ isOpen: true, assetIds: ids })
  }

  const handlePerformMoveAssets = async (targetPath: string) => {
    if (!window.electronAPI) return
    await window.electronAPI.moveAssets(moveToFolderState.assetIds, targetPath)
    setMoveToFolderState({ isOpen: false, assetIds: [] })
    loadAssets()
    loadNavigation()
  }

  const handleCreateSubfolder = async (dirId: number) => {
    if (!window.electronAPI) return
    const folderName = await showCustomPrompt(
      'Create Subfolder',
      'Enter the name of the new subfolder to create within this folder:',
      '',
      'Subfolder name...'
    )
    if (folderName && folderName.trim()) {
      const success = await window.electronAPI.createDirectory(dirId, folderName.trim())
      if (success) {
        loadNavigation()
      } else {
        showCustomAlert('Error Creating Subfolder', 'Failed to create the subfolder. It might already exist, or there could be file system permission restrictions.')
      }
    }
  }

  const [isRemovingBg, setIsRemovingBg] = useState(false)
  const handleRemoveBackground = async () => {
    if (!selectedAsset || !window.electronAPI || isRemovingBg) return
    setIsRemovingBg(true)
    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const imageUrl = `media://${encodeURIComponent(selectedAsset.absolute_path)}`
      const blob = await removeBackground(imageUrl, { output: { format: 'image/png' } })
      const arrayBuffer = await blob.arrayBuffer()
      await window.electronAPI.saveProcessedImage(selectedAsset.absolute_path, new Uint8Array(arrayBuffer))
      loadAssets()
    } catch (err) {
      console.error('Background removal failed', err)
      showCustomAlert('Background Removal Failed', 'Background removal failed. Check the console for details.')
    } finally {
      setIsRemovingBg(false)
    }
  }

  const getAssetTags = (asset: any) => {
    if (!asset.tag_names || !asset.tag_ids) return []
    return asset.tag_names.split(',').map((name: string, i: number) => ({ id: parseInt(asset.tag_ids.split(',')[i]), name }))
  }

  const unassignedTags = useMemo(() => {
    if (!selectedAsset) return tags
    const assetTagIds = new Set(getAssetTags(selectedAsset).map((a: any) => a.id))
    return tags.filter(t => !assetTagIds.has(t.id))
  }, [tags, selectedAsset])

  const selectView = (view: 'all' | 'untagged' | 'recent' | 'favorites' | { dirId: number; subPath?: string } | { tagId: number }) => {
    setShowUntagged(false); setShowFavorites(false); setRecentDays(undefined); setSelectedDirId(undefined)
    setSelectedTagId(undefined); setRatingFilter(undefined); setTypeFilter(undefined); setSelectedSubPath(undefined)
    if (view === 'untagged') setShowUntagged(true)
    else if (view === 'favorites') setShowFavorites(true)
    else if (view === 'recent') setRecentDays(settings.recentDaysWindow)
    else if (view !== 'all' && 'dirId' in view) { setSelectedDirId(view.dirId); setSelectedSubPath(view.subPath) }
    else if (view !== 'all' && 'tagId' in view) setSelectedTagId(view.tagId)
  }

  const isAllSelected = !selectedDirId && !selectedTagId && !showUntagged && !showFavorites && !recentDays && ratingFilter === undefined

  const assetColors: string[] = useMemo(() => {
    if (!selectedAsset?.colors) return []
    try { return JSON.parse(selectedAsset.colors) } catch { return [] }
  }, [selectedAsset?.colors])

  // Sidebar filtering logic
  const filteredDirs = directories.filter(d => {
    const name = d.alias || d.absolute_path.split('/').pop() || ''
    return name.toLowerCase().includes(sidebarSearch.toLowerCase())
  })
  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(sidebarSearch.toLowerCase()))

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans antialiased select-none">

      {/* ═══════════════════════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════════════════════════ */}
      <aside className="w-[240px] flex flex-col pt-10 flex-shrink-0 overflow-hidden border-r border-border relative group/sidebar [-webkit-app-region:drag]" style={{ background: 'hsl(var(--sidebar-bg))' }}>

        {/* Branding & Sidebar Search */}
        <div className="px-3.5 pt-3 pb-3 border-b border-border/60 space-y-3 flex-shrink-0 [-webkit-app-region:no-drag]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="Beaver_Alpha_logo.png" alt="Beaver Logo" className="h-6 w-6 object-contain drop-shadow-sm" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground tracking-tight leading-none">Beaver</span>
                <span className="text-[9px] font-semibold text-muted-foreground/70 tracking-wider mt-0.5 uppercase">By Odd Omens</span>
              </div>
            </div>
            {isScanning && <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin" />}
          </div>
          
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text" placeholder="Filter folders & tags…"
              value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}
              className="w-full bg-background/50 border border-input/60 rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 pb-16 [-webkit-app-region:no-drag]">

          {/* Smart views */}
          <div className="space-y-px">
            <button onClick={() => selectView('all')} className={cn('nav-item', isAllSelected ? 'active' : '')}>
              <Layers className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">All Assets</span>
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{totalCount}</span>
            </button>

            <button onClick={() => selectView('favorites')} className={cn('nav-item', showFavorites ? 'active' : '')}>
              <Heart className={cn('h-3.5 w-3.5 flex-shrink-0', showFavorites && 'fill-current')} />
              <span className="flex-1 text-left">Favorites</span>
            </button>

            <button onClick={() => selectView('recent')} className={cn('nav-item', recentDays ? 'active' : '')}>
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">Recently Added</span>
            </button>

            <button onClick={() => selectView('untagged')} className={cn('nav-item', showUntagged ? 'active' : '')}>
              <Hash className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">Untagged</span>
              {untaggedCount > 0 && <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{untaggedCount}</span>}
            </button>
          </div>

          {/* Folders */}
          {(sidebarSearch ? filteredDirs.length > 0 : true) && (
            <SideSection
              label="Folders"
              count={directories.length}
              action={
                <button onClick={handleLinkFolder} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Link folder">
                  <Plus className="h-3 w-3" />
                </button>
              }
            >
              {filteredDirs.map(dir => (
                <div key={dir.id}>
                  <EditableFolderItem
                    dir={dir}
                    isActive={selectedDirId === dir.id && !selectedSubPath}
                    onClick={() => selectView({ dirId: dir.id })}
                    onRemove={e => handleRemoveFolder(dir.id, e)}
                    onRename={handleRenameFolder}
                    onCreateSubfolder={() => handleCreateSubfolder(dir.id)}
                  />
                  {dir.subdirectories?.map((sub: string) => {
                    const depth = sub.split('/').length;
                    return (
                      <button 
                        key={`${dir.id}-${sub}`}
                        onClick={() => selectView({ dirId: dir.id, subPath: sub })}
                        className={cn('nav-item pr-14 group/sub', selectedDirId === dir.id && selectedSubPath === sub ? 'active' : '')}
                        style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
                      >
                        <Folder className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 group-hover/sub:text-muted-foreground/70" />
                        <span className="truncate flex-1 text-left text-[11px] text-muted-foreground group-hover/sub:text-foreground">{sub.split('/').pop()}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {directories.length === 0 && !sidebarSearch && (
                <button onClick={handleLinkFolder} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg border border-dashed border-border/60 hover:border-border transition-all mt-1 ml-1 mr-2 max-w-[calc(100%-12px)]">
                  <FolderPlus className="h-3.5 w-3.5" /> Link a folder
                </button>
              )}
            </SideSection>
          )}

          {/* Tags */}
          {(sidebarSearch ? filteredTags.length > 0 : true) && (
            <SideSection
              label="Tags"
              count={tags.length}
              action={
                <button onClick={() => setShowNewTagInput(v => !v)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="New tag">
                  <Plus className="h-3 w-3" />
                </button>
              }
            >
              {showNewTagInput && (
                <form onSubmit={handleCreateTag} className="bg-background border border-border rounded-xl p-2 space-y-2 mb-1 mx-1 animate-fade-up shadow-sm">
                  <input type="text" placeholder="Tag name" value={newTagName} onChange={e => setNewTagName(e.target.value)}
                    className="w-full bg-muted/30 border border-input rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none" autoFocus />
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex gap-1.5">
                      {['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899'].map(c => (
                        <button key={c} type="button" onClick={() => setNewTagColor(c)}
                          className="h-3.5 w-3.5 rounded-full transition-all"
                          style={{ backgroundColor: c, outline: newTagColor === c ? `1.5px solid ${c}` : 'none', outlineOffset: '1px', transform: newTagColor === c ? 'scale(1.2)' : 'scale(1)' }} />
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <button type="submit" className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded hover:bg-primary/90">Add</button>
                      <button type="button" onClick={() => setShowNewTagInput(false)} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-semibold rounded border border-border">Cancel</button>
                    </div>
                  </div>
                </form>
              )}
              {filteredTags.map(tag => (
                <button key={tag.id} onClick={() => selectView({ tagId: tag.id })} className={cn('nav-item', selectedTagId === tag.id ? 'active' : '')}>
                  <span className="h-2 w-2 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: tag.color }} />
                  <span className="truncate flex-1 text-left">{tag.name}</span>
                </button>
              ))}
              {tags.length === 0 && !showNewTagInput && !sidebarSearch && (
                <p className="text-[11px] text-muted-foreground/50 px-3 py-1 italic">No tags yet.</p>
              )}
            </SideSection>
          )}

        </div>

        {/* Sidebar Footer — Settings */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[hsl(var(--sidebar-bg))] via-[hsl(var(--sidebar-bg))] to-transparent [-webkit-app-region:no-drag]">
          <SettingsPanel settings={settings} onUpdate={updateSetting} />
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN
      ════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col pt-10 bg-background overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-12 border-b border-border bg-card/40 flex items-center gap-4 px-5 flex-shrink-0 [-webkit-app-region:drag]">
          <div className="flex-1 max-w-md mx-4 relative pointer-events-auto [-webkit-app-region:no-drag]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <input
              ref={searchRef} type="text" placeholder="Search assets by name or path..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Type Filter Bar */}
          <div className="flex items-center gap-1 bg-muted/30 border border-border/60 rounded-lg p-0.5 pointer-events-auto [-webkit-app-region:no-drag]">
            {([
              { key: undefined, label: 'All' },
              { key: 'image', label: 'Images' },
              { key: 'video', label: 'Video' },
              { key: 'vector', label: 'Vectors' },
              { key: 'doc', label: 'Docs' }
            ] as const).map(opt => (
              <button
                key={opt.label}
                onClick={() => setTypeFilter(opt.key)}
                className={cn(
                  'px-3 py-1 text-[11px] font-semibold rounded-md transition-all',
                  typeFilter === opt.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 [-webkit-app-region:no-drag] pointer-events-auto">
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={cn(
                "p-2 rounded-lg transition-colors border shadow-sm",
                showInspector ? "bg-accent-bg text-white border-transparent" : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
              )}
              title="Toggle Inspector"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Grid */}
        <AssetGrid
          assets={assets}
          selectedAsset={selectedAsset}
          settings={settings}
          onSelectAsset={setSelectedAsset}
          onOpenFile={handleOpenFile}
          onLinkFolder={handleLinkFolder}
          onUpdateSettings={updateSetting}
          onDeleteAssets={handleDeleteAssets}
          onRenameAssets={handleRenameAssets}
          onDuplicateAssets={handleDuplicateAssets}
          onMoveAssets={handleMoveAssets}
          onToggleFavorite={handleToggleFavorite}
          onViewAssets={(idx) => setViewerStartIndex(idx)}
        />
        
        {/* Fullscreen Viewer */}
        {viewerStartIndex !== null && (
          <LightroomViewer 
            assets={assets} 
            startIndex={viewerStartIndex} 
            onClose={() => setViewerStartIndex(null)} 
          />
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          INSPECTOR
      ════════════════════════════════════════════════════════════════════ */}
      <aside className={cn(
        "border-l border-border bg-card flex flex-col pt-10 flex-shrink-0 overflow-hidden shadow-[-4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
        (showInspector && selectedAsset) ? "w-[260px] opacity-100" : "w-0 opacity-0 border-l-0"
      )}>
        {selectedAsset ? (() => {
          const isVideo  = ['.mp4','.webm','.ogg','.mov','.mkv'].includes(selectedAsset.extension.toLowerCase())
          const isAudio  = ['.mp3','.wav','.aac','.flac','.m4a','.opus'].includes(selectedAsset.extension.toLowerCase())
          const isVector = ['.ai','.pdf'].includes(selectedAsset.extension.toLowerCase())
          const isEps    = selectedAsset.extension.toLowerCase() === '.eps'
          const ext = selectedAsset.extension.toUpperCase().replace('.', '')
          const assetTags = getAssetTags(selectedAsset)
          const assetFolderName = selectedAsset.dir_alias || selectedAsset.dir_path?.split('/').pop() || null

          return (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Preview */}
              <div className="p-4 border-b border-border space-y-3 flex-shrink-0">
                <div className="aspect-video bg-muted/30 rounded-xl overflow-hidden flex items-center justify-center border border-border/60 relative group/preview">
                  <span className={cn('absolute top-2 right-2 px-1.5 py-px rounded text-[9px] font-bold z-10', isVideo ? 'badge-video' : (isVector || isEps) ? 'badge-doc' : isAudio ? 'badge-other' : 'badge-img')}>{ext}</span>
                  {/* Favorite toggle */}
                  <button
                    onClick={() => handleToggleFavorite(selectedAsset)}
                    className={cn('absolute top-2 left-2 z-10 p-1 rounded-full transition-all', selectedAsset.favorited ? 'text-rose-500' : 'text-white/0 group-hover/preview:text-white/70 hover:!text-rose-400')}
                  >
                    <Heart className={cn('h-3.5 w-3.5', selectedAsset.favorited && 'fill-current')} />
                  </button>
                  {isAudio ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground w-full px-3">
                      <Music className="h-8 w-8 text-muted-foreground/30" />
                      <audio src={`media://${encodeURIComponent(selectedAsset.absolute_path)}`} controls className="w-full h-8 mt-1" />
                    </div>
                  ) : isVideo ? (
                    <video src={`media://${encodeURIComponent(selectedAsset.absolute_path)}`} controls className="max-h-full max-w-full object-contain" />
                  ) : isVector ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileImage className="h-8 w-8 text-muted-foreground/30" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">{ext}</span>
                    </div>
                  ) : (isEps && selectedAsset.thumbnail_path) ? (
                    <img src={`media://${encodeURIComponent(selectedAsset.thumbnail_path)}`} alt={selectedAsset.filename} className="max-h-full max-w-full object-contain" />
                  ) : isEps ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileImage className="h-8 w-8 text-muted-foreground/30" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50">EPS</span>
                    </div>
                  ) : selectedAsset.thumbnail_path ? (
                    <img src={`media://${encodeURIComponent(selectedAsset.thumbnail_path)}`} alt={selectedAsset.filename} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <FileImage className="h-8 w-8 text-muted-foreground/25" />
                  )}
                  {/* Hover open overlay — skip for audio */}
                  {!isAudio && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]" onClick={() => handleOpenFile(selectedAsset.absolute_path)}>
                      <div className="bg-white/10 text-white rounded-full p-3 backdrop-blur-md border border-white/20">
                        <ExternalLink className="h-5 w-5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Remove Background button — only for raster images */}
                {['.png','.jpg','.jpeg','.webp'].includes(selectedAsset.extension.toLowerCase()) && (
                  <button
                    onClick={handleRemoveBackground}
                    disabled={isRemovingBg}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/60 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all disabled:opacity-50 disabled:cursor-wait"
                  >
                    <Scissors className="h-3 w-3" />
                    {isRemovingBg ? 'Removing background…' : 'Remove Background'}
                  </button>
                )}

                {assetColors.length > 0 && (
                  <div className="space-y-1.5">
                    <ColorPalette colors={assetColors} />
                  </div>
                )}

                <p className="text-xs font-semibold text-foreground truncate leading-snug" title={selectedAsset.filename}>
                  {selectedAsset.title || selectedAsset.filename}
                </p>
              </div>

              {/* Scrollable fields */}
              <div className="flex-1 overflow-y-auto divide-y divide-border">

                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Rating</p>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => handleUpdateAsset({ rating: selectedAsset.rating === star ? 0 : star })} className="hover:scale-110 transition-transform p-0.5">
                        <Star className={cn('h-5 w-5', selectedAsset.rating >= star ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/15')} />
                      </button>
                    ))}
                    {selectedAsset.rating > 0 && (
                      <button onClick={() => handleUpdateAsset({ rating: 0 })} className="ml-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">Clear</button>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Title</p>
                  <input
                    type="text"
                    value={localTitle}
                    onChange={e => setLocalTitle(e.target.value)}
                    onBlur={() => {
                      if (localTitle.trim() !== (selectedAsset?.title || '')) {
                        handleUpdateAsset({ title: localTitle.trim() || '' })
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                    placeholder="Add an alias…"
                    className="w-full bg-muted/30 border border-input rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                </div>

                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</p>
                  <textarea
                    value={localNotes}
                    onChange={e => setLocalNotes(e.target.value)}
                    onBlur={() => {
                      if (localNotes.trim() !== (selectedAsset?.description || '')) {
                        handleUpdateAsset({ description: localNotes.trim() || '' })
                      }
                    }}
                    placeholder="Add notes…"
                    rows={3}
                    className="w-full bg-muted/30 border border-input rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Source URL</p>
                  <div className="relative">
                    <Link2 className="h-3 w-3 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="url"
                      value={localSourceUrl}
                      onChange={e => setLocalSourceUrl(e.target.value)}
                      onBlur={() => {
                        if (localSourceUrl.trim() !== (selectedAsset?.source_url || '')) {
                          handleUpdateAsset({ source_url: localSourceUrl.trim() || '' })
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.currentTarget.blur()
                      }}
                      placeholder="https://…"
                      className="w-full bg-muted/30 border border-input rounded-lg pl-7 pr-2.5 py-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none font-mono"
                    />
                  </div>
                  {selectedAsset.source_url && (
                    <button onClick={() => window.open(selectedAsset.source_url, '_blank')} className="mt-1.5 text-[10px] accent-text hover:underline truncate block max-w-full text-left">
                      {selectedAsset.source_url}
                    </button>
                  )}
                </div>

                <div className="px-4 py-3 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assetTags.map((tag: any) => (
                      <span key={tag.id} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${tag.color || '#71717a'} 15%, transparent)`,
                          color: tag.color || '#71717a',
                          border: `1px solid color-mix(in srgb, ${tag.color || '#71717a'} 40%, transparent)`
                        }}>
                        {tag.name}
                        <button onClick={() => handleRemoveTag(tag.id)} className="hover:opacity-60 transition-opacity"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                    {assetTags.length === 0 && <p className="text-[11px] text-muted-foreground/50 italic">None assigned</p>}
                  </div>
                  {unassignedTags.length > 0 && (
                    <div className="bg-muted/20 border border-border/60 rounded-xl p-2 space-y-1.5">
                      <div className="relative">
                        <Search className="h-3 w-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="Find tag…" value={tagSearch} onChange={e => setTagSearch(e.target.value)}
                          className="w-full bg-background border border-input rounded-md pl-6 pr-2 py-1 text-[11px] focus:outline-none" />
                      </div>
                      <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 pb-1">
                        {unassignedTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase())).map(tag => (
                          <button key={tag.id} onClick={() => handleAssignTag(tag.id)}
                            className="text-[10px] font-semibold hover:scale-[1.02] active:scale-95 px-2 py-0.5 rounded-full transition-all"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${tag.color || '#71717a'} 10%, transparent)`,
                              color: tag.color || '#71717a',
                              border: `1px solid color-mix(in srgb, ${tag.color || '#71717a'} 30%, transparent)`
                            }}>
                            + {tag.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {assetFolderName && (
                  <div className="px-4 py-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Folder</p>
                    <div className="flex items-center gap-1.5 text-xs text-foreground bg-muted/20 border border-border/60 px-2.5 py-1.5 rounded-lg group/folder cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => handleRevealFile(selectedAsset.absolute_path)}>
                      <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate flex-1">{assetFolderName}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover/folder:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}

                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Properties</p>
                  <div className="grid grid-cols-2 gap-y-2">
                    <InfoRow label="Type" value={selectedAsset.extension.replace('.','').toUpperCase()} />
                    <InfoRow label="Size" value={formatBytes(selectedAsset.file_size)} />
                    {selectedAsset.width && selectedAsset.height && <InfoRow label="Dimensions" value={`${selectedAsset.width} × ${selectedAsset.height}`} />}
                    <InfoRow label="Added" value={new Date(selectedAsset.date_added).toLocaleDateString(undefined, { dateStyle: 'medium' })} />
                  </div>
                  <div className="mt-3 group relative">
                    <p className="text-[9px] text-muted-foreground/50 break-all font-mono leading-relaxed bg-muted/20 px-2.5 py-2 rounded-lg border border-border/40">
                      {selectedAsset.absolute_path}
                    </p>
                    <button onClick={() => navigator.clipboard.writeText(selectedAsset.absolute_path)} className="absolute top-1.5 right-1.5 p-1 opacity-0 group-hover:opacity-100 bg-background border border-border rounded-md transition-all hover:bg-secondary" title="Copy path">
                      <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )
        })() : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center shadow-inner">
              <TagIcon className="h-5 w-5 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Nothing selected</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">Click an asset to view its metadata and details.</p>
            </div>
          </div>
        )}
      </aside>

      <CustomDialogModal
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        placeholder={dialogConfig.placeholder}
        defaultValue={dialogConfig.defaultValue}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
      />

      <MoveToFolderModal
        isOpen={moveToFolderState.isOpen}
        directories={directories}
        onMove={handlePerformMoveAssets}
        onClose={() => setMoveToFolderState({ isOpen: false, assetIds: [] })}
      />
    </div>
  )
}
