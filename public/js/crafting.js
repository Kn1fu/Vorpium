// ===== crafting.js — Recipe filtering, crafting UI =====

const Crafting = (() => {
  let selectedRecipe = null;
  let currentStation = null;  // null = bare hands, 'workbench', 'furnace', 'anvil'

  function setStation(station) {
    currentStation = station;
    const label = document.getElementById('crafting-station');
    if (label) {
      const icons = { workbench:'🪵', furnace:'🔥', anvil:'⚒️', null:'🤲' };
      const names = { workbench:'Workbench', furnace:'Furnace', anvil:'Anvil', null:'Bare Hands' };
      label.textContent = `${icons[station] || '🤲'} ${names[station] || 'Bare Hands'}`;
    }
    renderRecipes();
  }

  function getAvailableRecipes() {
    return RECIPES.filter(r => {
      // Station check: bare hands can also craft workbench recipes if station is open
      if (r.station === null) return true;
      return r.station === currentStation;
    });
  }

  function renderRecipes() {
    const list = document.getElementById('recipe-list');
    if (!list) return;
    list.innerHTML = '';

    const available = getAvailableRecipes();
    if (available.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted);font-size:12px;padding:8px">No recipes at this station.</div>';
      return;
    }

    for (const recipe of available) {
      const canCraft = Inventory.hasIngredients(recipe.ingredients);
      const result = ITEMS[recipe.result.item];
      const div = document.createElement('div');
      div.className = 'recipe-item' + (selectedRecipe === recipe ? ' selected' : '');
      div.innerHTML = `
        <span class="recipe-icon">${result?.icon || '?'}</span>
        <div class="recipe-info">
          <div class="recipe-name">${recipe.name}</div>
          <div class="recipe-yields">→ ${recipe.result.count}x ${result?.name || recipe.result.item}</div>
        </div>
        <span class="${canCraft ? 'recipe-craftable' : 'recipe-uncraftable'}">${canCraft ? '✓' : '✗'}</span>`;
      div.addEventListener('click', () => selectRecipe(recipe));
      list.appendChild(div);
    }
  }

  function selectRecipe(recipe) {
    selectedRecipe = recipe;
    renderRecipes();
    renderDetail();
  }

  function renderDetail() {
    const nameEl = document.getElementById('recipe-name');
    const ingEl  = document.getElementById('recipe-ingredients');
    const btn    = document.getElementById('craft-btn');
    if (!nameEl || !ingEl || !btn) return;

    if (!selectedRecipe) {
      nameEl.textContent = 'Select a recipe';
      ingEl.innerHTML = '';
      btn.disabled = true;
      return;
    }

    const result = ITEMS[selectedRecipe.result.item];
    nameEl.textContent = `${result?.icon || ''} ${selectedRecipe.name}`;
    ingEl.innerHTML = '';

    let allHave = true;
    for (const ing of selectedRecipe.ingredients) {
      const have = Inventory.countItem(ing.item);
      const need = ing.count;
      const def  = ITEMS[ing.item];
      const ok   = have >= need;
      if (!ok) allHave = false;
      const row = document.createElement('div');
      row.className = 'ingredient-row ' + (ok ? 'have' : 'need');
      row.textContent = `${ok ? '✓' : '✗'} ${def?.icon || ''} ${def?.name || ing.item}: ${have}/${need}`;
      ingEl.appendChild(row);
    }

    btn.disabled = !allHave;
  }

  function craftSelected() {
    if (!selectedRecipe) return;
    if (!Inventory.hasIngredients(selectedRecipe.ingredients)) {
      UI.toast('Missing ingredients!', 'error');
      return;
    }

    // Consume ingredients
    for (const ing of selectedRecipe.ingredients) {
      Inventory.removeItem(ing.item, ing.count);
    }

    // Give result
    const result = ITEMS[selectedRecipe.result.item];
    Inventory.addItem(selectedRecipe.result.item, selectedRecipe.result.count);
    UI.toast(`Crafted ${selectedRecipe.result.count}x ${result?.name || selectedRecipe.result.item}!`, 'success');

    // Re-render
    renderDetail();
    renderRecipes();
  }

  // Called when player stands near a station tile
  function detectNearbyStation() {
    const T = CONFIG.TILE_SIZE;
    const px = Math.floor((Player.state.x + Player.state.width / 2) / T);
    const py = Math.floor((Player.state.y + Player.state.height / 2) / T);

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tile = World.getTile(px + dx, py + dy);
        const def  = TILES[tile];
        if (def && def.station && def.station !== currentStation) {
          setStation(def.station);
          return;
        }
      }
    }
    // No station nearby
    if (currentStation !== null) setStation(null);
  }

  return { setStation, renderRecipes, renderDetail, craftSelected, selectRecipe, detectNearbyStation };
})();
