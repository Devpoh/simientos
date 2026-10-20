import sys, time
import numpy as np
import terreno as T, render as R
from util import guardar
t=time.time()
m = T.construir()
b = R.preparar(m)
print('prep', time.time()-t)
ti = R.pintar_tierra(b)
print('tierra', time.time()-t)
img = R.componer_base(b, ti, 0)
print('agua', time.time()-t)
guardar(img, sys.argv[1], 2)
