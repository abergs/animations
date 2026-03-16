# GSAP Diagram Toolkit — Design Patterns

Patterns extracted from building architecture diagrams with this framework.

## Layout Patterns

### Grouped Layers

Use `createGroup()` to visually cluster related nodes. Groups get a dashed border and an uppercase label.

```ts
const group = createGroup("ap-client SDK", [nodeA, nodeB], {
  borderColor: "#175DDC40",  // color + 40 hex opacity for the border
  labelColor: "#175DDC",     // solid color for the label text
});
```

**Conventions:**
- Use the same `borderColor`/`labelColor` across groups for visual consistency
- Group label gets a solid `bg-white` background with `z-index: 1` so arrows pass behind it
- The inner container uses `items-center` for vertical alignment and `justify-center` for horizontal
- `px-14` horizontal padding keeps content clear of the left-aligned label

### Left-Edge Alignment

Use `alignGroupWidths()` to match widths so left edges align when centered:

```ts
import { alignGroupWidths } from '../components/paths'

alignGroupWidths(cliGroup, clientGroup, protoGroup)
```

Internally runs in `requestAnimationFrame`, reads `offsetWidth`, and sets all to the max.

### Ghost Nodes

Use `ghost: true` for infrastructure/relay nodes that aren't primary components. They render as compact dashed pills.

```ts
const proxy = cn("Proxy Server", {
  icon: icons.lock,
  ghost: true,
  status: "ap-proxy · Zero-knowledge relay",
  statusColor: "#94a3b8",
});
```

**Gotcha:** If a ghost node's status text changes during animation, set a fixed width on the `.flow-node` card to prevent layout reflow:

```ts
const card = node.querySelector('.flow-node') as HTMLElement;
if (card) card.style.width = '150px';
```

### Inline Separators

Add non-node elements between grouped nodes for visual connectors:

```ts
const plus = document.createElement("span");
plus.textContent = "+";
plus.className = "text-xl font-light text-slate-300";
const group = createGroup("Protocol", [nodeA, plus, nodeB], { ... });
```

## Arrow Patterns

### Step-Round Curves

Orthogonal paths with rounded corners (`curve: "step-round"`). Best for architecture diagrams where straight geometric lines communicate structure.

```ts
da(svg, sourceNode, targetNode, {
  color: "#cbd5e1",
  curve: "step-round",
  noArrow: true,
});
```

**Direction-aware:** The horizontal segment sits at 35% from the source for downward paths, and 65% from the source for upward paths, creating visual symmetry.

**When to use which curve:**
- `step-round` — architecture/structure diagrams (orthogonal, geometric)
- `s` — flow/sequence diagrams (smooth, organic)
- `straight` — short horizontal connections within a group
- `dashed` style — encrypted/tunnel segments

### Step-Round at Specific Y (`drawStepRoundAtY`)

When two paths need to share the same horizontal turn point, use `drawStepRoundAtY()` with a computed Y:

```ts
import { drawStepRoundAtY, gapMidY } from '../components/paths'

const turnY = gapMidY(cliGroup, clientGroup, container)
const path = drawStepRoundAtY(svg, container, cliConnect, remote, turnY)
```

`gapMidY()` returns the vertical midpoint between two elements — perfect for placing horizontal segments in the gap between groups.

### Bypass Arrows (`drawBypassArrow`)

Route an arrow around a group's edge when a connection needs to skip a layer:

```ts
import { drawBypassArrow } from '../components/paths'

const path = drawBypassArrow(
  svg, container,
  fromNode, toNode,
  avoidGroup,      // the group to route around
  aboveGroup,      // group above (for top turn Y)
  belowGroup,      // group below (for bottom turn Y)
  { side: "left", padding: 24 },
)
```

The path routes: down → turn toward side → horizontal past group → down alongside it → turn back → horizontal to target → down into target. All turns have rounded corners.

Supports `side: "left" | "right"` and configurable `padding` from the group edge.

### Shared Turn Points

When a bypass arrow and a direct arrow share a vertical segment, use `gapMidY()` so both paths use the same Y for their horizontal turns:

```ts
const turnY = gapMidY(cliGroup, clientGroup, container)

// Bypass arrow automatically uses gapMidY internally
const bypass = drawBypassArrow(svg, container, a, b, cliGroup, consumerGroup, clientGroup)

// Direct arrow uses the same Y
const direct = drawStepRoundAtY(svg, container, c, d, turnY)
```

## Animation Patterns

### Packet with Trail (`packetWithTrail`)

Animate a glowing dot traveling along a path with a colored trail that reveals progressively behind it:

```ts
import { packetWithTrail, resetTrails, createTrailState } from '../animations/trail'

const trailState = createTrailState()

// Shorthand helper
const trail = (path, color, target?) =>
  packetWithTrail(tl, path, trailState, { color }, target)

// Use it
trail(arrowPath, "#175DDC", targetNode)
trail(nextPath, "#175DDC", nextTarget)

// Reset on loop
resetTrails(tl, trailState)
```

**Key features:**
- Constant speed via `path.getTotalLength() / speed` (default 400 px/s)
- Trail is a cloned SVG path with animated `strokeDashoffset`
- Optional target node pulse when packet arrives
- `resetTrails()` hides all overlays for clean loop restart

### Status Pill Lifecycle

- Nodes without a `status` option render the pill as `display: none`
- `statusPill()` sets `display: ''` to reveal it, then sets text + color
- `resetStatusPills()` restores initial state and re-hides if originally empty
- Ghost nodes use a single element with both `status-pill` and `status-pill-anno` classes

## Node Design

### Card Anatomy

```
┌─────────────────────────────┐
│  [icon]  Title               │   ← text-sm font-semibold
│          Subtitle text       │   ← text-xs text-slate-400
│          ┌─status pill──┐    │   ← 0.65rem, rounded-full
│          └──────────────┘    │
└─────────────────────────────┘
```

- Icon top-aligns (`items-start`) with a `mt-0.5` nudge to sit level with the title
- `gap-1` between title, subtitle, and status pill
- Subtitle uses `leading-normal` for comfortable line wrapping
- Card padding: `px-4 py-4`

### Consistent Heights

Keep subtitles short enough to avoid wrapping differently across sibling nodes. If two nodes in the same group have different heights, it breaks visual alignment. Shorten text or widen nodes (`width: "220px"`) to prevent this.

## Component Summary

| File | Exports | Purpose |
|---|---|---|
| `components/node.ts` | `createNode` | Card nodes (regular + ghost) |
| `components/group.ts` | `createGroup` | Dashed border group with label |
| `components/layout.ts` | `layoutRows` | Vertical row layout with title/subtitle |
| `components/arrows.ts` | `drawArrow`, `drawMergedArrows` | SVG arrows with curve types |
| `components/paths.ts` | `drawStepRoundAtY`, `drawBypassArrow`, `alignGroupWidths`, `gapMidY` | Manual path routing + layout helpers |
| `animations/packet.ts` | `packet` | Glowing dot traveling along a path |
| `animations/effects.ts` | `highlight`, `pulse`, `colorLine`, `resetLines` | Node/line visual effects |
| `animations/status.ts` | `statusPill`, `resetStatusPills`, `slideOut` | Status pill text updates |
| `animations/trail.ts` | `packetWithTrail`, `resetTrails`, `createTrailState` | Packet + progressive colored trail |
| `animations/log.ts` | `withTracing` | Console logging wrapper for debugging |

## Color Conventions

| Element | Color | Usage |
|---|---|---|
| Default lines | `#cbd5e1` | Slate-300, neutral connectors |
| Active packet/trail | `#175DDC` | Bitwarden blue, primary flow |
| Success state | `#10b981` | Emerald, completion indicators |
| Warning state | `#f59e0b` | Amber, approval prompts |
| Group border | `{color}40` | Base color at 25% opacity |
| Group label | `{color}` | Solid base color |
| Ghost node border | `#cbd5e1` | Dashed slate |
| Status pill bg | `{color}18` | Base color at ~9% opacity |

## Dark Mode

- Group labels use `bg-white` which needs a dark override:
  ```css
  body.dark .bg-white { background-color: #0d1117 !important; }
  ```
- Ghost nodes: `background-color: transparent`, `border-color: #30363d`
- Node cards: `background-color: #161b22`, `border-color: #30363d`
- SVG lines: `stroke: #30363d` (via CSS selector on `stroke="#cbd5e1"`)
