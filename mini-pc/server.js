const { WebSocketServer } = require("ws");

const PORT = 8765;
const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

const clients = new Set();

wss.on("listening", () => {
  console.log(`[panko] WebSocket server listening on ws://0.0.0.0:${PORT}`);
});

wss.on("connection", (ws, req) => {
  clients.add(ws);
  console.log(`[panko] client connected: ${req.socket.remoteAddress}`);

  ws.on("message", (data) => {
    let cmd;
    try {
      cmd = JSON.parse(data.toString());
    } catch {
      console.warn("[panko] non-JSON message ignored");
      return;
    }

    console.log(`[panko] received: ${cmd.type}`);

    switch (cmd.type) {
      case "PING":
        ws.send(JSON.stringify({ type: "PONG", ts: cmd.ts }));
        break;

      case "DISPATCH":
        // TODO: trigger navigation to roomId, then arm pickup for patientId/medicineId
        console.log(
          `[panko] DISPATCH → patient=${cmd.patientId} medicine=${cmd.medicineId} room=${cmd.roomId}`
        );
        break;

      case "MANUAL_DRIVE":
        // TODO: forward linear/angular velocity to ESP32
        console.log(
          `[panko] MANUAL_DRIVE → linear=${cmd.linear} angular=${cmd.angular}`
        );
        break;

      case "EMERGENCY_STOP":
        // TODO: send stop command to ESP32 immediately
        console.log("[panko] EMERGENCY_STOP");
        break;

      case "EXTEND_STANDBY":
        // TODO: extend the no-face timer
        console.log(`[panko] EXTEND_STANDBY → ${cmd.durationSeconds}s`);
        break;

      case "ABORT_RETURN":
        // TODO: cancel current delivery and return to base
        console.log("[panko] ABORT_RETURN");
        break;

      case "START_MAPPING":
        // TODO: trigger SLAM mapping run
        console.log("[panko] START_MAPPING");
        break;

      case "ENROLL_FACE":
        // TODO: pass imageBase64 to face recognition model, store embedding
        console.log(`[panko] ENROLL_FACE → patient=${cmd.patientId}`);
        break;

      default:
        console.warn(`[panko] unknown command type: ${cmd.type}`);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[panko] client disconnected: ${req.socket.remoteAddress}`);
  });

  ws.on("error", (err) => {
    console.error(`[panko] client error: ${err.message}`);
    clients.delete(ws);
  });
});

// Broadcast a message to all connected app clients.
// Call this from hardware integration code when state/telemetry changes.
function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

module.exports = { broadcast };
