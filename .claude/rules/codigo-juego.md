---
paths:
  - "games/*/src/**"
  - "templates/*/src/**"
---

# Código de juego

- **Lógica ≠ presentación.** Las reglas (puntuación, daño, IA, estados, generación) viven en `src/logic/` como funciones o clases puras, sin importar el motor. La escena solo lee input, llama a la lógica y dibuja.
- **Sin números mágicos.** Velocidades, tiempos, daños, probabilidades y tamaños van en `src/data/tuning.json`. La excepción son los valores de layout trivial, como un margen de UI.
- **Independencia de los FPS.** Todo movimiento o temporizador usa delta en segundos. Para suavizar se usa `1 - Math.exp(-k * dt)`, no un `lerp` con factor fijo.
- **Máquinas de estado explícitas** para jugador, enemigos y flujo de partida: un tipo unión de estados y transiciones en un solo sitio. Nada de cinco booleanos sueltos.
- **Comunicación por eventos** entre sistemas (por ejemplo, UI ↔ gameplay). La UI nunca modifica el estado del juego directamente.
- **Limpieza:** todo listener, timer o tween que crees se destruye al salir de la escena o del nivel. Las fugas aparecen al reiniciar la partida, así que pruébalo.
- **Pools** para objetos que se crean y destruyen a menudo (balas, partículas, monedas).
- **Testabilidad:** cada estado relevante para verificar una fase se expone con `exponer('clave', () => valor)`. La escena jugable llama a `marcarListo()` en su primer frame.
- **Aleatoriedad:** si un sistema usa azar y necesita tests, recibe la función de RNG por parámetro (con semilla en los tests).
- Comentarios solo para el *porqué* que no es obvio. Si es un concepto de gamedev nuevo para el usuario, regístralo con `aprende`.
