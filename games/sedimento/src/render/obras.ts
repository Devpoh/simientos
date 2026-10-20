import * as THREE from 'three';
import { crearRng, derivarSemilla } from '../logic/azar';
import { progresoEtapa } from '../logic/sim/obras';
import type { ConfigSim, EtapaObra, Obra } from '../logic/sim/tipos';
import type { ConfigRender } from './config';
import { fusionar, pieza } from './geometria';

type AlturaEn = (x: number, z: number) => number;

export interface ObrasRender {
  readonly raiz: THREE.Group;
  /** Reconstruye la vista si cambió una etapa, un progreso visible, el material entregado o la obra seleccionada. */
  sincronizar(obras: readonly Obra[], seleccionada?: number | null): void;
  liberar(): void;
}

/**
 * Obras en el terreno (R22): cada una se ve según su etapa y su progreso dentro de ella.
 *  · plano: cuerda tensada y estacas en las esquinas;
 *  · preparación: losa de tierra pisada que se va extendiendo y montones de tierra alrededor;
 *  · cimientos: zanja oscura y una hilada baja de piedra que sube;
 *  · estructura: muros de adobe que suben con el progreso, con andamio de palos;
 *  · cubierta: muros completos, vigas que se van colocando y techo de paja que las cubre.
 * Junto a la obra se apilan los adobes y los haces de caña ya entregados. Todo el conjunto es una sola
 * malla con color por vértice (y una sola de líneas), así que seis obras cuestan lo mismo que una.
 */
export function crearObras(cfgSim: ConfigSim, cfg: ConfigRender, alturaEn: AlturaEn): ObrasRender {
  const c = cfg.construccion;
  const raiz = new THREE.Group();
  const matMalla = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
  const matLineas = new THREE.LineBasicMaterial({ vertexColors: true });
  let firma = '';
  let malla: THREE.Mesh | null = null;
  let lineas: THREE.LineSegments | null = null;
  const colorPlano = new THREE.Color(c.colorPlano);
  const colorSeleccion = new THREE.Color(c.colorSeleccion);

  const limpiar = () => {
    for (const m of [malla, lineas]) {
      if (!m) continue;
      raiz.remove(m);
      m.geometry.dispose();
    }
    malla = null;
    lineas = null;
  };

  /** Todo lo que hace falta saber para dibujar una obra: se calcula una vez y se reutiliza por pieza. */
  interface Marco {
    o: Obra;
    ancho: number;
    fondo: number;
    /** Altura del suelo pisado: media de las esquinas y el centro. */
    y0: number;
    yMin: number;
    cos: number;
    sin: number;
  }

  const marcoDe = (o: Obra): Marco => {
    const h = cfgSim.edificios[o.tipo].huella;
    const cos = Math.cos(o.giro);
    const sin = Math.sin(o.giro);
    const alturas = [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => {
      const lx = (sx * h.ancho) / 2;
      const lz = (sz * h.fondo) / 2;
      return alturaEn(o.x + lx * cos + lz * sin, o.z - lx * sin + lz * cos);
    });
    return { o, ancho: h.ancho, fondo: h.fondo, y0: alturas.reduce((s, v) => s + v, 0) / alturas.length, yMin: Math.min(...alturas), cos, sin };
  };

  /** Caja alineada con la obra: centro (cx, cz) y base a altura `base` sobre el suelo pisado, en coordenadas locales. */
  const caja = (m: Marco, ancho: number, alto: number, fondo: number, cx: number, base: number, cz: number, color: THREE.ColorRepresentation): THREE.BufferGeometry => {
    const g = new THREE.BoxGeometry(ancho, alto, fondo).translate(cx, base + alto / 2, cz).rotateY(m.o.giro).translate(m.o.x, m.y0, m.o.z);
    return pieza(g, color);
  };

  const altoMuroDe = (m: Marco) => c.altoMuroBase + c.altoMuroPorTamano * Math.max(m.ancho, m.fondo);

  /** Los cuatro lados de un rectángulo local como cajas finas (muros, hiladas, zanja): `fuera` ensancha el rectángulo. */
  const marco = (m: Marco, alto: number, grosor: number, fuera: number, base: number, color: THREE.ColorRepresentation): THREE.BufferGeometry[] => {
    const w = m.ancho + 2 * fuera;
    const f = m.fondo + 2 * fuera;
    return [
      caja(m, w, alto, grosor, 0, base, -f / 2 + grosor / 2, color),
      caja(m, w, alto, grosor, 0, base, f / 2 - grosor / 2, color),
      caja(m, grosor, alto, f - 2 * grosor, -w / 2 + grosor / 2, base, 0, color),
      caja(m, grosor, alto, f - 2 * grosor, w / 2 - grosor / 2, base, 0, color),
    ];
  };

  const losa = (m: Marco, escala: number): THREE.BufferGeometry => {
    const profundo = m.y0 - m.yMin + 0.05;
    const g = new THREE.BoxGeometry((m.ancho + 0.1) * escala, profundo + c.altoLosa, (m.fondo + 0.1) * escala).translate(0, -profundo + (profundo + c.altoLosa) / 2, 0).rotateY(m.o.giro).translate(m.o.x, m.y0, m.o.z);
    return pieza(g, c.colorTierra);
  };

  const montones = (m: Marco, p: number): THREE.BufferGeometry[] => {
    const rng = crearRng(derivarSemilla(m.o.id, 'obra-montones'));
    const n = Math.ceil(c.montones * Math.min(1, p * 2 + 0.2));
    const piezas: THREE.BufferGeometry[] = [];
    for (let k = 0; k < n; k++) {
      // Reparto estable por obra: alrededor de la huella, un poco por fuera.
      const lado = rng() * 4;
      const t = rng() - 0.5;
      const fuera = 0.14 + rng() * 0.1;
      const lx = lado < 2 ? t * m.ancho : (lado < 3 ? -1 : 1) * (m.ancho / 2 + fuera);
      const lz = lado < 2 ? (lado < 1 ? -1 : 1) * (m.fondo / 2 + fuera) : t * m.fondo;
      const r = 0.07 + rng() * 0.05;
      const g = new THREE.ConeGeometry(r, r * 0.9, 6).translate(lx, r * 0.45, lz).rotateY(m.o.giro).translate(m.o.x, m.y0 - 0.01, m.o.z);
      piezas.push(pieza(g, c.colorMonton));
    }
    return piezas;
  };

  const andamio = (m: Marco, alto: number): THREE.BufferGeometry[] => {
    const piezas: THREE.BufferGeometry[] = [];
    const fuera = c.grosorMuro + 0.05;
    const w = m.ancho + 2 * fuera;
    const f = m.fondo + 2 * fuera;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) piezas.push(caja(m, 0.025, alto + c.altoAndamio, 0.025, (sx * w) / 2, 0, (sz * f) / 2, c.colorAndamio));
    for (const k of [0.45, 0.8]) {
      const y = alto * k;
      piezas.push(caja(m, w, 0.02, 0.02, 0, y, -f / 2, c.colorAndamio), caja(m, w, 0.02, 0.02, 0, y, f / 2, c.colorAndamio));
      piezas.push(caja(m, 0.02, 0.02, f, -w / 2, y, 0, c.colorAndamio), caja(m, 0.02, 0.02, f, w / 2, y, 0, c.colorAndamio));
    }
    return piezas;
  };

  const vigasYTecho = (m: Marco, p: number, alto: number): THREE.BufferGeometry[] => {
    const piezas: THREE.BufferGeometry[] = [];
    const n = Math.max(1, Math.ceil(Math.min(1, p * 1.6) * c.vigasMax));
    const base = c.altoHilada + alto;
    for (let k = 0; k < n; k++) {
      const x = -m.ancho / 2 + (m.ancho * (k + 0.5)) / c.vigasMax;
      piezas.push(caja(m, 0.035, 0.035, m.fondo + 0.12, x, base, 0, c.colorViga));
    }
    // El techo de paja se extiende sobre las vigas cuando ya hay buena parte puestas.
    const cubierto = Math.max(0, (p - 0.45) / 0.55);
    if (cubierto > 0) piezas.push(caja(m, m.ancho * cubierto, 0.035, m.fondo + 0.14, -m.ancho / 2 + (m.ancho * cubierto) / 2, base + 0.035, 0, c.colorTecho));
    return piezas;
  };

  /** Pilas de material ya entregado: adobes a un lado y haces de caña al otro. */
  const materiales = (m: Marco): THREE.BufferGeometry[] => {
    const piezas: THREE.BufferGeometry[] = [];
    const adobes = Math.min(c.pilaMax, Math.ceil((m.o.entregado.adobe ?? 0) / c.unidadPila));
    for (let k = 0; k < adobes; k++) {
      const fila = k % 3;
      const piso = Math.floor(k / 3);
      piezas.push(caja(m, 0.11, 0.045, 0.06, m.ancho / 2 + 0.2, piso * 0.047, -m.fondo / 2 + 0.06 + fila * 0.07, c.colorAdobe));
    }
    const haces = Math.min(Math.ceil(c.pilaMax / 2), Math.ceil((m.o.entregado.cana ?? 0) / c.unidadPila));
    for (let k = 0; k < haces; k++) {
      // Pila en pirámide: 3 abajo, 2 en medio, 1 arriba.
      const piso = k < 3 ? 0 : k < 5 ? 1 : 2;
      const dentro = piso === 0 ? k : piso === 1 ? k - 3 : 0;
      const x = -m.ancho / 2 - 0.2 + (piso === 0 ? dentro * 0.06 : piso === 1 ? 0.03 + dentro * 0.06 : 0.06);
      const g = new THREE.CylinderGeometry(0.028, 0.028, 0.5, 6).rotateX(Math.PI / 2).translate(x, 0.028 + piso * 0.05, m.fondo * 0.05).rotateY(m.o.giro).translate(m.o.x, m.y0, m.o.z);
      piezas.push(pieza(g, c.colorCana));
    }
    return piezas;
  };

  const piezasDeEtapa = (m: Marco, etapa: EtapaObra, p: number): THREE.BufferGeometry[] => {
    const piezas: THREE.BufferGeometry[] = [];
    const alto = altoMuroDe(m);
    if (etapa === 'preparacion') {
      piezas.push(losa(m, 0.45 + 0.55 * p), ...montones(m, p));
    } else if (etapa !== 'plano') {
      piezas.push(losa(m, 1));
      // Zanja: tira oscura justo por fuera de la losa.
      if (etapa === 'cimientos') piezas.push(...marco(m, 0.012, 0.07, 0.07, c.altoLosa, c.colorZanja));
      const hilada = etapa === 'cimientos' ? 0.015 + (c.altoHilada - 0.015) * p : c.altoHilada;
      piezas.push(...marco(m, hilada, c.grosorMuro + 0.02, 0, c.altoLosa, c.colorPiedra));
      if (etapa === 'estructura' || etapa === 'cubierta') {
        const subida = etapa === 'estructura' ? 0.08 + 0.92 * p : 1;
        piezas.push(...marco(m, alto * subida, c.grosorMuro, 0, c.altoLosa + c.altoHilada, c.colorMuro));
        piezas.push(...andamio(m, alto * (etapa === 'estructura' ? subida : 1)));
      }
      if (etapa === 'cubierta') piezas.push(...vigasYTecho(m, p, alto));
    }
    return piezas;
  };

  /** Cuerda tensada sobre la huella (y un contorno mayor si la obra está seleccionada) y estacas en las esquinas. */
  const cuerda = (m: Marco, seleccionada: boolean, puntos: number[], colores: number[], estacas: THREE.BufferGeometry[]): void => {
    const trazar = (margen: number, alza: number, color: THREE.Color) => {
      const esquinas: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [(sx * (m.ancho + 2 * margen)) / 2, (sz * (m.fondo + 2 * margen)) / 2]);
      const en = (lx: number, lz: number): [number, number, number] => {
        const x = m.o.x + lx * m.cos + lz * m.sin;
        const z = m.o.z - lx * m.sin + lz * m.cos;
        return [x, alturaEn(x, z) + alza, z];
      };
      for (let lado = 0; lado < 4; lado++) {
        const [ax, az] = esquinas[lado];
        const [bx, bz] = esquinas[(lado + 1) % 4];
        for (let s = 0; s < c.muestrasLado; s++) {
          const t0 = s / c.muestrasLado;
          const t1 = (s + 1) / c.muestrasLado;
          puntos.push(...en(ax + (bx - ax) * t0, az + (bz - az) * t0), ...en(ax + (bx - ax) * t1, az + (bz - az) * t1));
          colores.push(color.r, color.g, color.b, color.r, color.g, color.b);
        }
      }
    };
    trazar(0, c.alzaCuerda, colorPlano);
    if (seleccionada) trazar(0.14, c.alzaCuerda + 0.02, colorSeleccion);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = (sx * m.ancho) / 2;
      const lz = (sz * m.fondo) / 2;
      const x = m.o.x + lx * m.cos + lz * m.sin;
      const z = m.o.z - lx * m.sin + lz * m.cos;
      estacas.push(pieza(new THREE.CylinderGeometry(c.radioEstaca, c.radioEstaca, c.altoEstaca, 5).translate(x, alturaEn(x, z) + c.altoEstaca / 2, z), c.colorEstaca));
    }
  };

  return {
    raiz,
    sincronizar(obras, seleccionada = null) {
      const nueva = `${seleccionada}|` + obras.map((o) => `${o.id}:${o.etapa}:${Math.floor(progresoEtapa(o, cfgSim) * c.pasosProgreso)}:${Math.ceil((o.entregado.adobe ?? 0) / c.unidadPila)}:${Math.ceil((o.entregado.cana ?? 0) / c.unidadPila)}`).join(',');
      if (nueva === firma) return;
      firma = nueva;
      limpiar();
      if (obras.length === 0) return;
      const piezas: THREE.BufferGeometry[] = [];
      const puntos: number[] = [];
      const colores: number[] = [];
      for (const o of obras) {
        const m = marcoDe(o);
        cuerda(m, o.id === seleccionada, puntos, colores, piezas);
        piezas.push(...piezasDeEtapa(m, o.etapa, Math.floor(progresoEtapa(o, cfgSim) * c.pasosProgreso) / c.pasosProgreso), ...materiales(m));
      }
      malla = new THREE.Mesh(fusionar(piezas), matMalla);
      malla.castShadow = true;
      malla.receiveShadow = true;
      malla.name = 'obras';
      raiz.add(malla);
      const geoLineas = new THREE.BufferGeometry();
      geoLineas.setAttribute('position', new THREE.Float32BufferAttribute(puntos, 3));
      geoLineas.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
      lineas = new THREE.LineSegments(geoLineas, matLineas);
      lineas.name = 'cuerdas';
      raiz.add(lineas);
    },
    liberar() {
      limpiar();
      matMalla.dispose();
      matLineas.dispose();
    },
  };
}
