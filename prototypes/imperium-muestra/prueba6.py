import sys
import numpy as np
import templo as TP
from util import guardar
from paleta import TRANSP
sprs = [TP.templo(1), TP.templo(2), TP.templo(3)]
W = sum(s.w for s in sprs)+30*len(sprs); Hh = max(s.h for s in sprs)+10
img = np.full((Hh, W), 3, np.uint8)
x=5
for s in sprs:
    y = Hh-s.h-5
    m = s.px != TRANSP
    img[y:y+s.h, x:x+s.w][m] = s.px[m]
    x += s.w+20
guardar(img, sys.argv[1], 3)
print([(s.w,s.h,s.ax,s.ay) for s in sprs])
