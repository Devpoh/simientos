---
name: prototipo
description: Prototipo desechable que responde a una pregunta de diseño ("¿es divertido X?") en menos de 1 día, con veredicto SEGUIR / CAMBIAR / DESCARTAR.
argument-hint: "<pregunta o mecánica a probar>"
disable-model-invocation: true
---

# Prototipo

1. **Pregunta única y falsable.** "¿Esquivar proyectiles con un dash de 0,2 s es satisfactorio durante 2 minutos?" Si el usuario trae varias, elige la más arriesgada.
2. **Montar:** `cp -r templates/<phaser-ts|three-ts> prototypes/<nombre>`, sustituye los `{{…}}` e instala dependencias. Escribe un `README.md` con la pregunta, cómo correrlo y el estado `en-curso`.
3. **Construir lo mínimo** que responda la pregunta, con reglas relajadas (`.claude/rules/prototipos.md`): sin menús, sin arte y sin pulido, salvo que eso sea lo que se prueba.
4. **Verificar** con `npm run shot` que se puede jugar.
5. **Veredicto** en el README: SEGUIR / CAMBIAR / DESCARTAR, qué se aprendió y qué haría falta para producción. El veredicto final sobre la diversión lo da el usuario al jugarlo: deja escrito "qué fijarse al jugar".
6. Commit: `proto(<nombre>): <pregunta corta>`.

Si el resultado es SEGUIR, el juego se crea con `/nuevo-juego` desde la plantilla y el prototipo **no** se copia. Su README alimenta el brief.
