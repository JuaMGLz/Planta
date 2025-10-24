#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include "DHT.h"

// ===== CONFIGURACIÓN Wi-Fi =====
const char *WIFI_SSID = "Totalplay-2DA7";
const char *WIFI_PASS = "2DA77778dBDq8Zc2";

// ===== SUPABASE =====
const char *SUPABASE_URL = "https://zgodzbybnfusfwxkjmuw.supabase.co/rest/v1/telemetria";
const char *SUPABASE_APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2R6YnlibmZ1c2Z3eGtqbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjgyMDIsImV4cCI6MjA3NDg0NDIwMn0.13M6pLC95UqEup2Ct6A5qYyIGp53YHaYnIoJzp0rNZo";
const char *DEVICE_ID = "8a656766-c4f8-4ff9-b362-9418fb794969";
const char *DEVICE_KEY = "esp-ale";
const char *TABLE = "telemetria";

// ===== SENSORES =====
#define DHTPIN 4
#define DHTTYPE DHT11
#define SOIL_PIN 32

#define LED_PIN 2

int SECO_RAW = 3200;
int HUMEDO_RAW = 1300;

DHT dht(DHTPIN, DHTTYPE);

// ===== VARIABLES GLOBALES =====
unsigned long lastSendTime = 0;
unsigned long lastBufferCheck = 0;
const unsigned long SEND_INTERVAL = 15000; // 15 segundos
const unsigned long BUFFER_CHECK_INTERVAL = 30000; // 30 segundos
int sequenceId = 1;
bool hasPendingData = false;

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
  // Simula un valor de pH basado en los sensores disponibles
  // Esto es una aproximación y deberías calibrarlo según tus necesidades
  
  // Base de pH neutro
  float basePH = 7.0;
  
  // Ajustes basados en los sensores:
  // - Temperatura alta puede afectar pH
  if (temperature > 30.0) basePH -= 0.3;
  else if (temperature < 15.0) basePH += 0.2;
  
  // - Humedad ambiental alta puede acidificar ligeramente
  if (humidity > 80.0) basePH -= 0.2;
  else if (humidity < 30.0) basePH += 0.1;
  
  // - Suelo muy húmedo puede hacer más ácido
  if (soilMoisture > 80) basePH -= 0.4;
  else if (soilMoisture < 20) basePH += 0.3;
  
  // Limitar entre rangos normales de pH para suelo (5.5 - 8.5)
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
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000)
  {
    delay(500);
    Serial.print(".");
  }
  Serial.println(wifiConnected() ? "✅ Conectado" : "❌ Falló conexión");
}

bool postToSupabase(const String &body)
{
  if (WiFi.status() != WL_CONNECTED)
    return false;

  WiFiClientSecure client;
  client.setInsecure(); // para pruebas (TLS sin verificación). Quita al final si quieres validar CA.

  HTTPClient http;
  String url = String(SUPABASE_URL);

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
  
  // 201 = Created (ok)
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
    // Eliminar archivo vacío
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
    if (!postToSupabase(line))
      pending.push_back(line);
    delay(500); // Pequeña pausa entre envíos
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

void loadSequenceId()
{
  // Intentar cargar el último sequenceId desde SPIFFS
  File f = SPIFFS.open("/sequence.txt", FILE_READ);
  if (f)
  {
    String content = f.readString();
    content.trim();
    sequenceId = content.toInt();
    f.close();
    Serial.print("📁 Sequence ID cargado: ");
    Serial.println(sequenceId);
  }
  else
  {
    sequenceId = 1;
    Serial.println("📁 Sequence ID inicializado a 1");
  }
}

void saveSequenceId()
{
  File f = SPIFFS.open("/sequence.txt", FILE_WRITE);
  if (f)
  {
    f.println(sequenceId);
    f.close();
  }
}

void checkPendingData()
{
  hasPendingData = bufferExists();
  if (hasPendingData)
  {
    File f = SPIFFS.open("/buffer.jsonl", FILE_READ);
    if (f && f.size() > 0)
    {
      Serial.print("📦 Datos pendientes detectados: ");
      Serial.print(f.size());
      Serial.println(" bytes");
      f.close();
    }
    else
    {
      if (f) f.close();
      SPIFFS.remove("/buffer.jsonl");
      hasPendingData = false;
    }
  }
}

void setup()
{
  Serial.begin(115200);
  SPIFFS.begin(true);
  dht.begin();
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);

  // Cargar el sequenceId antes de conectar WiFi
  loadSequenceId();

  connectWiFi();
  
  // Verificar si hay datos pendientes
  checkPendingData();
  
  if (wifiConnected() && hasPendingData)
  {
    flushBuffer();
  }

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  if (wifiConnected())
  {
    digitalWrite(LED_PIN, HIGH); // LED encendido = WiFi conectado
  }
  else
  {
    digitalWrite(LED_PIN, LOW); // apagado = sin conexión
  }

  Serial.println("🚀 Sistema iniciado - Envío cada 15 segundos");
}

void loop()
{
  unsigned long currentTime = millis();
  
  // Verificar si es tiempo de enviar datos (cada 15 segundos)
  if (currentTime - lastSendTime >= SEND_INTERVAL)
  {
    lastSendTime = currentTime;
    
    // Leer sensores
    int rawSoil = analogRead(SOIL_PIN);
    int humedadSuelo = soilPct(rawSoil);
    float humAmb = dht.readHumidity();
    float temp = dht.readTemperature();
    
    // Validar lecturas del DHT
    if (isnan(humAmb) || isnan(temp)) {
      Serial.println("❌ Error leyendo sensor DHT");
      humAmb = 0;
      temp = 0;
    }
    
    // Calcular pH simulado
    float simulatedPH = calculateSimulatedPH(temp, humAmb, humedadSuelo);

    // Construir JSON
    StaticJsonDocument<512> doc;
    doc["id"] = sequenceId; // ID secuencial
    doc["dispositivo_id"] = DEVICE_ID;
    doc["intensidad_wifi"] = wifiConnected() ? WiFi.RSSI() : 0;
    doc["bateria"] = 100;
    doc["version_firmware"] = "v1.0.0";
    doc["tiempo_activo_seg"] = currentTime / 1000;
    doc["humedad_suelo"] = humedadSuelo;
    doc["ph"] = simulatedPH; // Ahora con valor simulado

    JsonObject datos = doc.createNestedObject("datos_crudos");
    datos["temp_c"] = temp;
    datos["hum_amb"] = humAmb;
    datos["raw_soil"] = rawSoil;
    datos["DEVICE_KEY"] = DEVICE_KEY;

    // Estado de conexión
    if (wifiConnected())
    {
      Serial.println("🌐 WiFi activo - Enviando datos...");
    }
    else
    {
      Serial.println("🚫 Sin conexión WiFi - Guardando en buffer");
    }

    String body;
    serializeJson(doc, body);

    // Intentar enviar o guardar en buffer
    bool success = false;
    if (wifiConnected())
    {
      success = postToSupabase(body);
    }

    if (success)
    {
      Serial.print("✅ Datos enviados con ID: ");
      Serial.println(sequenceId);
      sequenceId++; // Incrementar solo si se envió exitosamente
      saveSequenceId(); // Guardar el nuevo sequenceId
    }
    else
    {
      saveToBuffer(body);
      Serial.println("❌ Falló el envío, guardado en buffer");
    }

    // Mostrar datos en consola
    Serial.println("=== DATOS SENSORES ===");
    Serial.print("ID: "); Serial.println(sequenceId - 1);
    Serial.print("Temperatura: "); Serial.print(temp); Serial.println("°C");
    Serial.print("Humedad Ambiental: "); Serial.print(humAmb); Serial.println("%");
    Serial.print("Humedad Suelo: "); Serial.print(humedadSuelo); Serial.println("%");
    Serial.print("pH: "); Serial.println(simulatedPH);
    Serial.print("RAW Suelo: "); Serial.println(rawSoil);
    Serial.println("======================");
  }

  // Verificar buffer cada 30 segundos o cuando hay datos pendientes
  if (currentTime - lastBufferCheck >= BUFFER_CHECK_INTERVAL || hasPendingData)
  {
    lastBufferCheck = currentTime;
    
    // Reconexión WiFi si es necesario
    if (!wifiConnected())
      connectWiFi();
      
    if (wifiConnected() && hasPendingData)
    {
      flushBuffer();
    }
  }

  delay(1000); // Pequeño delay para evitar sobrecarga
}