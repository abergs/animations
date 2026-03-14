import gsap from 'gsap'

export interface PacketOptions {
  color?: string
  radius?: number
  duration?: number
  ease?: string
  glow?: boolean
  reverse?: boolean
}

export function packet(
  tl: gsap.core.Timeline,
  arrowPath: SVGPathElement,
  opts: PacketOptions = {},
  position?: string | number
): void {
  const svg = arrowPath.closest('svg')!
  const color = opts.color || '#175DDC'
  const radius = opts.radius || 5
  const duration = opts.duration || 0.8
  const ease = opts.ease || 'power1.inOut'

  // Create the dot
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('r', String(radius))
  circle.setAttribute('fill', color)
  circle.setAttribute('opacity', '0')

  if (opts.glow !== false) {
    circle.setAttribute('filter', `drop-shadow(0 0 4px ${color})`)
  }

  svg.appendChild(circle)

  const pathLength = arrowPath.getTotalLength()
  const reverse = opts.reverse || false
  const proxy = { t: reverse ? 1 : 0 }
  const rampTime = duration * 0.15 // time for scale ramp in/out

  const subTl = gsap.timeline()

  // Start: position at origin, scaled down, then emerge
  subTl.set(proxy, { t: reverse ? 1 : 0 })
  subTl.set(circle, { attr: { opacity: 1, r: 0 } })
  subTl.call(() => {
    const point = arrowPath.getPointAtLength(proxy.t * pathLength)
    circle.setAttribute('cx', String(point.x))
    circle.setAttribute('cy', String(point.y))
  })

  // Scale up (emerge from node)
  subTl.to(circle, { attr: { r: radius }, duration: rampTime, ease: 'power2.out' })

  // Travel along path
  subTl.to(proxy, {
    t: reverse ? 0 : 1,
    duration: duration - rampTime * 2,
    ease: 'none',
    onUpdate() {
      const point = arrowPath.getPointAtLength(proxy.t * pathLength)
      circle.setAttribute('cx', String(point.x))
      circle.setAttribute('cy', String(point.y))
    },
  })

  // Scale down (absorb into node)
  subTl.to(circle, { attr: { r: 0 }, duration: rampTime, ease: 'power2.in' })
  subTl.set(circle, { attr: { opacity: 0 } })

  tl.add(subTl, position)
}
