#include <WiFi.h>
#include <WebSocketsClient.h>

const char* ssid     = "Josh";
const char* password = "Jr091207!";
const char* wsHost   = "172.20.10.7"; // Your Node server's local IP
const int   wsPort   = 8080;

WebSocketsClient ws;

void onWsEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("Disconnected");
      break;

    case WStype_CONNECTED:
      Serial.println("Connected to server");
      ws.sendTXT("Hello from ESP32!");
      break;

    case WStype_TEXT:
      Serial.printf("Received: %s\n", payload);
      break;

    case WStype_ERROR:
      Serial.println("WebSocket error");
      break;
  }
}

void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected: " + WiFi.localIP().toString());

  ws.begin(wsHost, wsPort, "/");
  ws.onEvent(onWsEvent);
  ws.setReconnectInterval(5000); // auto-reconnect every 5s if dropped
}

void loop() {
  ws.loop(); // must be called every loop iteration

  // Example: send sensor data every 2 seconds
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 2000) {
    lastSend = millis();
    ws.sendTXT("sensor:42");
  }
}
