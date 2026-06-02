import { useState, useMemo } from 'react'
import { FolderPlus, ArrowUpDown, ChevronDown, LayoutGrid, Rows3, Trash2, Pencil, Maximize2, Copy, FolderInput } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AssetCard } from './AssetCard'
import type { AppSettings } from '../hooks/useSettings'
import { THUMB_SIZES } from '../hooks/useSettings'
import { cn } from '../lib/utils'

type SortKey = 'date_added' | 'filename' | 'file_size' | 'extension' | 'rating'
type SortDir = 'desc' | 'asc'

interface AssetGridProps {
  assets: any[]
  selectedAsset: any | null
  settings: AppSettings
  onSelectAsset: (asset: any) => void
  onOpenFile: (path: string) => void
  onLinkFolder: () => void
  onUpdateSettings: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  onDeleteAssets: (ids: number[]) => void
  onRenameAssets: (ids: number[]) => void
  onDuplicateAssets: (ids: number[]) => void
  onMoveAssets: (ids: number[]) => void
  onToggleFavorite: (asset: any) => void
  onViewAssets: (startIndex: number) => void
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_added', label: 'Date Added' },
  { key: 'filename',   label: 'Name' },
  { key: 'file_size',  label: 'File Size' },
  { key: 'extension',  label: 'Type' },
  { key: 'rating',     label: 'Rating' },
]

function sortAssets(assets: any[], key: SortKey, dir: SortDir) {
  return [...assets].sort((a, b) => {
    let av: any = a[key] ?? ''
    let bv: any = b[key] ?? ''
    if (key === 'date_added') { av = new Date(av).getTime(); bv = new Date(bv).getTime() }
    if (typeof av === 'string') { av = av.toLowerCase(); bv = (bv as string).toLowerCase() }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return dir === 'asc' ? cmp : -cmp
  })
}

export function AssetGrid({
  assets, selectedAsset, settings, onSelectAsset, onLinkFolder, onUpdateSettings,
  onDeleteAssets, onRenameAssets, onDuplicateAssets, onMoveAssets, onToggleFavorite, onViewAssets
}: AssetGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date_added')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [multiSelected, setMultiSelected] = useState<Set<number>>(new Set())

  const sorted = useMemo(() => sortAssets(assets, sortKey, sortDir), [assets, sortKey, sortDir])
  const thumbPx = THUMB_SIZES[settings.thumbnailSize]
  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.label ?? 'Date Added'
  const isMasonry = settings.viewMode === 'masonry'

  const handleCardSelect = (asset: any, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      setMultiSelected(prev => {
        const next = new Set(prev)
        next.has(asset.id) ? next.delete(asset.id) : next.add(asset.id)
        return next
      })
    } else {
      setMultiSelected(new Set())
      onSelectAsset(asset)
    }
  }

  const handleCheckbox = (asset: any, checked: boolean) => {
    setMultiSelected(prev => {
      const next = new Set(prev)
      checked ? next.add(asset.id) : next.delete(asset.id)
      return next
    })
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  if (assets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center border border-border shadow-sm">
            <LayoutGrid className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">No assets found</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Link a folder to start building your library.</p>
          </div>
          <button
            onClick={onLinkFolder}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Link Folder
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/40 flex-shrink-0">

        {/* Sort */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="pill-btn">
              <ArrowUpDown className="h-3 w-3" />
              {currentSortLabel}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[160px] bg-popover border border-border rounded-xl shadow-xl p-1 animate-scale-in"
              sideOffset={6} align="start"
            >
              {SORT_OPTIONS.map(opt => (
                <DropdownMenu.Item
                  key={opt.key}
                  onSelect={() => toggleSort(opt.key)}
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer outline-none',
                    'hover:bg-secondary transition-colors',
                    sortKey === opt.key ? 'accent-text font-semibold' : 'text-foreground'
                  )}
                >
                  {opt.label}
                  {sortKey === opt.key && (
                    <span className="text-[11px] text-muted-foreground">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Sort dir */}
        <button
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="pill-btn w-7 justify-center px-0"
          title={sortDir === 'desc' ? 'Descending' : 'Ascending'}
        >
          {sortDir === 'desc' ? '↓' : '↑'}
        </button>

        {/* Multi-select info */}
        {multiSelected.size > 0 && (
          <div className="flex items-center gap-2 animate-fade-up ml-2 border-l border-border/60 pl-3">
            <span className="text-xs font-semibold accent-text">{multiSelected.size} selected</span>
            <button onClick={() => setMultiSelected(new Set())} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors mr-2">
              Clear
            </button>
            <button onClick={() => onViewAssets(sorted.findIndex(a => a.id === Array.from(multiSelected)[0]) || 0)} className="pill-btn px-2 text-foreground" title="View selected">
              <Maximize2 className="h-3 w-3" /> View
            </button>
            <button onClick={() => onRenameAssets(Array.from(multiSelected))} className="pill-btn px-2 text-foreground" title="Batch Rename">
              <Pencil className="h-3 w-3" /> Rename
            </button>
            <button onClick={() => { onDuplicateAssets(Array.from(multiSelected)) }} className="pill-btn px-2 text-foreground" title="Duplicate">
              <Copy className="h-3 w-3" /> Duplicate
            </button>
            <button onClick={() => { onMoveAssets(Array.from(multiSelected)) }} className="pill-btn px-2 text-foreground" title="Move to Folder">
              <FolderInput className="h-3 w-3" /> Move
            </button>
            <button onClick={() => { onDeleteAssets(Array.from(multiSelected)); setMultiSelected(new Set()) }} className="pill-btn px-2 text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30" title="Move to Trash">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}

        {/* Selected View (if 1) */}
        {multiSelected.size === 0 && selectedAsset && (
          <div className="flex items-center gap-2 animate-fade-up ml-2 border-l border-border/60 pl-3">
            <button onClick={() => onViewAssets(sorted.findIndex(a => a.id === selectedAsset.id))} className="pill-btn px-2 text-foreground" title="Fullscreen Viewer">
              <Maximize2 className="h-3 w-3" /> View
            </button>
            <button onClick={() => onRenameAssets([selectedAsset.id])} className="pill-btn px-2 text-foreground" title="Rename">
              <Pencil className="h-3 w-3" /> Rename
            </button>
            <button onClick={() => onDuplicateAssets([selectedAsset.id])} className="pill-btn px-2 text-foreground" title="Duplicate">
              <Copy className="h-3 w-3" /> Duplicate
            </button>
            <button onClick={() => onMoveAssets([selectedAsset.id])} className="pill-btn px-2 text-foreground" title="Move to Folder">
              <FolderInput className="h-3 w-3" /> Move
            </button>
            <button onClick={() => onDeleteAssets([selectedAsset.id])} className="pill-btn px-2 text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30" title="Move to Trash">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex items-center gap-0.5 border border-border rounded-lg overflow-hidden bg-card p-0.5">
          <button
            onClick={() => onUpdateSettings('viewMode', 'grid')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              settings.viewMode === 'grid' ? 'accent-bg text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
            title="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onUpdateSettings('viewMode', 'masonry')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              settings.viewMode === 'masonry' ? 'accent-bg text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}
            title="Masonry view"
          >
            <Rows3 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Item count */}
        <span className="text-xs text-muted-foreground font-medium tabular-nums min-w-[60px] text-right">
          {sorted.length.toLocaleString()} {sorted.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* ── Asset grid / masonry ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isMasonry ? (
          /* Masonry — CSS columns, natural aspect ratios */
          <div
            className="p-4 pb-20"
            style={{
              columnCount: Math.max(2, Math.floor(1200 / thumbPx)),
              columnGap: settings.compactCards ? '5px' : '10px',
            }}
          >
            {sorted.map((asset, i) => (
              <div
                key={asset.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 6, 100)}ms` }}
              >
                <AssetCard
                  asset={asset}
                  isSelected={selectedAsset?.id === asset.id}
                  isMultiSelected={multiSelected.has(asset.id)}
                  settings={settings}
                  viewMode="masonry"
                  onSelect={e => handleCardSelect(asset, e)}
                  onDoubleClick={() => onViewAssets(i)}
                  onCheckboxChange={checked => handleCheckbox(asset, checked)}
                  onToggleFavorite={() => onToggleFavorite(asset)}
                />
              </div>
            ))}
          </div>
        ) : (
          /* Grid — fixed square cells */
          <div
            className="p-4 pb-20"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${thumbPx}px, 1fr))`,
              gap: settings.compactCards ? '5px' : '10px',
            }}
          >
            {sorted.map((asset, i) => (
              <div
                key={asset.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 6, 100)}ms` }}
              >
                <AssetCard
                  asset={asset}
                  isSelected={selectedAsset?.id === asset.id}
                  isMultiSelected={multiSelected.has(asset.id)}
                  settings={settings}
                  viewMode="grid"
                  onSelect={e => handleCardSelect(asset, e)}
                  onDoubleClick={() => onViewAssets(i)}
                  onCheckboxChange={checked => handleCheckbox(asset, checked)}
                  onToggleFavorite={() => onToggleFavorite(asset)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
