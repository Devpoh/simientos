import sys
import numpy as np
from scipy import ndimage as ndi
import edificios as E
from util import guardar
from paleta import TRANSP
sprs = [E.casa(2,2,eje='u',seed=3), E.casa(2,2,eje='v',pared='tierra',t_lit=4.2,teja_t=3.5,seed=7,postigo='hierba')]
# huecos: transparentes encerrados (no conectados al borde)
for i,s in enumerate(sprs):
    op = s.px != TRANSP
    pad = np.pad(~op,1,constant_values=True)
    lab, n = ndi.label(pad)
    ext = lab[0,0]
    huecos = (lab != ext) & pad
    print('casa', i, 'huecos interiores:', huecos.sum())
W = sum(s.w for s in sprs)+30; Hh = max(s.h for s in sprs)+10
img = np.full((Hh, W), 3, np.uint8)
x=5
for s in sprs:
    y = Hh-s.h-5
    m = s.px != TRANSP
    img[y:y+s.h, x:x+s.w][m] = s.px[m]
    x += s.w+10
guardar(img, sys.argv[1], 10)
