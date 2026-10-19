# Entregable A — Visión de SEDIMENTO (nombre de trabajo: IMPERIUM)

> Actualizado el 2026-10-19 con los textos de `docs/prompts/`: terreno continuo, construcción libre y progresiva, y dirección artística por decidir en el laboratorio.

## Qué es, en una frase
Un simulador de civilizaciones antiguas en tiempo real donde gobiernas una sociedad que tiene sus propios intereses. No ganas por acumular. Ganas, o caes, por cómo sostienes lo que has construido.

## Qué lo hace único
Los juegos de referencia separan tres placeres que IMPERIUM quiere unir en la misma pantalla:

| Placer | Referencia | Qué hace IMPERIUM |
|---|---|---|
| **Observar** y **construir** una ciudad viva y bonita | Tropico, Anno, Songs of Syx | Un paisaje 3D continuo donde colocas cada edificio donde quieres y lo ves levantarse por etapas, y cada persona que ves hace algo real: lleva un saco de cebada concreto a un almacén concreto. |
| **Administrar** un sistema que entiendes | Tropico, Victoria | Todo indicador tiene un botón «¿por qué?» que lleva a la causa física: el canal colmatado, la ración recortada en el mes 3. |
| **Descubrir** una historia que no estaba escrita | Civilization, Frostpunk | La **crónica** registra causas y consecuencias. La caída de tu ciudad se puede leer como un libro de historia. |

Lo que no tiene ninguna de las referencias es la **memoria social con causas trazables**: los hogares y los grupos recuerdan agravios concretos y fechados, que se desvanecen a ritmos distintos. Las protestas y rebeliones nacen de esa contabilidad visible, no de un dado. Esa es la mecánica firma del proyecto.

## La promesa al jugador
- Ningún recurso aparece de la nada y ningún problema aparece sin causa.
- El crecimiento siempre trae un coste nuevo: **nunca hay un estado cómodo que se pueda repetir en bucle**.
- Las crisis se anuncian (pronóstico de la crecida, reservas en días, agravios crecientes), pero anticiparlas cuesta recursos que hoy hacen falta en otra cosa.
- Perder es comprensible, y casi siempre hubo un momento en que se pudo evitar a un precio.

## Los cinco pilares (los tuyos, sin cambios)
1. **Un mundo que está vivo:** la gente trabaja, el río crece, los campos se salinizan y los vecinos tienen sus propios problemas, aunque no hagas nada.
2. **Una economía que tiene consecuencias:** física, con cadenas, logística y tiempos de viaje. Una carencia se propaga en lugar de mostrar solo un aviso rojo.
3. **Una sociedad con intereses propios:** hogares y grupos con necesidades, expectativas y memoria. No existe una barra única de felicidad.
4. **Una historia que emerge de las decisiones:** acontecimientos con causas identificables y resultados variables, registrados en la crónica.
5. **Una civilización que siempre exige algo más:** cada sistema que dominas crea el siguiente problema.

> El brief de la v0.1 usa 3 pilares operativos (*todo es físico y trazable*, *crecer aprieta*, *la ciudad cuenta su historia*). Son los pilares 2, 5 y 4 llevados a una sola aldea. Los pilares 1 y 3 crecen versión a versión.

## La regla de las cuatro preguntas
Ningún sistema entra en el juego si no responde por escrito a: **¿qué lo provoca? ¿cómo funciona? ¿qué consecuencias tiene en otros sistemas? ¿cómo lo entiende y responde el jugador?** Los GDD de `docs/gdd/` siguen ese formato.

## Valoración crítica de la ambición
La visión completa equivale a Songs of Syx + Victoria 3 + Civilization en tiempo real: estudios de 5 a 50 personas durante 5 a 10 años. Con una persona más Claude es viable **solo** si se cumplen tres condiciones:

1. **Cada versión es un juego cerrado y jugable**, no una pieza de un todo futuro. La v0.1 (una aldea) tiene que ser divertida por sí misma, porque si no lo es, añadir diplomacia no la arregla.
2. **La simulación es pequeña pero real antes de ser grande.** Primero 300 habitantes simulados de verdad. Después, el mismo modelo agregado para otras ciudades.
3. **Se recorta sin piedad lo que no alimenta las cuatro preguntas.** Ejemplos que vigilo: espionaje como minijuego, decenas de tipos de unidades o 10 civilizaciones de golpe. Tres civilizaciones profundas valen más que diez superficiales.

El plan de versiones está en `docs/versiones.md`. Los riesgos técnicos y sus soluciones están en el GDD, §13.
