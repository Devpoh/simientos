---
name: bug
description: Arregla un bug del juego activo. Lo reproduce, encuentra la causa raíz, crea un test de regresión, verifica en el navegador y registra síntoma, causa y solución en la bitácora. Úsala cuando el usuario reporte un fallo o algo que no funciona como debería.
argument-hint: "<descripción del bug o ID de error abierto, p. ej. E004>"
---

# Arreglar un bug

`B` = `node studio/bitacora.mjs`. Si recibes un ID, sácalo de `estado.json` con `Grep`.

1. **Reproducir antes de tocar nada.**
   - Si es de lógica: escribe un test en `tests/` que falle.
   - Si es de comportamiento o visual: busca una secuencia con `npm run shot -- --acciones "…" --sin-captura` cuyo `estado` muestre el fallo. Si falta información, añade un `exponer()`.
   - Si no logras reproducirlo tras 3 intentos, registra `error` con `estado:"abierto"` y lo que probaste, y para.
2. **Causa raíz.** Busca en `studio/aprendizajes.md` primero. Arregla la causa, no el síntoma (nada de `if` especiales que tapen el problema).
3. **Arreglar y verificar:** el test o la secuencia ahora pasan, `npm run check` está en verde y no aparecen errores nuevos en `shot`.
4. **Registrar:** `B error '{"fase":"<fase o bug>","sintoma","causa","solucion"}'` (si venía de un ID abierto, usa `B cerrar error E00X` y luego registra el detalle con `B nota`). Si la lección es reutilizable, añade 1 línea a `studio/aprendizajes.md`.
5. **Commit:** `fix(<slug>): <síntoma corto>`.
