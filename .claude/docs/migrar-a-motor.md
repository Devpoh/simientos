# Migrar un juego web a Godot o Unity

Léelo solo cuando el usuario decida escalar un juego.

## Por qué ya estamos preparados
- `src/logic/` es TypeScript puro: se traduce casi línea a línea a GDScript o C#, y sus tests sirven de especificación.
- `tuning.json` → Godot: `Resource` (`.tres`) o JSON. Unity: `ScriptableObject`.
- Escenas de Phaser → escenas de Godot (`.tscn`) o de Unity. `exponer()` → nodo/autoload de debug.
- Eventos → señales (Godot) / C# events (Unity).

## Herramientas
- **Godot:** MCP `Coding-Solo/godot-mcp` (`claude mcp add godot -- npx @coding-solo/godot-mcp`). Copia las skills `.claude/skill-library/godot/*` a `.claude/skills/`. Para verificar visualmente: `godot --path . --windowed --resolution 1280x720 --write-movie shot.png --quit-after 60 res://escena.tscn`.
- **Unity:** MCP `CoplayDev/unity-mcp`. Skills en `.claude/skill-library/unity/*`.
- Referencia de estructura de estudio para motores: github.com/Donchitos/Claude-Code-Game-Studios

## Proceso
1. `/postmortem` de la versión web (qué funcionó, qué no).
2. Nuevo roadmap: F01 portar la lógica con tests → F02 escena mínima → … No se porta todo de golpe.
