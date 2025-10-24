#include "sensors.h"          // Encabezado del módulo de sensores

// Pines donde están conectados los sensores
static const int PIN_HUMEDAD = 34; // GPIO34 para humedad
static const int PIN_PH      = 35; // GPIO35 para pH

// Inicializa los sensores
void sensores_iniciar() {
  analogReadResolution(12);   // Lecturas de 0 a 4095
  pinMode(PIN_HUMEDAD, INPUT);
  pinMode(PIN_PH, INPUT);
}

// Convierte la lectura analógica en porcentaje de humedad (0–100%)
static float a_porcentaje(int raw) {
  return constrain((4095 - raw) * 100.0 / 4095.0, 0, 100);
}

// Convierte la lectura analógica a valor de pH (0–14)
static float a_ph(int raw) {
  return constrain((raw * 14.0) / 4095.0, 0, 14);
}

// Realiza la lectura completa de los sensores
DatosSensores sensores_leer() {
  int rH = analogRead(PIN_HUMEDAD); // Lectura del sensor de humedad
  int rP = analogRead(PIN_PH);      // Lectura del sensor de pH

  DatosSensores d;
  d.humedad_suelo = a_porcentaje(rH);
  d.ph            = a_ph(rP);
  d.bateria       = 20;             // Valor fijo simulado
  return d;
}

// Calibraciones simuladas (pueden reemplazarse con procesos reales)
void calibrar_humedad() { delay(1500); }
void calibrar_ph()      { delay(1500); }
