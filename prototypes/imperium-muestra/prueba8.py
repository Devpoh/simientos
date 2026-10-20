import sys
import numpy as np
import barcos as B
from util import guardar
from paleta import TRANSP
sprs = [B.galera('u'), B.mercante('u'), B.pesquero('u'), B.galera('v'), B.mercante('v')]
W = sum(s.w for s in sprs)+12*len(sprs)+10; Hh = max(s.h for s in sprs)+10
img = np.full((Hh, W), 5, np.uint8)  # agua tono medio
img[:] = 4
x=5
for s in sprs:
    y = Hh-s.h-5
    m = s.px != TRANSP
    img[y:y+s.h, x:x+s.w][m] = s.px[m]
    x += s.w+12
guardar(img, sys.argv[1], 4)
print(W,Hh,[(s.w,s.h) for s in sprs])
