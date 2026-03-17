/**
 * <bw-playback for="diagram-id"> — external playback controls for an embedded diagram.
 *
 * Connects to a <bw-diagram-*> element via the `for` attribute (like <label for>).
 * Renders play/pause + reset buttons. If omitted, the diagram just autoplays.
 *
 * Attributes:
 *   mode="light" | "dark" | "auto" (default: "light")
 *   labels — boolean, show timeline label buttons for seeking to named points
 */

declare const __EMBEDDED_CSS__: string;

/**
 * Copy Vite-injected <style> tags into a shadow root for dev mode.
 * Same helper as in diagram-element.ts — Shadow DOM blocks inherited styles.
 */
function applyDevStyles(shadow: ShadowRoot): ReturnType<typeof setInterval> {
  for (const s of document.querySelectorAll("style[data-vite-dev-id]")) {
    shadow.appendChild(s.cloneNode(true));
  }
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

interface DiagramElement extends HTMLElement {
  timeline: gsap.core.Timeline | null;
  snapshot: import("../animations/snapshot").Snapshot | null;
}

class PlaybackElement extends HTMLElement {
  static observedAttributes = ["mode"];

  private playing = true;
  private toggleBtn: HTMLButtonElement | null = null;
  private controls: HTMLElement | null = null;
  private timeline: gsap.core.Timeline | null = null;
  private diagram: DiagramElement | null = null;
  private wrapper: HTMLElement | null = null;
  private mediaQuery: MediaQueryList | null = null;
  private mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;
  private devStyleInterval: ReturnType<typeof setInterval> | null = null;
  private labelButtons: HTMLButtonElement[] = [];

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open" });

    // Inject styles — the ternary form is matched by the embed build plugin
    const css = typeof __EMBEDDED_CSS__ !== "undefined" ? __EMBEDDED_CSS__ : "";
    const style = document.createElement("style");
    style.textContent = css;
    shadow.appendChild(style);

    if (!css) {
      // Dev mode: Vite injects CSS into <head>, not Shadow DOM — copy it in
      this.devStyleInterval = applyDevStyles(shadow);
    }

    // Font
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    shadow.appendChild(fontLink);

    // Wrapper for dark mode class
    this.wrapper = document.createElement("div");
    this.wrapper.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    shadow.appendChild(this.wrapper);

    // Controls container
    const controls = document.createElement("div");
    controls.className = "playback-controls";

    const btnGroup = document.createElement("div");
    btnGroup.className = "playback-btn-group";

    this.toggleBtn = document.createElement("button");
    this.toggleBtn.className = "playback-btn playback-btn-left active";
    this.toggleBtn.textContent = "\u23F8 Pause";

    const resetBtn = document.createElement("button");
    resetBtn.className = "playback-btn playback-btn-right";
    resetBtn.textContent = "\u21BA";
    resetBtn.title = "Reset";

    btnGroup.appendChild(this.toggleBtn);
    btnGroup.appendChild(resetBtn);
    controls.appendChild(btnGroup);
    this.controls = controls;
    this.wrapper.appendChild(controls);

    // Wire events
    this.toggleBtn.addEventListener("click", () => this.toggle());
    resetBtn.addEventListener("click", () => this.reset());

    // Apply initial mode
    this.applyMode(this.getAttribute("mode") || "light");

    // Connect to diagram
    this.connectToDiagram();
  }

  disconnectedCallback() {
    if (this.devStyleInterval != null) {
      clearInterval(this.devStyleInterval);
      this.devStyleInterval = null;
    }
    this.teardownAutoMode();
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
    if (!this.wrapper) return;
    this.wrapper.classList.toggle("dark", dark);
  }

  private teardownAutoMode() {
    if (this.mediaQuery && this.mediaHandler) {
      this.mediaQuery.removeEventListener("change", this.mediaHandler);
      this.mediaQuery = null;
      this.mediaHandler = null;
    }
  }

  private connectToDiagram() {
    const diagramId = this.getAttribute("for");
    if (!diagramId) return;

    const onTimeline = (tl: gsap.core.Timeline) => {
      this.timeline = tl;
      this.renderLabels();
    };

    const tryConnect = () => {
      const diagram = document.getElementById(diagramId) as DiagramElement | null;
      if (!diagram) return false;

      this.diagram = diagram;

      if (diagram.timeline) {
        onTimeline(diagram.timeline);
      } else {
        diagram.addEventListener(
          "ready",
          () => { if (diagram.timeline) onTimeline(diagram.timeline); },
          { once: true },
        );
      }
      return true;
    };

    // The diagram element may not be in the DOM yet (playback rendered first).
    // If not found, wait for it to appear.
    if (!tryConnect()) {
      const observer = new MutationObserver(() => {
        if (tryConnect()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  private renderLabels() {
    if (!this.timeline || !this.controls || !this.hasAttribute("labels")) return;
    const labels = this.timeline.labels;
    if (!labels || !Object.keys(labels).length) return;

    const duration = this.timeline.duration();

    // Filter out _end labels
    const visible = Object.entries(labels)
      .filter(([name]) => !name.endsWith("_end"))
      .sort((a, b) => a[1] - b[1]);

    if (!visible.length) return;

    for (const [name, time] of visible) {
      const btn = document.createElement("button");
      btn.className = "playback-btn";
      btn.style.fontSize = "0.7rem";
      const displayName = name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      btn.textContent = displayName;
      btn.title = `Seek to ${name} (${(time as number).toFixed(1)}s)`;
      btn.addEventListener("click", () => {
        this.seekTo(name);
        this.clearLabelActive();
        btn.classList.add("active");
      });
      this.labelButtons.push(btn);
      this.controls.appendChild(btn);
    }
  }

  /** Reset diagram to initial state, then seek forward so all callbacks fire correctly. */
  private seekTo(target: string | number) {
    if (!this.timeline) return;

    // Restore snapshot to clear all animation side-effects
    if (this.diagram?.snapshot) {
      this.diagram.snapshot.restoreNow();
    }

    // Seek from the start with suppressEvents=false so callbacks
    // (statusPill, colorLine, etc.) fire up to the target point
    this.timeline.pause();
    this.timeline.seek(0, true);
    this.timeline.seek(target, false);

    this.playing = false;
    if (this.toggleBtn) {
      this.toggleBtn.textContent = "\u25B6 Play";
      this.toggleBtn.classList.remove("active");
    }
  }

  private clearLabelActive() {
    for (const b of this.labelButtons) b.classList.remove("active");
  }

  private toggle() {
    if (!this.timeline || !this.toggleBtn) return;

    if (this.playing) {
      this.timeline.pause();
      this.toggleBtn.textContent = "\u25B6 Play";
      this.toggleBtn.classList.remove("active");
    } else {
      this.timeline.play();
      this.toggleBtn.textContent = "\u23F8 Pause";
      this.toggleBtn.classList.add("active");
      this.clearLabelActive();
    }
    this.playing = !this.playing;
  }

  private reset() {
    if (!this.timeline || !this.toggleBtn) return;

    this.timeline.pause();
    this.timeline.progress(0);

    if (this.diagram?.snapshot) {
      this.diagram.snapshot.restoreNow();
    }

    this.playing = false;
    this.toggleBtn.textContent = "\u25B6 Play";
    this.toggleBtn.classList.remove("active");
    this.clearLabelActive();
  }
}

// Only register once (multiple embed scripts may load on same page)
if (!customElements.get("bw-playback")) {
  customElements.define("bw-playback", PlaybackElement);
}
