# SEDIMENTO — Brief (v0.1 «La aldea junto al río»)

**Pitch (1 frase):** Gobierna una ciudad-estado sumeria viva en un mundo hexagonal en tiempo real: cada cosecha, cada ley y cada crecida tienen consecuencias que se propagan por toda la sociedad.
**Referencia:** Civilization VI (mapa hexagonal 3D estilizado, «mapa vivo», barrios que se colocan en hexágonos) + Songs of Syx (población y logística física) + Frostpunk (presión constante y decisiones duras). De Songs of Syx tomamos el ~10 % de «los bienes se mueven a hombros y todo se puede inspeccionar». De Frostpunk, el «el entorno aprieta más cada año y crecer cuesta». De Civ 6, la belleza del tablero de hexágonos y la importancia de la ubicación.
**Motor:** three.js (3D low-poly sobre hexágonos). Sin artista, la geometría low-poly generada por código y bien iluminada es lo más bonito que podemos conseguir. `InstancedMesh` permite miles de hexágonos y habitantes. La lógica pura en `src/logic/` es portable a Godot o Unity (ver GDD §12).
**Nombre:** **SEDIMENTO** (elegido por el usuario; IMPERIUM era el provisional). El limo del río da vida a Sumer y también colmata sus canales; las civilizaciones son capas que se acumulan y se entierran.

## Fantasía del jugador
Eres el *ensi* de una ciudad-estado junto al Éufrates. Repartes la cebada del templo, cavas canales y decides quién come cuando la crecida falla, sabiendo que el éxito de este año es el problema del siguiente.

## Pilares (3 como máximo)
1. **Todo es físico y trazable.** Ningún recurso aparece de la nada: cada grano se cultiva, se acarrea, se almacena y se reparte. Cualquier problema se puede rastrear hasta su causa con un clic.
2. **Crecer aprieta.** Cada mejora trae su propio coste: más canales que mantener, más salinidad, más bocas y expectativas más altas. Nunca hay un estado estable y cómodo.
3. **La ciudad cuenta su historia.** Los hogares recuerdan, la crónica registra causas y consecuencias, y cada partida es un relato distinto.

## Bucle central
1. Observar: reservas en días, pronóstico de la crecida, hogares descontentos.
2. Decidir: construir o mantener canales, asignar trabajo, repartir raciones.
3. Esperar en tiempo real (pausable) a que la ciudad ejecute: los habitantes acarrean, construyen y cultivan.
4. Leer las consecuencias (cosecha, salinidad, ánimo y crónica) y ajustar.

## Objetivo y derrota
- **Progresa** cuando la aldea alcanza hitos: aldea (≥ 60 hab.) → pueblo (≥ 150) → ciudad (≥ 300 y templo). La partida v0.1 se gana al sostener la **ciudad durante 3 años seguidos**. Además hay una puntuación de *legado*.
- **Pierde** cuando la ciudad se abandona (menos de 15 habitantes por hambre, enfermedad o emigración).

## MVP (7 puntos)
1. Mapa procedural **distinto en cada partida** (semilla aleatoria, reutilizable): 1–2 ríos con crecida, lagos, marismas, mar, montañas, palmerales, bosques y cañaverales, con **biomas lógicos según el clima** (del desierto del valle a la nieve de las cumbres) y fertilidad y salinidad por hexágono, en 3D con relieve. Ver `gdd/mapa.md`.
2. Construcción por etapas: cimientos → materiales acarreados → trabajo → terminado. Las obras se detienen si faltan materiales o brazos.
3. Habitantes visibles agrupados en hogares, con trabajo y tareas (acarrear, cultivar, construir), y rutas por el terreno.
4. Economía de templo sin dinero: cebada, dátiles y pescado → almacén → raciones. Adobe y cañas para construir. Hoces de arcilla que se gastan.
5. Estaciones (siembra en otoño, cosecha en primavera) y crecida variable con pronóstico. Canales, diques, salinización y colmatación.
6. Necesidades y bienestar por hogar con memoria y expectativas que suben. Hambre → enfermedad y emigración. Prosperidad → inmigración.
7. Legibilidad: inspector «¿por qué?» de hexágono, edificio u hogar; reservas en días; y crónica de acontecimientos con causas.

## Fuera de alcance en v0.1 (llega en versiones posteriores)
- Dinero, mercado y precios (v0.3) · clases sociales completas y facciones (v0.2–v0.3) · leyes (v0.3)
- Ciudades rivales, diplomacia y comercio (v0.4) · guerra con batallas tácticas por turnos (v0.5) · árboles de progresión (v0.6)
- Otras civilizaciones (v0.7) · mitología (v0.8) · migración de motor (decisión en v0.9)
- Guardar y cargar partida (v0.2)

## Orden de construcción
1. Núcleo de simulación headless (reloj, hogares, almacén, raciones), con tests.
2. Mapa hexagonal 3D bonito desde el primer día (es un riesgo: si no enamora, se corrige pronto), cámara de estrategia y habitantes que caminan.
3. Construcción por etapas y logística de acarreo.
4. Agricultura, estaciones y crecida, que es la fuente principal de presión.
5. Salinidad, colmatación, necesidades y demografía.
6. Inspector, crónica, victoria y derrota.
7. Cierre: bucle completo, game feel, audio, menús, onboarding y rendimiento.

## Dirección de arte y audio
- **Arte:** diorama low-poly de sombreado plano sobre hexágonos con relieve. Adobe y tierra cálidos, verde intenso de regadío, agua turquesa animada, luz dorada de tarde con sombras suaves. Los campos cambian de color con las estaciones y la crecida sube visiblemente. Legible primero y bonito después, pero bonito siempre.
- **Audio:** ambiente de río, viento e insectos; herramientas en las obras; un laúd y percusión sobria que se tensa cuando bajan las reservas.
