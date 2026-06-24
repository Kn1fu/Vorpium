// ===== world.js — Procedural world generation & chunk management =====

const World = (() => {
  const CHUNK_W = CONFIG.CHUNK_WIDTH;
  const CHUNK_H = CONFIG.CHUNK_HEIGHT;
  const T = CONFIG.TILE_SIZE;

  let chunks = {};         // key: "cx,cy"
  let activePlanet = null;
  let seed = 0;

  // -- Simple seeded PRNG (mulberry32) --
  function mkRng(s) {
    return function() {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // -- Smooth noise via linear interp over random lattice --
  function makeNoise(seedVal) {
    const rng = mkRng(seedVal);
    const lattice = new Float32Array(512);
    for (let i = 0; i < 512; i++) lattice[i] = rng() * 2 - 1;

    function noise1d(x) {
      const xi = Math.floor(x) & 511;
      const xf = x - Math.floor(x);
      const u = xf * xf * (3 - 2 * xf); // smoothstep
      return lattice[xi] * (1 - u) + lattice[(xi + 1) & 511] * u;
    }

    function fractal(x, octaves=4, lac=2.0, gain=0.5) {
      let val=0, amp=1, freq=1, max=0;
      for (let i=0; i<octaves; i++) {
        val += noise1d(x * freq) * amp;
        max += amp; amp *= gain; freq *= lac;
      }
      return val / max;
    }

    return { noise1d, fractal };
  }

  // -- Generate a chunk for the current planet/biome --
  function generateChunk(cx, cy) {
    const tiles = new Array(CHUNK_W * CHUNK_H).fill('air');
    const planet = PLANETS.find(p => p.id === activePlanet) || PLANETS[0];
    const biome  = BIOMES[planet.biomes[0]] || BIOMES.forest;
    const noise  = makeNoise(seed + cx * 7 + cy * 13);
    const caveNoise = makeNoise(seed + cx * 3 + cy * 11 + 999);

    const worldX0 = cx * CHUNK_W;
    const worldY0 = cy * CHUNK_H;

    function surfaceY(wx) {
      const base = 60;
      const h = noise.fractal(wx * 0.04, 4) * 20;
      return Math.floor(base + h);
    }

    function isCave(wx, wy, depth) {
      if (depth < 4) return false;
      if (wy < 10) return false;
      const val = caveNoise.fractal(wx * 0.06 + wy * 0.08, 3, 2.0, 0.5);
      if (depth > 25 && val > 0.25) return true;
      if (depth > 40 && val > 0.20) return true;
      if (depth > 15 && val > 0.32) return true;
      return false;
    }

    for (let lx = 0; lx < CHUNK_W; lx++) {
      const wx = worldX0 + lx;
      const sy = surfaceY(wx);

      for (let ly = 0; ly < CHUNK_H; ly++) {
        const wy = worldY0 + ly;
        const idx = ly * CHUNK_W + lx;
        const depth = wy - sy;

        if (depth < 0) {
          tiles[idx] = 'air';
        } else if (depth === 0) {
          tiles[idx] = planet.biomes.includes('desert') ? 'sand' : 'grass';
        } else if (depth < 5) {
          tiles[idx] = planet.biomes.includes('tundra') ? 'ice'
                     : planet.biomes.includes('desert') ? 'sand' : 'dirt';
        } else if (isCave(wx, wy, depth)) {
          tiles[idx] = 'air';
        } else {
          const oreRng = mkRng(seed + wx * 31 + wy * 37);
          const r = oreRng();

          if (depth > 40 && planet.biomes.includes('void')) {
            tiles[idx] = 'void_rock';
          } else if (depth > 30) {
            if (r < 0.04) tiles[idx] = 'nebulite';
            else if (r < 0.10) tiles[idx] = 'crystal_ore';
            else if (r < 0.18) tiles[idx] = 'gold_ore';
            else tiles[idx] = 'stone';
          } else if (depth > 15) {
            if (r < 0.06) tiles[idx] = 'gold_ore';
            else if (r < 0.15) tiles[idx] = 'iron_ore';
            else if (r < 0.22) tiles[idx] = 'coal_ore';
            else tiles[idx] = 'stone';
          } else {
            if (r < 0.08) tiles[idx] = 'coal_ore';
            else if (r < 0.14) tiles[idx] = 'iron_ore';
            else tiles[idx] = 'stone';
          }
        }
      }
    }

    // Plant trees (surface only)
    if (cy === Math.floor(60 / CHUNK_H) || cy === Math.floor(60 / CHUNK_H) - 1) {
      const treeRng = mkRng(seed + cx * 1009);
      if (!planet.biomes.includes('desert') && !planet.biomes.includes('void')) {
        for (let lx = 2; lx < CHUNK_W - 2; lx++) {
          if (treeRng() < 0.12) {
            const wx = worldX0 + lx;
            const sy = surfaceY(wx);
            const localY = sy - worldY0;
            if (localY >= 0 && localY < CHUNK_H) {
              const treeH = 4 + Math.floor(treeRng() * 4);
              for (let t = 1; t <= treeH && localY - t >= 0; t++) {
                tiles[(localY - t) * CHUNK_W + lx] = 'wood';
              }
              // Leaves
              for (let ldy = -2; ldy <= 0; ldy++) {
                for (let ldx = -2; ldx <= 2; ldx++) {
                  const ly2 = localY - treeH + ldy;
                  const lx2 = lx + ldx;
                  if (ly2 >= 0 && ly2 < CHUNK_H && lx2 >= 0 && lx2 < CHUNK_W) {
                    if (tiles[ly2 * CHUNK_W + lx2] === 'air') {
                      tiles[ly2 * CHUNK_W + lx2] = 'leaves';
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return tiles;
  }

  function chunkKey(cx, cy) { return `${cx},${cy}`; }

  function getOrGenChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    if (!chunks[key]) chunks[key] = generateChunk(cx, cy);
    return chunks[key];
  }

  // World-tile getters/setters
  function getTile(wx, wy) {
    const cx = Math.floor(wx / CHUNK_W);
    const cy = Math.floor(wy / CHUNK_H);
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const ly = ((wy % CHUNK_H) + CHUNK_H) % CHUNK_H;
    const chunk = getOrGenChunk(cx, cy);
    return chunk[ly * CHUNK_W + lx] || 'air';
  }

  function setTile(wx, wy, tileId) {
    const cx = Math.floor(wx / CHUNK_W);
    const cy = Math.floor(wy / CHUNK_H);
    const lx = ((wx % CHUNK_W) + CHUNK_W) % CHUNK_W;
    const ly = ((wy % CHUNK_H) + CHUNK_H) % CHUNK_H;
    const chunk = getOrGenChunk(cx, cy);
    chunk[ly * CHUNK_W + lx] = tileId;
  }

  function isSolid(wx, wy) {
    const tid = getTile(wx, wy);
    return TILES[tid] ? TILES[tid].solid : false;
  }

  // Load a planet (clears old chunks, seeds new generation)
  function loadPlanet(planetId) {
    activePlanet = planetId;
    seed = planetId.split('').reduce((a,c) => a + c.charCodeAt(0), 0) * 997;
    chunks = {};
    console.log(`[World] Loaded planet: ${planetId} (seed ${seed})`);
  }

  // Save/load chunks to localStorage
  function save() {
    const data = {
      planet: activePlanet,
      chunks: {}
    };
    for (const key of Object.keys(chunks)) {
      data.chunks[key] = Array.from(chunks[key]);
    }
    try {
      localStorage.setItem('voidbound_world', JSON.stringify(data));
    } catch(e) {
      console.warn('[World] Save failed (quota?):', e);
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem('voidbound_world');
      if (!raw) return false;
      const data = JSON.parse(raw);
      activePlanet = data.planet;
      chunks = {};
      for (const [key, tiles] of Object.entries(data.chunks)) {
        chunks[key] = tiles;
      }
      seed = activePlanet.split('').reduce((a,c) => a + c.charCodeAt(0), 0) * 997;
      return true;
    } catch(e) {
      return false;
    }
  }

  // Preload chunks around a point
  function preloadAround(wx, wy, radius=2) {
    const cx0 = Math.floor(wx / CHUNK_W);
    const cy0 = Math.floor(wy / CHUNK_H);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        getOrGenChunk(cx0 + dx, cy0 + dy);
      }
    }
  }

  return { getTile, setTile, isSolid, loadPlanet, save, load, preloadAround, getOrGenChunk, get activePlanet(){ return activePlanet; } };
})();
