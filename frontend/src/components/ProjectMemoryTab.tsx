import { useState, useEffect, useCallback } from 'react'
import { Brain, FileText } from 'lucide-react'
import type { MemoryFile } from '../types'
import { EmptyState, MarkdownRenderer } from './ui'
import { Sidebar } from './Sidebar'

interface ProjectMemoryTabProps {
  projectPath: string
}

export function ProjectMemoryTab({ projectPath }: ProjectMemoryTabProps) {
  const [files, setFiles] = useState<MemoryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<MemoryFile | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/projects/${encodeURIComponent(projectPath)}/memory`)
      .then(res => res.ok ? res.json() : [])
      .then((data: MemoryFile[]) => {
        if (!cancelled) {
          setFiles(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFiles([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [projectPath])

  const closeSidebar = useCallback(() => setSelectedFile(null), [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-base">
        Loading memory files...
      </div>
    )
  }

  if (files.length === 0) {
    return <EmptyState message="No memory files exist for this project" className="py-12" />
  }

  return (
    <>
      <div className="space-y-1">
        {files.map(file => (
          <button
            key={file.name}
            onClick={() => setSelectedFile(file)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)] hover:border-[var(--accent-magenta)]/40 transition-colors text-left cursor-pointer"
          >
            <FileText size={16} className="text-[var(--accent-magenta)] shrink-0" />
            <span className="font-mono text-base text-[var(--text-primary)] truncate">
              {file.name}
            </span>
          </button>
        ))}
      </div>

      {selectedFile && (
        <Sidebar
          onClose={closeSidebar}
          icon={<Brain size={18} className="text-[var(--accent-magenta)]" />}
          title={selectedFile.name}
        >
          <MarkdownRenderer className="prose prose-invert prose-base max-w-none text-base [&_p]:text-base [&_li]:text-base [&_h1]:text-base [&_h2]:text-base [&_h3]:text-base [&_code]:text-sm [&_pre]:text-sm">
            {selectedFile.content}
          </MarkdownRenderer>
        </Sidebar>
      )}
    </>
  )
}
