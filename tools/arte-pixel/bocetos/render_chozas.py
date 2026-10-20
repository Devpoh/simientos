"""Boceto E0: viviendas de era 0 junto al almacén de era 1 (referencia de escala y estilo).

Uso:  python bocetos/render_chozas.py   → bocetos/chozas_era0_x4.png (limpio, con rótulos) y chozas_era0_huella_x4.png (huella y ancla)
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))
sys.dont_write_bytecode = True
import numpy as np
from PIL import Image, ImageDraw

import almacen as AL
import chozas as CH
import fuente
from paleta import PALETA_RGB, TRANSP, c
from util import a_rgb

FONDO = c("hierba", 3)
ESCALA = 4

piezas = [("CHOZA REDONDA", CH.choza_redonda(), 1, 1),
          ("CHOZA TRONCOS", CH.choza_troncos(), 2, 2),
          ("ALMACEN ERA 1", AL.almacen_adobe(), 2, 2)]


def hoja(con_huella):
    marg = 10
    w = sum(max(s.w, 80) for _, s, _, _ in piezas) + marg * (len(piezas) + 1)
    alto = max(s.h for _, s, _, _ in piezas)
    h = alto + 2 * marg + 32
    lienzo = np.full((h, w), FONDO, np.uint8)
    x = marg
    marcas = []
    for nombre, s, wt, dt in piezas:
        ancho = max(s.w, 80)
        x0 = x + (ancho - s.w) // 2
        y0 = marg + alto - s.h
        sub = lienzo[y0:y0 + s.h, x0:x0 + s.w]
        sub[s.px != TRANSP] = s.px[s.px != TRANSP]
        # ancla = centro de la huella proyectado; el origen del sprite (0,0,0) está en (s.ax, s.ay)
        W_, D_ = wt * 16, dt * 16
        ancla = (x0 + s.ax + (W_ - D_) / 2, y0 + s.ay + (W_ + D_) / 4)
        marcas.append((x0 + s.ax, y0 + s.ay, W_, D_, ancla))
        yt = marg + alto + 8
        fuente.texto(lienzo, x, yt, nombre, c("tierra", 6), c("tinta", 0))
        fuente.texto(lienzo, x, yt + 8, f"HUELLA {wt}X{dt} TILES", c("tierra", 4), c("tinta", 0))
        fuente.texto(lienzo, x, yt + 16, f"ANCLA {int(round(ancla[0] - x0))},{int(round(ancla[1] - y0))}", c("tierra", 4), c("tinta", 0))
        x += ancho + marg
    if con_huella:
        im = Image.fromarray(lienzo)
        d = ImageDraw.Draw(im)
        for ox, oy, W_, D_, (cx, cy) in marcas:
            pts = [(ox, oy), (ox + W_, oy + W_ / 2), (ox + W_ - D_, oy + (W_ + D_) / 2), (ox - D_, oy + D_ / 2)]
            d.polygon([(int(a), int(b)) for a, b in pts], outline=int(c("oro", 2)))
        lienzo = np.array(im)
        for ox, oy, W_, D_, (cx, cy) in marcas:
            for k in range(-3, 4):
                lienzo[int(cy), int(cx) + k] = c("carmesi", 2)
                lienzo[int(cy) + k, int(cx)] = c("carmesi", 2)
    return lienzo


def guardar(lienzo, nombre):
    rgb = np.repeat(np.repeat(a_rgb(lienzo), ESCALA, 0), ESCALA, 1)
    Image.fromarray(rgb).save(os.path.join(AQUI, nombre))


if __name__ == "__main__":
    base = hoja(False)
    guardar(base, "chozas_era0_x4.png")
    Image.fromarray(a_rgb(base)).save(os.path.join(AQUI, "chozas_era0_x1.png"))
    guardar(hoja(True), "chozas_era0_huella_x4.png")
    for n, s, wt, dt in piezas:
        print(n, s.w, "x", s.h, "ancla (0,0,0) en", s.ax, s.ay)
