/**
 * Manual SVG path construction helpers for step-round paths
 * that need precise control over turn points (e.g., routing around groups,
 * sharing turn Y with other paths).
 */

/** Resolve the .flow-node card inside a wrapper */
function resolveCard(el: HTMLElement): HTMLElement {
  return (el.querySelector('.flow-node') as HTMLElement) || el
}

/** Get center-bottom anchor point relative to container */
function anchorBottom(el: HTMLElement, cRect: DOMRect) {
  const card = resolveCard(el)
  const r = card.getBoundingClientRect()
  return { x: r.left - cRect.left + r.width / 2, y: r.top - cRect.top + r.height }
}

/** Get center-top anchor point relative to container */
function anchorTop(el: HTMLElement, cRect: DOMRect) {
  const card = resolveCard(el)
  const r = card.getBoundingClientRect()
  return { x: r.left - cRect.left + r.width / 2, y: r.top - cRect.top }
}

/** Get element rect relative to container */
function relRect(el: HTMLElement, cRect: DOMRect) {
  const r = el.getBoundingClientRect()
  return {
    left: r.left - cRect.left,
    right: r.right - cRect.left,
    top: r.top - cRect.top,
    bottom: r.bottom - cRect.top,
  }
}

/** Midpoint Y between two elements (in the gap between them) */
export function gapMidY(upperEl: HTMLElement, lowerEl: HTMLElement, container: HTMLElement): number {
  const cRect = container.getBoundingClientRect()
  const upper = relRect(upperEl, cRect)
  const lower = relRect(lowerEl, cRect)
  return (upper.bottom + lower.top) / 2
}

interface StepPathOptions {
  color?: string
  strokeWidth?: number
  radius?: number
}

/** Create an SVG path element and append it to the SVG */
function createPath(svg: SVGSVGElement, d: string, opts: StepPathOptions = {}): SVGPathElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('stroke', opts.color || '#cbd5e1')
  path.setAttribute('stroke-width', String(opts.strokeWidth || 1.5))
  path.setAttribute('fill', 'none')
  svg.appendChild(path)
  return path
}

/**
 * Draw a step-round path between two nodes with the horizontal turn
 * at a specific Y coordinate. Use this when multiple paths need to
 * share the same turn point.
 */
export function drawStepRoundAtY(
  svg: SVGSVGElement,
  container: HTMLElement,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  turnY: number,
  opts: StepPathOptions = {},
): SVGPathElement {
  const cRect = container.getBoundingClientRect()
  const from = anchorBottom(fromEl, cRect)
  const to = anchorTop(toEl, cRect)
  const r = opts.radius || 16
  const dx = to.x - from.x
  const dir = dx > 0 ? 1 : dx < 0 ? -1 : 0

  let d: string
  if (dir === 0 || Math.abs(dx) < 2) {
    d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`
  } else {
    d = [
      `M ${from.x} ${from.y}`,
      `L ${from.x} ${turnY - r}`,
      `Q ${from.x} ${turnY}, ${from.x + dir * r} ${turnY}`,
      `L ${to.x - dir * r} ${turnY}`,
      `Q ${to.x} ${turnY}, ${to.x} ${turnY + r}`,
      `L ${to.x} ${to.y}`,
    ].join(' ')
  }

  return createPath(svg, d, opts)
}

export interface BypassOptions extends StepPathOptions {
  /** Padding outside the avoided group (default: 24) */
  padding?: number
  /** Which side to route around (default: 'left') */
  side?: 'left' | 'right'
}

/**
 * Draw a step-round path that bypasses a group, routing around
 * its left or right edge. Horizontal turns sit at the midpoints
 * of the gaps between the surrounding groups.
 */
export function drawBypassArrow(
  svg: SVGSVGElement,
  container: HTMLElement,
  fromEl: HTMLElement,
  toEl: HTMLElement,
  avoidGroup: HTMLElement,
  aboveGroup: HTMLElement,
  belowGroup: HTMLElement,
  opts: BypassOptions = {},
): SVGPathElement {
  const cRect = container.getBoundingClientRect()
  const from = anchorBottom(fromEl, cRect)
  const to = anchorTop(toEl, cRect)
  const avoid = relRect(avoidGroup, cRect)
  const above = relRect(aboveGroup, cRect)
  const below = relRect(belowGroup, cRect)

  const padding = opts.padding || 24
  const side = opts.side || 'left'
  const r = opts.radius || 16

  const sideX = side === 'left'
    ? avoid.left - padding
    : avoid.right + padding
  const dirIn = side === 'left' ? -1 : 1

  const topTurnY = (above.bottom + avoid.top) / 2
  const bottomTurnY = (avoid.bottom + below.top) / 2

  const d = [
    `M ${from.x} ${from.y}`,
    // Down to first turn
    `L ${from.x} ${topTurnY - r}`,
    // Turn toward the side
    `Q ${from.x} ${topTurnY}, ${from.x + dirIn * r} ${topTurnY}`,
    // Horizontal past the group
    `L ${sideX - dirIn * r} ${topTurnY}`,
    // Turn down
    `Q ${sideX} ${topTurnY}, ${sideX} ${topTurnY + r}`,
    // Down past the group
    `L ${sideX} ${bottomTurnY - r}`,
    // Turn back toward target
    `Q ${sideX} ${bottomTurnY}, ${sideX - dirIn * r} ${bottomTurnY}`,
    // Horizontal toward target
    `L ${to.x - (to.x > sideX ? 1 : -1) * r} ${bottomTurnY}`,
    // Turn down to target
    `Q ${to.x} ${bottomTurnY}, ${to.x} ${bottomTurnY + r}`,
    // Down to target
    `L ${to.x} ${to.y}`,
  ].join(' ')

  return createPath(svg, d, opts)
}

/**
 * Match widths of multiple groups so their edges align when centered.
 * Call inside requestAnimationFrame after layout.
 */
export function alignGroupWidths(...groups: HTMLElement[]): void {
  requestAnimationFrame(() => {
    const maxWidth = Math.max(...groups.map(g => g.offsetWidth))
    for (const g of groups) {
      g.style.width = maxWidth + 'px'
      g.style.boxSizing = 'border-box'
    }
  })
}
