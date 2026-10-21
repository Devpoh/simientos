# Aprendizajes del estudio

Una línea por lección reutilizable: `- [área] síntoma → causa → solución`. Se busca con Grep antes de depurar.

- [three] aviso "THREE.Clock has been deprecated" → r18x reemplazó Clock → usar `THREE.Timer` con `timer.update(ms)` en `setAnimationLoop`.
- [ts] `tsc` falla con "Cannot find name 'process'" en vite.config.ts → el tsconfig no incluye tipos de Node → dejar vite.config.ts fuera de `include` (Vite lo compila aparte).
- [shot] error "HTTP 404 /favicon.ico" → el navegador pide un favicon → `<link rel="icon" href="data:,">` en index.html.
- [general] la bitácora mostraba F102 como siguiente con P0–P10 pendientes → el CLI ordenaba las fases por id (F < P < S) en cada `fase` → ordenar por versión y después por id (studio/bitacora.mjs)
- [ts] Un test que hornea el mundo real pasa de 5 s en Vitest → subir el timeout de ESE test (`it(..., 60000)`), no el global.
- [general] Pixel art de montaña: sombreado continuo + tramado se lee borroso; usar bandas duras por rampa, tono mínimo (el más oscuro de roca/piedra es casi tinta → «rayas negras») y limpieza morfológica de regiones pequeñas.
- [general] Pantallas con zoom de Windows/Chrome: el factor entero hay que calcularlo en píxeles FÍSICOS (k/devicePixelRatio), no en CSS, o el pixel art se ve borroso.
- [general] `render.py`/muestra: la luz sale de la normal del heightfield + sombra proyectada (−2 tonos); la precalculada en rejilla fina (4/tile) es barata, el trazado por píxel no.
- [phaser] Phaser 4: `Phaser.Math.Vector2[]` en `fillPoints` (no Geom.Point); `scale.zoom` acepta fracciones (CSS) con `Scale.NONE`.
- [bash] Windows: en Bash heredocs con `'` o `rm -r` pueden denegarse; escribir tests temporales con Write y borrarlos con `rm -f`.
- [arte] `bytes(numpy.shape)` revienta si un lado > 255 al hashear sprites grandes → usa `str(shape).encode()` (el hash solo ha de ser estable).
- [general] El bench de 60 fps exige ventana con GPU real: en un contenedor sin Xvfb ni GPU no arranca («Target page … has been closed»). Verifica con `npm run shot` y deja el bench para una máquina con GPU.
- [general] Un A* que devuelve null con el destino libre → el destino puede estar en otra componente conexa (el mundo tiene bolsas de tierra aisladas por el agua): comprobar alcanzabilidad con un BFS antes de culpar al A*.
- [general] Las celdas de acceso (puertas) del atlas están FUERA de la huella del edificio → hay que guardarlas en coordenadas absolutas al colocar; buscar `PUERTA` dentro de la huella nunca las encuentra.
