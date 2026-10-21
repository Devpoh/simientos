"""Humo de chimeneas y hogueras (R87, D037).

Un sprite = UNA bocanada con 4 fotogramas: nace pequeña y densa, y crece aclarándose hasta deshacerse.
El juego no calcula partículas por píxel: por cada chimenea suelta bocanadas de un pool cada pocos cientos
de ms y las sube; cada bocanada recorre sus 4 fotogramas. Así el humo sube de verdad y no cuesta nada.

El humo se lee claro sobre el cielo y sobre el terreno, así que usa los tonos altos de la rampa de piedra
(gris → blanco cálido) y el borde va deshilachado por tramado ordenado: nunca una silueta limpia.
"""
import numpy as np
from paleta import c, TRANSP
from iso import Spr
from util import hash2

# Tonos de piedra que se leen como humo.
TONOS = (c("piedra", 3), c("piedra", 4), c("piedra", 5), c("piedra", 6))
BAYER = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], np.float32).reshape(4, 4) / 16.0


def _limpiar(m):
    """Quita colas de un solo píxel (sin vecinos de 4): el humo se deshilacha, pero no suelta motas."""
    h, w = m.shape
    for _ in range(3):
        fuera = []
        for y, x in zip(*np.nonzero(m)):
            if not ((x > 0 and m[y, x - 1]) or (x < w - 1 and m[y, x + 1]) or (y > 0 and m[y - 1, x]) or (y < h - 1 and m[y + 1, x])):
                fuera.append((y, x))
        if not fuera:
            break
        for y, x in fuera:
            m[y, x] = False
    return m


def _bocanada(frame, n=4, w=11, h=11, semilla=7, ancho=1.0, bajo=0.0, tapa=0, crece=1.0, deshace=1.0):
    """Máscara booleana h×w de la bocanada: crece y se deshilacha al envejecer.

    `ancho` estira en horizontal y `bajo` la baja: así la hoguera es una bocanada ancha y pegada al suelo,
    distinguible de la columna estrecha de la chimenea. `tapa` recorta filas de arriba, `crece` regula
    cuánto engorda y `deshace` cuánto se rompe por dentro al final.
    """
    t = frame / float(n - 1)                     # 0 = recién salida, 1 = deshecha
    r = (1.9 + t * 2.4 * crece)
    rx, ry = r * ancho, r
    cx = (w - 1) / 2.0
    cy = (h - 1) / 2.0 + bajo
    ys, xs = np.mgrid[0:h, 0:w]
    d = np.hypot((xs - cx) / rx, (ys - cy) / ry)
    # El borde se deshilacha más cuanto más vieja es la bocanada: se deshace por los lados.
    ruido = (hash2(xs, ys, semilla) - 0.5) * 0.42 + (BAYER[ys % 4, xs % 4] - 0.5) * 0.5
    m = d + ruido * (0.28 + t * 0.85 * deshace) < 1.0
    if tapa:
        m[:tapa, :] = False
    return _limpiar(m)


def _pintar(m, w, h, t, semilla, extra_abajo=0):
    """Pinta la máscara en un Spr, más claro arriba (le da el sol) y al envejecer."""
    s = Spr(w, h, w // 2, h // 2)
    for y, x in zip(*np.nonzero(m)):
        luz = 1.0 - (y - (h / 2.0 - 4)) / 9.0
        tono = int(min(3, 0.9 + luz * 1.1 + t * 1.5 + hash2(int(x), int(y), semilla + 5) * 0.6))
        if extra_abajo and y > h // 2:
            tono = min(3, tono + extra_abajo)
        s.pset(int(x), int(y), TONOS[max(0, tono)])
    return s


def humo(frame=0, n=4, semilla=7):
    """Bocanada de chimenea: columna estrecha que nace densa y se deshace subiendo."""
    w = h = 11
    return _pintar(_bocanada(frame, n, w, h, semilla), w, h, frame / float(n - 1), semilla)


def humo_fuego(frame=0, n=4, semilla=11):
    """Bocanada de hoguera: ancha y baja, pegada al suelo (nunca una columna), con brasas en los dos primeros."""
    w = h = 11
    m = _bocanada(frame, n, w, h, semilla, ancho=1.5, bajo=1.6, tapa=1, crece=0.62, deshace=1.15)
    s = _pintar(m, w, h, frame / float(n - 1), semilla, extra_abajo=1)
    if frame < 2:
        for k in range(2):
            s.pset(w // 2 - 2 + k * 4, h // 2 + 2 - k - frame * 2, c("oro", 2))
    return s
