import sys
import numpy as np
import personajes as P
from util import guardar
from paleta import TRANSP
tipos = list(P.TIPOS)
filas = []
for t in tipos:
    for muj in (False, True):
        fr = [P.persona(t, 0, 'idle', mujer=muj)] + [P.persona(t, k, 'caminar', mujer=muj) for k in range(6)] + [P.persona(t, 0, 'idle', espaldas=True, mujer=muj)]
        filas.append(fr)
cols = len(filas[0])
img = np.full((len(filas)*26+4, cols*18+4), 3, np.uint8)
for r,fr in enumerate(filas):
    for k,s in enumerate(fr):
        m = s.px != TRANSP
        y=4+r*26; x=4+k*18
        img[y:y+24, x:x+16][m] = s.px[m]
guardar(img, sys.argv[1], 6)
print(img.shape)
