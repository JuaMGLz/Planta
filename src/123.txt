#include <Arduino.h>        // Librería base de Arduino
#include <WiFi.h>           // Librería para manejar conexión Wi-Fi
#include "config.h"         // Configuración general
#include "secrets.h"        // Datos privados
#include "sensors.h"        // Módulo de sensores
#include "telemetry.h"      // Módulo de telemetría
#include "time_sync.h"      // Módulo de sincronización de hora

// Variables para controlar los tiempos
unsigned long t_lectura = 0; // Último momento de lectura
unsigned long t_envio = 0;   // Último momento de envío
DatosSensores ultima{};      // Estructura con los últimos datos leídos

// ------------------ FUNCIÓN DE CONEXIÓN WIFI ------------------
static void wifi_conectar() {
  WiFi.mode(WIFI_STA);                     // Configura el ESP32 en modo cliente
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);    // Inicia la conexión
  unsigned long t0 = millis();             // Tiempo inicial
  while (WiFi.status() != WL_CONNECTED && (millis() - t0) < 20000) {
    delay(200);                            // Espera 200 ms entre intentos
  }
}

// ------------------ SETUP ------------------
void setup() {
  Serial.begin(115200);         // Inicia el puerto serie
  sensores_iniciar();           // Prepara los pines de sensores
  wifi_conectar();              // Conecta a la red Wi-Fi
  tiempo_iniciar();             // Sincroniza la hora con NTP
  telemetria_iniciar();         // Prepara el módulo de telemetría
  Serial.println("🌿 Dispositivo Planta conectado y listo.");
}

// ------------------ LOOP PRINCIPAL ------------------
void loop() {
  // Si el Wi-Fi se cae, reconectar
  if (WiFi.status() != WL_CONNECTED) {
    wifi_conectar();
    delay(REINTENTO_WIFI_MS);
  }

  unsigned long ahora = millis(); // Hora actual en milisegundos

  // Leer sensores cada cierto tiempo
  if (ahora - t_lectura >= INTERVALO_LECTURA_MS) {
    ultima = sensores_leer(); // Leer humedad, pH, batería
    t_lectura = ahora;
  }

  // Enviar datos cada INTERVALO_ENVIO_MS
  if (ahora - t_envio >= INTERVALO_ENVIO_MS && WiFi.status() == WL_CONNECTED) {
    telemetria_enviar(ultima, WiFi.RSSI(), FW_VERSION, uptime_seg());
    t_envio = ahora;
  }

  delay(10); // Pequeño respiro para no saturar el procesador
}
