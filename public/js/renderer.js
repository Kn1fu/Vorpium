// ===== renderer.js — Canvas rendering =====

const Renderer = (() => {
  const T = CONFIG.TILE_SIZE;
  let canvas, ctx, minimapCanvas, minimapCtx;
  let camera = { x: 0, y: 0 };
  let width = 0, height = 0;

  function init(c, mc) {
    canvas = c;
    ctx = canvas.getContext('2d');
    minimapCanvas = mc;
    minimapCtx = mc.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function updateCamera() {
    const targetX = Player.state.x + Player.state.width  / 2 - width  / 2;
    const targetY = Player.state.y + Player.state.height / 2 - height / 2;
    camera.x += (targetX - camera.x) * CONFIG.CAMERA_LERP;
    camera.y += (targetY - camera.y) * CONFIG.CAMERA_LERP;
  }

  function getCamera() { return camera; }

  // ---- Draw sky gradient based on planet/biome ----
  function drawSky() {
    const planet = PLANETS.find(p => p.id === World.activePlanet) || PLANETS[0];
    const biome  = BIOMES[planet.biomes[0]] || BIOMES.forest;
    const skyColor = biome.sky || '#5080c0';

    const gradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
    gradient.addColorStop(0, darken(skyColor, 0.3));
    gradient.addColorStop(1, skyColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Stars in void/space biome
    if (planet.biomes.includes('void') || skyColor === '#0a0015') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      // Deterministic stars based on camera position
      const starSeed = 12345;
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 1619 + starSeed) % width);
        const sy = ((i * 2053) % (height * 0.5));
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
      }
    }
  }

  // ---- Draw all visible tiles ----
  function drawWorld() {
    const startX = Math.floor(camera.x / T) - 1;
    const startY = Math.floor(camera.y / T) - 1;
    const endX   = startX + Math.ceil(width  / T) + 2;
    const endY   = startY + Math.ceil(height / T) + 2;

    for (let wy = startY; wy <= endY; wy++) {
      for (let wx = startX; wx <= endX; wx++) {
        const tileId = World.getTile(wx, wy);
        if (!tileId || tileId === 'air') continue;

        const tileDef = TILES[tileId];
        if (!tileDef) continue;

        const sx = wx * T - camera.x;
        const sy = wy * T - camera.y;

        const light = Lighting.getLightLevel(wx, wy);
        const brightness = 0.3 + (light / 15) * 0.7;

        ctx.fillStyle = tileDef.color || '#888';
        ctx.globalAlpha = brightness;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), T, T);
        ctx.globalAlpha = 1;

        if (tileDef.solid) {
          ctx.strokeStyle = `rgba(0,0,0,${0.15 * brightness})`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(Math.floor(sx), Math.floor(sy), T, T);
        }

        if (tileId === 'lava') {
          const pulse = 0.3 + 0.1 * Math.sin(Date.now() / 400);
          ctx.fillStyle = `rgba(255,100,0,${pulse * brightness})`;
          ctx.fillRect(Math.floor(sx), Math.floor(sy), T, T);
        }
        if (tileId === 'water') {
          ctx.fillStyle = `rgba(32,96,192,${0.45 * brightness})`;
          ctx.fillRect(Math.floor(sx), Math.floor(sy), T, T);
        }
        if (tileId === 'torch') {
          const flicker = 0.15 + 0.05 * Math.sin(Date.now() / 200 + wx * 3);
          ctx.fillStyle = `rgba(255,180,40,${flicker})`;
          ctx.beginPath();
          ctx.arc(sx + T/2, sy + T/2, T * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ---- Draw player ----
  function drawPlayer() {
    const ps = Player.state;
    const sx = Math.floor(ps.x - camera.x);
    const sy = Math.floor(ps.y - camera.y);
    const w  = ps.width;
    const h  = ps.height;

    if (ps.dead) ctx.globalAlpha = 0.4;

    Sprite.drawPlayer(ctx, sx, sy, w, h, ps.facingRight, ps.name, true);

    const activeItem = Inventory.getActiveItem();
    if (activeItem && ITEMS[activeItem.id]) {
      const icon = ITEMS[activeItem.id].icon || '';
      ctx.font = '10px serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, ps.facingRight ? sx + w : sx - 10, sy + h / 2);
    }

    ctx.globalAlpha = 1;
  }

  // ---- Draw other network players ----
  function drawNetPlayers(netPlayers) {
    for (const np of Object.values(netPlayers)) {
      if (np.x == null || np.y == null) continue;
      const sx = Math.floor(np.x - camera.x);
      const sy = Math.floor(np.y - camera.y);
      Sprite.drawPlayer(ctx, sx, sy, 14, 28, np.facingRight, np.name || 'Player', false);
    }
  }

  // ---- Draw entities ----
  function drawEntities(entities) {
    for (const ent of entities) {
      const sx = Math.floor(ent.x - camera.x);
      const sy = Math.floor(ent.y - camera.y);
      const def = ENTITY_TYPES[ent.type];
      if (!def) continue;

      ctx.font = '20px serif';
      ctx.textBaseline = 'top';
      ctx.fillText(def.icon || '?', sx - 4, sy - 4);

      // HP bar
      const hpPct = ent.hp / def.hp;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(sx - 4, sy - 8, 24, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#4caf78' : hpPct > 0.25 ? '#e8b840' : '#e05252';
      ctx.fillRect(sx - 4, sy - 8, Math.floor(24 * hpPct), 4);
    }
    ctx.textBaseline = 'alphabetic';
  }

  // ---- Draw mining progress overlay ----
  function drawMiningProgress() {
    const mp = Player.getMiningProgress();
    if (!mp) return;
    const sx = mp.wx * T - camera.x;
    const sy = mp.wy * T - camera.y;
    const pct = mp.progress / mp.maxProgress;

    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, T, T);

    // Crack overlay
    ctx.fillStyle = `rgba(0,0,0,${pct * 0.6})`;
    ctx.fillRect(sx, sy, T, T);

    // Progress bar below tile
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(sx, sy + T + 2, T, 4);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(sx, sy + T + 2, T * pct, 4);
  }

  // ---- Block placement ghost ----
  function drawPlacementGhost(cam) {
    const pos = Player.getMouseWorldPos(cam);
    const sx = pos.wx * T - camera.x;
    const sy = pos.wy * T - camera.y;
    const activeItem = Inventory.getActiveItem();
    if (activeItem && ITEMS[activeItem.id] && ITEMS[activeItem.id].place) {
      const tile = TILES[ITEMS[activeItem.id].place];
      if (tile) {
        ctx.fillStyle = tile.color + '80';
        ctx.fillRect(sx, sy, T, T);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, T, T);
      }
    }
  }

  // ---- Minimap ----
  function drawMinimap() {
    const mc = minimapCtx;
    const mw = minimapCanvas.width;
    const mh = minimapCanvas.height;
    const scale = 2; // pixels per tile
    const tilesW = Math.floor(mw / scale);
    const tilesH = Math.floor(mh / scale);
    const camTX = Math.floor(camera.x / T);
    const camTY = Math.floor(camera.y / T);

    mc.clearRect(0, 0, mw, mh);
    mc.fillStyle = '#000';
    mc.fillRect(0, 0, mw, mh);

    for (let dy = 0; dy < tilesH; dy++) {
      for (let dx = 0; dx < tilesW; dx++) {
        const wx = camTX + dx - tilesW / 2;
        const wy = camTY + dy - tilesH / 2;
        const tid = World.getTile(wx, wy);
        if (!tid || tid === 'air') continue;
        const tile = TILES[tid];
        mc.fillStyle = tile?.color || '#888';
        mc.fillRect(dx * scale, dy * scale, scale, scale);
      }
    }

    // Player dot
    mc.fillStyle = '#fff';
    mc.fillRect(Math.floor(mw / 2) - 1, Math.floor(mh / 2) - 1, 3, 3);
  }

  // ---- Update HUD bars ----
  function updateHUD() {
    const ps = Player.state;
    setBar('bar-hp',     ps.hp,     ps.maxHp,     'hp-text');
    setBar('bar-energy', ps.energy, ps.maxEnergy, 'energy-text');
    setBar('bar-oxygen', ps.oxygen, ps.maxOxygen, 'oxygen-text');

    const cx = document.getElementById('coord-x');
    const cy = document.getElementById('coord-y');
    const dl = document.getElementById('depth-label');
    if (cx) cx.textContent = `X: ${Math.floor(ps.x / T)}`;
    if (cy) cy.textContent = `Y: ${Math.floor(ps.y / T)}`;
    if (dl) {
      const depth = Math.floor(ps.y / T) - 60;
      dl.textContent = depth < 0 ? 'Sky' : depth < 5 ? 'Surface' : depth < 20 ? 'Underground' : depth < 40 ? 'Deep' : 'Abyss';
    }
  }

  function setBar(id, val, max, textId) {
    const el = document.getElementById(id);
    if (el) el.style.width = (Math.max(0, val / max * 100)) + '%';
    const tel = document.getElementById(textId);
    if (tel) tel.textContent = `${Math.ceil(val)}/${max}`;
  }

  // ---- Main frame draw ----
  function drawFrame(entities, netPlayers) {
    Lighting.update();
    updateCamera();
    ctx.clearRect(0, 0, width, height);
    if (Lighting.getAmbient() < 6) drawStars();
    drawSky();
    drawWorld();
    drawEntities(entities);
    drawNetPlayers(netPlayers || {});
    drawMiningProgress();
    drawPlacementGhost(camera);
    drawPlayer();
    drawMinimap();
    updateHUD();
  }

  function drawStars() {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 1619 + 12345) % width);
      const sy = ((i * 2053) % Math.floor(height * 0.4));
      ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
    }
  }

  function darken(hex, amount) {
    let r = parseInt(hex.slice(1,3),16);
    let g = parseInt(hex.slice(3,5),16);
    let b = parseInt(hex.slice(5,7),16);
    r = Math.floor(r * (1 - amount));
    g = Math.floor(g * (1 - amount));
    b = Math.floor(b * (1 - amount));
    return `rgb(${r},${g},${b})`;
  }

  return { init, drawFrame, getCamera };
})();
