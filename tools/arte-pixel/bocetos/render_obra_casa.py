"""Hojas de revisión de las 6 etapas de obra de una casa (x1, x4 y cada etapa en x8).

Uso:  python bocetos/render_obra_casa.py [w d [u|v [variante]]]     (por defecto 2 2 u a)
Escribe en bocetos/ : obra_<w>x<d>_<eje>_x1.png, _x4.png y e<n>_x8.png. Comprueba paleta y ampliación exacta.
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image

import catalogo as CAT
import fuente
import obra_casa as OB
from paleta import PALETA_RGB, TRANSP, c
from util import a_rgb

w = int(sys.argv[1]) if len(sys.argv) > 1 else 2
d = int(sys.argv[2]) if len(sys.argv) > 2 else 2
eje = sys.argv[3] if len(sys.argv) > 3 else "u"
var = sys.argv[4] if len(sys.argv) > 4 else "a"
kw = (CAT.CASAS_2X2 if w == 2 else CAT.CASAS_3X2)[var]


def a_img(px, esc=1, fondo=None):
    px = px.copy()
    if fondo is not None:
        px[px == TRANSP] = fondo
    rgb = a_rgb(px)
    if esc > 1:
        rgb = np.repeat(np.repeat(rgb, esc, 0), esc, 1)
    return Image.fromarray(rgb)


etapas = OB.hoja_vista(w, d, kw, eje)
fondo = c("hierba", 3)
pref = os.path.join(AQUI, f"obra_{w}x{d}_{eje}")
for i, s in enumerate(etapas, 1):
    a_img(s.px, 8, fondo).save(os.path.join(AQUI, f"e{i}_x8.png"))
n, ew, eh = len(etapas), etapas[0].w, etapas[0].h
marg, rot = 6, 9
fila = np.full((eh + marg * 2 + rot, n * ew + (n + 1) * marg), fondo, np.uint8)
for i, s in enumerate(etapas):
    x0, y0 = marg + i * (ew + marg), marg + rot
    sub = fila[y0:y0 + eh, x0:x0 + ew]
    m = s.px != TRANSP
    sub[m] = s.px[m]
    fuente.texto(fila, x0, 3, OB.NOMBRES[i], c("tierra", 6))
a_img(fila, 1).save(pref + "_x1.png")
a_img(fila, 4).save(pref + "_x4.png")
pal = {tuple(int(x) for x in rgb) for rgb in PALETA_RGB}
x1 = np.array(Image.open(pref + "_x1.png").convert("RGB"))
x4 = np.array(Image.open(pref + "_x4.png").convert("RGB"))
cols = {tuple(int(x) for x in p) for p in x4.reshape(-1, 3)}
print(f"casa {w}x{d} eje {eje} · lienzo {ew}x{eh} · ancla {etapas[0].ax},{etapas[0].ay}")
print(f"  x1 {x1.shape[1]}x{x1.shape[0]} · x4 {x4.shape[1]}x{x4.shape[0]} · {len(cols)} colores, fuera de paleta: {len(cols - pal)}"
      f" · x4 exacto: {np.array_equal(x4, np.repeat(np.repeat(x1, 4, 0), 4, 1))}")
for h_n, h in OB.etapas_casa(w, d, kw).items():
    print(f"  huellaObra etapa{h_n}: {h['huella']}")
