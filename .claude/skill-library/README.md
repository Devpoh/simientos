# Biblioteca de skills inactivas

Nada de esta carpeta se carga en el contexto, así que no gasta tokens. Cuando un juego lo necesite, **copia** la skill a `.claude/skills/` (o el agente a `.claude/agents/`) y regístralo con `nota`.

| Carpeta | Origen | Contenido |
|---|---|---|
| `genres/` | awesome-gamedev-agent-skills (Apache-2.0) | platformer, roguelike, puzzle, tower-defense, rpg, card-game, fps-shooter, survival-crafting, visual-novel |
| `disciplines/` | ídem | game-ai, behavior trees, dialogue, physics-tuning, procedural-gen, shaders, pixijs |
| `workflows/` | ídem | game-jam, prototype-fast, itch-publish, steam-publish |
| `godot/`, `unity/` | ídem | para cuando migremos (ver `.claude/docs/migrar-a-motor.md`) |
| `ccgs/` | Claude-Code-Game-Studios (MIT) | 17 agentes de diseño y producción + 18 skills (scope-check, balance-check, design-review, art-bible, ux-design, perf-profile, launch-checklist…) |

## Antes de activar algo de `ccgs/` (importante)
Las piezas de CCGS asumen su propia infraestructura. **No las copies tal cual**, adáptalas:
- Quita el protocolo "May I write…?" y las esperas de aprobación: aquí se trabaja en autónomo y se registra en la bitácora.
- Sustituye `project.yaml`, `yaml-helper.sh`, `resolve_config`, director gates y `production/…` por nuestras rutas (`games/<slug>/docs/`, `studio/bitacora.mjs`).
- Las rutas `design/gdd/` pasan a ser `games/<slug>/docs/gdd/`.
- Recorta a lo esencial. Su conocimiento de dominio es oro, pero su proceso es para un equipo de 49 agentes.

Candidatas a activar según la etapa:
- Contenido y balance: `balance-check`, `scope-check` y el agente `economy-designer`
- Arte: `art-bible`, `asset-spec` y el agente `art-director`
- Lanzamiento: `launch-checklist`, `patch-notes` + `workflows/itch-publish`
