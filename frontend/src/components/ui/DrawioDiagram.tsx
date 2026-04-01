import { useEffect, useRef, useState, useCallback } from 'react'

let viewerLoaded = false
let viewerLoadPromise: Promise<void> | null = null

function loadDrawioViewer(): Promise<void> {
  if (viewerLoaded) return Promise.resolve()
  if (viewerLoadPromise) return viewerLoadPromise

  viewerLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://viewer.diagrams.net/js/viewer-static.min.js'
    script.onload = () => {
      viewerLoaded = true
      resolve()
    }
    script.onerror = () => {
      viewerLoadPromise = null
      reject(new Error('Failed to load draw.io viewer'))
    }
    document.head.appendChild(script)
  })

  return viewerLoadPromise
}

const ZOOM_STEP = 0.2
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

let renderCounter = 0

export function DrawioDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'diagram' | 'source'>('diagram')
  const [zoom, setZoom] = useState(1)
  const idRef = useRef(`drawio-${++renderCounter}`)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        await loadDrawioViewer()
        if (cancelled || !containerRef.current) return

        // Clear previous children safely
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild)
        }

        // Create the mxgraph container that the viewer expects
        const graphDiv = document.createElement('div')
        graphDiv.className = 'mxgraph'
        graphDiv.id = idRef.current
        graphDiv.style.maxWidth = '100%'

        // The viewer expects the XML in a JSON config via data-mxgraph
        const config = JSON.stringify({
          highlight: 'none',
          nav: false,
          resize: true,
          toolbar: '',
          edit: null,
          xml: code,
        })
        graphDiv.setAttribute('data-mxgraph', config)

        containerRef.current.appendChild(graphDiv)

        // The draw.io viewer picks up elements with class "mxgraph" via
        // GraphViewer.processElements(). We invoke it on our specific container.
        const w = window as unknown as {
          GraphViewer?: {
            processElements: (parent?: Element) => void
          }
        }
        if (w.GraphViewer?.processElements) {
          w.GraphViewer.processElements(containerRef.current)
        }

        // Wait for the viewer to render (it replaces the div content).
        // Poll briefly for the rendered output.
        let attempts = 0
        const maxAttempts = 50
        const poll = () => {
          if (cancelled) return
          const rendered = containerRef.current?.querySelector('.geDiagramContainer, svg, canvas')
          if (rendered || attempts >= maxAttempts) {
            if (!cancelled) {
              applyDarkTheme(containerRef.current!)
              setLoading(false)
            }
            return
          }
          attempts++
          requestAnimationFrame(poll)
        }
        poll()
      } catch (e) {
        if (cancelled) return
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

        {/* Zoom controls */}
        {tab === 'diagram' && (
          <div className="flex items-center gap-1.5">
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

      {/* Content */}
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

/** Apply dark theme overrides to the rendered draw.io diagram */
function applyDarkTheme(container: HTMLElement) {
  // Override white backgrounds in the rendered SVG
  container.querySelectorAll('svg').forEach(svg => {
    svg.style.maxWidth = '100%'
    svg.style.height = 'auto'
  })

  // The viewer creates a geDiagramContainer div - darken its background
  container.querySelectorAll<HTMLElement>('.geDiagramContainer').forEach(el => {
    el.style.background = 'transparent'
    el.style.overflow = 'visible'
  })

  // Fix white backgrounds on the SVG rect elements used as canvas background
  container.querySelectorAll<SVGRectElement>('rect[fill="white"], rect[fill="#ffffff"], rect[fill="#FFFFFF"]').forEach(el => {
    el.setAttribute('fill', 'transparent')
  })

  // Make text readable on dark backgrounds
  container.querySelectorAll<SVGTextElement>('text[fill="black"], text[fill="#000000"]').forEach(el => {
    el.setAttribute('fill', '#e6edf3')
  })

  // Adjust stroke colors for better dark theme visibility
  container.querySelectorAll<SVGElement>('[stroke="black"], [stroke="#000000"]').forEach(el => {
    el.setAttribute('stroke', '#7d8590')
  })

  // Override any inline white/light background divs the viewer may create
  container.querySelectorAll<HTMLElement>('div[style*="background"]').forEach(el => {
    const bg = el.style.backgroundColor
    if (bg === 'white' || bg === '#ffffff' || bg === 'rgb(255, 255, 255)') {
      el.style.backgroundColor = 'transparent'
    }
  })

  // Fix foreignObject div text colors (draw.io uses HTML labels inside SVG)
  container.querySelectorAll<HTMLElement>('foreignObject div').forEach(el => {
    const color = getComputedStyle(el).color
    if (color === 'rgb(0, 0, 0)') {
      el.style.color = '#e6edf3'
    }
  })
}
