# LG TV Proxy — Quick Reference

## Everyday use (already set up)

Open **two terminals** from this folder:

```bash
# Terminal 1 — proxy
./start.sh

# Terminal 2 — tunnel
./tunnel.sh
```

`tunnel.sh` prints a URL like `https://brave-cloud-1234.trycloudflare.com`.

In the **LG Remote** web app → **Settings**:
- **Proxy URL** → paste that tunnel URL
- **API Token** → value from `lg-tv-proxy/.env` (`API_TOKEN=...`)

You're done. The URL changes every time you restart the tunnel — update it in the web UI each time.

---

## What lives where

| File | Purpose |
|------|---------|
| `.env` | Your config (TV_IP, API_TOKEN, PORT) |
| `start.sh` | Starts the proxy on `localhost:3001` |
| `tunnel.sh` | Exposes proxy publicly via Cloudflare |
| `server.js` | The proxy itself |

---

## First-time setup (one time only)

1. Install prereqs: `brew install node cloudflared`
2. `cp .env.example .env` then edit it:
   - `TV_IP` — TV's IP (*Settings → Network → Advanced*)
   - `API_TOKEN` — run `openssl rand -hex 24`, paste result here
   - `ALLOWED_ORIGINS` — your Vercel URL, e.g. `https://stephen-onochie.vercel.app`
3. Run `./start.sh` — **a pairing prompt appears on the TV, accept it with the remote**
4. Key is saved to `~/.lgtv2/keyfile-<tv-ip>` — you won't be prompted again

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "TV not connected" | TV is off or sleeping — wake it up |
| No pairing prompt | Check *Settings → General → Mobile TV On* and *Network → LG Connect Apps* are enabled |
| 401 error in web UI | Token in web UI doesn't match `API_TOKEN` in `.env` |
| Tunnel URL not working | Restart `tunnel.sh`, update URL in web UI |

---

## Permanent tunnel URL (optional)

Quick tunnels change on every restart. To get a stable URL:

```bash
cloudflared tunnel login
cloudflared tunnel create lg-remote
# Route a hostname, then:
cloudflared tunnel run lg-remote
```

See [Cloudflare docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) for full setup.
