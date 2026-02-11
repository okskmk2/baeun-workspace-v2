const roomSockets = new Map();

export const joinRoom = (ws, channelId) => {
  const key = String(channelId);
  if (ws.channelId) {
    const prev = roomSockets.get(ws.channelId);
    if (prev) {
      prev.delete(ws);
      if (prev.size === 0) {
        roomSockets.delete(ws.channelId);
      }
    }
  }
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

export const removeSocket = (ws) => {
  if (!ws.channelId) return;
  const sockets = roomSockets.get(ws.channelId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) {
    roomSockets.delete(ws.channelId);
  }
};
