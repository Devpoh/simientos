# Progresión: el imperio se construye desde cero (R77)

> **Regla de oro:** nada empieza en su mejor versión. Cada cosa del juego (casas, almacenes, caminos, herramientas, soldados, templos, defensas, gobierno, transporte) tiene **niveles**, y cada nivel se gana con **material + conocimiento + necesidad**. La ciudad de la hora 5 no se parece a la del minuto 5, y en ella se ve todo el camino recorrido.
> Manda sobre `estructuras.md` (que da el catálogo) y sobre cualquier fase que coloque edificios «ya terminados».

## 1. Por qué (lo que buscamos que sienta el jugador)

- **Origen humilde:** empiezas con 6–8 familias, una hoguera, cestos, herramientas de piedra y madera, y provisiones para unas semanas. Lo primero que construyes son chozas.
- **Cada mejora se nota y se ha ganado:** cuando aparece la primera casa de adobe o el primer lancero con punta de cobre, el jugador recuerda lo que costó (la arcilla, la adobería, el excedente de comida).
- **La ciudad cuenta su historia** (pilar 3): conviven barrios de chozas, calles de adobe y un centro de ladrillo. Leyendo la ciudad se ve qué se hizo primero.
- **Crecer aprieta** (pilar 2): cada nivel cuesta más mantenimiento y abre necesidades nuevas. Mejorar nunca es gratis.

## 2. Las cuatro puertas de cada nivel

Para que algo pase al nivel N hacen falta **las cuatro**, y la UI dice siempre cuál falta («Falta: 40 adobes · Requiere: Alfarería · Faltan 2 de 3 servicios»):

| Puerta | Qué es | Ejemplo (choza → casa de adobe) |
|---|---|---|
| **Material** | Bienes **físicos** en el almacén, llevados a la obra por porteadores | 40 adobes + 20 haces de caña + 10 de madera |
| **Conocimiento** | Tecnología o era alcanzada (árbol F601) | «Ladrillo de barro» (era 1) |
| **Necesidad** | El hogar o la institución lo «pide»: servicios cubiertos y prosperidad | Agua a ≤ 8 tiles, comida 2 tipos, altar a ≤ 15 tiles |
| **Trabajo** | Manos y tiempo: la mejora es una **obra** con etapas | Etapas 4–6 de la obra de adobe, ~6 personas-día |

Reglas que no se rompen:
1. **Sin saltos:** el nivel N exige que exista el N−1 (no hay casa de piedra sin haber tenido adobería, ni bronce sin cobre).
2. **Mejora en el sitio:** se construye encima de lo que hay, con las etapas 4–6 del nivel nuevo; la familia sigue viviendo dentro con menos comodidad.
3. **Puede retroceder:** sin mantenimiento (material) o con las necesidades sin cubrir N días, baja de nivel. Visible y avisado antes (crisis anunciadas, R5).
4. **Conviven niveles:** la ciudad mezcla niveles; el jugador decide dónde invertir.
5. **Nada aparece «de regalo»:** ni misiones ni eventos dan edificios de nivel alto terminados.

## 3. Eras (el conocimiento que abre cada escalón)

| Era | Nombre | Materiales que se abren | Se alcanza con | Ritmo objetivo |
|---|---|---|---|---|
| 0 | **Campamento** | Madera, paja, caña, barro crudo, piedra tallada, hueso, pieles | Inicio de partida | 0–25 min |
| 1 | **Aldea** | Adobe (barro secado), cerámica, cobre nativo, lino | 15 familias + granero + alfar descubierto | 25 min – 2 h |
| 2 | **Ciudad** | Bronce (cobre + estaño), ladrillo cocido, teja, piedra labrada, escritura | 60 familias + templo + escuela de escribas + estaño (mina o comercio) | 2 – 5 h |
| 3 | **Imperio** | Hierro, carbón, mármol, plata acuñada | 200 familias + herrería + mina de hierro + carbón | 5 h + |

El hierro y el carbón solo se pueden explotar en la era 3, aunque el yacimiento se vea antes (R73): saber que está ahí crea un objetivo.

## 4. Escalas por familia (todo tiene su progresión)

| Familia | Era 0 | Era 1 | Era 2 | Era 3 |
|---|---|---|---|---|
| **Vivienda** | Choza redonda de ramas y paja (1×1) → choza de troncos y barro con techo de paja (2×2) | Casa de barro sin enlucir, esquinas redondeadas y grietas, **techo de paja o de troncos y ramas** a dos aguas | Casa de ladrillo o piedra con teja (los sprites actuales) → casa con patio | Villa de piedra y mármol |
| **Almacén** | Montón al aire con cestos → cobertizo de postes con techo de paja | Almacén de barro con techo de paja o de troncos (boceto aprobado) + granero | Almacén de adobe enlucido con azotea (el diseño anterior, R82) → almacén de ladrillo | Gran almacén y puerto |
| **Caminos** | Senda (se forma sola al pisar) | Camino de tierra apisonada | Empedrado | Calzada con drenaje |
| **Herramientas** | Piedra y madera | Cobre (+ rendimiento) | Bronce | Hierro |
| **Producción** | Recolector, cazador, pescador con red | Campo, adobería, alfar, telar simple | Molino, horno de ladrillo, fundición de bronce, cervecería | Herrería, cantera de mármol, orfebre |
| **Comercio** | Trueque en la hoguera | Puesto de mercado (comida) | Mercados por tipo (comida, metales, telas, cerámica) | Casa de la plata, mercaderes extranjeros |
| **Religión** | Altar de piedras | Santuario de adobe | Templo → zigurat | Gran templo de mármol |
| **Gobierno** | Jefe de clan (hoguera comunal) | Consejo de ancianos | Ensi (palacio) | Rey (palacio real), leyes escritas |
| **Defensa** | Empalizada de madera | Muro de adobe | Muralla de ladrillo con torres | Muralla de piedra, puertas monumentales |
| **Militar** | Milicia: garrote, honda y arco de caza, sin armadura | Lancero con punta de cobre y escudo de mimbre; arquero con arco simple; hondero | Infantería pesada de bronce, arquero con arco compuesto, carro de onagros | Infantería de hierro, jinete, máquinas de asedio |
| **Cuartel** | Claro de entrenamiento | Cuartel de adobe | Cuartel de ladrillo + campo de tiro | Cuartel de piedra + establo |
| **Transporte** | A hombros | Cestos y yugos, balsa de cañas | Carro de bueyes u onagros, barca de vela | Barco mercante, caravana |

Un soldado sube de nivel como una casa: necesita su **material** (armas de la herrería), su **conocimiento**, un **cuartel del nivel** y **tiempo de entrenamiento**. Los veteranos ganan experiencia, pero no cambian de equipo sin material nuevo.

**Cómo se ve cada era (R80):** era 0–1 = materiales del entorno, sin acabar. Paja, ramas, troncos sin escuadrar, barro a mano, cuerdas, pieles; formas irregulares y redondeadas; **nunca teja, sillar, enlucido liso, ventanas con marco ni puertas de tablas**. La teja y el muro recto y limpio son la señal visual de la era 2: si una casa de era 1 se parece a la de era 2 con otro color, está mal.

## 5. Datos y comprobación

- `src/data/edificios.json` y `unidades.json`: cada entrada lleva `familia`, `nivel`, `era`, `requiere` ({materiales, tecnologia, necesidades, anterior}) y `mantenimiento`. Una sola función pura, `puedeMejorar(cosa, estado) → { ok, faltan[] }`, alimenta la UI y la IA.
- **Tests obligatorios:** no se puede saltar un nivel; sin material no empieza la obra; sin mantenimiento retrocede; una partida simulada con semilla llega a la era 1 en 20–30 min de juego (balance en `tuning`).
- **Arte:** cada nivel es un sprite propio con sus etapas de obra; el boceto de cada familia nueva lo aprueba el usuario (§10 del pivote). Prioridad de arte: **era 0 y 1 antes que nada nuevo de era 2–3**, porque la partida empieza ahí.

## 6. Errores de diseño que evitamos

- **Niveles muertos:** un nivel que nadie construye porque el siguiente sale casi igual de caro. Cada nivel tiene que aportar algo nuevo (capacidad, servicio o unidad), no solo más números.
- **Puertas invisibles:** si el jugador no sabe qué le falta, se frustra. La ficha (R53) y la vista previa (R21) dicen siempre qué falta y dónde conseguirlo.
- **Muros de material:** si un material depende de un solo yacimiento lejano, siempre hay otra vía (comercio, sustituto peor).
- **Todo de golpe:** cada era abre pocas cosas y bien explicadas; el resto llega con los hitos (F116).
