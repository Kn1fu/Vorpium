// ===== player.js — Player entity, physics, input =====

const Player = (() => {
  const T = CONFIG.TILE_SIZE;

  const state = {
    x: 0, y: 0,        // pixel position (top-left of player)
    vx: 0, vy: 0,
    width: 14, height: 28,
    onGround: false,
    hp: CONFIG.BASE_HP, maxHp: CONFIG.BASE_HP,
    energy: CONFIG.BASE_ENERGY, maxEnergy: CONFIG.BASE_ENERGY,
    oxygen: CONFIG.BASE_OXYGEN, maxOxygen: CONFIG.BASE_OXYGEN,
    xp: 0, level: 1,
    facingRight: true,
    isSwimming: false,
    isInSpace: false,
    dead: false,
    name: 'Pilot',
  };

  // Input state
  const keys = {};
  let mouseX = 0, mouseY = 0;
  let mouseDown = { left: false, right: false };

  // Mining progress
  let miningTarget = null;   // { wx, wy, progress, maxProgress }
  let placeCooldown = 0;

  // Timers
  let regenTimer = 0;
  let oxygenTimer = 0;
  let mineTimer = 0;

  // ---- Input listeners ----
  function initInput(canvas) {
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      // Number keys for hotbar
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) Inventory.setActiveSlot(num - 1);
      if (e.code === 'KeyE') UI.toggleInventory();
      if (e.code === 'KeyC') UI.toggleCrafting();
      if (e.code === 'KeyM') UI.toggleShip();
      if (e.code === 'Escape') Game.togglePause();
      e.preventDefault();
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    canvas.addEventListener('mousedown', e => {
      if (e.button === 0) mouseDown.left = true;
      if (e.button === 2) mouseDown.right = true;
      e.preventDefault();
    });
    canvas.addEventListener('mouseup', e => {
      if (e.button === 0) mouseDown.left = false;
      if (e.button === 2) mouseDown.right = false;
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ---- Physics update ----
  function update(dt) {
    if (state.dead) return;

    // Horizontal movement
    let moveX = 0;
    if (keys['ArrowLeft']  || keys['KeyA']) moveX = -1;
    if (keys['ArrowRight'] || keys['KeyD']) moveX =  1;

    state.vx = moveX * CONFIG.PLAYER_SPEED;
    if (moveX > 0) state.facingRight = true;
    if (moveX < 0) state.facingRight = false;

    // Jump
    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && state.onGround) {
      state.vy = CONFIG.JUMP_FORCE;
      state.onGround = false;
    }

    // Swimming
    const centerTileX = Math.floor((state.x + state.width / 2) / T);
    const centerTileY = Math.floor((state.y + state.height / 2) / T);
    const underTile = World.getTile(centerTileX, centerTileY);
    state.isSwimming = underTile === 'water';

    if (state.isSwimming) {
      state.vy *= 0.85;
      if (keys['ArrowUp'] || keys['KeyW']) state.vy -= 0.5;
      if (state.vy > 3) state.vy = 3;
    }

    // Gravity
    state.vy += CONFIG.GRAVITY;
    if (state.vy > CONFIG.TERMINAL_VEL) state.vy = CONFIG.TERMINAL_VEL;

    // -- AABB collision resolution --
    // Move X
    state.x += state.vx;
    resolveAxisX();

    // Move Y
    state.y += state.vy;
    state.onGround = false;
    resolveAxisY();

    // Oxygen drain in space/void
    oxygenTimer++;
    if (state.isInSpace && oxygenTimer >= 20) {
      oxygenTimer = 0;
      state.oxygen = Math.max(0, state.oxygen - CONFIG.OXYGEN_DRAIN * 20);
      if (state.oxygen === 0) {
        state.hp -= 2; // suffocation
      }
    }

    // HP regen
    regenTimer++;
    if (regenTimer > 180) {
      regenTimer = 0;
      if (state.hp < state.maxHp) state.hp = Math.min(state.maxHp, state.hp + CONFIG.HP_REGEN * 10);
    }

    // Lava damage
    const footTile = World.getTile(Math.floor((state.x + state.width / 2) / T), Math.floor((state.y + state.height - 2) / T));
    if (TILES[footTile] && TILES[footTile].damage) {
      state.hp -= TILES[footTile].damage * 0.02;
    }

    if (state.hp <= 0 && !state.dead) die();

    // -- Mining / placing --
    handleMining();

    // Update cooldowns
    if (placeCooldown > 0) placeCooldown--;
  }

  function resolveAxisX() {
    const px = state.x, py = state.y;
    const pw = state.width, ph = state.height;

    const leftTile   = Math.floor(px / T);
    const rightTile  = Math.floor((px + pw - 1) / T);
    const topTile    = Math.floor(py / T);
    const bottomTile = Math.floor((py + ph - 1) / T);

    if (state.vx < 0) {
      if (World.isSolid(leftTile, topTile) || World.isSolid(leftTile, bottomTile)) {
        state.x = (leftTile + 1) * T;
        state.vx = 0;
      }
    } else if (state.vx > 0) {
      if (World.isSolid(rightTile, topTile) || World.isSolid(rightTile, bottomTile)) {
        state.x = rightTile * T - pw;
        state.vx = 0;
      }
    }
  }

  function resolveAxisY() {
    const px = state.x, py = state.y;
    const pw = state.width, ph = state.height;

    const leftTile   = Math.floor(px / T);
    const rightTile  = Math.floor((px + pw - 1) / T);
    const topTile    = Math.floor(py / T);
    const bottomTile = Math.floor((py + ph - 1) / T);

    if (state.vy < 0) {
      if (World.isSolid(leftTile, topTile) || World.isSolid(rightTile, topTile)) {
        state.y = (topTile + 1) * T;
        state.vy = 0;
      }
    } else if (state.vy >= 0) {
      if (World.isSolid(leftTile, bottomTile) || World.isSolid(rightTile, bottomTile)) {
        state.y = bottomTile * T - ph;
        state.vy = 0;
        state.onGround = true;
      }
    }
  }

  // ---- Mining / placing logic ----
  function handleMining() {
    if (!Game.isRunning) return;

    const cam = Renderer.getCamera();
    const worldMouseX = (mouseX + cam.x) / T;
    const worldMouseY = (mouseY + cam.y) / T;
    const wx = Math.floor(worldMouseX);
    const wy = Math.floor(worldMouseY);
    const playerTileX = Math.floor((state.x + state.width / 2) / T);
    const playerTileY = Math.floor((state.y + state.height / 2) / T);
    const dist = Math.hypot(wx - playerTileX, wy - playerTileY);

    // Left click = mine
    if (mouseDown.left && dist <= CONFIG.MINE_RANGE) {
      const tile = World.getTile(wx, wy);
      if (TILES[tile] && TILES[tile].solid) {
        const hardness = TILES[tile].hardness || 1;
        const tool = Inventory.getActiveTool();
        const power = tool ? (ITEMS[tool]?.power || 1) : 1;

        if (!miningTarget || miningTarget.wx !== wx || miningTarget.wy !== wy) {
          miningTarget = { wx, wy, progress: 0, maxProgress: hardness * 20 / power };
        }

        miningTarget.progress++;
        if (miningTarget.progress >= miningTarget.maxProgress) {
          const drop = TILES[tile].drop;
          if (drop) Inventory.addItem(drop, 1);
          World.setTile(wx, wy, 'air');
          miningTarget = null;
          UI.toast(`Mined ${TILES[tile].name}`, 'info');
        }
      } else {
        miningTarget = null;
      }
    } else {
      miningTarget = null;
    }

    // Right click = place
    if (mouseDown.right && dist <= CONFIG.PLACE_RANGE && placeCooldown <= 0) {
      const tile = World.getTile(wx, wy);
      if (tile === 'air') {
        const activeItem = Inventory.getActiveItem();
        if (activeItem && ITEMS[activeItem.id] && ITEMS[activeItem.id].place) {
          World.setTile(wx, wy, ITEMS[activeItem.id].place);
          Inventory.consumeActive(1);
          placeCooldown = 10;
        } else if (activeItem && ITEMS[activeItem.id]) {
          // Try to place block by item name matching tile
          const tileId = activeItem.id.replace('_plank','_plank').replace('_brick','_brick');
          if (TILES[tileId] && TILES[tileId].solid) {
            World.setTile(wx, wy, tileId);
            Inventory.consumeActive(1);
            placeCooldown = 10;
          }
        }
      }
    }
  }

  function die() {
    state.dead = true;
    UI.toast('You died! Respawning...', 'error');
    setTimeout(respawn, 2000);
  }

  function respawn() {
    state.hp = state.maxHp;
    state.oxygen = state.maxOxygen;
    state.dead = false;
    // Spawn near surface
    state.x = 400;
    state.y = 500;
    state.vx = 0;
    state.vy = 0;
  }

  function spawnAt(x, y) {
    state.x = x;
    state.y = y;
    state.vx = 0;
    state.vy = 0;
    state.dead = false;
    state.hp = state.maxHp;
    state.oxygen = state.maxOxygen;
  }

  function addXP(amount) {
    state.xp += amount;
    const needed = state.level * 100;
    if (state.xp >= needed) {
      state.xp -= needed;
      state.level++;
      state.maxHp += 10;
      state.hp = state.maxHp;
      UI.toast(`Level up! Now level ${state.level}`, 'success');
    }
  }

  function getMiningProgress() { return miningTarget; }
  function getMouseWorldPos(cam) {
    return {
      wx: Math.floor((mouseX + cam.x) / T),
      wy: Math.floor((mouseY + cam.y) / T),
    };
  }

  return { state, initInput, update, spawnAt, addXP, getMiningProgress, getMouseWorldPos };
})();
