export interface PhaseStep {
  text: string
  detail?: string
}

export interface PhaseOptions {
  borderColor?: string
  labelColor?: string
  description?: string
}

/**
 * Create a phase panel with participant nodes at the top
 * and a numbered step list below.
 */
export function createPhasePanel(
  label: string,
  participants: HTMLElement[],
  steps: PhaseStep[],
  opts: PhaseOptions = {},
): HTMLElement {
  const el = document.createElement('div')
  el.className = 'phase-panel relative rounded-2xl border-2 border-dashed pt-8 pb-6 px-12'
  el.style.borderColor = opts.borderColor || '#cbd5e1'

  // Group label bar (can hold label + extra buttons)
  const labelBar = document.createElement('div')
  labelBar.className = 'phase-label-bar'
  labelBar.style.color = opts.labelColor || '#64748b'

  const labelText = document.createElement('span')
  labelText.textContent = label
  labelBar.appendChild(labelText)

  el.appendChild(labelBar)

  // Description (right under the header)
  if (opts.description) {
    const desc = document.createElement('p')
    desc.className = 'phase-description'
    desc.textContent = opts.description
    el.appendChild(desc)
  }

  // Participants row
  const row = document.createElement('div')
  row.className = 'flex items-center justify-center gap-6 mb-4'
  for (const p of participants) {
    row.appendChild(p)
  }
  el.appendChild(row)

  // Divider
  const hr = document.createElement('div')
  hr.className = 'border-t border-dashed mb-3'
  hr.style.borderColor = (opts.borderColor || '#cbd5e1')
  el.appendChild(hr)

  // Step list
  const list = document.createElement('ol')
  list.className = 'phase-steps'

  for (const step of steps) {
    const li = document.createElement('li')
    li.className = 'phase-step'

    const textSpan = document.createElement('span')
    textSpan.className = 'phase-step-text'
    textSpan.textContent = step.text
    li.appendChild(textSpan)

    if (step.detail) {
      const detailSpan = document.createElement('span')
      detailSpan.className = 'phase-step-detail'
      detailSpan.textContent = step.detail
      li.appendChild(detailSpan)
    }

    list.appendChild(li)
  }

  el.appendChild(list)

  return el
}
