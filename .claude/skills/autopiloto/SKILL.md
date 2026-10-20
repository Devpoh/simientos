---
name: autopiloto
description: Encadena fases del roadmap sin supervisión durante horas, verificando y registrando cada una, hasta completar n fases o encontrar un bloqueo real.
argument-hint: "[n fases, por defecto todas las pendientes]"
disable-model-invocation: true
---

# Autopiloto

El usuario no está. Tu único canal hacia él es la **bitácora**, que se ve en el panel. El chat lo leerá al final, así que mantenlo mínimo.
`B` = `node studio/bitacora.mjs`.

## Arranque
1. `B estado`. Si no hay roadmap, ejecuta `/roadmap` primero (lee su SKILL.md).
2. Lee `.claude/skills/fase/SKILL.md` **una vez**. Es el protocolo de cada iteración.
3. `B nota '{"texto":"Autopiloto iniciado: objetivo N fases"}'`

## Con las sesiones B y C (lo normal)
Ojo: aquí «sesión B» es una sesión de Claude, no el atajo `B` de la bitácora.
Si `studio/sesiones.json` tiene vivas las sesiones B o C (compruébalo con `ListAgents`), **la sesión A no implementa por defecto: reparte**, siguiendo `.claude/docs/sesiones.md`. Las fases de criterios claros van a la sesión B, la verificación y las tareas mecánicas a la sesión C, y A se queda con las fases núcleo o arriesgadas, la revisión y las decisiones. Envía cada tarea con `notify_when_idle: true` y no hagas sondeos. El resto del bucle es igual, pero «ejecuta el protocolo» pasa a ser «encárgalo y revisa la entrega».

## Bucle (por cada fase)
1. Ejecuta el protocolo de `/fase` sobre la siguiente fase `pendiente` (o retoma la que esté `en-curso`).
2. Escribe en el chat solo la línea `✅/⛔ F0X …`.
3. **Cada 4 fases** cerradas: lanza el subagente `disenador` para revisar carencias del estado actual (instrucciones en `.claude/skills/carencias/SKILL.md`) y que registre `falta` y `reco` sin duplicar.
4. Si el contexto se compacta, vuelve a empezar desde `B estado` (la bitácora es la memoria).

## Cuándo parar
- Se completaron N fases o no quedan pendientes.
- **2 fases seguidas bloqueadas:** algo estructural falla y conviene que el usuario mire.
- Hace falta una decisión que cambia el concepto (pilares, género, motor). Regístrala como `reco` de prioridad alta y para.
- Nunca pares para preguntar algo que puedas decidir tú: decide y registra con `decision`.

## Cierre
1. Si no se hizo en las últimas 2 fases, lanza un `/playtest` corto con el subagente `qa-tester`.
2. `B nota '{"texto":"Autopiloto terminado: X hechas, Y bloqueadas. Siguiente: …"}'`
3. Resumen en el chat de 10 líneas como máximo: fases cerradas, bloqueos con su motivo, las 3 recomendaciones más importantes y qué probar cuando juegue (`cd games/<slug> && npm run dev`).
