---
paths:
  - "games/*/docs/**/*.md"
---

# Documentos de diseño

- `docs/brief.md` es la fuente del concepto (plantilla: `.claude/docs/plantillas/brief.md`). Cambiar pilares o el bucle central es una decisión del usuario: proponla como `reco` y no la apliques por tu cuenta.
- Haz un GDD (`docs/gdd/<sistema>.md`, plantilla `gdd.md`) **solo** para sistemas con reglas o números que se van a balancear (combate, economía, progresión). Para lo demás basta con los criterios de la fase.
- Prohibido especificar con frases vagas: "debe sentirse bien" no es un criterio. Los criterios deben poder comprobarse con `check`, con el estado de `shot` o con una captura.
- Los valores de balance indican de dónde salen (fórmula o razón), y sus rangos seguros se documentan junto a `tuning.json`.
- Documentos breves: una pantalla mejor que diez.
