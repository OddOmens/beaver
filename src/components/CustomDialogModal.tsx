import React, { useState, useEffect, useRef } from 'react'
import { X, AlertCircle } from 'lucide-react'

interface CustomDialogModalProps {
  isOpen: boolean
  type: 'alert' | 'confirm' | 'prompt'
  title: string
  message: string
  placeholder?: string
  defaultValue?: string
  onConfirm: (value?: string) => void
  onCancel: () => void
}

export function CustomDialogModal({
  isOpen, type, title, message, placeholder = '', defaultValue = '', onConfirm, onCancel
}: CustomDialogModalProps) {
  const [inputValue, setInputValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue)
      // Focus input with a tiny delay to ensure render
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [isOpen, defaultValue])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm(type === 'prompt' ? inputValue : undefined)
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
      <div 
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md accent-bg flex items-center justify-center">
              <AlertCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
          </div>
          <button 
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{message}</p>
          
          {type === 'prompt' && (
            <div className="relative mt-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-muted/40 border border-input rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring focus:border-transparent transition-all font-medium"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-muted/10 flex items-center justify-end gap-2">
          {type !== 'alert' && (
            <button 
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={() => onConfirm(type === 'prompt' ? inputValue : undefined)}
            className="px-4 py-2 rounded-xl accent-bg text-white text-[11px] font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            {type === 'alert' ? 'OK' : type === 'prompt' ? 'Rename' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
