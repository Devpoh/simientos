"""Boceto ESC1 (R89, R90): seres a la escala nueva frente a los edificios (1 tile ≈ 2 m).

Orden lógico: oveja < vaca < adulto ≈ cabeza del caballo < puerta (15 px) < alero < casa. Los edificios no cambian; los seres se
dibujan A SU TAMAÑO (plantillas de píxeles y polígonos a escala 0,38), no se reducen con filtro. Solo pose idle de frente/perfil.

Uso (desde tools/arte-pixel):  python escala.py  → bocetos/escala_x4.png y bocetos/escala_x1.png
"""
import os
import sys

sys.dont_write_bytecode = True
import numpy as np
from PIL import Image

import almacen as AL
import animales as AN
import caballo as CB
import catalogo as CAT
import chozas as CH
import edificios as ED
import fuente
import personajes as PE
from iso import Spr
from mitologicos import LG, _spr
from paleta import TINTA, TRANSP, c
from util import a_rgb

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "bocetos")
FONDO = c("hierba", 3)


# ---------------------------------------------------------------- humanos de 13 px (plantillas)
def _persona(filas, ley, hombros=None):
    h, w = len(filas), len(filas[0])
    L = LG(w + 2, h + 2)
    L.art(1, 1, filas, ley)
    return _spr(L, 1 + w // 2, h + 1)


PIEL = {"f": c("piel", 1), "F": c("piel", 2), "e": c("madera", 0)}


def campesino():
    ley = dict(PIEL, H=c("tierra", 5), h=c("tierra", 4), j=c("tierra", 3), t=c("tierra", 6), T=c("tierra", 5),
               v=c("hierba", 3), V=c("hierba", 2), p=c("madera", 2), P=c("madera", 1), s=c("madera", 0),
               m=c("madera", 3), M=c("piedra", 3), b=c("madera", 1))
    filas = [
        "..HHHH....",
        ".HHHHHhj.M",
        "...fffF.MM",
        "...efeF..m",
        "..vtttV..m",
        ".fvtttVf.m",
        ".fvvvVVf.m",
        "..bbbbb..m",
        "..ppPpP..m",
        "..pp.PP..m",
        "..pp.PP..m",
        "..pp.PP..m",
        "..ss.ss...",
    ]
    return _persona(filas, ley)


def campesina():
    ley = dict(PIEL, o=c("teja", 3), O=c("teja", 2), q=c("teja", 4), t=c("tierra", 6), T=c("tierra", 5), d=c("tierra", 4),
               D=c("tierra", 3), a=c("azul", 1), s=c("madera", 0), r=c("carmesi", 1))
    filas = [
        "...qqqq...",
        "..qooooO..",
        "..offfFO..",
        "..oefeFO..",
        "..OtttdO..",
        "..fTttdf..",
        "..fTtdDf..",
        "..aaaaa...",
        "..TTtdDD..",
        ".TTttddDD.",
        ".TTtddDDD.",
        "..ff.ff...",
        "..ss.ss...",
    ]
    return _persona(filas, ley)


def sacerdote():
    ley = dict(PIEL, w=c("piedra", 5), W=c("piedra", 6), x=c("piedra", 4), X=c("piedra", 3), u=c("purpura", 1), U=c("purpura", 2),
               g=c("oro", 2), G=c("oro", 1), m=c("madera", 3), y=c("oro", 2), n=c("piedra", 5))
    filas = [
        "..gggg.y..",
        "..nnnnygy.",
        "...ffF..m.",
        "..nefeFn.m",
        "..wWWWx..m",
        ".fwuUuxf.m",
        ".fwWuxxf.m",
        "..wWuxx..m",
        "..wWuxx..m",
        ".wwWuUxX.m",
        ".wwWuUxX.m",
        ".wwwuUXXXm",
        ".wwwuUXXX.",
    ]
    return _persona(filas, ley)


def nino():
    ley = dict(PIEL, o=c("madera", 1), O=c("madera", 0), t=c("tierra", 6), T=c("tierra", 5), d=c("tierra", 4),
               p=c("madera", 2), s=c("madera", 0))
    filas = [
        "..oooo..",
        ".oofffO.",
        ".oefefO.",
        "..tTTd..",
        ".ftTTdf.",
        "..tTdd..",
        "..pp.pp.",
        "..ss.ss.",
    ]
    return _persona(filas, ley)


# ---------------------------------------------------------------- animales a escala
def caballo_peq(k=0.38):
    """El caballo v3 redibujado con sus mismos polígonos a escala k (no es un reescalado de píxeles)."""
    L = LG(26, 19)
    luz, med, som, hon = CB.CAPAS["castano"][0]
    mel, mel2, mel3 = CB.CAPAS["castano"][1][1], CB.CAPAS["castano"][1][0], CB.CAPAS["castano"][1][2]
    cu = (luz, med, som, hon)
    osc = (med, som, hon, hon)
    OY = 1.0

    def S(pts):
        return [(x * k, (y + 1.0) * k + OY) for x, y in pts]
    P = lambda pts, cols, *a: CB.parte(L, S(pts), cols, *a)
    # patas (las lejanas más oscuras): cuatro columnas rectas, con casco
    for x0, lejana, delant in ((12, True, False), (30, True, True), (8, False, False), (31, False, True)):
        cl = osc if lejana else cu
        P([(x0, 18), (x0 + 7, 18), (x0 + 6, 39), (x0 + 1, 39)], cl, 1, 1, 0, 1)
        P([(x0 - 1, 36), (x0 + 7, 36), (x0 + 7, 40), (x0 - 1, 40)], (c("madera", 1), c("madera", 0), TINTA, TINTA), 1, 1, 1, 1)
    P([(6, 12), (3, 14), (1, 20), (1, 28), (3, 33), (5, 28), (4, 21), (7, 16)], (mel2, mel, mel3, mel3), 0, 0, 0, 0)       # cola
    P([(6, 12), (8, 9), (14, 8), (21, 10), (27, 10), (31, 9), (34, 11), (37, 15), (38, 20), (35, 24), (29, 25), (22, 24),
       (15, 24), (9, 23), (5, 19), (4, 15)], cu, 1, 2, 1, 1)                                                         # cuerpo
    P([(30, 11), (33, 7), (37, 3), (41, 1), (44, 3), (44, 7), (41, 11), (39, 15), (38, 20), (34, 16)], cu, 1, 2, 1, 1)  # cuello
    P([(29, 11), (32, 6), (36, 2), (41, 0), (42, 2), (38, 4), (35, 8), (32, 12)], (mel2, mel, mel3, mel3), 0, 0, 0, 0)     # crin
    P([(42, 2), (45, 1), (49, 5), (53, 10), (53, 12), (50, 13), (46, 11), (43, 8)], cu, 1, 1, 1, 1)                      # cabeza
    P([(42, 2), (42, -1), (45, 1)], cu, 0, 0, 0, 0)
    L.pt(round(46 * k + 0.5), round(6 * k + OY), TINTA)
    return _spr(L, 8, 17)


def vaca_peq():
    ley = {"L": c("piedra", 6), "l": c("piedra", 5), "d": c("piedra", 4), "D": c("piedra", 3), "m": c("madera", 1),
           "M": c("madera", 0), "k": c("teja", 4), "K": c("teja", 3), "x": c("tierra", 5), "h": c("madera", 0), "z": c("piedra", 4)}
    filas = [
        "..LLLLLLL......x",
        ".LLmmLLmmLL.xLLL",
        "LLLmmLLLmmLLLLLL",
        "lLLLLLLLmLLLLLmM",
        "lllLLLlllLLLLkkk",
        ".llkldlllldDLLkK",
        "..hh..hh.hh.hh..",
        "..hh..hh.hh.hh..",
    ]
    # patas más finas: dos píxeles bajo la panza
    L = LG(18, 10)
    L.art(1, 1, filas[:5], ley)
    for xx in (3, 4, 7, 8, 11, 13):
        pass
    for xx in (3, 7, 11, 14):
        L.r(xx, 6, 1, 3, c("piedra", 4)); L.pt(xx, 8, c("madera", 0))
        L.pt(xx + 1, 6, c("piedra", 3)); L.pt(xx + 1, 7, c("piedra", 3))
    L.r(5, 6, 6, 1, c("teja", 3)) if False else None
    return _spr(L, 9, 8)


def oveja_peq():
    ley = {"W": c("piedra", 6), "w": c("piedra", 5), "m": c("piedra", 4), "c": c("madera", 2), "C": c("madera", 1), "e": c("madera", 0)}
    filas = [
        ".WWWWw...",
        "WWwWWwwcc",
        "wWwwmwwce",
        "wwmwwwwCc",
        ".mmwmmw..",
    ]
    L = LG(11, 8)
    L.art(1, 1, filas, ley)
    for xx in (2, 4, 6, 8):
        L.pt(xx, 6, c("madera", 1)); L.pt(xx, 7, c("madera", 0))
    return _spr(L, 5, 7)


# ---------------------------------------------------------------- hoja
def actuales():
    return [("HOMBRE", PE.persona("campesino")), ("MUJER", PE.persona("campesino", mujer=True)),
            ("SACERDOTE", PE.persona("sacerdote")), ("CABALLO", AN.ANIMALES["caballo"](pose="idle")),
            ("VACA", AN.vaca(pose="idle")), ("OVEJA", AN.oveja(pose="idle"))]


def nuevos():
    return [("HOMBRE", campesino()), ("MUJER", campesina()), ("SACERDOTE", sacerdote()), ("NINO", nino()),
            ("CABALLO", caballo_peq()), ("VACA", vaca_peq()), ("OVEJA", oveja_peq())]


def edificios():
    casa = ED.casa(2, 2, eje="u", **CAT.CASAS_2X2["c"])
    return [("CASA 2X2", casa), ("CHOZA 2X2", CH.choza_troncos()), ("ALMACEN ERA 1", AL.almacen_adobe())]


def altura(s):
    ys, _ = np.where(s.px != TRANSP)
    return int(ys.max() - ys.min() + 1)


def fila(lienzo, y_base, items, x, marg=6):
    """Edificios y seres con los pies sobre la línea base; los seres un poco por delante."""
    pos = []
    for nombre, s in items:
        ys, xs = np.where(s.px != TRANSP)
        ancho = int(xs.max() - xs.min() + 1)
        pie = s.ay if s.w < 62 else int(ys.max())
        y0 = y_base - pie
        x0 = x - int(xs.min())
        sub = lienzo[y0 + ys.min():y0 + ys.max() + 1, x0 + xs.min():x0 + xs.max() + 1]
        sub[(s.px != TRANSP)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]] = s.px[ys.min():ys.max() + 1, xs.min():xs.max() + 1][
            (s.px != TRANSP)[ys.min():ys.max() + 1, xs.min():xs.max() + 1]]
        pos.append((nombre, x, ancho, altura(s)))
        x += ancho + marg
    return pos, x


def hoja(titulo_a="ACTUAL", titulo_b="NUEVA ESCALA"):
    ed = edificios()
    W_ = 520
    H_ = 190
    lienzo = np.full((H_, W_), FONDO, np.uint8)
    medidas = {}
    for fila_i, (titulo, seres) in enumerate(((titulo_a, actuales()), (titulo_b, nuevos()))):
        y_base = 78 + fila_i * 98
        fuente.texto(lienzo, 4, y_base - 74, titulo, c("tierra", 6), c("tinta", 0))
        pos, x = fila(lienzo, y_base, ed, 6, 8)
        pos2, x = fila(lienzo, y_base - 4, seres, x + 10, 6)
        for nombre, xx, ancho, alto in pos2:
            fuente.texto(lienzo, xx, y_base + 6, f"{alto}", c("tierra", 5), c("tinta", 0))
        medidas[titulo] = [(n, a) for n, _, _, a in pos2]
    return lienzo, medidas


if __name__ == "__main__":
    os.makedirs(SALIDA, exist_ok=True)
    lienzo, med = hoja()
    Image.fromarray(np.repeat(np.repeat(a_rgb(lienzo), 4, 0), 4, 1)).save(os.path.join(SALIDA, "escala_x4.png"))
    # x1: solo la fila de abajo (nueva escala), tamaño real
    Image.fromarray(a_rgb(lienzo[98:, :])).save(os.path.join(SALIDA, "escala_x1.png"))
    for k, v in med.items():
        print(k, v)
