# GDD — Mapa, clima y biomas

> Requisitos del usuario que cubre: **R8** (todo lo que tiene un mapa real), **R9** (siempre aleatorio) y **R10** (todos los biomas, con un orden lógico). Ver `../requisitos-usuario.md`.
> Código: `src/logic/mapa.ts`, `src/logic/clima.ts`, `src/logic/hex.ts`. Números: `src/data/tuning.json` → `mapa` y `clima`.

## Resumen
Cada partida genera un valle nuevo de hexágonos: montañas, colinas, llanura aluvial, uno o dos ríos que bajan al mar, lagos, marismas, palmerales, bosques y cañaverales. El **bioma** de cada hexágono no se pinta a mano: sale de un **modelo climático** (temperatura y lluvia), así que las zonas siempre siguen un orden natural.

## 1. Siempre aleatorio, pero reproducible (R9)
- **Cada partida nueva usa una semilla aleatoria** (generada al pulsar «Nueva partida»). Dos partidas seguidas nunca comparten mapa.
- La semilla se **muestra** en la partida y se puede **reutilizar** para repetir un mapa: compartirlo, reproducir un bug o comparar estrategias. El campo para escribirla llega en la fase de menús (F19).
- Los tests y `shot` fijan la semilla con `?semilla=N` en la URL o con `tuning.mapa.semilla`. Así el azar no rompe la verificación.
- **Qué cambia entre semillas** (además del relieve fino): la anchura de la banda de montañas y la de la costa (± `variacionBordes`), por dónde nace y serpentea el río, **1 o 2 ríos** (el segundo confluye con el primero, como el Tigris y el Éufrates, o llega solo al mar), **1–2 lagos** de radio 1–2, la extensión de las marismas, la vegetación, y un **clima** algo más cálido o fresco (± 1,5 °C) y más seco o húmedo (± 25 % de lluvia).
- Test que lo vigila: `mapa.test.ts`. Hay 10 semillas con 10 huellas distintas, y el número de ríos o de lagos varía entre ellas.

## 2. Forma del terreno (R8)
| Terreno | Cómo se genera |
|---|---|
| Montaña / colina | Banda norte con ruido fuerte. Altura ≥ `umbralMontana` / ≥ `umbralColina`. |
| Llanura | Centro del valle, casi plano (ruido suave), inclinado suavemente hacia el sur. |
| Mar | Lo bajo conectado con el borde sur (el golfo). La costa es irregular. |
| Río | Nace en las montañas (fila 1) y en cada paso elige el vecino más bajo, con azar y una tendencia lateral que cambia: así se forman **meandros**. Excava su cauce y acaba en el mar o en otro río. |
| Lago | Junto a un tramo medio del río. Sus orillas pueden ser marisma. |
| Marisma | Tierra baja a ≤ `anchoMarisma` del mar (delta) o junto a un lago. |

Vegetación (encima del terreno): **palmeral** (llanura cálida, a ≤ 2 del agua dulce, con al menos 18 °C), **bosque** (solo en biomas boscosos: templado, taiga, mediterráneo, selva) y **cañaveral** (marisma). Recursos por hexágono: arcilla (orillas), caña (marisma), peces (agua), madera (palmeral o bosque) y piedra (colina o montaña).

## 3. Clima → bioma: el orden lógico (R10)
**Regla:** temperatura y lluvia deciden el bioma, como en el **diagrama de Whittaker** de la ecología real.

```
temperatura = temperaturaBase − gradienteTermico × altitud/1000     (6,5 °C por km, media atmosférica real)
lluvia      = precipitacionBase + lluviaPorMetro × altitud          (las montañas atrapan lluvia: efecto orográfico)
altitud     = alturaMaxMetros × t^curvaAltitud,   t = altura normalizada sobre el mar (la llanura queda baja)
```

| Temperatura media anual | Lluvia | Bioma |
|---|---|---|
| < −4 °C | cualquiera | **nieve / hielo** |
| −4 a 0 °C | cualquiera | **tundra** |
| 0 a 5 °C | ≥ 300 mm | **taiga** (bosque boreal) |
| 0 a 5 °C | < 300 mm | **tundra** |
| 5 a 18 °C | < 250 mm | **estepa** fría |
| 12 a 18 °C | 250–800 mm | **mediterráneo** |
| 5 a 18 °C | 250–500 mm | **pradera** |
| 5 a 18 °C | ≥ 500 mm | **bosque templado** |
| ≥ 18 °C | < 250 mm | **desierto** |
| ≥ 18 °C | 250–500 mm | **estepa** cálida |
| ≥ 18 °C | 500–1200 mm | **sabana** |
| ≥ 18 °C | ≥ 1200 mm | **selva tropical** |

**Consecuencia en el mapa de Sumer** (24 °C y 150 mm en el valle, cumbres de 4 500 m): el valle es **desierto** (con la franja verde de regadío y palmerales junto al río, que es como era de verdad). Al subir se pasa por bandas en orden: desierto → estepa → mediterráneo o bosque templado → taiga → tundra → nieve en las cumbres. **Nunca aparece tundra junto a la selva**: no tendría sentido a la escala de un valle.

**Fertilidad:** cada bioma tiene una fertilidad natural (pradera 0,6 · bosque templado 0,5 · desierto 0,05 · tundra 0,05 · nieve 0…). En la llanura junto al agua manda el limo del río: `max(natural, 0,95 − 0,12 × (distanciaAlAgua − 1))`. Por eso el desierto junto al río es el mejor suelo del mapa.

## 4. Todos los biomas en el juego (R10), por versión
- **v0.1 (valle de Sumer):** desierto, estepa, mediterráneo, pradera, bosque templado, taiga, tundra y nieve, por altitud. Sabana y selva no aparecen, porque el clima de Sumer no las produce.
- **v0.4 (mapa regional y mundial):** la **misma función** de clima con un término de **latitud** (temperatura de 27 °C en el ecuador a −20 °C en los polos) y de **distancia al mar o sombra orográfica** para la lluvia. Aparecen así los 10 biomas en franjas lógicas: hielo y tundra en los polos → taiga → bosque templado, pradera y mediterráneo → estepa y desierto en las latitudes subtropicales → sabana → selva en el ecuador. Las montañas repiten la secuencia en vertical.
- **v0.7 (otras civilizaciones):** cada civilización arranca en su clima real (por ejemplo, Egipto: desierto cálido con el Nilo). La configuración `clima` se elige según la civilización.

## 5. Perillas de ajuste (`tuning.json`)
| Clave | Valor | Rango seguro | Qué cambia en la experiencia |
|---|---|---|---|
| `mapa.columnas` × `filas` | 48 × 40 | 32–64 × 28–56 | Tamaño de la partida y coste de render |
| `mapa.bordeMontanas` / `bordeMar` | 0,28 / 0,16 | 0,15–0,4 / 0,08–0,25 | Cuánto mapa ocupan las montañas y el mar |
| `mapa.variacionBordes` | 0,06 | 0–0,1 | Cuánto cambia la forma del valle entre partidas |
| `mapa.lagosMin`–`lagosMax` | 1–2 | 0–4 | Variedad de lagos |
| `mapa.probSegundoRio` | 0,5 | 0–1 | Frecuencia de mapas con dos ríos |
| `mapa.curvaAltitud` | 2,2 | 1,5–3 | Cuánto relieve tienen las montañas frente a lo plana que es la llanura |
| `clima.temperaturaBase` | 24 °C | −5 a 28 | Civilización o latitud: cambia todos los biomas |
| `clima.precipitacionBase` | 150 mm | 50–2500 | Del desierto a la selva |
| `clima.alturaMaxMetros` | 4 500 | 1 000–6 000 | Si hay nieve en las cumbres |
| `clima.variacionTemperatura` / `variacionLluvia` | 1,5 / 0,25 | 0–3 / 0–0,4 | Variedad climática entre partidas |

## 6. Criterios de aceptación (con tests en `mapa.test.ts` y `clima.test.ts`)
- Misma semilla → mismo mapa; 10 semillas → 10 mapas distintos, con variación en ríos o lagos.
- Cada río es una cadena conectada que nace al norte y acaba en el mar o en otro río; el principal siempre llega al mar.
- En las 10 semillas hay mar, río, lago, marisma, llanura y montaña.
- La temperatura media de las montañas es menor que la de las colinas, y la de las colinas menor que la de la llanura. Más del 80 % de la llanura es árida, y siempre hay tundra o nieve en las cumbres.
- La tabla de Whittaker produce los 10 biomas en sus casos lógicos. A 0 m da desierto y a 6 000 m da nieve.
