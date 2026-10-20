"""Terreno isométrico 2:1 de IMPERIUM: heightfield en coordenadas de 'suelo de pantalla'.

Mapa (gx, gy) = posición en pantalla de un punto del suelo a altura 0. Un punto a altura h
se dibuja en (gx, gy - h). Para pintar cada píxel de pantalla se baja un rayo de h alto a 0
hasta tocar el relieve (relief mapping). Todo se pinta con ÍNDICES de la paleta.
"""
import numpy as np
from scipy import ndimage as ndi
from paleta import c, RAMPA_IDX, TRANSP
from util import hash2, fbm, smooth, LUT

GW, GH = 960, 680        # mapa de suelo
SW, SH = 960, 540        # pantalla (resolución base ampliada a petición del usuario)
OX, OY = 320, 120

# ---- geografía (en tiles)
COSTA_V = 15.0           # línea del muelle. La ciudad ampliada (19.0) quedó a medias: ver README «Estado final»
DV = COSTA_V - 15.0
CIUDAD_U1 = 24.8         # extremo este de la ciudad (río a su lado)
RIO_U = 26.0             # eje base del río

YY, XX = np.mgrid[0:GH, 0:GW].astype(np.float32)
U = (XX - OX) / 32 + (YY - OY) / 16
V = (YY - OY) / 16 - (XX - OX) / 32


def tp(u, v):
    """Esquina de tile (u, v) -> (gx, gy) del suelo."""
    return OX + 16 * (u - v), OY + 8 * (u + v)


# ---- materiales de superficie ----
(M_HIERBA, M_SECA, M_TIERRA, M_ARENA, M_PLAZA, M_ADOQUIN, M_ARADO, M_TRIGO, M_VID,
 M_HUERTA, M_ROCA, M_MADERA, M_LOSA, M_BOSQUE, M_PRADO, M_RASTROJO, M_OBRA) = range(17)
# ---- materiales de cara vertical ----
F_ROCA, F_SILLAR, F_MADERA, F_TIERRA = range(4)

# luz de hora dorada: viene de la izquierda y de arriba
ELEV = np.radians(48.0)
_Lh = np.array([-0.7071, 0.7071])
LU, LV, LZ = _Lh[0] * np.cos(ELEV), _Lh[1] * np.cos(ELEV), np.sin(ELEV)
SOMBRA_K = 1.0 / np.tan(ELEV) * 1.4142   # píxeles de sombra (hacia la derecha) por píxel de altura


def rect(u0, u1, v0, v1):
    return (U >= u0) & (U < u1) & (V >= v0) & (V < v1)


def dist_seg(a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    t = ((U - ax) * dx + (V - ay) * dy) / (dx * dx + dy * dy)
    t = np.clip(t, 0, 1)
    return np.hypot(U - (ax + t * dx), V - (ay + t * dy))


def dist_poly(pts):
    d = None
    for i in range(len(pts) - 1):
        s = dist_seg(pts[i], pts[i + 1])
        d = s if d is None else np.minimum(d, s)
    return d


def rio_u(v):
    return RIO_U + 0.85 * np.sin(0.6 * v + 0.9) + 0.35 * np.sin(1.7 * v)


class Mundo:
    pass


def construir() -> Mundo:
    m = Mundo()
    n_a = fbm(U * 0.45 + 3, V * 0.45, 3, 1)
    n_b = fbm(U * 0.9, V * 0.9, 3, 2)
    n_c = fbm(U * 0.22 + 9, V * 0.22 + 4, 4, 5)

    # --- costa: recta (muelle) hasta el río, ondulada en la otra orilla ---
    costa = COSTA_V + smooth(U, CIUDAD_U1 - 0.2, CIUDAD_U1 + 2.2) * (n_a - 0.5) * 3.4
    tierra = V < costa
    # mole y roca del faro
    mole = rect(8.7, 9.7, 14.0 + DV, 18.2 + DV)
    roca_faro = ((U - 9.2) / 1.7) ** 2 + ((V - 18.9 - DV) / 1.35) ** 2 < 1.0
    roca_faro &= (n_b > 0.2) | (((U - 9.2) / 1.1) ** 2 + ((V - 18.9 - DV) / 0.9) ** 2 < 1)
    isla_a = ((U - 14.5) / 3.2) ** 2 + ((V - 27.0 - DV) / 2.1) ** 2 < 1.0 + (n_b - 0.5) * 0.6
    isla_b = ((U - 24.8) / 2.4) ** 2 + ((V - 25.4 - DV) / 1.7) ** 2 < 1.0 + (n_b - 0.5) * 0.6
    islas = isla_a | isla_b
    tierra = tierra | mole | roca_faro | islas
    # embarcaderos (cubierta de madera sobre el agua)
    pier1 = rect(4.6, 5.55, 15.0 + DV, 18.4 + DV)
    pier2 = rect(11.0, 11.95, 15.0 + DV, 18.9 + DV)
    pier2b = rect(10.2, 12.8, 18.0 + DV, 18.9 + DV)
    pier3 = rect(6.3, 7.1, 15.0 + DV, 17.0 + DV)
    pier4 = rect(15.4, 16.35, 15.0 + DV, 19.2 + DV)
    pier4b = rect(14.6, 17.6, 18.4 + DV, 19.2 + DV)
    pier5 = rect(20.0, 20.9, 15.0 + DV, 17.6 + DV)
    pier = pier1 | pier2 | pier3 | pier4 | pier5

    # --- relieve base ---
    ondula = (n_b - 0.5) * 2.4
    norte = smooth(3.4 - V, 0, 10.0)
    oeste = smooth(1.2 - U, 0, 7.0)
    cima = np.exp(-(((U - 15.0) ** 2 + (V + 7.5) ** 2) / 30.0)) * 56.0
    cima2 = np.exp(-(((U - 38.0) ** 2 + (V + 4.0) ** 2) / 36.0)) * 48.0
    cima3 = np.exp(-(((U + 4.0) ** 2 + (V - 4.0) ** 2) / 30.0)) * 34.0
    mont = np.maximum(norte * (16 + 44 * n_c ** 1.4), oeste * (10 + 30 * n_c))
    mont = np.maximum(mont, np.maximum(np.maximum(cima, cima2), cima3) * (0.55 + 0.7 * n_c))
    H = (6.0 + mont + ondula).astype(np.float32)
    # ciudad y huerta: mesetas planas a 6
    ciudad = rect(0.2, CIUDAD_U1 - 0.3, 2.4, COSTA_V)
    cw = ndi.gaussian_filter(ciudad.astype(np.float32), 5.0)
    H = H * (1 - cw) + 6.0 * cw
    huerta = rect(RIO_U + 1.8, 70, 2.5, COSTA_V)
    hw_ = ndi.gaussian_filter(huerta.astype(np.float32), 6.0)
    H = H * (1 - hw_) + (6.0 + ondula * 0.5) * hw_

    # --- río ---
    ru = rio_u(V)
    hw = 0.72 + 0.12 * np.sin(V * 0.8)
    dR = np.abs(U - ru)
    en_rio = (V < COSTA_V + 0.4)
    rv = smooth(hw + 0.5 - dR, 0.0, 0.5) * en_rio
    lecho = 0.3
    H = H * (1 - rv) + lecho * rv
    # mar: lecho profundo
    H = np.where(tierra, H, -4.0)
    # la playa: la orilla desciende de 6 a 0 (salvo el muelle de sillar)
    d_mar = ndi.distance_transform_edt(tierra, sampling=(2, 1)).astype(np.float32)
    zona_muelle = (U < CIUDAD_U1 - 0.1) & (V > COSTA_V - 3.0)
    factor = np.where(zona_muelle, 1.0, smooth(d_mar, 0.6, 10.0))
    factor = np.where(mole | roca_faro, smooth(d_mar, 0.3, 2.2), factor)
    H = np.where(tierra, H * factor, H)
    # muelle y roca: altura fija
    H = np.where(mole, 6.0, H)
    H = np.where(roca_faro & ~mole, np.minimum(H, 3.0 + 4.0 * n_b), H)
    # el río corta la meseta: agua a 2, desagua al mar
    wh = np.zeros((GH, GW), np.float32)
    wh_r = np.where(V < COSTA_V - 1.6, 2.0, np.clip(2.0 - (V - (COSTA_V - 1.6)) / 1.6 * 2.0, 0.0, 2.0))
    wh = np.where(rv > 0.0, wh_r, wh).astype(np.float32)
    # embarcaderos
    H = np.where(pier, 3.0, H)
    # muralla (al norte de la ciudad)
    muralla = rect(2.0, CIUDAD_U1 - 0.6, 1.55, 2.05)
    tope = np.where(((U * 2.0) % 1.0) < 0.62, 31.0, 28.0)
    abertura = rect(8.0, 9.5, 1.2, 2.4)
    H = np.where(muralla & ~abertura, tope, H)
    # --- agua ---
    Hs = np.maximum(H, wh)
    agua = ((H < wh - 0.01) | (~tierra)) & ~pier
    # --- materiales ---
    MAT = np.full((GH, GW), M_HIERBA, np.uint8)
    seca = n_c + 0.25 * (n_a - 0.5) > 0.66
    MAT[seca] = M_SECA
    MAT[(norte > 0.35)] = M_BOSQUE
    # playa de arena y orilla del río
    arena = tierra & (d_mar < 13) & ~zona_muelle & ~(mole | roca_faro)
    MAT[arena] = M_ARENA
    orilla_rio = (dR < hw + 0.85) & en_rio & (V > 2.0)
    MAT[orilla_rio] = M_TIERRA
    MAT[(mole | roca_faro)] = M_ROCA
    FMAT = np.full((GH, GW), F_ROCA, np.uint8)
    quay_band = (U < CIUDAD_U1 + 0.1) & (V > COSTA_V - 2.0) & (V < COSTA_V + 1.0)
    FMAT[quay_band] = F_SILLAR
    FMAT[mole] = F_SILLAR
    FMAT[muralla] = F_SILLAR
    FMAT[pier] = F_MADERA
    MAT[quay_band & (V > COSTA_V - 1.0) & tierra] = M_LOSA
    MAT[mole] = M_LOSA
    MAT[muralla] = M_LOSA
    MAT[pier] = M_MADERA
    m.U, m.V = U, V
    m.H, m.WH, m.Hs, m.agua, m.MAT, m.FMAT = H, wh, Hs, agua, MAT, FMAT
    m.tierra, m.pier, m.muralla, m.rv = tierra, pier, muralla & ~abertura, rv
    m.mole, m.roca_faro, m.islas = mole, roca_faro, islas
    m.zona_muelle = zona_muelle
    m.dR = dR
    m.ru = ru
    m.n_a, m.n_b, m.n_c = n_a, n_b, n_c
    m.norte = norte
    return m
