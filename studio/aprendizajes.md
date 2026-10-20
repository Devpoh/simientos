# Aprendizajes del estudio

Una línea por lección reutilizable: `- [área] síntoma → causa → solución`. Se busca con Grep antes de depurar.

- [three] aviso "THREE.Clock has been deprecated" → r18x reemplazó Clock → usar `THREE.Timer` con `timer.update(ms)` en `setAnimationLoop`.
- [ts] `tsc` falla con "Cannot find name 'process'" en vite.config.ts → el tsconfig no incluye tipos de Node → dejar vite.config.ts fuera de `include` (Vite lo compila aparte).
- [shot] error "HTTP 404 /favicon.ico" → el navegador pide un favicon → `<link rel="icon" href="data:,">` en index.html.
- [general] la bitácora mostraba F102 como siguiente con P0–P10 pendientes → el CLI ordenaba las fases por id (F < P < S) en cada `fase` → ordenar por versión y después por id (studio/bitacora.mjs)
