---
name: explicar
description: Explica un concepto de desarrollo de videojuegos (delta time, game loop, máquina de estados, colisiones, coyote time, pooling, shaders…) usando el código del juego activo como ejemplo. Úsala cuando el usuario pregunte qué es algo, por qué se hace así o pida que le enseñes.
argument-hint: "<concepto o pregunta>"
---

# Explicar un concepto de gamedev

El usuario sabe programar y es nuevo en gamedev. Explica de programador a programador: sin infantilizar y sin jerga sin definir.

1. Busca con `Grep` dónde aparece el concepto en el juego activo (o en la plantilla). Un ejemplo real vale más que uno inventado.
2. Responde en este formato breve (10–20 líneas):
   - **Qué es**, en 1–2 frases.
   - **Por qué existe:** qué se rompería sin él, con un ejemplo concreto.
   - **Dónde está en tu juego:** `archivo:línea` y un fragmento de 3–8 líneas.
   - **Cómo se ve en Godot o Unity** (1 línea, para cuando migremos).
   - **Para profundizar:** 1 recurso (artículo o charla de GDC conocida). Solo si estás seguro de que existe.
3. Regístralo para el panel: `node studio/bitacora.mjs aprende '{"concepto":"…","explicacion":"resumen de 2 frases"}'`.
