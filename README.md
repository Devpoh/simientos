# Estudio de juegos

Juegos web (Phaser 4 para 2D, three.js para 3D) desarrollados con Claude Code en fases pequeñas y verificadas.

## Uso diario
1. Abre Claude Code **en esta carpeta** (`D:\Proyectos GC`). Si lo abres en otra, no se cargan las reglas ni los hooks.
2. En otra terminal: `npm run panel` → http://localhost:4400 (se actualiza solo).
3. Comandos:
   - `/nuevo-juego` — idea → brief → juego creado → roadmap
   - `/autopiloto` — lo dejas trabajando; revisa el panel al volver
   - `/fase` — avanza una sola fase
   - `/playtest`, `/carencias`, `/bug …`, `/explicar …`
4. Para jugar tú: `cd games/<slug>` y `npm run dev`.

## Para sesiones largas sin supervisión
- Activa el **modo auto** (Shift+Tab) para que Claude no se pare a pedir permisos.
- Los permisos de `.claude/settings.json` ya permiten npm, node y git local, y prohíben push, reset, borrados recursivos y `.env`.

## Estructura
```
CLAUDE.md               reglas del estudio (se cargan siempre; texto corto)
.claude/rules/          reglas por carpeta (se cargan solo al tocar esos archivos)
.claude/skills/         comandos del estudio + skills de Phaser, three y diseño
.claude/skill-library/  skills inactivas (géneros, Godot, Unity, Game Studios) — 0 tokens
.claude/agents/         disenador · qa-tester · revisor-codigo
.claude/hooks/          estado al iniciar sesión · typecheck antes de terminar
studio/                 bitácora (CLI), panel, aprendizajes, banco de ideas
templates/              plantillas verificadas phaser-ts y three-ts
games/<slug>/           cada juego (con su propio CLAUDE.md y docs/estado.json)
prototypes/             experimentos desechables
```
