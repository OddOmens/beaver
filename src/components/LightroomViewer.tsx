import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, FileImage, Music } from 'lucide-react'
import { cn } from '../lib/utils'

interface LightroomViewerProps {
  assets: any[]
  startIndex: number
  onClose: () => void
}

export function LightroomViewer({ assets, startIndex, onClose }: LightroomViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const asset = assets[currentIndex]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(i + 1, assets.length - 1))
      if (e.key === 'ArrowLeft') setCurrentIndex(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [assets.length, onClose])

  if (!asset) return null

  const ext = asset.extension.toLowerCase()
  const isVideo  = ['.mp4', '.webm', '.ogg', '.mov', '.mkv'].includes(ext)
  const isAudio  = ['.mp3', '.wav', '.aac', '.flac', '.m4a', '.opus'].includes(ext)
  const isEps    = ext === '.eps'
  const isVector = ['.ai', '.pdf'].includes(ext)

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 text-white flex flex-col animate-in fade-in duration-200">

      {/* Top Bar */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-black/50 [-webkit-app-region:drag]">
        <div className="flex-1 truncate pointer-events-auto [-webkit-app-region:no-drag]">
          <span className="text-sm font-medium">{asset.title || asset.filename}</span>
          <span className="text-xs text-white/50 ml-3">{currentIndex + 1} of {assets.length}</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 pointer-events-auto [-webkit-app-region:no-drag]">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Viewer Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">

        {/* Navigation */}
        {currentIndex > 0 && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all z-10"
            onClick={() => setCurrentIndex(i => i - 1)}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {currentIndex < assets.length - 1 && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white transition-all z-10"
            onClick={() => setCurrentIndex(i => i + 1)}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* Content */}
        <div className="w-full h-full p-8 flex items-center justify-center">
          {isAudio ? (
            <div className="flex flex-col items-center gap-6 text-white/60">
              <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Music className="h-12 w-12 opacity-40" />
              </div>
              <p className="text-sm font-medium text-white/70">{asset.title || asset.filename}</p>
              <audio
                src={`media://${encodeURIComponent(asset.absolute_path)}`}
                controls
                autoPlay
                className="w-80"
              />
            </div>
          ) : isVideo ? (
            <video
              src={`media://${encodeURIComponent(asset.absolute_path)}`}
              controls
              autoPlay
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          ) : isVector ? (
            <div className="flex flex-col items-center gap-4 text-white/50">
              <FileImage className="h-16 w-16 opacity-50" />
              <p>No native preview available for {asset.extension}</p>
            </div>
          ) : (isEps && asset.thumbnail_path) ? (
            <img
              src={`media://${encodeURIComponent(asset.thumbnail_path)}`}
              alt={asset.filename}
              className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
            />
          ) : isEps ? (
            <div className="flex flex-col items-center gap-4 text-white/50">
              <FileImage className="h-16 w-16 opacity-50" />
              <p>EPS — no preview generated</p>
            </div>
          ) : (
            <img
              src={`media://${encodeURIComponent(asset.absolute_path)}`}
              alt={asset.filename}
              className={cn('max-h-full max-w-full object-contain shadow-2xl transition-transform duration-300', asset.extension === '.svg' && 'bg-white/5 rounded-lg p-4')}
            />
          )}
        </div>
      </div>

      {/* Filmstrip */}
      {assets.length > 1 && (
        <div className="h-16 flex items-center gap-1.5 px-4 border-t border-white/10 bg-black/50 overflow-x-auto flex-shrink-0">
          {assets.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'flex-shrink-0 h-10 w-10 rounded-md overflow-hidden border-2 transition-all',
                i === currentIndex ? 'border-white/70 scale-105' : 'border-white/10 opacity-50 hover:opacity-80'
              )}
            >
              {a.thumbnail_path ? (
                <img src={`media://${encodeURIComponent(a.thumbnail_path)}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <span className="text-[7px] text-white/40 font-bold">{a.extension.replace('.','').toUpperCase()}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
