import { useState } from 'react'
import { X, Folder, Search, FolderClosed } from 'lucide-react'

interface MoveToFolderModalProps {
  isOpen: boolean
  directories: any[]
  onMove: (targetPath: string) => void
  onClose: () => void
}

export function MoveToFolderModal({
  isOpen, directories, onMove, onClose
}: MoveToFolderModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  // Flatten folders and their subdirectories into a single flat list of chooseable target paths
  const targets: { label: string; displayPath: string; absolutePath: string }[] = []

  for (const dir of directories) {
    const rootName = dir.alias || dir.absolute_path.split('/').pop() || dir.absolute_path
    
    // Add the root folder itself
    targets.push({
      label: rootName,
      displayPath: rootName,
      absolutePath: dir.absolute_path
    })

    // Add subdirectories
    if (dir.subdirectories && Array.from(dir.subdirectories).length > 0) {
      for (const sub of dir.subdirectories) {
        targets.push({
          label: `${rootName}/${sub}`,
          displayPath: `${rootName} → ${sub}`,
          absolutePath: `${dir.absolute_path}/${sub}`
        })
      }
    }
  }

  // Filter based on search query
  const filteredTargets = targets.filter(t => 
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md accent-bg flex items-center justify-center">
              <FolderClosed className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Move to Folder</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border bg-card/60">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search target folders..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-muted/40 border border-input rounded-xl pl-9 pr-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent transition-all font-medium"
            />
          </div>
        </div>

        {/* Target List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
          {filteredTargets.map((target, idx) => (
            <button
              key={idx}
              onClick={() => onMove(target.absolutePath)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-left transition-all group/item hover:translate-x-[2px]"
            >
              <Folder className="h-4 w-4 text-muted-foreground/60 group-hover/item:text-accent-bg flex-shrink-0 transition-colors" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate group-hover/item:accent-text transition-colors">
                  {target.displayPath.split(' → ').pop()}
                </p>
                <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                  {target.displayPath}
                </p>
              </div>
            </button>
          ))}

          {filteredTargets.length === 0 && (
            <div className="py-12 text-center text-muted-foreground/50 space-y-2">
              <Folder className="h-8 w-8 mx-auto text-muted-foreground/20" />
              <p className="text-xs">No matching target folders found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/10 flex items-center justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
