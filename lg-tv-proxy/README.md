# LG TV Proxy (run this on your Mac)

This is the local bridge between the hosted **LG Remote** web app (on the
playground site) and your LG WebOS TV. It must run on a machine on the **same
Wi-Fi network as the TV** — your laptop is perfect.

```
Web UI (https playground)  ──HTTPS──▶  Cloudflare Tunnel  ──▶  this proxy  ──ws──▶  LG TV :3000
```

Browsers can't talk to the TV directly (the TV rejects browser WebSocket
connections), and an HTTPS page can't call a plain `http://192.168.x.x`
address. The Cloudflare tunnel solves both by giving this proxy a public
`https://` URL.

---

## One-time setup

### 1. Prerequisites (macOS)

```bash
# Node.js (skip if you already have it)
brew install node

# Cloudflare tunnel client
brew install cloudflared
```

### 2. Enable control on the TV

On the TV: **Settings → General → (Devices) → Mobile TV On**, and
**Settings → Network → LG Connect Apps** — make sure these are enabled.
Keep the TV on for the pairing step below.

### 3. Configure the proxy

```bash
cd lg-tv-proxy
cp .env.example .env
```

Edit `.env`:

- `TV_IP` — your TV's IP (TV: *Settings → Network → … → Advanced*). Give it a
  DHCP reservation in your router so it never changes.
- `API_TOKEN` — generate one with `openssl rand -hex 24`. You'll paste the same
  value into the web UI.
- `ALLOWED_ORIGINS` — your playground origin, e.g.
  `https://stephen-onochie.vercel.app` (comma-separated for multiple).

### 4. First run + pairing

```bash
./start.sh
```

The first time it connects, **a pairing prompt appears on the TV screen —
accept it with the TV remote.** The client key is then saved to
`~/.lgtv2/keyfile-<tv-ip>` and reused forever; you won't be prompted again.

---

## Everyday use

Open **two terminals**:

```bash
# Terminal 1 — the proxy
cd lg-tv-proxy && ./start.sh

# Terminal 2 — the public HTTPS tunnel
cd lg-tv-proxy && ./tunnel.sh
```

`tunnel.sh` prints a URL like `https://brave-cloud-1234.trycloudflare.com`.
In the LG Remote web app, open **Settings**, paste that as the **Proxy URL**
and your **API token**, and you're controlling the TV.

> Quick-tunnel URLs change every restart. For a permanent URL, set up a
> **named tunnel** (`cloudflared tunnel login` → `cloudflared tunnel create
> lg-remote` → route a hostname → `cloudflared tunnel run lg-remote`). See
> https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

---

## REST API (what the web UI calls)

| Method | Path           | Body / notes                                              |
| ------ | -------------- | -------------------------------------------------------- |
| GET    | `/health`      | `{ ok, tvConnected, tvIp }` — no auth, for status checks |
| GET    | `/status`      | `{ volume, muted, appId }`                                |
| POST   | `/command`     | `{ action, ...payload }` — see actions below             |
| POST   | `/app/launch`  | `{ id }` — launch an app by WebOS id                      |

All routes except `/health` require `Authorization: Bearer <API_TOKEN>` when a
token is configured.

**`/command` actions:**
`volume_up`, `volume_down`, `set_volume` `{volume}`, `mute` `{mute}`,
`channel_up`, `channel_down`, `power_off`, `switch_input` `{inputId}`,
`launch_app` `{id}`, `toast` `{message}`, and pointer buttons:
`up`, `down`, `left`, `right`, `ok`, `back`, `exit`, `home`, `menu`, `info`,
`play`, `pause`.

---

## Troubleshooting

- **"TV not connected"** — TV is off/asleep or `TV_IP` is wrong. WebOS only
  accepts connections while the TV is on. (`power_off` works; powering *on*
  over Wi-Fi requires Wake-on-LAN, which this proxy doesn't do yet.)
- **No pairing prompt** — confirm *LG Connect Apps* is enabled and that your
  Mac and TV are on the same subnet.
- **401 from the proxy** — the token in the web UI doesn't match `.env`.
- **Tunnel URL stopped working** — quick tunnels are ephemeral; restart
  `tunnel.sh` and update the URL in the web UI, or use a named tunnel.
