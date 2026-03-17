import gsap from "gsap";
import { createNode as cn } from "../components/node";
import { createPhasePanel } from "../components/phase";
import { layoutRows as lr } from "../components/layout";
import { createSvgOverlay as csvg, drawArrow as da } from "../components/arrows";
import { packet as _packet } from "../animations/packet";
import {
  highlight as _highlight,
  pulse as _pulse,
} from "../animations/effects";
import {
  statusPill as _statusPill,
} from "../animations/status";
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
  user: icon(
    '<path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>',
    "#175DDC",
  ),
  key: icon(
    '<path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"/>',
    "#f59e0b",
  ),
  server: icon(
    '<path d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z"/>',
    "#10b981",
  ),
  vault: icon(
    '<path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"/>',
    "#8b5cf6",
  ),
};

/** Create a ghost participant node for use inside phase panels */
function participant(label: string, iconSvg: string) {
  const node = cn(label, {
    icon: iconSvg, ghost: true,
    status: "\u00A0",
    statusColor: "#94a3b8",
  });
  const card = node.querySelector('.flow-node') as HTMLElement;
  if (card) {
    card.style.width = '160px';
    card.style.textAlign = 'center';
  }
  return node;
}

export default function keyRotation(
  container: HTMLElement,
  onReady?: (tl: gsap.core.Timeline, snapshot: import("../animations/snapshot").Snapshot) => void,
) {
  // === Participants per phase ===
  const p1User = participant("Web Vault", icons.user);
  const p1Key = participant("Key Service", icons.key);

  const p2User = participant("Web Vault", icons.user);
  const p2Key = participant("Key Service", icons.key);
  const p2Vault = participant("Vault Data", icons.vault);

  const p3User = participant("Web Vault", icons.user);
  const p3Key = participant("Key Service", icons.key);
  const p3Vault = participant("Vault Data", icons.vault);

  const p4User = participant("Web Vault", icons.user);
  const p4Server = participant("Server API", icons.server);

  // === Phase panels ===
  const phase1 = createPhasePanel(
    "Phase 1 — Validate & Derive New Keys",
    [p1User, p1Key],
    [
      { text: "Pre-flight: verify vault is synced", detail: "Prevents empty-vault corruption (#7709)" },
      { text: "User enters new master password", detail: "Settings > Security" },
      { text: "Derive new Master Key from password", detail: "PBKDF2-SHA256 (default 600k) or Argon2id" },
      { text: "Generate new random User Key", detail: "CSPRNG · 512-bit AES-256-CBC-HMAC" },
      { text: "Stretch Master Key + encrypt User Key", detail: "HKDF → Stretched Key → Protected Symmetric Key" },
      { text: "New key hierarchy ready" },
    ],
    { borderColor: "#175DDC40", labelColor: "#175DDC", description: "The client first verifies the vault has been synced (preventing rotation with an empty local vault). Then the user enters a new master password, a new Master Key is derived, a new random User Key is generated, and the User Key is encrypted via the HKDF-stretched Master Key to form the Protected Symmetric Key." },
  );

  const phase2 = createPhasePanel(
    "Phase 2 — Verify Trust & Re-wrap Keys",
    [p2User, p2Key, p2Vault],
    [
      { text: "Fetch public keys for orgs & EA grantees", detail: "From server — not yet signed" },
      { text: "User manually verifies each public key", detail: "Anti-server-injection defense · abort on deny" },
      { text: "Decrypt RSA private key with old User Key" },
      { text: "Re-encrypt RSA private key with new User Key", detail: "Same RSA key pair, new wrapping" },
      { text: "Re-encrypt signing key with new User Key", detail: "V2 users only · created fresh for V1→V2 upgrade" },
      { text: "Re-wrap for emergency access grantees", detail: "Encrypt new User Key with verified grantee RSA pubkey" },
      { text: "Re-wrap for org account recovery", detail: "Encrypt new User Key with verified org RSA pubkey" },
      { text: "Re-wrap for trusted devices", detail: "Encrypt new User Key with each device's pubkey" },
      { text: "Re-wrap for passkeys", detail: "Rotate PRF keyset per WebAuthn credential" },
      { text: "All unlock methods updated" },
    ],
    { borderColor: "#f59e0b40", labelColor: "#f59e0b", description: "Before re-wrapping, the user is prompted to verify the public keys of each org and emergency access grantee — a defense against the server injecting fake keys. Then the RSA private key is re-encrypted under the new User Key, and every unlock method receives the new User Key encrypted with its respective public key." },
  );

  const phase3 = createPhasePanel(
    "Phase 3 — Re-encrypt Vault Data",
    [p3User, p3Key, p3Vault],
    [
      { text: "Decrypt all ciphers with old User Key", detail: "Passwords, notes, cards, identities" },
      { text: "Re-encrypt all ciphers with new User Key" },
      { text: "Decrypt and re-encrypt all folders" },
      { text: "Decrypt and re-encrypt all Sends" },
      { text: "Validate: no items missing", detail: "Prevents vault corruption (Issue #7709)" },
      { text: "All vault data re-encrypted" },
    ],
    { borderColor: "#8b5cf640", labelColor: "#8b5cf6", description: "Every piece of vault data — ciphers, folders, and Sends — is decrypted with the old User Key and re-encrypted with the new one. A count validation prevents the empty-vault corruption bug." },
  );

  const phase4 = createPhasePanel(
    "Phase 4 — Atomic Server Update",
    [p4User, p4Server],
    [
      { text: "Compute old master key auth hash", detail: "Proves current password ownership" },
      { text: "Bundle everything into one request", detail: "Keys + unlock data + vault data" },
      { text: "POST /accounts/key-management/rotate-user-account-keys" },
      { text: "Server validates auth hash & cipher count" },
      { text: "Server applies all changes in one transaction", detail: "Atomic — rollback on failure" },
      { text: "Security stamp updated → all sessions invalidated" },
      { text: "Client logs out — rotation complete" },
    ],
    { borderColor: "#10b98140", labelColor: "#10b981", description: "Everything is submitted in a single atomic API request. The server validates the old password, applies all key and data changes in one database transaction, then invalidates all sessions by updating the security stamp." },
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
      title: "Key Rotation",
      subtitle:
        "How Bitwarden clients rotate the encryption key hierarchy when a user changes their master password",
      rowGap: "2.5rem",
      nodeGap: "1.5rem",
    },
  );

  // Match phase panel widths
  requestAnimationFrame(() => {
    const maxW = Math.max(phase1.offsetWidth, phase2.offsetWidth, phase3.offsetWidth, phase4.offsetWidth);
    for (const p of [phase1, phase2, phase3, phase4]) {
      p.style.width = maxW + 'px';
      p.style.boxSizing = 'border-box';
    }
  });

  // === Arrows & Animation ===
  requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const svg = csvg(container);

    const connector = { color: "#cbd5e1", curve: "straight" as const, fromAnchor: "right" as const, toAnchor: "left" as const, noArrow: true };

    // Phase 1: User ↔ Key Service
    const a1 = { u2k: da(svg, p1User, p1Key, connector) };

    // Phase 2: User ↔ Key Service ↔ Vault
    const a2 = {
      u2k: da(svg, p2User, p2Key, connector),
      k2v: da(svg, p2Key, p2Vault, connector),
    };

    // Phase 3: User ↔ Key Service ↔ Vault
    const a3 = {
      u2k: da(svg, p3User, p3Key, connector),
      k2v: da(svg, p3Key, p3Vault, connector),
    };

    // Phase 4: User ↔ Server
    const a4 = { u2s: da(svg, p4User, p4Server, connector) };

    // --- Step list references ---
    const p1Steps = phase1.querySelectorAll('.phase-step');
    const p2Steps = phase2.querySelectorAll('.phase-step');
    const p3Steps = phase3.querySelectorAll('.phase-step');
    const p4Steps = phase4.querySelectorAll('.phase-step');

    function step(tl: gsap.core.Timeline, s: Element, state: 'active' | 'done') {
      tl.call(() => {
        if (state === 'active') { s.classList.add('active'); s.classList.remove('done'); }
        else { s.classList.remove('active'); s.classList.add('done'); }
      });
    }

    const spd = 0.7;
    const pause = 0.5;
    const phasePause = 1.0;

    const snap = createSnapshot()
      .captureAll(container)
      .trackSvg(svg);
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });

    const blue = "#175DDC";
    const amber = "#f59e0b";
    const purple = "#8b5cf6";
    const green = "#10b981";

    /** Add a replay button to a phase panel's label bar */
    function addReplayBtn(panel: HTMLElement, phaseLabel: string) {
      const labelBar = panel.querySelector('.phase-label-bar');
      if (!labelBar) return;
      const btn = document.createElement('button');
      btn.className = 'phase-toggle-btn';
      btn.textContent = '▶ Replay';
      btn.addEventListener('click', () => {
        snap.restoreNow();
        const start = tl.labels[phaseLabel] || 0;
        const end = tl.labels[phaseLabel + '_end'];
        tl.pause();
        tl.seek(start);
        tl.play();
        if (end != null) {
          const pauseAt = () => {
            if (tl.time() >= end) {
              tl.pause();
              tl.eventCallback('onUpdate', null);
            }
          };
          tl.eventCallback('onUpdate', pauseAt);
        }
      });
      labelBar.appendChild(btn);
    }

    // ──── PHASE 1: VALIDATE & DERIVE NEW KEYS ────
    tl.addLabel('phase1');

    // 1. Pre-flight sync check
    step(tl, p1Steps[0], 'active');
    statusPill(tl, p1User, "Checking sync…", { color: blue });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p1User, "Vault synced ✓", { color: green });
    step(tl, p1Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. User enters new password
    step(tl, p1Steps[1], 'active');
    statusPill(tl, p1User, "New password…", { color: blue });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p1User, "Password set", { color: blue });
    step(tl, p1Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. Derive new Master Key
    step(tl, p1Steps[2], 'active');
    statusPill(tl, p1User, "Deriving…", { color: blue });
    packet(tl, a1.u2k, { color: blue, duration: spd });
    statusPill(tl, p1Key, "KDF running…", { color: blue });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p1Key, "Master Key ✓", { color: blue });
    step(tl, p1Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Generate new User Key (before HKDF stretch — matches actual code order)
    step(tl, p1Steps[3], 'active');
    statusPill(tl, p1Key, "CSPRNG…", { color: blue });
    tl.to({}, { duration: 0.4 });
    pulse(tl, p1Key, { color: blue });
    statusPill(tl, p1Key, "New User Key ✓", { color: green });
    highlight(tl, p1Key, { color: green });
    step(tl, p1Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. HKDF stretch Master Key + encrypt User Key (combined — happens inside buildProtectedSymmetricKey)
    step(tl, p1Steps[4], 'active');
    statusPill(tl, p1Key, "HKDF + encrypt…", { color: blue });
    tl.to({}, { duration: 0.6 });
    packet(tl, a1.u2k, { color: green, duration: spd, reverse: true });
    statusPill(tl, p1User, "Protected Key ✓", { color: green });
    step(tl, p1Steps[4], 'done');

    // 6. Done
    step(tl, p1Steps[5], 'active');
    tl.to({}, { duration: 0.4 });
    step(tl, p1Steps[5], 'done');
    tl.addLabel('phase1_end');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 2: VERIFY TRUST & RE-WRAP KEYS ────
    tl.addLabel('phase2');

    // 1. Fetch public keys for orgs & EA grantees
    step(tl, p2Steps[0], 'active');
    statusPill(tl, p2User, "Fetching pubkeys…", { color: amber });
    packet(tl, a2.u2k, { color: amber, duration: spd });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "Keys fetched", { color: amber });
    step(tl, p2Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. User manually verifies each public key
    step(tl, p2Steps[1], 'active');
    statusPill(tl, p2User, "Verify org key?", { color: amber });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p2User, "Trusted ✓", { color: green });
    tl.to({}, { duration: 0.3 });
    statusPill(tl, p2User, "Verify EA key?", { color: amber });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p2User, "All trusted ✓", { color: green });
    highlight(tl, p2User, { color: green });
    step(tl, p2Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. Decrypt RSA private key
    step(tl, p2Steps[2], 'active');
    statusPill(tl, p2Key, "Decrypt RSA…", { color: amber });
    packet(tl, a2.k2v, { color: amber, duration: spd, reverse: true });
    statusPill(tl, p2Vault, "Old User Key", { color: amber });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "RSA decrypted", { color: amber });
    step(tl, p2Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Re-encrypt RSA with new User Key
    step(tl, p2Steps[3], 'active');
    statusPill(tl, p2Key, "Re-encrypting…", { color: amber });
    tl.to({}, { duration: 0.5 });
    packet(tl, a2.k2v, { color: green, duration: spd });
    statusPill(tl, p2Vault, "New User Key", { color: green });
    statusPill(tl, p2Key, "RSA re-wrapped ✓", { color: green });
    step(tl, p2Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. Re-encrypt signing key
    step(tl, p2Steps[4], 'active');
    statusPill(tl, p2Key, "Signing key…", { color: amber });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p2Key, "Signing key ✓", { color: green });
    step(tl, p2Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. Emergency access
    step(tl, p2Steps[5], 'active');
    statusPill(tl, p2User, "Emergency access", { color: amber });
    packet(tl, a2.u2k, { color: amber, duration: spd });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "EA re-wrapped ✓", { color: green });
    step(tl, p2Steps[5], 'done');
    tl.to({}, { duration: pause });

    // 7. Org recovery
    step(tl, p2Steps[6], 'active');
    statusPill(tl, p2User, "Org recovery", { color: amber });
    packet(tl, a2.u2k, { color: amber, duration: spd });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "Org re-wrapped ✓", { color: green });
    step(tl, p2Steps[6], 'done');
    tl.to({}, { duration: pause });

    // 8. Trusted devices
    step(tl, p2Steps[7], 'active');
    statusPill(tl, p2User, "Trusted devices", { color: amber });
    packet(tl, a2.u2k, { color: amber, duration: spd });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "Devices ✓", { color: green });
    step(tl, p2Steps[7], 'done');
    tl.to({}, { duration: pause });

    // 9. Passkeys
    step(tl, p2Steps[8], 'active');
    statusPill(tl, p2User, "WebAuthn PRF", { color: amber });
    packet(tl, a2.u2k, { color: amber, duration: spd });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "Passkeys ✓", { color: green });
    step(tl, p2Steps[8], 'done');

    // 10. Done
    step(tl, p2Steps[9], 'active');
    highlight(tl, p2Key, { color: green });
    tl.to({}, { duration: 0.4 });
    step(tl, p2Steps[9], 'done');
    tl.addLabel('phase2_end');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 3: RE-ENCRYPT VAULT DATA ────
    tl.addLabel('phase3');

    // 1. Decrypt all ciphers
    step(tl, p3Steps[0], 'active');
    statusPill(tl, p3Vault, "Decrypting…", { color: purple });
    packet(tl, a3.k2v, { color: purple, duration: spd });
    statusPill(tl, p3Key, "Old User Key", { color: purple });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p3Vault, "Ciphers decrypted", { color: purple });
    step(tl, p3Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Re-encrypt all ciphers
    step(tl, p3Steps[1], 'active');
    statusPill(tl, p3Key, "New User Key", { color: green });
    packet(tl, a3.k2v, { color: green, duration: spd, reverse: true });
    statusPill(tl, p3Vault, "Re-encrypting…", { color: green });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p3Vault, "Ciphers ✓", { color: green });
    pulse(tl, p3Vault, { color: green });
    step(tl, p3Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. Folders
    step(tl, p3Steps[2], 'active');
    statusPill(tl, p3Vault, "Folders…", { color: purple });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p3Vault, "Folders ✓", { color: green });
    step(tl, p3Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Sends
    step(tl, p3Steps[3], 'active');
    statusPill(tl, p3Vault, "Sends…", { color: purple });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p3Vault, "Sends ✓", { color: green });
    step(tl, p3Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. Validate counts
    step(tl, p3Steps[4], 'active');
    statusPill(tl, p3Key, "Validating…", { color: purple });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p3Key, "Counts match ✓", { color: green });
    highlight(tl, p3Key, { color: green });
    step(tl, p3Steps[4], 'done');

    // 6. Done
    step(tl, p3Steps[5], 'active');
    highlight(tl, p3Vault, { color: green });
    tl.to({}, { duration: 0.4 });
    step(tl, p3Steps[5], 'done');
    tl.addLabel('phase3_end');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 4: ATOMIC SERVER UPDATE ────
    tl.addLabel('phase4');

    // 1. Compute old auth hash
    step(tl, p4Steps[0], 'active');
    statusPill(tl, p4User, "Auth hash…", { color: green });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p4User, "Hash computed ✓", { color: green });
    step(tl, p4Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Bundle request
    step(tl, p4Steps[1], 'active');
    statusPill(tl, p4User, "Bundling…", { color: green });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p4User, "Request ready", { color: green });
    step(tl, p4Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. POST to server
    step(tl, p4Steps[2], 'active');
    statusPill(tl, p4User, "POST /rotate…", { color: green });
    packet(tl, a4.u2s, { color: green, duration: spd });
    pulse(tl, p4Server, { color: green });
    step(tl, p4Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Server validates
    step(tl, p4Steps[3], 'active');
    statusPill(tl, p4Server, "Validating…", { color: green });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p4Server, "Auth valid ✓", { color: green });
    step(tl, p4Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. Atomic transaction
    step(tl, p4Steps[4], 'active');
    statusPill(tl, p4Server, "Transaction…", { color: green });
    tl.to({}, { duration: 0.8 });
    statusPill(tl, p4Server, "Committed ✓", { color: green });
    highlight(tl, p4Server, { color: green });
    step(tl, p4Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. Security stamp updated
    step(tl, p4Steps[5], 'active');
    statusPill(tl, p4Server, "Stamp updated", { color: amber });
    tl.to({}, { duration: 0.5 });
    packet(tl, a4.u2s, { color: amber, duration: spd, reverse: true });
    statusPill(tl, p4User, "Sessions invalidated", { color: amber });
    step(tl, p4Steps[5], 'done');
    tl.to({}, { duration: pause });

    // 7. Client logs out
    step(tl, p4Steps[6], 'active');
    statusPill(tl, p4User, "Logging out…", { color: green });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p4User, "Complete ✓", { color: green });
    highlight(tl, p4User, { color: green });
    statusPill(tl, p4Server, "Rotation done ✓", { color: green });
    step(tl, p4Steps[6], 'done');
    tl.addLabel('phase4_end');

    tl.to({}, { duration: 3 });

    // Reset before next loop
    snap.reset(tl);

    // Add replay buttons
    addReplayBtn(phase1, 'phase1');
    addReplayBtn(phase2, 'phase2');
    addReplayBtn(phase3, 'phase3');
    addReplayBtn(phase4, 'phase4');

    tl.play();
    if (onReady) onReady(tl, snap);
  }); // inner RAF
  }); // outer RAF
}
