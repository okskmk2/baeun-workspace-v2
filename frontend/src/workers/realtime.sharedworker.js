const SOCKET_STATES = {
  CLOSED: 3,
  OPEN: 1,
};

const ports = new Set();
const roomIdsByPort = new Map();
const activeByPort = new Map();
const globalJoinedRoomIds = new Set();

let socket = null;
let reconnectTimerId = null;
let isConnected = false;

const isRealtimeDebugEnabled = () => {
  const debugFlag = String(import.meta.env?.VITE_REALTIME_DEBUG || "").toLowerCase();
  if (["1", "true", "yes", "on"].includes(debugFlag)) return true;
  return Boolean(import.meta.env?.DEV);
};

const logRealtime = (...args) => {
  if (!isRealtimeDebugEnabled()) return;
  console.debug("[realtime-worker]", ...args);
};

const createSocketUrl = () => {
  const protocol = self.location.protocol === "https:" ? "wss" : "ws";
  const port = self.location.hostname.includes("localhost") ? ":8080" : "";
  return `${protocol}://${self.location.hostname}${port}/ws`;
};

const emitToPort = (port, message) => {
  try {
    port.postMessage(message);
  } catch (error) {
    logRealtime("failed to post message", error);
  }
};

const broadcast = (message) => {
  ports.forEach((port) => emitToPort(port, message));
};

const updateConnected = (next) => {
  isConnected = Boolean(next);
  broadcast({ kind: isConnected ? "open" : "close" });
};

const hasAnyActivePort = () => {
  for (const isActive of activeByPort.values()) {
    if (isActive) return true;
  }
  return false;
};

const clearReconnectTimer = () => {
  if (!reconnectTimerId) return;
  clearTimeout(reconnectTimerId);
  reconnectTimerId = null;
};

const recomputeGlobalJoinedRooms = () => {
  globalJoinedRoomIds.clear();

  roomIdsByPort.forEach((roomIds) => {
    roomIds.forEach((roomId) => globalJoinedRoomIds.add(roomId));
  });
};

const closeSocket = () => {
  clearReconnectTimer();
  if (socket) {
    socket.close();
    return;
  }
  if (isConnected) {
    updateConnected(false);
  }
};

const joinAllRooms = () => {
  if (!socket || socket.readyState !== SOCKET_STATES.OPEN) return;
  globalJoinedRoomIds.forEach((roomId) => {
    socket.send(JSON.stringify({ type: "join", channelId: roomId }));
  });
};

const scheduleReconnect = () => {
  if (reconnectTimerId || !hasAnyActivePort()) return;
  reconnectTimerId = setTimeout(() => {
    reconnectTimerId = null;
    connectSocket();
  }, 3000);
};

const connectSocket = () => {
  if (!hasAnyActivePort()) return;

  if (socket && socket.readyState === SOCKET_STATES.OPEN) return;
  if (socket && socket.readyState !== SOCKET_STATES.CLOSED) return;

  logRealtime("connecting", createSocketUrl());
  socket = new WebSocket(createSocketUrl());

  socket.addEventListener("open", () => {
    updateConnected(true);
    clearReconnectTimer();
    joinAllRooms();
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data || "{}");
      broadcast({ kind: "ws_message", payload });
    } catch (error) {
      logRealtime("invalid payload", error);
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    updateConnected(false);
    scheduleReconnect();
  });

  socket.addEventListener("error", (error) => {
    broadcast({ kind: "error", error: String(error?.message || "socket error") });
  });
};

const sendPayload = (payload) => {
  if (!socket || socket.readyState !== SOCKET_STATES.OPEN) return false;
  socket.send(JSON.stringify(payload));
  return true;
};

const activatePort = (port) => {
  activeByPort.set(port, true);
  connectSocket();
};

const deactivatePort = (port) => {
  activeByPort.set(port, false);
  roomIdsByPort.set(port, new Set());
  recomputeGlobalJoinedRooms();

  if (!hasAnyActivePort()) {
    closeSocket();
  }
};

const joinRoom = (port, roomId) => {
  const key = String(roomId || "");
  if (!key) return;

  const roomIds = roomIdsByPort.get(port);
  if (!roomIds || roomIds.has(key)) return;

  roomIds.add(key);
  const wasKnown = globalJoinedRoomIds.has(key);
  globalJoinedRoomIds.add(key);

  if (!wasKnown) {
    sendPayload({ type: "join", channelId: key });
  }
};

const leaveRoom = (port, roomId) => {
  const key = String(roomId || "");
  if (!key) return;

  const roomIds = roomIdsByPort.get(port);
  if (!roomIds || !roomIds.has(key)) return;

  roomIds.delete(key);

  let stillJoined = false;
  roomIdsByPort.forEach((ids) => {
    if (ids.has(key)) {
      stillJoined = true;
    }
  });

  if (!stillJoined) {
    globalJoinedRoomIds.delete(key);
  }
};

const cleanupPort = (port) => {
  ports.delete(port);
  roomIdsByPort.delete(port);
  activeByPort.delete(port);
  recomputeGlobalJoinedRooms();

  if (!hasAnyActivePort()) {
    closeSocket();
  }
};

const handlePortMessage = (port, message) => {
  const command = String(message?.command || "");

  if (command === "connect") {
    activatePort(port);
    return;
  }

  if (command === "disconnect") {
    deactivatePort(port);
    return;
  }

  if (command === "send") {
    sendPayload(message.payload || {});
    return;
  }

  if (command === "join") {
    activatePort(port);
    joinRoom(port, message.roomId);
    return;
  }

  if (command === "leave") {
    leaveRoom(port, message.roomId);
  }
};

self.onconnect = (event) => {
  const port = event.ports?.[0];
  if (!port) return;

  ports.add(port);
  roomIdsByPort.set(port, new Set());
  activeByPort.set(port, false);

  emitToPort(port, { kind: "state", connected: isConnected });

  port.addEventListener("message", (messageEvent) => {
    handlePortMessage(port, messageEvent.data || {});
  });

  port.addEventListener("messageerror", () => {
    cleanupPort(port);
  });

  port.start();
};
