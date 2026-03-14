import gsap from 'gsap'

/** Resolve the .flow-node card inside a wrapper */
function resolveCard(el: HTMLElement): HTMLElement {
  return (el.querySelector('.flow-node') as HTMLElement) || el
}

/** Stores initial status pill state per node for reset */
const initialPillState = new Map<HTMLElement, { text: string; color: string }>()

export interface StatusOptions {
  color?: string
}

export function updateStatus(
  tl: gsap.core.Timeline,
  nodeEl: HTMLElement,
  text: string,
  opts: StatusOptions = {},
  position?: string | number
): void {
  const color = opts.color || '#94a3b8'

  tl.call(() => {
    const pill = nodeEl.querySelector('.status-pill') as HTMLElement | null
    if (pill) {
      pill.textContent = text
      pill.style.color = color
      pill.style.backgroundColor = color + '18'
    }
  }, [], position)
}

export interface StatusPillOptions {
  color?: string
}

/** Updates a node's status pill text + color. Stays until changed again. */
export function statusPill(
  tl: gsap.core.Timeline,
  nodeEl: HTMLElement,
  text: string,
  opts: StatusPillOptions = {},
  tlPosition?: string | number
): void {
  const color = opts.color || '#175DDC'

  // Snapshot initial state on first call per node
  if (!initialPillState.has(nodeEl)) {
    const pill = nodeEl.querySelector('.status-pill') as HTMLElement | null
    if (pill) {
      initialPillState.set(nodeEl, {
        text: pill.textContent || '\u00A0',
        color: pill.style.color || '#94a3b8',
      })
    }
  }

  tl.call(() => {
    const pill = nodeEl.querySelector('.status-pill') as HTMLElement | null
    if (pill) {
      pill.textContent = text
      pill.style.color = color
      pill.style.backgroundColor = color + '18'
    }
    // Also update inline status if present (ghost nodes)
    const anno = nodeEl.querySelector('.status-pill-anno') as HTMLElement | null
    if (anno) {
      anno.textContent = text
      anno.style.color = color
    }
  }, [], tlPosition)
}

/** Resets all status pills to their initial state (before any statusPill() call). */
export function resetStatusPills(tl: gsap.core.Timeline, tlPosition?: string | number): void {
  tl.call(() => {
    for (const [nodeEl, state] of initialPillState) {
      const pill = nodeEl.querySelector('.status-pill') as HTMLElement | null
      if (pill) {
        pill.textContent = state.text
        pill.style.color = state.color
        pill.style.backgroundColor = state.color + '18'
      }
      const anno = nodeEl.querySelector('.status-pill-anno') as HTMLElement | null
      if (anno) {
        anno.textContent = state.text
        anno.style.color = state.color
      }
    }
  }, [], tlPosition)
}

export interface SlideOutOptions {
  icon?: string
  color?: string
  direction?: 'left' | 'right'
  duration?: number
}

export function slideOut(
  tl: gsap.core.Timeline,
  nodeEl: HTMLElement,
  text: string,
  opts: SlideOutOptions = {},
  tlPosition?: string | number
): void {
  const card = resolveCard(nodeEl)
  const color = opts.color || '#64748b'
  const direction = opts.direction || 'right'
  const duration = opts.duration || 3

  const slideWrapper = document.createElement('div')
  slideWrapper.className = 'flow-slideout-wrapper'

  const header = document.createElement('div')
  header.className = 'flow-slideout-header'
  header.textContent = 'Audit Log'
  header.style.color = color
  slideWrapper.appendChild(header)

  const slideCard = document.createElement('div')
  slideCard.className = 'flow-slideout'
  slideCard.style.backgroundColor = '#ffffff'
  slideCard.style.border = `1px solid ${color}30`
  slideCard.style.color = color

  if (opts.icon) {
    const iconSpan = document.createElement('span')
    iconSpan.innerHTML = opts.icon
    slideCard.appendChild(iconSpan)
  }

  const textContent = document.createElement('div')
  textContent.className = 'flow-slideout-text'

  const textLine = document.createElement('div')
  textLine.textContent = text
  textContent.appendChild(textLine)

  const timeLine = document.createElement('div')
  timeLine.className = 'flow-slideout-time'
  const now = new Date()
  timeLine.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  textContent.appendChild(timeLine)

  slideCard.appendChild(textContent)
  slideWrapper.appendChild(slideCard)

  const subTl = gsap.timeline({ paused: true })

  subTl.call(() => {
    const container = nodeEl.closest('[style*="position"]') || nodeEl.parentElement!
    const cardRect = card.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const top = cardRect.top - containerRect.top + cardRect.height / 2
    if (direction === 'right') {
      slideWrapper.style.left = (cardRect.right - containerRect.left + 12) + 'px'
    } else {
      slideWrapper.style.right = (containerRect.right - cardRect.left + 12) + 'px'
    }
    slideWrapper.style.top = top + 'px'
    slideWrapper.style.transform = 'translateY(-50%)'

    container.appendChild(slideWrapper)
  })

  const xStart = direction === 'right' ? -20 : 20
  subTl.fromTo(slideWrapper, { opacity: 0, x: xStart }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' })
  subTl.to(slideWrapper, { opacity: 0, x: -xStart, duration: 0.3, ease: 'power2.in' }, `>+${duration - 0.6}`)
  subTl.call(() => { slideWrapper.remove() })

  tl.call(() => { subTl.play() }, [], tlPosition)
}
