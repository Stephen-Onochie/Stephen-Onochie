/* eslint-disable */
/* Dorm OS — stylized low-poly 3D dorm room diorama.
   Custom element <dorm-room>. Requires window.THREE (UMD build loaded before/alongside).
   Units: 1 = 1 ft. Room: x -7..7 (west wall at -7), z -8..8 (north wall/window at -8). */
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

  function whenThree(cb) {
    if (window.THREE) return cb();
    var iv = setInterval(function () {
      if (window.THREE) { clearInterval(iv); cb(); }
    }, 40);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function damp(cur, tgt, k, dt) { return lerp(cur, tgt, 1 - Math.exp(-k * dt)); }

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

    /* ---------- public API ---------- */
    setRoomState(partial) {
      var prev = this.state.mode;
      Object.assign(this.state, partial);
      if (partial.mode === 'night' && prev !== 'night') this.state.lightsOn = true;
      this._emit();
    }
    resetView() { this._tweenCamera(); this._idleT = 0; }
    setEditMode(on) { this._editMode = !!on; if (this.renderer) this.renderer.domElement.style.cursor = 'grab'; }
    zoomBy(factor) { this._tween = null; this._idleT = 0; this.orbit.radius = Math.max(13, Math.min(40, this.orbit.radius * factor)); this._applyOrbit(); }
    getRoomState() { return Object.assign({}, this.state); }

    _emit() {
      this.dispatchEvent(new CustomEvent('roomstate', {
        detail: this.getRoomState(), bubbles: true
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

    /* ---------- lights ---------- */
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

      this.loftLight = new T.PointLight(0xE2C97E, 0, 11, 2); this.loftLight.position.set(-4, 5.6, -4); this.scene.add(this.loftLight);
      this.windowLight = new T.PointLight(0xE2C97E, 0, 10, 2); this.windowLight.position.set(0, 6.2, -6.5); this.scene.add(this.windowLight);
      this.lampLight1 = new T.PointLight(0xE2C97E, 0, 9, 2); this.lampLight1.position.set(-6.0, 4.6, 5.6); this.scene.add(this.lampLight1);
      this.ledLight = new T.PointLight(0xE2C97E, 0, 7, 2); this.ledLight.position.set(-6.2, 1.4, 2.3); this.scene.add(this.ledLight);
      this.deskLight = new T.PointLight(0xcfe0ff, 0, 6, 2); this.deskLight.position.set(-5.5, 3.4, -5.9); this.scene.add(this.deskLight);
      this.tvLight = new T.PointLight(0xbfd4ff, 0, 8, 2); this.tvLight.position.set(-5.6, 3.7, 2.4); this.scene.add(this.tvLight);
      this.mwLight = new T.PointLight(0xfff0c0, 0, 4, 2); this.mwLight.position.set(3.6, 3.1, -5.9); this.scene.add(this.mwLight);
      this.fridgeLight = new T.PointLight(0xdfeaff, 0, 4, 2); this.fridgeLight.position.set(3.6, 1.4, -5.9); this.scene.add(this.fridgeLight);
    }

    /* ---------- the room ---------- */
    _buildRoom() {
      var T = this.T;
      var room = new T.Group();
      this.room = room;
      this.scene.add(room);
      this.hitMeshes = [];
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

      /* ---- window ---- */
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

      /* radiator under window (60% of wall, centered on window) */
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

      /* wider ledge above the radiator to hold the box fans */
      var ledgeMat = this._mat('#B79B6E', { roughness: 0.9 });
      this._box(RADW + 1.0, 0.22, 0.95, ledgeMat, 0, 2.28, -7.45);
      this._box(RADW + 1.0, 0.12, 0.14, WOOD_DK, 0, 2.16, -7.02).castShadow = false;

      /* two box fans on the ledge, facing into the room */
      this.fanBlades = [];
      var boxFrame = this._mat('#EDE8DC', { roughness: 0.7 });
      var boxGrille = this._mat('#B8B2A4', { roughness: 0.6 });
      var self0f = this;
      [-1.55, 1.55].forEach(function (fx) {
        var bf = new T.Group(); bf.position.set(fx, 3.2, -7.05); room.add(bf);
        self0f._box(1.7, 1.7, 0.55, boxFrame, 0, 0, 0, bf);       // square housing
        self0f._box(1.4, 1.4, 0.12, self0f._mat('#2C2A26'), 0, 0, 0.24, bf); // recessed face
        // blades
        var blade = new T.Group(); blade.position.set(0, 0, 0.3); bf.add(blade);
        for (var bl = 0; bl < 4; bl++) {
          var b = new T.Mesh(new T.BoxGeometry(0.55, 0.14, 0.04), boxGrille);
          b.position.set(0, 0, 0); b.rotation.z = bl * Math.PI / 2;
          b.geometry.translate(0.32, 0, 0);
          blade.add(b);
        }
        self0f._box(0.18, 0.18, 0.16, self0f._mat('#8C7355'), 0, 0, 0.34, bf); // hub
        // grille ring bars
        for (var gr = 0; gr < 6; gr++) {
          var bar = self0f._box(1.5, 0.05, 0.03, boxGrille, 0, 0, 0.42, bf);
          bar.rotation.z = gr * Math.PI / 6; bar.castShadow = false;
        }
        self0f.fanBlades.push(blade);
      });

      /* slim tower fan in the SW corner near the lounge (out of the walkway) */
      var tower = new T.Group(); tower.position.set(-5.9, 0, 6.4); room.add(tower); this.tower = tower;
      var tBase = new T.Mesh(new T.CylinderGeometry(0.7, 0.85, 0.22, 18), this._mat('#D8D3C8', { roughness: 0.6 }));
      tBase.position.y = 0.11; tBase.castShadow = true; tower.add(tBase);
      var tBody = new T.Mesh(new T.CylinderGeometry(0.42, 0.55, 4.0, 20), this._mat('#EDE8DC', { roughness: 0.7 }));
      tBody.position.y = 2.2; tBody.scale.z = 0.6; tBody.castShadow = true; tower.add(tBody);
      var tGrille = new T.Mesh(new T.BoxGeometry(0.5, 2.6, 0.1), this._mat('#B8B2A4', { roughness: 0.6 }));
      tGrille.position.set(0, 2.5, 0.32); tGrille.scale.z = 1; tower.add(tGrille);
      this.towerBlade = tBody; // subtle sway/spin proxy

      /* sun shaft + dust motes */
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

      /* ================= ZONE 1 — COCKPIT (NW) ================= */
      var loft = new T.Group(); room.add(loft);
      var LX0 = -6.9, LX1 = -3.4, LZ0 = -7.3, LZ1 = -0.6;
      var postXs = [LX0 + 0.15, LX1 - 0.15], postZs = [LZ0 + 0.15, LZ1 - 0.15];
      for (var px = 0; px < 2; px++) for (var pz = 0; pz < 2; pz++)
        this._box(0.3, 6.6, 0.3, WOOD, postXs[px], 3.3, postZs[pz], loft);
      this._box(LX1 - LX0, 0.35, 0.3, WOOD, (LX0 + LX1) / 2, 5, LZ0 + 0.15, loft);
      this._box(LX1 - LX0, 0.35, 0.3, WOOD, (LX0 + LX1) / 2, 5, LZ1 - 0.15, loft);
      this._box(0.3, 0.35, LZ1 - LZ0, WOOD, LX0 + 0.15, 5, (LZ0 + LZ1) / 2, loft);
      this._box(0.3, 0.35, LZ1 - LZ0, WOOD, LX1 - 0.15, 5, (LZ0 + LZ1) / 2, loft);
      this._box(3.2, 0.16, 6.4, WOOD_DK, (LX0 + LX1) / 2, 5.2, (LZ0 + LZ1) / 2, loft);
      this._box(3.05, 0.55, 6.2, TEXTILE, (LX0 + LX1) / 2, 5.55, (LZ0 + LZ1) / 2, loft);
      this._box(3.05, 0.28, 3.4, CAMEL, (LX0 + LX1) / 2, 5.95, (LZ0 + LZ1) / 2 + 1.2, loft);
      this._box(2.4, 0.3, 1.4, this._mat('#8A6647'), (LX0 + LX1) / 2 + 0.2, 6.0, LZ1 - 1.1, loft);
      this._box(1.7, 0.35, 0.9, WHITE, (LX0 + LX1) / 2, 6.0, LZ0 + 0.85, loft);
      this._box(0.14, 0.9, 5.4, WOOD, LX1 - 0.1, 6.1, (LZ0 + LZ1) / 2, loft);
      var ladG = new T.Group(); ladG.position.set(-4.4, 0, LZ1 + 0.15); loft.add(ladG);
      this._box(0.18, 5.6, 0.18, WOOD_DK, -0.7, 2.8, 0, ladG);
      this._box(0.18, 5.6, 0.18, WOOD_DK, 0.7, 2.8, 0, ladG);
      for (var lr = 0; lr < 5; lr++) this._box(1.4, 0.14, 0.14, WOOD_DK, 0, 0.8 + lr * 1.05, 0, ladG);

      /* string lights */
      var bulbGeo = new T.SphereGeometry(0.075, 8, 8);
      this.bulbMat = new T.MeshStandardMaterial({ color: '#E2C97E', emissive: '#E2C97E', emissiveIntensity: 0, roughness: 0.5 });
      var bulbs = new T.Group(); room.add(bulbs);
      // north wall top edge (full width)
      for (var ni = 0; ni <= 24; ni++) {
        var bn = new T.Mesh(bulbGeo, this.bulbMat);
        bn.position.set(-6.3 + ni * (12.6 / 24), 7.45 + Math.sin(ni * 1.7) * 0.05, -7.55);
        bulbs.add(bn);
      }
      // west wall top edge (full length)
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

      /* desk + hutch */
      var desk = new T.Group(); desk.position.set(-5.7, 0, -5.8); room.add(desk);
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
      this.deskGlow = this._glowSprite(2.2, 0xcfe0ff); this.deskGlow.position.set(-5.6, 3.7, -6.3); room.add(this.deskGlow);

      /* corkboard on west wall by desk */
      var cork = new T.Group(); cork.position.set(-6.85, 5.0, -5.8); room.add(cork);
      this._box(0.12, 1.8, 2.6, this._mat('#B0713F'), 0, 0, 0, cork);
      var corkFace = new T.Mesh(new T.PlaneGeometry(2.2, 1.4), this._mat('#C9A06A', { roughness: 1 }));
      corkFace.rotation.y = Math.PI / 2; corkFace.position.x = 0.07; cork.add(corkFace);
      this._box(0.02, 0.5, 0.4, WHITE, 0.09, 0.2, -0.5, cork).castShadow = false;
      this._box(0.02, 0.45, 0.35, this._mat('#E9DCC1'), 0.09, -0.15, 0.4, cork).castShadow = false;
      this._box(0.02, 0.4, 0.5, this._mat('#C9A84C'), 0.09, 0.3, 0.6, cork).castShadow = false;

      /* desk chair + accent rug */
      this._box(2.4, 0.08, 2.2, this._mat('#B79668', { roughness: 1 }), -4.7, 0.05, -5.6).castShadow = false;
      var chair = new T.Group(); chair.position.set(-4.6, 0, -5.7); chair.rotation.y = 0.5; room.add(chair); this.chair = chair;
      this._box(1.15, 0.14, 1.15, WOOD, 0, 1.35, 0, chair);
      this._box(1.05, 0.16, 1.05, CAMEL, 0, 1.48, 0, chair);
      for (var cl = 0; cl < 4; cl++)
        this._box(0.12, 1.35, 0.12, WOOD_DK, (cl % 2 ? 0.45 : -0.45), 0.67, (cl < 2 ? 0.45 : -0.45), chair);
      this._box(0.12, 1.5, 1.05, WOOD, -0.52, 2.2, 0, chair);

      /* dresser + diffuser */
      var dresser = new T.Group(); dresser.position.set(-5.7, 0, -2.6); room.add(dresser);
      this._box(2.0, 2.5, 2.5, WOOD, 0, 1.25, 0, dresser);
      for (var dr = 0; dr < 3; dr++) {
        this._box(0.08, 0.62, 2.2, WOOD_DK, 1.02, 0.5 + dr * 0.78, 0, dresser);
        this._box(0.1, 0.1, 0.5, DARK, 1.1, 0.5 + dr * 0.78, 0, dresser);
      }
      var dif = new T.Group(); dif.position.set(-5.4, 2.5, -2.6); room.add(dif);
      var difBody = new T.Mesh(new T.CylinderGeometry(0.22, 0.26, 0.42, 14), this._mat('#EDE4D2', { roughness: 0.6 }));
      difBody.position.y = 0.21; difBody.castShadow = true; dif.add(difBody);
      var difTop = new T.Mesh(new T.CylinderGeometry(0.14, 0.22, 0.16, 14), WOOD); difTop.position.y = 0.5; dif.add(difTop);
      this.diffuserPos = new T.Vector3(-5.4, 3.1, -2.6);

      /* ================= ZONE 2 — MEDIA WALL (west, south of loft) ================= */
      var console = new T.Group(); console.position.set(-6.35, 0, 2.3); room.add(console);
      for (var cleg = 0; cleg < 4; cleg++)                             // lifted legs
        this._box(0.2, 0.75, 0.2, WOOD_DK, (cleg < 2 ? -0.45 : 0.45), 0.375, (cleg % 2 ? -1.9 : 1.9), console);
      this._box(1.3, 2.0, 4.2, WOOD, 0, 1.75, 0, console);            // console body (raised)
      this._box(1.34, 0.16, 4.24, WOOD_DK, 0, 2.8, 0, console);        // top
      for (var cd = -1; cd <= 1; cd += 2) {                            // cabinet doors
        this._box(0.08, 1.5, 1.9, WOOD_DK, 0.66, 1.75, cd * 1.02, console);
        this._box(0.1, 0.1, 0.4, DARK, 0.72, 1.75, cd * 1.02, console);
      }
      /* TV on console, facing east */
      var tvG = new T.Group(); tvG.position.set(-6.2, 4.2, 2.3); room.add(tvG);
      this._box(0.5, 0.1, 1.2, DARK, -0.05, -1.3, 0, tvG);            // TV stand foot
      this._box(0.16, 2.1, 3.7, BLACK, 0, 0, 0, tvG);
      this.tvScreen = new T.Mesh(new T.PlaneGeometry(3.45, 1.86),
        new T.MeshStandardMaterial({ color: '#14100C', emissive: '#bfd4ff', emissiveIntensity: 0, roughness: 0.35 }));
      this.tvScreen.rotation.y = Math.PI / 2; this.tvScreen.position.x = 0.09; tvG.add(this.tvScreen);
      this.tvGlow = this._glowSprite(3.4, 0xbfd4ff); this.tvGlow.position.set(-5.7, 4.2, 2.3); room.add(this.tvGlow);
      /* LED strip glow behind console */
      this.ledMat = new T.MeshStandardMaterial({ color: '#E2C97E', emissive: '#E2C97E', emissiveIntensity: 0, roughness: 0.6 });
      this._box(0.06, 0.12, 4.0, this.ledMat, -6.98, 1.2, 2.3);
      this.ledGlow = this._glowSprite(3.0); this.ledGlow.position.set(-6.7, 1.4, 2.3); room.add(this.ledGlow);
      /* décor on console top */
      this._box(0.35, 0.55, 0.35, GREEN, -6.35, 3.15, 0.9, room);      // small plant pot mass
      this._box(0.5, 0.4, 0.16, this._mat('#8A6647'), -6.35, 3.08, 2.1, room);

      /* floor lamp #1 (media wall) */
      this._floorLamp(room, -6.0, 5.6, WOOD_DK);
      this.lampGlow1 = this._glowSprite(2.6); this.lampGlow1.position.set(-6.0, 4.7, 5.6); room.add(this.lampGlow1);

      /* ================= ZONE 3 — LOUNGE (center) ================= */
      this._box(7.2, 0.09, 5.4, this._mat('#BCA277', { roughness: 1 }), 0.7, 0.05, 2.0).castShadow = false;
      this._box(6.8, 0.1, 5.0, this._mat('#AD9166', { roughness: 1 }), 0.7, 0.055, 2.0).castShadow = false;

      var sofa = new T.Group(); sofa.position.set(2.4, 0, 1.6); sofa.rotation.y = -Math.PI / 2; room.add(sofa);
      this.sofa = sofa;
      this._box(3.2, 0.65, 2.6, SOFA, 0, 0.42, 0.25, sofa);
      this._box(3.2, 0.5, 2.4, this._mat('#8A6647', { roughness: 1 }), 0, 0.95, 0.35, sofa);
      var back = this._box(3.2, 1.7, 0.8, SOFA, 0, 1.45, -0.95, sofa); back.rotation.x = -0.22;
      for (var rb = -1; rb <= 1; rb++)
        this._box(0.12, 0.55, 2.35, this._mat('#6E5034', { roughness: 1 }), rb * 1.0, 0.95, 0.35, sofa);
      /* throw pillows + knit throw */
      this._box(0.9, 0.7, 0.35, CAMEL, -1.0, 1.35, -0.4, sofa);
      this._box(0.85, 0.65, 0.33, this._mat('#E9DCC1'), 1.0, 1.32, -0.4, sofa);
      this._box(1.4, 0.22, 1.3, this._mat('#B79668'), 0.7, 1.28, 0.4, sofa); // folded throw

      /* storage ottoman / coffee table in front of sofa */
      var ott = new T.Group(); ott.position.set(-0.1, 0, 1.6); room.add(ott); this.ott = ott;
      this._box(2.0, 1.0, 1.8, this._mat('#8A6647', { roughness: 1 }), 0, 0.5, 0, ott);
      this._box(2.1, 0.14, 1.9, WOOD_DK, 0, 1.05, 0, ott);
      this._box(0.6, 0.12, 0.35, DARK, 0.4, 1.16, 0.2, ott).castShadow = false; // remote
      this._box(0.22, 0.28, 0.22, this._mat('#EDE4D2'), -0.4, 1.24, -0.2, ott).castShadow = false; // mug

      /* poufs beside sofa */
      var poufGeo = new T.CylinderGeometry(0.62, 0.7, 0.75, 16);
      var pouf1 = new T.Mesh(poufGeo, CAMEL); pouf1.position.set(2.9, 0.38, 4.0); pouf1.castShadow = pouf1.receiveShadow = true; room.add(pouf1); this.pouf1 = pouf1;
      var pouf2 = new T.Mesh(poufGeo, this._mat('#A9855C')); pouf2.position.set(4.2, 0.38, 3.4); pouf2.castShadow = pouf2.receiveShadow = true; room.add(pouf2); this.pouf2 = pouf2;

      /* ================= ZONE 5 — KITCHEN WORKSTATION (NE corner) ================= */
      var kit = new T.Group(); kit.position.set(3.6, 0, -5.9); room.add(kit);
      this._box(2.6, 0.06, 2.2, this._mat('#96704A', { roughness: 1 }), 0, 0.03, 0, kit).castShadow = false; // floor mat
      /* stand */
      this._box(2.2, 0.12, 1.9, WOOD, 0, 2.7, 0, kit);   // counter top at ~32"
      this._box(0.12, 2.7, 1.9, WOOD_DK, -1.0, 1.35, 0, kit);
      this._box(0.12, 2.7, 1.9, WOOD_DK, 1.0, 1.35, 0, kit);
      this._box(2.2, 0.12, 1.9, WOOD_DK, 0, 1.4, 0, kit); // mid shelf
      /* mini-fridge (white) on bottom, with venting clearance */
      this.fridge = new T.Group(); this.fridge.position.set(0, 0, 0.1); kit.add(this.fridge);
      this._box(1.5, 1.7, 1.4, this._mat('#EFEBE2', { roughness: 0.5 }), 0, 0.95, 0, this.fridge);
      this.fridgeDoor = this._box(0.1, 1.55, 1.3, this._mat('#E7E1D5', { roughness: 0.5 }), 0.76, 0.95, 0, this.fridge);
      this._box(0.06, 0.5, 0.08, DARK, 0.82, 1.0, -0.5, this.fridge); // handle
      this.fridgeGlowS = this._glowSprite(1.6, 0xdfeaff); this.fridgeGlowS.position.set(4.3, 1.15, -5.9); room.add(this.fridgeGlowS);
      /* microwave on top */
      var mw = new T.Group(); mw.position.set(0, 3.1, 0); kit.add(mw);
      this._box(1.7, 1.0, 1.4, this._mat('#2E2822', { roughness: 0.5 }), 0, 0, 0, mw);
      this.mwScreen = new T.Mesh(new T.PlaneGeometry(1.0, 0.7),
        new T.MeshStandardMaterial({ color: '#120f0b', emissive: '#ffdd99', emissiveIntensity: 0, roughness: 0.4 }));
      this.mwScreen.rotation.y = Math.PI / 2; this.mwScreen.position.set(0.86, 0, -0.2); mw.add(this.mwScreen);
      this._box(0.16, 0.7, 0.4, this._mat('#1a1712'), 0.86, 0, 0.45, mw); // control panel
      this.mwGlowS = this._glowSprite(1.5, 0xffdd99); this.mwGlowS.position.set(4.5, 3.1, -6.1); room.add(this.mwGlowS);
      /* upper shelf w/ mugs & snacks */
      this._box(2.2, 0.12, 1.4, WOOD, 0, 4.2, 0, kit);
      this._box(0.12, 1.1, 1.4, WOOD_DK, -1.0, 3.75, 0, kit);
      this._box(0.12, 1.1, 1.4, WOOD_DK, 1.0, 3.75, 0, kit);
      this._box(0.32, 0.4, 0.32, this._mat('#C9A84C'), -0.5, 4.45, 0.2, kit);
      this._box(0.3, 0.38, 0.3, this._mat('#EDE4D2'), 0.2, 4.44, -0.2, kit);
      this._box(0.4, 0.55, 0.28, this._mat('#8A6647'), 0.6, 4.5, 0.3, kit);

      /* ================= ZONE 6 — ENTRY (south wall) ================= */
      var STUB = 4.6;
      var CW = 4, CD = 1.6;
      var CONC = this._mat('#B9B4AA', { roughness: 1, metalness: 0.02 });
      function buildCloset(cx, kind) {
        var cl = new T.Group(); cl.position.set(cx, 0, 7.2); room.add(cl);
        // open niche: back + two sides + top (front open, opening faces the room / -z)
        self0._box(CW, STUB, 0.14, WALL, 0, STUB / 2, CD / 2, cl);
        self0._box(0.14, STUB, CD, WALL, -CW / 2, STUB / 2, 0, cl);
        self0._box(0.14, STUB, CD, WALL, CW / 2, STUB / 2, 0, cl);
        self0._box(CW, 0.14, CD, WALL, 0, STUB, 0, cl);
        self0._box(CW, 0.16, CD, WALL, 0, 0.08, 0, cl).receiveShadow = true;
        // two open concrete shelves
        self0._box(CW - 0.3, 0.18, CD - 0.25, CONC, 0, 1.55, 0, cl);
        self0._box(CW - 0.3, 0.18, CD - 0.25, CONC, 0, 2.95, 0, cl);
        var m = self0._mat.bind(self0), box = self0._box.bind(self0);
        if (kind === 'clothes') {
          // hanging rod + garments in top bay
          box(0.08, 0.08, CD - 0.4, DARK, 0, 3.85, 0, cl).castShadow = false;
          var gc = ['#7C5B3B', '#5F7A4A', '#C9A84C', '#8A6647', '#A9855C', '#6B4F2A'];
          for (var gi = 0; gi < 6; gi++)
            box(0.5, 1.5, 0.28, m(gc[gi]), -1.4 + gi * 0.56, 3.05, -0.05, cl);
          // folded stacks on mid shelf
          box(0.9, 0.5, 0.7, m('#E4D3AE'), -1.0, 3.3, 0, cl);
          box(0.9, 0.4, 0.7, m('#C9A874'), 0.05, 3.25, 0, cl);
          // shoes on floor
          for (var si = 0; si < 3; si++) {
            box(0.35, 0.22, 0.6, m(si % 2 ? '#2C2A26' : '#8A6647'), -1.2 + si * 0.5, 0.28, -0.1, cl);
          }
        } else {
          // supplies: bins on floor + mid shelf
          box(1.0, 0.75, 0.85, m('#A9855C'), -0.95, 0.55, 0, cl);
          box(1.0, 0.75, 0.85, m('#8A6647'), 0.35, 0.55, 0, cl);
          box(0.95, 0.55, 0.8, m('#C9A874'), -0.9, 1.95, 0, cl);   // basket on mid shelf
          box(0.95, 0.55, 0.8, m('#B79B6E'), 0.35, 1.95, 0, cl);
          // stacked linens/towels on top shelf
          box(1.0, 0.28, 0.7, m('#E4D3AE'), -0.8, 3.28, 0, cl);
          box(1.0, 0.24, 0.7, m('#EDE4D2'), -0.8, 3.5, 0, cl);
          // toiletries / paper goods
          box(0.24, 0.5, 0.24, m('#5F7A4A'), 0.7, 3.4, 0, cl);
          box(0.5, 0.5, 0.42, m('#F7F2E8'), 0.2, 3.35, 0, cl); // paper towel roll block
        }
        return cl;
      }
      /* Closet A (clothes) + Closet B (supplies) — identical structure, equal size */
      buildCloset(-4, 'clothes');
      buildCloset(4, 'supplies');
      /* door + mirror */
      var doorG = new T.Group(); doorG.position.set(0, 0, 7.75); room.add(doorG);
      this._box(0.35, STUB + 0.4, 0.5, WALL, -1.55, (STUB + 0.4) / 2, 0, doorG);
      this._box(0.35, STUB + 0.4, 0.5, WALL, 1.55, (STUB + 0.4) / 2, 0, doorG);
      this._box(3.45, 0.35, 0.5, WALL, 0, STUB + 0.25, 0, doorG);
      this._box(2.7, STUB, 0.18, WOOD_DK, 0, STUB / 2, 0, doorG);
      var mirror = new T.Mesh(new T.PlaneGeometry(1.1, 3.4),
        new T.MeshStandardMaterial({ color: '#cfd6d8', metalness: 0.85, roughness: 0.15 }));
      mirror.rotation.y = Math.PI; mirror.position.set(0, 2.1, -0.11); doorG.add(mirror);
      /* hook rack beside door */
      this._box(0.9, 0.25, 0.14, WOOD, -2.3, 3.0, 7.6);
      for (var hk = 0; hk < 3; hk++) this._box(0.05, 0.2, 0.15, DARK, -2.6 + hk * 0.3, 2.85, 7.55);
      this._box(0.35, 0.6, 0.05, this._mat('#5F7A4A'), -2.55, 2.5, 7.5).castShadow = false; // lanyard
      /* entry mat/runner */
      this._box(3.0, 0.05, 1.3, this._mat('#8A6647', { roughness: 1 }), 0, 0.03, 6.9).castShadow = false;
      /* lidded laundry hamper, back corner by closet A / entry */
      var hmp = new T.Group(); hmp.position.set(-6.0, 0, 5.9); room.add(hmp); this.hmp = hmp;
      var hmpBody = new T.Mesh(new T.CylinderGeometry(0.6, 0.52, 1.5, 16), this._mat('#B79B6E', { roughness: 1 }));
      hmpBody.position.y = 0.75; hmpBody.castShadow = true; hmp.add(hmpBody);
      var hmpLid = new T.Mesh(new T.CylinderGeometry(0.64, 0.6, 0.22, 16), this._mat('#A9855C', { roughness: 1 }));
      hmpLid.position.y = 1.6; hmpLid.castShadow = true; hmp.add(hmpLid);
      var hmpKnob = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.1, 10), this._mat('#8A6647'));
      hmpKnob.position.y = 1.75; hmp.add(hmpKnob);
      /* layered rugs: accent under desk chair + entry runner */
      this._box(2.4, 0.06, 2.0, this._mat('#C7B085', { roughness: 1 }), -4.7, 0.045, -5.6).castShadow = false;
      this._box(3.4, 0.06, 1.15, this._mat('#9E8258', { roughness: 1 }), 0, 0.045, 6.4).castShadow = false;
      /* wall outlets */
      this._outlet(-6.98, 1.3, 3.4, 0);       // west wall, between clothes closet and TV
      this._outlet(1.9, 1.3, 7.0, Math.PI);   // entry wall, behind couch near supplies closet

      /* whiteboard command-center (west wall near entry) */
      var wb = new T.Group(); wb.position.set(-6.85, 5.4, 6.4); room.add(wb);
      this._box(0.12, 2.2, 3.0, this._mat('#C9A84C'), 0, 0, 0, wb);
      var wbFace = new T.Mesh(new T.PlaneGeometry(2.7, 1.9), WHITE);
      wbFace.rotation.y = Math.PI / 2; wbFace.position.x = 0.07; wb.add(wbFace);

      /* ---------- invisible hit targets ---------- */
      var self = this;
      function hit(w, h, d, x, y, z, action, label) {
        var m = new T.Mesh(new T.BoxGeometry(w, h, d),
          new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        m.position.set(x, y, z); m.userData = { action: action, label: label };
        m.castShadow = m.receiveShadow = false; room.add(m); self.hitMeshes.push(m); return m;
      }
      hit(5.6, 0.9, 1.0, 0, 7.5, -7.55, 'lights', 'String lights');
      hit(1.0, 0.9, 12.0, -6.92, 7.5, 0, 'lights', 'String lights');
      hit(2.2, 2.4, 3.4, -5.5, 3.6, -5.8, 'computer', 'Computer');
      hit(1.0, 2.6, 4.2, -6.1, 4.2, 2.3, 'tv', 'TV');
      hit(3.6, 2.6, 3.4, 2.0, 1.2, 1.6, 'sofa', 'Floor sofa');
      hit(6.2, 5.2, 1.2, 0, 4.5, -7.4, 'curtains', 'Curtains');
      hit(0.9, 1.1, 0.9, -5.4, 3.0, -2.6, 'diffuser', 'Diffuser');
      hit(2.0, 1.2, 1.6, 3.6, 3.1, -5.9, 'microwave', 'Microwave');
      hit(1.8, 1.9, 1.6, 3.6, 1.0, -5.8, 'fridge', 'Mini-fridge');
      hit(4.4, 2.2, 1.0, 0, 3.2, -7.05, 'fans', 'Fans');
      hit(1.8, 4.4, 1.2, -5.9, 2.4, 6.4, 'fans', 'Fans');

      /* mist sprites */
      this.mist = [];
      for (var mi = 0; mi < 9; mi++) {
        var ms = this._glowSprite(0.4, 0xf2ede2);
        ms.material.blending = T.NormalBlending; ms.position.copy(this.diffuserPos);
        ms.userData = { t: -(mi * 0.9 + Math.random()), dx: 0 }; room.add(ms); this.mist.push(ms);
      }
      this._mistBurst = 0; this._sofaVel = 0; this._sofaS = 1;
      this._mwFlash = 0; this._fridgeOpen = 0;

      /* ---------- draggable furniture ---------- */
      this.dragMeshes = [];
      var mkDrag = function (group, w, d, h, cy) {
        if (!group) return;
        var proxy = new T.Mesh(new T.BoxGeometry(w, h, d),
          new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        proxy.position.set(0, cy, 0);
        proxy.userData = { dragTarget: group };
        proxy.castShadow = proxy.receiveShadow = false;
        group.add(proxy); self.dragMeshes.push(proxy);
      };
      mkDrag(this.sofa, 3.4, 3.0, 2.2, 1.1);
      mkDrag(this.ott, 2.2, 2.0, 1.3, 0.6);
      mkDrag(this.chair, 1.5, 1.5, 2.6, 1.3);
      mkDrag(this.tower, 1.7, 1.7, 4.6, 2.3);
      mkDrag(this.hmp, 1.5, 1.5, 1.8, 0.9);
      mkDrag(this.pouf1, 1.6, 1.6, 1.0, 0.2);
      mkDrag(this.pouf2, 1.6, 1.6, 1.0, 0.2);
    }

    _floorLamp(parent, x, z, poleMat) {
      var T = this.T, g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
      var base = new T.Mesh(new T.CylinderGeometry(0.35, 0.4, 0.14, 14), poleMat); base.position.y = 0.07; base.castShadow = true; g.add(base);
      this._box(0.1, 4.4, 0.1, poleMat, 0, 2.2, 0, g);
      var shade = new T.Mesh(new T.CylinderGeometry(0.55, 0.7, 0.8, 16), this._mat('#E9DCC1', { roughness: 0.7 }));
      shade.position.y = 4.5; shade.castShadow = true; g.add(shade);
      return g;
    }

    _outlet(x, y, z, ry) {
      var T = this.T, g = new T.Group(); g.position.set(x, y, z); if (ry) g.rotation.y = ry; this.room.add(g);
      this._box(0.06, 0.85, 0.55, this._mat('#EDE8DC', { roughness: 0.7 }), 0, 0, 0, g).castShadow = false;
      var sm = this._mat('#7A6444', { roughness: 0.5 });
      this._box(0.03, 0.24, 0.32, sm, 0.045, 0.19, 0, g).castShadow = false;
      this._box(0.03, 0.24, 0.32, sm, 0.045, -0.19, 0, g).castShadow = false;
      return g;
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
          self._dragObj = dh.object.userData.dragTarget;
          var pt = self._planePoint(e);
          if (pt) self._dragOff.set(self._dragObj.position.x - pt.x, 0, self._dragObj.position.z - pt.z);
          self.renderer.domElement.style.cursor = 'grabbing';
        }
      });
      el.addEventListener('pointermove', function (e) {
        self._idleT = 0;
        if (drag && e.pointerId === drag.id) {
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY;
          if (self._dragObj) {
            var pt = self._planePoint(e);
            if (pt) {
              self._dragObj.position.x = Math.max(-6.3, Math.min(6.3, pt.x + self._dragOff.x));
              self._dragObj.position.z = Math.max(-7.0, Math.min(7.3, pt.z + self._dragOff.z));
            }
          } else {
            self.orbit.theta -= dx * 0.0055;
            self.orbit.phi = Math.max(0.42, Math.min(1.38, self.orbit.phi - dy * 0.0045));
            self._tween = null;
          }
        } else self._hover(e);
      });
      el.addEventListener('pointerup', function (e) {
        if (drag && moved < 6) self._click(e);
        self._dragObj = null; drag = null;
        self.renderer.domElement.style.cursor = 'grab';
      });
      el.addEventListener('pointercancel', function () { self._dragObj = null; drag = null; });
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

    _pick(e) {
      var r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      var hits = this.raycaster.intersectObjects(this.hitMeshes, false);
      return hits.length ? hits[0] : null;
    }

    _pickDrag(e) {
      if (!this.dragMeshes) return null;
      var r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      var hits = this.raycaster.intersectObjects(this.dragMeshes, false);
      return hits.length ? hits[0] : null;
    }

    _planePoint(e) {
      var r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      var pt = new this.T.Vector3();
      return this.raycaster.ray.intersectPlane(this._floorPlane, pt) ? pt : null;
    }

    _hover(e) {
      var hitObj = this._pick(e);
      if (hitObj) {
        this.renderer.domElement.style.cursor = 'pointer';
        this.tip.style.display = 'block';
        this.tip.textContent = hitObj.object.userData.label;
        var r = this.renderer.domElement.getBoundingClientRect();
        this.tip.style.left = (e.clientX - r.left) + 'px';
        this.tip.style.top = (e.clientY - r.top) + 'px';
      } else if (this._editMode && this._pickDrag(e)) {
        this.renderer.domElement.style.cursor = 'move';
        this.tip.style.display = 'none';
      } else {
        this.renderer.domElement.style.cursor = 'grab';
        this.tip.style.display = 'none';
      }
    }

    _click(e) {
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
        if (this._idleT > 6 && !this.reduced && this._autoRotate !== false) this.orbit.theta += dt * 0.09;
      }
      this._applyOrbit();

      var idle = this._idleT > 6;
      this.hemi.intensity = damp(this.hemi.intensity, night ? 0.22 : 1.05, 4, dt);
      this.hemi.color.lerp(new T.Color(night ? '#8fa3c4' : '#fff3de'), Math.min(1, dt * 4));
      this.sun.intensity = damp(this.sun.intensity, night ? 0.04 : (s.curtainsOpen ? 1.7 : 0.7), 4, dt);
      this.scene.background.lerp(night ? this._bgNight : this._bgDay, Math.min(1, dt * 4));
      this.skyMat.color.lerp(new T.Color(night ? '#1d2740' : '#FFE9BC'), Math.min(1, dt * 4));

      /* warm fixtures (string lights + floor lamps + LED strip) all follow lightsOn */
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

      /* diffuser mist */
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
          ms.position.set(this.diffuserPos.x + ms.userData.dx * mt, this.diffuserPos.y + mt * 1.6, this.diffuserPos.z + ms.userData.dx * 0.5 * mt);
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
