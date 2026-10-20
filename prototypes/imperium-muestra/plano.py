"""Plano de la ciudad: calles, plaza, campos y decoración del suelo (coordenadas de tile)."""
import numpy as np
import terreno as T
from terreno import (RIO_U, U, V, GW, GH, rect, dist_poly, M_HIERBA, M_SECA, M_TIERRA, M_PLAZA, M_ADOQUIN,
                     M_ARADO, M_TRIGO, M_VID, M_HUERTA, M_BOSQUE, M_PRADO, M_RASTROJO, M_OBRA, M_LOSA,
                     F_SILLAR, F_TIERRA)
from util import vnoise, fbm, hash2

# calles irregulares (puntos en tiles (U,V), ancho en tiles, material)
CAMINOS = [
    # ---- calles principales (2 tiles de ancho) y travesías
    ([(3.8, 2.4), (3.6, 6.0), (3.9, 10.0), (3.7, 14.0), (3.8, 18.4)], 2.0, M_ADOQUIN),               # calle mayor oeste
    ([(8.8, 2.0), (8.7, 6.0), (8.9, 10.0), (8.7, 14.0), (8.8, 18.4)], 1.8, M_ADOQUIN),               # calle de la puerta
    ([(0.2, 5.9), (3.7, 5.9), (8.7, 5.9)], 1.2, M_ADOQUIN),
    ([(0.2, 9.9), (3.8, 9.9), (8.9, 9.9)], 1.2, M_ADOQUIN),
    ([(0.2, 13.9), (3.7, 13.9), (8.7, 13.9)], 1.2, M_ADOQUIN),
    # ---- recinto del templo y mercado
    ([(9.6, 9.9), (11.0, 10.0), (11.6, 10.4)], 1.2, M_ADOQUIN),
    ([(18.0, 2.6), (18.1, 6.0), (18.0, 10.0), (18.1, 18.4)], 1.7, M_ADOQUIN),                         # calle este del templo
    ([(11.2, 3.4), (11.4, 6.0), (11.3, 9.6)], 0.8, M_TIERRA),
    ([(18.0, 5.2), (21.0, 5.1), (25.0, 5.3)], 1.2, M_ADOQUIN),
    ([(18.0, 9.6), (21.0, 9.7), (25.0, 9.9)], 1.2, M_ADOQUIN),
    ([(9.0, 14.0), (13.0, 14.2), (18.0, 14.1)], 1.3, M_ADOQUIN),                                     # trasera de la plaza
    ([(9.0, 17.6), (13.0, 17.7), (18.0, 17.6)], 1.2, M_ADOQUIN),
    # ---- hacia el puente y la orilla este
    ([(18.0, 11.7), (19.5, 11.4), (21.5, 11.1), (24.0, 10.9), (25.4, 10.8)], 1.6, M_ADOQUIN),
    ([(28.0, 10.6), (31.0, 10.7), (34.0, 10.2), (37.0, 10.4)], 1.1, M_TIERRA),                       # camino de la huerta
    ([(30.0, 10.0), (31.5, 12.0), (32.5, 14.4)], 0.9, M_TIERRA),
]

# campos de cultivo: (u0, u1, v0, v1, material)
CAMPOS = [
    (29.5, 33.5, 1.6, 4.8, M_TRIGO),
    (33.8, 37.8, 1.6, 4.8, M_ARADO),
    (29.8, 33.6, 12.0, 14.8, M_VID),
    (37.6, 41.6, 8.8, 12.0, M_HUERTA),
]

PRADO = (28.8, 33.2, 5.6, 9.4)       # prado con valla y animales


def trazar_suelo(m):
    MAT = m.MAT
    land = m.tierra & ~m.agua
    # solar del templo: tierra apisonada
    ruido_o = (vnoise(U * 1.7, V * 1.7, 71) - 0.5) * 0.9
    r = ((U > 10.8 + ruido_o) & (U < 18.2 + ruido_o) & (V > 3.4 + ruido_o) & (V < 9.9 + ruido_o)) & land
    MAT[r] = M_OBRA
    # plaza del mercado y paseo
    r = rect(9.4, 17.0, 10.4, 14.0) & land
    MAT[r] = M_PLAZA
    # calles con borde irregular
    for pts, w, mat in CAMINOS:
        d = dist_poly(pts)
        ruido = (vnoise(U * 2.6, V * 2.6, 61) - 0.5) * 0.22
        r = (d < w / 2 + ruido) & land
        MAT[r] = mat
    # campos
    for u0, u1, v0, v1, mat in CAMPOS:
        MAT[rect(u0, u1, v0, v1) & land] = mat
    # prado
    u0, u1, v0, v1 = PRADO
    MAT[rect(u0, u1, v0, v1) & land] = M_PRADO
    # rastrojo seco cerca de los campos
    MAT[rect(RIO_U + 2.8, 44.0, 2.6, 3.2) & land] = M_TIERRA


def decorar(m, seed=7):
    """Matas, flores y guijarros: mapa de pegatinas del suelo."""
    rng = np.random.default_rng(seed)
    DEC = np.zeros((GH, GW), np.uint8)
    mat = m.MAT
    ok = (np.isin(mat, [M_HIERBA, M_SECA, M_PRADO, M_BOSQUE]) & m.tierra & ~m.agua)
    pix = np.argwhere(ok)
    n = 5200
    sel = pix[rng.integers(0, len(pix), n)]
    for (y, x) in sel:
        tipo = rng.integers(0, 6)
        if tipo == 0:
            pts = [(-1, -1, 1), (1, -1, 1), (0, 0, 2)]
        elif tipo == 1:
            pts = [(0, -1, 3), (0, 0, 1)]
        elif tipo == 2:
            pts = [(-1, 0, 1), (0, 0, 1), (1, 0, 1)]
        elif tipo == 3:
            pts = [(0, 0, 2), (1, 0, 2)]
        elif tipo == 4:
            pts = [(0, 0, 3)]
        else:
            pts = [(-1, 0, 2), (0, -1, 1), (1, 0, 2)]
        for dx, dy, cod in pts:
            yy, xx = y + dy, x + dx
            if 0 <= yy < GH and 0 <= xx < GW and ok[yy, xx]:
                DEC[yy, xx] = cod
    # flores (solo prados y hierba suave)
    flor_ok = np.isin(mat, [M_PRADO, M_HIERBA]) & m.tierra & ~m.agua
    pf = np.argwhere(flor_ok)
    for (y, x) in pf[rng.integers(0, len(pf), 520)]:
        DEC[y, x] = [4, 5, 5, 6, 7, 7][rng.integers(0, 6)]     # 4 blanca, 5 amarilla, 6 roja, 7 violeta
    # guijarros en caminos y arena
    pg = np.argwhere(np.isin(mat, [M_TIERRA]) & m.tierra & ~m.agua)
    if len(pg):
        for (y, x) in pg[rng.integers(0, len(pg), 260)]:
            DEC[y, x] = 8
    return DEC
