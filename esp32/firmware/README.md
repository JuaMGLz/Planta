# Firmware ESP32 — Planta

## Flujo
1. Conexión Wi-Fi y sincronización NTP.
2. Lectura periódica de sensores (humedad de suelo, pH, batería).
3. Envío de telemetría al RPC de Supabase `insertar_telemetria`.
4. Reintentos básicos si se pierde la conexión.

## Estructura
- `include/config.h` — Parámetros de compilación (intervalos, rutas).
- `include/secrets.h` — **NO versionar** (copiar desde `secrets_example.h`).
- `src/main.cpp` — Orquestador (Wi-Fi, tiempos, ciclo de envío).
- `src/sensors.*` — Lectura/normalización de sensores.
- `src/telemetry.*` — Construye JSON y envía al endpoint.
- `src/time_sync.*` — Hora y uptime.
- `src/ota.*` — Punto de extensión para OTA (pendiente de integrar).

## Supabase RPC
`POST https://zgodzbybnfusfwxkjmuw.supabase.co/rest/v1/rpc/insertar_telemetria`

**Headers:**
- `Content-Type: application/json`
- `apikey: <ANON_KEY>`
- `Authorization: Bearer <ANON_KEY>`

**Body ejemplo:**
```json
{
  "p_clave_escritura": "CLAVE_ESCRITURA_UNICA",
  "p_datos": {
    "device_id": "esp32-plant-001",
    "timestamp": 1699999999,
    "firmware": "1.2.5",
    "rssi": -45,
    "battery": 20,
    "uptime_sec": 3600,
    "sensors": { "soil_moisture": 62.3, "ph": 6.7 }
  }
}
