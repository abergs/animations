import gsap from "gsap";
import { createNode as cn } from "../components/node";
import { layoutRows as lr } from "../components/layout";
import { createSvgOverlay as csvg, drawArrow as da, drawMergedArrows } from "../components/arrows";
import { packet as _packet } from "../animations/packet";
import { highlight as _highlight, pulse as _pulse, colorLine, resetLines } from "../animations/effects";
import {
  statusPill as _statusPill,
  slideOut as _slideOut,
  resetStatusPills,
} from "../animations/status";
import { withTracing } from "../animations/log";
import { createSnapshot } from "../animations/snapshot";

const { packet, highlight, pulse, statusPill, slideOut } = withTracing({
  packet: _packet,
  highlight: _highlight,
  pulse: _pulse,
  updateStatus: () => {},
  statusPill: _statusPill,
  slideOut: _slideOut,
});

// --- Icons (Heroicons-style inline SVGs) ---

const icon = (d: string, color = "#475569") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${d}</svg>`;

const icons = {
  claude: icon(
    '<path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"/>',
    "#6366f1",
  ),
  openclaw: icon(
    '<path d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z"/>',
    "#ea580c",
  ),
  build: icon(
    '<path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.248a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><circle cx="12" cy="12" r="3"/>',
    "#16a34a",
  ),
  key: icon(
    '<path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"/>',
    "#175DDC",
  ),
  lock: icon(
    '<path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>',
    "#64748b",
  ),
  shield: icon(
    '<path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/>',
    "#175DDC",
  ),
};

export default function agentAccess(
  container: HTMLElement,
  onReady?: (tl: gsap.core.Timeline, snapshot: import("../animations/snapshot").Snapshot) => void,
) {
  // --- Create nodes ---

  const claude = cn("Claude", {
    icon: icons.claude,
    iconBg: "#f0f4ff",
    subtitle: "AI Assistant",
    width: "260px",
    status: "Idle",
    statusColor: "#94a3b8",
  });

  const openclaw = cn("OpenClaw", {
    icon: icons.openclaw,
    iconBg: "#fef3e2",
    subtitle: "Agent Framework",
    width: "260px",
    status: "Idle",
    statusColor: "#94a3b8",
  });

  const buildsh = cn("build.sh", {
    icon: icons.build,
    iconBg: "#f0fdf4",
    subtitle: "CI/CD Script",
    width: "260px",
    status: "Requesting credentials",
    statusColor: "#175DDC",
  });

  const cli = cn("Agent Access", {
    icon: icons.key,
    iconBg: "#e8f0fe",
    subtitle: "Creates encrypted tunnel",
    status: "Idle",
    statusColor: "#94a3b8",
  });

  const proxy = cn("E2E Proxy", {
    icon: icons.lock,
    ghost: true,
    status: "Idle",
    statusColor: "#94a3b8",
  });

  const bw = cn("Password Manager", {
    icon: icons.shield,
    iconBg: "#e8f0fe",
    subtitle: "Running on your device",
    status: "Awaiting request",
    statusColor: "#94a3b8",
  });

  // --- Layout ---

  lr(
    container,
    [
      { nodes: [claude, openclaw, buildsh], label: "AI Agents & Applications" },
      [cli],
      [proxy],
      [bw],
    ],
    {
      title: "Bitwarden Agent Access",
      subtitle:
        "Secure credential delivery for AI agents via end-to-end encrypted tunnel",
      rowGap: "2.5rem",
      nodeGap: "2rem",
    },
  );

  // --- Arrows ---

  requestAnimationFrame(() => {
    const svg = csvg(container);

    // Agents → CLI (converging funnel)
    const merged = drawMergedArrows(svg, [claude, openclaw, buildsh], cli, { color: "#cbd5e1", noArrow: true });
    const [, , a_buildsh_cli] = merged.paths;
    const buildshBranch = merged.branches[2]!;
    const lowerTrunk = merged.lowerTrunk;

    // CLI → Proxy → BW (dashed = encrypted tunnel)
    const a_cli_proxy = da(svg, cli, proxy, {
      color: "#cbd5e1",
      style: "dashed",
      noArrow: true,
    });
    const a_proxy_bw = da(svg, proxy, bw, { color: "#cbd5e1", style: "dashed", noArrow: true });

    // Combined invisible path CLI→Proxy→BW for smooth packet transit
    const combinedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d1 = a_cli_proxy.getAttribute("d")!;
    const d2 = a_proxy_bw.getAttribute("d")!;
    // Strip the leading "M x y" from the second path so it continues from where the first ends
    combinedPath.setAttribute("d", d1 + " " + d2.replace(/^M\s*[\d.]+\s+[\d.]+\s*/, ""));
    combinedPath.setAttribute("stroke", "none");
    combinedPath.setAttribute("fill", "none");
    svg.appendChild(combinedPath);

    // Capture initial state for clean reset
    const snap = createSnapshot()
      .captureAll(container)
      .trackSvg(svg);

    // --- Animation timeline ---

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    // 1. build.sh needs a credential
    statusPill(tl, buildsh, "Needs credentials");
    tl.to({}, { duration: 0.3 });

    // 2. Request: build.sh → CLI
    packet(tl, a_buildsh_cli, { color: "#175DDC", duration: 1.2 });
    colorLine(tl, [buildshBranch, lowerTrunk], "#175DDC");
    pulse(tl, cli, { color: "#175DDC" });
    statusPill(tl, cli, "Encrypting request");
    tl.to({}, { duration: 0.4 });

    // 3–4. Request flows through: CLI → Proxy → BW (single smooth packet)
    const tunnelFwdStart = tl.duration();
    packet(tl, combinedPath, { color: "#175DDC", duration: 2.0 });
    // Color segments and update statuses at midpoint (when packet passes proxy)
    colorLine(tl, a_cli_proxy, "#175DDC", tunnelFwdStart + 1.0);
    statusPill(tl, proxy, "Relaying…", { color: "#175DDC" }, tunnelFwdStart + 1.0);
    colorLine(tl, a_proxy_bw, "#175DDC", tunnelFwdStart + 2.0);
    pulse(tl, bw, { color: "#175DDC" });
    statusPill(tl, bw, "build.sh wants github.com");

    // 5. Approval
    statusPill(tl, bw, "Approve access?", { color: "#f59e0b" });
    tl.to({}, { duration: 1.0 });

    tl.addLabel("approval");
    const clipboardIcon = icon(
      '<path d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3a2.25 2.25 0 0 0-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.334a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/>',
      "#64748b",
    );
    slideOut(
      tl,
      bw,
      "build.sh accessed github.com credentials",
      { icon: clipboardIcon, color: "#64748b", direction: "right", duration: 8 },
      "approval",
    );
    highlight(tl, bw, { color: "#10b981" });
    statusPill(tl, bw, "Approved ✓", { color: "#10b981" });
    tl.to({}, { duration: 0.5 });

    // 6–7. Credential flows back through: BW → Proxy → CLI (single smooth packet)
    const tunnelRevStart = tl.duration();
    packet(tl, combinedPath, { color: "#10b981", duration: 2.0, reverse: true });
    colorLine(tl, a_proxy_bw, "#10b981", tunnelRevStart + 1.0);
    statusPill(tl, proxy, "Relaying…", { color: "#10b981" }, tunnelRevStart + 1.0);
    colorLine(tl, [a_cli_proxy, lowerTrunk, buildshBranch], "#10b981", tunnelRevStart + 2.0);
    statusPill(tl, cli, "Decrypting credential", { color: "#10b981" });
    tl.to({}, { duration: 0.4 });

    // 8. CLI → build.sh
    packet(tl, a_buildsh_cli, { color: "#10b981", duration: 1.2, reverse: true });
    highlight(tl, buildsh, { color: "#10b981" });
    statusPill(tl, buildsh, "Credential received ✓", {
      color: "#10b981",
    });

    tl.to({}, { duration: 1.5 });

    // Reset all status pills and line colors before repeat
    resetStatusPills(tl);
    resetLines(tl);

    tl.play();

    if (onReady) onReady(tl, snap);
  });
}
