# Pruebas manuales del motor analítico

No hay infraestructura de tests en el proyecto. Antes de publicar, comprobar con un dataset de prueba controlado:

1. **Single:** 10 docentes actuales, 6 con opción A y 4 con B: A=60 %, B=40 %, `nValid=10`.
2. **Multi:** 40 docentes, 25 A, 20 B y 10 C: 62,5 %, 50 % y 25 %; la suma puede superar 100 %.
3. **Denominadores:** 100 sesiones válidas, 50 docentes actuales, 40 elegibles, 35 respuestas y 30 válidas: verificar los cinco valores devueltos.
4. **Número:** aspirantes con 15, 20, 20, 25 y 40 €/h: media 24, mediana 20, mínimo 15, máximo 40.
5. **Muestra:** verificar estados para n=4, 5, 14, 15, 29 y 30.
6. **Agrupación:** pedir una métrica con `groupBy` y comprobar que cada grupo conserva su propio denominador.
7. **Población:** una métrica `CURRENT_TEACHERS` no debe incluir exdocentes ni aspirantes.
