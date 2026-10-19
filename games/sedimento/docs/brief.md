# SEDIMENTO — Brief (v0.1 «La aldea junto al río»)

**Pitch (1 frase):** Gobierna una ciudad-estado sumeria viva en un paisaje continuo en tiempo real: construyes donde quieras, ves cómo se levanta cada edificio y cada cosecha, cada ley y cada crecida tienen consecuencias que se propagan por toda la sociedad.
**Referencias** (principios, no copias):
- **Tropico 6 y Anno:** construcción libre y progresiva, y la cámara.
- **Songs of Syx:** población y logística física: los bienes viajan a hombros y todo se puede inspeccionar.
- **Frostpunk:** presión constante y decisiones duras.
- **Civilization VI:** solo la escala estratégica (civilizaciones, diplomacia). **No** su tablero de casillas: la construcción va sobre terreno continuo (R20 y R21).

**Motor:** three.js + TypeScript estricto + Vite. La lógica pura en `src/logic/`, con tests, se puede portar a Godot o Unity (GDD §12). El **estilo visual está por decidir** en el Art Direction Lab (`gdd/arte.md`). Mientras tanto el juego usa un render provisional.
**Nombre:** **SEDIMENTO**, elegido por el usuario; IMPERIUM es el nombre de trabajo de sus textos. El limo del río da vida a Sumer y también colmata sus canales; las civilizaciones son capas que se acumulan y se entierran.
**Textos fuente del usuario:** `docs/prompts/` (literales; mandan sobre este brief).

## Fantasía del jugador
Eres el *ensi* de una ciudad-estado junto al Éufrates. Eliges dónde levantar cada casa sobre el terreno, trazas los caminos, repartes la cebada del templo, cavas canales y decides quién come cuando la crecida falla. Sabes que el éxito de este año es el problema del siguiente.

## Pilares (3 como máximo)
1. **Todo es físico y trazable.** Ningún recurso aparece de la nada y ningún edificio aparece terminado. Cada grano y cada adobe se produce, se acarrea y se coloca, y cualquier problema se rastrea hasta su causa.
2. **Crecer aprieta.** Cada mejora trae su coste: más canales que mantener, más salinidad, más bocas y expectativas más altas. Nunca hay un estado estable y cómodo.
3. **La ciudad cuenta su historia.** Una ciudad orgánica que nace de su geografía; los hogares recuerdan y la crónica registra causas y consecuencias.

## Bucle central
1. **Observar:** el terreno (fertilidad, agua, riesgo de crecida), las reservas en días y los hogares descontentos.
2. **Decidir:** dónde construir y por dónde va cada camino, qué mantener, a qué asignar el trabajo y cuánto repartir.
3. **Esperar** en tiempo real (con pausa) mientras la ciudad ejecuta: los trabajadores llevan material a las obras y estas suben por etapas.
4. **Leer las consecuencias** (cosecha, salinidad, ánimo y crónica) y ajustar.

## Objetivo y derrota
- **Progresa** por hitos: aldea (≥ 60 hab.) → pueblo (≥ 150) → ciudad (≥ 300 y templo). La v0.1 se gana sosteniendo la **ciudad 3 años seguidos**. Hay además una puntuación de *legado*.
- **Pierde** cuando la ciudad se abandona: menos de 15 habitantes por hambre, enfermedad o emigración.

## MVP (7 puntos)
1. **Terreno continuo procedural, distinto en cada partida:** semilla visible y reutilizable; colinas, valles, 1–2 ríos con cauce y crecida, lagos, delta con marisma, playas, montañas y biomas lógicos por clima. Sin hexágonos visibles. Ver `gdd/mapa.md`.
2. **Construcción libre y progresiva:** edificios con posición y giro libres sobre el terreno; obras que pasan por plano → preparación → cimientos → estructura → cubierta → terminado según trabajadores, materiales y tiempo; caminos trazados con curvas. Ver `gdd/construccion.md`.
3. **Habitantes visibles** agrupados en hogares, con trabajo y tareas (acarrear, cultivar, construir) y rutas por el terreno y los caminos.
4. **Economía de templo sin dinero:** cebada, dátiles y pescado → almacén → raciones. Adobe y cañas para construir. Hoces de arcilla que se gastan.
5. **Estaciones y crecida** variable con pronóstico; canales, diques, salinización y colmatación.
6. **Necesidades y bienestar** por hogar, con memoria y expectativas que suben. El hambre trae enfermedad y emigración; la prosperidad, inmigración.
7. **Legibilidad:** inspector «¿por qué?» de cada punto del terreno, edificio, obra u hogar; reservas en días; crónica con causas. Cámara de estrategia cómoda (`gdd/camara.md`).

## Fuera de alcance en v0.1
- Dinero, mercado y precios (v0.3) · clases y facciones completas (v0.2–v0.3) · leyes (v0.3).
- Rivales, diplomacia y comercio (v0.4) · guerra (v0.5) · progresión (v0.6) · otras civilizaciones (v0.7) · mitología (v0.8) · migración de motor (decisión en v0.9).
- Guardar y cargar (v0.2).

## Orden de trabajo (19-10, `estado.json`)
1. **Dirección artística:** auditoría → catálogo de recursos → Art Direction Lab → escenas comparativas (fases A1–A4).
2. **Prototipos de base:** terreno continuo (A5) y construcción libre y progresiva (A6), en paralelo con la **cámara** (C1–C6).
3. **Elección del estilo** con evidencia, junto al usuario (A7), y su documentación (A8).
4. Después: el juego v0.1 sobre esa base (habitantes y logística, agricultura y crecida, necesidades, inspector y crónica, cierre).

## Arte y audio
- **Arte:** se decide en el laboratorio comparando A (low-poly), B (3D con texturas), C (pixel art isométrico) y D (un híbrido, solo si está justificado). La hipótesis inicial del usuario es A con terreno continuo. En cualquier estilo, la paleta va de adobe y tierra cálidos, con el verde de regadío y la luz de tarde, y lo primero es que se lea bien.
- **Audio:** ambiente de río, viento e insectos; herramientas en las obras; un laúd y percusión sobria que se tensa cuando bajan las reservas.
