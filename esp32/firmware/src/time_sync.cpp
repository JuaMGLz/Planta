#include "time_sync.h"
#include <Arduino.h>
#include <time.h>

static unsigned long arranque = 0; // Guarda el tiempo de inicio del dispositivo

// Sincroniza el reloj del ESP32 con los servidores NTP
void tiempo_iniciar() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov"); // Servidores de hora
  arranque = millis(); // Guarda el momento de arranque para calcular uptime
}

// Devuelve el tiempo activo del dispositivo en segundos
unsigned long uptime_seg() {
  return (millis() - arranque) / 1000;
}
