import { describe, expect, it } from 'vitest';
import datos from '../public/recursos/pixel/atlas.json';
import { etapaFinal, fotogramasDe, validarAtlas, type AtlasPixel, type Orientacion } from '../src/data/atlas';

const atlas = datos as unknown as AtlasPixel;
const CUATRO: Orientacion[] = ['ne', 'nw', 'se', 'sw'];
const OFICIOS = ['campesino', 'artesano', 'comerciante', 'soldado', 'sacerdote'];

describe('atlas de pixel art: formato', () => {
  it('el atlas.json exportado es válido', () => {
    expect(validarAtlas(datos)).toEqual([]);
  });

  it('la paleta es cerrada y las imágenes caben en 2048x2048', () => {
    expect(atlas.paleta).toBeLessThanOrEqual(64);
    for (const a of atlas.atlas) {
      expect(a.ancho).toBeLessThanOrEqual(2048);
      expect(a.alto).toBeLessThanOrEqual(2048);
    }
  });

  it('cada sprite trae ancla, huella, altura y puertas', () => {
    for (const [id, s] of Object.entries(atlas.sprites)) {
      expect(Number.isInteger(s.ancla.x) && Number.isInteger(s.ancla.y), id).toBe(true);
      expect(s.huella.w, id).toBeGreaterThanOrEqual(1);
      expect(s.huella.d, id).toBeGreaterThanOrEqual(1);
      expect(s.altura, id).toBeGreaterThan(0);
      expect(Array.isArray(s.puertas), id).toBe(true);
    }
  });

  it('lo puntual se ancla en los pies y lo que ocupa tiles, en el centro de la huella', () => {
    for (const id of ['ciudadano_soldado_h', 'animal_vaca', 'arbol_encina_1', 'roca_1', 'prop_barril']) {
      expect(atlas.sprites[id].anclaEn, id).toBe('pies');
    }
    for (const id of ['casa_2x2_a', 'templo_jupiter', 'puesto_pan', 'torre', 'barco_galera', 'prop_pozo']) {
      expect(atlas.sprites[id].anclaEn, id).toBe('huella');
    }
  });

  it('las estructuras con puerta tienen la celda de acceso fuera de su huella', () => {
    const casa = atlas.sprites.casa_2x2_a;
    expect(casa.puertas).toEqual([{ i: 0, j: 2, lado: 'v+' }]);
    expect(atlas.sprites.templo_jupiter.puertas[0]).toEqual({ i: 2, j: 5, lado: 'v+' });
  });
});

describe('atlas de pixel art: validador', () => {
  const copia = (): AtlasPixel => JSON.parse(JSON.stringify(atlas)) as AtlasPixel;

  it('detecta un fotograma que se sale del atlas', () => {
    const a = copia();
    a.frames['ciudadano_soldado_h/idle/se/0'].x = 5000;
    expect(validarAtlas(a).some((e) => e.includes('fuera del atlas'))).toBe(true);
  });

  it('detecta un ancla fuera del fotograma', () => {
    const a = copia();
    a.frames['ciudadano_soldado_h/idle/se/0'].ancla = { x: -3, y: 4 };
    expect(validarAtlas(a).some((e) => e.includes('ancla fuera'))).toBe(true);
  });

  it('detecta una referencia a un fotograma inexistente', () => {
    const a = copia();
    a.sprites.faro.estados.base.orientaciones.unica = ['no/existe'];
    expect(validarAtlas(a).some((e) => e.includes('no existe'))).toBe(true);
  });

  it('detecta una puerta dentro de la huella y una etapa que no es un estado', () => {
    const a = copia();
    a.sprites.casa_2x2_a.puertas = [{ i: 0, j: 0, lado: 'v+' }];
    a.sprites.templo_jupiter.etapas = ['etapa9'];
    const e = validarAtlas(a);
    expect(e.some((m) => m.includes('celda de acceso'))).toBe(true);
    expect(e.some((m) => m.includes('etapa9'))).toBe(true);
  });

  it('detecta una huella inválida y un animado con un solo fotograma', () => {
    const a = copia();
    a.sprites.torre.huella = { w: 0, d: 2 };
    a.sprites.ciudadano_soldado_h.estados.caminar.orientaciones.se = ['ciudadano_soldado_h/caminar/se/0'];
    const e = validarAtlas(a);
    expect(e.some((m) => m.includes('huella inválida'))).toBe(true);
    expect(e.some((m) => m.includes('un solo fotograma'))).toBe(true);
  });

  it('la sección ui de marcos 9-slice es válida en el atlas exportado (R70)', () => {
    expect(atlas.ui).toBeDefined();
    const ui = atlas.ui!;
    expect(Object.keys(ui).sort()).toEqual(['marco_madera', 'marco_piedra']);
    for (const [nombre, m] of Object.entries(ui)) {
      expect(m.estados.normal, nombre).toBeTruthy();
      expect(m.corte.arriba + m.corte.abajo, nombre).toBeLessThanOrEqual(m.alto);
      expect(m.corte.izquierda + m.corte.derecha, nombre).toBeLessThanOrEqual(m.ancho);
    }
  });

  it('detecta un marco sin estados y un corte que no cabe en el sprite', () => {
    const a = copia();
    a.ui!.marco_madera.estados = {};
    a.ui!.marco_piedra.corte = { arriba: 9, abajo: 9, izquierda: 6, derecha: 6 };
    const e = validarAtlas(a);
    expect(e.some((m) => m.includes('ui.marco_madera: sin estados'))).toBe(true);
    expect(e.some((m) => m.includes('el corte no cabe'))).toBe(true);
  });
});

describe('atlas de pixel art: montañas como piezas (R84, D033)', () => {
  const PIEZAS: [string, number, number][] = [
    ['montana_macizo', 17, 11],
    ['montana_cresta', 10, 4],
    ['montana_acantilado_2x2', 2, 2],
    ['montana_acantilado_3x2', 3, 2],
    ['montana_pie_ladera', 4, 3],
  ];

  it('las cinco piezas del boceto M1 están en el atlas con su huella', () => {
    for (const [id, w, d] of PIEZAS) {
      const s = atlas.sprites[id];
      expect(s, id).toBeDefined();
      expect(s.categoria, id).toBe('roca');
      expect(s.huella, id).toEqual({ w, d });
      expect(s.bloquea, id).toBe(true);
      expect(s.anclaEn, id).toBe('huella');
      expect(s.altura, id).toBeGreaterThan(0);
      expect(s.estados.base.orientaciones.unica?.length, id).toBe(1);
    }
  });

  it('el macizo es mayor que la cresta y esta que un acantilado (variedad de tamaño)', () => {
    const area = (id: string) => atlas.sprites[id].huella.w * atlas.sprites[id].huella.d;
    expect(area('montana_macizo')).toBeGreaterThan(area('montana_cresta'));
    expect(area('montana_cresta')).toBeGreaterThan(area('montana_acantilado_3x2'));
    expect(area('montana_acantilado_3x2')).toBeGreaterThan(area('montana_acantilado_2x2'));
  });
});

describe('atlas de pixel art: contenido reutilizado de la muestra', () => {
  it('10 ciudadanos (5 oficios x 2 géneros) con idle y caminar en 4 orientaciones', () => {
    for (const oficio of OFICIOS) {
      for (const g of ['h', 'm']) {
        const id = `ciudadano_${oficio}_${g}`;
        for (const ori of CUATRO) {
          expect(fotogramasDe(atlas, id, 'idle', ori)?.length, `${id} idle ${ori}`).toBe(1);
          expect(fotogramasDe(atlas, id, 'caminar', ori)?.length, `${id} caminar ${ori}`).toBe(6);
        }
      }
    }
  });

  it('poses de trabajo, cargas y rezo', () => {
    expect(fotogramasDe(atlas, 'ciudadano_campesino_h', 'cultivar', 'se')?.length).toBe(4);
    expect(fotogramasDe(atlas, 'ciudadano_artesano_m', 'martillar', 'ne')?.length).toBe(4);
    expect(fotogramasDe(atlas, 'ciudadano_comerciante_h', 'comerciar', 'sw')?.length).toBe(4);
    for (const carga of ['saco', 'anfora', 'cesta', 'caja']) {
      expect(fotogramasDe(atlas, 'ciudadano_campesino_m', `cargar_${carga}`, 'nw')?.length, carga).toBe(6);
    }
    expect(fotogramasDe(atlas, 'ciudadano_sacerdote_m', 'rezar', 'se')?.length).toBe(2);
  });

  it('las etapas van en orden creciente (etapaK) y la final existe como estado', () => {
    const conEtapas = Object.entries(atlas.sprites).filter(([, s]) => s.etapas);
    expect(conEtapas.map(([id]) => id)).toEqual(expect.arrayContaining(['templo_jupiter', 'casa_2x2_a']));
    for (const [id, s] of conEtapas) {
      const etapas = s.etapas ?? [];
      const numeros = etapas.map((e) => Number(/^etapa(\d+)$/.exec(e)?.[1]));
      expect(numeros.every((n) => Number.isInteger(n) && n >= 1), `${id}: nombres etapaK`).toBe(true);
      expect(numeros, `${id}: orden creciente`).toEqual([...numeros].sort((x, y) => x - y));
      expect(etapaFinal(s), id).toBe(etapas[etapas.length - 1]);
      expect(s.estados[etapaFinal(s) as string], `${id}: la etapa final existe`).toBeDefined();
    }
  });

  it('el templo y la vivienda con obra traen la secuencia completa etapa1..N (N ≥ 3)', () => {
    for (const id of ['templo_jupiter', 'casa_2x2_a']) {
      const etapas = atlas.sprites[id].etapas ?? [];
      expect(etapas.length, id).toBeGreaterThanOrEqual(3);
      expect(etapas, id).toEqual(etapas.map((_, i) => `etapa${i + 1}`));
    }
  });

  it('la vivienda terminada trae las dos orientaciones de la cumbrera; el templo y las huellas son las esperadas', () => {
    const casa = atlas.sprites.casa_2x2_a;
    expect(Object.keys(casa.estados[etapaFinal(casa) as string].orientaciones).sort()).toEqual(['u', 'v']);
    expect(atlas.sprites.templo_jupiter.huella).toEqual({ w: 5, d: 5 });
    expect(atlas.sprites.casa_3x2_a.huella).toEqual({ w: 3, d: 2 });
  });

  it('las casas dan el punto de la chimenea para el humo', () => {
    const [f] = fotogramasDe(atlas, 'casa_2x2_a', etapaFinal(atlas.sprites.casa_2x2_a) as string, 'u') ?? [];
    expect(f.puntos?.chimenea).toBeDefined();
  });

  it('puestos, torre, faro y puente, con huella', () => {
    for (const p of ['fruta', 'telas', 'ceramica', 'pan', 'pescado']) {
      expect(atlas.sprites[`puesto_${p}`].huella).toEqual({ w: 2, d: 1 });
    }
    expect(atlas.sprites.torre.bloquea).toBe(true);
    expect(atlas.sprites.faro).toBeDefined();
    expect(atlas.sprites.puente_piedra.huella).toEqual({ w: 4, d: 2 });
  });

  it('árboles, rocas, props, animales, criaturas v1 y barcos', () => {
    for (const id of ['arbol_cipres_1', 'arbol_pino_1', 'arbol_encina_1', 'arbol_olivo_1', 'arbusto_1', 'roca_1',
      'prop_caja_1', 'prop_barril', 'prop_carreta_heno', 'prop_pozo', 'prop_fuente', 'prop_brasero', 'prop_estandarte', 'prop_valla_2',
      'animal_oveja', 'animal_vaca', 'animal_caballo_castano', 'animal_gallina_blanca',
      'criatura_minotauro', 'criatura_centauro', 'criatura_satiro',
      'barco_galera', 'barco_mercante', 'barco_pesquero']) {
      expect(atlas.sprites[id], id).toBeDefined();
    }
    expect(atlas.sprites.arbol_encina_1.bloquea).toBe(true);
    expect(atlas.sprites.animal_vaca.bloquea).toBe(false);
    expect(Object.keys(atlas.sprites.barco_galera.estados.navegar.orientaciones).sort()).toEqual(['u', 'v']);
  });

  it('los animales y criaturas traen solo las orientaciones se y sw', () => {
    for (const id of ['animal_vaca', 'criatura_minotauro']) {
      const e = atlas.sprites[id].estados;
      for (const est of Object.values(e)) expect(Object.keys(est.orientaciones).sort()).toEqual(['se', 'sw']);
    }
  });
});
