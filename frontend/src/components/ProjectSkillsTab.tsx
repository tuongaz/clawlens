import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Zap } from 'lucide-react'
import type { SkillFile } from '../types'
import { EmptyState, MarkdownRenderer } from './ui'
import { Sidebar } from './Sidebar'

interface ProjectSkillsTabProps {
  projectPath: string
}

const sourceColors: Record<string, string> = {
  project: 'text-[var(--accent-green)]',
  user: 'text-[var(--accent-cyan)]',
  plugin: 'text-[var(--accent-magenta)]',
}

export function ProjectSkillsTab({ projectPath }: ProjectSkillsTabProps) {
  const [skills, setSkills] = useState<SkillFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSkill, setSelectedSkill] = useState<SkillFile | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/projects/${encodeURIComponent(projectPath)}/skills`)
      .then(res => res.ok ? res.json() : [])
      .then((data: SkillFile[]) => {
        if (!cancelled) {
          setSkills(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSkills([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [projectPath])

  const closeSidebar = useCallback(() => setSelectedSkill(null), [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-secondary)] text-base">
        Loading skills...
      </div>
    )
  }

  if (skills.length === 0) {
    return <EmptyState message="No skills found for this project" className="py-12" />
  }

  return (
    <>
      <div className="space-y-1">
        {skills.map(skill => (
          <button
            key={`${skill.source}:${skill.name}`}
            onClick={() => setSelectedSkill(skill)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-secondary)] hover:border-[var(--accent-cyan)]/40 transition-colors text-left cursor-pointer"
          >
            <Zap size={16} className="text-[var(--accent-cyan)] shrink-0" />
            <span className="font-mono text-base text-[var(--text-primary)] truncate">
              {skill.name}
            </span>
            <span className={`ml-auto font-mono text-xs ${sourceColors[skill.source] ?? 'text-[var(--text-secondary)]'}`}>
              {skill.source}
            </span>
          </button>
        ))}
      </div>

      {selectedSkill && (
        <Sidebar
          onClose={closeSidebar}
          icon={<Sparkles size={18} className="text-[var(--accent-cyan)]" />}
          title={selectedSkill.name}
        >
          <div className="mb-3">
            <span className={`font-mono text-xs ${sourceColors[selectedSkill.source] ?? 'text-[var(--text-secondary)]'}`}>
              {selectedSkill.source}
            </span>
          </div>
          <MarkdownRenderer className="prose prose-invert prose-base max-w-none text-base [&_p]:text-base [&_li]:text-base [&_h1]:text-base [&_h2]:text-base [&_h3]:text-base [&_code]:text-sm [&_pre]:text-sm">
            {selectedSkill.content}
          </MarkdownRenderer>
        </Sidebar>
      )}
    </>
  )
}
