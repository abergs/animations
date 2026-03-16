export interface RowConfig {
  nodes: HTMLElement[]
  label?: string
}

export type RowInput = HTMLElement[] | RowConfig

export interface LayoutOptions {
  rowGap?: string
  nodeGap?: string
  center?: boolean
  align?: 'center' | 'left' | 'right'
  title?: string
  subtitle?: string
  titleColor?: string
}

export function layoutRows(
  container: HTMLElement,
  rows: RowInput[],
  opts: LayoutOptions = {}
): void {
  container.style.position = 'relative'

  // Title / subtitle
  if (opts.title) {
    const titleEl = document.createElement('h1')
    titleEl.className = 'text-2xl font-bold text-slate-800 text-center mb-1'
    titleEl.style.color = opts.titleColor || ''
    titleEl.textContent = opts.title
    container.appendChild(titleEl)
  }
  if (opts.subtitle) {
    const subEl = document.createElement('p')
    subEl.className = 'text-sm text-slate-400 text-center mb-8'
    subEl.textContent = opts.subtitle
    container.appendChild(subEl)
  }

  for (const row of rows) {
    const isConfig = !Array.isArray(row)
    const nodes = isConfig ? (row as RowConfig).nodes : (row as HTMLElement[])
    const label = isConfig ? (row as RowConfig).label : undefined

    if (label) {
      const labelEl = document.createElement('div')
      labelEl.className = 'text-xs font-medium text-slate-400 text-center uppercase tracking-wide mb-2'
      container.appendChild(labelEl)
      labelEl.textContent = label
    }

    const rowDiv = document.createElement('div')
    const justify = opts.align === 'left' ? 'justify-start' : opts.align === 'right' ? 'justify-end' : 'justify-center'
    rowDiv.className = `flex items-start ${justify}`
    rowDiv.style.gap = opts.nodeGap || '1.5rem'
    rowDiv.style.marginBottom = opts.rowGap || '2.5rem'

    for (const el of nodes) {
      rowDiv.appendChild(el)
    }

    container.appendChild(rowDiv)
  }
}
