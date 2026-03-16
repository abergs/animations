import gsap from "gsap";
import { createNode as cn } from "../components/node";
import { createGroup } from "../components/group";
import { layoutRows as lr } from "../components/layout";
import {
  createSvgOverlay as csvg,
  drawArrow as da,
  drawMergedArrows,
} from "../components/arrows";
import { packet as _packet } from "../animations/packet";
import {
  highlight as _highlight,
  pulse as _pulse,
  colorLine,
  resetLines,
} from "../animations/effects";
import {
  statusPill as _statusPill,
  slideOut as _slideOut,
  resetStatusPills,
} from "../animations/status";
import { withTracing } from "../animations/log";

const { packet, highlight, pulse, statusPill, slideOut } = withTracing({
  packet: _packet,
  highlight: _highlight,
  pulse: _pulse,
  updateStatus: () => {},
  statusPill: _statusPill,
  slideOut: _slideOut,
});

// --- Icons ---

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
  terminal: icon(
    '<path d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z"/>',
    "#475569",
  ),
  link: icon(
    '<path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>',
    "#6366f1",
  ),
  userCheck: icon(
    '<path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>',
    "#16a34a",
  ),
  key: icon(
    '<path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"/>',
    "#175DDC",
  ),
  signal: icon(
    '<path d="M9.348 14.652a3.75 3.75 0 0 1 0-5.304m5.304 0a3.75 3.75 0 0 1 0 5.304m-7.425 2.121a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.807-3.808-9.98 0-13.788m13.788 0c3.808 3.807 3.808 9.98 0 13.788M12 12h.008v.008H12V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>',
    "#8b5cf6",
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

export function agentAccessArch(container: HTMLElement) {
  // --- Consumer nodes ---
  const claude = cn("Claude", {
    icon: icons.claude,
    iconBg: "#f0f4ff",
    subtitle: "AI Assistant",
    width: "180px",
    status: "get_credential()",
    statusColor: "#94a3b8",
  });

  const openclaw = cn("OpenClaw", {
    icon: icons.openclaw,
    iconBg: "#fef3e2",
    subtitle: "Agent Framework",
    width: "180px",
    status: "get_credential()",
    statusColor: "#94a3b8",
  });

  const buildsh = cn("build.sh", {
    icon: icons.build,
    iconBg: "#f0fdf4",
    subtitle: "CI/CD Script",
    width: "180px",
    status: "get_credential()",
    statusColor: "#94a3b8",
  });

  // --- CLI commands ---
  const cliConnect = cn("aac connect", {
    icon: icons.terminal,
    iconBg: "#f1f5f9",
    subtitle: "Agent-side command",
    width: "220px",
    status: "connect --token ABC-DEF",
    statusColor: "#94a3b8",
  });

  const cliListen = cn("aac listen", {
    icon: icons.terminal,
    iconBg: "#f1f5f9",
    subtitle: "User-side command",
    width: "220px",
    status: "on_connection_request()",
    statusColor: "#94a3b8",
  });

  // --- ap-client SDK nodes ---
  const remote = cn("RemoteClient", {
    icon: icons.link,
    iconBg: "#f0f4ff",
    subtitle: "Agent (untrusted) side",
    width: "220px",
    status: "request_credential()",
    statusColor: "#94a3b8",
  });

  const user = cn("UserClient", {
    icon: icons.userCheck,
    iconBg: "#f0fdf4",
    subtitle: "User (trusted) side",
    width: "220px",
    status: "on_credential_request()",
    statusColor: "#94a3b8",
  });

  // --- Bitwarden provider ---
  const bw = cn("Bitwarden", {
    icon: icons.shield,
    ghost: true,
    statusColor: "#94a3b8",
  });
  // Fix width so status text changes don't reflow the layout
  const bwCard = bw.querySelector('.flow-node') as HTMLElement;
  if (bwCard) bwCard.style.minWidth = '160px';

  // --- Core protocol crate nodes ---
  const proxyProto = cn("ap-proxy-protocol", {
    icon: icons.key,
    iconBg: "#e8f0fe",
    subtitle: "COSE auth · Rendezvous · Routing",
    width: "220px",
    status: "authenticate() · send()",
    statusColor: "#94a3b8",
  });

  const noise = cn("ap-noise", {
    icon: icons.signal,
    iconBg: "#f5f3ff",
    subtitle: "Noise NNpsk2 · XChaCha20Poly1305",
    width: "220px",
    status: "handshake() · encrypt()",
    statusColor: "#94a3b8",
  });

  // --- Proxy server ---
  const proxy = cn("Proxy Server", {
    icon: icons.lock,
    ghost: true,
    status: "ap-proxy · Zero-knowledge relay",
    statusColor: "#94a3b8",
  });
  proxy.style.marginTop = "1.5rem";

  // --- Groups ---
  const cliGroup = createGroup(
    "aac CLI · ap-cli",
    [cliConnect, cliListen, bw],
    {
      borderColor: "#175DDC40",
      labelColor: "#175DDC",
    },
  );

  const clientGroup = createGroup("ap-client SDK", [remote, user], {
    borderColor: "#6366f140",
    labelColor: "#6366f1",
  });

  const protoPlus = document.createElement("span");
  protoPlus.textContent = "+";
  protoPlus.className = "text-xl font-light text-slate-300";

  const protoGroup = createGroup("E2EE Protocol", [proxyProto, protoPlus, noise], {
    borderColor: "#175DDC40",
    labelColor: "#175DDC",
  });

  const consumerGroup = createGroup("AI Agents & Applications", [claude, openclaw, buildsh], {
    borderColor: "#94a3b860",
    labelColor: "#64748b",
  });


  // --- Layout ---
  lr(
    container,
    [
      [consumerGroup],
      [cliGroup],
      [clientGroup],
      [protoGroup],
      [proxy],
    ],
    {
      title: "Agent Access Protocol — Architecture",
      subtitle:
        "Layered Rust crate architecture for end-to-end encrypted credential delivery",
      rowGap: "2.5rem",
      nodeGap: "2rem",
    },
  );

  // Align left edges of the three architecture groups by matching widths
  requestAnimationFrame(() => {
    const maxWidth = Math.max(
      cliGroup.offsetWidth,
      clientGroup.offsetWidth,
      protoGroup.offsetWidth,
    );
    for (const g of [cliGroup, clientGroup, protoGroup]) {
      g.style.width = maxWidth + "px";
      g.style.boxSizing = "border-box";
    }
  });

  // --- Arrows ---
  requestAnimationFrame(() => {
    const svg = csvg(container);

    // Consumers group → CLI group (step-round)
    const a_consumers_cli = da(svg, consumerGroup, cliGroup, {
      color: "#cbd5e1",
      curve: "step-round",
      noArrow: true,
    });

    // aac listen — Bitwarden (horizontal, no arrow)
    da(svg, cliListen, bw, {
      color: "#cbd5e1",
      curve: "straight",
      fromAnchor: "right",
      toAnchor: "left",
      noArrow: true,
    });

    // CLI group → client group (step-round)
    const a_cli_clients = da(svg, cliGroup, clientGroup, {
      color: "#cbd5e1",
      curve: "step-round",
      noArrow: true,
    });

    // Client group → protocol group (step-round)
    const a_client_proto = da(svg, clientGroup, protoGroup, {
      color: "#cbd5e1",
      curve: "step-round",
      noArrow: true,
    });

    // Protocol group → proxy (step-round, dashed = tunnel boundary)
    const a_proto_proxy = da(svg, protoGroup, proxy, {
      color: "#cbd5e1",
      curve: "step-round",
      style: "dashed",
      noArrow: true,
    });

    // Right-side path (upward): Proxy → ap-noise → UserClient → aac listen → Bitwarden
    const a_proxy_noise = da(svg, proxy, noise, {
      color: "#cbd5e1",
      curve: "step-round",
      style: "dashed",
      noArrow: true,
    });
    const a_noise_user = da(svg, noise, user, {
      color: "#cbd5e1",
      curve: "step-round",
      noArrow: true,
    });
    const a_user_listen = da(svg, user, cliListen, {
      color: "#cbd5e1",
      curve: "step-round",
      noArrow: true,
    });

    // --- Helper: packet with a smooth colored trail ---
    const trailOverlays: SVGPathElement[] = [];

    // Constant speed: compute duration from path length
    const SPEED = 400; // pixels per second

    function packetWithTrail(
      tl: gsap.core.Timeline,
      path: SVGPathElement,
      color: string,
      targetNode?: HTMLElement,
    ) {
      const len = path.getTotalLength();
      const duration = len / SPEED;
      const pos = tl.duration();

      // Create colored overlay path
      const overlay = path.cloneNode() as SVGPathElement;
      overlay.setAttribute("stroke", color);
      overlay.setAttribute("stroke-width", "1.5");
      overlay.setAttribute("fill", "none");
      overlay.removeAttribute("stroke-dasharray");
      overlay.style.strokeDasharray = String(len);
      overlay.style.strokeDashoffset = String(len);
      path.parentElement!.appendChild(overlay);
      trailOverlays.push(overlay);

      // Animate trail reveal in sync with packet
      tl.to(overlay, {
        strokeDashoffset: 0,
        duration,
        ease: "none",
      }, pos);

      // Animate packet on top
      packet(tl, path, { color, duration, noEntry: true, noExit: true }, pos);

      // Pulse the target node's status pill when packet arrives
      if (targetNode) {
        pulse(tl, targetNode, { color });
      }
    }

    // --- Animation: packet flows down left side, up right side ---
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    // Request: build.sh → aac connect → RemoteClient → ap-proxy-protocol → Proxy
    statusPill(tl, buildsh, "get_credential()");
    tl.to({}, { duration: 0.3 });

    packetWithTrail(tl, a_consumers_cli, "#175DDC", cliConnect);
    packetWithTrail(tl, a_cli_clients, "#175DDC", clientGroup);
    packetWithTrail(tl, a_client_proto, "#175DDC", protoGroup);
    packetWithTrail(tl, a_proto_proxy, "#175DDC", proxy);
    tl.to({}, { duration: 0.3 });

    // Response: Proxy → ap-noise → UserClient → aac listen → Bitwarden
    packetWithTrail(tl, a_proxy_noise, "#175DDC", noise);
    packetWithTrail(tl, a_noise_user, "#175DDC", user);
    packetWithTrail(tl, a_user_listen, "#175DDC", cliListen);
    highlight(tl, bw, { color: "#175DDC" });
    statusPill(tl, bw, "Credential requested", { color: "#175DDC" });

    tl.to({}, { duration: 1.5 });

    // Reset: hide all trail overlays
    tl.call(() => {
      for (const o of trailOverlays) {
        const len = o.getTotalLength();
        o.style.strokeDashoffset = String(len);
      }
    });
    resetStatusPills(tl);

    tl.play();
  });
}
