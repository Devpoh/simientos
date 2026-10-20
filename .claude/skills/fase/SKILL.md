---
name: fase
description: Ejecuta una fase del roadmap de un juego de principio a fin (implementar, verificar en navegador, registrar en la bitácora y hacer commit). Úsala cuando el usuario pida avanzar, continuar, seguir con el juego o hacer la siguiente fase o una concreta (F03).
argument-hint: "[id de fase, p. ej. F03] (por defecto, la siguiente pendiente)"
---

# Protocolo de fase

Una fase = un resultado jugable o comprobable, verificado y registrado. Trabaja en autónomo: decide, registra la decisión y sigue.
`B` = `node studio/bitacora.mjs` (desde la raíz, con el Bash tool).

## 1. Situarse (lo más barato posible)
- `B estado` → fase en curso, siguiente y bloqueos. Si hay una fase `en-curso`, retómala (no crees otra).
- Lee la fase completa solo si necesitas sus criterios: `Grep` en `games/<slug>/docs/estado.json` por `"id": "F03"` con contexto `-A 12`.
- Lee el `CLAUDE.md` del juego si aún no lo leíste en esta sesión.
- `Grep` en `studio/aprendizajes.md` con palabras clave de la fase. Así evitas repetir errores conocidos.
- `B fase '{"id":"F03","estado":"en-curso"}'`

## 2. Dimensionar
Si la fase toca más de unos 6 archivos o más de unas 300 líneas, o mezcla dos resultados distintos, divídela: crea `F03a` y `F03b` con sus criterios, marca F03 como `hecha` con `hecho:["dividida en F03a/F03b"]` y ejecuta F03a.

## 3. Implementar
1. Primero la **lógica pura** en `src/logic/` con sus tests (Vitest). Así el comportamiento queda definido antes de dibujarlo.
2. Luego la **presentación** (escena o render), leyendo los valores de `tuning.json`.
3. Usa `exponer()` para todo lo que haga falta comprobar en los criterios (posición, vida, estado de la máquina, contadores).
4. Si dudas sobre una API de Phaser: skill `phaser-*` o context7. No supongas.
5. Si el código introduce un **concepto de gamedev** que el usuario probablemente no conoce (delta time, coyote time, pooling, máquina de estados…), regístralo: `B aprende '{"concepto":"…","explicacion":"2-3 frases, ligadas a este juego"}'`.

## 4. Verificar (obligatorio, desde `games/<slug>`)
1. `npm run check 2>&1 | tail -n 25` → todo en verde.
2. `npm run shot -- --escena <Escena> --acciones "<secuencia que ejercite los criterios>" --sin-captura`. Comprueba cada criterio contra `estado`. `errores` debe estar vacío y `avisos` debe estar vacío o justificado.
3. Si la fase cambia algo **visible** (UI, arte, cámara, feel): repite el comando sin `--sin-captura` y con `--nombre F03-<que-muestra>`, y mira la imagen con `Read`. Texto cortado, elementos fuera de pantalla o colores que no se distinguen son defectos.
4. Si la fase supera unas 150 líneas cambiadas: lanza el subagente `revisor-codigo` sobre `git diff`. Corrige lo crítico.

## 5. Errores durante la fase
- Antes de reintentar, piensa en la causa raíz. Prueba 3 enfoques distintos como máximo.
- Si el error no fue trivial (más allá de un typo), regístralo aunque ya esté resuelto: `B error '{"fase":"F03","sintoma":"…","causa":"…","solucion":"…"}'`.
- Si el error enseña algo reutilizable, añade 1 línea a `studio/aprendizajes.md`: `- [phaser|ts|vite|arte|general] síntoma → causa → solución`.
- Si después de 3 enfoques sigues atascado: `B fase '{"id":"F03","estado":"bloqueada","motivo":"…qué se probó y qué haría falta"}'` y termina la fase sin commit de código roto (con `git stash` o deshaciendo los cambios de esa fase).

## 6. Cerrar
1. `B fase '{"id":"F03","estado":"hecha","hecho":["…","…"],"verificacion":{"tests":"14/14","resultado":"jugador salta 3 tiles; coyote 0,1 s OK","captura":"F03-salto.png"}}'`. El campo `captura` solo se pone si hay captura y lleva el nombre de archivo, no la ruta.
2. Registra lo que viste de pasada: `falta` (lo que el juego necesita y no está en el roadmap) y `reco` (mejoras con su `porque`). 0–3 entradas, sin repetir las que ya existen.
3. Si tomaste decisiones no obvias: `B decision '{"fase":"F03","texto":"…","porque":"…"}'`.
4. Commit: `git add games/<slug> studio && git commit -m "feat(<slug>): F03 <título>"`. Añade el hash: `B fase '{"id":"F03","commit":"<hash corto>"}'`.
5. En el chat, una sola línea: `✅ F03 <título> — <resultado clave>`.
