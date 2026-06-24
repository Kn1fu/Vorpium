const Network = (() => {
  let ws = null;
  let connected = false;
  let username = '';
  let userId = null;
  let otherPlayers = {};
  let friends = [];
  let hostedWorlds = [];
  let friendRequests = [];
  let pingInterval = null;

  const UPDATE_INTERVAL = 50;
  let updateTimer = 0;

  function connect(serverIp, name, onConnect) {
    username = name;
    const url = serverIp.includes('://') ? serverIp : `ws://${serverIp}`;
    UI.toast('Connecting...', 'info');
    try {
      ws = new WebSocket(url);
    } catch(e) {
      UI.toast('Connection failed!', 'error');
      return;
    }
    ws.onopen = () => {
      connected = true;
      send({ type: 'join', username, version: '0.1.0' });
      pingInterval = setInterval(() => send({ type: 'ping' }), 30000);
      if (onConnect) onConnect();
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleMessage(msg);
      } catch(err) { console.warn('[Net] Bad message:', e.data); }
    };
    ws.onclose = () => {
      connected = false;
      if (pingInterval) clearInterval(pingInterval);
      UI.toast('Disconnected from server', 'error');
      otherPlayers = {};
    };
    ws.onerror = () => {
      UI.toast('Connection error', 'error');
    };
  }

  function disconnect() {
    if (ws) { ws.close(); ws = null; }
    connected = false;
    if (pingInterval) clearInterval(pingInterval);
    otherPlayers = {};
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'join_accepted':
        userId = msg.userId;
        UI.toast(`Joined server as ${username}`, 'success');
        if (msg.friends) friends = msg.friends;
        if (msg.worlds) hostedWorlds = msg.worlds;
        updateFriendsUI();
        updateWorldsUI();
        break;

      case 'player_joined':
        UI.toast(`${msg.username} joined`, 'info');
        break;

      case 'player_left':
        delete otherPlayers[msg.userId];
        UI.toast(`${msg.username} left`, 'info');
        break;

      case 'players_update':
        for (const p of msg.players) {
          if (p.userId !== userId) {
            otherPlayers[p.userId] = p;
          }
        }
        for (const id of Object.keys(otherPlayers)) {
          if (!msg.players.find(p => p.userId === id)) {
            delete otherPlayers[id];
          }
        }
        break;

      case 'tile_updated':
        World.setTile(msg.wx, msg.wy, msg.tile);
        break;

      case 'world_init':
        World.loadPlanet(msg.planet);
        if (msg.tileChanges) {
          for (const tc of msg.tileChanges) {
            World.setTile(tc.wx, tc.wy, tc.tile);
          }
        }
        if (msg.spawnX != null) Player.spawnAt(msg.spawnX, msg.spawnY);
        UI.toast(`Arrived at ${msg.planet}`, 'info');
        break;

      case 'friend_list':
        friends = msg.friends || [];
        updateFriendsUI();
        updateWorldsUI();
        break;

      case 'friend_request':
        if (!friendRequests.includes(msg.from)) {
          friendRequests.push(msg.from);
          UI.toast(`Friend request from ${msg.from}`, 'info');
          updateFriendsUI();
        }
        break;

      case 'friend_added':
        if (!friends.includes(msg.username)) friends.push(msg.username);
        friendRequests = friendRequests.filter(f => f !== msg.username);
        UI.toast(`${msg.username} accepted your friend request!`, 'success');
        updateFriendsUI();
        break;

      case 'friend_removed':
        friends = friends.filter(f => f !== msg.username);
        UI.toast(`${msg.username} removed from friends`, 'info');
        updateFriendsUI();
        break;

      case 'hosted_worlds':
        hostedWorlds = msg.worlds || [];
        updateWorldsUI();
        break;

      case 'chat':
        Chat.addMessage(msg.from, msg.message);
        break;

      case 'error':
        UI.toast(msg.message, 'error');
        break;
    }
  }

  function sendPlayerUpdate() {
    if (!connected) return;
    updateTimer++;
    if (updateTimer < UPDATE_INTERVAL / 16) return;
    updateTimer = 0;
    const ps = Player.state;
    send({
      type: 'player_update',
      x: ps.x, y: ps.y, vx: ps.vx, vy: ps.vy,
      facingRight: ps.facingRight,
      hp: ps.hp, maxHp: ps.maxHp,
      oxygen: ps.oxygen,
      onGround: ps.onGround,
      planet: World.activePlanet,
    });
  }

  function sendTileUpdate(wx, wy, tile) {
    send({ type: 'tile_update', wx, wy, tile });
  }

  function sendHostWorld(allowFriends) {
    send({ type: 'host_world', planet: World.activePlanet, allowFriends, spawnX: Player.state.x, spawnY: Player.state.y });
    UI.toast(allowFriends ? 'World hosted — friends can join!' : 'World is private', 'info');
  }

  function sendJoinWorld(hostUsername) {
    send({ type: 'join_world', hostUsername });
  }

  function sendAddFriend(friendUsername) {
    send({ type: 'add_friend', username: friendUsername });
  }

  function sendAcceptFriend(friendUsername) {
    send({ type: 'accept_friend', username: friendUsername });
  }

  function sendRemoveFriend(friendUsername) {
    send({ type: 'remove_friend', username: friendUsername });
  }

  function sendChat(message) {
    send({ type: 'chat', message });
  }

  function getPlayers() { return otherPlayers; }

  function updateFriendsUI() {
    const container = document.getElementById('friends-list');
    if (!container) return;
    container.innerHTML = '';
    if (friendRequests.length > 0) {
      const reqHeader = document.createElement('div');
      reqHeader.className = 'section-label';
      reqHeader.textContent = 'Friend Requests';
      container.appendChild(reqHeader);
      for (const req of friendRequests) {
        const row = document.createElement('div');
        row.className = 'friend-row request';
        row.innerHTML = `<span>${req}</span><button class="btn-small" onclick="Network.sendAcceptFriend('${req}')">Accept</button>`;
        container.appendChild(row);
      }
    }
    const friendsHeader = document.createElement('div');
    friendsHeader.className = 'section-label';
    friendsHeader.textContent = 'Friends';
    container.appendChild(friendsHeader);
    if (friends.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'friend-row';
      empty.style.color = 'var(--text-dim)';
      empty.textContent = 'No friends yet. Add some!';
      container.appendChild(empty);
    } else {
      for (const f of friends) {
        const row = document.createElement('div');
        row.className = 'friend-row';
        row.innerHTML = `<span>${f}</span><button class="btn-small btn-danger" onclick="Network.sendRemoveFriend('${f}')">Remove</button>`;
        container.appendChild(row);
      }
    }
  }

  function updateWorldsUI() {
    const container = document.getElementById('worlds-list');
    if (!container) return;
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'section-label';
    header.textContent = 'Friends\' Worlds';
    container.appendChild(header);
    const available = hostedWorlds.filter(w => w.allowFriends && friends.includes(w.host));
    if (available.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'friend-row';
      empty.style.color = 'var(--text-dim)';
      empty.textContent = 'No joinable worlds from friends.';
      container.appendChild(empty);
    } else {
      for (const w of available) {
        const row = document.createElement('div');
        row.className = 'friend-row world-row';
        row.innerHTML = `<span>${w.host}'s world ${w.planet ? '(' + w.planet + ')' : ''}</span><button class="btn-small" onclick="Network.sendJoinWorld('${w.host}')">Join</button>`;
        container.appendChild(row);
      }
    }
  }

  return { connect, disconnect, send, sendPlayerUpdate, sendTileUpdate, sendHostWorld, sendJoinWorld, sendAddFriend, sendAcceptFriend, sendRemoveFriend, sendChat, getPlayers, updateFriendsUI, updateWorldsUI, get connected() { return connected; }, get username() { return username; } };
})();
