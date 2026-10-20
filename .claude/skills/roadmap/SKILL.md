---
name: roadmap
description: Divide el brief del juego activo en fases pequeñas y verificables y las registra en la bitácora. También replanifica las fases pendientes.
argument-hint: "[replanificar]"
disable-model-invocation: true
---

# Roadmap por fases

`B` = `node studio/bitacora.mjs`. Lee `games/<slug>/docs/brief.md` y `B estado`.

## Reglas para diseñar las fases
- **F01** = la mecánica central jugable con placeholders (borra la demo de la plantilla). Lo divertido y arriesgado va primero (respeta el *orden de construcción* del brief).
- Cada fase cabe en **30–90 min** de trabajo de Claude y deja algo que se puede jugar o comprobar.
- Máximo **5 criterios** por fase, y cada uno dice cómo se comprueba: `test`, `estado shot` (qué clave y qué valor) o `captura`.
  - Mal: "el salto se siente bien".
  - Bien: "estado.jugador.y sube ≥ 96 px al pulsar Space (estado shot)".
- Un MVP típico tiene 10–18 fases. Después del MVP, añade siempre estas fases (en este orden):
  1. bucle completo: inicio → partida → derrota o victoria → reinicio
  2. game feel (skill `game-feel`)
  3. audio básico
  4. UI y menús: título, pausa, opciones mínimas
  5. onboarding: el jugador aprende sin leer un manual
  6. pase de pulido y rendimiento
- No dupliques: si una fase ya existe (aunque esté hecha), no la recrees.

## Registrar
Una sola llamada Bash con varios comandos encadenados con `&&`:
```bash
B fase '{"id":"F01","titulo":"…","objetivo":"resultado visible en 1 frase","criterios":["…","…"],"estado":"pendiente"}' && \
B fase '{"id":"F02",…}'
```
Si es una **replanificación**: no toques las fases `hecha`. Reescribe o renumera solo las `pendiente`, usando IDs nuevos (F07b) en lugar de reutilizar los existentes. Registra el porqué con `decision`.

## Cierre
Muestra una tabla compacta (ID · título · criterio clave) y di cuántas fases son MVP y cuántas son de cierre.
