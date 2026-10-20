"""Depuración: dibuja la rejilla de tiles (solo para colocar cosas, no va en la entrega)."""
import sys
import numpy as np
from PIL import Image, ImageDraw
import terreno as T, render as R
from util import a_rgb

def rejilla(img_idx, h=6, escala=3, paso=1):
    rgb = a_rgb(img_idx)
    big = np.repeat(np.repeat(rgb, escala, 0), escala, 1)
    im = Image.fromarray(big)
    d = ImageDraw.Draw(im)
    for u in range(-20, 60, paso):
        for v in range(-20, 50, paso):
            x, y = T.tp(u, v)
            sy = y - h
            if 0 <= x < T.SW and 0 <= sy < T.SH:
                d.rectangle([x*escala-1, sy*escala-1, x*escala+1, sy*escala+1], fill=(255, 255, 255))
                if (u % 2 == 0 and v % 2 == 0):
                    d.text((x*escala+3, sy*escala-4), f"{u},{v}", fill=(255, 255, 0))
    return im
