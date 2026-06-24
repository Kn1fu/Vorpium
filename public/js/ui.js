// ===== ui.js — UI management, toasts, panel toggles =====

const UI = (() => {
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function toggleInventory() {
    const panel = document.getElementById('inventory-panel');
    if (!panel) return;
    const open = panel.style.display !== 'none';
    // Close others
    document.getElementById('crafting-panel').style.display = 'none';
    document.getElementById('ship-panel').style.display = 'none';
    panel.style.display = open ? 'none' : 'flex';
    if (!open) Inventory.renderAll();
  }

  function toggleCrafting() {
    const panel = document.getElementById('crafting-panel');
    if (!panel) return;
    const open = panel.style.display !== 'none';
    document.getElementById('inventory-panel').style.display = 'none';
    document.getElementById('ship-panel').style.display = 'none';
    panel.style.display = open ? 'none' : 'flex';
    if (!open) {
      Crafting.detectNearbyStation();
      Crafting.renderRecipes();
      Crafting.renderDetail();
    }
  }

  function toggleShip() {
    const panel = document.getElementById('ship-panel');
    if (!panel) return;
    const open = panel.style.display !== 'none';
    document.getElementById('inventory-panel').style.display = 'none';
    document.getElementById('crafting-panel').style.display = 'none';
    panel.style.display = open ? 'none' : 'flex';
    if (!open) Ship.renderShipPanel();
  }

  // ---- Toast notifications ----
  function toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2700);
  }

  return { showScreen, toggleInventory, toggleCrafting, toggleShip, toast };
})();
