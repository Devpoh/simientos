import sys
import numpy as np
import arboles as A
from util import guardar
from paleta import TRANSP
sprs = [A.cipres(1) if hasattr(A,'cipres') else A.ciprés(1), A.ciprés(2,40), A.pino(1), A.pino(4), A.encina(1), A.encina(3,1.0), A.olivo(1), A.olivo(2), A.arbusto(1), A.arbusto(2,1.3), A.roca(1), A.roca(2,1.2), A.roca(3,0.8)]
W = sum(s.w for s in sprs)+8*len(sprs)+10; Hh = max(s.h for s in sprs)+10
img = np.full((Hh, W), 3, np.uint8)
img[:] = 4   # hierba tono 4 de 'hierba' no, solo fondo
img[:] = 8
x=5
for s in sprs:
    y = Hh-s.h-5
    m = s.px != TRANSP
    img[y:y+s.h, x:x+s.w][m] = s.px[m]
    x += s.w+8
guardar(img, sys.argv[1], 5)
print(W,Hh)
