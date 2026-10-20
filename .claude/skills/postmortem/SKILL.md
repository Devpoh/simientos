---
name: postmortem
description: Cierra un juego o un hito. Resume qué funcionó y qué no a partir de la bitácora y guarda lecciones reutilizables para los próximos juegos.
disable-model-invocation: true
---

# Postmortem

1. Saca métricas de `games/<slug>/docs/estado.json` con un único `node -e` (fases hechas o bloqueadas, duración media por fase, errores por área, faltantes abiertos). No leas el JSON entero en el contexto.
2. Escribe `games/<slug>/docs/postmortem.md` (1 pantalla como máximo):
   - **Qué funcionó** (proceso y diseño)
   - **Qué no funcionó** y por qué
   - **Métricas**
   - **Haría distinto la próxima vez**
3. Añade a `studio/aprendizajes.md` solo las lecciones **reutilizables en otros juegos**, en formato `- [área] síntoma → causa → solución`, sin duplicar las que ya existen.
4. Si alguna lección debe cambiar el proceso del estudio (CLAUDE.md, reglas o skills), proponla al usuario como lista de cambios. No los apliques sin su visto bueno.
5. `B nota '{"texto":"Postmortem escrito"}'` y commit `docs(<slug>): postmortem`.
