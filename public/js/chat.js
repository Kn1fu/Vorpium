const Chat = (() => {
  let messages = [];
  let isOpen = false;
  let inputEl = null;
  let logEl = null;
  let maxMessages = 100;

  function init() {
    logEl = document.getElementById('chat-log');
    inputEl = document.getElementById('chat-input');
    if (!inputEl) return;
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = inputEl.value.trim();
        if (text) {
          if (Network.connected) {
            Network.sendChat(text);
          } else {
            addMessage('You', text);
          }
        }
        inputEl.value = '';
        close();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        inputEl.value = '';
        close();
        e.preventDefault();
      }
    });
  }

  function toggle() {
    if (isOpen) { close(); return; }
    open();
  }

  function open() {
    if (!inputEl) return;
    isOpen = true;
    inputEl.style.display = 'block';
    inputEl.focus();
  }

  function close() {
    if (!inputEl) return;
    isOpen = false;
    inputEl.style.display = 'none';
    inputEl.blur();
  }

  function addMessage(from, text) {
    messages.push({ from, text, time: Date.now() });
    if (messages.length > maxMessages) messages.shift();
    render();
  }

  function render() {
    if (!logEl) return;
    logEl.innerHTML = '';
    const start = Math.max(0, messages.length - 20);
    for (let i = start; i < messages.length; i++) {
      const m = messages[i];
      const div = document.createElement('div');
      div.className = 'chat-msg';
      if (m.from === 'System') div.className += ' system';
      else if (m.from === Network.username) div.className += ' self';
      div.textContent = `<${m.from}> ${m.text}`;
      logEl.appendChild(div);
    }
    logEl.scrollTop = logEl.scrollHeight;
  }

  return { init, toggle, open, close, addMessage, get isOpen() { return isOpen; } };
})();
