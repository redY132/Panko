import {
  RobotState,
  type FaceEnrolledMessage,
  type RobotCommand,
  type RobotTelemetry,
  type WebSocketConnectionState,
} from "@/types";

/** Mini PC WebSocket. Prefer EXPO_PUBLIC_ROBOT_WS_URL; iPhone hotspot DHCP may assign a new IPv4 after reconnect — check `hostname -I` / `ip -4 addr` on the PC. */
const DEFAULT_WS_URL = process.env.EXPO_PUBLIC_ROBOT_WS_URL;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;

type TelemetryListener = (telemetry: RobotTelemetry) => void;

function parseRobotState(value: unknown): RobotState {
  if (typeof value !== "string") {
    return RobotState.IDLE;
  }
  const values = Object.values(RobotState) as string[];
  if (values.includes(value)) {
    return value as RobotState;
  }
  return RobotState.IDLE;
}

function parseTelemetryPayload(raw: unknown): RobotTelemetry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const pos = obj.position;
  if (!pos || typeof pos !== "object") {
    return null;
  }
  const p = pos as Record<string, unknown>;
  const x = Number(p.x);
  const y = Number(p.y);
  const heading = Number(p.heading ?? 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(heading)) {
    return null;
  }
  const battery = Number(obj.battery ?? 0);
  return {
    position: { x, y, heading },
    battery: Number.isFinite(battery) ? battery : 0,
    currentState: parseRobotState(obj.currentState ?? obj.state),
    currentRoom:
      typeof obj.currentRoom === "string"
        ? obj.currentRoom
        : obj.currentRoom === null
        ? null
        : null,
  };
}

export class RobotWebSocketManager {
  private socket: WebSocket | null = null;
  private url = "";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;
  private connectionState: WebSocketConnectionState = "disconnected";
  private stateListeners = new Set<(s: WebSocketConnectionState) => void>();
  private telemetryListeners = new Set<TelemetryListener>();
  private faceEnrollmentListeners = new Set<
    (msg: FaceEnrolledMessage) => void
  >();
  private rawMessageListeners = new Set<(raw: string) => void>();

  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  subscribeToConnectionState(
    listener: (state: WebSocketConnectionState) => void
  ): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setConnectionState(next: WebSocketConnectionState): void {
    this.connectionState = next;
    this.stateListeners.forEach((l) => {
      try {
        l(next);
      } catch {
        /* listener error ignored */
      }
    });
  }

  connect(url: string = DEFAULT_WS_URL): void {
    if (!url) {
      throw new Error(
        "WebSocket URL missing. Set EXPO_PUBLIC_ROBOT_WS_URL or pass a URL."
      );
    }
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    console.log("[WS] connecting to", url);
    this.manualClose = false;
    this.url = url;
    this.clearReconnectTimer();
    this.openSocket();
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.close(1000, "client disconnect");
      this.socket = null;
    }
    this.setConnectionState("disconnected");
  }

  sendCommand(command: RobotCommand): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }
    this.socket.send(JSON.stringify(command));
  }

  subscribeToTelemetry(callback: TelemetryListener): () => void {
    this.telemetryListeners.add(callback);
    return () => {
      this.telemetryListeners.delete(callback);
    };
  }

  subscribeToFaceEnrollment(
    callback: (msg: FaceEnrolledMessage) => void
  ): () => void {
    this.faceEnrollmentListeners.add(callback);
    return () => {
      this.faceEnrollmentListeners.delete(callback);
    };
  }

  subscribeToRawMessage(callback: (raw: string) => void): () => void {
    this.rawMessageListeners.add(callback);
    return () => {
      this.rawMessageListeners.delete(callback);
    };
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClose || !this.url) {
      return;
    }
    const exp = Math.min(
      MAX_RECONNECT_DELAY_MS,
      INITIAL_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts
    );
    const jitter = Math.floor(Math.random() * 500);
    const delay = exp + jitter;
    this.setConnectionState("reconnecting");
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts += 1;
      this.openSocket();
    }, delay);
  }

  private openSocket(): void {
    if (this.manualClose) {
      return;
    }
    this.setConnectionState("connecting");
    try {
      const ws = new WebSocket(this.url);
      this.socket = ws;

      ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState("connected");
      };

      ws.onmessage = (event) => {
        this.rawMessageListeners.forEach((l) => {
          try {
            l(String(event.data));
          } catch {}
        });
        try {
          const parsed: unknown = JSON.parse(String(event.data));
          if (
            parsed &&
            typeof parsed === "object" &&
            (parsed as { type?: string }).type === "FACE_ENROLLED"
          ) {
            const msg = parsed as FaceEnrolledMessage;
            if (Array.isArray(msg.embedding) && msg.patientId) {
              this.faceEnrollmentListeners.forEach((l) => {
                try {
                  l(msg);
                } catch {
                  /* ignore */
                }
              });
            }
            return;
          }
          if (
            parsed &&
            typeof parsed === "object" &&
            (parsed as { type?: string }).type === "TELEMETRY"
          ) {
            const telemetry = parseTelemetryPayload(
              (parsed as { payload?: unknown }).payload ?? parsed
            );
            if (telemetry) {
              this.telemetryListeners.forEach((l) => {
                try {
                  l(telemetry);
                } catch {
                  /* ignore */
                }
              });
            }
            return;
          }
          const telemetry = parseTelemetryPayload(parsed);
          if (telemetry) {
            this.telemetryListeners.forEach((l) => {
              try {
                l(telemetry);
              } catch {
                /* ignore */
              }
            });
          }
        } catch {
          /* non-json message ignored */
        }
      };

      ws.onerror = () => {
        /* onclose will handle reconnection */
      };

      ws.onclose = () => {
        this.socket = null;
        if (!this.manualClose) {
          this.scheduleReconnect();
        } else {
          this.setConnectionState("disconnected");
        }
      };
    } catch {
      this.setConnectionState("disconnected");
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    }
  }
}

export const robotWebSocket = new RobotWebSocketManager();
