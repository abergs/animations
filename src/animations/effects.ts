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
  const duration = opts.duration || 0.6
  const scale = opts.scale || 1.03

  let origBorder = ''
  let origShadow = ''

  const subTl = gsap.timeline()

  subTl.call(() => {
    origBorder = card.style.borderColor
    origShadow = card.style.boxShadow
  })
  subTl.to(card, {
    boxShadow: `0 0 16px ${color}40, 0 0 0 2px ${color}`,
    borderColor: color,
    scale,
    duration: duration * 0.4,
    ease: 'power2.out',
  })
  subTl.to(card, {
    scale: 1,
    duration: duration * 0.6,
    ease: 'power2.inOut',
    onComplete() {
      card.style.borderColor = origBorder
      card.style.boxShadow = origShadow
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
  const duration = opts.duration || 0.4
  const scale = opts.scale || 1.05

  let origShadow = ''

  const subTl = gsap.timeline()

  subTl.call(() => {
    origShadow = card.style.boxShadow
  })
  subTl.to(card, {
    scale,
    boxShadow: `0 0 20px ${color}50`,
    duration: duration * 0.5,
    ease: 'power2.out',
  })
  subTl.to(card, {
    scale: 1,
    duration: duration * 0.5,
    ease: 'power2.inOut',
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
