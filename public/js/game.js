const Game = (() => {
  let isRunning = false;
  let isPaused = false;
  let isMultiplayer = false;
  let animFrameId = null;
  let autosaveTimer = 0;

  function init() {
    const canvas = document.getElementById('gameCanvas');
    const minimapCanvas = document.getElementById('minimap');
    Renderer.init(canvas, minimapCanvas);
    Player.initInput(canvas);
    loadGame();
    UI.showScreen('main-menu');
  }

  function startSinglePlayer() {
    isMultiplayer = false;
    isRunning = true;
    isPaused = false;
    UI.showScreen('game-screen');
    if (!World.load()) {
      World.loadPlanet('terra_prime');
      World.preloadAround(800, 1000, 3);
      Player.spawnAt(800, 800);
      Inventory.giveStarterItems();
    }
    gameLoop();
  }

  function startMultiplayer() {
    const ip = document.getElementById('server-ip').value;
    const username = document.getElementById('player-name').value;
    if (!username.trim()) { UI.toast('Enter a username!', 'error'); return; }
    Network.connect(ip, username, () => {
      isMultiplayer = true;
      isRunning = true;
      isPaused = false;
      Player.state.name = username;
      UI.showScreen('game-screen');
      World.loadPlanet('terra_prime');
      World.preloadAround(800, 1000, 3);
      Player.spawnAt(800, 800);
      document.getElementById('host-world-btn').style.display = 'block';
      gameLoop();
    });
  }

  function gameLoop() {
    if (!isRunning) return;
    if (!isPaused) {
      update();
    }
    render();
    animFrameId = requestAnimationFrame(gameLoop);
  }

  function update() {
    Player.update();
    Entities.update();
    Crafting.detectNearbyStation();
    if (isMultiplayer) Network.sendPlayerUpdate();
    autosaveTimer++;
    if (autosaveTimer > 3600 && !isMultiplayer) {
      autosaveTimer = 0;
      saveGame();
    }
  }

  function render() {
    const entities = Entities.getAll();
    Renderer.drawFrame(entities, Network.getPlayers());
  }

  function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    const el = document.getElementById('pause-overlay');
    if (el) el.style.display = isPaused ? 'flex' : 'none';
  }

  function resume() { isPaused = false; document.getElementById('pause-overlay').style.display = 'none'; }

  function saveGame() {
    try {
      localStorage.setItem('voidbound_inventory', JSON.stringify(Inventory.save()));
      localStorage.setItem('voidbound_ship', JSON.stringify(Ship.save()));
      World.save();
    } catch(e) { console.warn('Save failed:', e); }
  }

  function loadGame() {
    try {
      const inv = localStorage.getItem('voidbound_inventory');
      if (inv) Inventory.load(JSON.parse(inv));
      const ship = localStorage.getItem('voidbound_ship');
      if (ship) Ship.load(JSON.parse(ship));
    } catch(e) {}
  }

  function returnToMenu() {
    isRunning = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (isMultiplayer) Network.disconnect();
    saveGame();
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('inventory-panel').style.display = 'none';
    document.getElementById('crafting-panel').style.display = 'none';
    document.getElementById('ship-panel').style.display = 'none';
    UI.showScreen('main-menu');
  }

  return { init, startSinglePlayer, startMultiplayer, togglePause, resume, returnToMenu, get isRunning(){return isRunning}, get isMultiplayer(){return isMultiplayer} };
})();

window.addEventListener('DOMContentLoaded', Game.init);
