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
 * Usage:
 *   defineDiagram('bw-diagram-handshake', handshakeFn)
 *   <bw-diagram-handshake mode="auto"></bw-diagram-handshake>
 */
export function defineDiagram(tagName: string, diagramFn: DiagramFn) {
  class DiagramElement extends HTMLElement {
    static observedAttributes = ["mode"];

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
      }
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
