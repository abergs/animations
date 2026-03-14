# Animated Architecture Diagrams

A lightweight toolkit for creating animated architecture diagrams using **GSAP** + **Tailwind CSS**. No framework required — just vanilla TypeScript and DOM manipulation.

## Quick Start

```bash
bun install
bun run dev
```

## Stack

- **Vite** — dev server & bundler
- **GSAP** — timeline-based animations (packets, highlights, pulses)
- **Tailwind CSS v4** — styling via `@tailwindcss/vite`
- **TypeScript** — type-safe config

## How It Works

Build diagrams by composing nodes, arrows, and animation steps:

```ts
// Create nodes
const api = createNode("API Server", {
  icon: '<svg>...</svg>',
  subtitle: "Handles requests",
  status: "Idle",
  statusColor: "#94a3b8",
});

// Layout rows
layoutRows(container, [
  [client, gateway],
  [api],
  [database],
]);

// Draw arrows
const arrow = drawArrow(svg, client, api, { color: "#cbd5e1" });

// Animate
const tl = gsap.timeline({ repeat: -1 });
packet(tl, arrow, { color: "#175DDC", duration: 1.2 });
pulse(tl, api, { color: "#175DDC" });
statusPill(tl, api, "Processing request");
```

## Animation Primitives

| Function | Description |
|---|---|
| `packet(tl, arrow, opts)` | Animated dot traveling along an arrow path |
| `highlight(tl, node, opts)` | Border glow + scale bump |
| `pulse(tl, node, opts)` | Quick scale pulse with shadow |
| `statusPill(tl, node, text, opts)` | Update a node's status text and color |
| `slideOut(tl, node, text, opts)` | Slide-out card (e.g. audit log) |
| `resetStatusPills(tl)` | Reset all pills to their initial state |

## File Structure

```
src/
  main.ts                    # Example diagram (Bitwarden Agent Access)
  styles.css                 # Tailwind import + component styles
  components/
    node.ts                  # Card nodes with icon, subtitle, status pill
    arrows.ts                # SVG arrow overlay with auto-routing
    layout.ts                # Row-based layout with optional labels
    group.ts                 # Bordered group containers
  animations/
    packet.ts                # Dot traveling along SVG path
    effects.ts               # Highlight, pulse, fade effects
    status.ts                # Status pill updates, slide-out cards
    log.ts                   # Debug tracing wrapper
```

## Node Options

```ts
createNode("Label", {
  icon: '<svg>...</svg>',    // Inline SVG icon
  iconBg: "#f0f4ff",         // Icon background color
  subtitle: "Description",
  status: "Idle",            // Initial status pill text
  statusColor: "#94a3b8",    // Status pill color
  width: "260px",            // Fixed width (prevents resize on status change)
  ghost: true,               // Compact pill style (dashed border, minimal)
});
```

## License

MIT
