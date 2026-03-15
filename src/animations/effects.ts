import gsap from 'gsap'

export interface HighlightOptions {
  color?: string
  duration?: number
  scale?: number
}

/** Resolve the .flow-node card inside a wrapper */
function resolveCard(el: HTMLElement): HTMLElement {
  return (el.querySelector('.flow-node') as HTMLElement) || el
}

export function highlight(
  tl: gsap.core.Timeline,
  nodeEl: HTMLElement,
  opts: HighlightOptions = {},
  position?: string | number
): void {
  const card = resolveCard(nodeEl)
  const color = opts.color || '#175DDC'
  const duration = opts.duration || 0.7
  const scale = opts.scale || 1.04

  let origBorder = ''
  let origShadow = ''
  let origTransform = ''

  const subTl = gsap.timeline()

  subTl.call(() => {
    origBorder = card.style.borderColor
    origShadow = card.style.boxShadow
    origTransform = card.style.transform
  })
  // Pop up with slight lift and glow
  subTl.to(card, {
    boxShadow: `0 0 20px ${color}50, 0 0 0 2px ${color}`,
    borderColor: color,
    scale,
    y: -2,
    duration: duration * 0.3,
    ease: 'back.out(2)',
  })
  // Settle back with elastic ease
  subTl.to(card, {
    scale: 1,
    y: 0,
    duration: duration * 0.7,
    ease: 'elastic.out(1, 0.4)',
    onComplete() {
      card.style.borderColor = origBorder
      card.style.boxShadow = origShadow
      card.style.transform = origTransform
    },
  })

  tl.add(subTl, position)
}

export interface PulseOptions {
  color?: string
  duration?: number
  scale?: number
}

export function pulse(
  tl: gsap.core.Timeline,
  nodeEl: HTMLElement,
  opts: PulseOptions = {},
  position?: string | number
): void {
  const card = resolveCard(nodeEl)
  const color = opts.color || '#175DDC'
  const duration = opts.duration || 0.6
  const scale = opts.scale || 1.04

  let origShadow = ''

  const subTl = gsap.timeline()

  subTl.call(() => {
    origShadow = card.style.boxShadow

    // Create expanding ripple ring
    const ripple = document.createElement('div')
    ripple.style.cssText = `
      position: absolute; inset: 0;
      border-radius: inherit;
      border: 2px solid ${color};
      pointer-events: none;
      opacity: 0.6;
    `
    card.style.position = 'relative'
    card.style.overflow = 'visible'
    card.appendChild(ripple)

    gsap.to(ripple, {
      scale: 1.15,
      opacity: 0,
      duration: duration * 0.8,
      ease: 'power2.out',
      onComplete() { ripple.remove() },
    })
  })
  // Bump up
  subTl.to(card, {
    scale,
    y: -2,
    boxShadow: `0 4px 16px ${color}40`,
    duration: duration * 0.3,
    ease: 'back.out(3)',
  })
  // Settle back
  subTl.to(card, {
    scale: 1,
    y: 0,
    duration: duration * 0.7,
    ease: 'elastic.out(1, 0.5)',
    onComplete() {
      card.style.boxShadow = origShadow
    },
  })

  tl.add(subTl, position)
}

export interface FadeOptions {
  duration?: number
  y?: number
}

export function fadeIn(
  tl: gsap.core.Timeline,
  nodeEl: HTMLElement,
  opts: FadeOptions = {},
  position?: string | number
): void {
  const duration = opts.duration || 0.4
  const y = opts.y || 10

  tl.fromTo(nodeEl, { opacity: 0, y }, { opacity: 1, y: 0, duration, ease: 'power2.out' }, position)
}

/** Registry of original state for resetLines */
const _lineOrigState = new Map<SVGPathElement, { stroke: string }>()
const _markerOrigFill = new Map<SVGPolygonElement, string>()
const _flippedArrows = new Map<SVGPathElement, { arrow: SVGPolygonElement; origMarkerEnd: string; origMarkerStart: string }>()

/** Find the marker polygon referenced by a path's marker-end or marker-start */
function findMarkerPolygon(p: SVGPathElement): SVGPolygonElement | null {
  const markerUrl = p.getAttribute('marker-end') || p.getAttribute('marker-start')
  if (!markerUrl) return null
  const match = markerUrl.match(/url\(#(.+)\)/)
  if (!match) return null
  const svg = p.closest('svg')!
  const marker = svg.querySelector(`#${match[1]}`)
  return marker?.querySelector('polygon') ?? null
}

/** Change the stroke color of one or more SVG paths on the timeline, including arrowhead markers */
export function colorLine(
  tl: gsap.core.Timeline,
  paths: SVGPathElement | SVGPathElement[],
  color: string,
  position?: string | number
): void {
  const arr = Array.isArray(paths) ? paths : [paths]
  tl.call(() => {
    for (const p of arr) {
      if (!_lineOrigState.has(p)) {
        _lineOrigState.set(p, { stroke: p.getAttribute('stroke') || '#cbd5e1' })
      }
      p.setAttribute('stroke', color)
      p.style.stroke = color
      const polygon = findMarkerPolygon(p)
      if (polygon) {
        if (!_markerOrigFill.has(polygon)) {
          _markerOrigFill.set(polygon, polygon.getAttribute('fill') || '#cbd5e1')
        }
        polygon.setAttribute('fill', color)
      }
    }
  }, [], position)
}

/**
 * Animate the arrowhead sliding from the end of the path to the start,
 * flipping direction. Hides the static marker during the move.
 */
export function flipArrow(
  tl: gsap.core.Timeline,
  paths: SVGPathElement | SVGPathElement[],
  opts: { color?: string; duration?: number } = {},
  position?: string | number
): void {
  const arr = Array.isArray(paths) ? paths : [paths]
  const duration = opts.duration || 0.5

  for (const p of arr) {
    const subTl = gsap.timeline()

    subTl.call(() => {
      const svg = p.closest('svg')!
      const pathLength = p.getTotalLength()
      const color = opts.color || p.style.stroke || p.getAttribute('stroke') || '#cbd5e1'

      // Hide the static marker
      const markerEnd = p.getAttribute('marker-end') || ''
      const markerStart = p.getAttribute('marker-start') || ''
      p.removeAttribute('marker-end')
      p.removeAttribute('marker-start')

      // Create a triangle arrowhead element
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      arrow.setAttribute('points', '-5,-4 5,0 -5,4')
      arrow.setAttribute('fill', color)
      svg.appendChild(arrow)

      // Determine start/end: if it had marker-end, move from end→start
      const fromEnd = !!markerEnd
      const proxy = { t: fromEnd ? 1 : 0 }
      const targetT = fromEnd ? 0 : 1

      // Position and rotate the arrow along the path
      function updateArrow() {
        const t = proxy.t
        const pt = p.getPointAtLength(t * pathLength)
        // Get a nearby point for angle calculation
        const delta = 0.01
        const pt2 = p.getPointAtLength(Math.min(1, t + delta) * pathLength)
        const pt1 = p.getPointAtLength(Math.max(0, t - delta) * pathLength)
        const angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x) * (180 / Math.PI)
        // Flip 180° if moving toward start
        const flip = fromEnd ? 180 : 0
        arrow.setAttribute('transform', `translate(${pt.x},${pt.y}) rotate(${angle + flip})`)
      }

      updateArrow()

      // Animate the triangle sliding along the path
      const moveTl = gsap.timeline()
      moveTl.to(proxy, {
        t: targetT,
        duration,
        ease: 'power2.inOut',
        onUpdate: updateArrow,
      })
      moveTl.call(() => {
        // Keep the arrow element at the final position; register for cleanup
        _flippedArrows.set(p, {
          arrow,
          origMarkerEnd: markerEnd,
          origMarkerStart: markerStart,
        })
      })
      moveTl.play()
    })

    tl.add(subTl, position)
  }
}

/** Reset all colored lines and flipped arrows back to their original state */
export function resetLines(
  tl: gsap.core.Timeline,
  position?: string | number
): void {
  tl.call(() => {
    for (const [p, orig] of _lineOrigState) {
      p.setAttribute('stroke', orig.stroke)
      p.style.stroke = ''
    }
    _lineOrigState.clear()
    for (const [polygon, origFill] of _markerOrigFill) {
      polygon.setAttribute('fill', origFill)
    }
    _markerOrigFill.clear()
    for (const [p, state] of _flippedArrows) {
      state.arrow.remove()
      if (state.origMarkerEnd) p.setAttribute('marker-end', state.origMarkerEnd)
      if (state.origMarkerStart) p.setAttribute('marker-start', state.origMarkerStart)
    }
    _flippedArrows.clear()
  }, [], position)
}

export function fadeOut(
  tl: gsap.core.Timeline,
  nodeEl: HTMLElement,
  opts: FadeOptions = {},
  position?: string | number
): void {
  const duration = opts.duration || 0.4
  const y = opts.y || -10

  tl.to(nodeEl, { opacity: 0, y, duration, ease: 'power2.in' }, position)
}
