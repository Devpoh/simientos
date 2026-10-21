import { describe, expect, it } from 'vitest';
import { ajusteCapa, estiloMarco, grosorMarco } from '../src/logic/ui';
import { resolverMarcos, type MarcoPixel } from '../src/logic/marcos';

const corte = { arriba: 6, abajo: 6, izquierda: 6, derecha: 6 };

describe('capa de interfaz (R70, P2b)', () => {
  it('la capa se ajusta al tamaño lógico del lienzo con el mismo factor de escala entero', () => {
    expect(ajusteCapa(960, 540, 1)).toEqual({ ancho: 960, alto: 540, escala: 1 });
    expect(ajusteCapa(1200, 675, 2)).toEqual({ ancho: 1200, alto: 675, escala: 2 });
    // La escala es exactamente la del lienzo: si no, los píxeles de la UI no coincidirían con los del juego.
    for (const z of [1, 2, 3, 4]) expect(ajusteCapa(100, 50, z).escala).toBe(z);
  });

  it('el marco 9-slice usa el corte del sprite y rellena el centro', () => {
    const reglas = estiloMarco('recursos/pixel/ui/marco-madera.png', corte);
    expect(reglas['border-image-source']).toBe('url(recursos/pixel/ui/marco-madera.png)');
    expect(reglas['border-image-slice']).toBe('6 6 6 6 fill');
    expect(reglas['border-image-width']).toBe('6px 6px 6px 6px');
    expect(reglas['border-image-repeat']).toBe('round');
  });

  it('el grosor del marco es la suma del corte, para que el box-sizing cuadre', () => {
    expect(grosorMarco(corte)).toEqual({ ancho: 12, alto: 12 });
    expect(grosorMarco({ arriba: 3, abajo: 4, izquierda: 5, derecha: 6 })).toEqual({ ancho: 11, alto: 7 });
  });

  it('un corte asimétrico se respeta tal cual (esquinas distintas)', () => {
    const r = estiloMarco('x.png', { arriba: 2, abajo: 3, izquierda: 4, derecha: 5 }, 'stretch');
    expect(r['border-image-slice']).toBe('2 5 3 4 fill');
    expect(r['border-image-width']).toBe('2px 5px 3px 4px');
    expect(r['border-image-repeat']).toBe('stretch');
  });
});

const marcoValido: MarcoPixel = {
  ancho: 16, alto: 16, corte, estados: { normal: 'ui/marco-madera.png', resaltado: 'ui/marco-madera-resaltado.png' },
  origen: 'propio', relleno: true, repetir: 'round',
};

describe('marcos del atlas (R70)', () => {
  it('resuelve la sección ui con la base de recursos delante', () => {
    const m = resolverMarcos({ marco_madera: marcoValido }, 'recursos/pixel/');
    expect(m.marco_madera.ruta).toBe('recursos/pixel/ui/marco-madera.png');
    expect(m.marco_madera.corte).toEqual(corte);
    expect(m.marco_madera.repetir).toBe('round');
    expect(m.marco_madera.relleno).toBe(true);
  });

  it('el estado «resaltado» elige la variante y sin él cae en «normal»', () => {
    const res = resolverMarcos({ marco_madera: marcoValido }, 'recursos/pixel/', 'resaltado');
    expect(res.marco_madera.ruta).toBe('recursos/pixel/ui/marco-madera-resaltado.png');
    const sinEstado = { ...marcoValido, estados: { normal: 'ui/x.png' } };
    expect(resolverMarcos({ m: sinEstado }, 'b/', 'resaltado').m.ruta).toBe('b/ui/x.png');
  });

  it('sin sección ui no hay marcos (la interfaz usa su estilo por defecto)', () => {
    expect(resolverMarcos(undefined, 'b/')).toEqual({});
  });

  it('descarta marcos sin estados, sin ruta o con corte inválido, sin romper el resto', () => {
    const sinEstados: MarcoPixel = { ...marcoValido, estados: {} };
    const corteMalo: MarcoPixel = { ...marcoValido, corte: { arriba: -1, abajo: 6, izquierda: 6, derecha: 6 } };
    const rutaVacia: MarcoPixel = { ...marcoValido, estados: { normal: '' } };
    const r = resolverMarcos({ a: sinEstados, b: corteMalo, c: rutaVacia, d: marcoValido }, 'b/');
    expect(Object.keys(r)).toEqual(['d']);
  });

  it('una repetición desconocida cae en «round», no se propaga a CSS', () => {
    const raro: MarcoPixel = { ...marcoValido, repetir: 'loquesea' };
    expect(resolverMarcos({ m: raro }, 'b/').m.repetir).toBe('round');
  });
});
