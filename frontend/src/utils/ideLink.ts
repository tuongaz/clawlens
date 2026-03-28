export function ideDeepLink(client: string, cwd: string): string | null {
  const c = client.toLowerCase()
  if (c.includes('cursor')) return `cursor://file/${cwd}`
  if (c.includes('code')) return `vscode://file/${cwd}`
  if (c.includes('windsurf')) return `windsurf://file/${cwd}`
  if (c.includes('zed')) return `zed://file/${cwd}`
  if (c.includes('pycharm')) return `pycharm://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('intellij')) return `idea://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('goland')) return `goland://open?file=${encodeURIComponent(cwd)}`
  if (c.includes('webstorm')) return `webstorm://open?file=${encodeURIComponent(cwd)}`
  return null
}
