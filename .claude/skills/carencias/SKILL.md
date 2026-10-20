---
name: carencias
description: Auditoría de diseño del juego activo. Detecta qué le falta para sentirse completo y divertido, qué sobra, y da recomendaciones priorizadas en la bitácora. Úsala cuando el usuario pregunte qué falta, qué mejorar, cómo va el juego o qué recomiendas.
---

# Auditoría de carencias

Delega en el subagente **`disenador`** (análisis largo y fuera de tu contexto). Entradas: `docs/brief.md`, `B estado` y la lista de fases hechas.

## Checklist que aplica el diseñador (sobre lo que existe, no sobre lo planeado)
| Área | Pregunta |
|---|---|
| Bucle central | ¿Se entiende y engancha en los primeros 30 s? ¿Tiene decisión, riesgo y recompensa? |
| Feedback / juice | ¿Cada acción del jugador tiene respuesta visual y sonora? |
| Objetivo y derrota | ¿Hay meta clara, derrota justa y reinicio rápido (menos de 2 s)? |
| Progresión | ¿Cambia algo con el tiempo (dificultad, mejoras, contenido)? |
| Curva de dificultad | ¿Los primeros minutos enseñan? ¿Hay picos injustos? |
| Onboarding | ¿El jugador aprende los controles sin leer un manual? |
| UI | Título, pausa, HUD legible, game over con puntuación o récord |
| Audio | SFX en acciones clave, música, volumen ajustable |
| Persistencia | ¿Hace falta guardar el récord o el progreso (localStorage)? |
| Accesibilidad | Remapeo o alternativas de teclas, contraste, que no dependa solo del color |
| Rendimiento | ¿60 fps estables? ¿Fugas al reiniciar? |
| Alcance | ¿Hay features que no sirven a ningún pilar? (recomienda quitarlas) |

## Salida (`B` = `node studio/bitacora.mjs`)
- `B falta '{"texto","prioridad","area"}'` para lo que falta. Prioridad **alta** si impide que el juego se sienta completo.
- `B reco '{"area","texto","porque","prioridad"}'`: el `porque` usa experiencia de diseño concreta (cita juegos de referencia o principios). Nada genérico.
- **Sin duplicados:** compara con los `faltantes` y `recomendaciones` abiertos. Si algo ya se resolvió, ciérralo con `B cerrar falta L00X`.
- Si una carencia alta merece una fase propia, propónla como `reco` con el texto "Añadir fase: …". `/roadmap replanificar` decide.
- Respuesta en el chat: las 3 recomendaciones de más impacto, una línea cada una.
