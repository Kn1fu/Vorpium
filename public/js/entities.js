// ===== entities.js — Mob AI, spawning, combat =====

const Entities = (() => {
  const T = CONFIG.TILE_SIZE;
  let entities = [];
  let spawnTimer = 0;
  let idCounter = 0;

  function spawn(type, wx, wy) {
    const def = ENTITY_TYPES[type];
    if (!def) return;
    entities.push({
      id: idCounter++,
      type,
      x: wx * T,
      y: wy * T,
      vx: 0, vy: 0,
      hp: def.hp,
      onGround: false,
      aggroTimer: 0,
      dir: Math.random() > 0.5 ? 1 : -1,
      wanderTimer: Math.floor(Math.random() * 120),
    });
  }

  function update() {
    const ps = Player.state;

    // Spawning
    spawnTimer++;
    if (spawnTimer > 300 && entities.length < 20) {
      spawnTimer = 0;
      trySpawn();
    }

    // Update each entity
    for (let i = entities.length - 1; i >= 0; i--) {
      const ent = entities[i];
      const def = ENTITY_TYPES[ent.type];
      if (!def) { entities.splice(i, 1); continue; }

      const distToPlayer = Math.hypot(ent.x - ps.x, ent.y - ps.y);

      // Despawn if too far
      if (distToPlayer > window.innerWidth * 2) {
        entities.splice(i, 1); continue;
      }

      // Gravity
      ent.vy += CONFIG.GRAVITY;
      if (ent.vy > CONFIG.TERMINAL_VEL) ent.vy = CONFIG.TERMINAL_VEL;

      // AI movement
      if (distToPlayer < T * 20 && distToPlayer > T * 1.5) {
        // Chase player
        const dx = ps.x - ent.x;
        ent.dir = dx > 0 ? 1 : -1;
        ent.vx = ent.dir * def.speed;
        ent.aggroTimer = 60;
      } else {
        // Wander
        ent.wanderTimer--;
        if (ent.wanderTimer <= 0) {
          ent.dir = Math.random() > 0.5 ? 1 : -1;
          ent.vx = ent.dir * def.speed * 0.5;
          ent.wanderTimer = 60 + Math.floor(Math.random() * 180);
        }
      }

      // Collision
      ent.x += ent.vx;
      resolveEntityX(ent);
      ent.y += ent.vy;
      ent.onGround = false;
      resolveEntityY(ent);

      // Jump if blocked
      if (ent.onGround) {
        const ahead = World.isSolid(Math.floor((ent.x + ent.vx * 2 + 7) / T), Math.floor((ent.y + 14) / T));
        if (ahead) ent.vy = -8;
      }

      // Attack player
      if (distToPlayer < T * 1.5 && !ps.dead) {
        ent.aggroTimer++;
        if (ent.aggroTimer % 60 === 0) {
          const dmg = def.damage;
          ps.hp = Math.max(0, ps.hp - dmg);
          UI.toast(`Hit by ${def.name} for ${dmg} damage!`, 'error');
          // Knockback
          const kbDir = ps.x > ent.x ? 1 : -1;
          ps.vx = kbDir * 6;
          ps.vy = -4;
        }
      }

      // Remove dead entities
      if (ent.hp <= 0) {
        // Drop loot
        for (const drop of (def.drops || [])) {
          if (Math.random() < drop.chance) {
            Inventory.addItem(drop.item, drop.count);
            UI.toast(`${def.name} dropped ${ITEMS[drop.item]?.name}`, 'info');
          }
        }
        // XP
        Player.addXP(def.xp || 1);
        entities.splice(i, 1);
      }
    }
  }

  function resolveEntityX(ent) {
    const ex = ent.x, ey = ent.y;
    if (ent.vx < 0) {
      if (World.isSolid(Math.floor(ex / T), Math.floor((ey + 7) / T)) ||
          World.isSolid(Math.floor(ex / T), Math.floor((ey + 21) / T))) {
        ent.x = (Math.floor(ex / T) + 1) * T;
        ent.vx = 0;
      }
    } else if (ent.vx > 0) {
      if (World.isSolid(Math.floor((ex + 14) / T), Math.floor((ey + 7) / T)) ||
          World.isSolid(Math.floor((ex + 14) / T), Math.floor((ey + 21) / T))) {
        ent.x = Math.floor((ex + 14) / T) * T - 14;
        ent.vx = 0;
      }
    }
  }

  function resolveEntityY(ent) {
    const ex = ent.x, ey = ent.y;
    if (ent.vy < 0) {
      if (World.isSolid(Math.floor((ex + 7) / T), Math.floor(ey / T))) {
        ent.y = (Math.floor(ey / T) + 1) * T;
        ent.vy = 0;
      }
    } else if (ent.vy > 0) {
      if (World.isSolid(Math.floor((ex + 7) / T), Math.floor((ey + 28) / T))) {
        ent.y = Math.floor((ey + 28) / T) * T - 28;
        ent.vy = 0;
        ent.onGround = true;
      }
    }
  }

  function trySpawn() {
    const ps = Player.state;
    const planet = PLANETS.find(p => p.id === World.activePlanet) || PLANETS[0];
    const biome  = BIOMES[planet.biomes[0]] || BIOMES.forest;
    const possibleMobs = biome.mobs || ['slime'];

    // Spawn slightly off screen
    const angle = Math.random() * Math.PI * 2;
    const dist  = 600 + Math.random() * 400;
    const spawnX = Math.floor((ps.x + Math.cos(angle) * dist) / T);
    const spawnY = Math.floor((ps.y + Math.sin(angle) * dist) / T);

    // Find a non-solid spot
    for (let dy = -5; dy <= 5; dy++) {
      if (!World.isSolid(spawnX, spawnY + dy) && World.isSolid(spawnX, spawnY + dy + 1)) {
        const type = possibleMobs[Math.floor(Math.random() * possibleMobs.length)];
        spawn(type, spawnX, spawnY + dy);
        break;
      }
    }
  }

  // Player attacks with weapon
  function playerAttack() {
    const ps  = Player.state;
    const cam = Renderer.getCamera();
    const T   = CONFIG.TILE_SIZE;
    const item = Inventory.getActiveItem();
    if (!item) return;
    const def = ITEMS[item.id];
    if (!def || !def.weapon) return;

    const range = (def.range || 4) * T;
    for (const ent of entities) {
      const dist = Math.hypot(ent.x - ps.x, ent.y - ps.y);
      if (dist < range) {
        ent.hp -= def.damage;
        UI.toast(`Hit ${ENTITY_TYPES[ent.type]?.name} for ${def.damage}!`, 'info');
      }
    }
  }

  function getAll() { return entities; }
  function clear() { entities = []; }

  return { spawn, update, getAll, clear, playerAttack };
})();
