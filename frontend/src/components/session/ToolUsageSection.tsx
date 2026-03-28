import { SectionCard, SectionTitle, EmptyState, InfoTip } from '../ui'
import { ToolBarList } from './ToolBarList'

function formatMcpToolName(name: string): string {
  const parts = name.replace(/^mcp__/, '').split('__')
  if (parts.length >= 2) {
    return `${parts[0]}: ${parts.slice(1).join('__')}`
  }
  return name
}

interface ToolUsageSectionProps {
  toolUsage: Record<string, number>
  mcpToolUsage: Record<string, number>
}

export function ToolUsageSection({ toolUsage, mcpToolUsage }: ToolUsageSectionProps) {
  const builtinEntries = Object.entries(toolUsage).sort((a, b) => b[1] - a[1])
  const mcpEntries = Object.entries(mcpToolUsage)
    .map(([name, count]) => [formatMcpToolName(name), count] as [string, number])
    .sort((a, b) => b[1] - a[1])

  if (builtinEntries.length === 0 && mcpEntries.length === 0) {
    return <EmptyState message="No tools used" className="py-4" />
  }

  return (
    <div className="space-y-3">
      {builtinEntries.length > 0 && (
        <SectionCard>
          <SectionTitle>Built-in Tools <InfoTip text="Frequency of each built-in tool call (Read, Write, Edit, Bash, Grep, etc.) during this session." /></SectionTitle>
          <ToolBarList items={builtinEntries} color="var(--accent-cyan)" />
        </SectionCard>
      )}
      {mcpEntries.length > 0 && (
        <SectionCard>
          <SectionTitle>MCP Tools <InfoTip text="Frequency of external tool calls via Model Context Protocol servers." /></SectionTitle>
          <ToolBarList items={mcpEntries} color="var(--accent-magenta)" />
        </SectionCard>
      )}
    </div>
  )
}
