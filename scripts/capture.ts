#!/usr/bin/env bun
/**
 * Automated diagram capture — screenshots & video via Playwright.
 *
 * Usage:
 *   bun run capture <diagram-name> [options]
 *
 * Requires:
 *   - Vite dev server running (`bun run dev`)
 *   - ffmpeg installed (for video/gif output)
 *   - Playwright (`bun add -d playwright`)
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { execSync } from 'child_process'

// ── CLI Parsing ──────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const args = argv.slice(2) // skip bun + script path
  const opts = {
    diagram: '',
    format: 'png' as 'png' | 'mp4' | 'gif' | 'webm' | 'webp',
    at: '0',
    fps: 30,
    width: 1920,
    height: 1080,
    clip: null as { x: number; y: number; width: number; height: number } | null,
    phase: '',
    group: '',
    useViewfinder: false,
    fullViewport: false,
    dark: false,
    output: '',
    scale: 0, // 0 = auto-calculate based on content width
    speed: 1,
    duration: 0, // 0 = full timeline
    baseUrl: 'http://localhost:5173',
    padding: 32,
  }

  let fpsExplicit = false
  let i = 0
  while (i < args.length) {
    const arg = args[i]
    switch (arg) {
      case '--format':
        opts.format = args[++i] as typeof opts.format
        break
      case '--at':
        opts.at = args[++i]
        break
      case '--fps':
        opts.fps = parseInt(args[++i], 10)
        fpsExplicit = true
        break
      case '--width':
        opts.width = parseInt(args[++i], 10)
        break
      case '--height':
        opts.height = parseInt(args[++i], 10)
        break
      case '--clip': {
        const parts = args[++i].split(',').map(Number)
        opts.clip = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
        break
      }
      case '--phase':
        opts.phase = args[++i]
        break
      case '--group':
        opts.group = args[++i]
        break
      case '--use-viewfinder':
        opts.useViewfinder = true
        break
      case '--full-viewport':
        opts.fullViewport = true
        break
      case '--dark':
        opts.dark = true
        break
      case '--output':
        opts.output = args[++i]
        break
      case '--scale':
        opts.scale = parseFloat(args[++i])
        break
      case '--base-url':
        opts.baseUrl = args[++i]
        break
      case '--padding':
        opts.padding = parseInt(args[++i], 10)
        break
      case '--speed':
        opts.speed = parseFloat(args[++i])
        break
      case '--duration':
        opts.duration = parseFloat(args[++i])
        break
      case '--help':
      case '-h':
        printUsage()
        process.exit(0)
      default:
        if (!arg.startsWith('-') && !opts.diagram) {
          opts.diagram = arg
        } else {
          console.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
    }
    i++
  }

  if (!opts.diagram) {
    printUsage()
    process.exit(1)
  }

  // WebP defaults to 60fps (max practical — lower delays get clamped by browsers)
  if (opts.format === 'webp' && !fpsExplicit) {
    opts.fps = 60
  }

  if (!opts.output) {
    opts.output = `output/${opts.diagram}.${opts.format}`
  }

  return opts
}

function printUsage() {
  console.log(`
Usage: bun run capture <diagram-name> [options]

Options:
  --format png|mp4|gif|webm|webp  Output format (default: png)
  --at <label|seconds>        Seek position for screenshots (default: 0)
  --phase <name>              Crop to a specific phase panel (fuzzy match)
  --group <name>              Crop to a specific group container (fuzzy match)
  --fps <number>              Frame rate for video (default: 30)
  --width <number>            Viewport width (default: 1920)
  --height <number>           Viewport height (default: 1080)
  --clip x,y,w,h              Manual clip region
  --use-viewfinder            Use saved viewfinder region from localStorage
  --full-viewport             Capture full viewport (skip auto-crop)
  --dark                      Dark mode
  --output <path>             Output path (default: output/<diagram>.<ext>)
  --scale <number>            Device pixel ratio (default: auto, targets 1920px output width)
  --speed <number>            Playback speed multiplier (default: 1, e.g. 2 = 2x speed)
  --duration <seconds>        Max duration to capture (default: full timeline)
  --padding <number>          Padding around auto-cropped content (default: 32)
  --base-url <url>            Dev server URL (default: http://localhost:5173)

By default, screenshots auto-crop to the diagram content (#app element).
Use --phase or --group to crop to a specific section.
Use --full-viewport to capture the entire viewport instead.

Examples:
  bun run capture handshake                          # full diagram, resting state
  bun run capture handshake --at 5                   # mid-animation at 5s
  bun run capture handshake --phase authenticate     # just Phase 1
  bun run capture handshake --dark --phase discover  # dark mode, Phase 2
  bun run capture agent-access --group ai-agents     # just the agents group
  bun run capture handshake --format mp4             # full animation video
  bun run capture handshake --format webp            # animated WebP (lossless)
  bun run capture handshake --format gif --fps 15    # animated GIF
`.trim())
}

// ── Helpers ──────────────────────────────────────────────────

function requireFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' })
  } catch {
    console.error('Error: ffmpeg is required for video/gif output but was not found.')
    console.error('Install it with: brew install ffmpeg')
    process.exit(1)
  }
}

function ensureDir(filePath: string) {
  const dir = dirname(filePath)
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

/** Return a path that doesn't collide with existing files, e.g. foo.png → foo-2.png */
function uniquePath(filePath: string): string {
  if (!existsSync(filePath)) return filePath
  const ext = extname(filePath)
  const base = filePath.slice(0, -ext.length)
  let n = 2
  while (existsSync(`${base}-${n}${ext}`)) n++
  return `${base}-${n}${ext}`
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv)
  const isVideo = opts.format !== 'png'

  if (isVideo && opts.format !== 'webp') {
    requireFfmpeg()
  }

  // Build URL
  const themeParam = opts.dark ? '&theme=dark' : ''
  const url = `${opts.baseUrl}/${opts.diagram}?capture=true${themeParam}`

  console.log(`Launching browser for ${url}`)

  // Minimum output width in pixels — auto-scale targets this
  const MIN_OUTPUT_WIDTH = 1920

  const browser = await chromium.launch({ headless: true })
  // Start at 1x scale for measuring; we'll recreate with final scale if needed
  let context = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 1,
  })
  let page = await context.newPage()

  await page.goto(url, { waitUntil: 'networkidle' })

  // Wait for the diagram to expose __capture
  await page.waitForFunction(() => (window as any).__capture, null, { timeout: 15000 })

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready)

  // Timeline is already paused at t=0 by main.ts in capture mode.
  // Just hide UI controls.
  await page.evaluate(() => {
    document.querySelector('.top-toolbar')?.setAttribute('style', 'display:none!important')
    document.querySelector('.playback-controls')?.setAttribute('style', 'display:none!important')
    document.querySelector('.viewfinder-overlay')?.remove()
  })

  // Brief pause for DOM to settle after hiding UI
  await page.waitForTimeout(50)

  // Determine clip region (priority: --clip > --phase/--group > --use-viewfinder > auto-crop > full viewport)
  let clip = opts.clip

  // Phase/group targeting via data attributes
  if (!clip && (opts.phase || opts.group)) {
    const target = opts.phase || opts.group
    const attr = opts.phase ? 'phase' : 'group'
    clip = await page.evaluate(({ target, attr, padding }) => {
      // Find all elements with the data attribute
      const els = document.querySelectorAll(`[data-${attr}]`)
      if (els.length === 0) {
        return { error: `No [data-${attr}] elements found on this page` } as any
      }

      // Fuzzy match: exact match first, then substring, then includes
      let match: Element | null = null
      const slug = target.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      for (const el of els) {
        const value = (el as HTMLElement).dataset[attr] || ''
        if (value === slug) { match = el; break }
      }
      if (!match) {
        for (const el of els) {
          const value = (el as HTMLElement).dataset[attr] || ''
          if (value.includes(slug) || slug.includes(value)) { match = el; break }
        }
      }

      if (!match) {
        const available = Array.from(els).map(el => (el as HTMLElement).dataset[attr]).join(', ')
        return { error: `No ${attr} matching "${target}". Available: ${available}` } as any
      }

      const rect = match.getBoundingClientRect()
      const x = Math.max(0, Math.floor(rect.left) - padding)
      const y = Math.max(0, Math.floor(rect.top) - padding)
      const right = Math.ceil(rect.right) + padding
      const bottom = Math.ceil(rect.bottom) + padding
      return { x, y, width: right - x, height: bottom - y }
    }, { target, attr, padding: opts.padding })

    if (clip && (clip as any).error) {
      console.error((clip as any).error)
      await browser.close()
      process.exit(1)
    }
  }

  if (!clip && opts.useViewfinder) {
    clip = await page.evaluate(() => {
      try {
        const state = JSON.parse(localStorage.getItem('playback-state') || '{}')
        if (state.viewfinder) {
          return {
            x: state.viewfinder.left,
            y: state.viewfinder.top,
            width: state.viewfinder.width,
            height: state.viewfinder.height,
          }
        }
      } catch {}
      return null
    })
    if (!clip) {
      console.warn('Warning: --use-viewfinder specified but no viewfinder region found. Falling back to auto-crop.')
    }
  }

  // Auto-crop to #app content bounds (default behavior)
  if (!clip && !opts.fullViewport) {
    clip = await page.evaluate((padding) => {
      const app = document.getElementById('app')
      if (!app) return null
      const rect = app.getBoundingClientRect()
      const x = Math.max(0, Math.floor(rect.left) - padding)
      const y = Math.max(0, Math.floor(rect.top) - padding)
      const right = Math.ceil(rect.right) + padding
      const bottom = Math.ceil(rect.bottom) + padding
      return { x, y, width: right - x, height: bottom - y }
    }, opts.padding)
  }

  // If content extends beyond viewport, grow height to fit (keep width fixed
  // to preserve layout). Only grows, never shrinks below the original size.
  if (clip) {
    const neededHeight = clip.y + clip.height
    if (neededHeight > opts.height) {
      console.log(`Content is ${neededHeight}px tall, resizing viewport from ${opts.height}px`)
      await page.setViewportSize({ width: opts.width, height: neededHeight })
      await page.waitForTimeout(100)

      // Re-measure clip after resize since layout may shift slightly
      if (opts.phase || opts.group) {
        const target = opts.phase || opts.group
        const attr = opts.phase ? 'phase' : 'group'
        clip = await page.evaluate(({ target, attr, padding }) => {
          const slug = target.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          const els = document.querySelectorAll(`[data-${attr}]`)
          for (const el of els) {
            const value = (el as HTMLElement).dataset[attr] || ''
            if (value === slug || value.includes(slug) || slug.includes(value)) {
              const rect = el.getBoundingClientRect()
              const x = Math.max(0, Math.floor(rect.left) - padding)
              const y = Math.max(0, Math.floor(rect.top) - padding)
              return { x, y, width: Math.ceil(rect.right) + padding - x, height: Math.ceil(rect.bottom) + padding - y }
            }
          }
          return null
        }, { target, attr, padding: opts.padding }) ?? clip
      } else if (!opts.useViewfinder && !opts.fullViewport) {
        clip = await page.evaluate((padding) => {
          const app = document.getElementById('app')
          if (!app) return null
          const rect = app.getBoundingClientRect()
          const x = Math.max(0, Math.floor(rect.left) - padding)
          const y = Math.max(0, Math.floor(rect.top) - padding)
          return { x, y, width: Math.ceil(rect.right) + padding - x, height: Math.ceil(rect.bottom) + padding - y }
        }, opts.padding) ?? clip
      }
    }
  }

  // Auto-calculate scale: ensure output is at least MIN_OUTPUT_WIDTH pixels wide
  const contentWidth = clip ? clip.width : opts.width
  if (opts.scale === 0) {
    opts.scale = Math.max(2, Math.ceil(MIN_OUTPUT_WIDTH / contentWidth))
  }

  // Recreate browser context with final scale (can't change deviceScaleFactor after creation)
  if (opts.scale !== 1) {
    const vpSize = await page.viewportSize()!
    await context.close()
    context = await browser.newContext({
      viewport: vpSize ?? { width: opts.width, height: opts.height },
      deviceScaleFactor: opts.scale,
    })
    page = await context.newPage()

    await page.goto(url, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => (window as any).__capture, null, { timeout: 30000 })
    await page.evaluate(() => document.fonts.ready)

    await page.evaluate(() => {
      document.querySelector('.top-toolbar')?.setAttribute('style', 'display:none!important')
      document.querySelector('.playback-controls')?.setAttribute('style', 'display:none!important')
      document.querySelector('.viewfinder-overlay')?.remove()
    })
    await page.waitForTimeout(100)

    console.log(`Output scale: ${opts.scale}x (${contentWidth * opts.scale}px wide)`)
  }

  // Resolve output path (don't overwrite existing files)
  opts.output = uniquePath(opts.output)
  ensureDir(opts.output)

  if (!isVideo) {
    // ── Screenshot mode ──
    await seekTo(page, opts.at)
    await page.waitForTimeout(100)

    await page.screenshot({
      path: opts.output,
      clip: clip ?? undefined,
    })

    console.log(`Screenshot saved: ${opts.output}`)
  } else {
    // ── Video mode (frame-by-frame) ──
    // h264/vpx require even dimensions — round clip down to even pixels
    if (clip) {
      clip.width = clip.width & ~1
      clip.height = clip.height & ~1
    }

    const framesDir = join('output', `.frames-${opts.diagram}-${Date.now()}`)
    mkdirSync(framesDir, { recursive: true })

    const timelineDuration = await page.evaluate(() => {
      const { timeline } = (window as any).__capture
      return timeline.duration() as number
    })

    // Apply speed and duration limits
    const captureDuration = opts.duration > 0
      ? Math.min(opts.duration, timelineDuration / opts.speed)
      : timelineDuration / opts.speed
    const totalFrames = Math.ceil(captureDuration * opts.fps)
    const speedInfo = opts.speed !== 1 ? ` at ${opts.speed}x speed` : ''
    console.log(`Capturing ${totalFrames + 1} frames (${captureDuration.toFixed(2)}s${speedInfo} at ${opts.fps}fps)`)

    for (let i = 0; i <= totalFrames; i++) {
      const time = (i / opts.fps) * opts.speed  // timeline time advances faster with speed > 1
      // Step timeline forward — no snapshot reset between frames.
      // GSAP manages tween state naturally as we advance.
      await page.evaluate((t) => {
        const { timeline } = (window as any).__capture
        timeline.seek(t, false)
      }, time)

      // Brief yield for DOM to apply attribute changes from GSAP seek
      await page.waitForTimeout(1)

      const framePath = join(framesDir, `frame-${String(i).padStart(6, '0')}.png`)
      await page.screenshot({
        path: framePath,
        clip: clip ?? undefined,
      })

      // Progress indicator
      if (i % opts.fps === 0) {
        const pct = Math.round((i / totalFrames) * 100)
        process.stdout.write(`\r  ${pct}% (${i}/${totalFrames})`)
      }
    }
    process.stdout.write(`\r  100% (${totalFrames}/${totalFrames})\n`)

    // ── Stitch with ffmpeg ──
    console.log(`Assembling ${opts.format}...`)
    const inputPattern = join(framesDir, 'frame-%06d.png')

    let ffmpegCmd: string
    switch (opts.format) {
      case 'mp4':
        ffmpegCmd = `ffmpeg -y -framerate ${opts.fps} -i "${inputPattern}" -c:v libx264 -pix_fmt yuv444p -crf 10 -preset slow "${opts.output}"`
        break
      case 'webm':
        ffmpegCmd = `ffmpeg -y -framerate ${opts.fps} -i "${inputPattern}" -c:v libvpx-vp9 -crf 30 -b:v 0 "${opts.output}"`
        break
      case 'gif':
        // Two-pass for better GIF quality
        ffmpegCmd = `ffmpeg -y -framerate ${opts.fps} -i "${inputPattern}" -vf "split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" "${opts.output}"`
        break
      case 'webp': {
        // Animated WebP via img2webp — gives exact frame delay control
        // (ffmpeg's libwebp_anim caps at 25fps)
        const delayMs = Math.round(1000 / opts.fps)
        // Build args: -d <ms> frame1.png -d <ms> frame2.png ...
        const webpArgs = ['-loop', '0']
        for (let f = 0; f <= totalFrames; f++) {
          webpArgs.push('-d', String(delayMs), '-q', '90',
            join(framesDir, `frame-${String(f).padStart(6, '0')}.png`))
        }
        webpArgs.push('-o', opts.output)
        try {
          const { execFileSync } = await import('child_process')
          execFileSync('img2webp', webpArgs, { stdio: 'inherit', maxBuffer: 10 * 1024 * 1024 })
          console.log(`Video saved: ${opts.output}`)
        } catch (err) {
          console.error('img2webp failed:', err)
          process.exit(1)
        }
        rmSync(framesDir, { recursive: true, force: true })
        await browser.close()
        return
      }
      default:
        throw new Error(`Unsupported format: ${opts.format}`)
    }

    try {
      execSync(ffmpegCmd, { stdio: 'inherit' })
      console.log(`Video saved: ${opts.output}`)
    } catch (err) {
      console.error('ffmpeg failed:', err)
      process.exit(1)
    }

    // Clean up frames
    rmSync(framesDir, { recursive: true, force: true })
  }

  await browser.close()
}

async function seekTo(page: import('playwright').Page, at: string) {
  await page.evaluate((seekTarget) => {
    const { timeline } = (window as any).__capture

    // Resolve seek target: label name or numeric seconds
    const labels = timeline.labels
    let time = 0
    if (labels && seekTarget in labels) {
      time = labels[seekTarget]
    } else {
      const parsed = parseFloat(seekTarget)
      if (!isNaN(parsed)) time = parsed
    }

    // Timeline starts paused at t=0 (clean state from main.ts).
    // Seek forward with callbacks enabled so animation state renders
    // (packet dots, status pills, step highlights, etc.)
    timeline.seek(time, time === 0)
  }, at)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
