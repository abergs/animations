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
import { join } from 'path'
import { execSync } from 'child_process'

// ── CLI Parsing ──────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const args = argv.slice(2) // skip bun + script path
  const opts = {
    diagram: '',
    format: 'png' as 'png' | 'mp4' | 'gif' | 'webm',
    at: '0',
    fps: 30,
    width: 1920,
    height: 1080,
    clip: null as { x: number; y: number; width: number; height: number } | null,
    useViewfinder: false,
    dark: false,
    output: '',
    scale: 2,
    baseUrl: 'http://localhost:5173',
  }

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
      case '--use-viewfinder':
        opts.useViewfinder = true
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

  if (!opts.output) {
    opts.output = `output/${opts.diagram}.${opts.format}`
  }

  return opts
}

function printUsage() {
  console.log(`
Usage: bun run capture <diagram-name> [options]

Options:
  --format png|mp4|gif|webm   Output format (default: png)
  --at <label|seconds>        Seek position for screenshots (default: 0)
  --fps <number>              Frame rate for video (default: 30)
  --width <number>            Viewport width (default: 1920)
  --height <number>           Viewport height (default: 1080)
  --clip x,y,w,h              Manual clip region
  --use-viewfinder            Use saved viewfinder region from localStorage
  --dark                      Dark mode
  --output <path>             Output path (default: output/<diagram>.<ext>)
  --scale <number>            Device pixel ratio (default: 2)
  --base-url <url>            Dev server URL (default: http://localhost:5173)
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

function ensureDir(path: string) {
  const dir = path.substring(0, path.lastIndexOf('/'))
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv)
  const isVideo = opts.format !== 'png'

  if (isVideo) {
    requireFfmpeg()
  }

  // Build URL
  const themeParam = opts.dark ? '&theme=dark' : ''
  const url = `${opts.baseUrl}/${opts.diagram}?capture=true${themeParam}`

  console.log(`Launching browser for ${url}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: opts.scale,
  })
  const page = await context.newPage()

  await page.goto(url, { waitUntil: 'networkidle' })

  // Wait for the diagram to expose __capture
  await page.waitForFunction(() => (window as any).__capture, null, { timeout: 15000 })

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready)

  // Pause timeline and hide UI controls
  await page.evaluate(() => {
    const { timeline } = (window as any).__capture
    timeline.pause()

    // Hide toolbar and viewfinder
    document.querySelector('.top-toolbar')?.setAttribute('style', 'display:none!important')
    document.querySelector('.playback-controls')?.setAttribute('style', 'display:none!important')
    document.querySelector('.viewfinder-overlay')?.remove()
  })

  // Determine clip region
  let clip = opts.clip

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
      console.warn('Warning: --use-viewfinder specified but no viewfinder region found. Capturing full viewport.')
    }
  }

  ensureDir(opts.output)

  if (!isVideo) {
    // ── Screenshot mode ──
    await seekTo(page, opts.at)
    // Brief delay for DOM to render after seek
    await page.waitForTimeout(100)

    await page.screenshot({
      path: opts.output,
      clip: clip ?? undefined,
    })

    console.log(`Screenshot saved: ${opts.output}`)
  } else {
    // ── Video mode (frame-by-frame) ──
    const framesDir = join('output', `.frames-${opts.diagram}-${Date.now()}`)
    mkdirSync(framesDir, { recursive: true })

    const duration = await page.evaluate(() => {
      const { timeline } = (window as any).__capture
      return timeline.duration() as number
    })

    const totalFrames = Math.ceil(duration * opts.fps)
    console.log(`Capturing ${totalFrames + 1} frames (${duration.toFixed(2)}s at ${opts.fps}fps)`)

    for (let i = 0; i <= totalFrames; i++) {
      const time = i / opts.fps
      await page.evaluate((t) => {
        const { timeline, snapshot } = (window as any).__capture
        // Reset state before seeking to ensure clean render
        snapshot.restoreNow()
        timeline.seek(t, false)
      }, time)

      // Let DOM render
      await page.waitForTimeout(16)

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
        ffmpegCmd = `ffmpeg -y -framerate ${opts.fps} -i "${inputPattern}" -c:v libx264 -pix_fmt yuv420p -crf 18 "${opts.output}"`
        break
      case 'webm':
        ffmpegCmd = `ffmpeg -y -framerate ${opts.fps} -i "${inputPattern}" -c:v libvpx-vp9 -crf 30 -b:v 0 "${opts.output}"`
        break
      case 'gif':
        // Two-pass for better GIF quality
        ffmpegCmd = `ffmpeg -y -framerate ${opts.fps} -i "${inputPattern}" -vf "split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" "${opts.output}"`
        break
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
    const { timeline, snapshot } = (window as any).__capture
    snapshot.restoreNow()

    // Try as label first, then as number
    const labels = timeline.labels
    if (labels && seekTarget in labels) {
      timeline.seek(seekTarget, false)
    } else {
      const time = parseFloat(seekTarget)
      timeline.seek(isNaN(time) ? 0 : time, false)
    }
  }, at)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
