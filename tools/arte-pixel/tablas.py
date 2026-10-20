"""Tablas de rampas: índice de paleta por (rampa, tono). Lo usan los generadores de sprites."""
import numpy as np
from paleta import RAMPA_IDX

RN = list(RAMPA_IDX.keys())
RID = {n: i for i, n in enumerate(RN)}
TABLA = np.zeros((len(RN), 8), np.uint8)
for _n, _ids in RAMPA_IDX.items():
    for _t in range(8):
        TABLA[RID[_n], _t] = _ids[min(_t, len(_ids) - 1)]


def a_indice(ramp, tono):
    """ramp: array de ids de rampa; tono: array float/int -> índices de paleta."""
    t = np.clip(np.floor(tono + 0.5).astype(int), 0, 7)
    return TABLA[ramp, t]
