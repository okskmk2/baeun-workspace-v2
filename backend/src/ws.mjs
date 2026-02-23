const roomSockets = new Map();
const userSockets = new Map();
let activeSocketCount = 0;

const markSocketActive = (ws) => {
  if (ws.__counted) return;
  ws.__counted = true;
  activeSocketCount += 1;
};

const removeFromRoom = (ws) => {
  if (!ws.channelId) return;
  const sockets = roomSockets.get(ws.channelId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) {
    roomSockets.delete(ws.channelId);
  }
  ws.channelId = null;
};

const removeFromUser = (ws) => {
  if (!ws.userId) return;
  const key = String(ws.userId);
  const sockets = userSockets.get(key);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) {
    userSockets.delete(key);
  }
  ws.userId = null;
  if (ws.__counted) {
    activeSocketCount = Math.max(0, activeSocketCount - 1);
    ws.__counted = false;
  }
};

export const registerUserSocket = (ws, userId) => {
  const key = String(userId);
  ws.userId = key;
  if (!userSockets.has(key)) {
    userSockets.set(key, new Set());
  }
  userSockets.get(key).add(ws);
  markSocketActive(ws);
};

export const joinRoom = (ws, channelId) => {
  const key = String(channelId);
  removeFromRoom(ws);
  ws.channelId = key;
  if (!roomSockets.has(key)) {
    roomSockets.set(key, new Set());
  }
  roomSockets.get(key).add(ws);
};

export const broadcastToRoom = (channelId, payload) => {
  const sockets = roomSockets.get(String(channelId));
  if (!sockets) return;
  const message = JSON.stringify(payload);
  sockets.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
};

export const broadcastToUser = (userId, payload) => {
  const sockets = userSockets.get(String(userId));
  if (!sockets) return;
  const message = JSON.stringify(payload);
  sockets.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
};

export const broadcastToUsers = (userIds, payload) => {
  const uniqueIds = [...new Set((userIds || []).map((id) => String(id)).filter(Boolean))];
  uniqueIds.forEach((userId) => {
    broadcastToUser(userId, payload);
  });
};

export const removeSocket = (ws) => {
  removeFromRoom(ws);
  removeFromUser(ws);
};

export const getActiveSocketCount = () => activeSocketCount;
