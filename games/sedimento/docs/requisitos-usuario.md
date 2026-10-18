# Requisitos del usuario (no negociables sin preguntarle)

Lo que el usuario ha pedido explícitamente. **Toda sesión que trabaje en SEDIMENTO lo respeta.** Si una fase choca con algo de esta lista, para y pregunta a la sesión A, que lo consulta con el usuario. Cada vez que el usuario pida algo nuevo, se añade aquí con su fecha.

| # | Fecha | Requisito | Dónde se concreta |
|---|---|---|---|
| R1 | 2026-10-18 | **Visión completa del prompt maestro y del anexo creativo** (civilización viva, economía física, sociedad con intereses, historia emergente, presión creciente). Los 5 pilares son suyos. | `vision.md`, `gdd/README.md` |
| R2 | 2026-10-18 | **El progreso tiene que sentirse bien, pero el jugador nunca debe estar cómodo.** Si comete errores, debe sentir presión; si se acomoda, el juego se vuelve repetitivo. | `gdd/README.md` §15, `gdd/simulacion.md` §2 y su test de no comodidad |
| R3 | 2026-10-18 | **Lanzamiento por versiones.** Primero un juego completo y jugable en pocas semanas, y después actualizaciones hasta la 1.0. No todo de golpe. | `versiones.md` |
| R4 | 2026-10-18 | **Nombre: SEDIMENTO.** No debe parecer una copia de «Imperium». | `brief.md` |
| R5 | 2026-10-18 | **Dureza: exigente pero justa.** Se puede perder en el año 2 o 3 si se ignoran canales y reservas, pero las crisis siempre se anuncian. | `brief.md`, bandas de balance |
| R6 | 2026-10-18 | **Más bonito, más parecido a Civilization VI:** mapa de **hexágonos en 3D low-poly** con relieve, luz y agua animada. | `brief.md`, `gdd/README.md` §4 y §18 |
| R7 | 2026-10-18 | **Combate por turnos al estilo Civ, dentro de un mundo en tiempo real:** las batallas tácticas son por turnos y la campaña es en tiempo real. | `gdd/README.md` §11, `versiones.md` v0.5 |
| R8 | 2026-10-18 | **El mapa tiene todo lo que tiene un mapa real:** montañas, árboles, ríos, lagos, mares… | `gdd/mapa.md` |
| R9 | 2026-10-18 | **El mapa siempre es aleatorio** para que no sea repetitivo: cada partida nueva genera un mapa distinto. | `gdd/mapa.md` §1 |
| R10 | 2026-10-18 | **Todos los biomas que existen de verdad** (tundra, tropical, desierto…) **con un orden lógico claro.** | `gdd/mapa.md` §3–4 |
| R11 | 2026-10-18 | **Trabajo con sesiones A, B y C** (Opus 5.5 alto, Sonnet 5.5 alto, Sonnet 5 medio). Se delega solo lo que el rol puede hacer bien. | `/.claude/docs/sesiones.md` |
| R12 | 2026-10-18 | **Seguir siempre las reglas de las skills** (protocolo `/fase`, verificación) **y revisarlo todo:** en cada cambio visible se saca una captura, se mira y se corrige. Es un bucle constante: **los gráficos se pulen fase a fase**, no se dan por terminados. | `/.claude/skills/fase/SKILL.md` §4, `.claude/docs/sesiones.md` (A revisa cada entrega con captura) |
| R13 | 2026-10-18 | **Mejorar mucho la animación del agua: ríos, costas, etc.** Los ríos fluyen corriente abajo, la costa tiene espuma y oleaje, y el agua se ve continua y refleja el cielo. | Fase F01c «Agua viva», `src/render/agua.ts` |
| R14 | 2026-10-18 | **Montañas menos básicas, y el agua y los árboles tienen que verse bien también de cerca** («el agua está top», pero de cerca le falta algo). Revisar todo de nuevo. | F01c (agua de cerca), F01d «Montañas» (A), F01b (árboles, B) |
| R15 | 2026-10-18 | **Cámara totalmente libre:** moverse por todos los ejes e ir a cualquier sitio del mapa (desplazar sin límites rígidos, girar, inclinar, zoom hacia el cursor). El juego entero tiene que pulirse mucho; el usuario deja trabajar en autónomo y espera encontrarlo mucho mejor. | F02b «Cámara libre» |
