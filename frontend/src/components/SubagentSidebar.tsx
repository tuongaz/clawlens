import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bot, ChevronDown, ChevronRight, Cpu, Play, Moon } from 'lucide-react'
import { useSessionDetail } from '../hooks/useSessionDetail'
import { ErrorAlert } from './ui'
import { Sidebar } from './Sidebar'
import type { SubagentInvocation } from '../types'

function InvocationCard({ inv, index, total }: { inv: SubagentInvocation; index: number; total: number }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer"
      >
        {expanded ? <ChevronDown size={14} className="text-[var(--text-secondary)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--text-secondary)] shrink-0" />}
        <span className="text-sm text-[var(--text-primary)] truncate flex-1">
          {total > 1 && <span className="text-[var(--text-secondary)] mr-1">#{index + 1}</span>}
          {inv.description || 'Unnamed invocation'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {inv.model && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)]">
              {inv.model}
            </span>
          )}
          {inv.runInBackground && (
            <span title="Runs in background"><Moon size={12} className="text-[var(--text-secondary)]" /></span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)]">
          {inv.mode && (
            <div className="flex items-center gap-1.5 pt-2">
              <Play size={12} className="text-[var(--text-secondary)]" />
              <span className="text-xs text-[var(--text-secondary)]">Mode:</span>
              <span className="text-xs font-mono text-[var(--text-primary)]">{inv.mode}</span>
            </div>
          )}
          {inv.prompt && (
            <div className="pt-1">
              <div className="text-xs text-[var(--text-secondary)] mb-1">Prompt</div>
              <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words bg-white/5 rounded-md p-2.5 font-mono leading-relaxed">
                {inv.prompt}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function SubagentPanel() {
  const { sessionId, subagentName } = useParams<{ sessionId: string; subagentName: string }>()
  const navigate = useNavigate()
  const { detail, loading } = useSessionDetail(sessionId ?? '')

  const decodedName = subagentName ? decodeURIComponent(subagentName) : ''
  const onClose = () => navigate(`/session/${sessionId}`)

  const invocations = detail?.subagentDetails?.[decodedName] ?? []

  return (
    <Sidebar
      onClose={onClose}
      icon={<Bot size={18} className="text-[var(--accent-green)]" />}
      title={<span className="font-mono">{decodedName}</span>}
      footer={
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Cpu size={14} />
          <span>{invocations.length} invocation{invocations.length !== 1 ? 's' : ''}</span>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-base">
          Loading subagent details...
        </div>
      )}

      {!loading && invocations.length === 0 && (
        <ErrorAlert message={`No invocation details found for "${decodedName}"`} />
      )}

      {!loading && invocations.length > 0 && (
        <div className="space-y-2">
          {invocations.map((inv, i) => (
            <InvocationCard key={i} inv={inv} index={i} total={invocations.length} />
          ))}
        </div>
      )}
    </Sidebar>
  )
}
