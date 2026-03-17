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
  cog: icon(
    '<path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.248a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>',
    "#6366f1",
  ),
  key: icon(
    '<path d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"/>',
    "#f59e0b",
  ),
  server: icon(
    '<path d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z"/>',
    "#10b981",
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

export default function sdkKeyRotation(
  container: HTMLElement,
  onReady?: (tl: gsap.core.Timeline, snapshot: import("../animations/snapshot").Snapshot) => void,
) {
  // === Participants per phase ===
  // Phase 1: Client App, SDK, Server API
  const p1Client = participant("Client App", icons.user);
  const p1Sdk = participant("SDK (Rust)", icons.cog);
  const p1Server = participant("Server API", icons.server);

  // Phase 2: SDK, KeyStore
  const p2Sdk = participant("SDK (Rust)", icons.cog);
  const p2Key = participant("KeyStore", icons.key);

  // Phase 3: SDK, KeyStore
  const p3Sdk = participant("SDK (Rust)", icons.cog);
  const p3Key = participant("KeyStore", icons.key);

  // Phase 4: SDK, KeyStore
  const p4Sdk = participant("SDK (Rust)", icons.cog);
  const p4Key = participant("KeyStore", icons.key);

  // Phase 5: Client App, SDK, Server API
  const p5Client = participant("Client App", icons.user);
  const p5Sdk = participant("SDK (Rust)", icons.cog);
  const p5Server = participant("Server API", icons.server);

  // === Phase panels ===
  const phase1 = createPhasePanel(
    "Phase 1 — Sync Current State",
    [p1Client, p1Sdk, p1Server],
    [
      { text: "Client calls rotate_user_keys(request)", detail: "Entry point into SDK" },
      { text: "SDK calls sync_current_account_data()", detail: "Fetch account crypto state (V1 or V2), KDF params" },
      { text: "SDK calls sync_orgs()", detail: "Org memberships with reset-password enrolled" },
      { text: "SDK calls sync_emergency_access()", detail: "EA grantee public keys" },
      { text: "SDK calls sync_devices() + sync_passkeys()", detail: "Trusted device & WebAuthn credential keysets" },
      { text: "Validate trust: filter against user-provided keys", detail: "filter_trusted_organization() + filter_trusted_emergency_access()" },
      { text: "If untrusted key found → abort with UntrustedKeyError" },
      { text: "SyncedAccountData assembled — ready for rotation" },
    ],
    { borderColor: "#175DDC40", labelColor: "#175DDC", description: "Before any cryptographic operations, the SDK fetches the complete current state from the server. Organization and emergency access public keys are filtered against the user's explicitly trusted keys — a defense against the server injecting fake public keys." },
  );

  const phase2 = createPhasePanel(
    "Phase 2 — Generate New Key & Rotate Crypto State",
    [p2Sdk, p2Key],
    [
      { text: "Generate new XChaCha20-Poly1305 user key", detail: "ctx.make_symmetric_key()" },
      { text: "Two key IDs now exist: User (old) + new local ID" },
      { text: "V1 → V2 upgrade: re-encrypt private key", detail: "Old AES-CBC-HMAC → new XChaCha20-Poly1305 (COSE Encrypt0)" },
      { text: "V1 → V2: generate new Ed25519 signing key", detail: "Sign public key → SignedPublicKey" },
      { text: "V1 → V2: initialize + sign security state", detail: "SignedSecurityState" },
      { text: "V2 → V2: re-encrypt private key + signing key", detail: "signed_public_key & security_state unchanged" },
      { text: "AccountKeysRequestModel produced" },
    ],
    { borderColor: "#6366f140", labelColor: "#6366f1", description: "A fresh XChaCha20-Poly1305 user key is generated. The account cryptographic state is rotated — V1 accounts are automatically upgraded to V2 with signing keys and security state. V2 accounts simply re-wrap existing keys." },
  );

  const phase3 = createPhasePanel(
    "Phase 3 — Re-encrypt Vault Data",
    [p3Sdk, p3Key],
    [
      { text: "reencrypt_folders(): decrypt → re-encrypt each folder", detail: "Old user key → new user key" },
      { text: "reencrypt_ciphers() — per-item key path", detail: "cipher.key.is_some() → rewrap_cipher_key() only" },
      { text: "reencrypt_ciphers() — no per-item key path", detail: "Full decrypt to CipherView → re-encrypt with new key" },
      { text: "reencrypt_sends(): decrypt send key/seed → re-encrypt", detail: "Old user key → new user key" },
      { text: "AccountDataRequestModel produced" },
    ],
    { borderColor: "#8b5cf640", labelColor: "#8b5cf6", description: "The SDK re-encrypts all vault data. Ciphers with per-item keys get a fast \"rewrap\" — only the key wrapper changes, not the ciphertext. Ciphers without per-item keys require full decryption and re-encryption." },
  );

  const phase4 = createPhasePanel(
    "Phase 4 — Re-encrypt Unlock Methods",
    [p4Sdk, p4Key],
    [
      { text: "Master password: derive new master key → encrypt new user key", detail: "reencrypt_userkey_for_masterpassword_unlock()" },
      { text: "Trusted devices (TDE): re-encapsulate per keyset", detail: "Decrypt device pubkey → re-encapsulate new user key → re-encrypt pubkey" },
      { text: "Passkeys (WebAuthn PRF): same RotateableKeySet pattern", detail: "PartialRotateableKeyset::rotate_userkey()" },
      { text: "Emergency access: encrypt with grantee's trusted RSA pubkey", detail: "UnsignedSharedKey encapsulation" },
      { text: "Org account recovery: encrypt with org's trusted RSA pubkey" },
      { text: "UnlockDataRequestModel produced" },
    ],
    { borderColor: "#f59e0b40", labelColor: "#f59e0b", description: "Every unlock method must be updated so the new user key remains accessible. Devices and passkeys use the RotateableKeySet pattern (re-encapsulate with the device's public key). Emergency access and org recovery use direct RSA encapsulation with verified public keys." },
  );

  const phase5 = createPhasePanel(
    "Phase 5 — Atomic Server Commit",
    [p5Client, p5Sdk, p5Server],
    [
      { text: "Compute old master password auth hash", detail: "MasterPasswordAuthenticationData::derive()" },
      { text: "Assemble RotateUserAccountKeysAndDataRequestModel", detail: "Auth hash + account keys + account data + unlock data" },
      { text: "POST /accounts/key-management/rotate-user-account-keys" },
      { text: "Server validates old password hash" },
      { text: "Server applies all changes in one atomic transaction", detail: "Rollback on failure" },
      { text: "Security stamp updated → all sessions invalidated" },
      { text: "SDK returns Ok(()) — client logs out" },
    ],
    { borderColor: "#10b98140", labelColor: "#10b981", description: "Everything is submitted in a single atomic API request. If anything fails, the server rolls back. The old master password hash proves the user owns the current account. After success, all sessions are invalidated." },
  );

  // === Layout ===
  lr(
    container,
    [
      [phase1],
      [phase2],
      [phase3],
      [phase4],
      [phase5],
    ],
    {
      title: "SDK Key Rotation Internals",
      subtitle:
        "How bitwarden-user-crypto-management rotates the user key hierarchy",
      rowGap: "2.5rem",
      nodeGap: "1.5rem",
    },
  );

  // Match phase panel widths
  requestAnimationFrame(() => {
    const panels = [phase1, phase2, phase3, phase4, phase5];
    const maxW = Math.max(...panels.map(p => p.offsetWidth));
    for (const p of panels) {
      p.style.width = maxW + 'px';
      p.style.boxSizing = 'border-box';
    }
  });

  // === Arrows & Animation ===
  requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const svg = csvg(container);

    const connector = { color: "#cbd5e1", curve: "straight" as const, fromAnchor: "right" as const, toAnchor: "left" as const, noArrow: true };

    // Phase 1: Client ↔ SDK ↔ Server
    const a1 = {
      c2s: da(svg, p1Client, p1Sdk, connector),
      s2sv: da(svg, p1Sdk, p1Server, connector),
    };

    // Phase 2: SDK ↔ KeyStore
    const a2 = { s2k: da(svg, p2Sdk, p2Key, connector) };

    // Phase 3: SDK ↔ KeyStore
    const a3 = { s2k: da(svg, p3Sdk, p3Key, connector) };

    // Phase 4: SDK ↔ KeyStore
    const a4 = { s2k: da(svg, p4Sdk, p4Key, connector) };

    // Phase 5: Client ↔ SDK ↔ Server
    const a5 = {
      c2s: da(svg, p5Client, p5Sdk, connector),
      s2sv: da(svg, p5Sdk, p5Server, connector),
    };

    // --- Step list references ---
    const p1Steps = phase1.querySelectorAll('.phase-step');
    const p2Steps = phase2.querySelectorAll('.phase-step');
    const p3Steps = phase3.querySelectorAll('.phase-step');
    const p4Steps = phase4.querySelectorAll('.phase-step');
    const p5Steps = phase5.querySelectorAll('.phase-step');

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
    const indigo = "#6366f1";
    const purple = "#8b5cf6";
    const amber = "#f59e0b";
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

    // ──── PHASE 1: SYNC CURRENT STATE ────
    tl.addLabel('phase1');

    // 1. Client calls rotate_user_keys
    step(tl, p1Steps[0], 'active');
    statusPill(tl, p1Client, "rotate_user_keys()", { color: blue });
    packet(tl, a1.c2s, { color: blue, duration: spd });
    statusPill(tl, p1Sdk, "Starting…", { color: blue });
    step(tl, p1Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. sync_current_account_data
    step(tl, p1Steps[1], 'active');
    statusPill(tl, p1Sdk, "Syncing account…", { color: blue });
    packet(tl, a1.s2sv, { color: blue, duration: spd });
    statusPill(tl, p1Server, "Fetching…", { color: blue });
    tl.to({}, { duration: 0.4 });
    packet(tl, a1.s2sv, { color: blue, duration: spd, reverse: true });
    statusPill(tl, p1Sdk, "Account state ✓", { color: blue });
    step(tl, p1Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. sync_orgs
    step(tl, p1Steps[2], 'active');
    statusPill(tl, p1Sdk, "Syncing orgs…", { color: blue });
    packet(tl, a1.s2sv, { color: blue, duration: spd });
    statusPill(tl, p1Server, "Org data…", { color: blue });
    tl.to({}, { duration: 0.3 });
    packet(tl, a1.s2sv, { color: blue, duration: spd, reverse: true });
    statusPill(tl, p1Sdk, "Orgs synced ✓", { color: blue });
    step(tl, p1Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. sync_emergency_access
    step(tl, p1Steps[3], 'active');
    statusPill(tl, p1Sdk, "Syncing EA…", { color: blue });
    packet(tl, a1.s2sv, { color: blue, duration: spd });
    tl.to({}, { duration: 0.3 });
    packet(tl, a1.s2sv, { color: blue, duration: spd, reverse: true });
    statusPill(tl, p1Sdk, "EA synced ✓", { color: blue });
    step(tl, p1Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. sync_devices + sync_passkeys
    step(tl, p1Steps[4], 'active');
    statusPill(tl, p1Sdk, "Syncing devices…", { color: blue });
    packet(tl, a1.s2sv, { color: blue, duration: spd });
    tl.to({}, { duration: 0.3 });
    packet(tl, a1.s2sv, { color: blue, duration: spd, reverse: true });
    statusPill(tl, p1Server, "All synced", { color: blue });
    statusPill(tl, p1Sdk, "Devices ✓", { color: blue });
    step(tl, p1Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. Validate trust
    step(tl, p1Steps[5], 'active');
    statusPill(tl, p1Sdk, "Filtering trust…", { color: blue });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p1Sdk, "All trusted ✓", { color: green });
    highlight(tl, p1Sdk, { color: green });
    step(tl, p1Steps[5], 'done');
    tl.to({}, { duration: pause });

    // 7. Untrusted abort path (show as passing)
    step(tl, p1Steps[6], 'active');
    tl.to({}, { duration: 0.3 });
    statusPill(tl, p1Sdk, "No untrusted ✓", { color: green });
    step(tl, p1Steps[6], 'done');
    tl.to({}, { duration: pause });

    // 8. SyncedAccountData assembled
    step(tl, p1Steps[7], 'active');
    statusPill(tl, p1Sdk, "Data assembled", { color: green });
    pulse(tl, p1Sdk, { color: green });
    tl.to({}, { duration: 0.4 });
    step(tl, p1Steps[7], 'done');
    tl.addLabel('phase1_end');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 2: GENERATE NEW KEY & ROTATE CRYPTO STATE ────
    tl.addLabel('phase2');

    // 1. Generate new XChaCha20 key
    step(tl, p2Steps[0], 'active');
    statusPill(tl, p2Sdk, "Generating key…", { color: indigo });
    packet(tl, a2.s2k, { color: indigo, duration: spd });
    statusPill(tl, p2Key, "make_symmetric_key()", { color: indigo });
    tl.to({}, { duration: 0.4 });
    pulse(tl, p2Key, { color: indigo });
    statusPill(tl, p2Key, "New key ✓", { color: indigo });
    step(tl, p2Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Two key IDs
    step(tl, p2Steps[1], 'active');
    statusPill(tl, p2Key, "Old + New IDs", { color: indigo });
    tl.to({}, { duration: 0.4 });
    step(tl, p2Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. V1→V2: re-encrypt private key
    step(tl, p2Steps[2], 'active');
    statusPill(tl, p2Sdk, "V1→V2 upgrade…", { color: indigo });
    packet(tl, a2.s2k, { color: indigo, duration: spd });
    statusPill(tl, p2Key, "Re-encrypting…", { color: indigo });
    tl.to({}, { duration: 0.5 });
    packet(tl, a2.s2k, { color: indigo, duration: spd, reverse: true });
    statusPill(tl, p2Sdk, "Private key ✓", { color: indigo });
    step(tl, p2Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. V1→V2: Ed25519 signing key
    step(tl, p2Steps[3], 'active');
    statusPill(tl, p2Key, "Ed25519 keygen…", { color: indigo });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "Signing key ✓", { color: indigo });
    step(tl, p2Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. V1→V2: security state
    step(tl, p2Steps[4], 'active');
    statusPill(tl, p2Sdk, "Security state…", { color: indigo });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Sdk, "State signed ✓", { color: indigo });
    step(tl, p2Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. V2→V2: re-encrypt
    step(tl, p2Steps[5], 'active');
    statusPill(tl, p2Sdk, "V2 re-wrap…", { color: indigo });
    packet(tl, a2.s2k, { color: indigo, duration: spd });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p2Key, "Re-wrapped ✓", { color: green });
    step(tl, p2Steps[5], 'done');
    tl.to({}, { duration: pause });

    // 7. Model produced
    step(tl, p2Steps[6], 'active');
    statusPill(tl, p2Sdk, "Model ready ✓", { color: green });
    highlight(tl, p2Sdk, { color: green });
    tl.to({}, { duration: 0.4 });
    step(tl, p2Steps[6], 'done');
    tl.addLabel('phase2_end');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 3: RE-ENCRYPT VAULT DATA ────
    tl.addLabel('phase3');

    // 1. Folders
    step(tl, p3Steps[0], 'active');
    statusPill(tl, p3Sdk, "Folders…", { color: purple });
    packet(tl, a3.s2k, { color: purple, duration: spd });
    statusPill(tl, p3Key, "Old key decrypt", { color: purple });
    tl.to({}, { duration: 0.4 });
    packet(tl, a3.s2k, { color: green, duration: spd, reverse: true });
    statusPill(tl, p3Sdk, "Folders ✓", { color: green });
    step(tl, p3Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Ciphers — per-item key (fast rewrap)
    step(tl, p3Steps[1], 'active');
    statusPill(tl, p3Sdk, "Cipher rewrap…", { color: purple });
    packet(tl, a3.s2k, { color: purple, duration: spd });
    statusPill(tl, p3Key, "rewrap_cipher_key()", { color: purple });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p3Key, "Key only ✓", { color: green });
    pulse(tl, p3Key, { color: green });
    step(tl, p3Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. Ciphers — no per-item key (full re-encrypt)
    step(tl, p3Steps[2], 'active');
    statusPill(tl, p3Sdk, "Full re-encrypt…", { color: purple });
    packet(tl, a3.s2k, { color: purple, duration: spd });
    statusPill(tl, p3Key, "Decrypt + encrypt", { color: purple });
    tl.to({}, { duration: 0.5 });
    packet(tl, a3.s2k, { color: green, duration: spd, reverse: true });
    statusPill(tl, p3Sdk, "Ciphers ✓", { color: green });
    step(tl, p3Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Sends
    step(tl, p3Steps[3], 'active');
    statusPill(tl, p3Sdk, "Sends…", { color: purple });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p3Sdk, "Sends ✓", { color: green });
    step(tl, p3Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. Model produced
    step(tl, p3Steps[4], 'active');
    statusPill(tl, p3Sdk, "Data model ✓", { color: green });
    highlight(tl, p3Sdk, { color: green });
    tl.to({}, { duration: 0.4 });
    step(tl, p3Steps[4], 'done');
    tl.addLabel('phase3_end');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 4: RE-ENCRYPT UNLOCK METHODS ────
    tl.addLabel('phase4');

    // 1. Master password
    step(tl, p4Steps[0], 'active');
    statusPill(tl, p4Sdk, "Master password…", { color: amber });
    packet(tl, a4.s2k, { color: amber, duration: spd });
    statusPill(tl, p4Key, "KDF + encrypt", { color: amber });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p4Key, "Master PW ✓", { color: green });
    step(tl, p4Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Trusted devices
    step(tl, p4Steps[1], 'active');
    statusPill(tl, p4Sdk, "TDE keysets…", { color: amber });
    packet(tl, a4.s2k, { color: amber, duration: spd });
    statusPill(tl, p4Key, "Re-encapsulate", { color: amber });
    tl.to({}, { duration: 0.5 });
    packet(tl, a4.s2k, { color: green, duration: spd, reverse: true });
    statusPill(tl, p4Sdk, "Devices ✓", { color: green });
    step(tl, p4Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. Passkeys
    step(tl, p4Steps[2], 'active');
    statusPill(tl, p4Sdk, "WebAuthn PRF…", { color: amber });
    packet(tl, a4.s2k, { color: amber, duration: spd });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p4Key, "Passkeys ✓", { color: green });
    step(tl, p4Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Emergency access
    step(tl, p4Steps[3], 'active');
    statusPill(tl, p4Sdk, "EA grantees…", { color: amber });
    packet(tl, a4.s2k, { color: amber, duration: spd });
    statusPill(tl, p4Key, "RSA encapsulate", { color: amber });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p4Key, "EA ✓", { color: green });
    step(tl, p4Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. Org recovery
    step(tl, p4Steps[4], 'active');
    statusPill(tl, p4Sdk, "Org recovery…", { color: amber });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p4Key, "Orgs ✓", { color: green });
    step(tl, p4Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. Model produced
    step(tl, p4Steps[5], 'active');
    statusPill(tl, p4Sdk, "Unlock model ✓", { color: green });
    highlight(tl, p4Sdk, { color: green });
    tl.to({}, { duration: 0.4 });
    step(tl, p4Steps[5], 'done');
    tl.addLabel('phase4_end');
    tl.to({}, { duration: phasePause });

    // ──── PHASE 5: ATOMIC SERVER COMMIT ────
    tl.addLabel('phase5');

    // 1. Compute auth hash
    step(tl, p5Steps[0], 'active');
    statusPill(tl, p5Sdk, "Auth hash…", { color: green });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p5Sdk, "Hash computed ✓", { color: green });
    step(tl, p5Steps[0], 'done');
    tl.to({}, { duration: pause });

    // 2. Assemble request model
    step(tl, p5Steps[1], 'active');
    statusPill(tl, p5Sdk, "Assembling…", { color: green });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p5Sdk, "Request ready", { color: green });
    step(tl, p5Steps[1], 'done');
    tl.to({}, { duration: pause });

    // 3. POST to server
    step(tl, p5Steps[2], 'active');
    statusPill(tl, p5Sdk, "POST /rotate…", { color: green });
    packet(tl, a5.s2sv, { color: green, duration: spd });
    pulse(tl, p5Server, { color: green });
    step(tl, p5Steps[2], 'done');
    tl.to({}, { duration: pause });

    // 4. Server validates
    step(tl, p5Steps[3], 'active');
    statusPill(tl, p5Server, "Validating…", { color: green });
    tl.to({}, { duration: 0.6 });
    statusPill(tl, p5Server, "Auth valid ✓", { color: green });
    step(tl, p5Steps[3], 'done');
    tl.to({}, { duration: pause });

    // 5. Atomic transaction
    step(tl, p5Steps[4], 'active');
    statusPill(tl, p5Server, "Transaction…", { color: green });
    tl.to({}, { duration: 0.8 });
    statusPill(tl, p5Server, "Committed ✓", { color: green });
    highlight(tl, p5Server, { color: green });
    step(tl, p5Steps[4], 'done');
    tl.to({}, { duration: pause });

    // 6. Security stamp updated
    step(tl, p5Steps[5], 'active');
    statusPill(tl, p5Server, "Stamp updated", { color: amber });
    tl.to({}, { duration: 0.5 });
    packet(tl, a5.s2sv, { color: amber, duration: spd, reverse: true });
    statusPill(tl, p5Sdk, "Sessions invalidated", { color: amber });
    step(tl, p5Steps[5], 'done');
    tl.to({}, { duration: pause });

    // 7. SDK returns Ok — client logs out
    step(tl, p5Steps[6], 'active');
    packet(tl, a5.c2s, { color: green, duration: spd, reverse: true });
    statusPill(tl, p5Client, "Ok(()) received", { color: green });
    tl.to({}, { duration: 0.4 });
    statusPill(tl, p5Client, "Logging out…", { color: green });
    tl.to({}, { duration: 0.5 });
    statusPill(tl, p5Client, "Complete ✓", { color: green });
    highlight(tl, p5Client, { color: green });
    statusPill(tl, p5Server, "Rotation done ✓", { color: green });
    step(tl, p5Steps[6], 'done');
    tl.addLabel('phase5_end');

    tl.to({}, { duration: 3 });

    // Reset before next loop
    snap.reset(tl);

    // Add replay buttons
    addReplayBtn(phase1, 'phase1');
    addReplayBtn(phase2, 'phase2');
    addReplayBtn(phase3, 'phase3');
    addReplayBtn(phase4, 'phase4');
    addReplayBtn(phase5, 'phase5');

    tl.play();
    if (onReady) onReady(tl, snap);
  }); // inner RAF
  }); // outer RAF
}
