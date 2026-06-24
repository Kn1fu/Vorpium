const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- In-memory state ----
const clients = new Map();           // userId -> { ws, username, state, planet, isHosting, allowFriends }
const friendsDB = new Map();         // username -> Set<friendUsername>
const hostedWorlds = new Map();      // username -> { planet, allowFriends, tileChanges, spawnX, spawnY }
let nextId = 1;

function broadcast(msg, excludeUserId) {
  const data = JSON.stringify(msg);
  for (const [uid, client] of clients) {
    if (uid === excludeUserId) continue;
    if (client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

function sendTo(uid, msg) {
  const client = clients.get(uid);
  if (client && client.ws.readyState === 1) {
    client.ws.send(JSON.stringify(msg));
  }
}

function sendToHostedWorld(hostUsername, msg, excludeUserId) {
  for (const [uid, client] of clients) {
    if (uid === excludeUserId) continue;
    if (client.ws.readyState === 1 && client.planet === hostedWorlds.get(hostUsername)?.planet) {
      client.ws.send(JSON.stringify(msg));
    }
  }
}

function broadcastPlayerList() {
  const players = [];
  for (const [uid, client] of clients) {
    if (client.state) {
      players.push({ userId: uid, ...client.state, username: client.username });
    }
  }
  const msg = { type: 'players_update', players };
  for (const [uid, client] of clients) {
    if (client.ws.readyState === 1) {
      client.ws.send(JSON.stringify(msg));
    }
  }
}

function broadcastHostedWorlds() {
  const worlds = [];
  for (const [host, info] of hostedWorlds) {
    worlds.push({ host, planet: info.planet, allowFriends: info.allowFriends, playerCount: 0 });
  }
  for (const [uid, client] of clients) {
    for (const w of worlds) {
      w.playerCount = 0;
      for (const [uid2, c2] of clients) {
        if (c2.planet === w.planet) w.playerCount++;
      }
    }
    sendTo(uid, { type: 'hosted_worlds', worlds });
  }
}

function ensureFriends(username) {
  if (!friendsDB.has(username)) friendsDB.set(username, new Set());
}

function areFriends(a, b) {
  return friendsDB.get(a)?.has(b) && friendsDB.get(b)?.has(a);
}

function findClientByUsername(username) {
  for (const [uid, client] of clients) {
    if (client.username === username) return client;
  }
  return null;
}

function findUserIdByUsername(username) {
  for (const [uid, client] of clients) {
    if (client.username === username) return uid;
  }
  return null;
}

// ---- WebSocket handling ----
wss.on('connection', (ws) => {
  const userId = nextId++;
  const client = { ws, username: null, state: null, planet: 'terra_prime', isHosting: false, allowFriends: false };
  clients.set(userId, client);

  console.log(`[Connect] Client ${userId} connected`);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch(e) { return; }

    switch (msg.type) {

      case 'join':
        client.username = msg.username || `Player${userId}`;
        ensureFriends(client.username);
        const friendList = Array.from(friendsDB.get(client.username));
        const worlds = [];
        for (const [host, info] of hostedWorlds) {
          worlds.push({ host, planet: info.planet, allowFriends: info.allowFriends });
        }
        sendTo(userId, { type: 'join_accepted', userId, friends: friendList, worlds });
        broadcast({ type: 'player_joined', userId, username: client.username }, userId);
        broadcastPlayerList();
        console.log(`[Join] ${client.username} (${userId})`);
        break;

      case 'player_update':
        client.state = {
          x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy,
          facingRight: msg.facingRight,
          hp: msg.hp, maxHp: msg.maxHp,
          oxygen: msg.oxygen, onGround: msg.onGround,
        };
        client.planet = msg.planet || client.planet;
        broadcastPlayerList();
        break;

      case 'tile_update':
        const worldHost = getWorldHostFor(client);
        if (worldHost && hostedWorlds.has(worldHost)) {
          const hw = hostedWorlds.get(worldHost);
          hw.tileChanges.push({ wx: msg.wx, wy: msg.wy, tile: msg.tile });
          sendToHostedWorld(worldHost, { type: 'tile_updated', wx: msg.wx, wy: msg.wy, tile: msg.tile }, userId);
        }
        break;

      case 'host_world':
        if (hostedWorlds.has(client.username)) {
          hostedWorlds.delete(client.username);
        }
        hostedWorlds.set(client.username, {
          planet: msg.planet || 'terra_prime',
          allowFriends: !!msg.allowFriends,
          tileChanges: [],
          spawnX: msg.spawnX || 800,
          spawnY: msg.spawnY || 800,
        });
        client.isHosting = true;
        client.allowFriends = !!msg.allowFriends;
        broadcastHostedWorlds();
        console.log(`[Host] ${client.username} is hosting ${msg.planet}`);
        break;

      case 'unhost_world':
        hostedWorlds.delete(client.username);
        client.isHosting = false;
        broadcastHostedWorlds();
        break;

      case 'join_world':
        const targetHost = findClientByUsername(msg.hostUsername);
        const hw = hostedWorlds.get(msg.hostUsername);
        if (!hw) {
          sendTo(userId, { type: 'error', message: 'That world is no longer available.' });
          return;
        }
        if (!areFriends(client.username, msg.hostUsername)) {
          sendTo(userId, { type: 'error', message: 'You must be friends to join.' });
          return;
        }
        if (!hw.allowFriends) {
          sendTo(userId, { type: 'error', message: 'That world is not accepting friends.' });
          return;
        }
        client.planet = hw.planet;
        sendTo(userId, {
          type: 'world_init',
          planet: hw.planet,
          tileChanges: hw.tileChanges,
          spawnX: hw.spawnX,
          spawnY: hw.spawnY,
        });
        sendTo(userId, { type: 'chat', from: 'System', message: `Joined ${msg.hostUsername}'s world!` });
        broadcastPlayerList();
        break;

      case 'add_friend':
        if (msg.username === client.username) {
          sendTo(userId, { type: 'error', message: 'Cannot add yourself.' });
          return;
        }
        ensureFriends(msg.username);
        if (friendsDB.get(client.username).has(msg.username)) {
          sendTo(userId, { type: 'error', message: 'Already friends!' });
          return;
        }
        const targetId = findUserIdByUsername(msg.username);
        if (targetId) {
          sendTo(targetId, { type: 'friend_request', from: client.username });
        }
        sendTo(userId, { type: 'chat', from: 'System', message: `Friend request sent to ${msg.username}` });
        break;

      case 'accept_friend':
        const requesterId = findUserIdByUsername(msg.username);
        if (!requesterId && !friendsDB.get(client.username)?.has(msg.username)) {
          sendTo(userId, { type: 'error', message: 'User not found or no request.' });
          return;
        }
        ensureFriends(client.username);
        ensureFriends(msg.username);
        friendsDB.get(client.username).add(msg.username);
        friendsDB.get(msg.username).add(client.username);
        const requesterFriends = Array.from(friendsDB.get(msg.username));
        const accepterFriends = Array.from(friendsDB.get(client.username));
        if (requesterId) sendTo(requesterId, { type: 'friend_list', friends: requesterFriends });
        sendTo(userId, { type: 'friend_list', friends: accepterFriends });
        if (requesterId) sendTo(requesterId, { type: 'friend_added', username: client.username });
        break;

      case 'remove_friend':
        ensureFriends(client.username);
        ensureFriends(msg.username);
        friendsDB.get(client.username).delete(msg.username);
        friendsDB.get(msg.username)?.delete(client.username);
        const updatedFriends = Array.from(friendsDB.get(client.username));
        sendTo(userId, { type: 'friend_list', friends: updatedFriends });
        const removedId = findUserIdByUsername(msg.username);
        if (removedId) {
          sendTo(removedId, { type: 'friend_removed', username: client.username });
          const theirFriends = Array.from(friendsDB.get(msg.username));
          sendTo(removedId, { type: 'friend_list', friends: theirFriends });
        }
        break;

      case 'chat':
        broadcast({ type: 'chat', from: client.username, message: msg.message }, userId);
        break;

      case 'ping':
        sendTo(userId, { type: 'pong' });
        break;
    }
  });

  ws.on('close', () => {
    console.log(`[Disconnect] ${client.username || userId}`);
    if (client.isHosting) hostedWorlds.delete(client.username);
    clients.delete(userId);
    broadcast({ type: 'player_left', userId, username: client.username });
    broadcastPlayerList();
    broadcastHostedWorlds();
  });
});

function getWorldHostFor(client) {
  for (const [host, info] of hostedWorlds) {
    if (client.planet === info.planet) return host;
  }
  return null;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Voidbound server running on port ${PORT}`);
});
