import { defineStore } from "pinia";

const SOCKET_STATES = {
  CLOSED: 3,
  OPEN: 1,
};

const isRealtimeDebugEnabled = () => {
  if (typeof import.meta === "undefined") return false;
  const debugFlag = String(import.meta.env?.VITE_REALTIME_DEBUG || "").toLowerCase();
  if (["1", "true", "yes", "on"].includes(debugFlag)) return true;
  return Boolean(import.meta.env?.DEV);
};

const logRealtime = (...args) => {
  if (!isRealtimeDebugEnabled()) return;
  console.debug("[realtime]", ...args);
};

export const useRealtimeStore = defineStore("realtime", {
  state: () => ({
    socket: null,
    isConnected: false,
    joinedRoomIds: {},
    reconnectTimerId: null,
    shouldReconnect: false,
    listeners: {
      message: new Set(),
      channelMessage: new Set(),
      feedback: new Set(),
      notification: new Set(),
      task: new Set(),
      assistantProgress: new Set(),
      open: new Set(),
      close: new Set(),
    },
  }),
  actions: {
    _emit(eventName, payload) {
      const set = this.listeners[eventName];
      if (!set) return;
      logRealtime("emit", eventName, {
        listeners: set.size,
      });
      set.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          logRealtime("listener error", eventName, error);
        }
      });
    },

    subscribe(eventName, handler) {
      if (!this.listeners[eventName] || typeof handler !== "function") {
        return () => {};
      }
      this.listeners[eventName].add(handler);
      logRealtime("subscribe", eventName, { total: this.listeners[eventName].size });
      return () => {
        this.listeners[eventName].delete(handler);
        logRealtime("unsubscribe", eventName, { total: this.listeners[eventName].size });
      };
    },

    _createSocketUrl() {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const port = window.location.hostname.includes("localhost") ? ":8080" : "";
      return `${protocol}://${window.location.hostname}${port}/ws`;
    },

    connect() {
      if (typeof window === "undefined") return;

      this.shouldReconnect = true;
      if (this.socket && this.socket.readyState === SOCKET_STATES.OPEN) {
        logRealtime("connect skipped: already open");
        return;
      }

      if (this.socket && this.socket.readyState !== SOCKET_STATES.CLOSED) {
        logRealtime("connect skipped: socket in progress", this.socket.readyState);
        return;
      }

      logRealtime("connecting", this._createSocketUrl());
      const socket = new WebSocket(this._createSocketUrl());
      this.socket = socket;

      socket.addEventListener("open", () => {
        this.isConnected = true;
        logRealtime("connected", { joinedRooms: Object.keys(this.joinedRoomIds) });
        this._emit("open");

        Object.keys(this.joinedRoomIds).forEach((roomId) => {
          this.send({ type: "join", channelId: roomId });
        });
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = String(payload?.type || "");
          if (type === "message") {
            this._emit("message", payload.data);
            return;
          }
          if (type === "channel_message") {
            this._emit("channelMessage", payload.data);
            return;
          }
          if (type === "feedback") {
            this._emit("feedback", payload.data);
            return;
          }
          if (type === "notification") {
            this._emit("notification", payload.data);
            return;
          }
          if (type === "task") {
            this._emit("task", payload.data);
            return;
          }
          if (type === "assistant_progress") {
            this._emit("assistantProgress", payload.data);
          }
        } catch (error) {
          logRealtime("invalid ws payload", error);
        }
      });

      socket.addEventListener("close", () => {
        this.isConnected = false;
        if (this.socket === socket) {
          this.socket = null;
        }
        logRealtime("disconnected", { shouldReconnect: this.shouldReconnect });
        this._emit("close");

        if (!this.shouldReconnect) return;
        this.reconnectTimerId = window.setTimeout(() => {
          logRealtime("reconnecting...");
          this.connect();
        }, 3000);
      });

      socket.addEventListener("error", (error) => {
        logRealtime("socket error", error);
      });
    },

    disconnect() {
      logRealtime("disconnect requested");
      this.shouldReconnect = false;
      if (this.reconnectTimerId) {
        window.clearTimeout(this.reconnectTimerId);
        this.reconnectTimerId = null;
      }

      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      this.isConnected = false;
      this.joinedRoomIds = {};
    },

    send(payload) {
      if (!this.socket || this.socket.readyState !== SOCKET_STATES.OPEN) {
        logRealtime("send skipped: socket not open", payload?.type || "unknown");
        return false;
      }
      logRealtime("send", payload?.type || "unknown", payload);
      this.socket.send(JSON.stringify(payload));
      return true;
    },

    joinRoom(roomId) {
      if (!roomId) return;
      const key = String(roomId);
      this.joinedRoomIds[key] = true;
      logRealtime("join room", key);
      this.connect();
      this.send({ type: "join", channelId: key });
    },

    leaveRoom(roomId) {
      if (!roomId) return;
      const key = String(roomId);
      delete this.joinedRoomIds[key];
      logRealtime("leave room", key);
    },
  },
});
