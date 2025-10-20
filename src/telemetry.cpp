#include "telemetry.h"
#include "config.h"
#include "secrets.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void telemetria_iniciar() {
  // Por ahora no requiere configuración adicional
}

// Construye el JSON que se enviará al RPC `insertar_telemetria`
static String construir_rpc_payload(const DatosSensores& d, int rssi,
                                    const String& fw, unsigned long up) {
  StaticJsonDocument<512> doc;

  // Parámetro principal que identifica el dispositivo
  doc["p_clave_escritura"] = CLAVE_ESCRITURA;

  // Crea el objeto p_datos (que contiene toda la información del sensor)
  JsonObject datos = doc.createNestedObject("p_datos");
  datos["device_id"]  = DISPOSITIVO_ID;     // Identificador del ESP32
  datos["timestamp"]  = (uint32_t)(millis()/1000); // Marca de tiempo local
  datos["firmware"]   = fw;                 // Versión actual del firmware
  datos["rssi"]       = rssi;              // Intensidad de la señal Wi-Fi
  datos["battery"]    = d.bateria;         // Nivel de batería
  datos["uptime_sec"] = up;                // Tiempo activo

  // Añadir las lecturas de sensores
  JsonObject s = datos.createNestedObject("sensors");
  s["soil_moisture"] = d.humedad_suelo;    // Humedad en porcentaje
  s["ph"]            = d.ph;               // pH en escala 0–14

  String out; serializeJson(doc, out);
  return out;                              // Devuelve el JSON como string
}

// Envía la telemetría por HTTPS a tu proyecto Supabase
void telemetria_enviar(const DatosSensores& d, int rssi,
                       const String& version_firmware,
                       unsigned long uptime_segundos) {

  WiFiClientSecure *client = new WiFiClientSecure; // Crea cliente seguro
  client->setInsecure(); // Permite HTTPS sin validar el certificado (demo local)

  HTTPClient http; // Cliente HTTP estándar de Arduino
  String url = String(API_BASE_URL) + String(API_RUTA_RPC); // RPC completo
  http.begin(*client, url); // Abre conexión segura

  // Encabezados requeridos por Supabase
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_APIKEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_APIKEY);

  // Construir cuerpo del mensaje
  String body = construir_rpc_payload(d, rssi, version_firmware, uptime_segundos);
  int code = http.POST(body); // Envía la solicitud POST

  // Mostrar en monitor serial si fue exitoso
  Serial.println("----- Envío de telemetría -----");
  Serial.println(body);                        // Muestra el JSON enviado
  Serial.printf("Código HTTP recibido: %d\n", code); // 200 = OK
  Serial.println("------------------------------");

  http.end();     // Cierra la conexión
  delete client;  // Libera memoria
}
