import "./styles.css";
import { createPlaybackControls } from "./components/playback";

// Auto-discover all diagram modules
const modules = import.meta.glob<{ default: (container: HTMLElement, onReady?: (tl: gsap.core.Timeline, snapshot: any) => void) => void }>("./diagrams/*.ts");

// Extract route names from file paths: "./diagrams/handshake.ts" → "handshake"
const routes = Object.fromEntries(
  Object.entries(modules).map(([path, loader]) => {
    const name = path.replace("./diagrams/", "").replace(".ts", "");
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

// Playback controls placeholder — will be wired when timeline is ready
const controlsSlot = document.createElement("div");
controlsSlot.className = "playback-controls";
controlsSlot.style.margin = "0";

toolbar.appendChild(controlsSlot);
toolbar.appendChild(darkToggle);
document.body.prepend(toolbar);

// --- Router ---
const container = document.getElementById("app")!;
const routeName = window.location.pathname.replace(/^\//, "").replace(/\/$/, "");

function onReady(tl: gsap.core.Timeline, snapshot: any) {
  const controls = createPlaybackControls(tl, { snapshot });
  controls.style.margin = "0";
  controlsSlot.replaceWith(controls);
}

if (routeName && routes[routeName]) {
  // Load the matched diagram
  routes[routeName]().then((mod) => mod.default(container, onReady));
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
  container.innerHTML = `
    <div style="max-width: 640px; margin: 0 auto; padding-top: 6rem; text-align: center;">
      <p style="font-size: 4rem; margin-bottom: 0.5rem; opacity: 0.15;">?</p>
      <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;"
         class="text-slate-800 dark:text-slate-200">
        Diagram not found
      </p>
      <p style="font-size: 0.9rem; margin-bottom: 2rem;"
         class="text-slate-500 dark:text-slate-400">
        No diagram called <code style="padding: 2px 6px; border-radius: 4px; background: #f1f5f9; font-size: 0.85rem;"
        class="dark:bg-slate-800">"${routeName}"</code>
      </p>
      <a href="/" style="font-size: 0.9rem; text-decoration: none; font-weight: 500;"
         class="text-blue-600 dark:text-blue-400 hover:underline">
        &larr; All diagrams
      </a>
    </div>
  `;
}
