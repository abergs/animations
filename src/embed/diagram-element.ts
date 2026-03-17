import type { Snapshot } from "../animations/snapshot";

/** Function signature for diagram definitions */
export type DiagramFn = (
  container: HTMLElement,
  onReady?: (tl: gsap.core.Timeline, snapshot: Snapshot) => void,
) => void;

/**
 * Embedded CSS is injected at build time by the vite-plugin-embed-css plugin.
 * The plugin replaces this declaration with the actual compiled CSS string.
 */
declare const __EMBEDDED_CSS__: string;

/**
 * In dev mode, Vite injects CSS into the document <head> via `import "./embed-styles.css"`,
 * but Shadow DOM doesn't inherit those styles. This helper copies all Vite-injected
 * <style> tags into the shadow root so the diagram renders correctly during development.
 */
function applyDevStyles(shadow: ShadowRoot): ReturnType<typeof setInterval> {
  // Copy existing Vite styles
  for (const s of document.querySelectorAll("style[data-vite-dev-id]")) {
    shadow.appendChild(s.cloneNode(true));
  }
  // Vite may inject styles after module execution — poll briefly for late arrivals
  let checks = 0;
  const id = setInterval(() => {
    let added = false;
    for (const s of document.querySelectorAll("style[data-vite-dev-id]")) {
      const devId = (s as HTMLStyleElement).dataset.viteDevId!;
      if (!shadow.querySelector(`style[data-vite-dev-id="${CSS.escape(devId)}"]`)) {
        shadow.appendChild(s.cloneNode(true));
        added = true;
      }
    }
    checks++;
    if (!added && checks > 5) clearInterval(id);
  }, 200);
  return id;
}

/**
 * Define a custom element that renders a diagram inside Shadow DOM.
 *
 * Attributes:
 *   mode="light" | "dark" | "auto" (default: "light")
 *     - light: light theme
 *     - dark: dark theme
 *     - auto: follows prefers-color-scheme media query
 *
 *   paused — boolean attribute, starts the diagram paused instead of autoplaying
 *
 *   at="<label|time>" — seek to a named label or numeric time (seconds)
 *     - e.g. at="phase2" or at="3.5"
 *     - implies paused
 *
 *   progress="0..1" — seek to a fraction of the total timeline duration
 *     - e.g. progress="0.5" for halfway through
 *     - implies paused
 *
 * Usage:
 *   defineDiagram('bw-diagram-handshake', handshakeFn)
 *   <bw-diagram-handshake mode="auto"></bw-diagram-handshake>
 *   <bw-diagram-handshake paused at="phase2"></bw-diagram-handshake>
 */
export function defineDiagram(tagName: string, diagramFn: DiagramFn) {
  class DiagramElement extends HTMLElement {
    static observedAttributes = ["mode", "paused", "at", "progress"];

    /** The GSAP master timeline — exposed so <bw-playback> can control it */
    timeline: gsap.core.Timeline | null = null;
    /** State snapshot for reset */
    snapshot: Snapshot | null = null;

    private container: HTMLElement | null = null;
    private mediaQuery: MediaQueryList | null = null;
    private mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;
    private devStyleInterval: ReturnType<typeof setInterval> | null = null;

    connectedCallback() {
      const shadow = this.attachShadow({ mode: "open" });

      // Inject styles into shadow DOM.
      // The ternary form is required — the embed build plugin matches this exact pattern
      // and replaces it with the compiled CSS string at build time.
      const css = typeof __EMBEDDED_CSS__ !== "undefined" ? __EMBEDDED_CSS__ : "";
      const style = document.createElement("style");
      style.textContent = css;
      shadow.appendChild(style);

      if (!css) {
        // Dev mode: Vite injects CSS into <head>, not Shadow DOM — copy it in
        this.devStyleInterval = applyDevStyles(shadow);
      }

      // Font link — Inter from Google Fonts, fallback to system-ui
      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      shadow.appendChild(fontLink);

      // Container for the diagram
      this.container = document.createElement("div");
      this.container.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
      this.container.style.position = "relative";
      shadow.appendChild(this.container);

      // Apply initial mode
      this.applyMode(this.getAttribute("mode") || "light");

      // Run the diagram function
      diagramFn(this.container, (tl, snapshot) => {
        this.timeline = tl;
        this.snapshot = snapshot;

        // Apply initial playback attributes (progress takes precedence over at)
        if (this.hasAttribute("progress")) {
          this.applyProgress();
        } else {
          this.applyAt();
        }
        this.applyPaused();

        this.dispatchEvent(new CustomEvent("ready", { bubbles: true }));
      });
    }

    disconnectedCallback() {
      if (this.devStyleInterval != null) {
        clearInterval(this.devStyleInterval);
        this.devStyleInterval = null;
      }
      if (this.timeline) {
        this.timeline.kill();
        this.timeline = null;
      }
      this.snapshot = null;
      this.container = null;
      this.teardownAutoMode();
      // Clear shadow DOM to break closure references from replay buttons
      this.shadowRoot?.replaceChildren();
    }

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      if (name === "mode") {
        this.applyMode(value || "light");
      } else if (name === "at") {
        this.applyAt();
      } else if (name === "progress") {
        this.applyProgress();
      } else if (name === "paused") {
        this.applyPaused();
      }
    }

    /** Pause or play based on the `paused` attribute (and `at`/`progress`, which imply paused). */
    private applyPaused() {
      if (!this.timeline) return;
      if (this.hasAttribute("paused") || this.hasAttribute("at") || this.hasAttribute("progress")) {
        this.timeline.pause();
      } else if (this.timeline.paused()) {
        this.timeline.play();
      }
    }

    /** Seek to a fraction (0–1) of a single iteration of the timeline. */
    private applyProgress() {
      if (!this.timeline) return;
      const raw = this.getAttribute("progress");
      if (raw == null) return;
      const p = Math.max(0, Math.min(1, Number(raw)));
      if (isNaN(p)) return;
      const time = p * this.timeline.duration();
      this.seekTo(time);
    }

    /** Seek to a named label or numeric time (seconds). */
    private applyAt() {
      if (!this.timeline) return;
      const at = this.getAttribute("at");
      if (at == null) return;

      const num = Number(at);
      this.seekTo(!isNaN(num) ? num : at);
    }

    /** Reset diagram to initial state, then seek forward so all callbacks fire correctly. */
    private seekTo(target: string | number) {
      if (!this.timeline) return;
      if (this.snapshot) this.snapshot.restoreNow();
      this.timeline.pause();
      this.timeline.seek(0, true);
      this.timeline.seek(target, false);
    }

    private applyMode(mode: string) {
      this.teardownAutoMode();

      if (mode === "auto") {
        this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.setDark(this.mediaQuery.matches);
        this.mediaHandler = (e) => this.setDark(e.matches);
        this.mediaQuery.addEventListener("change", this.mediaHandler);
      } else {
        this.setDark(mode === "dark");
      }
    }

    private setDark(dark: boolean) {
      if (!this.container) return;
      this.container.classList.toggle("dark", dark);
    }

    private teardownAutoMode() {
      if (this.mediaQuery && this.mediaHandler) {
        this.mediaQuery.removeEventListener("change", this.mediaHandler);
        this.mediaQuery = null;
        this.mediaHandler = null;
      }
    }
  }

  customElements.define(tagName, DiagramElement);
}
