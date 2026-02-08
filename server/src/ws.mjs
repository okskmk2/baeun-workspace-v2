const roomSockets = new Map();

export const joinRoom = (ws, chatroomId) => {
  const key = String(chatroomId);
  if (ws.chatroomId) {
    const prev = roomSockets.get(ws.chatroomId);
    if (prev) {
      prev.delete(ws);
      if (prev.size === 0) {
        roomSockets.delete(ws.chatroomId);
      }
    }
  }
  ws.chatroomId = key;
  if (!roomSockets.has(key)) {
    roomSockets.set(key, new Set());
  }
  roomSockets.get(key).add(ws);
};

export const broadcastToRoom = (chatroomId, payload) => {
  const sockets = roomSockets.get(String(chatroomId));
  if (!sockets) return;
  const message = JSON.stringify(payload);
  sockets.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
};

export const removeSocket = (ws) => {
  if (!ws.chatroomId) return;
  const sockets = roomSockets.get(ws.chatroomId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) {
    roomSockets.delete(ws.chatroomId);
  }
};
