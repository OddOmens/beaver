import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import * as Slider from '@radix-ui/react-slider'
import {
  Settings, X, Sun, Moon, Monitor, Check,
  LayoutGrid, Rows3, Paintbrush, Grid2x2, CreditCard, Info, ExternalLink,
  Star, Database, Trash2,
} from 'lucide-react'
import { cn } from '../lib/utils'
import type { AppSettings, ThumbnailSize, ThumbnailFit, InfoStyle, AppTheme, AccentColor, ViewMode } from '../hooks/useSettings'

interface SettingsPanelProps {
  settings: AppSettings
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
}

const ACCENT_COLORS: { key: AccentColor; label: string; swatch: string }[] = [
  { key: 'zinc',    label: 'Zinc',    swatch: '#71717a' },
  { key: 'blue',    label: 'Blue',    swatch: '#3b82f6' },
  { key: 'violet',  label: 'Violet',  swatch: '#8b5cf6' },
  { key: 'rose',    label: 'Rose',    swatch: '#f43f5e' },
  { key: 'amber',   label: 'Amber',   swatch: '#f59e0b' },
  { key: 'emerald', label: 'Emerald', swatch: '#10b981' },
]

const THUMB_SIZE_STEPS: { key: ThumbnailSize; label: string }[] = [
  { key: 'sm', label: 'S' },
  { key: 'md', label: 'M' },
  { key: 'lg', label: 'L' },
  { key: 'xl', label: 'XL' },
]

type SectionId = 'appearance' | 'grid' | 'cards' | 'advanced' | 'about'

const NAV: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: 'appearance', label: 'Appearance', icon: Paintbrush },
  { id: 'grid',       label: 'Grid',       icon: Grid2x2 },
  { id: 'cards',      label: 'Cards',      icon: CreditCard },
  { id: 'advanced',   label: 'Advanced',   icon: Database },
  { id: 'about',      label: 'About',      icon: Info },
]

/* ── Primitives ─────────────────────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-4">{children}</p>
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold text-foreground">{children}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

function Divider() { return <div className="h-px bg-border my-5" /> }

function SettingRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer select-none group">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground group-hover:text-foreground/80 transition-colors">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{description}</p>}
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={onChange}
        className={cn(
          'relative h-[20px] w-[36px] rounded-full border border-border/60 transition-all duration-150 flex-shrink-0 outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring'
        )}
        style={checked ? {
          backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
          borderColor: 'transparent',
        } : { backgroundColor: 'hsl(var(--muted))' }}
      >
        <Switch.Thumb className="block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform duration-150 translate-x-[2px] data-[state=checked]:translate-x-[18px]" />
      </Switch.Root>
    </label>
  )
}

function SegmentedControl<T extends string>({
  options, value, onChange
}: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {options.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={cn(
            'flex-1 py-1.5 text-xs font-semibold transition-all',
            value === opt.key
              ? 'text-white'
              : 'text-muted-foreground bg-card hover:bg-secondary hover:text-foreground'
          )}
          style={value === opt.key ? {
            backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
          } : {}}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/* ── Live Interactive Card Preview ──────────────────────────────────────────── */
function CardPreview({ settings }: { settings: AppSettings }) {
  const [isHovered, setIsHovered] = useState(false)
  const fitClass = settings.thumbnailFit === 'cover' ? 'object-cover' : 'object-contain'
  const isOverlay = settings.infoStyle === 'overlay'
  const isBelow = settings.infoStyle === 'below'

  return (
    <div className="w-full flex flex-col items-center justify-center h-full space-y-4">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Card Preview</p>
      
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "w-[180px] bg-card rounded-2xl border overflow-hidden transition-all duration-200 select-none shadow-sm hover:shadow-md",
          settings.compactCards ? "" : "pb-2"
        )}
        style={{
          borderColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.3)`
        }}
      >
        {/* Mock Thumbnail Image wrapper */}
        <div className="aspect-square bg-muted/20 flex items-center justify-center overflow-hidden relative">
          <img
            src="Beaver_Alpha_logo.png"
            alt="Beaver Preview"
            className={cn("w-full h-full transition-transform duration-200", fitClass, isHovered && "scale-[1.03]")}
          />
          
          {/* Extension Badge */}
          {settings.showExtensionBadge && (
            <span className="absolute top-2 right-2 px-1.5 py-[2px] rounded text-[9px] font-bold bg-[#3b82f620] text-[#3b82f6] dark:bg-[#3b82f625] dark:text-[#60a5fa]">
              PNG
            </span>
          )}
          
          {/* Rating Badge */}
          {settings.showRatingBadge && (
            <div className={cn(
              "absolute bottom-2 left-2 bg-background/85 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-border/50 shadow-sm flex items-center gap-px transition-opacity duration-150"
            )}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn("h-2 w-2", i < 4 ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20")} />
              ))}
            </div>
          )}
          
          {/* Overlay Info (Hover Style) */}
          {isOverlay && (
            <div className={cn(
              "absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm border-t border-border/60 px-2.5 py-2 transition-transform duration-150",
              isHovered ? "translate-y-0" : "translate-y-full"
            )}>
              {settings.showFilename && (
                <p className="text-[10px] font-semibold text-foreground truncate leading-snug">forest_lake_alpha</p>
              )}
              {settings.showDimensions && (
                <p className="text-[9px] text-muted-foreground mt-0.5">3840 × 2160</p>
              )}
            </div>
          )}
        </div>
        
        {/* Below Info Style */}
        {isBelow && (
          <div className={cn("px-2.5 pt-2 min-w-0", settings.compactCards ? "pb-2.5" : "pb-2")}>
            {settings.showFilename && (
              <p className="text-[10px] font-semibold text-foreground truncate leading-snug">forest_lake_alpha</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {settings.showDimensions && (
                <p className="text-[9px] text-muted-foreground">3840 × 2160</p>
              )}
              {settings.showFileSize && (
                <p className="text-[9px] text-muted-foreground">2.4 MB</p>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground text-center max-w-[180px] leading-relaxed">
        Hover card to preview animations. Settings apply instantly!
      </p>
    </div>
  )
}

/* ── Section Components ────────────────────────────────────────────────────────── */
function AppearanceSection({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      <SectionTitle>Appearance</SectionTitle>

      <div className="space-y-6">
        {/* Theme */}
        <div>
          <FieldLabel>Theme</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'light' as AppTheme, label: 'Light', icon: Sun },
              { key: 'dark'  as AppTheme, label: 'Dark',  icon: Moon },
              { key: 'system' as AppTheme, label: 'System', icon: Monitor },
            ] as const).map(({ key, label, icon: Icon }) => {
              const active = settings.theme === key
              return (
                <button
                  key={key}
                  onClick={() => onUpdate('theme', key)}
                  className={cn(
                    'flex flex-col items-center gap-2 py-4 rounded-xl border text-[11px] font-semibold transition-all',
                    !active && 'border-border text-muted-foreground hover:text-foreground hover:border-border bg-card'
                  )}
                  style={active ? {
                    backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.1)`,
                    borderColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                    color: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                  } : {}}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <FieldLabel>Accent Color</FieldLabel>
          <div className="flex items-center gap-3">
            {ACCENT_COLORS.map(({ key, label, swatch }) => (
              <button
                key={key}
                title={label}
                onClick={() => onUpdate('accentColor', key)}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  backgroundColor: swatch,
                  outline: settings.accentColor === key ? `2.5px solid ${swatch}` : 'none',
                  outlineOffset: '3px',
                  transform: settings.accentColor === key ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {settings.accentColor === key && (
                  <Check className="h-3.5 w-3.5 text-white drop-shadow" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function GridSection({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      <SectionTitle>Grid Settings</SectionTitle>

      <div className="space-y-5">
        {/* Layout */}
        <div>
          <FieldLabel>Layout Style</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: 'grid' as ViewMode, label: 'Grid', icon: LayoutGrid, desc: 'Equal square cells' },
              { key: 'masonry' as ViewMode, label: 'Masonry', icon: Rows3, desc: 'Natural aspect ratios' },
            ] as const).map(({ key, label, icon: Icon, desc }) => {
              const active = settings.viewMode === key
              return (
                <button key={key} onClick={() => onUpdate('viewMode', key)}
                  className={cn('flex flex-col items-start gap-1 px-4 py-3 rounded-xl border text-left transition-all', !active && 'border-border text-muted-foreground bg-card hover:border-border')}
                  style={active ? { backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l) / 0.1)`, borderColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))` } : {}}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={active ? { color: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))` } : {}} />
                    <span className="text-xs font-semibold" style={active ? { color: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))` } : {}}>{label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Thumbnail Size */}
        <div>
          <FieldLabel>Thumbnail Size</FieldLabel>
          <SegmentedControl
            options={THUMB_SIZE_STEPS}
            value={settings.thumbnailSize}
            onChange={(v) => onUpdate('thumbnailSize', v)}
          />
        </div>

        {/* Thumbnail Fit */}
        <div>
          <FieldLabel>Thumbnail Fit</FieldLabel>
          <SegmentedControl
            options={[
              { key: 'cover' as ThumbnailFit, label: 'Cover' },
              { key: 'contain' as ThumbnailFit, label: 'Contain' },
            ]}
            value={settings.thumbnailFit}
            onChange={(v) => onUpdate('thumbnailFit', v)}
          />
        </div>

        <Divider />

        {/* Recently Added window */}
        <div>
          <FieldLabel hint="Controls how many days back 'Recently Added' shows.">
            Recently Added Window — <span className="text-foreground font-semibold">{settings.recentDaysWindow} days</span>
          </FieldLabel>
          <Slider.Root
            min={1} max={90} step={1}
            value={[settings.recentDaysWindow]}
            onValueChange={([v]) => onUpdate('recentDaysWindow', v)}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-muted relative grow rounded-full h-1.5">
              <Slider.Range
                className="absolute h-full rounded-full"
                style={{ backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))` }}
              />
            </Slider.Track>
            <Slider.Thumb
              className="block h-4 w-4 rounded-full bg-white border-2 shadow transition-transform hover:scale-110 focus:outline-none"
              style={{ borderColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))` }}
            />
          </Slider.Root>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">1 day</span>
            <span className="text-[10px] text-muted-foreground">90 days</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardsSection({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      <SectionTitle>Card Customization</SectionTitle>

      <div className="space-y-5">
        {/* Info Position */}
        <div>
          <FieldLabel>Metadata Alignment</FieldLabel>
          <SegmentedControl
            options={[
              { key: 'below' as InfoStyle, label: 'Standard (Below)' },
              { key: 'overlay' as InfoStyle, label: 'Hover Overlay' },
              { key: 'hidden' as InfoStyle, label: 'Hidden' },
            ]}
            value={settings.infoStyle}
            onChange={(v) => onUpdate('infoStyle', v)}
          />
        </div>

        <Divider />

        {/* Toggles */}
        <div className="space-y-1.5 divide-y divide-border/50">
          <SettingRow
            label="Filename / Title"
            description="Show the name of the asset below or inside the card."
            checked={settings.showFilename}
            onChange={(v) => onUpdate('showFilename', v)}
          />
          <SettingRow
            label="Pixel Dimensions"
            description="Display width × height tags for indexed images."
            checked={settings.showDimensions}
            onChange={(v) => onUpdate('showDimensions', v)}
          />
          <SettingRow
            label="File Size"
            description="Display storage bytes size tag below the card."
            checked={settings.showFileSize}
            onChange={(v) => onUpdate('showFileSize', v)}
          />
          <SettingRow
            label="Star Ratings"
            description="Enable and display star ratings on thumbnails."
            checked={settings.showRatingBadge}
            onChange={(v) => onUpdate('showRatingBadge', v)}
          />
          <SettingRow
            label="File Type Badge"
            description="Show the formatted file extension label."
            checked={settings.showExtensionBadge}
            onChange={(v) => onUpdate('showExtensionBadge', v)}
          />
          <SettingRow
            label="Compact Spacing"
            description="Remove padding surrounding title cards for denser layouts."
            checked={settings.compactCards}
            onChange={(v) => onUpdate('compactCards', v)}
          />
        </div>
      </div>
    </div>
  )
}

function AdvancedSection() {
  const [clearing, setClearing] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [clearedStatus, setClearedStatus] = useState(false)
  const [optimizedStatus, setOptimizedStatus] = useState(false)

  const handleClearCache = async () => {
    if (clearing) return
    setClearing(true)
    setClearedStatus(false)
    try {
      const res = await window.electronAPI.clearThumbnailCache()
      if (res) {
        setClearedStatus(true)
        setTimeout(() => setClearedStatus(false), 3000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setClearing(false)
    }
  }

  const handleOptimizeDB = async () => {
    if (optimizing) return
    setOptimizing(true)
    setOptimizedStatus(false)
    try {
      const res = await window.electronAPI.optimizeDatabase()
      if (res) {
        setOptimizedStatus(true)
        setTimeout(() => setOptimizedStatus(false), 3000)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setOptimizing(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Advanced Settings</SectionTitle>

      {/* Cache Section */}
      <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
        <div className="flex items-start gap-3">
          <Trash2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-foreground">Thumbnail Cache</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Purges all generated WebP thumbnails and triggers a background re-scan to regenerate them. Useful if thumbnails appear corrupted or out of date.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground font-mono">Location: appDataDir/thumbnails</span>
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className={cn(
              "px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1.5",
              clearedStatus
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-secondary text-foreground border-border hover:bg-secondary/80 disabled:opacity-50"
            )}
          >
            {clearing ? "Clearing..." : clearedStatus ? "Cleared & Re-indexing" : "Clear Cache"}
          </button>
        </div>
      </div>

      {/* Database section */}
      <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
        <div className="flex items-start gap-3">
          <Database className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-foreground">Database Maintenance</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Optimizes the SQLite indexing engine. Runs a standard full VACUUM command to defragment the disk storage and speed up searches across thousands of assets.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground font-mono">Type: SQLite3 Database File</span>
          <button
            onClick={handleOptimizeDB}
            disabled={optimizing}
            className={cn(
              "px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-1.5",
              optimizedStatus
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-secondary text-foreground border-border hover:bg-secondary/80 disabled:opacity-50"
            )}
          >
            {optimizing ? "Optimizing..." : optimizedStatus ? "Optimization Done" : "Optimize DB"}
          </button>
        </div>
      </div>

      {/* File paths & details */}
      <div className="p-4 bg-muted/20 border border-border/60 rounded-xl space-y-3">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
          System Environment
        </h4>
        <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
          <div className="space-y-0.5">
            <span className="text-muted-foreground block">App Version</span>
            <span className="text-foreground font-semibold">1.0.0 (Alpha Release)</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-muted-foreground block">Platform</span>
            <span className="text-foreground font-semibold">macOS (Electron Platform)</span>
          </div>
          <div className="space-y-0.5 col-span-2">
            <span className="text-muted-foreground block">Database Path</span>
            <span className="text-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border/40 truncate block">
              ~/Library/Application Support/beaver/dam-data/dam.db
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AboutSection() {
  const openExternal = (url: string) => window.electronAPI?.openUrl(url)

  return (
    <div className="space-y-6">
      <SectionTitle>About</SectionTitle>
      <div className="space-y-5">

        {/* App identity */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border/60 rounded-xl">
          <div className="h-12 w-12 rounded-xl accent-bg flex items-center justify-center shadow flex-shrink-0">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Beaver</p>
            <p className="text-xs text-muted-foreground mt-0.5">Digital Asset Manager by Oddomens</p>
          </div>
        </div>

        {/* Technical details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/20 border border-border/60 rounded-lg">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">Storage</p>
            <p className="text-foreground text-xs font-semibold">Local SQLite</p>
            <p className="text-muted-foreground text-[11px] mt-0.5">All data stays on your machine</p>
          </div>
          <div className="p-3 bg-muted/20 border border-border/60 rounded-lg">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">Thumbnails</p>
            <p className="text-foreground text-xs font-semibold">WebP cached</p>
            <p className="text-muted-foreground text-[11px] mt-0.5">300px max, 80% quality</p>
          </div>
          <div className="p-3 bg-muted/20 border border-border/60 rounded-lg">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">File Watching</p>
            <p className="text-foreground text-xs font-semibold">Real-time sync</p>
            <p className="text-muted-foreground text-[11px] mt-0.5">Folders update automatically</p>
          </div>
          <div className="p-3 bg-muted/20 border border-border/60 rounded-lg">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">Privacy</p>
            <p className="text-foreground text-xs font-semibold">100% offline</p>
            <p className="text-muted-foreground text-[11px] mt-0.5">No network requests ever</p>
          </div>
        </div>

        {/* Legal links */}
        <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/60 bg-muted/10">
          <button
            onClick={() => openExternal('https://oddomens.com/terms')}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors text-left group"
          >
            <span>Terms of Service</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          <button
            onClick={() => openExternal('https://oddomens.com/privacy')}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors text-left group"
          >
            <span>Privacy Policy</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
          <button
            onClick={() => openExternal('https://oddomens.com')}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-left group"
          >
            <span>oddomens.com</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

      </div>
    </div>
  )
}

/* ── Settings Panel ─────────────────────────────────────────────────────────── */
export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('appearance')

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          title="Settings"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-transparent hover:bg-secondary hover:border-border/60 transition-all text-muted-foreground hover:text-foreground group"
        >
          <Settings className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs font-medium">Settings</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />

        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[820px] max-h-[85vh] bg-background border border-border rounded-2xl shadow-2xl',
            'flex overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-200'
          )}
        >
          {/* ── Left Nav ─────────────────────────────────────────────────── */}
          <div className="w-[180px] flex-shrink-0 border-r border-border flex flex-col bg-muted/20" style={{ background: 'hsl(var(--sidebar-bg))' }}>
            <div className="px-5 pt-6 pb-4 border-b border-border/60">
              <Dialog.Title className="text-sm font-bold text-foreground tracking-tight">Settings</Dialog.Title>
              <Dialog.Description className="sr-only">Customize your Beaver library</Dialog.Description>
            </div>

            <nav className="flex-1 py-2 px-2 space-y-px">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left',
                    activeSection === id
                      ? 'text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                  style={activeSection === id ? {
                    backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                  } : {}}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="px-4 py-3 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground/60">Auto-saved</p>
            </div>
          </div>

          {/* ── Right Content ─────────────────────────────────────────────── */}
          <div className="flex-grow flex flex-col min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-border flex-shrink-0">
              <p className="text-sm font-bold text-foreground">
                {NAV.find(n => n.id === activeSection)?.label}
              </p>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Split body with preview */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-grow overflow-y-auto px-7 py-6">
                {activeSection === 'appearance' && <AppearanceSection settings={settings} onUpdate={onUpdate} />}
                {activeSection === 'grid'       && <GridSection       settings={settings} onUpdate={onUpdate} />}
                {activeSection === 'cards'      && <CardsSection      settings={settings} onUpdate={onUpdate} />}
                {activeSection === 'advanced'   && <AdvancedSection />}
                {activeSection === 'about'      && <AboutSection />}
              </div>
              
              {/* Conditional Live Preview panel */}
              {['appearance', 'grid', 'cards'].includes(activeSection) && (
                <div className="w-[240px] flex-shrink-0 border-l border-border bg-muted/10 p-5 flex flex-col items-center justify-center">
                  <CardPreview settings={settings} />
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
