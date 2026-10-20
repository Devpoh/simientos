"""Hoja de revisión de los marcos 9-slice (R70): cada marco a x16 y aplicado como panel a x4.

Uso:  python bocetos/render_ui.py     → bocetos/ui_x16.png (los 4 marcos) y bocetos/ui_paneles_x4.png (en uso)
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image

import fuente
import ui as UI
from paleta import PALETA_RGB, TRANSP, c
from util import a_rgb

CORTE, TAM = UI.CORTE, UI.TAM
FONDO = c("hierba", 3)


def nueve_cortes(m, w, h):
    """Panel w×h a partir de un marco 16×16: esquinas fijas, lados repetidos (periodo 4) y centro estirado."""
    medio = TAM - 2 * CORTE
    assert (w - 2 * CORTE) % medio == 0 and (h - 2 * CORTE) % medio == 0, "w y h deben ser 12 + 4n"
    out = np.full((h, w), TRANSP, np.uint8)
    nx, ny = (w - 2 * CORTE) // medio, (h - 2 * CORTE) // medio
    out[:CORTE, :CORTE] = m[:CORTE, :CORTE]
    out[:CORTE, w - CORTE:] = m[:CORTE, TAM - CORTE:]
    out[h - CORTE:, :CORTE] = m[TAM - CORTE:, :CORTE]
    out[h - CORTE:, w - CORTE:] = m[TAM - CORTE:, TAM - CORTE:]
    for i in range(nx):
        x0 = CORTE + i * medio
        out[:CORTE, x0:x0 + medio] = m[:CORTE, CORTE:CORTE + medio]
        out[h - CORTE:, x0:x0 + medio] = m[TAM - CORTE:, CORTE:CORTE + medio]
    for j in range(ny):
        y0 = CORTE + j * medio
        out[y0:y0 + medio, :CORTE] = m[CORTE:CORTE + medio, :CORTE]
        out[y0:y0 + medio, w - CORTE:] = m[CORTE:CORTE + medio, TAM - CORTE:]
    out[CORTE:h - CORTE, CORTE:w - CORTE] = m[CORTE, CORTE]          # centro: un solo color
    return out


def ampliar(px, k, fondo=FONDO):
    px = px.copy()
    px[px == TRANSP] = fondo
    return np.repeat(np.repeat(a_rgb(px), k, 0), k, 1)


def pegar(lienzo, sub, x, y):
    lienzo[y:y + sub.shape[0], x:x + sub.shape[1]] = sub


def pegar_op(lienzo, sub, x, y):
    """Pega solo los píxeles opacos (las esquinas redondeadas dejan ver el fondo)."""
    ven = lienzo[y:y + sub.shape[0], x:x + sub.shape[1]]
    ven[sub != TRANSP] = sub[sub != TRANSP]


datos = UI.marcos()
orden = [("madera", "normal"), ("madera", "resaltado"), ("piedra", "normal"), ("piedra", "resaltado")]

# --- los 4 marcos a x16
K = 16
hoja = np.zeros((TAM * K + 24, 4 * (TAM * K + 16) + 16, 3), np.uint8)
hoja[:] = a_rgb(np.array([[FONDO]], np.uint8))[0, 0]
for n, (mat, est) in enumerate(orden):
    pegar(hoja, ampliar(datos[f"marco_{mat}"]["pixeles"][est], K), 16 + n * (TAM * K + 16), 8)
Image.fromarray(hoja).save(os.path.join(AQUI, "ui_x16.png"))

# --- paneles en uso a x4: dos tamaños por estado, con texto
tx = c("tierra", 6)
tx2 = c("oro", 2)
sub_w, sub_h = 92, 44
pw = 2 * (sub_w + 8) + 8
ph = 2 * (sub_h + 8) * 1 + 8 + 62
base = np.full((ph, pw), FONDO, np.uint8)
y = 8
for fila, mat in enumerate(("madera", "piedra")):
    for col, est in enumerate(("normal", "resaltado")):
        p = nueve_cortes(datos[f"marco_{mat}"]["pixeles"][est], sub_w, sub_h)
        x = 8 + col * (sub_w + 8)
        pegar_op(base, p, x, y)
        fuente.texto(base, x + 9, y + 10, "ALMACEN" if mat == "madera" else "TEMPLO", tx2)
        fuente.texto(base, x + 9, y + 19, "12 / 40", tx)
        fuente.texto(base, x + 9, y + 28, est.upper(), tx)
    y += sub_h + 8
# un panel ancho y otro alto, para ver el repetido de los lados
pa = nueve_cortes(datos["marco_madera"]["pixeles"]["normal"], 2 * sub_w + 8, 28)
pegar_op(base, pa, 8, y)
fuente.texto(base, 17, y + 11, "PANEL ANCHO DE MADERA, LOS LADOS REPITEN", tx)
y += 36
pb = nueve_cortes(datos["marco_piedra"]["pixeles"]["normal"], 2 * sub_w + 8, 20)
pegar_op(base, pb, 8, y)
fuente.texto(base, 17, y + 8, "PANEL DE PIEDRA", tx)
Image.fromarray(np.repeat(np.repeat(a_rgb(base), 4, 0), 4, 1)).save(os.path.join(AQUI, "ui_paneles_x4.png"))

pal = {tuple(int(v) for v in rgb) for rgb in PALETA_RGB}
for n in ("ui_x16.png", "ui_paneles_x4.png"):
    im = np.array(Image.open(os.path.join(AQUI, n)).convert("RGB"))
    cols = {tuple(int(v) for v in p) for p in im.reshape(-1, 3)}
    print(n, im.shape[1], "x", im.shape[0], "colores", len(cols), "fuera de paleta:", len(cols - pal))
