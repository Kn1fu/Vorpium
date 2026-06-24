const Sprite = (() => {
  let sprites = {};
  let editorMode = false;
  let editorCanvas = null;
  let editorCtx = null;
  let editingId = null;
  let pixelData = null;
  const PIXEL_SIZE = 16;
  const SCALE = 12;
  let palette = ['#000000','#ffffff','#ff4444','#44ff44','#4444ff','#ffff44','#ff44ff','#44ffff',
                 '#888888','#cc8844','#44aaff','#aa44ff','#ffaa44','#88ff88','#ff8888','#8888ff'];

  function loadTemplate(id, emoji, color) {
    if (!sprites[id]) {
      sprites[id] = { type: 'emoji', emoji, color, pixels: null };
    }
  }

  function getRenderData(id) {
    let s = sprites[id];
    if (!s) return { type: 'emoji', emoji: '?', color: '#888', pixels: null };
    if (s.type === 'pixel' && s.pixels) return s;
    return s;
  }

  function drawTile(ctx, id, sx, sy, sz) {
    const data = getRenderData(id);
    if (data.type === 'pixel' && data.pixels) {
      drawPixels(ctx, data.pixels, sx, sy, sz);
    } else if (data.emoji) {
      ctx.font = `${sz}px serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(data.emoji, sx, sy);
    } else {
      ctx.fillStyle = data.color || '#888';
      ctx.fillRect(sx, sy, sz, sz);
    }
  }

  function drawPlayer(ctx, sx, sy, w, h, facingRight, name, isLocal) {
    if (isLocal) {
      ctx.fillStyle = '#3060c0';
      ctx.fillRect(sx, sy + 8, w, h - 8);
      ctx.fillStyle = '#f0c88a';
      ctx.fillRect(sx, sy, w, 10);
      ctx.fillStyle = '#000';
      const eyeX = facingRight ? sx + 8 : sx + 2;
      ctx.fillRect(eyeX, sy + 3, 2, 2);
    } else {
      ctx.fillStyle = '#60b060';
      ctx.fillRect(sx, sy + 8, w, h - 8);
      ctx.fillStyle = '#f0c88a';
      ctx.fillRect(sx, sy, w, 10);
      ctx.fillStyle = '#000';
      ctx.fillRect(facingRight ? sx + 8 : sx + 2, sy + 3, 2, 2);
    }
    ctx.font = '10px Courier New';
    ctx.fillStyle = isLocal ? '#fff' : '#aaffaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name || '', sx + w / 2, sy - 2);
    ctx.textAlign = 'left';
  }

  function drawPixels(ctx, pixels, sx, sy, sz) {
    const ps = sz / PIXEL_SIZE;
    for (let y = 0; y < PIXEL_SIZE; y++) {
      for (let x = 0; x < PIXEL_SIZE; x++) {
        const c = pixels[y * PIXEL_SIZE + x];
        if (c && c !== '#00000000') {
          ctx.fillStyle = c;
          ctx.fillRect(Math.floor(sx + x * ps), Math.floor(sy + y * ps), Math.ceil(ps) + 1, Math.ceil(ps) + 1);
        }
      }
    }
  }

  function registerPixelSprite(id, pixels) {
    sprites[id] = { type: 'pixel', emoji: null, color: null, pixels };
  }

  function exportSprite(id) {
    const s = sprites[id];
    if (!s || !s.pixels) return null;
    return { id, pixels: s.pixels };
  }

  function importSprite(data) {
    if (data && data.id && data.pixels) {
      sprites[data.id] = { type: 'pixel', emoji: null, color: null, pixels: data.pixels };
      return true;
    }
    return false;
  }

  function getPixelData() { return pixelData; }

  function getEditorState() {
    return { editingId, pixelData, palette, editorMode };
  }

  return { loadTemplate, getRenderData, drawTile, drawPlayer, drawPixels, registerPixelSprite,
           exportSprite, importSprite, getPixelData, getEditorState,
           get PIXEL_SIZE() { return PIXEL_SIZE; }, get SCALE() { return SCALE; },
           get palette() { return palette; }, get sprites() { return sprites; } };
})();

const PixelEditor = (() => {
  let canvas = null, ctx = null;
  let pixels = new Array(256).fill('#00000000');
  let selectedColor = '#ffffff';
  let isDrawing = false;

  function init() {
    canvas = document.getElementById('pixel-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    renderPalette();
    renderCanvas();
    canvas.addEventListener('mousedown', (e) => { isDrawing = true; paint(e); });
    canvas.addEventListener('mousemove', (e) => { if (isDrawing) paint(e); });
    canvas.addEventListener('mouseup', () => { isDrawing = false; });
    canvas.addEventListener('mouseleave', () => { isDrawing = false; });
    renderSavedList();
  }

  function paint(e) {
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / 16));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / 16));
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    pixels[y * 16 + x] = selectedColor;
    renderCanvas();
  }

  function renderCanvas() {
    if (!ctx || !canvas) return;
    const sz = canvas.width / 16;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const c = pixels[y * 16 + x];
        ctx.fillStyle = c === '#00000000' ? '#1a1d2e' : c;
        ctx.fillRect(x * sz, y * sz, sz, sz);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath(); ctx.moveTo(i * sz, 0); ctx.lineTo(i * sz, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * sz); ctx.lineTo(canvas.width, i * sz); ctx.stroke();
    }
  }

  function renderPalette() {
    const container = document.getElementById('pixel-palette');
    if (!container) return;
    container.innerHTML = '';
    for (const c of Sprite.palette) {
      const div = document.createElement('div');
      div.style.cssText = `width:28px;height:28px;background:${c};border-radius:3px;cursor:pointer;border:2px solid ${c === selectedColor ? 'var(--accent)' : 'transparent'}`;
      div.addEventListener('click', () => { selectedColor = c; renderPalette(); });
      container.appendChild(div);
    }
  }

  function fill() { const c = selectedColor; for (let i = 0; i < 256; i++) pixels[i] = c; renderCanvas(); }
  function clearPixels() { for (let i = 0; i < 256; i++) pixels[i] = '#00000000'; renderCanvas(); }
  function eyedrop() {
    const last = pixels.find(p => p !== '#00000000');
    if (last) { selectedColor = last; renderPalette(); }
  }

  function saveCurrent() {
    const name = prompt('Name this sprite (e.g. custom_player):');
    if (!name) return;
    Sprite.registerPixelSprite(name, [...pixels]);
    try {
      const all = [];
      for (const [id, s] of Object.entries(Sprite.sprites)) {
        if (s.type === 'pixel') all.push({ id, pixels: s.pixels });
      }
      localStorage.setItem('voidbound_sprites', JSON.stringify(all));
    } catch(e) {}
    renderSavedList();
  }

  function renderSavedList() {
    const container = document.getElementById('saved-sprites-list');
    if (!container) return;
    container.innerHTML = '';
    for (const [id, s] of Object.entries(Sprite.sprites)) {
      if (s.type !== 'pixel') continue;
      const div = document.createElement('div');
      div.className = 'friend-row';
      div.innerHTML = `<span>${id}</span><button class="btn-small btn-danger" onclick="PixelEditor.deleteSprite('${id}')">Del</button>`;
      container.appendChild(div);
    }
  }

  function deleteSprite(id) {
    if (Sprite.sprites[id]) { delete Sprite.sprites[id]; renderSavedList(); }
  }

  function assignToTile() {
    const input = document.getElementById('sprite-assign-id');
    const id = input ? input.value.trim() : '';
    if (!id) return;
    const s = Sprite.sprites[id];
    if (!s || s.type !== 'pixel') { UI.toast('No pixel sprite with that id', 'error'); return; }
    const target = prompt('Assign to which tile/item id? (e.g. stone, grass)');
    if (target && Sprite.sprites[target]) {
      Sprite.sprites[target].pixels = s.pixels;
      Sprite.sprites[target].type = 'pixel';
      UI.toast(`Assigned ${id} to ${target}`, 'success');
    } else if (target) {
      Sprite.registerPixelSprite(target, [...s.pixels]);
      UI.toast(`Created sprite ${target}`, 'success');
    }
  }

  function loadPixels(data) { pixels = data; renderCanvas(); }

  return { init, saveCurrent, fill, clear: clearPixels, eyedrop, assignToTile, deleteSprite, loadPixels };
})();

document.addEventListener('DOMContentLoaded', () => { setTimeout(PixelEditor.init, 100); });
