'use strict'

// The TV uses a self-signed TLS cert on wss://; disable verification for this local-only process.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * LG TV Proxy
 * -----------
 * A tiny local REST server that bridges the hosted LG Remote web UI to an
 * LG WebOS TV. Browsers can't talk to the TV's WebSocket directly (the TV
 * rejects browser origins with a 1008 "invalid origin" error), so this runs
 * on a machine on the same LAN as the TV and translates REST calls into
 * WebOS SSAP requests via the `lgtv2` library.
 *
 * Run it on your Mac, then expose it with `cloudflared` (see tunnel.sh) so the
 * HTTPS playground site can reach it without mixed-content problems.
 */

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const lgtvConnect = require('lgtv2')

const TV_IP = process.env.TV_IP || '192.168.1.28'
const PORT = parseInt(process.env.PORT || '3001', 10)
const API_TOKEN = (process.env.API_TOKEN || '').trim()
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

// --- TV connection -------------------------------------------------------

// lgtv2 manages the WebSocket, the pairing handshake, automatic reconnects,
// and persists the client key to ~/.lgtv2/keyfile-<ip> after first pairing.
const lgtv = lgtvConnect({
  url: `wss://${TV_IP}:3001`,
  reconnect: 5000,
  wsconfig: { tlsOptions: { rejectUnauthorized: false } },
})

let tvConnected = false
// Cached pointer-input socket for directional / nav buttons (UP, ENTER, BACK…).
let pointerSocket = null

lgtv.on('connect', () => {
  tvConnected = true
  pointerSocket = null
  console.log(`[tv] connected to ${TV_IP}`)
})

lgtv.on('close', () => {
  tvConnected = false
  pointerSocket = null
  console.log('[tv] connection closed')
})

lgtv.on('error', (err) => {
  tvConnected = false
  console.error('[tv] error:', err && err.message ? err.message : err)
})

lgtv.on('prompt', () => {
  console.log('[tv] pairing prompt sent — ACCEPT IT ON THE TV SCREEN to finish setup.')
})

// Promise wrapper around lgtv.request so handlers can await SSAP calls.
function request(uri, payload) {
  return new Promise((resolve, reject) => {
    if (!tvConnected) {
      reject(new Error('TV not connected'))
      return
    }
    lgtv.request(uri, payload || undefined, (err, res) => {
      if (err) reject(err instanceof Error ? err : new Error(String(err)))
      else if (res && res.returnValue === false)
        reject(new Error(res.errorText || 'TV rejected the request'))
      else resolve(res)
    })
  })
}

// The remote (D-pad, OK, BACK, HOME) rides a separate "pointer input" socket.
function getPointerSocket() {
  return new Promise((resolve, reject) => {
    if (pointerSocket) {
      resolve(pointerSocket)
      return
    }
    if (!tvConnected) {
      reject(new Error('TV not connected'))
      return
    }
    lgtv.getSocket(
      'ssap://com.webos.service.networkinput/getPointerInputSocket',
      (err, sock) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
          return
        }
        pointerSocket = sock
        resolve(sock)
      }
    )
  })
}

function sendButton(name) {
  return getPointerSocket()
    .then((sock) => {
      sock.send('button', { name })
      return { button: name }
    })
    .catch((err) => {
      pointerSocket = null
      throw err
    })
}

// --- Command map ---------------------------------------------------------

// Buttons that go over the pointer-input socket.
const POINTER_BUTTONS = {
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
  ok: 'ENTER',
  enter: 'ENTER',
  back: 'BACK',
  exit: 'EXIT',
  home: 'HOME',
  menu: 'MENU',
  info: 'INFO',
  play: 'PLAY',
  pause: 'PAUSE',
}

// SSAP request commands. Each returns a Promise.
const SSAP_COMMANDS = {
  volume_up: () => request('ssap://audio/volumeUp'),
  volume_down: () => request('ssap://audio/volumeDown'),
  set_volume: (p) => request('ssap://audio/setVolume', { volume: Number(p.volume) }),
  mute: (p) => request('ssap://audio/setMute', { mute: Boolean(p.mute) }),
  channel_up: () => request('ssap://tv/channelUp'),
  channel_down: () => request('ssap://tv/channelDown'),
  power_off: () => request('ssap://system/turnOff'),
  switch_input: (p) => request('ssap://tv/switchInput', { inputId: String(p.inputId) }),
  launch_app: (p) => request('ssap://system.launcher/launch', { id: String(p.id) }),
  toast: (p) =>
    request('ssap://system.notifications/createToast', { message: String(p.message) }),
}

// --- HTTP server ---------------------------------------------------------

const app = express()
app.use(express.json())

app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Shared-token auth. Skipped entirely if API_TOKEN is blank.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || req.path === '/health') {
    next()
    return
  }
  if (!API_TOKEN) {
    next()
    return
  }
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (token !== API_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
})

// Liveness + TV connection state. No auth required so the UI can show status.
app.get('/health', (req, res) => {
  res.json({ ok: true, tvConnected, tvIp: TV_IP })
})

// Current volume, mute, and foreground app.
app.get('/status', async (req, res) => {
  try {
    const [audio, foreground] = await Promise.all([
      request('ssap://audio/getVolume'),
      request('ssap://com.webos.applicationManager/getForegroundAppInfo').catch(() => null),
    ])
    res.json({
      tvConnected,
      volume: audio.volume,
      muted: audio.muted,
      appId: foreground ? foreground.appId : null,
    })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Generic command endpoint. Body: { action, ...payload }
app.post('/command', async (req, res) => {
  const { action, ...payload } = req.body || {}
  if (!action || typeof action !== 'string') {
    res.status(400).json({ error: 'Missing "action"' })
    return
  }
  try {
    let result
    if (POINTER_BUTTONS[action]) {
      result = await sendButton(POINTER_BUTTONS[action])
    } else if (SSAP_COMMANDS[action]) {
      result = await SSAP_COMMANDS[action](payload)
    } else {
      res.status(400).json({ error: `Unknown action "${action}"` })
      return
    }
    res.json({ ok: true, result })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Convenience alias used by the app-shortcut buttons.
app.post('/app/launch', async (req, res) => {
  const id = req.body && req.body.id
  if (!id) {
    res.status(400).json({ error: 'Missing "id"' })
    return
  }
  try {
    await SSAP_COMMANDS.launch_app({ id })
    res.json({ ok: true })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[proxy] listening on http://localhost:${PORT}`)
  console.log(`[proxy] target TV: ${TV_IP}:3001 (wss)`)
  console.log(`[proxy] auth: ${API_TOKEN ? 'enabled' : 'DISABLED (set API_TOKEN)'}`)
})
