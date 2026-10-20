# Ficha de ciudadano estilo Tropico 6 (R52)

> Resumen para implementar P6. Diseño completo: `.claude/docs/pivote-pixel-art.md` §6. Datos en `logic/sim/ciudadano.ts` (versionados, para guardar partida); depende de la navegación de `colisiones.md` para «coger y soltar».

## 1. Datos del ciudadano

- Nombre y apellido/patronímico (listas mediterráneas/sumerias), edad (niño/adulto/anciano), género, aspecto (piel/pelo/ropa → variante de sprite del atlas).
- **Rol/oficio** (campesino, artesano, comerciante, soldado, sacerdote… y desempleado/niño) con **nivel de habilidad** y experiencia.
- **Personalidad:** 3–4 rasgos de un catálogo con efectos reales en la simulación (Trabajador, Perezoso, Devoto, Valiente, Cobarde, Sociable, Reservado, Ambicioso, Frugal, Rencoroso, Generoso…).
- **Humor:** felicidad 0–100 con **desglose de factores** (comida, vivienda, trabajo, fe, seguridad, ocio, familia, impuestos, clima) y **necesidades** con barras (hambre, descanso, fe, ocio, seguridad).
- **Familia:** pareja, hijos, padres, hermanos (árbol); soltero/huérfano; relaciones simples (amistad/rivalidad); lealtad, facción y religión.
- **Vida:** vivienda y lugar de trabajo (enlaces que saltan la cámara allí), riqueza, historial de hechos y un **pensamiento actual** en una frase según su estado.

## 2. Interfaz de la ficha

Retrato 48×48 (cabeza del sprite ampliada) y pestañas **Resumen / Familia / Necesidades / Trabajo / Historial**. Tooltip al pasar el ratón (nombre, oficio, icono de humor). Botones: seguir (cámara), asignar oficio, asignar vivienda, asignar trabajo.

## 3. Coger y soltar con el ratón

Gesto definido en `seleccion.md` §1 (mantener ≥ 250 ms o mover > 4 px sobre una unidad).

- **Al coger:** la unidad se dibuja **levantada** (pose «colgando», 2 fotogramas, sombra en el suelo, ligera rotación). El destino bajo el cursor se resalta verde/rojo según `puedeColocar` (`colisiones.md` §2).
- **Al soltar en suelo libre:** cae con rebote y se ajusta a la **celda libre más cercana** (nunca dentro de una huella).
- **Al soltar sobre un edificio con vacante:** se asigna como vivienda o trabajo según el tipo de edificio.
- **Al soltar sobre agua u obstáculo:** vuelve a su sitio con animación.
- Los rasgos pueden reaccionar: a un ciudadano con el rasgo Reservado no le gusta que lo levanten (afecta al humor).

## 4. Rendimiento

Existen datos para todos los ciudadanos, pero solo se **dibujan** los que están cerca de la cámara (LOD por zoom, `pivote-pixel-art.md` §2); lejos se agregan en grupos o puntos.

## 5. Pruebas Vitest obligatorias

1. Coger y soltar: destino libre, destino con vacante, destino inválido (agua/huella ocupada) — cada uno con el resultado correcto.
2. Ajuste a la celda libre más cercana nunca cae dentro de una huella.
3. El humor se recalcula con el desglose de factores (suma de componentes = total).
4. Guardado/carga: los datos del ciudadano sobreviven un ciclo completo (versión del esquema).
