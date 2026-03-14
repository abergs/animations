import type { PacketOptions } from './packet'
import type { HighlightOptions, PulseOptions } from './effects'
import type { StatusPillOptions, StatusOptions, SlideOutOptions } from './status'

/** Resolve a human-readable label from a node element */
function label(el: HTMLElement): string {
  const card = el.querySelector('.flow-node') || el
  const text = card.querySelector('.text-sm.font-semibold') as HTMLElement | null
  return text?.textContent?.trim() || '???'
}

/** Resolve from/to labels from an arrow path via the arrow registry */
function arrowLabels(path: SVGPathElement): { from: string; to: string } {
  // drawArrow stores from/to in the arrowRegistry; we can't access it directly,
  // but we stashed data attributes as a fallback. Use the path's closest context.
  return {
    from: path.dataset.fromLabel || '???',
    to: path.dataset.toLabel || '???',
  }
}

type AnyFn = (...args: any[]) => any

interface AnimationModules {
  packet: AnyFn
  highlight: AnyFn
  pulse: AnyFn
  statusPill: AnyFn
  updateStatus: AnyFn
  slideOut: AnyFn
}

/**
 * Wraps animation functions with automatic console.log tracing.
 * Usage: const { packet, highlight, ... } = withTracing({ packet, highlight, ... })
 */
export function withTracing(fns: AnimationModules) {
  return {
    packet(tl: gsap.core.Timeline, arrowPath: SVGPathElement, opts: PacketOptions = {}, position?: string | number) {
      const { from, to } = arrowLabels(arrowPath)
      const reverse = opts.reverse || false
      const dir = reverse ? `${to} → ${from}` : `${from} → ${to}`
      console.log(`[packet] ${dir}  color=${opts.color || '#175DDC'} duration=${opts.duration || 0.8}${reverse ? ' reverse' : ''}`)
      return fns.packet(tl, arrowPath, opts, position)
    },

    highlight(tl: gsap.core.Timeline, nodeEl: HTMLElement, opts: HighlightOptions = {}, position?: string | number) {
      console.log(`[highlight] ${label(nodeEl)}  color=${opts.color || '#175DDC'}`)
      return fns.highlight(tl, nodeEl, opts, position)
    },

    pulse(tl: gsap.core.Timeline, nodeEl: HTMLElement, opts: PulseOptions = {}, position?: string | number) {
      console.log(`[pulse] ${label(nodeEl)}  color=${opts.color || '#175DDC'}`)
      return fns.pulse(tl, nodeEl, opts, position)
    },

    statusPill(tl: gsap.core.Timeline, nodeEl: HTMLElement, text: string, opts: StatusPillOptions = {}, position?: string | number) {
      console.log(`[statusPill] ${label(nodeEl)} → "${text}"  color=${opts.color || '#175DDC'}`)
      return fns.statusPill(tl, nodeEl, text, opts, position)
    },

    updateStatus(tl: gsap.core.Timeline, nodeEl: HTMLElement, text: string, opts: StatusOptions = {}, position?: string | number) {
      console.log(`[updateStatus] ${label(nodeEl)} → "${text}"  color=${opts.color || '#94a3b8'}`)
      return fns.updateStatus(tl, nodeEl, text, opts, position)
    },

    slideOut(tl: gsap.core.Timeline, nodeEl: HTMLElement, text: string, opts: SlideOutOptions = {}, position?: string | number) {
      console.log(`[slideOut] ${label(nodeEl)} → "${text}"  direction=${opts.direction || 'right'} color=${opts.color || '#64748b'}`)
      return fns.slideOut(tl, nodeEl, text, opts, position)
    },
  }
}
