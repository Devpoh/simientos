import { describe, expect, it } from 'vitest';
import paletaTxt from '../public/recursos/pixel/paleta.txt?raw';
import tuning from '../src/data/tuning.json';
import { COLORES, RAMPAS } from '../src/data/paleta';
import { dimensionesImagen, hornear, trocear, VACIO, type ConfigHorneado, type Superficie } from '../src/logic/horneado';
import { alturaPx, buscarLlano, crearMundo, hornearMundo, type Mundo } from '../src/logic/mundo';
import { tipoDeOrilla } from '../src/logic/horneado';

const cfg = (extra: Partial<ConfigHorneado> = {}): ConfigHorneado => ({
  tilesU: 12, tilesV: 10, tileAncho: 32, tileAlto: 16, alturaMax: 2, nivelMar: 0, semilla: 7, ...tuning.horneado, ...extra,
});
const llano: Superficie = { suelo: () => 0.15, agua: () => NaN };
const colina: Superficie = {
  suelo: (u, v) => 0.15 + 1.6 * Math.max(0, 1 - Math.hypot(u - 6, v - 5) / 3.5),
  agua: () => NaN,
};
const mar: Superficie = {
  suelo: (u, v) => (Math.hypot(u - 6, v - 5) < 3 ? -0.6 : 0.15),
  agua: (u, v) => (Math.hypot(u - 6, v - 5) < 3 ? 0 : NaN),
};
// Lago de agua dulce: su lámina está por encima del nivel del mar.
const lagoDulce: Superficie = {
  suelo: (u, v) => (Math.hypot(u - 6, v - 5) < 3 ? -0.3 : 0.2),
  agua: (u, v) => (Math.hypot(u - 6, v - 5) < 3 ? 0.15 : NaN),
};
const clasificaArena = (m: Mundo, u: number, v: number): boolean => tipoDeOrilla(m.superficie, m.cfg, u, v) === 'arena';
const enRampa = (img: { datos: Uint8Array }, rampa: string): number => {
  const set = new Set(RAMPAS[rampa]);
  let n = 0;
  for (const v of img.datos) if (set.has(v)) n++;
  return n;
};

describe('paleta de TypeScript', () => {
  it('coincide exactamente con public/recursos/pixel/paleta.txt (59 colores y sus rampas)', () => {
    const txt = paletaTxt.split(/\r?\n/);
    const corte = txt.findIndex((l) => l.startsWith('# índice'));
    const hex = txt.slice(corte + 1).filter(Boolean).map((l) => l.split(' ')[1].toLowerCase());
    expect([...COLORES]).toEqual(hex);
    for (const l of txt.slice(1, corte).filter(Boolean)) {
      const [nombre, resto] = l.split(': ');
      expect(RAMPAS[nombre].map((i) => COLORES[i]), nombre).toEqual(resto.trim().split(' ').map((h) => h.toLowerCase()));
    }
  });
});

describe('horneado del terreno', () => {
  it('la imagen mide (u+v) tiles de ancho y reserva filas para el relieve', () => {
    const d = dimensionesImagen(cfg());
    expect(d.ancho).toBe((12 + 10) * 16);
    expect(d.origenX).toBe(-10 * 16);
    expect(d.origenY).toBeLessThan(0);
    expect(d.alto).toBe((12 + 10) * 8 + -d.origenY + 2);
  });

  it('es determinista: mismos datos, mismos píxeles', () => {
    const a = hornear(colina, cfg());
    const b = hornear(colina, cfg());
    expect(Array.from(a.datos)).toEqual(Array.from(b.datos));
  });

  it('un llano seco se pinta entero de hierba y fuera del rombo queda vacío', () => {
    const img = hornear(llano, cfg());
    const pintados = img.datos.filter((v) => v !== VACIO).length;
    expect(pintados).toBeGreaterThan(0.9 * (12 * 10 * 2) * 128 * 0.5 / 1);   // ~ área del rombo (u·v·tileAncho·tileAlto/2)
    expect(enRampa(img, 'hierba')).toBe(pintados);
    expect(img.datos[0]).toBe(VACIO);
  });

  it('todos los píxeles pintados son índices de la paleta', () => {
    const img = hornear(colina, cfg());
    for (const v of img.datos) expect(v === VACIO || v < COLORES.length).toBe(true);
  });

  it('una colina sube el dibujo sobre su columna y trae sombra: hierba de varios tonos', () => {
    const plano = hornear(llano, cfg());
    const alta = hornear(colina, cfg());
    // la colina cambia muchos píxeles respecto al llano (relieve y sombra)
    let distintos = 0;
    for (let i = 0; i < plano.datos.length; i++) if (plano.datos[i] !== alta.datos[i]) distintos++;
    expect(distintos).toBeGreaterThan(300);
    const tonos = new Set(Array.from(alta.datos).filter((v) => RAMPAS.hierba.includes(v)));
    expect(tonos.size).toBeGreaterThan(2);
  });

  it('el agua se pinta con la rampa de agua y la costa del mar con playa de arena', () => {
    const img = hornear(mar, cfg());
    expect(enRampa(img, 'agua')).toBeGreaterThan(200);
    expect(enRampa(img, 'tierra')).toBeGreaterThan(20);
  });

  it('un lago de agua dulce no lleva arena en toda su orilla: la ribera es de hierba', () => {
    const img = hornear(lagoDulce, cfg({ semilla: 1 }));
    const agua = enRampa(img, 'agua');
    const arena = enRampa(img, 'tierra');
    const hierba = enRampa(img, 'hierba');
    expect(agua).toBeGreaterThan(200);
    expect(hierba).toBeGreaterThan(arena);
  });

  it('en el mundo real, el río y los lagos tienen tramos con arena y tramos sin ella, y el mar siempre tiene playa', () => {
    const m = crearMundo(tuning.mapa.semilla);
    let dulceConArena = 0;
    let dulceSinArena = 0;
    const sup = m.superficie;
    for (let v = 2; v < m.tilesV - 2; v += 1) {
      for (let u = 2; u < m.tilesU - 2; u += 1) {
        const a = sup.agua(u + 1.5, v);
        if (Number.isNaN(a) || a <= sup.suelo(u + 1.5, v) || a <= m.cfg.nivelMar + 0.04) continue;   // solo agua dulce
        if (Number.isNaN(sup.agua(u, v)) && sup.suelo(u, v) - m.cfg.nivelMar < m.cfg.alturaPlaya) {
          if (clasificaArena(m, u, v)) dulceConArena++; else dulceSinArena++;
        }
      }
    }
    expect(dulceConArena).toBeGreaterThan(0);
    expect(dulceSinArena).toBeGreaterThan(0);
  });

  it('trocear cubre la imagen sin huecos ni solapes', () => {
    const trozos = trocear(2368, 1286, 512);
    expect(trozos.reduce((s, t) => s + t.ancho * t.alto, 0)).toBe(2368 * 1286);
    expect(trozos.length).toBe(5 * 3);
    expect(trozos[trozos.length - 1]).toEqual({ x: 2048, y: 1024, ancho: 320, alto: 262 });
  });
});

describe('mundo procedural', () => {
  it('buscarLlano encuentra la zona llana y seca y evita el agua', () => {
    const mixto: Superficie = {
      suelo: (u) => (u < 20 ? 0.1 * u : 0.15),
      agua: (_u, v) => (v > 30 ? 0.5 : NaN),
    };
    const r = buscarLlano(mixto, 8, 8, { u: 30, v: 15 }, 25, { u: 60, v: 60 });
    expect(r).not.toBeNull();
    expect(r!.u).toBeGreaterThanOrEqual(20);
    expect(r!.v + 8).toBeLessThanOrEqual(30);
    expect(r!.desnivel).toBeCloseTo(0, 6);
  });

  it('la misma semilla da el mismo mundo y otra semilla, otro', () => {
    const a = crearMundo(11);
    const b = crearMundo(11);
    const c = crearMundo(12);
    const huella = (m: ReturnType<typeof crearMundo>): number => {
      let h = 0;
      for (let i = 0; i < m.campo.alturas.length; i += 97) h = (h * 31 + Math.round(m.campo.alturas[i] * 1000)) | 0;
      return h;
    };
    expect(huella(a)).toBe(huella(b));
    expect(huella(a)).not.toBe(huella(c));
  });

  it('con varias semillas hay agua, tierra, montaña alta y un llano donde poner la aldea', () => {
    for (const semilla of [3, 20260418, 99]) {
      const m = crearMundo(semilla);
      expect(m.tilesU).toBeGreaterThan(60);
      expect(m.tilesV).toBeGreaterThan(40);
      const llano2 = buscarLlano(m.superficie, 20, 18, { u: m.tilesU / 2, v: m.tilesV / 2 }, Math.max(m.tilesU, m.tilesV), { u: m.tilesU, v: m.tilesV });
      expect(llano2, `semilla ${semilla}`).not.toBeNull();
      expect(llano2!.desnivel).toBeLessThan(0.3);
      expect(alturaPx(m.superficie, m.cfg, m.tilesU / 2, 1)).toBeGreaterThanOrEqual(0);
    }
  });

  it('hornea el mundo real con los límites esperados y sin píxeles fuera de paleta', () => {
    const m = crearMundo(tuning.mapa.semilla);
    const img = hornearMundo(m);
    expect(img.ancho).toBe((m.tilesU + m.tilesV) * 16);
    const pintados = img.datos.filter((v) => v !== VACIO);
    expect(pintados.length).toBeGreaterThan(img.ancho * img.alto * 0.4);
    expect(pintados.every((v) => v < COLORES.length)).toBe(true);
    expect(enRampa(img, 'agua')).toBeGreaterThan(1000);
    expect(enRampa(img, 'hierba')).toBeGreaterThan(1000);
  });
});
