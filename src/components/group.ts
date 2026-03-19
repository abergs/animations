export interface GroupOptions {
  borderColor?: string
  labelColor?: string
  padding?: string
}

export function createGroup(label: string, nodes: HTMLElement[], opts: GroupOptions = {}): HTMLElement {
  const el = document.createElement('div')
  el.className = 'relative rounded-2xl border-2 border-dashed px-14 py-5 pt-8'
  el.style.borderColor = opts.borderColor || '#cbd5e1'

  // Slug for targeting (e.g. "AI Agents & Applications" → "ai-agents-applications")
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  el.dataset.group = slug

  // Group label
  const labelEl = document.createElement('div')
  labelEl.className = 'absolute -top-3 left-4 px-1 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-white'
  labelEl.style.zIndex = '1'
  labelEl.style.color = opts.labelColor || '#64748b'
  labelEl.textContent = label
  el.appendChild(labelEl)

  // Inner container
  const inner = document.createElement('div')
  inner.className = 'flex items-center gap-4 justify-center'
  for (const node of nodes) {
    inner.appendChild(node)
  }
  el.appendChild(inner)

  return el
}
