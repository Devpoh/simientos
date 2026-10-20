import sys
import numpy as np
import props as PR
from util import guardar
from paleta import TRANSP
sp = [PR.caja_madera(1), PR.caja_madera(2), PR.barril(), PR.barril(), PR.saco(), PR.saco(color=("tierra",3)), PR.fardo(), PR.carreta('heno'), PR.carreta('marmol'), PR.pozo(), PR.fuente(0), PR.fuente(1), PR.brasero(0), PR.brasero(1), PR.brasero(2), PR.valla(32), PR.estandarte(0), PR.estandarte(1), PR.estandarte(2), PR.lena()]
ancho = sum(s.w+8 for s in sp)+8
alto = max(s.h for s in sp)+16
img = np.full((alto, ancho), 8, np.uint8)
x = 4
for s in sp:
    m = s.px != TRANSP
    img[alto-8-s.h:alto-8, x:x+s.w][m] = s.px[m]
    x += s.w+8
guardar(img, sys.argv[1], 4)
print(img.shape)
