// ===== ship.js — Ship upgrades, planet navigation =====

const Ship = (() => {
  const state = {
    name: 'Nomad I',
    hull: 100, maxHull: 100,
    fuel: 40,  maxFuel: 100,
    engineLevel: 0,
    hullLevel: 0,
    shieldLevel: 0,
    crewLevel: 0,
    currentPlanet: 'terra_prime',
  };

  function getUpgradeState() {
    return {
      engine: state.engineLevel,
      hull:   state.hullLevel,
      shields:state.shieldLevel,
      crew:   state.crewLevel,
    };
  }

  function canUpgrade(upgradeId) {
    const upg = SHIP_UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return false;
    const currentLevel = state[upgradeId + 'Level'] || 0;
    if (currentLevel >= upg.maxLevel) return false;
    const cost = upg.costs[currentLevel];
    return Inventory.hasIngredients(cost);
  }

  function doUpgrade(upgradeId) {
    const upg = SHIP_UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return;
    const levelKey = upgradeId + 'Level';
    const currentLevel = state[levelKey] || 0;
    if (currentLevel >= upg.maxLevel) { UI.toast('Already max level!', 'error'); return; }
    if (!canUpgrade(upgradeId)) { UI.toast('Not enough materials!', 'error'); return; }

    const cost = upg.costs[currentLevel];
    for (const c of cost) Inventory.removeItem(c.item, c.count);
    state[levelKey] = currentLevel + 1;

    // Apply upgrade effects
    if (upgradeId === 'hull') {
      state.maxHull += 50;
      state.hull = state.maxHull;
    }

    UI.toast(`${upg.name} upgraded to level ${state[levelKey]}!`, 'success');
    renderShipPanel();
    unlockPlanets();
  }

  function unlockPlanets() {
    for (const planet of PLANETS) {
      if (state.engineLevel >= planet.requiredEngine) {
        planet.unlocked = true;
      }
    }
  }

  function travelTo(planetId) {
    const planet = PLANETS.find(p => p.id === planetId);
    if (!planet) return;
    if (!planet.unlocked) { UI.toast('Engine upgrade required!', 'error'); return; }
    if (planetId === state.currentPlanet) { UI.toast('Already on this planet.', 'info'); return; }

    // Fuel cost
    const fuelCost = planet.distance * 15;
    if (state.fuel < fuelCost) { UI.toast(`Need ${fuelCost} fuel!`, 'error'); return; }
    state.fuel -= fuelCost;
    state.currentPlanet = planetId;

    // Save current world and load new planet
    World.save();
    World.loadPlanet(planetId);
    World.preloadAround(800, 1000, 3);

    // Respawn player near surface of new world
    Player.spawnAt(800, 800);

    const doc = document.getElementById('planet-name');
    if (doc) doc.textContent = `🪐 ${planet.name}`;
    const biomeDoc = document.getElementById('biome-name');
    if (biomeDoc) biomeDoc.textContent = BIOMES[planet.biomes[0]]?.name || '';

    UI.toast(`Arrived at ${planet.name}!`, 'success');
    UI.toggleShip(); // close ship panel
    renderShipPanel();
  }

  function refuel(amount) {
    state.fuel = Math.min(state.maxFuel, state.fuel + amount);
    renderShipPanel();
  }

  // ---- Render ship panel ----
  function renderShipPanel() {
    // Stats
    const hullBar   = document.getElementById('ship-hull-bar');
    const fuelBar   = document.getElementById('ship-fuel-bar');
    const engineBar = document.getElementById('ship-engine-bar');
    if (hullBar)   hullBar.style.width   = (state.hull / state.maxHull * 100) + '%';
    if (fuelBar)   fuelBar.style.width   = (state.fuel / state.maxFuel * 100) + '%';
    if (engineBar) engineBar.style.width = (state.engineLevel / 4 * 100) + '%';

    const nameEl = document.getElementById('ship-name');
    if (nameEl) nameEl.textContent = state.name;

    // Upgrades
    const upgradesEl = document.getElementById('ship-upgrades');
    if (upgradesEl) {
      upgradesEl.innerHTML = '';
      for (const upg of SHIP_UPGRADES) {
        const levelKey = upg.id + 'Level';
        const lvl = state[levelKey] || 0;
        const maxLvl = upg.maxLevel;
        const canDo = canUpgrade(upg.id);
        const cost = lvl < maxLvl ? upg.costs[lvl] : [];

        const div = document.createElement('div');
        div.className = 'upgrade-item';
        div.innerHTML = `
          <div>
            <div class="upgrade-name">${upg.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${upg.desc}</div>
            ${lvl < maxLvl ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Cost: ${cost.map(c => `${c.count}x ${ITEMS[c.item]?.name||c.item}`).join(', ')}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="upgrade-level">Lv ${lvl}/${maxLvl}</span>
            ${lvl < maxLvl
              ? `<button class="upgrade-btn" ${canDo?'':'disabled'} onclick="Ship.doUpgrade('${upg.id}')">Upgrade</button>`
              : `<span style="color:var(--green);font-size:11px">MAX</span>`}
          </div>`;
        upgradesEl.appendChild(div);
      }
    }

    // Planet selector
    const planetEl = document.getElementById('planet-selector');
    if (planetEl) {
      planetEl.innerHTML = '';
      for (const planet of PLANETS) {
        const isCurrent = planet.id === state.currentPlanet;
        const div = document.createElement('div');
        div.className = 'planet-item' + (isCurrent ? ' current' : '') + (!planet.unlocked ? ' locked' : '');
        const fuelNeeded = planet.distance * 15;
        div.innerHTML = `
          <span class="planet-item-name">${planet.icon} ${planet.name}</span>
          <span>
            ${isCurrent ? '<span style="color:var(--green);font-size:11px">HERE</span>'
              : planet.unlocked
                ? `<span class="planet-item-dist">⛽ ${fuelNeeded}</span>`
                : `<span class="planet-item-req">Engine Lv${planet.requiredEngine}+</span>`}
          </span>`;
        if (!isCurrent && planet.unlocked) {
          div.addEventListener('click', () => travelTo(planet.id));
        }
        planetEl.appendChild(div);
      }
    }
  }

  function save() { return { ...state }; }
  function load(data) {
    if (!data) return;
    Object.assign(state, data);
    unlockPlanets();
  }

  return { state, doUpgrade, canUpgrade, travelTo, refuel, renderShipPanel, save, load };
})();
