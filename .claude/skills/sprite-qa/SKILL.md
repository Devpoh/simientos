---
name: sprite-qa
description: Control de calidad de sprites de pixel art. Úsala cada vez que generes o cambies un sprite, un atlas o una hoja (tools/arte-pixel), antes de entregarlo o de hacer commit.
argument-hint: "[carpeta o archivo.png] (por defecto, el atlas del juego)"
---

# sprite-qa

Comprobación automática más mirada humana (R12). Un sprite no se entrega sin las dos.

## Pasos
1. Si cambiaste un generador o el catálogo: `cd games/sedimento && npm run arte`.
2. Valida: `python tools/arte-pixel/validar.py [carpeta|archivo.png]` (sin argumento valida `public/recursos/pixel/`; también `npm run arte:verificar`). Sale con código ≠ 0 si hay errores.
   Comprueba: colores fuera de los 59 de la paleta, alfa limpio (solo 0 o 255), ampliación entera exacta (x2 y x4; y la escala de un PNG que se llame `*-x4`), píxeles sueltos aislados, ancla de pies sobre la fila inferior del dibujo (detecta sprites flotantes o hundidos), fotogramas dentro del atlas sin solaparse y referencias resueltas.
3. **Mira la hoja de contacto** con `Read`: `tools/arte-pixel/salida/contacto.png` (x4, sobre el color del terreno; cruz roja = ancla, rombo magenta = huella). Para revisar todas las poses, orientaciones y etapas (no solo la principal), genera `python tools/arte-pixel/exportar.py --salida <carpeta temporal> --vista <carpeta temporal>` y abre `cat-<categoría>-x4.png`.
4. Repasa la lista de aceptación de `.claude/docs/pivote-pixel-art.md` §10 (tejados con ambos faldones, cargas ancladas a las manos, oficios distinguibles, espacio entre estructuras, bucles cerrados…).
5. Corrige y repite. Si un fallo enseña algo reutilizable, una línea en `studio/aprendizajes.md`.

## Reglas
- Nunca subas un color a la paleta (máx. 64) sin permiso de A. No cambies el estilo aprobado.
- No silencies ni relajes una comprobación para ponerla en verde: arregla el sprite o el catálogo.
- Los errores no triviales van a la bitácora (`error`: síntoma → causa → solución).
