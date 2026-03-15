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
  noArrow?: boolean
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

  const d = buildPath(from, to, curve, opts.cp1, opts.cp2)

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  path.setAttribute('stroke', color)
  path.setAttribute('stroke-width', String(strokeWidth))
  path.setAttribute('stroke-opacity', '1')
  path.setAttribute('fill', 'none')

  if (!opts.noArrow) {
    const markerId = ensureMarker(svg, color)
    path.setAttribute('marker-end', `url(#${markerId})`)
  }

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

export interface MergedArrowsResult {
  /** Full invisible paths per source (for packet animation via getPointAtLength) */
  paths: SVGPathElement[]
  /** Visible branch paths per source (undefined for center source which uses the upperTrunk) */
  branches: (SVGPathElement | undefined)[]
  /** Upper trunk: center source → join point (visually belongs to center source) */
  upperTrunk: SVGPathElement
  /** Lower trunk: join point → target (shared segment below the merge) */
  lowerTrunk: SVGPathElement
  /** Index of the center source that uses the trunk directly */
  centerIndex: number
}

/**
 * Build an orthogonal tributary path with rounded corners.
 * Goes straight down from src, rounded corner, horizontal to trunk X,
 * rounded corner, straight down to joinPt.
 */
function tributaryPath(
  src: { x: number; y: number },
  joinPt: { x: number; y: number },
  targetPt: { x: number; y: number },
  radius = 20
): string {
  const dx = joinPt.x - src.x
  const dir = dx > 0 ? 1 : -1 // 1 = source is left of trunk, -1 = right
  const absDx = Math.abs(dx)

  // Clamp radius so it doesn't exceed available space
  const dy = joinPt.y - src.y
  const r = Math.min(radius, absDx, dy / 2)

  // Turn Y: true midpoint between source and target (not joinPt)
  const turnY = src.y + (targetPt.y - src.y) * 0.5

  // Path: down → round corner → horizontal → round corner (stop at trunk X)
  // The vertical segment below the second corner is part of the trunk, not the branch,
  // so we omit it here to avoid z-order coloring conflicts.
  return [
    `M ${src.x} ${src.y}`,
    // Straight down to first corner
    `L ${src.x} ${turnY - r}`,
    // Round corner: turning from vertical to horizontal
    `Q ${src.x} ${turnY}, ${src.x + dir * r} ${turnY}`,
    // Horizontal to second corner
    `L ${joinPt.x - dir * r} ${turnY}`,
    // Round corner: turning from horizontal to vertical
    `Q ${joinPt.x} ${turnY}, ${joinPt.x} ${turnY + r}`,
  ].join(' ')
}

/**
 * Draw multiple source lines that converge into a single trunk leading to the target.
 * The center source draws a straight line all the way down (the trunk).
 * Outer sources draw smooth bezier curves that merge tangentially into the trunk.
 * Returns invisible full-length paths per source for packet animation.
 */
export function drawMergedArrows(
  svg: SVGSVGElement,
  sourceEls: HTMLElement[],
  targetEl: HTMLElement,
  opts: ArrowOptions = {}
): MergedArrowsResult {
  const container = svg.parentElement!
  const color = opts.color || '#94a3b8'
  const strokeWidth = opts.strokeWidth || 1.5

  const targetPt = getAnchorPoint(targetEl, opts.toAnchor || 'top', container)
  const sourcePts = sourceEls.map(el => getAnchorPoint(el, opts.fromAnchor || 'bottom', container))

  // Find the center source (closest X to target)
  const centerIdx = sourcePts.reduce((best, pt, i) =>
    Math.abs(pt.x - targetPt.x) < Math.abs(sourcePts[best].x - targetPt.x) ? i : best, 0)

  // Compute the turn Y and radius to match what tributaryPath uses
  const maxSourceY = Math.max(...sourcePts.map(p => p.y))
  const joinPt = { x: targetPt.x, y: 0 } // y set below
  const centerPt = sourcePts[centerIdx]

  // Use the same turn/radius calc as tributaryPath for consistency
  // Pick the first non-center source to derive turnY (they all share the same targetPt-based formula)
  const refIdx = sourcePts.findIndex((_, i) => i !== centerIdx)
  const refSrc = refIdx >= 0 ? sourcePts[refIdx] : centerPt
  const refDy = targetPt.y - refSrc.y // used only for radius clamping
  const refDx = Math.abs(targetPt.x - refSrc.x)
  const radius = 20
  const r = Math.min(radius, refDx || radius, refDy / 2)
  const turnY = refSrc.y + (targetPt.y - refSrc.y) * 0.5
  // The branches end at turnY + r; lower trunk starts there
  const lowerTrunkStartY = turnY + r
  joinPt.y = lowerTrunkStartY

  // --- Visible upper trunk: center source → branch merge point ---
  const upperTrunkD = `M ${centerPt.x} ${centerPt.y} L ${joinPt.x} ${joinPt.y}`
  const upperTrunkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  upperTrunkPath.setAttribute('d', upperTrunkD)
  upperTrunkPath.setAttribute('stroke', color)
  upperTrunkPath.setAttribute('stroke-width', String(strokeWidth))
  upperTrunkPath.setAttribute('fill', 'none')
  svg.appendChild(upperTrunkPath)
  _mergedRegistry.push({ type: 'upperTrunk', index: centerIdx, path: upperTrunkPath, sourceEls, targetEl, opts, container })

  // --- Visible lower trunk: branch merge point → target ---
  const lowerTrunkD = `M ${joinPt.x} ${lowerTrunkStartY} L ${targetPt.x} ${targetPt.y}`
  const lowerTrunkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  lowerTrunkPath.setAttribute('d', lowerTrunkD)
  lowerTrunkPath.setAttribute('stroke', color)
  lowerTrunkPath.setAttribute('stroke-width', String(strokeWidth))
  lowerTrunkPath.setAttribute('fill', 'none')
  if (!opts.noArrow) {
    const markerId = ensureMarker(svg, color)
    lowerTrunkPath.setAttribute('marker-end', `url(#${markerId})`)
  }
  svg.appendChild(lowerTrunkPath)
  _mergedRegistry.push({ type: 'lowerTrunk', index: centerIdx, path: lowerTrunkPath, sourceEls, targetEl, opts, container })

  // --- Visible tributary branches (outer sources → join point on trunk) ---
  const branchPaths: (SVGPathElement | undefined)[] = sourceEls.map(() => undefined)
  for (let i = 0; i < sourceEls.length; i++) {
    if (i === centerIdx) continue
    const d = tributaryPath(sourcePts[i], joinPt, targetPt)
    const branchPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    branchPath.setAttribute('d', d)
    branchPath.setAttribute('stroke', color)
    branchPath.setAttribute('stroke-width', String(strokeWidth))
    branchPath.setAttribute('fill', 'none')
    svg.appendChild(branchPath)
    branchPaths[i] = branchPath
    _mergedRegistry.push({ type: 'branch', index: i, path: branchPath, sourceEls, targetEl, opts, container })
  }

  // --- Invisible full paths per source (for packet animation) ---
  const fullPaths: SVGPathElement[] = sourceEls.map((srcEl, i) => {
    const srcPt = sourcePts[i]
    let fullD: string
    if (i === centerIdx) {
      // Center: straight line
      fullD = `M ${srcPt.x} ${srcPt.y} L ${targetPt.x} ${targetPt.y}`
    } else {
      // Tributary curve to join point, then straight down to target
      fullD = tributaryPath(srcPt, joinPt, targetPt) + ` L ${targetPt.x} ${targetPt.y}`
    }

    const fullPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    fullPath.setAttribute('d', fullD)
    fullPath.setAttribute('stroke', 'none')
    fullPath.setAttribute('fill', 'none')

    const fCard = resolveCard(srcEl)
    const tCard = resolveCard(targetEl)
    fullPath.dataset.fromLabel = (fCard.querySelector('.text-sm.font-semibold') as HTMLElement)?.textContent?.trim() || '???'
    fullPath.dataset.toLabel = (tCard.querySelector('.text-sm.font-semibold') as HTMLElement)?.textContent?.trim() || '???'

    svg.appendChild(fullPath)
    _mergedRegistry.push({ type: 'full', index: i, path: fullPath, sourceEls, targetEl, opts, container })
    return fullPath
  })

  return { paths: fullPaths, branches: branchPaths, upperTrunk: upperTrunkPath, lowerTrunk: lowerTrunkPath, centerIndex: centerIdx }
}

interface MergedMeta {
  type: 'branch' | 'upperTrunk' | 'lowerTrunk' | 'full'
  index: number
  path: SVGPathElement
  sourceEls: HTMLElement[]
  targetEl: HTMLElement
  opts: ArrowOptions
  container: HTMLElement
}

const _mergedRegistry: MergedMeta[] = []

function redrawMergedArrows(container: HTMLElement): void {
  const groups = new Map<string, MergedMeta[]>()
  for (const meta of _mergedRegistry) {
    if (meta.container !== container) continue
    const key = meta.sourceEls.map(el => el.id || '').join(',') + '→' + (meta.targetEl.id || '')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(meta)
  }

  for (const metas of groups.values()) {
    const first = metas[0]
    const targetPt = getAnchorPoint(first.targetEl, first.opts.toAnchor || 'top', container)
    const sourcePts = first.sourceEls.map(el => getAnchorPoint(el, first.opts.fromAnchor || 'bottom', container))

    const centerIdx = sourcePts.reduce((best, pt, i) =>
      Math.abs(pt.x - targetPt.x) < Math.abs(sourcePts[best].x - targetPt.x) ? i : best, 0)

    const centerPt = sourcePts[centerIdx]

    // Recompute turn/radius to match tributaryPath
    const refIdx = sourcePts.findIndex((_, i) => i !== centerIdx)
    const refSrc = refIdx >= 0 ? sourcePts[refIdx] : centerPt
    const refDx = Math.abs(targetPt.x - refSrc.x)
    const refDy = targetPt.y - refSrc.y
    const radius = 20
    const r = Math.min(radius, refDx || radius, refDy / 2)
    const turnY = refSrc.y + (targetPt.y - refSrc.y) * 0.5
    const lowerTrunkStartY = turnY + r
    const joinPt = { x: targetPt.x, y: lowerTrunkStartY }

    for (const meta of metas) {
      if (meta.type === 'upperTrunk') {
        meta.path.setAttribute('d', `M ${centerPt.x} ${centerPt.y} L ${joinPt.x} ${joinPt.y}`)
      } else if (meta.type === 'lowerTrunk') {
        meta.path.setAttribute('d', `M ${joinPt.x} ${lowerTrunkStartY} L ${targetPt.x} ${targetPt.y}`)
      } else if (meta.type === 'branch') {
        meta.path.setAttribute('d', tributaryPath(sourcePts[meta.index], joinPt, targetPt))
      } else if (meta.type === 'full') {
        if (meta.index === centerIdx) {
          meta.path.setAttribute('d', `M ${centerPt.x} ${centerPt.y} L ${targetPt.x} ${targetPt.y}`)
        } else {
          meta.path.setAttribute('d', tributaryPath(sourcePts[meta.index], joinPt, targetPt) + ` L ${targetPt.x} ${targetPt.y}`)
        }
      }
    }
  }
}

export function redrawArrows(svg: SVGSVGElement, container: HTMLElement): void {
  redrawMergedArrows(container)

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
