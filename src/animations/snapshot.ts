import type { TrailState } from './trail'
import { _resetLinesNow } from './effects'

interface PillSnapshot {
  el: HTMLElement
  text: string
  color: string
  backgroundColor: string
  display: string
}

interface NodeSnapshot {
  card: HTMLElement
  borderColor: string
  boxShadow: string
  transform: string
}

/**
 * Captures the initial state of a diagram so it can be fully
 * restored with a single `reset()` call. Tracks:
 * - Status pills (text, color, visibility)
 * - Node card styles (border, shadow, transform)
 * - Step list item classes
 * - SVG artifacts (circles, filters)
 * - Trail overlays
 */
export class Snapshot {
  private pills: PillSnapshot[] = []
  private nodes: NodeSnapshot[] = []
  private steps: Element[] = []
  private svgs: SVGSVGElement[] = []
  private trailStates: TrailState[] = []
  private customResets: (() => void)[] = []

  /** Capture all status pills in a container */
  capturePills(container: HTMLElement): this {
    const pills = container.querySelectorAll('.status-pill')
    for (const el of pills) {
      const pill = el as HTMLElement
      this.pills.push({
        el: pill,
        text: pill.textContent || '',
        color: pill.style.color || '',
        backgroundColor: pill.style.backgroundColor || '',
        display: pill.style.display || '',
      })
    }
    return this
  }

  /** Capture all node card styles in a container */
  captureNodes(container: HTMLElement): this {
    const cards = container.querySelectorAll('.flow-node')
    for (const el of cards) {
      const card = el as HTMLElement
      this.nodes.push({
        card,
        borderColor: card.style.borderColor,
        boxShadow: card.style.boxShadow,
        transform: card.style.transform,
      })
    }
    return this
  }

  /** Track step list items for class reset */
  captureSteps(container: HTMLElement): this {
    const items = container.querySelectorAll('.phase-step')
    for (const el of items) {
      this.steps.push(el)
    }
    return this
  }

  /** Capture everything in a container at once */
  captureAll(container: HTMLElement): this {
    return this.capturePills(container).captureNodes(container).captureSteps(container)
  }

  /** Track an SVG for artifact cleanup (circles, glow filters) */
  trackSvg(svg: SVGSVGElement): this {
    this.svgs.push(svg)
    return this
  }

  /** Track trail state for overlay reset */
  trackTrails(state: TrailState): this {
    this.trailStates.push(state)
    return this
  }

  /** Register a custom cleanup callback */
  onReset(fn: () => void): this {
    this.customResets.push(fn)
    return this
  }

  /** Add a full reset to the timeline (call at the end before loop) */
  reset(tl: gsap.core.Timeline): void {
    tl.call(() => this.restoreNow())
  }

  /** Immediately restore everything to initial state */
  restoreNow(): void {
    // Restore pills
    for (const snap of this.pills) {
      snap.el.textContent = snap.text
      snap.el.style.color = snap.color
      snap.el.style.backgroundColor = snap.backgroundColor
      snap.el.style.display = snap.display
    }

    // Restore node cards
    for (const snap of this.nodes) {
      snap.card.style.borderColor = snap.borderColor
      snap.card.style.boxShadow = snap.boxShadow
      snap.card.style.transform = snap.transform
    }

    // Clear step classes
    for (const el of this.steps) {
      el.classList.remove('active', 'done')
    }

    // Clean SVG artifacts (packet dots + glow filters)
    for (const svg of this.svgs) {
      svg.querySelectorAll('circle').forEach(c => c.remove())
      svg.querySelectorAll('filter[id^="glow-"]').forEach(f => f.remove())
    }

    // Reset trails
    for (const state of this.trailStates) {
      for (const o of state.overlays) {
        o.style.strokeDashoffset = o.style.strokeDasharray
      }
    }

    // Delegate line color reset to effects module (handles attributes, markers, flipped arrows)
    _resetLinesNow()

    // Custom resets
    for (const fn of this.customResets) {
      fn()
    }
  }
}

/** Create a new snapshot instance */
export function createSnapshot(): Snapshot {
  return new Snapshot()
}
