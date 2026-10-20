---
name: nuevo-juego
description: Crea un juego nuevo. De la idea sale un brief de una página, se monta desde la plantilla verificada (Phaser 2D) y se registra en la bitácora.
argument-hint: "[idea, género o 'sorpréndeme']"
disable-model-invocation: true
---

# Nuevo juego

Esta skill **sí es conversacional**: el usuario está presente. Pocas preguntas, bien elegidas.

## 1. Concepto
- Con la pista del usuario, propón **3 conceptos de una línea** con `AskUserQuestion`. Cada uno lleva el verbo principal, el gancho. Ajusta el alcance a un principiante: el primer juego se termina en 10–20 fases. Sugiere 2D salvo que la idea lo pida en 3D.
- Revisa `studio/ideas.md` por si hay ideas guardadas que encajen.

## 2. Brief
- Rellena `.claude/docs/plantillas/brief.md` a partir de la conversación. Propón tú los campos y no hagas una pregunta por campo.
- Si el MVP pasa de 7 puntos, recórtalo y explica por qué.
- Enseña el brief completo una vez y aplica los ajustes que pida el usuario.

## 3. Montar (desde la raíz, con el Bash tool)
```bash
SLUG=<kebab-case>; T=phaser-ts
cp -r templates/$T games/$SLUG && cd games/$SLUG
sed -i "s/{{SLUG}}/$SLUG/g; s/{{NOMBRE}}/<Nombre>/g; s/{{PITCH}}/<pitch>/g" package.json index.html CLAUDE.md
npm install --no-audit --no-fund --loglevel=error && npm run check 2>&1 | tail -n 5 && npm run shot -- --sin-captura
```
- Guarda el brief en `games/$SLUG/docs/brief.md`.
- Bitácora: `usar $SLUG` → `juego '{"nombre","pitch","motor":"Phaser 4","genero","pilares":[…]}'`.
- Si el género tiene skill en `.claude/skill-library/genres/` (platformer, roguelike, puzzle, tower-defense, rpg, card-game, …), cópiala a `.claude/skills/` y anótalo con `nota`.
- Commit: `chore(<slug>): crear juego desde plantilla <T>`.

## 4. Siguiente paso
Ejecuta `/roadmap` directamente (lee `.claude/skills/roadmap/SKILL.md`) y dile al usuario:
- El panel: `npm run panel` → http://localhost:4400
- Para jugar: `cd games/<slug> && npm run dev`
- Para dejarlo trabajando: `/autopiloto`
