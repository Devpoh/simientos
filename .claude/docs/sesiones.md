# Trabajo con varias sesiones: A, B y C

El estudio trabaja con **tres sesiones de Claude Code abiertas a la vez** en `D:\Proyectos GC`. Los roles son fijos; las sesiones concretas cambian cuando se les llena el contexto.

| Rol | Modelo · esfuerzo | Para qué |
|---|---|---|
| **A, orquestador** | Opus 5.5 · alto | Habla con el usuario. Diseño, arquitectura, decisiones de concepto, roadmap, sistemas núcleo difíciles, bloqueos y revisión final. **Reparte el trabajo.** |
| **B, implementador** | Sonnet 5.5 · alto | Fases con criterios claros (la mayoría), render Phaser, sistemas con tests, bugs medios, playtests. |
| **C, ayudante** | Sonnet 5 · medio | Trabajo mecánico: verificar con `check` y `shot`, capturas, tuning, docs, registrar en la bitácora, refactors pequeños, búsquedas y resúmenes. |

**Regla de reparto:** usa el modelo más barato que lo haga bien a la primera. **Delega solo lo que estés seguro de que ese rol resuelve con su modelo y su esfuerzo.** Si dudas, se lo das al rol superior o lo hace A: ahorrar tokens no compensa un trabajo mal hecho que luego hay que rehacer. Si una tarea de C falla dos veces, sube a B. Si una de B se bloquea, sube a A.

## Sesión D (opcional): artista de sprites
Se abre solo cuando A tiene una cola de arte (etapas de obra, variantes, niños/ancianos, orientaciones, LOD). **Sonnet 5.5 · esfuerzo alto** (necesita leer imágenes y escribir geometría; con esfuerzo medio se salta la revisión visual). Opus 5.5 alto únicamente para hitos de dirección de arte nuevos que A decida. Solo toca `tools/arte-pixel/` y `games/sedimento/public/recursos/pixel/`; nunca el código del juego. Usa el mismo formato de tarea/entrega (`TAREA D3 para D` / `HECHO D3`) y la lista de aceptación de `.claude/docs/pivote-pixel-art.md` §10. Si la sesión D existe, A la apunta en `studio/sesiones.json` como `"D"`.

## Quién es quién ahora
`studio/sesiones.json` guarda qué sesión ocupa cada rol, por ejemplo `{"A":"proyectos-gc-5a","B":"proyectos-gc-62","C":"proyectos-gc-48"}`. **Solo A lo edita.** Para ver qué sesiones están vivas, A usa `ListAgents`.

## Arrancar o rotar una sesión
1. El usuario abre una sesión nueva en `D:\Proyectos GC` y le escribe: **«Eres la sesión B del estudio. Lee .claude/docs/sesiones.md y preséntate a A.»** (o C, o A).
2. La sesión nueva lee este archivo, mira su propio nombre con `ListAgents` y se presenta a A con `SendMessage`: rol, modelo y nombre.
3. A actualiza `studio/sesiones.json`.
4. **Una A nueva** lee `node studio/bitacora.mjs estado` y `studio/sesiones.json`, y avisa a B y C de que ahora el orquestador es ella.
- **Cuándo rotar:** después de una compactación de contexto o cuando la sesión lleva unas 4 fases o tareas grandes. La sesión avisa a A con «necesito rotar». La memoria está en la bitácora y en los archivos, así que rotar no pierde nada.

## Formato de una tarea (A → B o C)
```
TAREA <ID> para <B|C>: <título en una línea>
Juego: <slug> (lee games/<slug>/CLAUDE.md si no lo leíste en esta sesión)
Objetivo: <resultado verificable en 1–2 frases>
Criterios: <lista; cada uno se comprueba con check, con el estado de shot o con una captura>
Puedes tocar: <rutas> · No toques: <rutas>
Protocolo: <«/fase F03 completo» | «sin commit» | «solo verificar»> · Corte: <HH:MM = envío + 20 min>
Entrega: SendMessage a <nombre de A> en ≤ 10 líneas.
```
Para una fase del roadmap basta con: `TAREA F03 para B: ejecuta /fase F03 completo (.claude/skills/fase/SKILL.md)`.

## Formato de la entrega (B o C → A)
```
HECHO <ID> ✅|⛔: <resultado clave en una línea>
Verificación: check <n/n>, shot <criterios OK>, captura <archivo|—>
Archivos: <lista corta> · Commit: <hash|sin commit>
Problemas o dudas: <si las hay; si no, «ninguno»>
```

## Revisión con captura (R12, obligatorio siempre)

Quien entrega un cambio visible adjunta en el HECHO el nombre de la captura **que ha mirado**. A no acepta la entrega sin mirar también la captura con Read. Los defectos se corrigen o se piden; las mejoras gráficas pendientes van a `reco`. Las skills (`/fase` y las demás) se siguen al pie de la letra.

## Reglas para trabajar en paralelo sin pisarse
- **Áreas separadas:** A asigna rutas que no se solapan. Dos sesiones nunca editan el mismo archivo a la vez.
- **Git:** cada sesión hace commit solo de sus archivos (`git add <rutas>`, nunca `git add -A`). Si aparece `index.lock`, espera unos segundos y reintenta. Nunca hagas `push` ni reescribas el historial.
- **Bitácora:** todas pueden escribir (`fase`, `error`, `decision`, `aprende`…). Las decisiones de implementación las registra quien las toma. **Los cambios de concepto, pilares o roadmap solo los hace A**: B y C los proponen a A.
- **Verificación:** B y C verifican igual que siempre (`npm run check` + `npm run shot`). A no repite toda la verificación: revisa la entrega, `git diff --stat` y la captura si es visual.
- **Permisos:** si a una sesión se le deniega algo, no se lo pide a otra. Lo devuelve a A, que se lo pregunta al usuario.
- **Silencio:** B y C no escriben al usuario salvo que él les hable. Su canal es A, y lo que importa queda en la bitácora y en el panel.

## Autopiloto con sesiones
A reparte las fases según la tabla de roles, envía cada tarea con `notify_when_idle: true` y, mientras tanto, prepara la siguiente o revisa la entrega anterior. B y C pueden trabajar a la vez si sus rutas no se solapan; por ejemplo, B implementa F05 mientras C verifica F04 y actualiza la documentación.

## Si B o C no están disponibles
A puede delegar en un subagente con la herramienta `Agent`, usando `model: "sonnet"` y `effort: "high"` para el rol B o `"medium"` para el rol C. El subagente arranca sin contexto: dale la tarea con el mismo formato.

## Tareas por tramos (R67, regla del usuario)
Las tareas pueden ser largas, pero se ejecutan **por tramos de ≤ 20 min** (y lejos de ~60k tokens seguidos). Al cerrar cada tramo, la sesión entrega `HECHO <ID>-parcial` (qué está hecho y verificado, qué sigue) con el árbol compilando, y **se detiene** hasta que A responda «sigue». A divide cada TAREA en tramos que quepan en 20 min (como mucho 2–3 criterios de código por tramo) y pone la hora de corte en la tarea. Trabajar más de 30 min sin parar degrada la calidad.

## Lecciones de coordinación (20–21-10)
- **Lo que el usuario le diga a B, C o D** (peticiones o críticas) se lo pasan a A en el siguiente HECHO, y A lo anota en `requisitos-usuario.md` (R68).
- **Avisos de inactividad:** pueden llegar con retraso. Antes de dar una sesión por parada, mira `ListAgents` (busy/idle) y `git log`.
- **Límite de uso:** si todas paran a la vez sin entregar nada, es el límite de la cuenta. Espera al reinicio y reenvía a cada una su tarea pendiente.
- **Relevo:** antes de cerrar, cada sesión deja una `nota` «Traspaso <rol> (fecha)» con lo hecho, lo que queda a medias, el siguiente paso exacto y las trampas aprendidas. D, además, actualiza «Estado y cola» en `tools/arte-pixel/README.md`.
