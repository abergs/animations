import type { TrailState } from '../animations/trail'
import type { Snapshot } from '../animations/snapshot'

const STORAGE_KEY = 'playback-state'

interface PersistedState {
  paused?: boolean
  viewfinder?: {
    left: number
    top: number
    width: number
    height: number
  } | null
}

function loadState(): PersistedState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

function saveState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export interface PlaybackOptions {
  /** Initial state (default: true) */
  autoplay?: boolean
  /** Trail state to reset when clicking reset */
  trailState?: TrailState
  /** Snapshot for full state restore on reset */
  snapshot?: Snapshot
  /** Additional reset callback */
  onReset?: () => void
  /** Show viewfinder button (default: true) */
  viewfinder?: boolean
}

/**
 * Create play/pause + reset controls for a GSAP timeline.
 * Returns the container element to insert into the DOM.
 */
export function createPlaybackControls(
  tl: gsap.core.Timeline,
  opts: PlaybackOptions = {},
): HTMLElement {
  const saved = loadState()
  const autoplay = saved.paused ? false : (opts.autoplay !== false)
  let playing = autoplay

  const controls = document.createElement('div')
  controls.className = 'playback-controls'

  const btnGroup = document.createElement('div')
  btnGroup.className = 'playback-btn-group'

  const toggleBtn = document.createElement('button')
  toggleBtn.className = `playback-btn playback-btn-left${playing ? ' active' : ''}`
  toggleBtn.textContent = playing ? '⏸ Pause' : '▶ Play'

  const resetBtn = document.createElement('button')
  resetBtn.className = 'playback-btn playback-btn-right'
  resetBtn.textContent = '↺'
  resetBtn.title = 'Reset'

  btnGroup.appendChild(toggleBtn)
  btnGroup.appendChild(resetBtn)

  const viewfinderBtn = document.createElement('button')
  viewfinderBtn.className = 'playback-btn'
  viewfinderBtn.textContent = '⊡ Frame'

  controls.appendChild(btnGroup)
  if (opts.viewfinder !== false) {
    controls.appendChild(viewfinderBtn)
  }

  // Apply saved pause state
  if (saved.paused) {
    tl.pause()
  }

  toggleBtn.addEventListener('click', () => {
    if (playing) {
      tl.pause()
      toggleBtn.textContent = '▶ Play'
      toggleBtn.classList.remove('active')
    } else {
      tl.play()
      toggleBtn.textContent = '⏸ Pause'
      toggleBtn.classList.add('active')
    }
    playing = !playing
    saveState({ ...loadState(), paused: !playing })
  })

  resetBtn.addEventListener('click', () => {
    tl.pause()
    tl.progress(0)

    // Use snapshot if available, otherwise fall back to manual trail reset
    if (opts.snapshot) {
      opts.snapshot.restoreNow()
    } else if (opts.trailState) {
      for (const o of opts.trailState.overlays) {
        const len = o.getTotalLength()
        o.style.strokeDashoffset = String(len)
      }
    }

    opts.onReset?.()

    playing = false
    toggleBtn.textContent = '▶ Play'
    toggleBtn.classList.remove('active')
    saveState({ ...loadState(), paused: true })
  })

  // --- Viewfinder ---
  let viewfinderEl: HTMLElement | null = null

  function saveViewfinder() {
    if (!viewfinderEl) {
      saveState({ ...loadState(), viewfinder: null })
      return
    }
    saveState({
      ...loadState(),
      viewfinder: {
        left: viewfinderEl.offsetLeft,
        top: viewfinderEl.offsetTop,
        width: viewfinderEl.offsetWidth,
        height: viewfinderEl.offsetHeight,
      },
    })
  }

  let viewfinderAbort: AbortController | null = null

  function showViewfinder(rect?: { left: number; top: number; width: number; height: number }) {
    viewfinderEl = document.createElement('div')
    viewfinderEl.className = 'viewfinder-overlay'
    viewfinderEl.style.left = (rect?.left ?? (window.innerWidth / 2 - 450)) + 'px'
    viewfinderEl.style.top = (rect?.top ?? (window.innerHeight / 2 - 300)) + 'px'
    if (rect) {
      viewfinderEl.style.width = rect.width + 'px'
      viewfinderEl.style.height = rect.height + 'px'
    }

    // AbortController for all document-level listeners (cleaned up on hide)
    viewfinderAbort = new AbortController()
    const { signal } = viewfinderAbort

    // Drag to reposition
    let dragging = false
    let offsetX = 0
    let offsetY = 0
    let dragStartLeft = 0
    let dragStartTop = 0

    viewfinderEl.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('viewfinder-handle')) return
      if ((e.target as HTMLElement).classList.contains('viewfinder-toolbar-btn')) return
      dragging = true
      offsetX = e.clientX - viewfinderEl!.offsetLeft
      offsetY = e.clientY - viewfinderEl!.offsetTop
      dragStartLeft = viewfinderEl!.offsetLeft
      dragStartTop = viewfinderEl!.offsetTop
      e.preventDefault()
    })

    // Resize state
    let resizing = false
    let startW = 0
    let startH = 0
    let startX = 0
    let startY = 0

    // Single mousemove handler for both drag and resize
    document.addEventListener('mousemove', (e) => {
      if (dragging && viewfinderEl) {
        const newLeft = e.clientX - offsetX
        const newTop = e.clientY - offsetY
        if (e.shiftKey) {
          if (Math.abs(newLeft - dragStartLeft) > Math.abs(newTop - dragStartTop)) {
            viewfinderEl.style.left = newLeft + 'px'
          } else {
            viewfinderEl.style.top = newTop + 'px'
          }
        } else {
          viewfinderEl.style.left = newLeft + 'px'
          viewfinderEl.style.top = newTop + 'px'
        }
      }
      if (resizing && viewfinderEl) {
        const dw = e.clientX - startX
        const dh = e.clientY - startY
        if (e.shiftKey) {
          if (Math.abs(dw) > Math.abs(dh)) {
            viewfinderEl.style.width = Math.max(100, startW + dw) + 'px'
          } else {
            viewfinderEl.style.height = Math.max(100, startH + dh) + 'px'
          }
        } else {
          viewfinderEl.style.width = Math.max(100, startW + dw) + 'px'
          viewfinderEl.style.height = Math.max(100, startH + dh) + 'px'
        }
      }
    }, { signal })

    // Single mouseup handler
    document.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; saveViewfinder() }
      if (resizing) { resizing = false; saveViewfinder() }
    }, { signal })

    // Resize handle
    const handle = document.createElement('div')
    handle.className = 'viewfinder-handle'
    viewfinderEl.appendChild(handle)

    handle.addEventListener('mousedown', (e) => {
      resizing = true
      startW = viewfinderEl!.offsetWidth
      startH = viewfinderEl!.offsetHeight
      startX = e.clientX
      startY = e.clientY
      e.preventDefault()
      e.stopPropagation()
    })

    // Bottom toolbar
    const toolbar = document.createElement('div')
    toolbar.className = 'viewfinder-toolbar'

    const sizeLabel = document.createElement('span')
    sizeLabel.className = 'viewfinder-size'
    toolbar.appendChild(sizeLabel)

    const centerBtn = document.createElement('button')
    centerBtn.className = 'viewfinder-toolbar-btn'
    centerBtn.textContent = '⊕ Center'
    centerBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!viewfinderEl) return
      viewfinderEl.style.left = (window.innerWidth / 2 - viewfinderEl.offsetWidth / 2) + 'px'
      saveViewfinder()
    })
    toolbar.appendChild(centerBtn)

    viewfinderEl.appendChild(toolbar)

    // Size label with proper RAF cleanup
    let rafId = 0
    const updateSize = () => {
      if (!viewfinderEl) return
      sizeLabel.textContent = `${viewfinderEl.offsetWidth} × ${viewfinderEl.offsetHeight}`
      rafId = requestAnimationFrame(updateSize)
    }
    sizeLabel.textContent = `${parseInt(viewfinderEl.style.width)} × ${parseInt(viewfinderEl.style.height)}`
    rafId = requestAnimationFrame(updateSize)

    // Store RAF cancel for cleanup
    ;(viewfinderEl as any)._rafId = rafId

    document.body.appendChild(viewfinderEl)
    viewfinderBtn.classList.add('active')
  }

  viewfinderBtn.addEventListener('click', () => {
    if (viewfinderEl) {
      cancelAnimationFrame((viewfinderEl as any)._rafId)
      viewfinderAbort?.abort()
      viewfinderAbort = null
      viewfinderEl.remove()
      viewfinderEl = null
      viewfinderBtn.classList.remove('active')
      saveViewfinder()
      return
    }
    showViewfinder()
    saveViewfinder()
  })

  // Restore viewfinder from saved state
  if (saved.viewfinder) {
    showViewfinder(saved.viewfinder)
  }

  return controls
}
