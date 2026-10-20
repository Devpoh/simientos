import sys
import numpy as np
import edificios as E
from escena import Escena
from rejilla import rejilla
from util import guardar
e = Escena()
e.en_tile(E.casa(2,2,eje='u',seed=3), 1, 4, 2, 2, alto_sombra=30)
e.en_tile(E.casa(2,2,eje='v',pared='tierra',t_lit=4.2,teja_t=3.5,seed=7,postigo='hierba'), 4, 7, 2, 2, alto_sombra=30)
e.en_tile(E.casa(3,2,eje='u',seed=11,t_lit=5.0,postigo='teja'), 1, 11, 3, 2, alto_sombra=30)
e.preparar()
img = e.dibujar(0)
if len(sys.argv) > 2:
    rejilla(img).save(sys.argv[1])
else:
    guardar(img, sys.argv[1], 2)
