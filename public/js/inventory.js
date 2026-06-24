// ===== inventory.js — Inventory, hotbar, backpack system =====

const Inventory = (() => {
  const MAIN_SLOTS = 20;
  const HOTBAR_SLOTS = 9;

  let mainSlots = new Array(MAIN_SLOTS).fill(null);   // {id, count}
  let hotbar    = new Array(HOTBAR_SLOTS).fill(null);
  let backpackSlots = [];   // grows based on equipped backpack
  let equippedBackpack = null;  // item id string or null
  let equipment = { helmet:null, chest:null, legs:null, accessory1:null, accessory2:null };
  let activeHotbarSlot = 0;

  // ---- Add item to inventory ----
  function addItem(itemId, count = 1) {
    const def = ITEMS[itemId];
    if (!def) return false;
    const maxStack = def.stack || 1;

    // Try to stack into existing slots (hotbar first, then main, then backpack)
    const allSlots = [hotbar, mainSlots, backpackSlots];
    for (const slots of allSlots) {
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] && slots[i].id === itemId && slots[i].count < maxStack) {
          const take = Math.min(count, maxStack - slots[i].count);
          slots[i].count += take;
          count -= take;
          if (count <= 0) { renderAll(); return true; }
        }
      }
    }

    // Place into empty slots
    for (const slots of allSlots) {
      for (let i = 0; i < slots.length; i++) {
        if (!slots[i] && count > 0) {
          const take = Math.min(count, maxStack);
          slots[i] = { id: itemId, count: take };
          count -= take;
          if (count <= 0) { renderAll(); return true; }
        }
      }
    }

    UI.toast(`Inventory full! Dropped ${count}x ${def.name}`, 'error');
    renderAll();
    return false;
  }

  // ---- Remove item ----
  function removeItem(itemId, count = 1) {
    let remaining = count;
    for (const slots of [hotbar, mainSlots, backpackSlots]) {
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] && slots[i].id === itemId) {
          const take = Math.min(remaining, slots[i].count);
          slots[i].count -= take;
          remaining -= take;
          if (slots[i].count <= 0) slots[i] = null;
          if (remaining <= 0) { renderAll(); return true; }
        }
      }
    }
    renderAll();
    return remaining === 0;
  }

  function countItem(itemId) {
    let total = 0;
    for (const slots of [hotbar, mainSlots, backpackSlots]) {
      for (const slot of slots) {
        if (slot && slot.id === itemId) total += slot.count;
      }
    }
    return total;
  }

  function hasIngredients(ingredients) {
    return ingredients.every(ing => countItem(ing.item) >= ing.count);
  }

  // ---- Hotbar ----
  function setActiveSlot(idx) {
    if (idx < 0 || idx >= HOTBAR_SLOTS) return;
    activeHotbarSlot = idx;
    renderHotbar();
  }

  function getActiveItem() { return hotbar[activeHotbarSlot]; }
  function getActiveTool() {
    const item = getActiveItem();
    return item ? item.id : null;
  }

  function consumeActive(count) {
    const slot = hotbar[activeHotbarSlot];
    if (!slot) return;
    slot.count -= count;
    if (slot.count <= 0) hotbar[activeHotbarSlot] = null;
    renderHotbar();
  }

  // ---- Backpack equip ----
  function equipBackpack(itemId) {
    if (!ITEMS[itemId] || !ITEMS[itemId].backpack) return;
    // Un-equip previous
    if (equippedBackpack) {
      unequipBackpack();
    }
    // Move extra items to main if downsizing
    const newSlots = ITEMS[itemId].extraSlots;
    equippedBackpack = itemId;
    backpackSlots = new Array(newSlots).fill(null);
    UI.toast(`Equipped ${ITEMS[itemId].name} (+${newSlots} slots)`, 'success');
    renderAll();
  }

  function unequipBackpack() {
    if (!equippedBackpack) return;
    // Move backpack items to main inventory
    for (const slot of backpackSlots) {
      if (slot) addItem(slot.id, slot.count);
    }
    backpackSlots = [];
    equippedBackpack = null;
    renderAll();
  }

  function dropToBackpack(event) {
    // DnD placeholder — full drag-and-drop via data transfer
    const itemId = event.dataTransfer.getData('itemId');
    if (itemId && ITEMS[itemId] && ITEMS[itemId].backpack) {
      removeItem(itemId, 1);
      equipBackpack(itemId);
    }
  }

  // ---- Render inventory UI ----
  function renderAll() {
    renderHotbar();
    renderMainGrid();
    renderBackpackGrid();
    renderEquipSlots();
  }

  function renderHotbar() {
    const container = document.getElementById('hotbar-slots');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const slot = hotbar[i];
      const div = document.createElement('div');
      div.className = 'hotbar-slot' + (i === activeHotbarSlot ? ' active' : '');
      div.innerHTML = `<span class="slot-key">${i+1}</span>`;
      if (slot) {
        const def = ITEMS[slot.id];
        div.innerHTML += `<span class="item-icon">${def?.icon || '?'}</span>`;
        if (def?.stack > 1) div.innerHTML += `<span class="item-count">${slot.count}</span>`;
      }
      div.addEventListener('click', () => setActiveSlot(i));
      div.addEventListener('dragover', e => e.preventDefault());
      div.addEventListener('drop', e => handleSlotDrop(e, 'hotbar', i));
      container.appendChild(div);
    }
  }

  function makeSlotEl(slot, slotType, idx) {
    const div = document.createElement('div');
    div.className = 'inv-slot' + (slot ? ' has-item' : '');
    div.draggable = !!slot;

    if (slot) {
      const def = ITEMS[slot.id];
      const rarity = def?.rarity || 'common';
      div.innerHTML = `
        <span class="item-icon">${def?.icon || '?'}</span>
        ${def?.stack > 1 ? `<span class="item-count">${slot.count}</span>` : ''}
        <div class="item-tooltip rarity-${rarity}">
          <strong>${def?.name || slot.id}</strong>
          ${def?.desc ? `<br><span style="color:var(--text-muted)">${def.desc}</span>` : ''}
          ${def?.damage ? `<br>⚔️ DMG: ${def.damage}` : ''}
          ${def?.power  ? `<br>⛏️ Power: ${def.power}` : ''}
          ${def?.def    ? `<br>🛡️ DEF: ${def.def}` : ''}
          ${def?.extraSlots ? `<br>🎒 +${def.extraSlots} slots` : ''}
        </div>`;

      div.addEventListener('dragstart', e => {
        e.dataTransfer.setData('slotType', slotType);
        e.dataTransfer.setData('slotIdx', idx);
        e.dataTransfer.setData('itemId', slot.id);
      });

      // Double-click to use/equip
      div.addEventListener('dblclick', () => useItem(slot.id, slotType, idx));
    }

    div.addEventListener('dragover', e => e.preventDefault());
    div.addEventListener('drop', e => handleSlotDrop(e, slotType, idx));
    return div;
  }

  function useItem(itemId, slotType, idx) {
    const def = ITEMS[itemId];
    if (!def) return;

    if (def.backpack) {
      removeItem(itemId, 1);
      equipBackpack(itemId);
      return;
    }
    if (def.armor) {
      const slot = def.armor;
      const prev = equipment[slot];
      equipment[slot] = itemId;
      removeItem(itemId, 1);
      if (prev) addItem(prev, 1);
      UI.toast(`Equipped ${def.name}`, 'success');
      renderAll();
      return;
    }
    if (def.use === 'heal') {
      if (Player.state.hp >= Player.state.maxHp) { UI.toast('Already at full HP', 'error'); return; }
      Player.state.hp = Math.min(Player.state.maxHp, Player.state.hp + def.healAmt);
      removeItem(itemId, 1);
      UI.toast(`Healed ${def.healAmt} HP`, 'success');
      return;
    }
    if (def.use === 'oxygen') {
      Player.state.oxygen = Math.min(Player.state.maxOxygen, Player.state.oxygen + def.oxygenAmt);
      removeItem(itemId, 1);
      UI.toast(`+${def.oxygenAmt} O₂`, 'success');
      return;
    }
    // Otherwise move to hotbar
    const emptyHot = hotbar.findIndex(s => !s);
    if (emptyHot !== -1) {
      hotbar[emptyHot] = { id: itemId, count: 1 };
      removeItem(itemId, 1);
      renderAll();
    }
  }

  function handleSlotDrop(e, targetType, targetIdx) {
    const srcType = e.dataTransfer.getData('slotType');
    const srcIdx  = parseInt(e.dataTransfer.getData('slotIdx'));
    if (!srcType) return;

    const srcArr = getSlotArray(srcType);
    const tgtArr = getSlotArray(targetType);
    if (!srcArr || !tgtArr) return;

    // Swap slots
    const tmp = tgtArr[targetIdx];
    tgtArr[targetIdx] = srcArr[srcIdx];
    srcArr[srcIdx] = tmp;
    renderAll();
  }

  function getSlotArray(type) {
    if (type === 'hotbar') return hotbar;
    if (type === 'main') return mainSlots;
    if (type === 'backpack') return backpackSlots;
    return null;
  }

  function renderMainGrid() {
    const grid = document.getElementById('main-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 0; i < MAIN_SLOTS; i++) {
      grid.appendChild(makeSlotEl(mainSlots[i], 'main', i));
    }
  }

  function renderBackpackGrid() {
    const section = document.getElementById('backpack-section');
    const grid = document.getElementById('backpack-grid');
    const nameEl = document.getElementById('backpack-name');
    if (!grid || !nameEl) return;

    if (equippedBackpack) {
      const def = ITEMS[equippedBackpack];
      nameEl.textContent = `${def.icon} ${def.name} (+${def.extraSlots} slots)`;
      grid.style.display = 'grid';
      grid.innerHTML = '';
      for (let i = 0; i < backpackSlots.length; i++) {
        grid.appendChild(makeSlotEl(backpackSlots[i], 'backpack', i));
      }
    } else {
      nameEl.textContent = 'No Backpack — drag one here';
      grid.style.display = 'none';
      grid.innerHTML = '';
    }
  }

  function renderEquipSlots() {
    const container = document.getElementById('equip-slots');
    if (!container) return;
    container.querySelectorAll('.equip-slot[data-slot]').forEach(el => {
      const slot = el.dataset.slot;
      const itemId = equipment[slot];
      if (itemId) {
        const def = ITEMS[itemId];
        el.textContent = def?.icon || '?';
        el.title = def?.name || itemId;
      } else {
        el.textContent = { helmet:'🪖', chest:'🥼', legs:'👖', accessory1:'💎', accessory2:'💎' }[slot] || '?';
      }
      el.addEventListener('click', () => {
        if (itemId) {
          addItem(itemId, 1);
          equipment[slot] = null;
          renderAll();
        }
      });
    });
  }

  // ---- Save/Load ----
  function save() {
    return { mainSlots, hotbar, backpackSlots, equippedBackpack, equipment, activeHotbarSlot };
  }
  function load(data) {
    if (!data) return;
    mainSlots = data.mainSlots || new Array(MAIN_SLOTS).fill(null);
    hotbar    = data.hotbar    || new Array(HOTBAR_SLOTS).fill(null);
    backpackSlots = data.backpackSlots || [];
    equippedBackpack = data.equippedBackpack || null;
    equipment = data.equipment || { helmet:null, chest:null, legs:null, accessory1:null, accessory2:null };
    activeHotbarSlot = data.activeHotbarSlot || 0;
    renderAll();
  }

  // Starter items for new game
  function giveStarterItems() {
    addItem('wood_pick', 1);
    addItem('wood_axe', 1);
    addItem('torch', 8);
    addItem('bandage', 3);
    addItem('wood_plank', 20);
  }

  return { addItem, removeItem, countItem, hasIngredients, setActiveSlot, getActiveItem, getActiveTool,
           consumeActive, equipBackpack, unequipBackpack, dropToBackpack, renderAll, save, load, giveStarterItems };
})();
