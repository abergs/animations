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
    'relative flex items-start gap-3 px-4 py-4 rounded-xl bg-white border-2',
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

    // Row 2: status text (serves as both anno and the animation target)
    const annoPill = document.createElement('span')
    annoPill.className = 'status-pill-anno status-pill'
    if (opts.status) {
      annoPill.style.color = opts.statusColor || '#94a3b8'
      annoPill.textContent = opts.status
    } else {
      annoPill.style.display = 'none'
    }
    el.appendChild(annoPill)

    wrapper.appendChild(el)
    return wrapper
  } else if (opts.subtle) {
    el.style.opacity = '0.75'
  }

  // Icon
  if (opts.icon) {
    const iconWrap = document.createElement('div')
    iconWrap.className = 'flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5'
    iconWrap.style.backgroundColor = opts.iconBg || '#f1f5f9'
    iconWrap.innerHTML = opts.icon
    el.appendChild(iconWrap)
  }

  // Text content
  const textCol = document.createElement('div')
  textCol.className = 'flex flex-col gap-1 min-w-0 flex-1'

  const labelEl = document.createElement('div')
  labelEl.className = 'text-sm font-semibold text-slate-800 leading-snug'
  labelEl.textContent = label
  textCol.appendChild(labelEl)

  if (opts.subtitle) {
    const sub = document.createElement('div')
    sub.className = 'text-xs text-slate-400 leading-normal'
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
    // Hidden but present so animations can target it
    pill.style.display = 'none'
  }
  textCol.appendChild(pill)

  el.appendChild(textCol)
  wrapper.appendChild(el)

  return wrapper
}
