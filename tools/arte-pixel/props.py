"""Pequeño mobiliario y detalles de ambiente: cajas, barriles, sacos, heno, carreta, pozo,
fuente, brasero, valla, estandarte y leña. Cada uno es un Spr con el ancla en su base."""
import numpy as np
from paleta import c, TRANSP, TINTA
from util import hash2, fbm
from iso import Spr
from tablas import RID, a_indice
from edificios import caja, fn_plano, fn_sillar
from edificios2 import f_tablas, f_tablas_top, anfora
from templo import poste, f_mar, f_mar_top


def caja_madera(seed=1, du=12, dv=10, dz=9):
    s = Spr(du + dv + 8, dz + (du + dv) // 2 + 8, dv + 4, dz + 4)
    caja(s, 0, 0, 0, du, dv, dz, f_tablas(3.5, seed, 4), f_tablas(1.9, seed, 4), f_tablas_top(3.7, seed))
    # listones en cruz y esquineros
    s.lineaz((0, dv, 1), (du, dv, dz - 1), c("madera", 1))
    s.lineaz((0, dv, dz - 1), (du, dv, 1), c("madera", 1))
    s.contorno(-3)
    return s.recortar()


def barril(seed=1, alto=11):
    s = Spr(14, alto + 6, 7, alto + 3)
    for z in range(alto):
        f = z / (alto - 1)
        w = 4.4 + 1.5 * np.sin(np.pi * f)
        for x in range(-int(np.ceil(w)), int(np.ceil(w)) + 1):
            if abs(x + 0.5) > w:
                continue
            u = (x + w) / (2 * w)
            t = 3.8 - 2.6 * u + (0.5 if (x % 3 == 0) else 0)
            if z in (2, alto - 3):
                col = c("roca", int(np.floor(2.0 - 1.5 * u + 0.5)))
            else:
                col = c("madera", int(np.floor(t + 0.5)))
            s.pset(7 + x, alto + 2 - z, col)
    # tapa elíptica
    for i in range(-4, 5):
        s.pset(7 + i, 2, c("madera", 4)); s.pset(7 + i, 3, c("madera", 3))
    for i in range(-3, 4):
        s.pset(7 + i, 1, c("madera", 4))
    s.contorno(-3)
    return s.recortar()


def saco(seed=1, color=("tierra", 5)):
    s = Spr(11, 11, 5, 10)
    filas = [(3, 7), (2, 8), (1, 9), (0, 10), (0, 10), (0, 10), (1, 9), (1, 9)]
    for k, (a, b) in enumerate(filas):
        for x in range(a, b):
            u = (x - a) / max(1, (b - a - 1))
            s.pset(x, 2 + k, c(color[0], int(np.floor(color[1] + 0.7 - 2.0 * u + 0.5))))
    s.pset(4, 1, c(color[0], color[1] - 2)); s.pset(5, 1, c(color[0], color[1] - 1)); s.pset(6, 1, c(color[0], color[1] - 2))
    s.pset(5, 3, c(color[0], color[1] - 2))
    s.contorno(-3)
    return s.recortar()


def fardo(seed=1):
    s = Spr(30, 24, 14, 18)
    def paja(ss, tt, X, Y):
        h = hash2(np.floor(ss), np.floor(tt * 1.0), seed)
        return a_indice(np.full(ss.shape, RID["tierra"]), 4.2 + (h - 0.5) * 1.4 - (np.mod(tt, 5) < 0.6) * 0.9)
    caja(s, 0, 0, 0, 14, 10, 9, paja, lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["tierra"]), 2.2 + (hash2(np.floor(ss), np.floor(tt), seed) - 0.5)),
         lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["tierra"]), 4.8 + (hash2(np.floor(ss), np.floor(tt), seed + 1) - 0.5)))
    s.lineaz((0, 10, 3), (14, 10, 3), c("madera", 3)); s.lineaz((0, 10, 6), (14, 10, 6), c("madera", 3))
    s.contorno(-3)
    return s.recortar()


def carreta(carga="heno", seed=1):
    s = Spr(70, 54, 28, 36)
    # caja de madera
    caja(s, 0, 0, 5, 30, 14, 7, f_tablas(3.4, seed), f_tablas(1.8, seed), f_tablas_top(3.0, seed))
    # carga
    if carga == "heno":
        for (u, v, dz) in ((2, 2, 7), (10, 3, 8), (18, 2, 6)):
            caja(s, u, v, 12, 9, 9, dz - 2,
                 lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["tierra"]), 4.4 + (hash2(np.floor(ss), np.floor(tt), 3) - 0.5)),
                 lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["tierra"]), 2.3),
                 lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["tierra"]), 5.0 + (hash2(np.floor(ss), np.floor(tt), 4) - 0.5)))
    else:
        caja(s, 4, 2, 12, 20, 10, 9, f_mar(4.2, 3), f_mar(2.2, 3), f_mar_top(5.2, 3))
    # ruedas
    for (u, v) in ((6, 15), (24, 15)):
        cx, cy = s.P(u, v, 4)
        for ang in np.linspace(0, 2 * np.pi, 36, endpoint=False):
            s.pset(cx + np.cos(ang) * 5, cy + np.sin(ang) * 5 * 0.95, c("madera", 1))
            s.pset(cx + np.cos(ang) * 4, cy + np.sin(ang) * 4 * 0.95, c("madera", 3))
        for ang in np.linspace(0, 2 * np.pi, 8, endpoint=False):
            s.linea((cx, cy), (cx + np.cos(ang) * 4, cy + np.sin(ang) * 4), c("madera", 2))
        s.pset(cx, cy, c("roca", 3))
    # varas
    s.lineaz((30, 4, 7), (44, 8, 4), c("madera", 3))
    s.lineaz((30, 10, 7), (44, 10, 4), c("madera", 2))
    s.contorno(-3)
    return s.recortar()


def pozo():
    s = Spr(46, 84, 22, 44)
    # brocal octogonal de piedra
    caja(s, 2, 2, 0, 16, 16, 8, fn_sillar("piedra", 4.2, 7, bw=6, bh=3), fn_sillar("piedra", 2.2, 8, bw=6, bh=3), f_mar_top(5.0))
    cx, cy = s.P(10, 10, 8)
    for i in range(-5, 6):
        for j in range(-2, 3):
            if (i / 5.5) ** 2 + (j / 2.4) ** 2 <= 1:
                s.pset(cx + i, cy + j, c("agua", 1 if abs(i) > 3 else 0))
    # marco de madera con tejadillo y cubo
    poste(s, 3, 3, 8, 28, 1)
    poste(s, 17, 3, 8, 28, 1)
    s.lineaz((2, 10, 28), (18, 10, 28), c("madera", 3))
    s.lineaz((3, 10, 29), (17, 10, 29), c("madera", 4))
    for k in range(7):
        s.lineaz((10 - k * 1.3, 3 + k, 30 - k), (10 + k * 1.3, 3 + k, 30 - k), c("teja", 3 if k % 2 else 4))
    s.lineaz((10, 10, 28), (10, 10, 14), c("piedra", 4))
    s.rect(*(int(v) for v in s.P(10, 10, 12)), 3, 3, c("madera", 2))
    s.contorno(-3)
    return s.recortar()


def fuente(frame=0):
    """Fuente octogonal con surtidor (3 fotogramas de agua)."""
    s = Spr(76, 104, 38, 52)
    W = 34
    caja(s, 0, 0, 0, W, W, 6, fn_sillar("piedra", 4.3, 9, bw=7, bh=3), fn_sillar("piedra", 2.3, 10, bw=7, bh=3), f_mar_top(5.0))
    cx, cy = s.P(W / 2, W / 2, 6)
    for i in range(-13, 14):
        for j in range(-6, 7):
            if (i / 13.0) ** 2 + (j / 6.2) ** 2 <= 1:
                t = 4.0 - 1.4 * abs(i) / 13.0 + 0.35 * np.sin((i + frame * 3) * 0.9)
                s.pset(cx + i, cy + j, c("agua", int(np.floor(t + 0.5))))
    # pedestal y copa central
    for z in range(0, 14):
        w = 3 if z < 8 else 5
        for x in range(-w, w + 1):
            u = (x + w) / (2 * w)
            s.pset(cx + x, cy - z - 1, c("piedra", int(np.floor(5.4 - 3.0 * u + 0.5))))
    for i in range(-7, 8):
        s.pset(cx + i, cy - 15, c("piedra", 5)); s.pset(cx + i, cy - 14, c("piedra", 3))
    # chorro de agua que cambia por fotograma
    for k in range(6):
        s.pset(cx, cy - 16 - k, c("agua", 6 if (k + frame) % 2 == 0 else 5))
    for k in range(4):
        s.pset(cx - 1 - k // 2, cy - 18 + k - frame % 2, c("agua", 5)); s.pset(cx + 1 + k // 2, cy - 18 + k - (frame + 1) % 2, c("agua", 5))
    s.contorno(-3)
    return s.recortar()


def brasero(frame=0):
    s = Spr(16, 40, 8, 36)
    # trípode de hierro
    s.linea((3, 36), (6, 28), c("roca", 2)); s.linea((12, 36), (9, 28), c("roca", 1)); s.linea((8, 36), (8, 28), c("roca", 2))
    for x in range(4, 12):
        s.pset(x, 27, c("roca", 3)); s.pset(x, 26, c("roca", 2)); s.pset(x, 25, c("roca", 1))
    # brasas y llama (3 fotogramas)
    for x in range(5, 11):
        s.pset(x, 24, c("teja", 3))
    llama = [
        [(7, 23), (8, 23), (7, 22), (8, 22), (8, 21), (7, 20), (8, 19)],
        [(6, 23), (9, 23), (7, 22), (8, 22), (7, 21), (8, 20), (8, 19), (7, 18)],
        [(7, 23), (8, 23), (6, 22), (9, 22), (7, 21), (8, 21), (8, 20), (7, 19), (9, 18)],
    ][frame % 3]
    for k, (x, y) in enumerate(llama):
        s.pset(x, y, c("tierra", 6) if k < 3 else (c("oro", 2) if k < 5 else c("teja", 4)))
    s.contorno(-3)
    return s.recortar()


def valla(largo=32, eje="u"):
    # el eje v avanza hacia la izquierda: el origen va a la derecha para no recortar los postes
    s = Spr(largo + 30, largo + 30, 8 + (largo if eje == "v" else 0), 22)
    for k in range(0, largo + 1, 8):
        u, v = (k, 0) if eje == "u" else (0, k)
        poste(s, u, v, 0, 9, 1)
    for z in (4, 8):
        a = (0, 0, z)
        b = (largo, 0, z) if eje == "u" else (0, largo, z)
        s.lineaz(a, b, c("madera", 3))
        s.lineaz((a[0], a[1], z - 1), (b[0], b[1], z - 1), c("madera", 2))
    s.contorno(-3)
    return s.recortar()


def estandarte(frame=0, color=("carmesi", 2), alto=40):
    """Mástil con bandera ondeando (4 fotogramas)."""
    s = Spr(34, alto + 10, 4, alto + 8)
    for k in range(alto):
        s.pset(3, alto + 8 - k, c("madera", 3)); s.pset(4, alto + 8 - k, c("madera", 1))
    s.pset(3, 8 - 1, c("oro", 2)); s.pset(4, 8 - 1, c("oro", 1))
    for i in range(24):
        ond = np.sin((i * 0.4) - frame * np.pi / 2) * (1.0 + i * 0.07)
        for j in range(11):
            y = 9 + j + int(round(ond))
            t = color[1] + 0.8 - 1.5 * (i / 24.0) + (0.5 if (j < 2) else 0) - (0.6 if ((i + j) % 6 == 0) else 0)
            s.pset(5 + i, y, c(color[0], int(np.floor(t + 0.5))))
        s.pset(5 + i, 9 + int(round(ond)), c("oro", 1))
        s.pset(5 + i, 19 + int(round(ond)), c("oro", 0))
    for dy in range(3, 8):
        s.pset(12 + (dy % 3), 10 + dy + int(round(np.sin(1.5 - frame * np.pi / 2))), c("oro", 2))
    s.contorno(-3)
    return s.recortar()


def lena(seed=1):
    """Pila de troncos vista de costado."""
    s = Spr(24, 16, 12, 14)
    for fila in range(3):
        for k in range(4 - fila):
            cx, cy = 3 + k * 6 + fila * 3, 11 - fila * 5
            for dx in range(-3, 4):
                for dy in range(-2, 3):
                    if (dx / 3.2) ** 2 + (dy / 2.6) ** 2 <= 1:
                        t = 3.5 - 0.6 * (dx + 3) / 6.0
                        s.pset(cx + dx, cy + dy, c("madera", int(np.floor(t + 0.5))))
            s.pset(cx, cy, c("madera", 4)); s.pset(cx + 1, cy, c("madera", 2))
    s.contorno(-3)
    return s.recortar()
