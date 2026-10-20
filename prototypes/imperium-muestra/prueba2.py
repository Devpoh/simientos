import sys
import numpy as np
import edificios as E
from util import guardar
from paleta import TRANSP
sprs = [E.casa(2,2,eje='u',seed=3), E.casa(2,2,eje='v',pared='tierra',t_lit=4.2,teja_t=3.5,seed=7,postigo='hierba'), E.casa(3,2,eje='u',seed=11,pared='piedra',t_lit=5.0,postigo='teja')]
W = sum(s.w for s in sprs)+10*len(sprs); Hh = max(s.h for s in sprs)+10
img = np.full((Hh, W), 255, np.uint8)
# fondo hierba plana
img[:] = 3
x=5
for s in sprs:
    y = Hh-s.h-5
    m = s.px != TRANSP
    img[y:y+s.h, x:x+s.w][m] = s.px[m]
    x += s.w+10
guardar(img, sys.argv[1], 5)
print(W,Hh,[ (s.w,s.h,s.ax,s.ay) for s in sprs])
