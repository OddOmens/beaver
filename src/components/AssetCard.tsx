import { useState } from 'react'
import { Star, FileImage, Play, Link2, Music, Heart } from 'lucide-react'

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  const k = 1024, sizes = ['B','KB','MB','GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
import { cn } from '../lib/utils'
import type { AppSettings, ThumbnailFit, ViewMode } from '../hooks/useSettings'

interface AssetCardProps {
  asset: any
  isSelected: boolean
  isMultiSelected: boolean
  settings: AppSettings
  viewMode: ViewMode
  onSelect: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onCheckboxChange: (checked: boolean) => void
  onToggleFavorite: () => void
}

// ── Type classification ─────────────────────────────────────────────────────
const VIDEO_EXTS  = new Set(['.mp4','.webm','.ogg','.mov','.mkv','.avi'])
const VECTOR_EXTS = new Set(['.eps','.ai'])
const DOC_EXTS    = new Set(['.pdf','.psd','.xd','.fig','.sketch'])
const IMAGE_EXTS  = new Set(['.png','.jpg','.jpeg','.webp','.gif','.svg','.avif','.heic'])
const FONT_EXTS   = new Set(['.ttf','.otf','.woff','.woff2'])
const AUDIO_EXTS  = new Set(['.mp3','.wav','.aac','.flac','.m4a','.opus'])

function getTypeInfo(ext: string): { label: string; badgeClass: string } {
  const e = ext.toLowerCase()
  if (VIDEO_EXTS.has(e))  return { label: e.replace('.','').toUpperCase(), badgeClass: 'badge-video' }
  if (VECTOR_EXTS.has(e)) return { label: 'VECTOR', badgeClass: 'badge-vec' }
  if (DOC_EXTS.has(e))    return { label: e.replace('.','').toUpperCase(), badgeClass: 'badge-doc' }
  if (FONT_EXTS.has(e))   return { label: 'FONT', badgeClass: 'badge-font' }
  if (AUDIO_EXTS.has(e))  return { label: e.replace('.','').toUpperCase(), badgeClass: 'badge-other' }
  if (IMAGE_EXTS.has(e))  return { label: e.replace('.','').toUpperCase(), badgeClass: 'badge-img' }
  return { label: e.replace('.','').toUpperCase(), badgeClass: 'badge-other' }
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-px">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('h-2.5 w-2.5', i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
      ))}
    </span>
  )
}

const FIT_CLASS: Record<ThumbnailFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
}

export function AssetCard({
  asset, isSelected, isMultiSelected, settings, viewMode, onSelect, onDoubleClick, onCheckboxChange, onToggleFavorite,
}: AssetCardProps) {
  const ext = asset.extension.toLowerCase()
  const isVideo  = VIDEO_EXTS.has(ext)
  const isAudio  = AUDIO_EXTS.has(ext)
  const { label: typeLabel, badgeClass } = getTypeInfo(ext)
  const fitClass = FIT_CLASS[settings.thumbnailFit]
  const isMasonry = viewMode === 'masonry'
  const isFont = FONT_EXTS.has(ext)
  const isGif = ext === '.gif'

  const [isHovered, setIsHovered] = useState(false)

  // For masonry, compute natural aspect ratio from stored dimensions
  const naturalRatio = asset.width && asset.height
    ? Math.min(Math.max(asset.height / asset.width, 0.5), 2.5) // clamp between 0.5 and 2.5
    : 1

  const showInfoRow = settings.infoStyle === 'below'
  const showOverlay = settings.infoStyle === 'overlay'
  const highlighted = isSelected || isMultiSelected

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={cn(
        'group relative flex flex-col rounded-xl overflow-hidden border bg-card cursor-pointer',
        'transition-all duration-150',
        highlighted
          ? 'accent-selected'
          : 'border-border/50 hover:border-border shadow-sm hover:shadow-md hover:-translate-y-[1px]',
        isMasonry ? 'break-inside-avoid mb-2.5' : ''
      )}
    >
      {/* ── Thumbnail ───────────────────────────────────────────────── */}
      <div
        className="w-full bg-muted/20 flex items-center justify-center overflow-hidden relative flex-shrink-0"
        style={isMasonry ? { paddingTop: `${naturalRatio * 100}%`, position: 'relative' } : { aspectRatio: '1 / 1' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Inner wrapper for masonry absolute positioning */}
        <div className={isMasonry ? 'absolute inset-0 flex items-center justify-center' : 'contents'}>
          {isAudio ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/10 min-h-[80px]">
              <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center border border-border/50">
                <Music className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">{typeLabel}</span>
            </div>
          ) : isVideo ? (
            <>
              <video
                src={`media://${encodeURIComponent(asset.absolute_path)}`}
                muted loop playsInline
                onMouseEnter={e => e.currentTarget.play().catch(() => {})}
                onMouseLeave={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                className={cn('w-full h-full', fitClass)}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/40 rounded-full p-2.5 backdrop-blur-sm">
                  <Play className="h-4 w-4 text-white fill-white" />
                </div>
              </div>
            </>
          ) : isFont ? (
            <div className="w-full h-full flex items-center justify-center bg-card text-foreground overflow-hidden">
              <style>{`@font-face { font-family: 'font-${asset.id}'; src: url('media://${encodeURIComponent(asset.absolute_path)}'); }`}</style>
              <span style={{ fontFamily: `'font-${asset.id}'`, fontSize: isMasonry ? '4rem' : '3.5rem', lineHeight: 1 }}>Aa</span>
            </div>
          ) : (asset.thumbnail_path || ext === '.svg') ? (
            <img
              src={`media://${encodeURIComponent(
                ext === '.svg' ? asset.absolute_path : 
                (isGif && isHovered) ? asset.absolute_path : asset.thumbnail_path
              )}`}
              alt={asset.filename}
              className={cn('w-full h-full transition-transform duration-200 group-hover:scale-[1.03]', fitClass)}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 min-h-[80px]">
              <FileImage className="h-7 w-7 text-muted-foreground/25" />
              <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-wider">{typeLabel}</span>
            </div>
          )}

          {/* Checkbox */}
          <div
            className={cn(
              'absolute top-2 left-2 transition-opacity duration-100',
              isMultiSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={e => e.stopPropagation()}
          >
            <input
              type="checkbox" className="asset-checkbox"
              checked={isMultiSelected}
              onChange={e => onCheckboxChange(e.target.checked)}
            />
          </div>

          {/* Favorite button */}
          <div
            className={cn(
              'absolute bottom-2 right-2 transition-opacity duration-100',
              asset.favorited ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={e => { e.stopPropagation(); onToggleFavorite() }}
          >
            <div className="bg-background/80 backdrop-blur-sm rounded-md p-1 border border-border/50 shadow-sm">
              <Heart className={cn('h-2.5 w-2.5', asset.favorited ? 'text-rose-500 fill-rose-500' : 'text-muted-foreground')} />
            </div>
          </div>

          {/* Type badge */}
          {settings.showExtensionBadge && (
            <div className={cn('absolute top-2 right-2 px-1.5 py-[2px] rounded text-[9px] font-bold tracking-wide', badgeClass)}>
              {typeLabel}
            </div>
          )}

          {/* Bottom-left: source url + rating */}
          {(asset.source_url || (settings.showRatingBadge && asset.rating > 0)) && (
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {settings.showRatingBadge && asset.rating > 0 && (
                <div className="bg-background/85 backdrop-blur-sm px-1.5 py-1 rounded-md border border-border/50 shadow-sm">
                  <MiniStars rating={asset.rating} />
                </div>
              )}
              {asset.source_url && (
                <div className="bg-background/80 backdrop-blur-sm rounded-md p-1 border border-border/60">
                  <Link2 className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          {/* Hover overlay slide-up */}
          {showOverlay && (
            <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm border-t border-border/60 px-2.5 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-150">
              {settings.showFilename && (
                <p className="text-[11px] font-semibold text-foreground truncate leading-snug">{asset.title || asset.filename}</p>
              )}
              {settings.showDimensions && asset.width && asset.height && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{asset.width} × {asset.height}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Info row ────────────────────────────────────────────────── */}
      {showInfoRow && (
        <div className="px-2.5 pt-2 pb-2.5 min-w-0">
          {settings.showFilename && (
            <p className="text-[11px] font-semibold text-foreground truncate leading-snug">{asset.title || asset.filename}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {settings.showDimensions && asset.width && asset.height && (
              <p className="text-[10px] text-muted-foreground">{asset.width} × {asset.height}</p>
            )}
            {settings.showFileSize && asset.file_size > 0 && (
              <p className="text-[10px] text-muted-foreground">{formatBytes(asset.file_size)}</p>
            )}
            {settings.showRatingBadge && asset.rating > 0 && <MiniStars rating={asset.rating} />}
          </div>
        </div>
      )}
    </div>
  )
}
