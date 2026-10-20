import sys, os
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
os.chdir(AQUI)
import sys
sys.dont_write_bytecode = True
import numpy as np
from paleta import TRANSP, N_COLORES
from util import guardar
import campos as E
from paleta import c, PALETA_RGB
from util import a_rgb
from PIL import Image
import fuente, os

def a_img(px, esc=1, fondo=None):
    px = px.copy()
    if fondo is not None:
        px[px == TRANSP] = fondo
    rgb = a_rgb(px)
    if esc > 1:
        rgb = np.repeat(np.repeat(rgb, esc, 0), esc, 1)
    return Image.fromarray(rgb)

etapas = E.construir()
w, h = etapas[0].w, etapas[0].h
print("lienzo comun", w, "x", h, "| ancla vertice trasero", etapas[0].ax, etapas[0].ay,
      "| ancla de pies (vertice delantero)", etapas[0].ax + (E.W - E.D), etapas[0].ay + (E.W + E.D) // 2)
fondo = c("hierba", 3)
for i, s in enumerate(etapas, 1):
    a_img(s.px, 8, fondo).save(f"c{i}_x8.png")
    # RGBA transparente para validar.py
    rgb = a_rgb(s.px); a = np.where(s.px == TRANSP, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([rgb, a])).save(f"c{i}_rgba.png")
n = len(etapas)
marg, rot = 6, 9
fila = np.full((h + marg * 2 + rot, n * w + (n + 1) * marg), fondo, np.uint8)
for i, s in enumerate(etapas):
    x0 = marg + i * (w + marg); y0 = marg + rot
    sub = fila[y0:y0 + h, x0:x0 + w]
    m = s.px != TRANSP
    sub[m] = s.px[m]
    fuente.texto(fila, x0, 3, E.NOMBRES[i], c("tierra", 6))
a_img(fila, 1).save("campos_x1.png")
a_img(fila, 4).save("campos_x4.png")
pal = {tuple(int(x) for x in rgb) for rgb in PALETA_RGB}
for nombre in ("campos_x1.png", "campos_x4.png"):
    im = np.array(Image.open(nombre).convert("RGB"))
    cols = {tuple(int(x) for x in p) for p in im.reshape(-1, 3)}
    print(nombre, im.shape[1], "x", im.shape[0], "colores", len(cols), "fuera de paleta:", len(cols - pal))
x1 = np.array(Image.open("campos_x1.png").convert("RGB")); x4 = np.array(Image.open("campos_x4.png").convert("RGB"))
print("x4 ampliacion exacta:", np.array_equal(x4, np.repeat(np.repeat(x1, 4, 0), 4, 1)))
