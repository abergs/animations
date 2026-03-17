import gsap from "gsap";
import { createNode as cn } from "../components/node";
import { createPhasePanel } from "../components/phase";
import { layoutRows as lr } from "../components/layout";
import { createSvgOverlay as csvg, drawArrow as da } from "../components/arrows";
import { packet as _packet } from "../animations/packet";
import {
  highlight as _highlight,
  pulse as _pulse,
  resetLines,
} from "../animations/effects";
import {
  statusPill as _statusPill,
  resetStatusPills,
} from "../animations/status";
import {
  resetTrails,
  createTrailState,
} from "../animations/trail";
import { createSnapshot } from "../animations/snapshot";
import { withTracing } from "../animations/log";

const { packet, highlight, pulse, statusPill } = withTracing({
  packet: _packet,
  highlight: _highlight,
  pulse: _pulse,
  updateStatus: () => {},
  statusPill: _statusPill,
  slideOut: () => {},
});

// --- Icons ---

const icon = (d: string, color = "#475569") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">${d}</svg>`;

const icons = {
  terminal: icon(
    '<path d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75v10.5A2.25 2.25 0 0 0 4.5 19.5Z"/>',
    "#475569",
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

/** Create a ghost participant node for use inside phase panels */
function participant(label: string, iconSvg: string) {
  const node = cn(label, {
    icon: iconSvg, ghost: true,
    status: "\u00A0", // reserve space for status pill
    statusColor: "#94a3b8",
  });
  const card = node.querySelector('.flow-node') as HTMLElement;
  if (card) {
    card.style.width = '160px';
    card.style.textAlign = 'center';
  }
  return node;
}

export function handshake(
  container: HTMLElement,
  onReady?: (tl: gsap.core.Timeline, trailState: import("../animations/trail").TrailState, snapshot: import("../animations/snapshot").Snapshot) => void,
) {
  // === Participant ghost nodes per phase (each phase gets its own set) ===
  const p1Remote = participant("Remote Agent", icons.terminal);
  const p1Proxy = participant("Proxy", icons.lock);
  const p1User = participant("User Device", icons.shield);

  const p2Remote = participant("Remote Agent", icons.terminal);
  const p2Proxy = participant("Proxy", icons.lock);
  const p2User = participant("User Device", icons.shield);

  const p3Remote = participant("Remote Agent", icons.terminal);
  const p3Proxy = participant("Proxy", icons.lock);
  const p3User = participant("User Device", icons.shield);

  const p4Remote = participant("Remote Agent", icons.terminal);
  const p4Proxy = participant("Proxy", icons.lock);
  const p4User = participant("User Device", icons.shield);

  // === Phase panels ===
  const phase1 = createPhasePanel(
    "Phase 1 — Authenticate",
    [p1Remote, p1Proxy, p1User],
    [
      { text: "Both devices connect via WebSocket", detail: "ws://proxy:8080" },
      { text: "Proxy sends 32-byte challenge to each client" },
      { text: "Clients sign challenge with identity key", detail: "COSE_Sign1 · Ed25519" },
      { text: "Proxy verifies signatures, authenticates both sides" },
      { text: "Both identities confirmed — ready for discovery" },
    ],
    { borderColor: "#175DDC40", labelColor: "#175DDC", description: "Both devices prove their identity to the proxy using cryptographic signatures. No passwords or tokens — just public key cryptography." },
  );

  // Phase 2 has two modes: Rendezvous (default) and PSK
  const phase2Rendezvous = createPhasePanel(
    "Phase 2 — Discover",
    [p2Remote, p2Proxy, p2User],
    [
      { text: "User device asks proxy to generate a code", detail: "GetRendezvous()" },
      { text: "Proxy generates and returns 9-char code", detail: "ABC-DEF-GHI · 5 min TTL" },
      { text: "User shares code with the remote agent (out-of-band)" },
      { text: "Remote sends code to proxy", detail: "GetIdentity(code)" },
      { text: "Proxy returns user's identity + fingerprint" },
      { text: "User verifies fingerprint to confirm peer" },
      { text: "Both peers discovered — ready for encryption" },
    ],
    { borderColor: "#10b98140", labelColor: "#10b981", description: "The user device asks the proxy to generate a short-lived rendezvous code. The user shares this code out-of-band with the remote agent, who sends it back to the proxy to discover the user's identity." },
  );

  // PSK variant participants
  const p2pRemote = participant("Remote Agent", icons.terminal);
  const p2pProxy = participant("Proxy", icons.lock);
  const p2pUser = participant("User Device", icons.shield);

  const phase2Psk = createPhasePanel(
    "Phase 2 — Discover",
    [p2pRemote, p2pProxy, p2pUser],
    [
      { text: "User device generates a pre-shared key", detail: "Psk::generate() · 32 bytes" },
      { text: "User creates a PSK token", detail: "<64-hex-psk>_<64-hex-fingerprint>" },
      { text: "User shares token with remote agent (out-of-band)" },
      { text: "Remote parses PSK + fingerprint from token" },
      { text: "No fingerprint verification needed", detail: "Trust via shared secret" },
      { text: "Both peers discovered — ready for encryption" },
    ],
    { borderColor: "#10b98140", labelColor: "#10b981", description: "The user device generates a PSK token containing a secret and their fingerprint. Shared via QR code, NFC, or secure message. No rendezvous code or fingerprint verification needed." },
  );

  // Toggle buttons in the label bars
  let showingPsk = false;
  phase2Psk.style.display = "none";

  function toggle() {
    showingPsk = !showingPsk;
    phase2Rendezvous.style.display = showingPsk ? "none" : "";
    phase2Psk.style.display = showingPsk ? "" : "none";
  }

  function addToggleToLabel(panel: HTMLElement, text: string) {
    const labelBar = panel.querySelector(".phase-label-bar");
    if (!labelBar) return;
    const btn = document.createElement("button");
    btn.className = "phase-toggle-btn";
    btn.textContent = text;
    btn.addEventListener("click", toggle);
    labelBar.appendChild(btn);
  }

  addToggleToLabel(phase2Rendezvous, "Switch to PSK");
  addToggleToLabel(phase2Psk, "Switch to Rendezvous");

  const phase2Container = document.createElement("div");
  phase2Container.appendChild(phase2Rendezvous);
  phase2Container.appendChild(phase2Psk);

  const phase2 = phase2Container;

  const phase3 = createPhasePanel(
    "Phase 3 — Encrypt",
    [p3Remote, p3Proxy, p3User],
    [
      { text: "Remote sends ephemeral public key", detail: "Noise msg1 · Curve25519" },
      { text: "Proxy relays message (cannot read it)" },
      { text: "User responds with DH result", detail: "Noise msg2 · derives keys" },
      { text: "Both sides derive 4 symmetric keys", detail: "XChaCha20Poly1305" },
      { text: "E2E tunnel established — proxy cannot decrypt" },
    ],
    { borderColor: "#8b5cf640", labelColor: "#8b5cf6", description: "A Noise NNpsk2 handshake establishes end-to-end encryption. The proxy relays the messages but can never read them." },
  );

  const phase4 = createPhasePanel(
    "Phase 4 — Credential Exchange",
    [p4Remote, p4Proxy, p4User],
    [
      { text: "Remote sends encrypted credential request", detail: "CredentialRequest { domain }" },
      { text: "Proxy relays encrypted blob (cannot read it)" },
      { text: "User decrypts, sees domain + approves", detail: "on_credential_request()" },
      { text: "User encrypts credential + sends response", detail: "CredentialResponse { data }" },
      { text: "Remote decrypts and receives credential" },
      { text: "Session cached for reconnection", detail: "MultiDeviceTransport · random nonces" },
      { text: "Credential delivered — session ready for reuse" },
    ],
    { borderColor: "#f59e0b40", labelColor: "#f59e0b", description: "Credentials flow through the encrypted tunnel. The user approves each request. Sessions are cached with random nonces for multi-device support." },
  );

  // === Layout ===
  lr(
    container,
    [
      [phase1],
      [phase2],
      [phase3],
      [phase4],
    ],
    {
      title: "Agent Access — Handshake",
      subtitle:
        "How two devices establish an end-to-end encrypted tunnel through a zero-knowledge proxy",
      rowGap: "2.5rem",
      nodeGap: "1.5rem",
    },
  );

  // Match phase panel widths
  requestAnimationFrame(() => {
    const maxW = Math.max(phase1.offsetWidth, phase2Rendezvous.offsetWidth, phase2Psk.offsetWidth, phase3.offsetWidth, phase4.offsetWidth);
    for (const p of [phase1, phase2Rendezvous, phase2Psk, phase3, phase4]) {
      p.style.width = maxW + 'px';
      p.style.boxSizing = 'border-box';
    }
  });

  // === Arrows & Animation ===
  requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const svg = csvg(container);

    // Horizontal arrows per phase
    function phaseArrows(r: HTMLElement, p: HTMLElement, u: HTMLElement) {
      return {
        r2p: da(svg, r, p, { color: "#cbd5e1", curve: "straight", fromAnchor: "right", toAnchor: "left", noArrow: true }),
        p2u: da(svg, p, u, { color: "#cbd5e1", curve: "straight", fromAnchor: "right", toAnchor: "left", noArrow: true }),
      };
    }
    const a1 = phaseArrows(p1Remote, p1Proxy, p1User);
    const a2 = phaseArrows(p2Remote, p2Proxy, p2User);
    const a2p = phaseArrows(p2pRemote, p2pProxy, p2pUser);
    const a3 = phaseArrows(p3Remote, p3Proxy, p3User);
    const a4 = phaseArrows(p4Remote, p4Proxy, p4User);

    // --- Step list references ---
    const p1Steps = phase1.querySelectorAll('.phase-step');
    const p2Steps = phase2Rendezvous.querySelectorAll('.phase-step');
    const p3Steps = phase3.querySelectorAll('.phase-step');
    const p4Steps = phase4.querySelectorAll('.phase-step');
    const allSteps = [...p1Steps, ...p2Steps, ...p3Steps, ...p4Steps];

    function step(tl: gsap.core.Timeline, s: Element, state: 'active' | 'done') {
      tl.call(() => {
        if (state === 'active') { s.classList.add('active'); s.classList.remove('done'); }
        else { s.classList.remove('active'); s.classList.add('done'); }
      });
    }
    // Consistent packet speed
    const spd = 0.7;
    const pause = 0.5;
    const phasePause = 1.0;

    // --- Animation ---
    const trailState = createTrailState();

    // Capture initial state for clean reset
    const snap = createSnapshot()
      .captureAll(container)
      .trackSvg(svg)
      .trackTrails(trailState);
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });
    const blue = "#175DDC";
    const green = "#10b981";
    const purple = "#8b5cf6";
    const amber = "#f59e0b";

    // ──── PHASE 1: AUTHENTICATE ────

    // 1. Both devices connect
    step(tl, p1Steps[0], 'active');
    statusPill(tl, p1Remote, "Connecting…", { color: blue });
    packet(tl, a1.r2p, { color: blue, duration: spd });
    pulse(tl, p1Proxy, { color: blue });
    tl.to({}, { duration: 0.3 });
    statusPill(tl, p1User, "Connecting…", { color: blue });
    packet(tl, a1.p2u, { color: blue, duration: spd, reverse: true });
    statusPill(tl, p1Proxy, "Both connected", { color: blue });
    step(tl, p1Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Proxy sends challenges
    step(tl, p1Steps[1], 'active');
    statusPill(tl, p1Proxy, "Sending challenge", { color: blue });
    packet(tl, a1.r2p, { color: blue, duration: spd, reverse: true });
    statusPill(tl, p1Remote, "Got challenge", { color: blue });
    tl.to({}, { duration: 0.2 });
    packet(tl, a1.p2u, { color: blue, duration: spd });
    statusPill(tl, p1User, "Got challenge", { color: blue });
    step(tl, p1Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. Clients sign
    step(tl, p1Steps[2], 'active');
    statusPill(tl, p1Remote, "Signing…", { color: blue });
    statusPill(tl, p1User, "Signing…", { color: blue });
    tl.to({}, { duration: 0.4 });
    packet(tl, a1.r2p, { color: blue, duration: spd });
    tl.to({}, { duration: 0.2 });
    packet(tl, a1.p2u, { color: blue, duration: spd, reverse: true });
    step(tl, p1Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Proxy verifies
    step(tl, p1Steps[3], 'active');
    statusPill(tl, p1Proxy, "Verifying…", { color: blue });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p1Proxy, "Both verified ✓", { color: green });
    highlight(tl, p1Proxy, { color: green });
    step(tl, p1Steps[3], 'done');

    // Success
    step(tl, p1Steps[4], 'active');
    tl.to({}, { duration: 0.4 });
    step(tl, p1Steps[4], 'done');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 2: DISCOVER (Rendezvous flow) ────

    // 1. User device requests rendezvous code
    step(tl, p2Steps[0], 'active');
    statusPill(tl, p2User, "GetRendezvous()", { color: green });
    packet(tl, a2.p2u, { color: green, duration: spd, reverse: true });
    step(tl, p2Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Proxy generates code, sends back to user
    step(tl, p2Steps[1], 'active');
    statusPill(tl, p2Proxy, "Generating…", { color: green });
    tl.to({}, { duration: 0.5 });
    packet(tl, a2.p2u, { color: green, duration: spd });
    statusPill(tl, p2User, "ABC-DEF-GHI", { color: green });
    step(tl, p2Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. User shares code with remote (out-of-band)
    step(tl, p2Steps[2], 'active');
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p2Remote, "Receiving code…", { color: green });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p2Remote, "Code entered ✓", { color: green });
    step(tl, p2Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Remote sends code to proxy
    step(tl, p2Steps[3], 'active');
    statusPill(tl, p2Remote, "GetIdentity(code)", { color: green });
    packet(tl, a2.r2p, { color: green, duration: spd });
    step(tl, p2Steps[3], 'done');
    tl.to({}, { duration: 0.3 });

    // 5. Proxy returns user's identity
    step(tl, p2Steps[4], 'active');
    statusPill(tl, p2Proxy, "Code matched", { color: green });
    packet(tl, a2.r2p, { color: green, duration: spd, reverse: true });
    statusPill(tl, p2Remote, "Identity received", { color: green });
    step(tl, p2Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. User verifies fingerprint
    step(tl, p2Steps[5], 'active');
    statusPill(tl, p2User, "Verify fingerprint?", { color: green });
    tl.to({}, { duration: 0.8 });
    statusPill(tl, p2User, "Verified ✓", { color: green });
    highlight(tl, p2User, { color: green });
    step(tl, p2Steps[5], 'done');

    // Success
    step(tl, p2Steps[6], 'active');
    tl.to({}, { duration: 0.4 });
    step(tl, p2Steps[6], 'done');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 3: ENCRYPT ────

    // 1. Noise msg1 (Remote → Proxy → User)
    step(tl, p3Steps[0], 'active');
    statusPill(tl, p3Remote, "Noise msg1", { color: purple });
    packet(tl, a3.r2p, { color: purple, duration: spd });
    step(tl, p3Steps[0], 'done');

    // 2. Proxy relays msg1
    step(tl, p3Steps[1], 'active');
    statusPill(tl, p3Proxy, "Relaying…", { color: purple });
    packet(tl, a3.p2u, { color: purple, duration: spd });
    pulse(tl, p3User, { color: purple });
    statusPill(tl, p3User, "Received msg1", { color: purple });
    step(tl, p3Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. Noise msg2 (User → Proxy → Remote)
    step(tl, p3Steps[2], 'active');
    statusPill(tl, p3User, "Noise msg2", { color: purple });
    packet(tl, a3.p2u, { color: purple, duration: spd, reverse: true });
    statusPill(tl, p3Proxy, "Relaying…", { color: purple });
    packet(tl, a3.r2p, { color: purple, duration: spd, reverse: true });
    pulse(tl, p3Remote, { color: purple });
    statusPill(tl, p3Remote, "Received msg2", { color: purple });
    step(tl, p3Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Keys derived
    step(tl, p3Steps[3], 'active');
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p3Remote, "Keys derived ✓", { color: green });
    statusPill(tl, p3User, "Keys derived ✓", { color: green });
    statusPill(tl, p3Proxy, "Cannot decrypt", { color: "#94a3b8" });
    highlight(tl, p3Remote, { color: green });
    highlight(tl, p3User, { color: green });
    step(tl, p3Steps[3], 'done');

    // Success
    step(tl, p3Steps[4], 'active');
    tl.to({}, { duration: 0.4 });
    step(tl, p3Steps[4], 'done');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 4: CREDENTIAL EXCHANGE ────

    // 1. Remote sends encrypted credential request
    step(tl, p4Steps[0], 'active');
    statusPill(tl, p4Remote, "Encrypting…", { color: amber });
    tl.to({}, { duration: 0.3 });
    packet(tl, a4.r2p, { color: amber, duration: spd });
    step(tl, p4Steps[0], 'done');

    // 2. Proxy relays (blind)
    step(tl, p4Steps[1], 'active');
    statusPill(tl, p4Proxy, "Relaying (blind)", { color: amber });
    packet(tl, a4.p2u, { color: amber, duration: spd });
    step(tl, p4Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. User decrypts, sees domain, approves
    step(tl, p4Steps[2], 'active');
    statusPill(tl, p4User, "Decrypting…", { color: amber });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p4User, "github.com?", { color: amber });
    tl.to({}, { duration: 0.8 });
    statusPill(tl, p4User, "Approved ✓", { color: green });
    highlight(tl, p4User, { color: green });
    step(tl, p4Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. User encrypts and sends credential response
    step(tl, p4Steps[3], 'active');
    statusPill(tl, p4User, "Encrypting…", { color: green });
    tl.to({}, { duration: 0.3 });
    packet(tl, a4.p2u, { color: green, duration: spd, reverse: true });
    statusPill(tl, p4Proxy, "Relaying (blind)", { color: green });
    packet(tl, a4.r2p, { color: green, duration: spd, reverse: true });
    step(tl, p4Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. Remote decrypts credential
    step(tl, p4Steps[4], 'active');
    statusPill(tl, p4Remote, "Decrypting…", { color: green });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p4Remote, "Credential ✓", { color: green });
    highlight(tl, p4Remote, { color: green });
    step(tl, p4Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. Session cached for multi-device
    step(tl, p4Steps[5], 'active');
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p4Remote, "Session cached", { color: green });
    statusPill(tl, p4User, "Session cached", { color: green });
    statusPill(tl, p4Proxy, "Multi-device ✓", { color: green });
    step(tl, p4Steps[5], 'done');

    // Success
    step(tl, p4Steps[6], 'active');
    tl.to({}, { duration: 0.4 });
    step(tl, p4Steps[6], 'done');

    tl.to({}, { duration: 3 });

    // Reset everything before next loop
    snap.reset(tl);

    tl.play();
    if (onReady) onReady(tl, trailState, snap);
  }); // inner RAF
  }); // outer RAF
}
