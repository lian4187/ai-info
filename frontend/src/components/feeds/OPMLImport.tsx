import React, { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Upload, Link2, FileUp, CheckCircle2 } from 'lucide-react'
import { GlassCard, GlassButton, GlassInput } from '../common'
import { importOPML, importOPMLFromURL, type OPMLImportResult } from '../../api/feeds'

// ---------------------------------------------------------------------------
// Sub-component: Result banner
// ---------------------------------------------------------------------------

function ImportResult({ result }: { result: OPMLImportResult }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
      <CheckCircle2
        size={18}
        className="text-emerald-400 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="text-sm text-emerald-300/90 leading-relaxed">
        <p className="font-semibold mb-1">Import successful</p>
        <ul className="space-y-0.5 text-emerald-300/70">
          <li>{result.feeds_created} feed{result.feeds_created !== 1 ? 's' : ''} added</li>
          <li>{result.categories_created} categor{result.categories_created !== 1 ? 'ies' : 'y'} created</li>
          {result.feeds_skipped > 0 && (
            <li>{result.feeds_skipped} feed{result.feeds_skipped !== 1 ? 's' : ''} skipped (already exist)</li>
          )}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type ActiveTab = 'file' | 'url'

export function OPMLImport() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('file')
  const [opmlUrl, setOpmlUrl] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<OPMLImportResult | null>(null)

  const fileMutation = useMutation({
    mutationFn: (file: File) => importOPML(file),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const urlMutation = useMutation({
    mutationFn: () => importOPMLFromURL(opmlUrl.trim()),
    onSuccess: (data) => {
      setResult(data)
      setOpmlUrl('')
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  // ---------------------------------------------------------------------------
  // File handlers
  // ---------------------------------------------------------------------------

  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'opml' && ext !== 'xml') {
      toast.error('Only .opml or .xml files are accepted')
      return
    }
    setResult(null)
    fileMutation.mutate(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // ---------------------------------------------------------------------------
  // URL handler
  // ---------------------------------------------------------------------------

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!opmlUrl.trim()) return
    setResult(null)
    urlMutation.mutate()
  }

  const isPending = fileMutation.isPending || urlMutation.isPending

  return (
    <GlassCard className="flex flex-col gap-5 p-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <Upload size={16} className="text-violet-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/90">Import OPML</h3>
          <p className="text-xs text-white/40">Import feeds from an OPML file or URL</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
        {(['file', 'url'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setActiveTab(tab); setResult(null) }}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
              activeTab === tab
                ? 'bg-white/10 text-white border border-white/15'
                : 'text-white/50 hover:text-white/80',
            ].join(' ')}
          >
            {tab === 'file' ? (
              <>
                <FileUp size={14} aria-hidden="true" />
                Upload File
              </>
            ) : (
              <>
                <Link2 size={14} aria-hidden="true" />
                From URL
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'file' ? (
        <div>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".opml,.xml"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Choose OPML file"
          />

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop OPML file here or click to browse"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={[
              'flex flex-col items-center justify-center gap-3 py-10 rounded-xl',
              'border-2 border-dashed transition-all duration-200 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
              isPending
                ? 'opacity-50 pointer-events-none'
                : isDragging
                ? 'border-violet-400/60 bg-violet-500/10'
                : 'border-white/15 hover:border-white/30 hover:bg-white/5',
            ].join(' ')}
          >
            <div className={[
              'p-3 rounded-xl border transition-all duration-200',
              isDragging
                ? 'bg-violet-500/20 border-violet-500/30'
                : 'bg-white/5 border-white/10',
            ].join(' ')}>
              <Upload
                size={24}
                className={isDragging ? 'text-violet-400' : 'text-white/30'}
                aria-hidden="true"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-white/70 font-medium">
                {isPending ? 'Importing…' : 'Drop your OPML file here'}
              </p>
              <p className="text-xs text-white/40 mt-1">
                or <span className="text-blue-400 underline underline-offset-2">browse</span> — .opml or .xml
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
          <GlassInput
            label="OPML URL"
            type="url"
            placeholder="https://example.com/feeds.opml"
            value={opmlUrl}
            onChange={(e) => setOpmlUrl(e.target.value)}
            required
            disabled={isPending}
          />
          <GlassButton
            type="submit"
            variant="secondary"
            loading={urlMutation.isPending}
            disabled={!opmlUrl.trim()}
            icon={<Link2 size={14} />}
          >
            Import from URL
          </GlassButton>
        </form>
      )}

      {/* Result */}
      {result && <ImportResult result={result} />}
    </GlassCard>
  )
}
