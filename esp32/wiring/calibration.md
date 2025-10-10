# Calibración de Sensores

## Humedad de Suelo
- Referencia seca: lectura en aire (≈0%).
- Referencia húmeda: sustrato saturado (≈100%).
- El firmware mapea 0..4095 → 0..100 %. Ajustar curva cuando se definan sondas finales.

## pH
- Usar soluciones tampón pH 4, 7 y 10 para trazar curva.
- Firmware mapea 0..4095 a 0..14 para visualización base; reemplazar por curva del electrodo.

## Procedimiento Operativo
1. Colocar el sensor en el medio de referencia.
2. Esperar estabilización (3–5 s).
3. Registrar punto en la UI/Backend.
4. Guardar coeficientes (pendiente de persistencia en NVS).
