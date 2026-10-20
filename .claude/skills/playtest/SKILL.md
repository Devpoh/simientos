---
name: playtest
description: Juega el juego activo con secuencias de input automáticas en un navegador real para encontrar bugs, problemas de sensación y huecos de diseño, y lo registra en la bitácora. Úsala cuando el usuario pida probar, testear o jugar el juego, o revisar cómo se siente.
argument-hint: "[foco opcional: combate, menús, dificultad…]"
---

# Playtest automático

Delega en el subagente **`qa-tester`** para mantener limpio tu contexto. Pásale: el slug, el foco y un resumen de los pilares y el bucle central (3 líneas sacadas de `docs/brief.md`).

## Qué debe cubrir el qa-tester
1. **Camino feliz:** recorrer el bucle central 2–3 veces con `npm run shot -- --acciones "…" --sin-captura` y comprobar que el `estado` evoluciona como se espera.
2. **Abuso:** machacar teclas, pulsar teclas opuestas a la vez, quedarse quieto 10 s, chocar con los bordes, morir y reiniciar varias veces (aquí aparecen las fugas de listeners), y pausar a mitad de una acción.
3. **Errores de consola** en cada ejecución (`errores` y `avisos`).
4. **2–3 capturas** de momentos clave (`--nombre PT-<momento>`) y revisión visual: legibilidad, contraste, que el HUD no tape la acción y que el jugador sepa qué hacer.
5. **Sensación** frente a los pilares: ¿cada acción tiene respuesta? ¿hay tiempos muertos? ¿la dificultad tiene sentido?

## Qué se registra (`B` = `node studio/bitacora.mjs`)
- Bug reproducible → `B error '{"sintoma","causa":"(hipótesis)","estado":"abierto","fase":"playtest"}'` con la secuencia de acciones que lo reproduce dentro de `sintoma`.
- Carencia → `B falta`. Mejora → `B reco` (con `porque`). Revisa antes el estado para no duplicar.
- Al final, `B nota` con: "Para probar tú: …", 3 cosas concretas que el usuario debería jugar a mano porque la automatización no las puede juzgar.

Respuesta en el chat: 5 líneas como máximo.
