#pragma once  // Evita que este archivo se incluya más de una vez

// ===== Configuración general del dispositivo =====
#define FW_VERSION "1.2.5"              // Versión actual del firmware cargado
#define DISPOSITIVO_ID "esp32-plant-001"// Identificador único del dispositivo

// ===== Intervalos de ejecución =====
#define INTERVALO_LECTURA_MS 10000      // Leer sensores cada 10 segundos
#define INTERVALO_ENVIO_MS   15000      // Enviar telemetría cada 15 segundos
#define REINTENTO_WIFI_MS    5000       // Espera 5 segundos antes de reintentar Wi-Fi
#define RESINCRONIZAR_NTP_MS 3600000    // Re-sincronizar hora cada hora

// ===== Configuración de conexión a Supabase =====
#define API_BASE_URL  "https://zgodzbybnfusfwxkjmuw.supabase.co" // URL fija de tu proyecto
#define API_RUTA_RPC  "/rest/v1/rpc/insertar_telemetria"          // Función RPC para insertar datos

// ===== Protocolos habilitados =====
#define HABILITAR_HTTP 1                // Activado para usar Supabase con HTTPS
#define HABILITAR_MQTT 0                // Desactivado (solo HTTP)

// ===== MQTT (si más adelante se requiere) =====
#define MQTT_BROKER "192.168.0.10"      // Dirección del broker MQTT
#define MQTT_PUERTO 1883                // Puerto del broker
#define MQTT_TOPICO "planta/esp32-plant-001/telemetria" // Tópico del dispositivo
