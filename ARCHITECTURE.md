# Agent Access Protocol — Architecture

Secure credential delivery for AI agents via an end-to-end encrypted tunnel. The proxy server never sees credential data.

## Crate Map

```
┌─────────────────────────────────────────────────────────────┐
│  Consumers          Claude · OpenClaw · build.sh · any CLI  │
├─────────────────────────────────────────────────────────────┤
│  ap-cli             aac CLI — command-line entry point      │
├──────────────────────────┬──────────────────────────────────┤
│  ap-client               │                                  │
│  ├ RemoteClient          │  UserClient                      │
│  │ (agent / untrusted)   │  (user / trusted)                │
├──────────────────────────┴──────────────────────────────────┤
│  ap-proxy-protocol       │  ap-noise                        │
│  COSE auth · rendezvous  │  Noise NNpsk2 handshake          │
│  message routing         │  XChaCha20Poly1305 transport     │
├──────────────────────────┴──────────────────────────────────┤
│  ap-proxy                Proxy Server — zero-knowledge      │
│                          WebSocket relay                    │
├─────────────────────────────────────────────────────────────┤
│  Provider                Bitwarden (credential source)      │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Authentication

Both sides connect to the proxy server over WebSocket. The proxy sends a 32-byte challenge; the client signs it with its Ed25519 (or post-quantum ML-DSA-65) identity key and returns a COSE_Sign1 response. The proxy verifies the signature — no passwords, no tokens.

### 2. Rendezvous

The remote agent requests a rendezvous code (format `ABC-DEF-GHI`, 9 alphanumeric chars, expires in 5 minutes). The user enters this code on their device, and the proxy returns the remote agent's public identity so both sides know who they're talking to.

### 3. Noise Handshake (E2E Tunnel)

Both sides perform a Noise NNpsk2 handshake through the proxy, exchanging two messages that derive four symmetric keys:

- `i2r_key` — initiator → responder encryption
- `r2i_key` — responder → initiator encryption
- `fingerprint` — SHA-256 transcript hash for out-of-band verification

The proxy relays these messages but cannot decrypt them. From this point, all payloads are end-to-end encrypted with XChaCha20Poly1305.

### 4. Credential Request

The remote agent sends an encrypted `CredentialRequest` (domain, request ID, timestamp). The UserClient decrypts it and queries the configured **provider** (e.g. Bitwarden) for matching credentials.

### 5. Approval & Delivery

The user approves access. The provider returns the credential (username, password, TOTP, URI, notes) which is encrypted and sent back through the proxy to the remote agent. An audit log entry is recorded.

## Key Design Decisions

| Decision | Why |
|---|---|
| **Zero-knowledge proxy** | The relay server routes encrypted blobs — it never sees credentials, domains, or request content |
| **Noise NNpsk2** | Forward secrecy + break-in recovery. Ephemeral keys per session; automatic re-key every 24h |
| **COSE_Sign1 auth** | Standard cryptographic identity proof without passwords or API keys |
| **Rendezvous codes** | Short-lived (5 min), single-use, 101 trillion combinations — no pre-registration needed |
| **Provider abstraction** | UserClient is credential-source agnostic; Bitwarden is one provider implementation |
| **Post-quantum option** | ML-DSA-65 signing + Kyber768 KEM available behind a feature flag |
| **Multi-device transport** | Random nonces (not counters) allow parallel encrypted sessions from the same identity |

## Data Flow Summary

```
Request:   Consumer → aac CLI → RemoteClient → ap-proxy-protocol → Proxy Server
                                                                        │
                                                        (encrypted, blind relay)
                                                                        │
Response:  Consumer ← aac CLI ← RemoteClient ← ap-proxy-protocol ← Proxy Server
                                                                        │
                                              ap-noise ← UserClient ← Provider
```

The left side (RemoteClient path) handles routing and authentication.
The right side (UserClient path) handles decryption and credential lookup.
Both sides share the same protocol crates; the proxy sits in the middle, forwarding opaque payloads.
