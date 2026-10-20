import sys
import numpy as np
import mitologicos as M
from util import guardar
from paleta import TRANSP
filas = [
    [M.minotauro(0,'idle')] + [M.minotauro(k,'caminar') for k in range(4)] + [M.minotauro(0,'idle',carga=True)],
    [M.centauro(0,'idle')] + [M.centauro(k,'galope') for k in range(4)],
    [M.satiro(0,'tocar'), M.satiro(1,'tocar')] + [M.satiro(k,'caminar') for k in range(6)],
]
sp = 14
ancho = max(sum(s.w+sp for s in f) for f in filas)+8
alto = sum(max(s.h for s in f)+sp for f in filas)+8
img = np.full((alto, ancho), 8, np.uint8)
y = 6
for f in filas:
    x = 6
    hh = max(s.h for s in f)
    for s in f:
        m = s.px != TRANSP
        img[y+hh-s.h:y+hh, x:x+s.w][m] = s.px[m]
        x += s.w+sp
    y += hh+sp
guardar(img, sys.argv[1], 5)
print(img.shape, [[ (s.w,s.h) for s in f][:2] for f in filas])
