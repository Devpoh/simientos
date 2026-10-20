"""Revisión del almacén de era 1: ×8 y, junto a una casa de era 2, ×4 (para comparar escala y material).

Uso:  python bocetos/render_almacen.py   → bocetos/almacen_era1_x8.png y almacen_era1_x4.png
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image

import almacen as AL
import catalogo as CAT
import edificios as ED
import fuente
from paleta import PALETA_RGB, TRANSP, c
from util import a_rgb

FONDO = c("hierba", 3)


def ampliar(px, k):
    px = px.copy()
    px[px == TRANSP] = FONDO
    return np.repeat(np.repeat(a_rgb(px), k, 0), k, 1)


alm = AL.almacen_adobe()
Image.fromarray(ampliar(alm.px, 8)).save(os.path.join(AQUI, "almacen_era1_x8.png"))
casa = ED.casa(2, 2, eje="u", **CAT.CASAS_2X2["c"])
# x1 con rótulos: almacén de era 1 (adobe, azotea) y casa de adobe de era 2 (teja) a la misma escala
marg = 10
w = alm.w + casa.w + 3 * marg
h = max(alm.h, casa.h) + 2 * marg + 9
lienzo = np.full((h, w), FONDO, np.uint8)
for spr, x0, rot in ((alm, marg, "ALMACEN ERA 1"), (casa, 2 * marg + alm.w, "CASA ERA 2")):
    y0 = h - marg - spr.h
    sub = lienzo[y0:y0 + spr.h, x0:x0 + spr.w]
    sub[spr.px != TRANSP] = spr.px[spr.px != TRANSP]
    fuente.texto(lienzo, x0, 3, rot, c("tierra", 6))
Image.fromarray(ampliar(lienzo, 4)).save(os.path.join(AQUI, "almacen_era1_x4.png"))
pal = {tuple(int(v) for v in rgb) for rgb in PALETA_RGB}
for n in ("almacen_era1_x8.png", "almacen_era1_x4.png"):
    im = np.array(Image.open(os.path.join(AQUI, n)).convert("RGB"))
    cols = {tuple(int(v) for v in p) for p in im.reshape(-1, 3)}
    print(n, im.shape[1], "x", im.shape[0], "colores", len(cols), "fuera de paleta:", len(cols - pal))
print("almacén", alm.w, "x", alm.h, "ancla", alm.ax, alm.ay)
