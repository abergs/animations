import { packet } from './packet'
import { pulse } from './effects'

/**
 * Animate a packet traveling along a path with a colored trail
 * that reveals progressively behind it. Uses constant speed
 * based on path length.
 */

export interface TrailOptions {
  /** Trail/packet color (default: #175DDC) */
  color?: string
  /** Pixels per second (default: 400) */
  speed?: number
}

export interface TrailState {
  overlays: SVGPathElement[]
}

export function createTrailState(): TrailState {
  return { overlays: [] }
}

/**
 * Add a packet-with-trail animation to the timeline.
 * The packet moves at constant speed and leaves a colored trail behind it.
 * Optionally pulses the target node when the packet arrives.
 */
export function packetWithTrail(
  tl: gsap.core.Timeline,
  path: SVGPathElement,
  state: TrailState,
  opts: TrailOptions = {},
  targetNode?: HTMLElement,
): void {
  const color = opts.color || '#175DDC'
  const speed = opts.speed || 400
  const len = path.getTotalLength()
  const duration = len / speed
  const pos = tl.duration()

  // Clone path as colored overlay, initially hidden via strokeDashoffset
  const overlay = path.cloneNode() as SVGPathElement
  overlay.setAttribute('stroke', color)
  overlay.setAttribute('stroke-width', '1.5')
  overlay.setAttribute('fill', 'none')
  overlay.removeAttribute('stroke-dasharray')
  overlay.style.strokeDasharray = String(len)
  overlay.style.strokeDashoffset = String(len)
  path.parentElement!.appendChild(overlay)
  state.overlays.push(overlay)

  // Reveal trail in sync with packet
  tl.to(overlay, { strokeDashoffset: 0, duration, ease: 'none' }, pos)

  // Move packet on top
  packet(tl, path, { color, duration, noEntry: true, noExit: true }, pos)

  // Pulse target node when packet arrives
  if (targetNode) {
    pulse(tl, targetNode, { color })
  }
}

/**
 * Reset all trail overlays (hide them for the next loop iteration).
 */
export function resetTrails(tl: gsap.core.Timeline, state: TrailState): void {
  tl.call(() => {
    for (const o of state.overlays) {
      const len = o.getTotalLength()
      o.style.strokeDashoffset = String(len)
    }
  })
}
