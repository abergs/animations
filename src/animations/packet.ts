import gsap from 'gsap'

export interface PacketOptions {
  color?: string
  radius?: number
  duration?: number
  ease?: string
  glow?: boolean
  reverse?: boolean
  /** Skip the scale-up entry ramp (packet starts at full size) */
  noEntry?: boolean
  /** Skip the scale-down exit ramp (packet stays full size at end) */
  noExit?: boolean
}

export function packet(
  tl: gsap.core.Timeline,
  arrowPath: SVGPathElement,
  opts: PacketOptions = {},
  position?: string | number
): void {
  const svg = arrowPath.closest('svg')!
  const color = opts.color || '#175DDC'
  const radius = opts.radius || 6
  const duration = opts.duration || 0.8
  const ease = opts.ease || 'power1.inOut'
  const noEntry = opts.noEntry || false
  const noExit = opts.noExit || false

  // Create the dot
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('r', String(radius))
  circle.setAttribute('fill', color)
  circle.setAttribute('opacity', '0')

  if (opts.glow !== false) {
    const filterId = `glow-${Math.random().toString(36).slice(2, 8)}`
    const defs = svg.querySelector('defs') || svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'defs'))
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    filter.setAttribute('id', filterId)
    filter.setAttribute('x', '-200%')
    filter.setAttribute('y', '-200%')
    filter.setAttribute('width', '500%')
    filter.setAttribute('height', '500%')
    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur')
    blur.setAttribute('in', 'SourceGraphic')
    blur.setAttribute('stdDeviation', '3')
    blur.setAttribute('result', 'blur')
    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge')
    const m1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    m1.setAttribute('in', 'blur')
    const m2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode')
    m2.setAttribute('in', 'SourceGraphic')
    merge.appendChild(m1)
    merge.appendChild(m2)
    filter.appendChild(blur)
    filter.appendChild(merge)
    defs.appendChild(filter)
    circle.setAttribute('filter', `url(#${filterId})`)
  }

  svg.appendChild(circle)

  const pathLength = arrowPath.getTotalLength()
  const reverse = opts.reverse || false
  const proxy = { t: reverse ? 1 : 0 }
  const rampTime = duration * 0.15 // time for scale ramp in/out
  const entryTime = noEntry ? 0 : rampTime
  const exitTime = noExit ? 0 : rampTime

  const subTl = gsap.timeline()

  // Start: position at origin
  subTl.set(proxy, { t: reverse ? 1 : 0 })
  subTl.set(circle, { attr: { opacity: 1, r: noEntry ? radius : 0 } })
  subTl.call(() => {
    const point = arrowPath.getPointAtLength(proxy.t * pathLength)
    circle.setAttribute('cx', String(point.x))
    circle.setAttribute('cy', String(point.y))
  })

  // Scale up (emerge from node) — skip if noEntry
  if (!noEntry) {
    subTl.to(circle, { attr: { r: radius }, duration: entryTime, ease: 'power2.out' })
  }

  // Travel along path
  subTl.to(proxy, {
    t: reverse ? 0 : 1,
    duration: duration - entryTime - exitTime,
    ease: 'none',
    onUpdate() {
      const point = arrowPath.getPointAtLength(proxy.t * pathLength)
      circle.setAttribute('cx', String(point.x))
      circle.setAttribute('cy', String(point.y))
    },
  })

  // Scale down (absorb into node) — skip if noExit
  if (!noExit) {
    subTl.to(circle, { attr: { r: 0 }, duration: exitTime, ease: 'power2.in' })
  }
  subTl.set(circle, { attr: { opacity: 0 } })

  tl.add(subTl, position)
}
