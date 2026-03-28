import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { ErrorAlert } from './ui'

export function SkillPanel() {
  const { sessionId, skillName } = useParams<{ sessionId: string; skillName: string }>()
  const navigate = useNavigate()
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const decodedName = skillName ? decodeURIComponent(skillName) : ''

  const onClose = () => navigate(`/session/${sessionId}`)

  useEffect(() => {
    if (!sessionId || !decodedName) return
    setLoading(true)
    setError(null)

    fetch(`/api/sessions/${sessionId}/skills/${encodeURIComponent(decodedName)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `Skill not found`)
        }
        return res.json()
      })
      .then((data) => {
        setContent(data.content)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [sessionId, decodedName])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[480px] max-w-[90vw] bg-[var(--bg-primary)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl shadow-black/40 animate-slide-in">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border)] shrink-0">
          <Sparkles size={18} className="text-[var(--accent-yellow)]" />
          <h2 className="text-sm font-semibold text-[var(--text-bright)] flex-1 truncate font-mono">
            {decodedName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-sm">
              Loading skill...
            </div>
          )}

          {error && <ErrorAlert message={error} />}

          {!loading && !error && content != null && (
            <div className="prose prose-invert prose-sm max-w-none text-xs [&_p]:text-xs [&_li]:text-xs [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[11px] [&_pre]:text-[11px]">
              <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{content}</Markdown>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
