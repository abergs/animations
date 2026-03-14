export interface NodeOptions {
  icon?: string
  iconBg?: string
  subtitle?: string
  status?: string
  statusColor?: string
  highlight?: string
  subtle?: boolean
  ghost?: boolean
  width?: string
}

export function createNode(label: string, opts: NodeOptions = {}): HTMLElement {
  // Outer wrapper: column layout with card + status pill below
  const wrapper = document.createElement('div')
  wrapper.className = 'flow-node-wrapper flex flex-col items-center'

  const el = document.createElement('div')
  el.className = [
    'flow-node',
    'relative flex items-center gap-3 px-4 py-3 rounded-xl bg-white border-2',
    'shadow-sm border-slate-200',
  ].join(' ')

  if (opts.highlight) {
    el.style.borderColor = opts.highlight + '60'
    el.style.boxShadow = `0 0 0 1px ${opts.highlight}20`
  }

  if (opts.width) {
    el.style.width = opts.width
  } else {
    el.style.minWidth = '180px'
  }

  if (opts.ghost) {
    // Compact pill-shaped node with two rows inside
    wrapper.className = 'flow-node-wrapper flex flex-col items-center'
    wrapper.style.position = 'relative'
    wrapper.style.zIndex = '0'

    el.className = 'flow-node relative flex flex-col items-center px-4 py-2 rounded-2xl bg-white border'
    el.style.borderStyle = 'dashed'
    el.style.borderColor = '#cbd5e1'
    el.style.boxShadow = 'none'
    el.style.minWidth = 'auto'
    el.style.width = 'auto'
    el.style.gap = '2px'

    // Row 1: icon + label
    const row1 = document.createElement('div')
    row1.className = 'flex items-center gap-2'

    if (opts.icon) {
      const iconSpan = document.createElement('span')
      iconSpan.className = 'flex items-center justify-center shrink-0'
      iconSpan.innerHTML = opts.icon
      const svgEl = iconSpan.querySelector('svg')
      if (svgEl) { svgEl.setAttribute('width', '14'); svgEl.setAttribute('height', '14') }
      row1.appendChild(iconSpan)
    }

    const labelEl = document.createElement('span')
    labelEl.className = 'text-xs font-medium text-slate-500 whitespace-nowrap'
    labelEl.textContent = label
    row1.appendChild(labelEl)

    el.appendChild(row1)

    // Row 2: status text
    const annoPill = document.createElement('span')
    annoPill.className = 'status-pill-anno'
    if (opts.status) {
      annoPill.style.color = opts.statusColor || '#94a3b8'
      annoPill.textContent = opts.status
    } else {
      annoPill.style.color = '#94a3b8'
      annoPill.textContent = '\u00A0'
    }
    el.appendChild(annoPill)

    // Hidden pill for snapshot compatibility
    const hiddenPill = document.createElement('span')
    hiddenPill.className = 'status-pill'
    hiddenPill.style.display = 'none'
    if (opts.status) {
      hiddenPill.style.color = opts.statusColor || '#94a3b8'
      hiddenPill.textContent = opts.status
    }
    el.appendChild(hiddenPill)

    wrapper.appendChild(el)
    return wrapper
  } else if (opts.subtle) {
    el.style.opacity = '0.75'
  }

  // Icon
  if (opts.icon) {
    const iconWrap = document.createElement('div')
    iconWrap.className = 'flex items-center justify-center w-9 h-9 rounded-lg shrink-0'
    iconWrap.style.backgroundColor = opts.iconBg || '#f1f5f9'
    iconWrap.innerHTML = opts.icon
    el.appendChild(iconWrap)
  }

  // Text content
  const textCol = document.createElement('div')
  textCol.className = 'flex flex-col min-w-0 flex-1'

  const labelEl = document.createElement('div')
  labelEl.className = 'text-sm font-semibold text-slate-800 leading-tight'
  labelEl.textContent = label
  textCol.appendChild(labelEl)

  if (opts.subtitle) {
    const sub = document.createElement('div')
    sub.className = 'text-xs text-slate-400 mt-0.5 leading-tight'
    sub.textContent = opts.subtitle
    textCol.appendChild(sub)
  }

  // Status pill inside the card, below subtitle
  const pill = document.createElement('span')
  pill.className = 'status-pill'
  if (opts.status) {
    pill.style.backgroundColor = (opts.statusColor || '#94a3b8') + '18'
    pill.style.color = opts.statusColor || '#94a3b8'
    pill.textContent = opts.status
  } else {
    // Empty but present so animations can target it
    pill.style.backgroundColor = 'transparent'
    pill.style.color = 'transparent'
    pill.textContent = '\u00A0' // nbsp to hold height
  }
  textCol.appendChild(pill)

  el.appendChild(textCol)
  wrapper.appendChild(el)

  return wrapper
}
