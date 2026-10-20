# Estructuras de la ciudad (R53, R71, R73, R74)

Una ciudad no es casa + templo + mercado. Este es el catálogo de lo que se puede construir y el **modelo común** que siguen todas las estructuras. Los números de balance van a `src/data/edificios.json` + `tuning.json` (P7), con su porqué.

## 1. Modelo común (lo implementa P7 en `logic/sim/edificio.ts`)

Cada estructura tiene los mismos campos; así una ficha (R53) y un sistema sirven para todas:

| Campo | Qué es |
|---|---|
| `huella`, `huellaObra`, `puertas` | Tiles que bloquea (rejilla de ocupación, R50), margen durante la obra, accesos |
| `etapas` | Obra en 6 etapas (R22, boceto D1) con materiales y personas-día por etapa |
| `requisitos` | Dónde se puede poner: sobre un yacimiento (mina, cantera), junto al agua (muelle, molino de agua, pesquero), con acceso a camino, tecnología/era |
| `trabajadores` | Plazas por oficio; sin trabajadores, se detiene y lo dice |
| `produccion` | Entradas → salidas por día y eficiencia (durabilidad, trabajadores, insumos) |
| `almacen` | Capacidad por bien |
| `servicio` | Radio que cubre una necesidad (agua, comida, fe, salud, orden, ocio) para las viviendas dentro |
| `durabilidad` | 0–100, degradación, reparación; < 50 % pierde eficiencia, < 20 % riesgo de colapso |
| `niveles` | Mejora a la siguiente versión (choza → casa de adobe → casa con patio) |
| `efectos` | Sobre el entorno: belleza, ruido, olor, riesgo de incendio, prestigio |

## 2. Catálogo por categorías

Era: **B** = bronce (inicio, Sumer), **H** = hierro (árbol tecnológico, F601). Fase = dónde entra su mecánica.

| Categoría | Estructuras (huella orientativa) | Era | Fase |
|---|---|---|---|
| **Vivienda** | Choza de caña 1×1 → casa de adobe 2×2 → casa con patio 3×2 → villa 3×3 (evolucionan con el hogar) | B | P8, F209 |
| **Agricultura y comida** | Campo de cebada 3×2 (6 etapas de cultivo, D2), huerto y palmeral, granja de ovejas y cabras, pesquero (orilla), molino de agua (grano → harina), panadería, cervecería, granero | B | F107, F109, F202 |
| **Materias primas** | Leñador, cantera de piedra y de mármol, mina (cobre, estaño, plata, oro; hierro y carbón en era H), pozo de arcilla, cañaveral | B/H | F109 (R71, R73) |
| **Talleres** | Adobería, alfar (cerámica, hoces), fundición de bronce (cobre + estaño), herrería (H), carpintería, telar (lana → tela), curtiduría, orfebre (oro, plata), escultor (mármol) | B/H | F109, F202 |
| **Almacenes y transporte** | Almacén central, almacén de barrio, granero, muelle y puerto, caravasar, caminos, puentes | B | F105, F203, F404 |
| **Comercio** | Mercado de comida, de minerales y metales, de telas, de cerámica y de ganado; puesto de mercader extranjero; casa de la plata | B | F203, F301 (R71) |
| **Agua** | Pozo, acequia y canal, dique, noria o shaduf, cisterna, fuente | B | F108 |
| **Religión y saber** | Altar de barrio, templo, zigurat (monumento con muchas etapas), escuela de escribas, archivo de tablillas | B | F210, F602 |
| **Salud y ocio** | Casa del curandero, baños, taberna, plaza | B | F110, F205 |
| **Gobierno y orden** | Palacio del ensi, consejo de ancianos, recaudador, puesto de guardia, prisión | B | F302–F306 |
| **Militar** | Cuartel por tipo (lanceros, infantería pesada, arqueros, honderos), establo (jinetes y carros), campo de tiro, armería, muralla, puerta, torre, fortín | B/H | F501–F506 (R72) |
| **Prestigio** | Estela, estatua, jardín, puerta monumental | B | F606 |

La v0.1 usa solo el núcleo de la aldea: chozas y casas de adobe, campo, granero, almacén, pozo y acequia, pesquero, leñador, pozo de arcilla, adobería, alfar, altar y mercado de comida. El resto entra con su fase.

## 3. Arte

Cada familia nueva sigue §10 del pivote: **boceto aprobado por el usuario → familia completa → 6 etapas de obra → 4 orientaciones**. Cola de D en la bitácora (faltantes L005–L008). Cada edificio debe **contar su función de un vistazo** (sacos y ánforas en el granero, humo y yunque en la herrería, vetas de color en la mina), porque el jugador lee la ciudad mirándola.
