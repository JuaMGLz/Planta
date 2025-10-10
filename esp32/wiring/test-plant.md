# Plan de Pruebas (en sitio)

1. Energizar el ESP32 y verificar conexión Wi-Fi.
2. Comprobar en la UI:
   - Estado: Conectado
   - Intensidad Wi-Fi (RSSI)
   - Versión de firmware
   - Uptime en incremento
3. Provocar cambio de humedad (regar / retirar sustrato) y confirmar variación.
4. Ejecutar acciones de calibración desde la UI (humedad y pH) y verificar respuesta.
5. Desconectar Wi-Fi por ~15 s, reconectar y confirmar reanudación de envíos.
