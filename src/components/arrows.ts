export type CurveType = 's' | 'straight' | 'arc' | 'bezier' | 'step'
export type Anchor = 'top' | 'bottom' | 'left' | 'right'

export interface ArrowOptions {
  curve?: CurveType
  color?: string
  style?: 'solid' | 'dashed'
  strokeWidth?: number
  fromAnchor?: Anchor
  toAnchor?: Anchor
  cp1?: { x: number; y: number }
  cp2?: { x: number; y: number }
  label?: string
}

interface ArrowMeta {
  fromEl: HTMLElement
  toEl: HTMLElement
  opts: ArrowOptions
  path: SVGPathElement
  container: HTMLElement
}

const arrowRegistry: ArrowMeta[] = []

export function createSvgOverlay(container: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('svg-overlay')
  svg.style.width = container.offsetWidth + 'px'
  svg.style.height = container.offsetHeight + 'px'

  // Defs for arrowhead markers
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  svg.appendChild(defs)

  container.appendChild(svg)

  const ro = new ResizeObserver(() => {
    svg.style.width = container.offsetWidth + 'px'
    svg.style.height = container.offsetHeight + 'px'
    redrawArrows(svg, container)
  })
  ro.observe(container)

  return svg
}

/** Resolve the card element inside a wrapper (if using createNode wrapper pattern) */
function resolveCard(el: HTMLElement): HTMLElement {
  const card = el.querySelector('.flow-node') as HTMLElement | null
  return card || el
}

function getAnchorPoint(el: HTMLElement, anchor: Anchor, container: HTMLElement): { x: number; y: number } {
  // Use the card element for positioning, not the outer wrapper
  const card = resolveCard(el)
  const rect = card.getBoundingClientRect()
  const cRect = container.getBoundingClientRect()

  const top = rect.top - cRect.top
  const left = rect.left - cRect.left
  const cx = left + rect.width / 2
  const cy = top + rect.height / 2

  switch (anchor) {
    case 'top': return { x: cx, y: top }
    case 'bottom': return { x: cx, y: top + rect.height }
    case 'left': return { x: left, y: cy }
    case 'right': return { x: left + rect.width, y: cy }
  }
}

function autoAnchor(fromEl: HTMLElement, toEl: HTMLElement, container: HTMLElement): { from: Anchor; to: Anchor } {
  const fCard = resolveCard(fromEl)
  const tCard = resolveCard(toEl)
  const fRect = fCard.getBoundingClientRect()
  const tRect = tCard.getBoundingClientRect()
  const cRect = container.getBoundingClientRect()

  const fCy = fRect.top - cRect.top + fRect.height / 2
  const tCy = tRect.top - cRect.top + tRect.height / 2

  // If there's any vertical separation (different rows), prefer bottom→top
  const verticalGap = Math.abs(tCy - fCy)
  if (verticalGap > 20) {
    return tCy > fCy
      ? { from: 'bottom', to: 'top' }
      : { from: 'top', to: 'bottom' }
  }

  // Same row — use horizontal
  const fCx = fRect.left - cRect.left + fRect.width / 2
  const tCx = tRect.left - cRect.left + tRect.width / 2
  return tCx > fCx
    ? { from: 'right', to: 'left' }
    : { from: 'left', to: 'right' }
}

function buildPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curve: CurveType,
  cp1?: { x: number; y: number },
  cp2?: { x: number; y: number }
): string {
  switch (curve) {
    case 'straight':
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`

    case 's': {
      // S-curve: cubic bezier with 40% offset in the dominant direction
      const dx = to.x - from.x
      const dy = to.y - from.y
      const isVertical = Math.abs(dy) > Math.abs(dx)
      if (isVertical) {
        const offset = dy * 0.4
        return `M ${from.x} ${from.y} C ${from.x} ${from.y + offset}, ${to.x} ${to.y - offset}, ${to.x} ${to.y}`
      } else {
        const offset = dx * 0.4
        return `M ${from.x} ${from.y} C ${from.x + offset} ${from.y}, ${to.x - offset} ${to.y}, ${to.x} ${to.y}`
      }
    }

    case 'arc': {
      // Quadratic arc
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2
      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      // Perpendicular offset
      const offset = dist * 0.3
      const nx = -dy / dist * offset
      const ny = dx / dist * offset
      return `M ${from.x} ${from.y} Q ${midX + nx} ${midY + ny}, ${to.x} ${to.y}`
    }

    case 'bezier': {
      const c1 = cp1 || { x: from.x, y: (from.y + to.y) / 2 }
      const c2 = cp2 || { x: to.x, y: (from.y + to.y) / 2 }
      return `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`
    }

    case 'step': {
      const midY = (from.y + to.y) / 2
      return `M ${from.x} ${from.y} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${to.y}`
    }

    default:
      return buildPath(from, to, 's')
  }
}

function ensureMarker(svg: SVGSVGElement, color: string): string {
  const markerId = `arrow-${color.replace('#', '')}`
  if (svg.querySelector(`#${markerId}`)) return markerId

  const defs = svg.querySelector('defs')!
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  marker.setAttribute('id', markerId)
  marker.setAttribute('viewBox', '0 0 10 10')
  marker.setAttribute('refX', '9')
  marker.setAttribute('refY', '5')
  marker.setAttribute('markerWidth', '6')
  marker.setAttribute('markerHeight', '6')
  marker.setAttribute('orient', 'auto-start-reverse')

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  polygon.setAttribute('points', '0,1 10,5 0,9')
  polygon.setAttribute('fill', color)
  polygon.setAttribute('fill-opacity', '1')
  marker.appendChild(polygon)
  defs.appendChild(marker)

  return markerId
}

export function drawArrow(
  svg: SVGSVGElement,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  opts: ArrowOptions = {}
): SVGPathElement {
  const container = svg.parentElement!
  const color = opts.color || '#94a3b8'
  const curve = opts.curve || 's'
  const strokeWidth = opts.strokeWidth || 1.5

  const anchors = autoAnchor(fromEl, toEl, container)
  const fromAnchor = opts.fromAnchor || anchors.from
  const toAnchor = opts.toAnchor || anchors.to

  const from = getAnchorPoint(fromEl, fromAnchor, container)
  const to = getAnchorPoint(toEl, toAnchor, container)

  const markerId = ensureMarker(svg, color)
  const d = buildPath(from, to, curve, opts.cp1, opts.cp2)

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', String(strokeWidth))
  path.setAttribute('stroke-opacity', '1')
  path.setAttribute('fill', 'none')
  path.setAttribute('marker-end', `url(#${markerId})`)

  if (opts.style === 'dashed') {
    path.setAttribute('stroke-dasharray', '8 5')
  }

  // Store labels for debug tracing
  const fCard = resolveCard(fromEl)
  const tCard = resolveCard(toEl)
  path.dataset.fromLabel = (fCard.querySelector('.text-sm.font-semibold') as HTMLElement)?.textContent?.trim() || '???'
  path.dataset.toLabel = (tCard.querySelector('.text-sm.font-semibold') as HTMLElement)?.textContent?.trim() || '???'

  svg.appendChild(path)

  // Register for redraw
  arrowRegistry.push({ fromEl, toEl, opts, path, container })

  // Label
  if (opts.label) {
    const mid = getAnchorPoint(fromEl, fromAnchor, container)
    const end = getAnchorPoint(toEl, toAnchor, container)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', String((mid.x + end.x) / 2))
    text.setAttribute('y', String((mid.y + end.y) / 2 - 8))
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('fill', color)
    text.setAttribute('font-size', '11')
    text.setAttribute('font-weight', '500')
    text.textContent = opts.label
    svg.appendChild(text)
  }

  return path
}

export function redrawArrows(svg: SVGSVGElement, container: HTMLElement): void {
  for (const meta of arrowRegistry) {
    if (meta.container !== container) continue

    const anchors = autoAnchor(meta.fromEl, meta.toEl, container)
    const fromAnchor = meta.opts.fromAnchor || anchors.from
    const toAnchor = meta.opts.toAnchor || anchors.to

    const from = getAnchorPoint(meta.fromEl, fromAnchor, container)
    const to = getAnchorPoint(meta.toEl, toAnchor, container)

    const d = buildPath(from, to, meta.opts.curve || 's', meta.opts.cp1, meta.opts.cp2)
    meta.path.setAttribute('d', d)
  }
}
