#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include <WebServer.h>

// ===== CONFIGURACIÓN Wi-Fi =====
const char *WIFI_SSID = "Totalplay-2DA7";
const char *WIFI_PASS = "2DA77778dBDq8Zc2";

// ===== SUPABASE =====
const char *SUPABASE_URL = "https://zgodzbybnfusfwxkjmuw.supabase.co/rest/v1/";
const char *SUPABASE_APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2R6YnlibmZ1c2Z3eGtqbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjgyMDIsImV4cCI6MjA3NDg0NDIwMn0.13M6pLC95UqEup2Ct6A5qYyIGp53YHaYnIoJzp0rNZo";
const char *DEVICE_ID = "8a656766-c4f8-4ff9-b362-9418fb794969";
const char *DEVICE_KEY = "esp-ale";

// ===== SENSORES =====
#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 32

#define LED_PIN 2
#define RELAY_PIN 25  // Pin para el relay

int SECO_RAW = 3200;
int HUMEDO_RAW = 1300;

DHT dht(DHTPIN, DHTTYPE);

// ===== SERVIDOR WEB =====
WebServer server(80);

// ===== VARIABLES GLOBALES =====
unsigned long lastSendTime = 0;
unsigned long lastBufferCheck = 0;
unsigned long relayOffTime = 0;
const unsigned long SEND_INTERVAL = 15000; // 15 segundos
const unsigned long BUFFER_CHECK_INTERVAL = 30000; // 30 segundos
const unsigned long RELAY_ON_TIME = 5000; // 5 segundos
bool hasPendingData = false;
bool relayActive = false;

// ===== FUNCIONES =====
int soilPct(int raw)
{
  if (HUMEDO_RAW > SECO_RAW)
  {
    int t = HUMEDO_RAW;
    HUMEDO_RAW = SECO_RAW;
    SECO_RAW = t;
  }
  raw = constrain(raw, HUMEDO_RAW, SECO_RAW);
  return map(raw, SECO_RAW, HUMEDO_RAW, 0, 100);
}

float calculateSimulatedPH(float temperature, float humidity, int soilMoisture)
{
  float basePH = 7.0;
  
  if (temperature > 30.0) basePH -= 0.3;
  else if (temperature < 15.0) basePH += 0.2;
  
  if (humidity > 80.0) basePH -= 0.2;
  else if (humidity < 30.0) basePH += 0.1;
  
  if (soilMoisture > 80) basePH -= 0.4;
  else if (soilMoisture < 20) basePH += 0.3;
  
  return constrain(basePH, 5.5, 8.5);
}

bool wifiConnected()
{
  return WiFi.status() == WL_CONNECTED;
}

void connectWiFi()
{
  if (wifiConnected())
    return;
  Serial.print("🔌 Conectando WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000)
  {
    delay(500);
    Serial.print(".");
  }
  if (wifiConnected()) {
    Serial.println("✅ Conectado");
    Serial.print("📡 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("❌ Falló conexión");
  }
}

// ===== FUNCIÓN PARA GUARDAR IP EN SUPABASE =====
bool saveIPToSupabase(const String &ip) {
  if (WiFi.status() != WL_CONNECTED)
    return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(SUPABASE_URL) + "esp32_ips";

  if (!http.begin(client, url)) {
    Serial.println("❌ begin() falló para guardar IP");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_APIKEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);
  http.addHeader("Prefer", "return=minimal");

  // Crear JSON con la IP
  String body = "{";
  body += "\"dispositivo_id\":\"" + String(DEVICE_ID) + "\",";
  body += "\"ip_address\":\"" + ip + "\"";
  body += "}";

  Serial.print("💾 Guardando IP en Supabase: ");
  Serial.println(ip);
  Serial.print("Body: ");
  Serial.println(body);

  int code = http.POST(body);
  String payload = http.getString();
  http.end();

  Serial.print("📡 IP guardada - HTTP code: ");
  Serial.println(code);
  
  if (code >= 200 && code < 300) {
    Serial.println("✅ IP guardada correctamente en Supabase");
    return true;
  } else {
    Serial.println("❌ Error guardando IP en Supabase");
    return false;
  }
}

bool postToSupabase(const String &body, const String &table = "telemetria")
{
  if (WiFi.status() != WL_CONNECTED)
    return false;

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(SUPABASE_URL) + table;

  if (!http.begin(client, url))
  {
    Serial.println("begin() falló");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_APIKEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);
  http.addHeader("Prefer", "return=minimal");

  int code = http.POST(body);
  String payload = http.getString();
  http.end();

  Serial.print("HTTP code: ");
  Serial.println(code);
  
  return (code >= 200 && code < 300);
}

void saveToBuffer(const String &line)
{
  File f = SPIFFS.open("/buffer.jsonl", FILE_APPEND);
  if (!f)
  {
    Serial.println("❌ Error abriendo buffer para escritura");
    return;
  }
  f.println(line);
  f.close();
  hasPendingData = true;
  Serial.println("💾 Guardado en buffer");
}

bool bufferExists()
{
  return SPIFFS.exists("/buffer.jsonl");
}

void flushBuffer()
{
  if (!wifiConnected() || !bufferExists())
    return;
    
  File f = SPIFFS.open("/buffer.jsonl", FILE_READ);
  if (!f || f.size() == 0)
  {
    if (f) f.close();
    SPIFFS.remove("/buffer.jsonl");
    hasPendingData = false;
    return;
  }

  Serial.println("🔄 Enviando datos pendientes...");
  std::vector<String> pending;
  while (f.available())
  {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0)
      continue;
    if (!postToSupabase(line, "telemetria"))
      pending.push_back(line);
    delay(500);
  }
  f.close();

  SPIFFS.remove("/buffer.jsonl");
  
  if (!pending.empty())
  {
    File wf = SPIFFS.open("/buffer.jsonl", FILE_WRITE);
    for (auto &ln : pending)
      wf.println(ln);
    wf.close();
    hasPendingData = true;
    Serial.print("📦 Quedan ");
    Serial.print(pending.size());
    Serial.println(" registros pendientes");
  }
  else
  {
    hasPendingData = false;
    Serial.println("✅ Buffer vaciado completamente");
  }
}

void activateRelay() {
  digitalWrite(RELAY_PIN, LOW);   // LOW para activar (lógica inversa)
  relayActive = true;
  relayOffTime = millis() + RELAY_ON_TIME;
  Serial.println("🔌 RELAY ACTIVADO por 5 segundos");
}

void deactivateRelay() {
  digitalWrite(RELAY_PIN, HIGH);  // HIGH para desactivar (lógica inversa)
  relayActive = false;
  Serial.println("🔌 RELAY DESACTIVADO");
}

void checkRelayTimer() {
  if (relayActive && millis() >= relayOffTime) {
    deactivateRelay();
  }
}

void checkSerialCommand() {
  if (Serial.available() > 0) {
    char command = Serial.read();
    
    // Limpiar buffer serial
    while (Serial.available() > 0) {
      Serial.read();
    }
    
    if (command == 'b' || command == 'B') {
      activateRelay();
    }
  }
}

// ===== ENDPOINTS DEL SERVIDOR WEB =====
void handleWater() {
  Serial.println("💧 Comando de riego recibido via HTTP");
  
  // Configurar CORS para permitir requests desde cualquier origen
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Activar el relay
  activateRelay();
  
  // Responder con JSON
  String response = "{\"status\":\"success\",\"message\":\"Relay activado por 5 segundos\"}";
  server.send(200, "application/json", response);
}

void handleOptions() {
  // Manejar preflight requests CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void handleStatus() {
  // Obtener datos de sensores actuales
  int rawSoil = analogRead(SOIL_PIN);
  int humedadSuelo = soilPct(rawSoil);
  float humAmb = dht.readHumidity();
  float temp = dht.readTemperature();
  
  if (isnan(humAmb) || isnan(temp)) {
    humAmb = 0;
    temp = 0;
  }
  
  float simulatedPH = calculateSimulatedPH(temp, humAmb, humedadSuelo);
  
  // Configurar CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Crear JSON de respuesta
  String response = "{";
  response += "\"status\":\"online\",";
  response += "\"relay_active\":" + String(relayActive ? "true" : "false") + ",";
  response += "\"soil_humidity\":" + String(humedadSuelo) + ",";
  response += "\"temperature\":" + String(temp) + ",";
  response += "\"humidity\":" + String(humAmb) + ",";
  response += "\"ph\":" + String(simulatedPH);
  response += "}";
  
  server.send(200, "application/json", response);
}

void handleRoot() {
  String html = "<html><head><title>ESP32 Smart Plant</title>";
  html += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
  html += "<style>body{font-family:Arial,sans-serif;margin:40px;text-align:center;}";
  html += "button{padding:10px 20px;font-size:16px;margin:10px;background:#4CAF50;color:white;border:none;border-radius:5px;cursor:pointer;}";
  html += "button:hover{background:#45a049;}";
  html += ".status{background:#f0f0f0;padding:20px;border-radius:10px;margin:20px auto;max-width:400px;}";
  html += "</style></head><body>";
  html += "<h1>🌱 ESP32 Smart Plant Controller</h1>";
  html += "<div class=\"status\">";
  html += "<p><strong>Status:</strong> Online</p>";
  html += "<p><strong>WiFi:</strong> " + String(WiFi.SSID()) + "</p>";
  html += "<p><strong>IP:</strong> " + WiFi.localIP().toString() + "</p>";
  html += "<p><strong>Señal:</strong> " + String(WiFi.RSSI()) + " dBm</p>";
  html += "<p><strong>Relay:</strong> " + String(relayActive ? "🔌 ACTIVO" : "⚪ INACTIVO") + "</p>";
  html += "</div>";
  html += "<button onclick=\"waterPlant()\">💧 Regar Planta</button>";
  html += "<button onclick=\"getStatus()\">🔄 Actualizar Estado</button>";
  html += "<br><br>";
  html += "<div id=\"status\"></div>";
  html += "<script>";
  html += "function waterPlant() {";
  html += "  document.getElementById('status').innerHTML = '<p>⏳ Enviando comando...</p>';";
  html += "  fetch('/water', {method: 'POST'})";
  html += "    .then(r => r.json())";
  html += "    .then(data => {";
  html += "      document.getElementById('status').innerHTML = '<p>✅ ' + data.message + '</p>';";
  html += "    })";
  html += "    .catch(err => {";
  html += "      document.getElementById('status').innerHTML = '<p>❌ Error: ' + err + '</p>';";
  html += "    });";
  html += "}";
  html += "function getStatus() {";
  html += "  fetch('/status')";
  html += "    .then(r => r.json())";
  html += "    .then(data => {";
  html += "      document.getElementById('status').innerHTML = ";
  html += "        '<p>🌡️ Temp: ' + data.temperature + '°C</p>' +";
  html += "        '<p>💧 Humedad Suelo: ' + data.soil_humidity + '%</p>' +";
  html += "        '<p>💦 Humedad Ambiental: ' + data.humidity + '%</p>' +";
  html += "        '<p>🧪 pH: ' + data.ph + '</p>' +";
  html += "        '<p>🔌 Relay: ' + (data.relay_active ? 'ACTIVO' : 'INACTIVO') + '</p>';";
  html += "    })";
  html += "    .catch(err => {";
  html += "      document.getElementById('status').innerHTML = '<p>❌ Error: ' + err + '</p>';";
  html += "    });";
  html += "}";
  html += "</script>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void setupWebServer() {
  server.on("/", handleRoot);
  server.on("/water", HTTP_POST, handleWater);
  server.on("/status", handleStatus);
  server.on("/water", HTTP_OPTIONS, handleOptions); // Para CORS preflight
  server.on("/status", HTTP_OPTIONS, handleOptions); // Para CORS preflight
  
  server.begin();
  Serial.println("✅ Servidor HTTP iniciado");
  Serial.print("🌐 URL: http://");
  Serial.println(WiFi.localIP());
}

void cleanSPIFFS()
{
  Serial.println("🧹 Limpiando archivos de SPIFFS...");
  
  if (SPIFFS.exists("/buffer.jsonl")) {
    SPIFFS.remove("/buffer.jsonl");
    Serial.println("✅ buffer.jsonl eliminado");
  }
  
  if (SPIFFS.exists("/sequence.txt")) {
    SPIFFS.remove("/sequence.txt");
    Serial.println("✅ sequence.txt eliminado");
  }
  
  Serial.println("✅ Limpieza completada");
}

void setup()
{
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🚀 Iniciando ESP32 Smart Plant...");
  
  // Configurar pines
  pinMode(LED_PIN, OUTPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(RELAY_PIN, HIGH);  // Relay desactivado al inicio

  // Iniciar SPIFFS
  SPIFFS.begin(true);
  
  // Conectar WiFi
  connectWiFi();

  // Iniciar sensores
  dht.begin();
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);

  // Guardar IP en Supabase y iniciar servidor web si WiFi está conectado
  if (wifiConnected()) {
    digitalWrite(LED_PIN, HIGH);
    
    // Guardar IP en Supabase
    String ip = WiFi.localIP().toString();
    saveIPToSupabase(ip);
    
    // Iniciar servidor web
    setupWebServer();
  }

  Serial.println("💡 Sistema listo - Presiona 'b' para activar relay");
  Serial.println("🌐 Servidor web disponible en la IP mostrada arriba");
}

void loop()
{
  unsigned long currentTime = millis();
  
  // 1. Manejar peticiones web
  server.handleClient();
  
  // 2. Verificar comandos seriales
  checkSerialCommand();
  
  // 3. Verificar timer del relay
  checkRelayTimer();
  
  // 4. Envío de datos de sensores (cada 15 segundos)
  if (currentTime - lastSendTime >= SEND_INTERVAL)
  {
    lastSendTime = currentTime;
    
    // Leer sensores
    int rawSoil = analogRead(SOIL_PIN);
    int humedadSuelo = soilPct(rawSoil);
    float humAmb = dht.readHumidity();
    float temp = dht.readTemperature();
    
    if (isnan(humAmb) || isnan(temp)) {
      Serial.println("❌ Error leyendo sensor DHT");
      humAmb = 0;
      temp = 0;
    }
    
    float simulatedPH = calculateSimulatedPH(temp, humAmb, humedadSuelo);

    // Construir JSON
    StaticJsonDocument<512> doc;
    doc["dispositivo_id"] = DEVICE_ID;
    doc["intensidad_wifi"] = wifiConnected() ? WiFi.RSSI() : 0;
    doc["bateria"] = 100;
    doc["version_firmware"] = "v1.0.0";
    doc["tiempo_activo_seg"] = currentTime / 1000;
    doc["humedad_suelo"] = humedadSuelo;
    doc["ph"] = simulatedPH;

    JsonObject datos = doc.createNestedObject("datos_crudos");
    datos["temp_c"] = temp;
    datos["hum_amb"] = humAmb;
    datos["raw_soil"] = rawSoil;
    datos["DEVICE_KEY"] = DEVICE_KEY;

    String body;
    serializeJson(doc, body);

    bool success = false;
    if (wifiConnected())
    {
      success = postToSupabase(body, "telemetria");
    }

    if (success)
    {
      Serial.println("✅ Datos enviados exitosamente");
    }
    else
    {
      saveToBuffer(body);
      Serial.println("❌ Falló el envío, guardado en buffer");
    }

    // Mostrar datos en consola
    Serial.println("=== DATOS SENSORES ===");
    Serial.print("Temperatura: "); Serial.print(temp); Serial.println("°C");
    Serial.print("Humedad Ambiental: "); Serial.print(humAmb); Serial.println("%");
    Serial.print("Humedad Suelo: "); Serial.print(humedadSuelo); Serial.println("%");
    Serial.print("pH: "); Serial.println(simulatedPH);
    Serial.print("RAW Suelo: "); Serial.println(rawSoil);
    Serial.print("Relay: "); Serial.println(relayActive ? "ACTIVO" : "INACTIVO");
    Serial.println("======================");
  }

  // 5. Verificar buffer cada 30 segundos
  if (currentTime - lastBufferCheck >= BUFFER_CHECK_INTERVAL || hasPendingData)
  {
    lastBufferCheck = currentTime;
    
    if (!wifiConnected())
      connectWiFi();
      
    if (wifiConnected() && hasPendingData)
    {
      flushBuffer();
    }
  }

  delay(100);
}