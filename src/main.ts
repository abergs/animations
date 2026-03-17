import "./styles.css";
import { createPlaybackControls } from "./components/playback";
import type { Snapshot } from "./animations/snapshot";

// Auto-discover all diagram modules
const modules = import.meta.glob<{ default: (container: HTMLElement, onReady?: (tl: gsap.core.Timeline, snapshot: Snapshot) => void) => void }>("./diagrams/*.ts");

// Extract route names from file paths: "./diagrams/handshake.ts" → "handshake"
const routes = Object.fromEntries(
  Object.entries(modules).map(([path, loader]) => {
    const name = path.split("/").pop()!.replace(/\.ts$/, "");
    return [name, loader];
  })
);

// Dark mode: read from URL and persist via query param
const params = new URLSearchParams(window.location.search);
const isDark = params.get("theme") === "dark";
if (isDark) document.body.classList.add("dark");

// --- Top toolbar (fixed) ---
const toolbar = document.createElement("div");
toolbar.className = "top-toolbar";

const darkToggle = document.createElement("button");
darkToggle.className = "playback-btn";
darkToggle.textContent = isDark ? "☀ Light" : "☾ Dark";
darkToggle.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  darkToggle.textContent = dark ? "☀ Light" : "☾ Dark";
  const url = new URL(window.location.href);
  if (dark) {
    url.searchParams.set("theme", "dark");
  } else {
    url.searchParams.delete("theme");
  }
  window.history.replaceState(null, "", url.toString());
});

const homeLink = document.createElement("a");
homeLink.href = "/";
homeLink.className = "playback-btn";
homeLink.style.position = "absolute";
homeLink.style.left = "16px";
homeLink.textContent = "← Home";
toolbar.appendChild(homeLink);

toolbar.appendChild(darkToggle);
document.body.prepend(toolbar);

// --- Router ---
const container = document.getElementById("app")!;
const routeName = window.location.pathname.replace(/^\//, "").replace(/\/$/, "");

// Check if this is an embed page: "agent-access/embed" → diagram="agent-access"
const embedMatch = routeName.match(/^(.+)\/embed$/);
const embedDiagram = embedMatch?.[1];

if (embedDiagram && routes[embedDiagram]) {
  const formatLabel = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  document.title = `Embed ${formatLabel(embedDiagram)} — Diagram Animations`;

  const baseUrl = "https://animations.andersaberg.com";
  const tagName = `bw-diagram-${embedDiagram}`;
  const scriptUrl = `${baseUrl}/embed/${embedDiagram}.js`;

  container.innerHTML = `
    <div style="max-width: 960px; margin: 0 auto; padding-top: 2rem;">
      <h1 style="font-size: 1.5rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.25rem;"
          class="text-slate-800">
        Embed: ${formatLabel(embedDiagram)}
      </h1>
      <p style="font-size: 0.9rem; margin-bottom: 2rem;"
         class="text-slate-500">
        Add this diagram to any page with a single script tag.
      </p>

      <h2 style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;"
          class="text-slate-400">Basic usage</h2>
      <pre class="embed-code-block" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.8rem; line-height: 1.6; overflow-x: auto; margin-bottom: 1.5rem; position: relative;"><code>&lt;script src="${scriptUrl}"&gt;&lt;/script&gt;
&lt;${tagName}&gt;&lt;/${tagName}&gt;</code></pre>

      <h2 style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;"
          class="text-slate-400">With external playback controls</h2>
      <pre class="embed-code-block" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.8rem; line-height: 1.6; overflow-x: auto; margin-bottom: 1.5rem; position: relative;"><code>&lt;script src="${scriptUrl}"&gt;&lt;/script&gt;
&lt;bw-playback for="demo" mode="auto" labels&gt;&lt;/bw-playback&gt;
&lt;${tagName} id="demo" mode="auto"&gt;&lt;/${tagName}&gt;</code></pre>

      <h2 style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;"
          class="text-slate-400">Static screenshot (paused at a specific point)</h2>
      <pre class="embed-code-block" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem 1.25rem; font-size: 0.8rem; line-height: 1.6; overflow-x: auto; margin-bottom: 1.5rem; position: relative;"><code>&lt;script src="${scriptUrl}"&gt;&lt;/script&gt;

&lt;!-- Paused at a named label --&gt;
&lt;${tagName} paused at="approval"&gt;&lt;/${tagName}&gt;

&lt;!-- Paused at a specific time (seconds) --&gt;
&lt;${tagName} paused at="3.5"&gt;&lt;/${tagName}&gt;</code></pre>

      <h2 style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;"
          class="text-slate-400">Attributes</h2>
      <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse; margin-bottom: 2rem;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0;">
            <th style="text-align: left; padding: 6px 8px; font-weight: 600;" class="text-slate-600">Attribute</th>
            <th style="text-align: left; padding: 6px 8px; font-weight: 600;" class="text-slate-600">Values</th>
            <th style="text-align: left; padding: 6px 8px; font-weight: 600;" class="text-slate-600">Description</th>
          </tr>
        </thead>
        <tbody class="text-slate-600">
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px;"><code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.8rem;">mode</code></td>
            <td style="padding: 6px 8px;"><code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem;">light</code> <code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem;">dark</code> <code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem;">auto</code></td>
            <td style="padding: 6px 8px;">Color theme. <code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem;">auto</code> follows <code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem;">prefers-color-scheme</code></td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px;"><code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.8rem;">paused</code></td>
            <td style="padding: 6px 8px;">boolean</td>
            <td style="padding: 6px 8px;">Start paused instead of autoplaying</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 6px 8px;"><code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.8rem;">at</code></td>
            <td style="padding: 6px 8px;">label or seconds</td>
            <td style="padding: 6px 8px;">Seek to a timeline label or time, e.g. <code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem;">at="phase2"</code> or <code style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 0.75rem;">at="3.5"</code>. Implies paused.</td>
          </tr>
        </tbody>
      </table>

      <h2 style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem;"
          class="text-slate-400">Live preview</h2>
      <div id="embed-preview-controls" style="display: flex; gap: 6px; margin-bottom: 1rem;"></div>
      <div id="embed-preview" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; transition: background-color 0.3s; margin-bottom: 2rem;"></div>
    </div>
  `;

  // Build preview controls (mode switcher only — playback is inside the embed)
  const previewControls = container.querySelector("#embed-preview-controls")!;
  const previewBox = container.querySelector("#embed-preview") as HTMLElement;
  let currentMode = "auto";

  for (const mode of ["auto", "light", "dark"]) {
    const btn = document.createElement("button");
    btn.className = `playback-btn${mode === "auto" ? " active" : ""}`;
    btn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    btn.addEventListener("click", () => {
      currentMode = mode;
      previewControls.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      updatePreview();
    });
    previewControls.appendChild(btn);
  }

  function updatePreview() {
    const isDarkPreview = currentMode === "dark" ||
      (currentMode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    previewBox.style.backgroundColor = isDarkPreview ? "#0d1117" : "#ffffff";
    previewBox.style.borderColor = isDarkPreview ? "#30363d" : "#e2e8f0";

    // Recreate the iframe to reload with new mode
    previewBox.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "width: 100%; border: none; min-height: 500px;";

    if (import.meta.env.DEV) {
      iframe.src = `/embed-preview.html#diagram=${embedDiagram}&mode=${currentMode}`;
    } else {
      iframe.srcdoc = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>body { margin: 0; background: ${isDarkPreview ? "#0d1117" : "#ffffff"}; }</style>
</head><body>
<script src="/embed/${embedDiagram}.js"><\/script>
<bw-playback for="demo" mode="${currentMode}" labels></bw-playback>
<${tagName} id="demo" mode="${currentMode}"></${tagName}>
</body></html>`;
    }
    previewBox.appendChild(iframe);

    // Auto-resize iframe to content height
    iframe.addEventListener("load", () => {
      const resize = () => {
        try {
          const h = iframe.contentDocument?.documentElement.scrollHeight;
          if (h) iframe.style.height = h + "px";
        } catch { /* cross-origin guard */ }
      };
      resize();
      // Re-check after animations have laid out
      setTimeout(resize, 500);
      setTimeout(resize, 1500);
    });
  }

  updatePreview();

} else if (routeName && routes[routeName]) {
  // Add playback controls slot to toolbar for diagram pages
  const controlsSlot = document.createElement("div");
  controlsSlot.className = "playback-controls";
  controlsSlot.style.margin = "0";
  toolbar.prepend(controlsSlot);

  const formatLabel = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  document.title = `${formatLabel(routeName)} — Diagram Animations`;

  const editLink = document.createElement("a");
  editLink.href = `https://github.com/abergs/animations/edit/main/src/diagrams/${routeName}.ts`;
  editLink.target = "_blank";
  editLink.rel = "noopener";
  editLink.className = "playback-btn";
  editLink.textContent = "✎ Edit";
  toolbar.appendChild(editLink);

  // Embed button
  const embedLink = document.createElement("a");
  embedLink.href = `/${routeName}/embed`;
  embedLink.className = "playback-btn";
  embedLink.textContent = "</> Embed";
  toolbar.appendChild(embedLink);

  routes[routeName]().then((mod) => mod.default(container, (tl: gsap.core.Timeline, snapshot: Snapshot) => {
    // Expose timeline + snapshot for automated capture (Playwright)
    if (params.has('capture')) {
      (window as any).__capture = { timeline: tl, snapshot };
    }

    const controls = createPlaybackControls(tl, { snapshot });
    controls.style.margin = "0";
    controlsSlot.replaceWith(controls);
  }));
} else if (!routeName) {
  // Index page
  container.innerHTML = `
    <div style="max-width: 640px; margin: 0 auto; padding-top: 4rem;">
      <h1 style="font-size: 1.75rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.25rem;"
          class="text-slate-800 dark:text-slate-100">
        Diagram Animations
      </h1>
      <p style="font-size: 0.95rem; margin-bottom: 2.5rem;"
         class="text-slate-500 dark:text-slate-400">
        Interactive architecture &amp; protocol diagrams built with GSAP.
      </p>
      <div id="diagram-list" style="display: flex; flex-direction: column; gap: 0;"></div>
    </div>
  `;

  const list = container.querySelector("#diagram-list")!;

  for (const name of Object.keys(routes).sort()) {
    const label = name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const card = document.createElement("a");
    card.href = `/${name}`;
    card.style.cssText = `
      display: flex; align-items: center; gap: 1rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border, #e2e8f0);
      text-decoration: none;
      transition: background 0.15s;
    `;
    card.className = "diagram-card";
    card.innerHTML = `
      <div style="
        width: 36px; height: 36px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 1rem; flex-shrink: 0;
        background: #f1f5f9; color: #475569;
      " class="diagram-card-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z"/>
          <path d="M13.5 15.75v2.25m3-5.25v5.25m3-3v3"/>
        </svg>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 0.95rem; letter-spacing: -0.01em;"
             class="text-slate-800 dark:text-slate-100">${label}</div>
        <div style="font-size: 0.8rem; margin-top: 1px;"
             class="text-slate-400 dark:text-slate-500">/${name}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; opacity: 0.3;">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    `;
    list.appendChild(card);
  }
} else {
  // Unknown route
  document.title = "Not Found — Diagram Animations";
  container.innerHTML = `
    <div style="max-width: 640px; margin: 0 auto; padding-top: 6rem; text-align: center;">
      <p style="font-size: 4rem; margin-bottom: 0.5rem; opacity: 0.15;">?</p>
      <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;"
         class="text-slate-800 dark:text-slate-200">
        Diagram not found
      </p>
      <p style="font-size: 0.9rem; margin-bottom: 2rem;"
         class="text-slate-500 dark:text-slate-400">
        No diagram called <code id="route-code" style="padding: 2px 6px; border-radius: 4px; background: #f1f5f9; font-size: 0.85rem;"
        class="dark:bg-slate-800"></code>
      </p>
      <a href="/" style="font-size: 0.9rem; text-decoration: none; font-weight: 500;"
         class="text-blue-600 dark:text-blue-400 hover:underline">
        &larr; All diagrams
      </a>
    </div>
  `;
  container.querySelector("#route-code")!.textContent = `"${routeName}"`;
}
