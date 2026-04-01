import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Excalidraw element types we recognise for auto-detection and fallback rendering.
 */
const EXCALIDRAW_ELEMENT_TYPES = new Set([
  'rectangle',
  'ellipse',
  'diamond',
  'arrow',
  'line',
  'freedraw',
  'text',
  'image',
  'frame',
  'magicframe',
  'embeddable',
  'iframe',
  'selection',
])

/**
 * Parse an Excalidraw JSON string into its elements and optional appState/files.
 * Returns null if the input is not valid Excalidraw JSON.
 */
function parseExcalidraw(code: string): {
  elements: Record<string, unknown>[]
  appState: Record<string, unknown>
  files: Record<string, unknown> | null
} | null {
  try {
    const parsed = JSON.parse(code)

    // Full Excalidraw file format: { type: "excalidraw", elements: [...] }
    if (parsed && parsed.type === 'excalidraw' && Array.isArray(parsed.elements)) {
      return {
        elements: parsed.elements,
        appState: parsed.appState ?? {},
        files: parsed.files ?? null,
      }
    }

    // Bare array of elements
    if (Array.isArray(parsed) && parsed.length > 0) {
      const looksLikeElements = parsed.every(
        (el: Record<string, unknown>) =>
          el && typeof el === 'object' && typeof el.type === 'string' && EXCALIDRAW_ELEMENT_TYPES.has(el.type as string),
      )
      if (looksLikeElements) {
        return { elements: parsed, appState: {}, files: null }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if a JSON code string looks like Excalidraw data.
 * Used for auto-detection in MarkdownRenderer.
 */
export function looksLikeExcalidraw(code: string): boolean {
  return parseExcalidraw(code) !== null
}

// ---------------------------------------------------------------------------
// Library loading via dynamic import
// ---------------------------------------------------------------------------

let exportToSvgFn: ((opts: {
  elements: unknown[]
  appState?: Record<string, unknown>
  files: Record<string, unknown> | null
}) => Promise<SVGSVGElement>) | null = null

let loadAttempted = false
let loadPromise: Promise<boolean> | null = null

function loadExcalidrawExport(): Promise<boolean> {
  if (exportToSvgFn) return Promise.resolve(true)
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    if (loadAttempted) return false
    loadAttempted = true
    try {
      // Dynamic import so it does not block the initial bundle and so we can
      // gracefully catch React 19 compatibility errors at runtime.
      const mod = await import('@excalidraw/excalidraw')
      if (typeof mod.exportToSvg === 'function') {
        exportToSvgFn = mod.exportToSvg as typeof exportToSvgFn
        return true
      }
      return false
    } catch {
      return false
    }
  })()

  return loadPromise
}

// ---------------------------------------------------------------------------
// Fallback SVG renderer
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildFallbackSvg(elements: Record<string, unknown>[]): SVGSVGElement {
  // Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const el of elements) {
    const x = Number(el.x ?? 0)
    const y = Number(el.y ?? 0)
    const w = Number(el.width ?? 0)
    const h = Number(el.height ?? 0)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + w)
    maxY = Math.max(maxY, y + h)
  }

  if (!isFinite(minX)) {
    minX = 0; minY = 0; maxX = 400; maxY = 300
  }

  const pad = 40
  const vbX = minX - pad
  const vbY = minY - pad
  const vbW = maxX - minX + pad * 2
  const vbH = maxY - minY + pad * 2

  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
  svg.style.maxWidth = '100%'
  svg.style.height = 'auto'

  // Arrow marker definition
  const defs = document.createElementNS(NS, 'defs')
  const marker = document.createElementNS(NS, 'marker')
  marker.setAttribute('id', 'excali-arrowhead')
  marker.setAttribute('markerWidth', '10')
  marker.setAttribute('markerHeight', '7')
  marker.setAttribute('refX', '10')
  marker.setAttribute('refY', '3.5')
  marker.setAttribute('orient', 'auto')
  const markerPoly = document.createElementNS(NS, 'polygon')
  markerPoly.setAttribute('points', '0 0, 10 3.5, 0 7')
  markerPoly.setAttribute('fill', '#e6edf3')
  marker.appendChild(markerPoly)
  defs.appendChild(marker)
  svg.appendChild(defs)

  for (const el of elements) {
    if (el.isDeleted) continue
    const x = Number(el.x ?? 0)
    const y = Number(el.y ?? 0)
    const w = Number(el.width ?? 100)
    const h = Number(el.height ?? 100)
    const stroke = typeof el.strokeColor === 'string' ? el.strokeColor : '#e6edf3'
    const fill = typeof el.backgroundColor === 'string' && el.backgroundColor !== 'transparent'
      ? el.backgroundColor
      : 'none'
    const sw = String(el.strokeWidth ?? 1)
    const opacity = String(Number(el.opacity ?? 100) / 100)

    // Map dark strokes to light for dark theme
    const adjustedStroke = stroke === '#000000' || stroke === '#1e1e1e' ? '#e6edf3' : stroke

    switch (el.type) {
      case 'rectangle': {
        const rect = document.createElementNS(NS, 'rect')
        rect.setAttribute('x', String(x))
        rect.setAttribute('y', String(y))
        rect.setAttribute('width', String(w))
        rect.setAttribute('height', String(h))
        rect.setAttribute('fill', fill)
        rect.setAttribute('stroke', adjustedStroke)
        rect.setAttribute('stroke-width', sw)
        rect.setAttribute('opacity', opacity)
        rect.setAttribute('rx', '3')
        svg.appendChild(rect)
        break
      }
      case 'ellipse': {
        const ellipse = document.createElementNS(NS, 'ellipse')
        ellipse.setAttribute('cx', String(x + w / 2))
        ellipse.setAttribute('cy', String(y + h / 2))
        ellipse.setAttribute('rx', String(w / 2))
        ellipse.setAttribute('ry', String(h / 2))
        ellipse.setAttribute('fill', fill)
        ellipse.setAttribute('stroke', adjustedStroke)
        ellipse.setAttribute('stroke-width', sw)
        ellipse.setAttribute('opacity', opacity)
        svg.appendChild(ellipse)
        break
      }
      case 'diamond': {
        const cx = x + w / 2
        const cy = y + h / 2
        const poly = document.createElementNS(NS, 'polygon')
        poly.setAttribute('points', `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`)
        poly.setAttribute('fill', fill)
        poly.setAttribute('stroke', adjustedStroke)
        poly.setAttribute('stroke-width', sw)
        poly.setAttribute('opacity', opacity)
        svg.appendChild(poly)
        break
      }
      case 'line':
      case 'arrow': {
        const points = Array.isArray(el.points) ? (el.points as number[][]) : [[0, 0], [w, h]]
        if (points.length >= 2) {
          const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x + p[0]},${y + p[1]}`).join(' ')
          const path = document.createElementNS(NS, 'path')
          path.setAttribute('d', d)
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke', adjustedStroke)
          path.setAttribute('stroke-width', sw)
          path.setAttribute('opacity', opacity)
          if (el.type === 'arrow') {
            path.setAttribute('marker-end', 'url(#excali-arrowhead)')
          }
          svg.appendChild(path)
        }
        break
      }
      case 'freedraw': {
        const points = Array.isArray(el.points) ? (el.points as number[][]) : []
        if (points.length >= 2) {
          const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x + p[0]},${y + p[1]}`).join(' ')
          const path = document.createElementNS(NS, 'path')
          path.setAttribute('d', d)
          path.setAttribute('fill', 'none')
          path.setAttribute('stroke', adjustedStroke)
          path.setAttribute('stroke-width', sw)
          path.setAttribute('opacity', opacity)
          svg.appendChild(path)
        }
        break
      }
      case 'text': {
        const textContent = typeof el.text === 'string' ? el.text : ''
        const fontSize = Number(el.fontSize ?? 16)
        const textEl = document.createElementNS(NS, 'text')
        textEl.setAttribute('x', String(x))
        textEl.setAttribute('fill', adjustedStroke)
        textEl.setAttribute('font-size', String(fontSize))
        textEl.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, Segoe UI, Noto Sans, Helvetica, Arial, sans-serif')
        textEl.setAttribute('opacity', opacity)
        // Multi-line text
        const lines = textContent.split('\n')
        lines.forEach((line, i) => {
          const tspan = document.createElementNS(NS, 'tspan')
          tspan.setAttribute('x', String(x))
          if (i === 0) {
            tspan.setAttribute('y', String(y + fontSize))
          } else {
            tspan.setAttribute('dy', String(fontSize * 1.2))
          }
          tspan.textContent = escapeXml(line)
          textEl.appendChild(tspan)
        })
        svg.appendChild(textEl)
        break
      }
    }
  }

  return svg
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ZOOM_STEP = 0.2
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

export function ExcalidrawDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'diagram' | 'source'>('diagram')
  const [zoom, setZoom] = useState(1)
  const [usedFallback, setUsedFallback] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function render() {
      const parsed = parseExcalidraw(code)
      if (!parsed) {
        setError('Invalid Excalidraw JSON')
        setLoading(false)
        return
      }

      const { elements, appState, files } = parsed

      if (elements.length === 0) {
        setError('Excalidraw document has no elements')
        setLoading(false)
        return
      }

      // Try the real library first
      const libAvailable = await loadExcalidrawExport()

      if (cancelled || !containerRef.current) return

      if (libAvailable && exportToSvgFn) {
        try {
          const svgEl = await exportToSvgFn({
            elements: elements as unknown[],
            appState: {
              exportBackground: false,
              viewBackgroundColor: 'transparent',
              theme: 'dark',
              ...appState,
            },
            files: files as Record<string, unknown> | null,
          })

          if (cancelled || !containerRef.current) return

          svgEl.style.maxWidth = '100%'
          svgEl.style.height = 'auto'
          containerRef.current.replaceChildren(svgEl)
          setLoading(false)
          return
        } catch {
          // Library render failed — fall through to fallback
        }
      }

      if (cancelled || !containerRef.current) return

      // Fallback: basic SVG rendering using DOM APIs
      try {
        const svgEl = buildFallbackSvg(elements as Record<string, unknown>[])
        containerRef.current.replaceChildren(svgEl)
        setUsedFallback(true)
        setLoading(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to render diagram')
        setLoading(false)
      }
    }

    render()
    return () => { cancelled = true }
  }, [code])

  const zoomIn = useCallback(() => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)), [])
  const zoomReset = useCallback(() => setZoom(1), [])

  const zoomPercent = Math.round(zoom * 100)

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--accent-yellow)] bg-[var(--bg-secondary)] p-3">
        <div className="text-sm text-[var(--accent-yellow)] mb-2">Diagram render error</div>
        <pre className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap overflow-x-auto">{code}</pre>
      </div>
    )
  }

  return (
    <div className="my-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setTab('diagram')}
            className={`px-2.5 py-1 rounded text-sm cursor-pointer border-none transition-colors ${
              tab === 'diagram'
                ? 'bg-[rgba(88,166,255,0.15)] text-[var(--accent-cyan)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Diagram
          </button>
          <button
            onClick={() => setTab('source')}
            className={`px-2.5 py-1 rounded text-sm cursor-pointer border-none transition-colors ${
              tab === 'source'
                ? 'bg-[rgba(88,166,255,0.15)] text-[var(--accent-cyan)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Source
          </button>
        </div>

        {/* Zoom controls — only visible on diagram tab */}
        {tab === 'diagram' && (
          <div className="flex items-center gap-1.5">
            {usedFallback && (
              <span className="text-[10px] text-[var(--text-secondary)] mr-2 opacity-60">simplified</span>
            )}
            <button
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="w-6 h-6 flex items-center justify-center rounded text-sm cursor-pointer border-none bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-default transition-colors"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={zoomReset}
              className="px-1.5 min-w-[3rem] text-center text-xs font-mono text-[var(--text-secondary)] cursor-pointer border-none bg-transparent hover:text-[var(--text-primary)] transition-colors"
              title="Reset zoom"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="w-6 h-6 flex items-center justify-center rounded text-sm cursor-pointer border-none bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 disabled:cursor-default transition-colors"
              title="Zoom in"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Content — both views stay mounted to preserve rendered SVG */}
      <div className={`p-4 overflow-auto ${tab !== 'diagram' ? 'hidden' : ''}`}>
        {loading && (
          <div className="text-sm text-[var(--text-secondary)] py-2">Rendering diagram...</div>
        )}
        <div
          ref={containerRef}
          className="flex justify-center [&_svg]:max-w-full origin-top-left transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>

      <div className={`p-4 overflow-auto ${tab !== 'source' ? 'hidden' : ''}`}>
        <pre className="text-sm text-[var(--text-primary)] font-mono whitespace-pre-wrap m-0">{code}</pre>
      </div>
    </div>
  )
}
