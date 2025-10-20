#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ===== CONFIGURACIÓN Wi-Fi =====
const char *WIFI_SSID = "IZZI-8436";
const char *WIFI_PASS = "9CC8FC608436";

// ===== SUPABASE =====
const char *SUPABASE_URL = "https://supabase.com/dashboard/project/zgodzbybnfusfwxkjmuw";
const char *SUPABASE_APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2R6YnlibmZ1c2Z3eGtqbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjgyMDIsImV4cCI6MjA3NDg0NDIwMn0.13M6pLC95UqEup2Ct6A5qYyIGp53YHaYnIoJzp0rNZo";
const char *DEVICE_ID = "8a656766-c4f8-4ff9-b362-9418fb794969";
const char *DEVICE_KEY = "esp-ale";
const char *TABLE = "telemetria";

// ===== SENSORES =====
#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 34

int SECO_RAW = 3200;
int HUMEDO_RAW = 1300;

DHT dht(DHTPIN, DHTTYPE);

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
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println(wifiConnected() ? "✅ Conectado" : "❌ Falló conexión");
}

bool postToSupabase(const String &body)
{
  if (!wifiConnected())
    return false;
  HTTPClient http;
  // String url = String(SUPABASE_URL) + "/rest/v1/" + TABLE;
  String url = String(SUPABASE_URL) + "/rest/v1/telemetria";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_APIKEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);
  http.addHeader("x-device-key", DEVICE_KEY);
  http.addHeader("Prefer", "return=minimal");

  int code = http.POST(body);
  http.end();
  Serial.printf("📤 POST %d\n", code);
  return (code >= 200 && code < 300);
}

void saveToBuffer(const String &line)
{
  File f = SPIFFS.open("/buffer.jsonl", FILE_APPEND);
  if (!f)
    return;
  f.println(line);
  f.close();
  Serial.println("💾 Guardado en buffer");
}

void flushBuffer()
{
  if (!wifiConnected())
    return;
  File f = SPIFFS.open("/buffer.jsonl", FILE_READ);
  if (!f)
    return;

  Serial.println("🔄 Enviando datos pendientes...");
  std::vector<String> pending;
  while (f.available())
  {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0)
      continue;
    if (!postToSupabase(line))
      pending.push_back(line);
    delay(200);
  }
  f.close();

  SPIFFS.remove("/buffer.jsonl");
  if (!pending.empty())
  {
    File wf = SPIFFS.open("/buffer.jsonl", FILE_WRITE);
    for (auto &ln : pending)
      wf.println(ln);
    wf.close();
  }
}

void setup()
{
  Serial.begin(115200);
  SPIFFS.begin(true);
  dht.begin();
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);

  connectWiFi();
  if (wifiConnected())
    flushBuffer();
}

void loop()
{
  int rawSoil = analogRead(SOIL_PIN);
  int humedadSuelo = soilPct(rawSoil);
  float humAmb = dht.readHumidity();
  float temp = dht.readTemperature();
  int rssi = wifiConnected() ? WiFi.RSSI() : 0;

  // Construir JSON
  StaticJsonDocument<512> doc;
  doc["dispositivo_id"] = DEVICE_ID;
  doc["intensidad_wifi"] = rssi;
  doc["bateria"] = 100; // si no tienes sensor de batería, fija 100
  doc["version_firmware"] = "v1.0.0";
  doc["tiempo_activo_seg"] = millis() / 1000;
  doc["humedad_suelo"] = humedadSuelo;
  doc["ph"] = nullptr;

  /*JsonObject datos = doc.createNestedObject("datos_crudos");
  datos["raw_soil"] = rawSoil;
  datos["hum_amb"] = humAmb;
  datos["temp_c"] = temp;*/
  JsonObject datos = doc.createNestedObject("datos_crudos");
  datos["raw_soil"] = rawSoil;
  datos["hum_amb"] = humAmb;
  datos["temp_c"] = temp;
  datos["device_key"] = DEVICE_KEY;

  String body;
  serializeJson(doc, body);

  if (!postToSupabase(body))
  {
    saveToBuffer(body);
  }

  if (!wifiConnected())
    connectWiFi();
  if (wifiConnected())
    flushBuffer();

  delay(5000);
}
