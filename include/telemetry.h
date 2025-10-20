#pragma once
#include <Arduino.h>
#include "sensors.h"
#include "config.h"
#include "secrets.h"

void telemetria_iniciar();
void telemetria_enviar(const DatosSensores& d, int rssi, const String& version_firmware, unsigned long uptime_segundos);
