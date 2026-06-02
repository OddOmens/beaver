import { useState, useEffect, useCallback } from 'react'

export type ThumbnailSize = 'sm' | 'md' | 'lg' | 'xl'
export type ThumbnailFit = 'cover' | 'contain'
export type InfoStyle = 'below' | 'overlay' | 'hidden'
export type AppTheme = 'light' | 'dark' | 'system'
export type AccentColor = 'zinc' | 'blue' | 'violet' | 'rose' | 'amber' | 'emerald'
export type ViewMode = 'grid' | 'masonry'

export interface AppSettings {
  theme: AppTheme
  accentColor: AccentColor
  thumbnailSize: ThumbnailSize
  thumbnailFit: ThumbnailFit
  showFilename: boolean
  showDimensions: boolean
  showRatingBadge: boolean
  showExtensionBadge: boolean
  showFileSize: boolean
  infoStyle: InfoStyle
  viewMode: ViewMode
  compactCards: boolean
  recentDaysWindow: number
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  accentColor: 'zinc',
  thumbnailSize: 'md',
  thumbnailFit: 'cover',
  showFilename: true,
  showDimensions: true,
  showRatingBadge: true,
  showExtensionBadge: true,
  showFileSize: false,
  infoStyle: 'below',
  viewMode: 'grid',
  compactCards: false,
  recentDaysWindow: 7,
}

/** Resolve the effective theme given a "system" preference. */
function resolveTheme(theme: AppTheme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

/** Apply theme class and accent attribute to <html> */
function applyToDOM(settings: AppSettings) {
  const html = document.documentElement
  const effective = resolveTheme(settings.theme)
  html.classList.toggle('dark', effective === 'dark')
  html.setAttribute('data-accent', settings.accentColor)
}

// Serialize / deserialize helpers
function serialize(settings: AppSettings): Record<string, string> {
  return {
    theme: settings.theme,
    accentColor: settings.accentColor,
    thumbnailSize: settings.thumbnailSize,
    thumbnailFit: settings.thumbnailFit,
    showFilename: String(settings.showFilename),
    showDimensions: String(settings.showDimensions),
    showRatingBadge: String(settings.showRatingBadge),
    showExtensionBadge: String(settings.showExtensionBadge),
    showFileSize: String(settings.showFileSize),
    infoStyle: settings.infoStyle,
    viewMode: settings.viewMode,
    compactCards: String(settings.compactCards),
    recentDaysWindow: String(settings.recentDaysWindow),
  }
}

function deserialize(raw: Record<string, string>): AppSettings {
  return {
    theme: (raw.theme as AppTheme) || DEFAULTS.theme,
    accentColor: (raw.accentColor as AccentColor) || DEFAULTS.accentColor,
    thumbnailSize: (raw.thumbnailSize as ThumbnailSize) || DEFAULTS.thumbnailSize,
    thumbnailFit: (raw.thumbnailFit as ThumbnailFit) || DEFAULTS.thumbnailFit,
    showFilename: raw.showFilename !== undefined ? raw.showFilename === 'true' : DEFAULTS.showFilename,
    showDimensions: raw.showDimensions !== undefined ? raw.showDimensions === 'true' : DEFAULTS.showDimensions,
    showRatingBadge: raw.showRatingBadge !== undefined ? raw.showRatingBadge === 'true' : DEFAULTS.showRatingBadge,
    showExtensionBadge: raw.showExtensionBadge !== undefined ? raw.showExtensionBadge === 'true' : DEFAULTS.showExtensionBadge,
    showFileSize: raw.showFileSize !== undefined ? raw.showFileSize === 'true' : DEFAULTS.showFileSize,
    infoStyle: (raw.infoStyle as InfoStyle) || DEFAULTS.infoStyle,
    viewMode: (raw.viewMode as ViewMode) || DEFAULTS.viewMode,
    compactCards: raw.compactCards !== undefined ? raw.compactCards === 'true' : DEFAULTS.compactCards,
    recentDaysWindow: raw.recentDaysWindow ? parseInt(raw.recentDaysWindow, 10) : DEFAULTS.recentDaysWindow,
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  // Load all settings on mount
  useEffect(() => {
    async function load() {
      let raw: Record<string, string> = {}
      if (window.electronAPI?.getAllSettings) {
        raw = await window.electronAPI.getAllSettings()
      }
      const parsed = deserialize(raw)
      setSettingsState(parsed)
      applyToDOM(parsed)
      setLoaded(true)
    }
    load()
  }, [])

  // Listen for system theme changes when theme === 'system'
  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyToDOM(settings)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [settings])

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value }
    setSettingsState(next)
    applyToDOM(next)
    // Persist to SQLite via IPC
    if (window.electronAPI?.setSetting) {
      const serialized = serialize(next)
      await window.electronAPI.setSetting(key, serialized[key])
    }
  }, [settings])

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates }
    setSettingsState(next)
    applyToDOM(next)
    if (window.electronAPI?.setSetting) {
      const serialized = serialize(next)
      for (const k of Object.keys(updates) as (keyof AppSettings)[]) {
        await window.electronAPI.setSetting(k, serialized[k])
      }
    }
  }, [settings])

  return { settings, updateSetting, updateSettings, loaded }
}

/** Pixel sizes for each thumbnail size key */
export const THUMB_SIZES: Record<ThumbnailSize, number> = {
  sm: 120,
  md: 180,
  lg: 240,
  xl: 320,
}
