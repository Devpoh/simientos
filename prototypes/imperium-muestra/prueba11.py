import sys
import numpy as np
import edificios2 as E2, edificios as E
from util import guardar
from paleta import TRANSP
fila1 = [E2.puesto(("teja",3.4),("piedra",5.0),"fruta"), E2.puesto(("azul",1.8),("piedra",5.0),"telas",seed=2), E2.puesto(("tierra",4.0),("piedra",5.0),"pan",seed=3), E2.puesto(("hierba",3.2),("piedra",5.0),"ceramica",seed=4), E2.puesto(("carmesi",1.6),("tierra",5.0),"pescado",seed=5)]
fila2 = [E2.faro(), E2.puente(), E2.torre()]
fila3 = [E2.solar_casa(), E2.casa_obra(), E.casa(2,2,eje='u',seed=3)]
filas = [fila1, fila2, fila3]
sp = 12
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
guardar(img, sys.argv[1], 4)
print(img.shape, [[(s.w,s.h) for s in f] for f in filas])
