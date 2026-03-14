export interface GroupOptions {
  borderColor?: string
  labelColor?: string
  padding?: string
}

export function createGroup(label: string, nodes: HTMLElement[], opts: GroupOptions = {}): HTMLElement {
  const el = document.createElement('div')
  el.className = 'relative rounded-2xl border-2 border-dashed p-5 pt-8'
  el.style.borderColor = opts.borderColor || '#cbd5e1'

  // Group label
  const labelEl = document.createElement('div')
  labelEl.className = 'absolute -top-3 left-4 px-2 text-xs font-semibold uppercase tracking-wider bg-slate-50'
  labelEl.style.color = opts.labelColor || '#64748b'
  labelEl.textContent = label
  el.appendChild(labelEl)

  // Inner container
  const inner = document.createElement('div')
  inner.className = 'flex items-start gap-4 flex-wrap justify-center'
  for (const node of nodes) {
    inner.appendChild(node)
  }
  el.appendChild(inner)

  return el
}
