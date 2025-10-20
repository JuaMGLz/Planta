#pragma once
#include <Arduino.h>

// Estructura de datos leídos por los sensores
struct DatosSensores {
    float humedad_suelo; // porcentaje (0-100)
    float ph;            // escala 0-14
    int   bateria;       // porcentaje de batería o nivel simulado
};

// Inicialización de pines y ADC
void sensores_iniciar();

// Lectura principal de sensores
DatosSensores sensores_leer();

// (Opcional) Calibraciones
void calibrar_humedad();
void calibrar_ph();
