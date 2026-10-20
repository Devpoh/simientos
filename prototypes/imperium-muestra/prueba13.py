import sys, time
import numpy as np
import escena_final as EF
from rejilla import rejilla
from util import guardar
t = time.time()
e = EF.construir()
print('construir', round(time.time()-t,1)); t = time.time()
e.preparar()
print('preparar', round(time.time()-t,1)); t = time.time()
img = e.dibujar(0)
print('dibujar', round(time.time()-t,1), img.shape)
if len(sys.argv) > 2:
    rejilla(img, escala=2, paso=2).save(sys.argv[1])
else:
    guardar(img, sys.argv[1], 2)
