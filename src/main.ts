import "./styles.css";
import { agentAccess } from "./diagrams/agent-access";
import { agentAccessArch } from "./diagrams/agent-access-arch";
import { handshake } from "./diagrams/handshake";
import { createPlaybackControls } from "./components/playback";

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

// Diagram selection: ?diagram=arch for architecture view, default for user-facing flow
const diagram = params.get("diagram");
const container = document.getElementById("app")!;

if (diagram === "arch") {
  agentAccessArch(container, (tl, trailState) => {
    const controls = createPlaybackControls(tl, { trailState });
    controls.style.margin = "0";
    controlsSlot.replaceWith(controls);
  });
} else if (diagram === "handshake") {
  handshake(container, (tl, trailState) => {
    const controls = createPlaybackControls(tl, { trailState });
    controls.style.margin = "0";
    controlsSlot.replaceWith(controls);
  });
} else {
  agentAccess(container);
}
