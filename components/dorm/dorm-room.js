/* eslint-disable */
/* Dorm OS — stylized low-poly 3D dorm room diorama.
   Custom element <dorm-room>. Requires window.THREE (set by DormStage).
   Units: 1 = 1 ft. Room: x -7..7 (west wall at -7), z -8..8 (north wall/window at -8).

   v2: movable-unit architecture. Every piece of furniture is a self-contained
   group (geometry + its lights/glows/click targets + an invisible drag proxy)
   registered in this.movables with a placement:
     floor items: { kind:'floor', x, z, rotY }          — drag + rotate
     wall items:  { kind:'wall', wall:'north'|'west', u, y } — slide/transfer walls
   Fixed: room shell, closets, door+mirror, window+curtains, radiator, box fans,
   string lights / LED strip (wall fixtures), outlets, hook rack.
   Custom AI-generated items are built from a primitive-assembly spec via
   addCustomItem(). Layout round-trips through getLayout()/applyLayout(). */
(function () {
  'use strict';

  var DEFAULTS = {
    mode: 'day',
    lightsOn: false,
    computerOn: false,
    tvOn: false,
    curtainsOpen: true,
    fansOn: false
  };

  var WEST_X = -6.85;   // resting plane for west-wall hung items
  var NORTH_Z = -7.85;  // resting plane for north-wall hung items
  var GOLD = 0xC9A84C;
  var RED = 0xE5484D;

  function whenThree(cb) {
    if (window.THREE) return cb();
    var iv = setInterval(function () {
      if (window.THREE) { clearInterval(iv); cb(); }
    }, 40);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(cur, tgt, k, dt) { return lerp(cur, tgt, 1 - Math.exp(-k * dt)); }
  function deepCopy(v) { return JSON.parse(JSON.stringify(v)); }

  class DormRoom extends HTMLElement {
    connectedCallback() {
      if (this._booted) return;
      this._booted = true;
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.width = this.style.width || '100%';
      this.style.height = this.style.height || '100%';
      this.style.touchAction = 'none';
      this.state = Object.assign({}, DEFAULTS);
      var self = this;
      whenThree(function () { self._setup(); });
    }

    disconnectedCallback() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
      if (this.renderer) this.renderer.dispose();
      this._booted = false;
    }

    /* ---------- public API: room state ---------- */
    setRoomState(partial) {
      var prev = this.state.mode;
      Object.assign(this.state, partial);
      if (partial.mode === 'night' && prev !== 'night') this.state.lightsOn = true;
      this._emit();
    }
    getRoomState() { return Object.assign({}, this.state); }
    resetView() { this._tweenCamera(); this._idleT = 0; }
    setEditMode(on) {
      this._editMode = !!on;
      if (!on) {
        this._select(null);
        if (this._floatingEntry) this._settleFloating(this._floatingEntry);
        this._dragObj = null;
      }
      if (this.renderer) this.renderer.domElement.style.cursor = 'grab';
    }
    zoomBy(factor) { this._tween = null; this._idleT = 0; this.orbit.radius = Math.max(13, Math.min(40, this.orbit.radius * factor)); this._applyOrbit(); }
    clearSelection() { this._select(null); }

    /* ---------- public API: layout ---------- */
    getLayout() {
      var out = {};
      for (var id in this.movables) out[id] = deepCopy(this.movables[id].cur);
      return out;
    }
    getDefaultLayout() {
      var out = {};
      for (var id in this.movables) out[id] = deepCopy(this.movables[id].def);
      return out;
    }
    applyLayout(map) {
      if (!map) return;
      for (var id in map) {
        var e = this.movables[id];
        if (!e || !map[id] || map[id].kind !== e.cur.kind) continue;
        e.cur = this._sanitizePlacement(e, map[id]);
        this._place(e);
      }
    }
    resetLayout() {
      for (var id in this.movables) {
        var e = this.movables[id];
        if (e.custom) continue; // custom items keep their spot
        e.cur = deepCopy(e.def);
        this._place(e);
      }
      this._emitLayout();
    }
    rotateItem(id, deltaDeg) {
      var e = this.movables[id];
      if (!e || e.kind !== 'floor') return;
      e.cur.rotY = (e.cur.rotY || 0) + deltaDeg * Math.PI / 180;
      this._place(e);
      this._emitLayout();
    }
    storeItem(id) {
      var e = this.movables[id];
      if (!e || e.cur.stored) return;
      if (this._selected === e) this._select(null);
      if (this._dragObj === e) this._dragObj = null;
      if (this._floatingEntry === e) this._settleFloating(e);
      e.cur.stored = true;
      this._place(e);
      this._emitLayout();
    }
    restoreItem(id) {
      var e = this.movables[id];
      if (!e || !e.cur.stored) return;
      e.cur.stored = false;
      this._place(e);
      if (this._editMode) this._select(e);
      this._emitLayout();
    }
    listMovables() {
      var out = [];
      for (var id in this.movables) {
        var e = this.movables[id];
        out.push({ id: e.id, label: e.label, custom: !!e.custom, kind: e.kind, stored: !!e.cur.stored });
      }
      return out;
    }
    resetItem(id) {
      var e = this.movables[id];
      if (!e) return;
      e.cur = deepCopy(e.def);
      this._place(e);
      this._emitLayout();
    }

    /* ---------- public API: custom items ---------- */
    addCustomItem(id, spec, placement) {
      if (this.movables[id]) this.removeCustomItem(id);
      var group = this._buildSpec(spec);
      this.room.add(group);
      var b = spec._bounds; // computed in _buildSpec
      var def = placement && placement.kind === 'floor'
        ? deepCopy(placement)
        : { kind: 'floor', x: 0.5, z: 4.8, rotY: 0 };
      var e = this._registerFloor(id, group, b.w, b.d, b.h, spec.name || 'Custom item', def);
      e.custom = true;
      this._place(e);
      return deepCopy(e.cur);
    }
    removeCustomItem(id) {
      var e = this.movables[id];
      if (!e || !e.custom) return;
      if (this._selected === e) this._select(null);
      this.room.remove(e.group);
      var idx = this.proxyMeshes.indexOf(e.proxy);
      if (idx >= 0) this.proxyMeshes.splice(idx, 1);
      delete this.movables[id];
    }

    /* ---------- events ---------- */
    _emit() {
      this.dispatchEvent(new CustomEvent('roomstate', { detail: this.getRoomState(), bubbles: true }));
    }
    _emitLayout() {
      this.dispatchEvent(new CustomEvent('layoutchange', { detail: this.getLayout(), bubbles: true }));
    }
    _emitSelect() {
      var e = this._selected;
      this.dispatchEvent(new CustomEvent('editselect', {
        detail: e ? { id: e.id, label: e.label, custom: !!e.custom, kind: e.kind } : null,
        bubbles: true
      }));
    }

    /* ---------- setup ---------- */
    _setup() {
      var T = window.THREE;
      this.T = T;
      this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      var w = this.clientWidth || 800, h = this.clientHeight || 600;
      var renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      var softwareGL = false;
      try {
        var gl = renderer.getContext();
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        var rname = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
        softwareGL = /swiftshader|software|llvmpipe|basic|angle \(google/i.test(rname);
      } catch (e) {}
      this._shadows = !softwareGL;
      renderer.setPixelRatio(softwareGL ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = this._shadows;
      renderer.shadowMap.type = T.PCFShadowMap;
      if ('outputColorSpace' in renderer && T.SRGBColorSpace) renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.domElement.style.display = 'block';
      this.appendChild(renderer.domElement);
      this.renderer = renderer;

      var tip = document.createElement('div');
      tip.style.cssText = 'position:absolute;pointer-events:none;display:none;padding:4px 9px;' +
        'background:#2C1F0E;color:#F5F0E8;font:600 10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;' +
        'letter-spacing:0.22em;text-transform:uppercase;border-radius:6px;white-space:nowrap;z-index:5;' +
        'transform:translate(-50%,-130%);border:1px solid #C9A84C';
      this.appendChild(tip);
      this.tip = tip;

      var scene = new T.Scene();
      scene.background = new T.Color('#F5F0E8');
      this.scene = scene;
      this._bgDay = new T.Color('#F5F0E8');
      this._bgNight = new T.Color('#191410');

      var cam = new T.PerspectiveCamera(38, w / h, 0.1, 200);
      this.camera = cam;
      this.orbit = { theta: 0.62, phi: 1.02, radius: 27, target: new T.Vector3(0, 3.0, 0) };
      this.orbitDefault = { theta: 0.62, phi: 1.02, radius: 27 };
      this._applyOrbit();

      this._buildLights();
      this._buildRoom();
      this._bindInput();

      var self = this;
      this._ro = new ResizeObserver(function () { self._resize(); });
      this._ro.observe(this);

      this.clock = new T.Clock();
      this._idleT = 0;
      this._loop();
      this._emit();
    }

    _resize() {
      var w = this.clientWidth, h = this.clientHeight;
      if (!w || !h || !this.renderer) return;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    /* ---------- materials & helpers ---------- */
    _mat(color, opts) {
      return new this.T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.92, metalness: 0.02 }, opts || {}));
    }
    _box(w, h, d, mat, x, y, z, parent, ry) {
      var T = this.T;
      var mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      if (ry) mesh.rotation.y = ry;
      mesh.castShadow = true; mesh.receiveShadow = true;
      (parent || this.room).add(mesh);
      return mesh;
    }
    _glowTexture() {
      if (this._glowTex) return this._glowTex;
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d');
      var grd = g.createRadialGradient(64, 64, 2, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,236,180,1)');
      grd.addColorStop(0.35, 'rgba(255,220,140,0.45)');
      grd.addColorStop(1, 'rgba(255,210,120,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      this._glowTex = new this.T.CanvasTexture(c);
      return this._glowTex;
    }
    _glowSprite(scale, tint) {
      var T = this.T;
      var m = new T.SpriteMaterial({ map: this._glowTexture(), color: tint || 0xffe2a8, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false });
      var s = new T.Sprite(m);
      s.scale.set(scale, scale, 1);
      return s;
    }
    _plankTexture() {
      var c = document.createElement('canvas'); c.width = 512; c.height = 512;
      var g = c.getContext('2d');
      g.fillStyle = '#9A6B41'; g.fillRect(0, 0, 512, 512);
      for (var r = 0; r < 8; r++) {
        var y = r * 64;
        g.fillStyle = r % 2 ? '#94663D' : '#A17045';
        g.fillRect(0, y, 512, 62);
        g.fillStyle = 'rgba(90,58,32,0.55)';
        g.fillRect(0, y + 62, 512, 2);
        g.fillRect((r * 187) % 512, y, 2, 62);
      }
      var t = new this.T.CanvasTexture(c);
      t.wrapS = t.wrapT = this.T.RepeatWrapping;
      t.repeat.set(2, 2.3);
      return t;
    }

    /* ---------- movable registry ---------- */
    _registerFloor(id, group, w, d, h, label, def) {
      var T = this.T;
      var proxy = new T.Mesh(new T.BoxGeometry(w, h, d),
        new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      proxy.position.set(0, h / 2, 0);
      proxy.castShadow = proxy.receiveShadow = false;
      group.add(proxy);
      var e = { id: id, kind: 'floor', group: group, proxy: proxy, w: w, d: d, label: label, def: deepCopy(def), cur: deepCopy(def), custom: false };
      proxy.userData.movableId = id;
      this.movables[id] = e;
      this.proxyMeshes.push(proxy);
      return e;
    }
    _registerWall(id, group, w, h, label, def) {
      var T = this.T;
      var proxy = new T.Mesh(new T.BoxGeometry(w, h, 0.6),
        new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      proxy.position.set(0, 0, 0.15);
      proxy.castShadow = proxy.receiveShadow = false;
      group.add(proxy);
      var e = { id: id, kind: 'wall', group: group, proxy: proxy, w: w, h: h, label: label, def: deepCopy(def), cur: deepCopy(def), custom: false };
      proxy.userData.movableId = id;
      this.movables[id] = e;
      this.proxyMeshes.push(proxy);
      return e;
    }
    _place(e) {
      e.group.visible = !e.cur.stored;
      if (e.kind === 'floor') {
        var hw = e.w / 2, hd = e.d / 2;
        e.cur.x = Math.max(-7 + hw, Math.min(7 - hw, e.cur.x));
        e.cur.z = Math.max(-8 + hd, Math.min(7.4 - hd, e.cur.z));
        e.group.position.set(e.cur.x, 0, e.cur.z);
        e.group.rotation.y = e.cur.rotY || 0;
      } else {
        if (e.cur.wall === 'west') {
          e.cur.u = this._clampWestU(e.cur.u, e.w / 2);
          e.group.position.set(WEST_X, e.cur.y, e.cur.u);
          e.group.rotation.y = Math.PI / 2;
        } else {
          e.cur.u = this._clampNorthU(e.cur.u, e.w / 2);
          e.group.position.set(e.cur.u, e.cur.y, NORTH_Z);
          e.group.rotation.y = 0;
        }
      }
    }
    _sanitizePlacement(e, p) {
      var out = deepCopy(e.cur);
      if (e.kind === 'floor') {
        if (typeof p.x === 'number') out.x = p.x;
        if (typeof p.z === 'number') out.z = p.z;
        if (typeof p.rotY === 'number') out.rotY = p.rotY;
      } else {
        if (p.wall === 'west' || p.wall === 'north') out.wall = p.wall;
        if (typeof p.u === 'number') out.u = p.u;
        if (typeof p.y === 'number') out.y = p.y;
      }
      out.stored = !!p.stored;
      return out;
    }
    _clampWestU(u, hw) { return Math.max(-7.7 + hw, Math.min(7.9 - hw, u)); }
    _clampNorthU(u, hw) {
      // north wall exists only beside the window (window spans x -2.7..2.7)
      var left = Math.max(-6.9 + hw, Math.min(-2.6 - hw, u));
      var right = Math.max(2.6 + hw, Math.min(6.9 - hw, u));
      return Math.abs(left - u) <= Math.abs(right - u) ? left : right;
    }
    _select(e) {
      if (this._selected === e) return;
      this._selected = e || null;
      if (this.selHelper) {
        this.selHelper.visible = !!e;
        if (e) this.selHelper.setFromObject(e.proxy);
      }
      this._emitSelect();
    }
    _settleFloating(e) {
      // invalid wall drop: revert to the last valid placement
      this._floatingEntry = null;
      if (this.errHelper) this.errHelper.visible = false;
      if (e._lastValid) e.cur = deepCopy(e._lastValid);
      this._place(e);
    }

    /* ---------- lights (fixed fixtures only; unit lights live in their groups) ---------- */
    _buildLights() {
      var T = this.T;
      this.hemi = new T.HemisphereLight(0xfff3de, 0xb3a087, 1.05);
      this.scene.add(this.hemi);

      var sun = new T.DirectionalLight(0xffe2b0, 1.7);
      sun.position.set(4, 14, -13);
      sun.castShadow = this._shadows;
      sun.shadow.mapSize.set(768, 768);
      sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
      sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14;
      sun.shadow.bias = -0.0006;
      this.scene.add(sun);
      this.sun = sun;

      // string-light pools (wall fixtures) + LED strip — fixed
      this.loftLight = new T.PointLight(0xE2C97E, 0, 11, 2); this.loftLight.position.set(-4, 5.6, -4); this.scene.add(this.loftLight);
      this.windowLight = new T.PointLight(0xE2C97E, 0, 10, 2); this.windowLight.position.set(0, 6.2, -6.5); this.scene.add(this.windowLight);
      this.ledLight = new T.PointLight(0xE2C97E, 0, 7, 2); this.ledLight.position.set(-6.2, 1.4, 2.3); this.scene.add(this.ledLight);
    }

    /* ---------- the room ---------- */
    _buildRoom() {
      var T = this.T;
      var room = new T.Group();
      this.room = room;
      this.scene.add(room);
      this.hitMeshes = [];
      this.proxyMeshes = [];
      this.movables = {};
      this._selected = null;
      this._floatingEntry = null;
      var self0 = this;

      /* palette */
      var WALL = this._mat('#EFE5D2');
      var WALL_IN = this._mat('#F2E9D8');
      var WOOD = this._mat('#C79A5E');
      var WOOD_DK = this._mat('#A97C46');
      var TEXTILE = this._mat('#E9DCC1');
      var CAMEL = this._mat('#C9A874');
      var SOFA = this._mat('#7C5B3B', { roughness: 1 });
      var DARK = this._mat('#4A3D2A');
      var WHITE = this._mat('#F7F2E8', { roughness: 0.6 });
      var GREEN = this._mat('#5F7A4A');
      var BLACK = this._mat('#3A3128', { roughness: 0.7 });

      /* hit helper — view-mode interaction targets, parented to any group */
      function hit(w, h, d, x, y, z, parent, action, label) {
        var m = new T.Mesh(new T.BoxGeometry(w, h, d),
          new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        m.position.set(x, y, z); m.userData = { action: action, label: label };
        m.castShadow = m.receiveShadow = false;
        parent.add(m); self0.hitMeshes.push(m); return m;
      }

      /* ---- base / floor ---- */
      var floorMat = new T.MeshStandardMaterial({ map: this._plankTexture(), roughness: 0.9 });
      this._box(14.8, 0.5, 16.8, floorMat, 0, -0.25, 0).castShadow = false;
      this._box(15.6, 0.7, 17.6, this._mat('#D9CDB6'), 0, -0.86, 0).castShadow = false;

      /* contact shadow */
      var shTex = (function (self) {
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d');
        var grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
        grd.addColorStop(0, 'rgba(60,45,28,0.34)');
        grd.addColorStop(1, 'rgba(60,45,28,0)');
        g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
        return new self.T.CanvasTexture(c);
      })(this);
      var shadow = new T.Mesh(new T.PlaneGeometry(30, 30),
        new T.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = -2.4;
      room.add(shadow);

      /* ---- walls (north + west up; cutaway) ---- */
      var WH = 8, WT = 0.5;
      this._box(4.8, WH, WT, WALL, -4.9, WH / 2, -8 - WT / 2);
      this._box(4.8, WH, WT, WALL, 4.9, WH / 2, -8 - WT / 2);
      this._box(5, 1.5, WT, WALL, 0, WH - 0.75, -8 - WT / 2);
      this._box(5, 2.5, WT, WALL, 0, 1.25, -8 - WT / 2);
      this._box(WT, WH, 17.3, WALL_IN, -7 - WT / 2, WH / 2, 0);
      this._box(15.3, 0.25, 0.6, WOOD_DK, 0, WH + 0.1, -8 - WT / 2).castShadow = false;
      this._box(0.6, 0.25, 17.3, WOOD_DK, -7 - WT / 2, WH + 0.1, 0).castShadow = false;

      /* ---- window (fixed) ---- */
      var winG = new T.Group(); winG.position.set(0, 4.5, -8); room.add(winG);
      this._box(5.4, 0.22, 0.35, WOOD_DK, 0, 2.05, 0, winG);
      this._box(5.4, 0.22, 0.35, WOOD_DK, 0, -2.05, 0, winG);
      this._box(0.22, 4.3, 0.35, WOOD_DK, -2.6, 0, 0, winG);
      this._box(0.22, 4.3, 0.35, WOOD_DK, 2.6, 0, 0, winG);
      this._box(0.12, 4.0, 0.2, WOOD_DK, 0, 0, 0, winG);
      this.skyMat = new T.MeshBasicMaterial({ color: '#FFE9BC' });
      var glass = new T.Mesh(new T.PlaneGeometry(5, 4), this.skyMat);
      glass.position.set(0, 0, -0.05); winG.add(glass);
      this._box(5.8, 0.18, 0.7, WOOD, 0, -2.2, 0.25, winG);
      this.curtainL = this._box(2.5, 4.6, 0.14, this._mat('#E4D3AE'), -1.3, 0.1, 0.45, winG);
      this.curtainR = this._box(2.5, 4.6, 0.14, this._mat('#E4D3AE'), 1.3, 0.1, 0.45, winG);
      this._box(6.0, 0.12, 0.12, WOOD_DK, 0, 2.5, 0.45, winG);
      this._curtainT = 1;
      hit(6.2, 5.2, 1.2, 0, 4.5, -7.4, room, 'curtains', 'Curtains');

      /* ---- radiator + ledge + box fans (fixed) ---- */
      var RADW = 14 * 0.6, radMat = this._mat('#E4DFD4', { roughness: 0.5, metalness: 0.25 });
      var rad = new T.Group(); rad.position.set(0, 0, -7.5); room.add(rad);
      this._box(RADW, 1.8, 0.4, radMat, 0, 1.15, 0, rad);
      this._box(RADW + 0.2, 0.18, 0.5, radMat, 0, 2.1, 0, rad);
      this._box(RADW + 0.2, 0.16, 0.5, radMat, 0, 0.28, 0, rad);
      var fins = Math.round(RADW / 0.3);
      for (var fi = 0; fi <= fins; fi++)
        this._box(0.1, 1.5, 0.46, radMat, -RADW / 2 + fi * (RADW / fins), 1.15, 0.04, rad).receiveShadow = false;
      this._box(0.16, 0.5, 0.16, radMat, -RADW / 2 + 0.2, 0.55, 0.28, rad);
      this._box(0.16, 0.5, 0.16, radMat, RADW / 2 - 0.2, 0.55, 0.28, rad);

      var ledgeMat = this._mat('#B79B6E', { roughness: 0.9 });
      this._box(RADW + 1.0, 0.22, 0.95, ledgeMat, 0, 2.28, -7.45);
      this._box(RADW + 1.0, 0.12, 0.14, WOOD_DK, 0, 2.16, -7.02).castShadow = false;

      this.fanBlades = [];
      var boxFrame = this._mat('#EDE8DC', { roughness: 0.7 });
      var boxGrille = this._mat('#B8B2A4', { roughness: 0.6 });
      [-1.55, 1.55].forEach(function (fx) {
        var bf = new T.Group(); bf.position.set(fx, 3.2, -7.05); room.add(bf);
        self0._box(1.7, 1.7, 0.55, boxFrame, 0, 0, 0, bf);
        self0._box(1.4, 1.4, 0.12, self0._mat('#2C2A26'), 0, 0, 0.24, bf);
        var blade = new T.Group(); blade.position.set(0, 0, 0.3); bf.add(blade);
        for (var bl = 0; bl < 4; bl++) {
          var b = new T.Mesh(new T.BoxGeometry(0.55, 0.14, 0.04), boxGrille);
          b.position.set(0, 0, 0); b.rotation.z = bl * Math.PI / 2;
          b.geometry.translate(0.32, 0, 0);
          blade.add(b);
        }
        self0._box(0.18, 0.18, 0.16, self0._mat('#8C7355'), 0, 0, 0.34, bf);
        for (var gr = 0; gr < 6; gr++) {
          var bar = self0._box(1.5, 0.05, 0.03, boxGrille, 0, 0, 0.42, bf);
          bar.rotation.z = gr * Math.PI / 6; bar.castShadow = false;
        }
        self0.fanBlades.push(blade);
      });
      hit(4.4, 2.2, 1.0, 0, 3.2, -7.05, room, 'fans', 'Fans');

      /* ---- sun shaft + dust motes (fixed, tied to window) ---- */
      var shaft = new T.Mesh(new T.PlaneGeometry(4.6, 9.5),
        new T.MeshBasicMaterial({ color: 0xffe6ae, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      shaft.position.set(0, 3.4, -4.6); shaft.rotation.x = -0.62; room.add(shaft);
      this.shaft = shaft;
      var moteGeo = new T.BufferGeometry(), N = 55, pos = new Float32Array(N * 3);
      this._motes = [];
      for (var i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 4.2; pos[i * 3 + 1] = Math.random() * 5 + 0.4; pos[i * 3 + 2] = -7 + Math.random() * 5;
        this._motes.push({ s: Math.random() * 2 + 0.4, p: Math.random() * 6.28 });
      }
      moteGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
      this.moteMat = new T.PointsMaterial({ color: 0xffedc2, size: 0.07, transparent: true, opacity: 0, depthWrite: false });
      this.motePts = new T.Points(moteGeo, this.moteMat); room.add(this.motePts);

      /* ---- string lights (wall fixtures, fixed) ---- */
      var bulbGeo = new T.SphereGeometry(0.075, 8, 8);
      this.bulbMat = new T.MeshStandardMaterial({ color: '#E2C97E', emissive: '#E2C97E', emissiveIntensity: 0, roughness: 0.5 });
      var bulbs = new T.Group(); room.add(bulbs);
      for (var ni = 0; ni <= 24; ni++) {
        var bn = new T.Mesh(bulbGeo, this.bulbMat);
        bn.position.set(-6.3 + ni * (12.6 / 24), 7.45 + Math.sin(ni * 1.7) * 0.05, -7.55);
        bulbs.add(bn);
      }
      for (var wj = 0; wj <= 28; wj++) {
        var bw = new T.Mesh(bulbGeo, this.bulbMat);
        bw.position.set(-6.92, 7.45 + Math.sin(wj * 1.7) * 0.05, -7.5 + wj * (15 / 28));
        bulbs.add(bw);
      }
      this.winGlow = this._glowSprite(3.6); this.winGlow.position.set(0, 7.3, -7.4); room.add(this.winGlow);
      this.wallGlows = [];
      [[-6.3, 7.4, -7.4], [5.6, 7.4, -7.4], [-6.85, 7.4, -3.5], [-6.85, 7.4, 4.0], [-3.0, 7.4, -7.4]].forEach(function (p) {
        var gs = self0._glowSprite(3.2); gs.position.set(p[0], p[1], p[2]); room.add(gs); self0.wallGlows.push(gs);
      });
      hit(5.6, 0.9, 1.0, 0, 7.5, -7.55, room, 'lights', 'String lights');
      hit(1.0, 0.9, 12.0, -6.92, 7.5, 0, room, 'lights', 'String lights');

      /* ================= MOVABLE UNITS ================= */

      /* ---- loft bed (frame + bedding + ladder) ---- */
      var loft = new T.Group(); room.add(loft);
      var postXs = [-1.6, 1.6], postZs = [-3.2, 3.2];
      for (var px = 0; px < 2; px++) for (var pz = 0; pz < 2; pz++)
        this._box(0.3, 6.6, 0.3, WOOD, postXs[px], 3.3, postZs[pz], loft);
      this._box(3.5, 0.35, 0.3, WOOD, 0, 5, -3.2, loft);
      this._box(3.5, 0.35, 0.3, WOOD, 0, 5, 3.2, loft);
      this._box(0.3, 0.35, 6.7, WOOD, -1.6, 5, 0, loft);
      this._box(0.3, 0.35, 6.7, WOOD, 1.6, 5, 0, loft);
      this._box(3.2, 0.16, 6.4, WOOD_DK, 0, 5.2, 0, loft);
      this._box(3.05, 0.55, 6.2, TEXTILE, 0, 5.55, 0, loft);
      this._box(3.05, 0.28, 3.4, CAMEL, 0, 5.95, 1.2, loft);
      this._box(2.4, 0.3, 1.4, this._mat('#8A6647'), 0.2, 6.0, 2.25, loft);
      this._box(1.7, 0.35, 0.9, WHITE, 0, 6.0, -2.5, loft);
      this._box(0.14, 0.9, 5.4, WOOD, 1.65, 6.1, 0, loft);
      var ladG = new T.Group(); ladG.position.set(0.75, 0, 3.5); loft.add(ladG);
      this._box(0.18, 5.6, 0.18, WOOD_DK, -0.7, 2.8, 0, ladG);
      this._box(0.18, 5.6, 0.18, WOOD_DK, 0.7, 2.8, 0, ladG);
      for (var lr = 0; lr < 5; lr++) this._box(1.4, 0.14, 0.14, WOOD_DK, 0, 0.8 + lr * 1.05, 0, ladG);
      this._registerFloor('loft', loft, 3.6, 7.6, 6.8, 'Lofted bed', { kind: 'floor', x: -5.15, z: -3.95, rotY: 0 });
      this._place(this.movables.loft);

      /* ---- desk + hutch unit ---- */
      var desk = new T.Group(); room.add(desk);
      this._box(2.0, 0.16, 3.33, WOOD, 0, 2.5, 0, desk);
      this._box(0.14, 2.5, 3.33, WOOD_DK, 0.9, 1.25, 0, desk);
      this._box(0.14, 2.5, 3.33, WOOD_DK, -0.9, 1.25, 0, desk);
      this._box(0.9, 0.14, 3.33, WOOD, -0.55, 4.6, 0, desk);
      this._box(0.9, 2.04, 0.14, WOOD_DK, -0.55, 3.58, -1.6, desk);
      this._box(0.9, 2.04, 0.14, WOOD_DK, -0.55, 3.58, 1.6, desk);
      this._box(0.5, 0.62, 0.16, this._mat('#8A6647'), 0.6, 2.89, -1.4, desk);
      this._box(0.5, 0.56, 0.16, GREEN, 0.6, 2.86, -1.2, desk);
      this._box(0.5, 0.66, 0.16, this._mat('#C9A84C'), 0.6, 2.91, -1.0, desk);
      var mon = new T.Group(); mon.position.set(-0.35, 2.58, -0.6); desk.add(mon);
      this._box(0.5, 0.06, 0.5, DARK, 0, 0.03, 0, mon);
      this._box(0.08, 0.5, 0.08, DARK, 0, 0.3, 0, mon);
      this._box(0.1, 1.15, 1.9, DARK, 0, 1.1, 0, mon);
      this.monScreen = new T.Mesh(new T.PlaneGeometry(1.74, 1.0),
        new T.MeshStandardMaterial({ color: '#1c1712', emissive: '#cfe0ff', emissiveIntensity: 0, roughness: 0.4 }));
      this.monScreen.rotation.y = Math.PI / 2; this.monScreen.position.set(0.06, 1.12, 0); mon.add(this.monScreen);
      var lap = new T.Group(); lap.position.set(-0.2, 2.58, 0.9); lap.rotation.y = -0.35; desk.add(lap);
      this._box(0.95, 0.05, 0.7, this._mat('#D8D3C8', { metalness: 0.4, roughness: 0.5 }), 0, 0.03, 0, lap);
      var lid = this._box(0.05, 0.65, 0.95, this._mat('#D8D3C8', { metalness: 0.4, roughness: 0.5 }), 0.45, 0.36, 0, lap);
      lid.rotation.z = 0.32;
      this.lapScreen = new T.Mesh(new T.PlaneGeometry(0.82, 0.52),
        new T.MeshStandardMaterial({ color: '#1c1712', emissive: '#cfe0ff', emissiveIntensity: 0, roughness: 0.4 }));
      this.lapScreen.position.set(0.34, 0.38, 0); this.lapScreen.rotation.y = Math.PI / 2; this.lapScreen.rotation.z = 0.32; lap.add(this.lapScreen);
      this._box(0.3, 0.06, 0.3, DARK, -0.5, 2.6, -1.35, desk);
      this._box(0.06, 0.8, 0.06, DARK, -0.5, 3.0, -1.35, desk);
      this._box(0.4, 0.18, 0.22, this._mat('#C9A84C'), -0.4, 3.42, -1.35, desk);
      this.deskLight = new T.PointLight(0xcfe0ff, 0, 6, 2); this.deskLight.position.set(0.2, 3.4, -0.1); desk.add(this.deskLight);
      this.deskGlow = this._glowSprite(2.2, 0xcfe0ff); this.deskGlow.position.set(0.1, 3.7, -0.5); desk.add(this.deskGlow);
      hit(2.2, 2.4, 3.4, 0.2, 3.6, 0, desk, 'computer', 'Computer');
      this._registerFloor('desk', desk, 2.2, 3.5, 4.8, 'Desk', { kind: 'floor', x: -5.7, z: -5.8, rotY: 0 });
      this._place(this.movables.desk);

      /* ---- desk chair ---- */
      var chair = new T.Group(); room.add(chair); this.chair = chair;
      this._box(1.15, 0.14, 1.15, WOOD, 0, 1.35, 0, chair);
      this._box(1.05, 0.16, 1.05, CAMEL, 0, 1.48, 0, chair);
      for (var cl = 0; cl < 4; cl++)
        this._box(0.12, 1.35, 0.12, WOOD_DK, (cl % 2 ? 0.45 : -0.45), 0.67, (cl < 2 ? 0.45 : -0.45), chair);
      this._box(0.12, 1.5, 1.05, WOOD, -0.52, 2.2, 0, chair);
      this._registerFloor('chair', chair, 1.5, 1.5, 2.9, 'Desk chair', { kind: 'floor', x: -4.6, z: -5.7, rotY: 0.5 });
      this._place(this.movables.chair);

      /* ---- accent rug under chair ---- */
      var deskRug = new T.Group(); room.add(deskRug);
      this._box(2.4, 0.08, 2.2, this._mat('#B79668', { roughness: 1 }), 0, 0.05, 0, deskRug).castShadow = false;
      this._registerFloor('deskRug', deskRug, 2.4, 2.2, 0.4, 'Accent rug', { kind: 'floor', x: -4.7, z: -5.6, rotY: 0 });
      this._place(this.movables.deskRug);

      /* ---- dresser (diffuser rides on top) ---- */
      var dresser = new T.Group(); room.add(dresser);
      this._box(2.0, 2.5, 2.5, WOOD, 0, 1.25, 0, dresser);
      for (var dr = 0; dr < 3; dr++) {
        this._box(0.08, 0.62, 2.2, WOOD_DK, 1.02, 0.5 + dr * 0.78, 0, dresser);
        this._box(0.1, 0.1, 0.5, DARK, 1.1, 0.5 + dr * 0.78, 0, dresser);
      }
      var dif = new T.Group(); dif.position.set(0.3, 2.5, 0); dresser.add(dif);
      var difBody = new T.Mesh(new T.CylinderGeometry(0.22, 0.26, 0.42, 14), this._mat('#EDE4D2', { roughness: 0.6 }));
      difBody.position.y = 0.21; difBody.castShadow = true; dif.add(difBody);
      var difTop = new T.Mesh(new T.CylinderGeometry(0.14, 0.22, 0.16, 14), WOOD); difTop.position.y = 0.5; dif.add(difTop);
      hit(0.9, 1.1, 0.9, 0.3, 3.0, 0, dresser, 'diffuser', 'Diffuser');
      this._registerFloor('dresser', dresser, 2.2, 2.6, 3.6, 'Dresser', { kind: 'floor', x: -5.7, z: -2.6, rotY: 0 });
      this._place(this.movables.dresser);
      /* mist sprites live in dresser space so they follow it */
      this.mist = [];
      this._difLocal = new T.Vector3(0.3, 3.1, 0);
      for (var mi = 0; mi < 9; mi++) {
        var ms = this._glowSprite(0.4, 0xf2ede2);
        ms.material.blending = T.NormalBlending; ms.position.copy(this._difLocal);
        ms.userData = { t: -(mi * 0.9 + Math.random()), dx: 0 }; dresser.add(ms); this.mist.push(ms);
      }

      /* ---- media unit (console + TV) ---- */
      var media = new T.Group(); room.add(media);
      for (var cleg = 0; cleg < 4; cleg++)
        this._box(0.2, 0.75, 0.2, WOOD_DK, (cleg < 2 ? -0.45 : 0.45), 0.375, (cleg % 2 ? -1.9 : 1.9), media);
      this._box(1.3, 2.0, 4.2, WOOD, 0, 1.75, 0, media);
      this._box(1.34, 0.16, 4.24, WOOD_DK, 0, 2.8, 0, media);
      for (var cd = -1; cd <= 1; cd += 2) {
        this._box(0.08, 1.5, 1.9, WOOD_DK, 0.66, 1.75, cd * 1.02, media);
        this._box(0.1, 0.1, 0.4, DARK, 0.72, 1.75, cd * 1.02, media);
      }
      var tvG = new T.Group(); tvG.position.set(0.15, 4.2, 0); media.add(tvG);
      this._box(0.5, 0.1, 1.2, DARK, -0.05, -1.3, 0, tvG);
      this._box(0.16, 2.1, 3.7, BLACK, 0, 0, 0, tvG);
      this.tvScreen = new T.Mesh(new T.PlaneGeometry(3.45, 1.86),
        new T.MeshStandardMaterial({ color: '#14100C', emissive: '#bfd4ff', emissiveIntensity: 0, roughness: 0.35 }));
      this.tvScreen.rotation.y = Math.PI / 2; this.tvScreen.position.x = 0.09; tvG.add(this.tvScreen);
      this.tvGlow = this._glowSprite(3.4, 0xbfd4ff); this.tvGlow.position.set(0.65, 4.2, 0); media.add(this.tvGlow);
      this.tvLight = new T.PointLight(0xbfd4ff, 0, 8, 2); this.tvLight.position.set(0.75, 3.7, 0.1); media.add(this.tvLight);
      this._box(0.35, 0.55, 0.35, GREEN, 0, 3.15, -1.4, media);
      this._box(0.5, 0.4, 0.16, this._mat('#8A6647'), 0, 3.08, -0.2, media);
      hit(1.0, 2.6, 4.2, 0.25, 4.2, 0, media, 'tv', 'TV');
      this._registerFloor('media', media, 1.6, 4.3, 6.0, 'Media console', { kind: 'floor', x: -6.35, z: 2.3, rotY: 0 });
      this._place(this.movables.media);

      /* LED strip glow at the media unit's default wall spot (wall fixture, fixed) */
      this.ledMat = new T.MeshStandardMaterial({ color: '#E2C97E', emissive: '#E2C97E', emissiveIntensity: 0, roughness: 0.6 });
      this._box(0.06, 0.12, 4.0, this.ledMat, -6.98, 1.2, 2.3);
      this.ledGlow = this._glowSprite(3.0); this.ledGlow.position.set(-6.7, 1.4, 2.3); room.add(this.ledGlow);

      /* ---- floor lamp ---- */
      var lamp = new T.Group(); room.add(lamp);
      var lbase = new T.Mesh(new T.CylinderGeometry(0.35, 0.4, 0.14, 14), WOOD_DK); lbase.position.y = 0.07; lbase.castShadow = true; lamp.add(lbase);
      this._box(0.1, 4.4, 0.1, WOOD_DK, 0, 2.2, 0, lamp);
      var shade = new T.Mesh(new T.CylinderGeometry(0.55, 0.7, 0.8, 16), this._mat('#E9DCC1', { roughness: 0.7 }));
      shade.position.y = 4.5; shade.castShadow = true; lamp.add(shade);
      this.lampGlow1 = this._glowSprite(2.6); this.lampGlow1.position.set(0, 4.7, 0); lamp.add(this.lampGlow1);
      this.lampLight1 = new T.PointLight(0xE2C97E, 0, 9, 2); this.lampLight1.position.set(0, 4.6, 0); lamp.add(this.lampLight1);
      this._registerFloor('lamp', lamp, 1.4, 1.4, 5.0, 'Floor lamp', { kind: 'floor', x: -6.0, z: 5.6, rotY: 0 });
      this._place(this.movables.lamp);

      /* ---- lounge rug ---- */
      var rug = new T.Group(); room.add(rug);
      this._box(7.2, 0.09, 5.4, this._mat('#BCA277', { roughness: 1 }), 0, 0.05, 0, rug).castShadow = false;
      this._box(6.8, 0.1, 5.0, this._mat('#AD9166', { roughness: 1 }), 0, 0.055, 0, rug).castShadow = false;
      this._registerFloor('rug', rug, 7.2, 5.4, 0.35, 'Area rug', { kind: 'floor', x: 0.7, z: 2.0, rotY: 0 });
      this._place(this.movables.rug);

      /* ---- sofa ---- */
      var sofa = new T.Group(); room.add(sofa); this.sofa = sofa;
      this._box(3.2, 0.65, 2.6, SOFA, 0, 0.42, 0.25, sofa);
      this._box(3.2, 0.5, 2.4, this._mat('#8A6647', { roughness: 1 }), 0, 0.95, 0.35, sofa);
      var back = this._box(3.2, 1.7, 0.8, SOFA, 0, 1.45, -0.95, sofa); back.rotation.x = -0.22;
      for (var rb = -1; rb <= 1; rb++)
        this._box(0.12, 0.55, 2.35, this._mat('#6E5034', { roughness: 1 }), rb * 1.0, 0.95, 0.35, sofa);
      this._box(0.9, 0.7, 0.35, CAMEL, -1.0, 1.35, -0.4, sofa);
      this._box(0.85, 0.65, 0.33, this._mat('#E9DCC1'), 1.0, 1.32, -0.4, sofa);
      this._box(1.4, 0.22, 1.3, this._mat('#B79668'), 0.7, 1.28, 0.4, sofa);
      hit(3.4, 2.6, 2.9, 0, 1.2, 0, sofa, 'sofa', 'Floor sofa');
      this._registerFloor('sofa', sofa, 3.4, 2.9, 2.5, 'Floor sofa', { kind: 'floor', x: 2.4, z: 1.6, rotY: -Math.PI / 2 });
      this._place(this.movables.sofa);

      /* ---- storage ottoman ---- */
      var ott = new T.Group(); room.add(ott); this.ott = ott;
      this._box(2.0, 1.0, 1.8, this._mat('#8A6647', { roughness: 1 }), 0, 0.5, 0, ott);
      this._box(2.1, 0.14, 1.9, WOOD_DK, 0, 1.05, 0, ott);
      this._box(0.6, 0.12, 0.35, DARK, 0.4, 1.16, 0.2, ott).castShadow = false;
      this._box(0.22, 0.28, 0.22, this._mat('#EDE4D2'), -0.4, 1.24, -0.2, ott).castShadow = false;
      this._registerFloor('ottoman', ott, 2.2, 2.0, 1.5, 'Ottoman', { kind: 'floor', x: -0.1, z: 1.6, rotY: 0 });
      this._place(this.movables.ottoman);

      /* ---- poufs ---- */
      var poufGeo = new T.CylinderGeometry(0.62, 0.7, 0.75, 16);
      var pouf1 = new T.Group(); room.add(pouf1);
      var p1m = new T.Mesh(poufGeo, CAMEL); p1m.position.y = 0.38; p1m.castShadow = p1m.receiveShadow = true; pouf1.add(p1m);
      this._registerFloor('pouf1', pouf1, 1.5, 1.5, 1.0, 'Pouf', { kind: 'floor', x: 2.9, z: 4.0, rotY: 0 });
      this._place(this.movables.pouf1);
      var pouf2 = new T.Group(); room.add(pouf2);
      var p2m = new T.Mesh(poufGeo, this._mat('#A9855C')); p2m.position.y = 0.38; p2m.castShadow = p2m.receiveShadow = true; pouf2.add(p2m);
      this._registerFloor('pouf2', pouf2, 1.5, 1.5, 1.0, 'Pouf', { kind: 'floor', x: 4.2, z: 3.4, rotY: 0 });
      this._place(this.movables.pouf2);

      /* ---- tower fan ---- */
      var tower = new T.Group(); room.add(tower); this.tower = tower;
      var tBase = new T.Mesh(new T.CylinderGeometry(0.7, 0.85, 0.22, 18), this._mat('#D8D3C8', { roughness: 0.6 }));
      tBase.position.y = 0.11; tBase.castShadow = true; tower.add(tBase);
      var tBody = new T.Mesh(new T.CylinderGeometry(0.42, 0.55, 4.0, 20), this._mat('#EDE8DC', { roughness: 0.7 }));
      tBody.position.y = 2.2; tBody.scale.z = 0.6; tBody.castShadow = true; tower.add(tBody);
      var tGrille = new T.Mesh(new T.BoxGeometry(0.5, 2.6, 0.1), this._mat('#B8B2A4', { roughness: 0.6 }));
      tGrille.position.set(0, 2.5, 0.32); tower.add(tGrille);
      this.towerBlade = tBody;
      hit(1.8, 4.4, 1.2, 0, 2.4, 0, tower, 'fans', 'Fans');
      this._registerFloor('tower', tower, 1.7, 1.7, 4.6, 'Tower fan', { kind: 'floor', x: -5.9, z: 6.4, rotY: 0 });
      this._place(this.movables.tower);

      /* ---- laundry hamper ---- */
      var hmp = new T.Group(); room.add(hmp); this.hmp = hmp;
      var hmpBody = new T.Mesh(new T.CylinderGeometry(0.6, 0.52, 1.5, 16), this._mat('#B79B6E', { roughness: 1 }));
      hmpBody.position.y = 0.75; hmpBody.castShadow = true; hmp.add(hmpBody);
      var hmpLid = new T.Mesh(new T.CylinderGeometry(0.64, 0.6, 0.22, 16), this._mat('#A9855C', { roughness: 1 }));
      hmpLid.position.y = 1.6; hmpLid.castShadow = true; hmp.add(hmpLid);
      var hmpKnob = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.1, 10), this._mat('#8A6647'));
      hmpKnob.position.y = 1.75; hmp.add(hmpKnob);
      this._registerFloor('hamper', hmp, 1.4, 1.4, 1.9, 'Laundry hamper', { kind: 'floor', x: -6.0, z: 5.9, rotY: 0 });
      this._place(this.movables.hamper);

      /* ---- entry rug (mat + runner) ---- */
      var entryRug = new T.Group(); room.add(entryRug);
      this._box(3.0, 0.05, 1.3, this._mat('#8A6647', { roughness: 1 }), 0, 0.03, 0.25, entryRug).castShadow = false;
      this._box(3.4, 0.06, 1.15, this._mat('#9E8258', { roughness: 1 }), 0, 0.045, -0.25, entryRug).castShadow = false;
      this._registerFloor('entryRug', entryRug, 3.6, 1.9, 0.3, 'Entry runner', { kind: 'floor', x: 0, z: 6.65, rotY: 0 });
      this._place(this.movables.entryRug);

      /* ---- kitchen workstation (stand + fridge + microwave) ---- */
      var kit = new T.Group(); room.add(kit);
      this._box(2.6, 0.06, 2.2, this._mat('#96704A', { roughness: 1 }), 0, 0.03, 0, kit).castShadow = false;
      this._box(2.2, 0.12, 1.9, WOOD, 0, 2.7, 0, kit);
      this._box(0.12, 2.7, 1.9, WOOD_DK, -1.0, 1.35, 0, kit);
      this._box(0.12, 2.7, 1.9, WOOD_DK, 1.0, 1.35, 0, kit);
      this._box(2.2, 0.12, 1.9, WOOD_DK, 0, 1.4, 0, kit);
      this.fridge = new T.Group(); this.fridge.position.set(0, 0, 0.1); kit.add(this.fridge);
      this._box(1.5, 1.7, 1.4, this._mat('#EFEBE2', { roughness: 0.5 }), 0, 0.95, 0, this.fridge);
      this.fridgeDoor = this._box(0.1, 1.55, 1.3, this._mat('#E7E1D5', { roughness: 0.5 }), 0.76, 0.95, 0, this.fridge);
      this._box(0.06, 0.5, 0.08, DARK, 0.82, 1.0, -0.5, this.fridge);
      this.fridgeGlowS = this._glowSprite(1.6, 0xdfeaff); this.fridgeGlowS.position.set(0.7, 1.15, 0); kit.add(this.fridgeGlowS);
      this.fridgeLight = new T.PointLight(0xdfeaff, 0, 4, 2); this.fridgeLight.position.set(0, 1.4, 0); kit.add(this.fridgeLight);
      var mw = new T.Group(); mw.position.set(0, 3.1, 0); kit.add(mw);
      this._box(1.7, 1.0, 1.4, this._mat('#2E2822', { roughness: 0.5 }), 0, 0, 0, mw);
      this.mwScreen = new T.Mesh(new T.PlaneGeometry(1.0, 0.7),
        new T.MeshStandardMaterial({ color: '#120f0b', emissive: '#ffdd99', emissiveIntensity: 0, roughness: 0.4 }));
      this.mwScreen.rotation.y = Math.PI / 2; this.mwScreen.position.set(0.86, 0, -0.2); mw.add(this.mwScreen);
      this._box(0.16, 0.7, 0.4, this._mat('#1a1712'), 0.86, 0, 0.45, mw);
      this.mwGlowS = this._glowSprite(1.5, 0xffdd99); this.mwGlowS.position.set(0.9, 3.1, -0.2); kit.add(this.mwGlowS);
      this.mwLight = new T.PointLight(0xfff0c0, 0, 4, 2); this.mwLight.position.set(0, 3.1, 0); kit.add(this.mwLight);
      this._box(2.2, 0.12, 1.4, WOOD, 0, 4.2, 0, kit);
      this._box(0.12, 1.1, 1.4, WOOD_DK, -1.0, 3.75, 0, kit);
      this._box(0.12, 1.1, 1.4, WOOD_DK, 1.0, 3.75, 0, kit);
      this._box(0.32, 0.4, 0.32, this._mat('#C9A84C'), -0.5, 4.45, 0.2, kit);
      this._box(0.3, 0.38, 0.3, this._mat('#EDE4D2'), 0.2, 4.44, -0.2, kit);
      this._box(0.4, 0.55, 0.28, this._mat('#8A6647'), 0.6, 4.5, 0.3, kit);
      hit(2.0, 1.2, 1.6, 0, 3.1, 0, kit, 'microwave', 'Microwave');
      hit(1.8, 1.9, 1.6, 0, 1.0, 0.1, kit, 'fridge', 'Mini-fridge');
      this._registerFloor('kitchen', kit, 2.6, 2.2, 4.9, 'Kitchen station', { kind: 'floor', x: 3.6, z: -5.9, rotY: 0 });
      this._place(this.movables.kitchen);

      /* ================= WALL UNITS (canonical local frame faces +z) ================= */

      /* ---- whiteboard ---- */
      var wb = new T.Group(); room.add(wb);
      this._box(3.0, 2.2, 0.12, this._mat('#C9A84C'), 0, 0, 0, wb);
      var wbFace = new T.Mesh(new T.PlaneGeometry(2.7, 1.9), WHITE);
      wbFace.position.z = 0.07; wb.add(wbFace);
      this._registerWall('whiteboard', wb, 3.0, 2.2, 'Whiteboard', { kind: 'wall', wall: 'west', u: 6.4, y: 5.4 });
      this._place(this.movables.whiteboard);

      /* ---- corkboard ---- */
      var cork = new T.Group(); room.add(cork);
      this._box(2.6, 1.8, 0.12, this._mat('#B0713F'), 0, 0, 0, cork);
      var corkFace = new T.Mesh(new T.PlaneGeometry(2.2, 1.4), this._mat('#C9A06A', { roughness: 1 }));
      corkFace.position.z = 0.07; cork.add(corkFace);
      this._box(0.4, 0.5, 0.02, WHITE, -0.5, 0.2, 0.09, cork).castShadow = false;
      this._box(0.35, 0.45, 0.02, this._mat('#E9DCC1'), 0.4, -0.15, 0.09, cork).castShadow = false;
      this._box(0.5, 0.4, 0.02, this._mat('#C9A84C'), 0.6, 0.3, 0.09, cork).castShadow = false;
      this._registerWall('corkboard', cork, 2.6, 1.8, 'Corkboard', { kind: 'wall', wall: 'west', u: -5.8, y: 5.0 });
      this._place(this.movables.corkboard);

      /* ================= FIXED ENTRY WALL ================= */
      var STUB = 4.6;
      var CW = 4, CD = 1.6;
      var CONC = this._mat('#B9B4AA', { roughness: 1, metalness: 0.02 });
      function buildCloset(cx, kind) {
        var cl = new T.Group(); cl.position.set(cx, 0, 7.2); room.add(cl);
        self0._box(CW, STUB, 0.14, WALL, 0, STUB / 2, CD / 2, cl);
        self0._box(0.14, STUB, CD, WALL, -CW / 2, STUB / 2, 0, cl);
        self0._box(0.14, STUB, CD, WALL, CW / 2, STUB / 2, 0, cl);
        self0._box(CW, 0.14, CD, WALL, 0, STUB, 0, cl);
        self0._box(CW, 0.16, CD, WALL, 0, 0.08, 0, cl).receiveShadow = true;
        self0._box(CW - 0.3, 0.18, CD - 0.25, CONC, 0, 1.55, 0, cl);
        self0._box(CW - 0.3, 0.18, CD - 0.25, CONC, 0, 2.95, 0, cl);
        var m = self0._mat.bind(self0), box = self0._box.bind(self0);
        if (kind === 'clothes') {
          box(0.08, 0.08, CD - 0.4, DARK, 0, 3.85, 0, cl).castShadow = false;
          var gc = ['#7C5B3B', '#5F7A4A', '#C9A84C', '#8A6647', '#A9855C', '#6B4F2A'];
          for (var gi = 0; gi < 6; gi++)
            box(0.5, 1.5, 0.28, m(gc[gi]), -1.4 + gi * 0.56, 3.05, -0.05, cl);
          box(0.9, 0.5, 0.7, m('#E4D3AE'), -1.0, 3.3, 0, cl);
          box(0.9, 0.4, 0.7, m('#C9A874'), 0.05, 3.25, 0, cl);
          for (var si = 0; si < 3; si++) {
            box(0.35, 0.22, 0.6, m(si % 2 ? '#2C2A26' : '#8A6647'), -1.2 + si * 0.5, 0.28, -0.1, cl);
          }
        } else {
          box(1.0, 0.75, 0.85, m('#A9855C'), -0.95, 0.55, 0, cl);
          box(1.0, 0.75, 0.85, m('#8A6647'), 0.35, 0.55, 0, cl);
          box(0.95, 0.55, 0.8, m('#C9A874'), -0.9, 1.95, 0, cl);
          box(0.95, 0.55, 0.8, m('#B79B6E'), 0.35, 1.95, 0, cl);
          box(1.0, 0.28, 0.7, m('#E4D3AE'), -0.8, 3.28, 0, cl);
          box(1.0, 0.24, 0.7, m('#EDE4D2'), -0.8, 3.5, 0, cl);
          box(0.24, 0.5, 0.24, m('#5F7A4A'), 0.7, 3.4, 0, cl);
          box(0.5, 0.5, 0.42, m('#F7F2E8'), 0.2, 3.35, 0, cl);
        }
        return cl;
      }
      buildCloset(-4, 'clothes');
      buildCloset(4, 'supplies');
      var doorG = new T.Group(); doorG.position.set(0, 0, 7.75); room.add(doorG);
      this._box(0.35, STUB + 0.4, 0.5, WALL, -1.55, (STUB + 0.4) / 2, 0, doorG);
      this._box(0.35, STUB + 0.4, 0.5, WALL, 1.55, (STUB + 0.4) / 2, 0, doorG);
      this._box(3.45, 0.35, 0.5, WALL, 0, STUB + 0.25, 0, doorG);
      this._box(2.7, STUB, 0.18, WOOD_DK, 0, STUB / 2, 0, doorG);
      var mirror = new T.Mesh(new T.PlaneGeometry(1.1, 3.4),
        new T.MeshStandardMaterial({ color: '#cfd6d8', metalness: 0.85, roughness: 0.15 }));
      mirror.rotation.y = Math.PI; mirror.position.set(0, 2.1, -0.11); doorG.add(mirror);
      this._box(0.9, 0.25, 0.14, WOOD, -2.3, 3.0, 7.6);
      for (var hk = 0; hk < 3; hk++) this._box(0.05, 0.2, 0.15, DARK, -2.6 + hk * 0.3, 2.85, 7.55);
      this._box(0.35, 0.6, 0.05, this._mat('#5F7A4A'), -2.55, 2.5, 7.5).castShadow = false;
      this._outlet(-6.98, 1.3, 3.4, 0);
      this._outlet(1.9, 1.3, 7.0, Math.PI);

      /* ---------- selection / error helpers ---------- */
      this.selHelper = new T.BoxHelper(this.movables.sofa.proxy, GOLD);
      this.selHelper.visible = false; this.scene.add(this.selHelper);
      this.errHelper = new T.BoxHelper(this.movables.sofa.proxy, RED);
      this.errHelper.visible = false; this.scene.add(this.errHelper);

      this._mistBurst = 0; this._sofaVel = 0; this._sofaS = 1;
      this._mwFlash = 0; this._fridgeOpen = 0;
    }

    _outlet(x, y, z, ry) {
      var T = this.T, g = new T.Group(); g.position.set(x, y, z); if (ry) g.rotation.y = ry; this.room.add(g);
      this._box(0.06, 0.85, 0.55, this._mat('#EDE8DC', { roughness: 0.7 }), 0, 0, 0, g).castShadow = false;
      var sm = this._mat('#7A6444', { roughness: 0.5 });
      this._box(0.03, 0.24, 0.32, sm, 0.045, 0.19, 0, g).castShadow = false;
      this._box(0.03, 0.24, 0.32, sm, 0.045, -0.19, 0, g).castShadow = false;
      return g;
    }

    /* ---------- custom item builder (primitive assembly spec) ---------- */
    _buildSpec(spec) {
      var T = this.T;
      var group = new T.Group();
      var parts = (spec && spec.parts) ? spec.parts.slice(0, 40) : [];
      var minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;
      var D2R = Math.PI / 180;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var geo, hw, hh, hd, rMax;
        if (p.shape === 'cylinder') {
          var rTop = typeof p.radiusTop === 'number' ? p.radiusTop : p.radius;
          geo = new T.CylinderGeometry(rTop, p.radius, p.height, 16);
          rMax = Math.max(rTop, p.radius);
          hw = rMax; hh = p.height / 2; hd = rMax;
        } else if (p.shape === 'sphere') {
          geo = new T.SphereGeometry(p.radius, 14, 12);
          hw = p.radius; hh = p.radius; hd = p.radius;
        } else if (p.shape === 'capsule') {
          geo = new T.CapsuleGeometry(p.radius, p.height, 6, 14);
          hw = p.radius; hh = p.height / 2 + p.radius; hd = p.radius;
        } else if (p.shape === 'torus') {
          geo = new T.TorusGeometry(p.radius, p.tube, 10, 20);
          rMax = p.radius + p.tube;
          // rotation makes exact torus bounds messy; the generous cube is fine
          hw = rMax; hh = rMax; hd = rMax;
        } else {
          geo = new T.BoxGeometry(p.size[0], p.size[1], p.size[2]);
          hw = p.size[0] / 2; hh = p.size[1] / 2; hd = p.size[2] / 2;
        }
        var mat = this._mat(p.color || '#C79A5E', {
          roughness: Math.max(0.3, Math.min(1, typeof p.roughness === 'number' ? p.roughness : 0.92)),
          metalness: Math.max(0, Math.min(0.5, typeof p.metalness === 'number' ? p.metalness : 0.02))
        });
        var mesh = new T.Mesh(geo, mat);
        mesh.position.set(p.position[0], p.position[1], p.position[2]);
        if (p.rotationX) mesh.rotation.x = p.rotationX * D2R;
        if (p.rotationY) mesh.rotation.y = p.rotationY * D2R;
        if (p.rotationZ) mesh.rotation.z = p.rotationZ * D2R;
        var sx = 1, sy = 1, sz = 1;
        if (p.scale && p.scale.length === 3) { sx = p.scale[0]; sy = p.scale[1]; sz = p.scale[2]; }
        mesh.scale.set(sx, sy, sz);
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
        // Approximate bounds: scale applied, rotations ignored except that a
        // tilted part never exceeds its largest half-extent in any axis.
        var tilted = !!(p.rotationX || p.rotationZ);
        var ex = hw * sx, ey = hh * sy, ez = hd * sz;
        if (tilted) { var em = Math.max(ex, ey, ez); ex = em; ey = em; ez = em; }
        minX = Math.min(minX, p.position[0] - ex); maxX = Math.max(maxX, p.position[0] + ex);
        minZ = Math.min(minZ, p.position[2] - ez); maxZ = Math.max(maxZ, p.position[2] + ez);
        maxY = Math.max(maxY, p.position[1] + ey);
      }
      if (!parts.length) { minX = -0.5; maxX = 0.5; minZ = -0.5; maxZ = 0.5; maxY = 1; }
      /* recentre horizontally so the group origin is the footprint center */
      var cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
      group.children.forEach(function (m) { m.position.x -= cx; m.position.z -= cz; });
      spec._bounds = { w: Math.max(0.4, maxX - minX), d: Math.max(0.4, maxZ - minZ), h: Math.max(0.4, maxY) };
      return group;
    }

    /* ---------- input ---------- */
    _bindInput() {
      var self = this, el = this.renderer.domElement;
      var drag = null, pinch = null, moved = 0;
      el.addEventListener('pointerdown', function (e) {
        el.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; moved = 0; self._idleT = 0;
        var dh = self._editMode ? self._pickDrag(e) : null;
        if (dh) {
          var entry = self.movables[dh.object.userData.movableId];
          self._dragObj = entry;
          entry._lastValid = deepCopy(entry.cur);
          entry._dragStart = deepCopy(entry.cur);
          self._select(entry);
          if (entry.kind === 'floor') {
            var pt = self._planePoint(e);
            if (pt) self._dragOff.set(entry.cur.x - pt.x, 0, entry.cur.z - pt.z);
          }
          self.renderer.domElement.style.cursor = 'grabbing';
        }
      });
      el.addEventListener('pointermove', function (e) {
        self._idleT = 0;
        if (drag && e.pointerId === drag.id) {
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
          if (self._dragObj) {
            self._dragMove(e);
          } else {
            self.orbit.theta -= dx * 0.0055;
            self.orbit.phi = Math.max(0.42, Math.min(1.38, self.orbit.phi - dy * 0.0045));
            self._tween = null;
          }
        } else self._hover(e);
      });
      el.addEventListener('pointerup', function (e) {
        if (self._dragObj) {
          var entry = self._dragObj;
          if (self._floatingEntry === entry) self._settleFloating(entry);
          if (moved < 6) {
            /* a tap, not a drag — treat as pure selection (already selected on pointerdown) */
          } else if (JSON.stringify(entry.cur) !== JSON.stringify(entry._dragStart)) {
            self._emitLayout();
          }
          self._dragObj = null;
        } else if (drag && moved < 6) {
          self._click(e);
        }
        drag = null;
        self.renderer.domElement.style.cursor = 'grab';
      });
      el.addEventListener('pointercancel', function () {
        if (self._dragObj && self._floatingEntry === self._dragObj) self._settleFloating(self._dragObj);
        self._dragObj = null; drag = null;
      });
      el.addEventListener('wheel', function (e) {
        e.preventDefault(); self._idleT = 0; self._tween = null;
        self.orbit.radius = Math.max(13, Math.min(40, self.orbit.radius * (1 + e.deltaY * 0.001)));
      }, { passive: false });
      el.addEventListener('touchstart', function (e) {
        if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }, { passive: true });
      el.addEventListener('touchmove', function (e) {
        if (e.touches.length === 2 && pinch) {
          var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          self.orbit.radius = Math.max(13, Math.min(40, self.orbit.radius * (pinch / d)));
          pinch = d; self._idleT = 0; self._tween = null;
        }
      }, { passive: true });
      el.addEventListener('touchend', function () { pinch = null; }, { passive: true });
      this.raycaster = new this.T.Raycaster();
      this.pointer = new this.T.Vector2();
      this._floorPlane = new this.T.Plane(new this.T.Vector3(0, 1, 0), 0);
      if (this._editMode === undefined) this._editMode = false;
      this._dragObj = null;
      this._dragOff = new this.T.Vector3();
    }

    _dragMove(e) {
      var entry = this._dragObj;
      var pt = this._planePoint(e);
      if (!pt) return;
      if (entry.kind === 'floor') {
        entry.cur.x = pt.x + this._dragOff.x;
        entry.cur.z = pt.z + this._dragOff.z;
        this._place(entry);
      } else {
        /* wall item: near the west wall -> attach west; near the north wall ->
           attach north; otherwise it floats at the pointer with a red outline
           and reverts on release. */
        var hw = entry.w / 2;
        if (pt.x < -5.4) {
          entry.cur.wall = 'west'; entry.cur.u = this._clampWestU(pt.z, hw);
          entry._lastValid = deepCopy(entry.cur);
          this._place(entry);
          this._floatingEntry = null; this.errHelper.visible = false;
        } else if (pt.z < -6.2) {
          entry.cur.wall = 'north'; entry.cur.u = this._clampNorthU(pt.x, hw);
          entry._lastValid = deepCopy(entry.cur);
          this._place(entry);
          this._floatingEntry = null; this.errHelper.visible = false;
        } else {
          this._floatingEntry = entry;
          entry.group.position.set(pt.x, entry.cur.y, pt.z);
          this.errHelper.setFromObject(entry.proxy);
          this.errHelper.visible = true;
        }
      }
    }

    /* three's raycaster ignores object.visible, so stored (hidden) items must
       be filtered out by walking the parent chain */
    _firstVisibleHit(hits) {
      for (var i = 0; i < hits.length; i++) {
        var o = hits[i].object, vis = true;
        while (o) {
          if (o.visible === false) { vis = false; break; }
          o = o.parent;
        }
        if (vis) return hits[i];
      }
      return null;
    }

    _pick(e) {
      var r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      return this._firstVisibleHit(this.raycaster.intersectObjects(this.hitMeshes, false));
    }

    _pickDrag(e) {
      if (!this.proxyMeshes) return null;
      var r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      return this._firstVisibleHit(this.raycaster.intersectObjects(this.proxyMeshes, false));
    }

    _planePoint(e) {
      var r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      var pt = new this.T.Vector3();
      return this.raycaster.ray.intersectPlane(this._floorPlane, pt) ? pt : null;
    }

    _hover(e) {
      if (this._editMode) {
        var dh = this._pickDrag(e);
        if (dh) {
          this.renderer.domElement.style.cursor = 'move';
          this.tip.style.display = 'block';
          this.tip.textContent = this.movables[dh.object.userData.movableId].label;
          var r0 = this.renderer.domElement.getBoundingClientRect();
          this.tip.style.left = (e.clientX - r0.left) + 'px';
          this.tip.style.top = (e.clientY - r0.top) + 'px';
        } else {
          this.renderer.domElement.style.cursor = 'grab';
          this.tip.style.display = 'none';
        }
        return;
      }
      var hitObj = this._pick(e);
      if (hitObj) {
        this.renderer.domElement.style.cursor = 'pointer';
        this.tip.style.display = 'block';
        this.tip.textContent = hitObj.object.userData.label;
        var r = this.renderer.domElement.getBoundingClientRect();
        this.tip.style.left = (e.clientX - r.left) + 'px';
        this.tip.style.top = (e.clientY - r.top) + 'px';
      } else {
        this.renderer.domElement.style.cursor = 'grab';
        this.tip.style.display = 'none';
      }
    }

    _click(e) {
      if (this._editMode) {
        var dh = this._pickDrag(e);
        this._select(dh ? this.movables[dh.object.userData.movableId] : null);
        return;
      }
      var hitObj = this._pick(e);
      if (!hitObj) return;
      var a = hitObj.object.userData.action, s = this.state;
      if (a === 'lights') this.setRoomState({ lightsOn: !s.lightsOn });
      else if (a === 'computer') this.setRoomState({ computerOn: !s.computerOn });
      else if (a === 'tv') this.setRoomState({ tvOn: !s.tvOn });
      else if (a === 'curtains') this.setRoomState({ curtainsOpen: !s.curtainsOpen });
      else if (a === 'sofa') { if (!this.reduced) this._sofaVel = 2.6; }
      else if (a === 'diffuser') { if (!this.reduced) this._mistBurst = 4; }
      else if (a === 'microwave') { this._mwFlash = 1.4; }
      else if (a === 'fridge') { this._fridgeOpen = this._fridgeOpen > 0.5 ? 0 : 2.2; }
      else if (a === 'fans') this.setRoomState({ fansOn: !s.fansOn });
    }

    /* ---------- camera ---------- */
    _applyOrbit() {
      var o = this.orbit;
      var sp = Math.sin(o.phi), x = o.radius * sp * Math.sin(o.theta),
        z = o.radius * sp * Math.cos(o.theta), y = o.radius * Math.cos(o.phi);
      this.camera.position.set(o.target.x + x, o.target.y + y, o.target.z + z);
      this.camera.lookAt(o.target);
    }
    _tweenCamera() {
      this._tween = { t: 0, from: { theta: this.orbit.theta % (Math.PI * 2), phi: this.orbit.phi, radius: this.orbit.radius } };
      var d = this.orbitDefault.theta - this._tween.from.theta;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this._tween.dTheta = d;
    }

    /* ---------- frame loop ---------- */
    _loop() {
      var self = this;
      this._raf = requestAnimationFrame(function () { self._loop(); });
      var T = this.T, dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime;
      var s = this.state, night = s.mode === 'night';

      if (this._tween) {
        var tw = this._tween; tw.t = Math.min(1, tw.t + dt / 0.7);
        var k = 1 - Math.pow(1 - tw.t, 3);
        this.orbit.theta = tw.from.theta + tw.dTheta * k;
        this.orbit.phi = lerp(tw.from.phi, this.orbitDefault.phi, k);
        this.orbit.radius = lerp(tw.from.radius, this.orbitDefault.radius, k);
        if (tw.t >= 1) this._tween = null;
      } else {
        this._idleT += dt;
        if (this._idleT > 6 && !this.reduced && this._autoRotate !== false && !this._editMode) this.orbit.theta += dt * 0.09;
      }
      this._applyOrbit();

      /* keep helpers hugging their targets */
      if (this._selected && this.selHelper.visible) this.selHelper.setFromObject(this._selected.proxy);
      if (this._floatingEntry && this.errHelper.visible) this.errHelper.setFromObject(this._floatingEntry.proxy);

      var idle = this._idleT > 6;
      this.hemi.intensity = damp(this.hemi.intensity, night ? 0.22 : 1.05, 4, dt);
      this.hemi.color.lerp(new T.Color(night ? '#8fa3c4' : '#fff3de'), Math.min(1, dt * 4));
      this.sun.intensity = damp(this.sun.intensity, night ? 0.04 : (s.curtainsOpen ? 1.7 : 0.7), 4, dt);
      this.scene.background.lerp(night ? this._bgNight : this._bgDay, Math.min(1, dt * 4));
      this.skyMat.color.lerp(new T.Color(night ? '#1d2740' : '#FFE9BC'), Math.min(1, dt * 4));

      var lightsI = s.lightsOn ? (night ? 1.5 : 0.7) : 0;
      this.loftLight.intensity = damp(this.loftLight.intensity, lightsI * 1.1, 5, dt);
      this.windowLight.intensity = damp(this.windowLight.intensity, lightsI * 0.9, 5, dt);
      this.lampLight1.intensity = damp(this.lampLight1.intensity, lightsI * 1.0, 5, dt);
      this.ledLight.intensity = damp(this.ledLight.intensity, lightsI * 0.7, 5, dt);
      this.bulbMat.emissiveIntensity = damp(this.bulbMat.emissiveIntensity, s.lightsOn ? (night ? 2.2 : 1.2) : 0, 5, dt);
      this.ledMat.emissiveIntensity = damp(this.ledMat.emissiveIntensity, s.lightsOn ? (night ? 2.0 : 1.1) : 0, 5, dt);
      var lo = s.lightsOn ? (night ? 0.5 : 0.18) : 0;
      this.winGlow.material.opacity = damp(this.winGlow.material.opacity, s.lightsOn ? (night ? 0.42 : 0.15) : 0, 5, dt);
      var wgO = s.lightsOn ? (night ? 0.32 : 0.11) : 0;
      for (var wg = 0; wg < this.wallGlows.length; wg++)
        this.wallGlows[wg].material.opacity = damp(this.wallGlows[wg].material.opacity, wgO, 5, dt);
      this.lampGlow1.material.opacity = damp(this.lampGlow1.material.opacity, lo, 5, dt);
      this.ledGlow.material.opacity = damp(this.ledGlow.material.opacity, s.lightsOn ? (night ? 0.4 : 0.14) : 0, 5, dt);

      var compI = s.computerOn ? (night ? 1.4 : 0.9) : 0;
      this.monScreen.material.emissiveIntensity = damp(this.monScreen.material.emissiveIntensity, compI, 6, dt);
      this.lapScreen.material.emissiveIntensity = damp(this.lapScreen.material.emissiveIntensity, compI, 6, dt);
      this.deskLight.intensity = damp(this.deskLight.intensity, s.computerOn ? (night ? 0.8 : 0.3) : 0, 6, dt);
      this.deskGlow.material.opacity = damp(this.deskGlow.material.opacity, s.computerOn ? (night ? 0.35 : 0.12) : 0, 6, dt);

      var flick = s.tvOn ? (0.9 + Math.sin(t * 23) * 0.05 + Math.sin(t * 7.3) * 0.05) : 0;
      this.tvScreen.material.emissiveIntensity = damp(this.tvScreen.material.emissiveIntensity, flick * (night ? 1.4 : 0.9), 8, dt);
      this.tvLight.intensity = damp(this.tvLight.intensity, s.tvOn ? (night ? 1.0 + Math.sin(t * 13) * 0.12 : 0.35) : 0, 8, dt);
      this.tvGlow.material.opacity = damp(this.tvGlow.material.opacity, s.tvOn ? (night ? 0.4 : 0.14) : 0, 8, dt);

      /* curtains */
      this._curtainT = damp(this._curtainT, s.curtainsOpen ? 1 : 0, 5, dt);
      var ct = this._curtainT, panelW = lerp(2.5, 0.8, ct);
      this.curtainL.scale.x = panelW / 2.5; this.curtainR.scale.x = panelW / 2.5;
      this.curtainL.position.x = lerp(-1.3, -2.55, ct); this.curtainR.position.x = lerp(1.3, 2.55, ct);

      /* sun shaft + motes */
      this.shaft.material.opacity = damp(this.shaft.material.opacity, (!night && s.curtainsOpen) ? 0.09 : 0, 4, dt);
      var moteO = (!night && s.curtainsOpen && idle && !this.reduced) ? 0.55 : 0;
      this.moteMat.opacity = damp(this.moteMat.opacity, moteO, 2, dt);
      if (this.moteMat.opacity > 0.01) {
        var pa = this.motePts.geometry.attributes.position;
        for (var i = 0; i < this._motes.length; i++) {
          var mm = this._motes[i];
          pa.array[i * 3] += Math.sin(t * mm.s + mm.p) * 0.0015;
          pa.array[i * 3 + 1] += Math.cos(t * mm.s * 0.7 + mm.p) * 0.001 + 0.0008;
          if (pa.array[i * 3 + 1] > 6) pa.array[i * 3 + 1] = 0.4;
        }
        pa.needsUpdate = true;
      }

      /* sofa spring */
      if (!this.reduced) {
        var f = (1 - this._sofaS) * 120 - this._sofaVel * 9;
        this._sofaVel += f * dt; this._sofaS += this._sofaVel * dt;
        this.sofa.scale.set(1 + (1 - this._sofaS) * 0.4, this._sofaS, 1 + (1 - this._sofaS) * 0.4);
      }

      /* diffuser mist (in dresser-local space) */
      if (!this.reduced) {
        for (var mi2 = 0; mi2 < this.mist.length; mi2++) {
          var ms = this.mist[mi2], speed = this._mistBurst > 0 ? 0.55 : 0.22;
          ms.userData.t += dt * speed;
          if (ms.userData.t > 1) {
            ms.userData.t = this._mistBurst > 0 ? 0 : -(Math.random() * 6);
            if (this._mistBurst > 0) this._mistBurst--;
            ms.userData.dx = (Math.random() - 0.5) * 0.3;
          }
          var mt = Math.max(0, ms.userData.t);
          ms.position.set(this._difLocal.x + ms.userData.dx * mt, this._difLocal.y + mt * 1.6, this._difLocal.z + ms.userData.dx * 0.5 * mt);
          ms.material.opacity = mt > 0 ? Math.sin(mt * Math.PI) * 0.28 : 0;
          var sc = 0.25 + mt * 0.6; ms.scale.set(sc, sc, 1);
        }
      }

      /* microwave ding flash + interior light */
      if (this._mwFlash > 0) this._mwFlash = Math.max(0, this._mwFlash - dt);
      var mwOn = this._mwFlash > 0 ? (0.5 + Math.abs(Math.sin(t * 18)) * 0.6) : 0;
      this.mwScreen.material.emissiveIntensity = damp(this.mwScreen.material.emissiveIntensity, mwOn, 10, dt);
      this.mwLight.intensity = damp(this.mwLight.intensity, mwOn * 0.9, 10, dt);
      this.mwGlowS.material.opacity = damp(this.mwGlowS.material.opacity, mwOn * 0.4, 10, dt);

      /* fridge door-open glow */
      if (this._fridgeOpen > 0) this._fridgeOpen = Math.max(0, this._fridgeOpen - dt);
      var frOn = this._fridgeOpen > 0 ? 1 : 0;
      this.fridgeDoor.rotation.y = damp(this.fridgeDoor.rotation.y, frOn ? -1.0 : 0, 6, dt);
      this.fridgeLight.intensity = damp(this.fridgeLight.intensity, frOn ? 1.2 : 0, 6, dt);
      this.fridgeGlowS.material.opacity = damp(this.fridgeGlowS.material.opacity, frOn ? 0.42 : 0, 6, dt);

      /* fan blade spin */
      if (this._fanSpin === undefined) this._fanSpin = 0;
      this._fanSpin = damp(this._fanSpin, s.fansOn ? 1 : 0, 4, dt);
      if (this._fanSpin > 0.002 && !this.reduced) {
        var fr = this._fanSpin * 14 * dt;
        for (var fbi = 0; fbi < this.fanBlades.length; fbi++) this.fanBlades[fbi].rotation.z += fr;
        if (this.towerBlade) this.towerBlade.rotation.y = Math.sin(t * 2.2) * 0.12 * this._fanSpin;
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  if (!customElements.get('dorm-room')) customElements.define('dorm-room', DormRoom);
})();
