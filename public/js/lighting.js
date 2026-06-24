const Lighting = (() => {
  const T = CONFIG.TILE_SIZE;
  let lightMap = {};
  let ambientLevel = 12;
  let timeOfDay = 0;
  let dayLength = 36000;
  let tempLightCache = {};
  let cacheTimer = 0;

  const TORCH_STRENGTH = 10;
  const LAVA_STRENGTH = 8;
  const PLAYER_LIGHT = 5;
  const PLAYER_RANGE = 6;

  function update() {
    timeOfDay = (timeOfDay + 1) % dayLength;
    const cycle = timeOfDay / dayLength;
    if (cycle < 0.25) ambientLevel = 12 + Math.floor(Math.random() * 2);
    else if (cycle < 0.45) ambientLevel = 14 + Math.floor((cycle - 0.25) / 0.2 * 1);
    else if (cycle < 0.55) ambientLevel = 15;
    else if (cycle < 0.75) ambientLevel = 12 + Math.floor((0.75 - cycle) / 0.2 * 3);
    else ambientLevel = 4;
    cacheTimer++;
    if (cacheTimer > 300) { tempLightCache = {}; cacheTimer = 0; }
  }

  function getAmbient() { return ambientLevel; }

  function getSkyVisible(wx, wy) {
    for (let y = wy - 1; y >= wy - 50; y--) {
      const tile = World.getTile(wx, y);
      if (tile && TILES[tile] && TILES[tile].solid) return false;
      if (tile === 'air' || !tile) continue;
    }
    return true;
  }

  function getLightLevel(wx, wy) {
    const key = `${wx},${wy}`;
    if (tempLightCache[key] != null) return tempLightCache[key];
    let light = ambientLevel * 0.6;
    if (getSkyVisible(wx, wy)) light = Math.max(light, ambientLevel);
    const tile = World.getTile(wx, wy);
    if (tile === 'torch') light = Math.max(light, TORCH_STRENGTH);
    if (tile === 'lava') light = Math.max(light, LAVA_STRENGTH);
    const px = Math.floor(Player.state.x / T + 0.5);
    const py = Math.floor(Player.state.y / T + 0.5);
    const dist = Math.hypot(wx - px, wy - py);
    if (dist < PLAYER_RANGE) light = Math.max(light, PLAYER_LIGHT * (1 - dist / PLAYER_RANGE));
    light = Math.max(1, Math.min(15, Math.floor(light)));
    tempLightCache[key] = light;
    return light;
  }

  function clearCache() { tempLightCache = {}; }

  return { update, getLightLevel, getAmbient, clearCache, get timeOfDay() { return timeOfDay; }, get dayLength() { return dayLength; } };
})();
