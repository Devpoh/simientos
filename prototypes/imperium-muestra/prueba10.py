import sys
import numpy as np
import animales as A
from util import guardar
from paleta import TRANSP
filas = [
    [A.oveja(0,'pastar'), A.oveja(1,'pastar')] + [A.oveja(k,'caminar') for k in range(4)] + [A.oveja(0,'pastar', oscura=True)],
    [A.vaca(0,'pastar'), A.vaca(1,'pastar')] + [A.vaca(k,'caminar') for k in range(4)] + [A.vaca(0,'pastar', tipo='roja')],
    [A.caballo(0,'pastar'), A.caballo(1,'pastar')] + [A.caballo(k,'caminar') for k in range(4)] + [A.caballo(0,'pastar', capa='blanco'), A.caballo(0,'pastar', capa='negro')],
    [A.gallina(0), A.gallina(1), A.gallina(0,tipo='roja')],
]
sp = 8
ancho = max(sum(s.w+sp for s in f) for f in filas)+8
alto = sum(max(s.h for s in f)+sp for f in filas)+8
img = np.full((alto, ancho), 8, np.uint8)
y = 4
for f in filas:
    x = 4
    hh = max(s.h for s in f)
    for s in f:
        m = s.px != TRANSP
        img[y+hh-s.h:y+hh, x:x+s.w][m] = s.px[m]
        x += s.w+sp
    y += hh+sp
guardar(img, sys.argv[1], 6)
