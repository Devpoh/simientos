"""Render del terreno: relief mapping + sombreado por rampas + agua animada."""
import numpy as np
from scipy import ndimage as ndi
from paleta import c, RAMPA_IDX, TRANSP, largo
from util import hash2, fbm, vnoise, smooth, LUT
import terreno as T
from terreno import (SW, SH, GW, GH, LU, LV, LZ, SOMBRA_K, M_HIERBA, M_SECA, M_TIERRA, M_ARENA,
                     M_PLAZA, M_ADOQUIN, M_ARADO, M_TRIGO, M_VID, M_HUERTA, M_ROCA, M_MADERA,
                     M_LOSA, M_BOSQUE, M_PRADO, M_RASTROJO, M_OBRA, F_ROCA, F_SILLAR, F_MADERA, F_TIERRA)

RN = list(RAMPA_IDX.keys())
RID = {n: i for i, n in enumerate(RN)}
TABLA = np.zeros((len(RN), 8), np.uint8)
for _n, _ids in RAMPA_IDX.items():
    for _t in range(8):
        TABLA[RID[_n], _t] = _ids[min(_t, len(_ids) - 1)]

SX = np.arange(SW)[None, :].repeat(SH, 0)
SY = np.arange(SH)[:, None].repeat(SW, 1)

BAYER4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + 0.5) / 16.0


def bayer(x, y):
    return BAYER4[(y % 4).astype(int), (x % 4).astype(int)]


def a_indice(ramp, tono):
    """ramp: array de ids de rampa; tono: array float/int -> índices de paleta."""
    t = np.clip(np.floor(tono + 0.5).astype(int), 0, 7)
    return TABLA[ramp, t]


# ---------------------------------------------------------------- rayo
def rayo(Hs, hmax=90):
    hit = np.full((SH, SW), -1, np.int16)
    for h in range(hmax, -1, -1):
        gy = np.clip(SY + h, 0, GH - 1)
        v = Hs[gy, SX]
        sel = (hit < 0) & (v >= h)
        hit[sel] = h
    hit[hit < 0] = 0
    return hit


def sombras(Hs, occ=None, smax=110):
    """Mapa de sombra proyectada hacia la derecha (misma fila del suelo)."""
    Ho = Hs if occ is None else np.maximum(Hs, occ)
    sh = np.zeros_like(Hs, dtype=bool)
    for s in range(1, smax):
        dif = (Ho[:, :-s] - Hs[:, s:]) * SOMBRA_K
        sh[:, s:] |= dif >= s
    return sh


class Base:
    """Resultado del render estático (todo menos el agua animada)."""


def preparar(m, occ=None):
    """Calcula el rayo, normales y buffers que no cambian entre fotogramas."""
    b = Base()
    b.m = m
    Hs = m.Hs
    hit = rayo(Hs)
    gyh = SY + hit
    gyc = np.clip(gyh, 0, GH - 1)
    b.hit, b.gyh = hit, gyc
    Hv = Hs[gyc, SX]
    Ry0, Rx0 = np.gradient(Hs)
    steep = (np.hypot(Rx0, Ry0) > 1.6)
    cara = ((Hv - hit) > 0.9) & steep[gyc, SX]
    b.cara = cara
    # gradiente (suavizado para suelos, crudo para caras)
    Hsm = ndi.gaussian_filter(Hs, 0.8)
    Hy, Hx = np.gradient(Hsm)
    Hu = Hx + 0.5 * Hy
    Hvv = -Hx + 0.5 * Hy
    nz = 1.0 / np.sqrt(1 + Hu ** 2 + Hvv ** 2)
    ndl_top = np.clip((-Hu * LU - Hvv * LV + LZ) * nz, 0, 1)
    # caras: normal horizontal del gradiente crudo
    Ry, Rx = np.gradient(Hs)
    Ru = Rx + 0.5 * Ry
    Rv = -Rx + 0.5 * Ry
    nrm = np.hypot(Ru, Rv) + 1e-6
    ndl_face = np.clip((-Ru * LU - Rv * LV) / nrm * np.cos(T.ELEV), 0, 1)
    b.ndl = np.where(cara, ndl_face[gyc, SX], ndl_top[gyc, SX])
    b.agua = (m.agua[gyc, SX]) & ~cara
    b.sombra = sombras(Hs, occ)[gyc, SX]
    b.dagua = None
    # distancia al borde del agua (px reales)
    d_agua = ndi.distance_transform_edt(m.agua, sampling=(2, 1)).astype(np.float32)
    b.dagua_map = d_agua
    d_tierra = ndi.distance_transform_edt(~m.agua, sampling=(2, 1)).astype(np.float32)
    b.dtierra_map = d_tierra
    b.gx = SX
    b.gy = gyc
    b.alt = hit.astype(np.float32)
    return b


# ---------------------------------------------------------------- suelo
def _rejilla(Uh, Vh, celda, junta):
    """Patrón de losas alineadas con los ejes del tile. Devuelve (es_junta, id_losa)."""
    cu = np.floor(Uh * 16.0 / celda)
    cv = np.floor(Vh * 16.0 / celda)
    fu = Uh * 16.0 / celda - cu
    fv = Vh * 16.0 / celda - cv
    return (fu < junta) | (fv < junta), hash2(cu, cv, 21)


def pintar_tierra(b, deco=None):
    """Devuelve idx[SH,SW] con todo salvo el agua."""
    m = b.m
    gx, gy = SX, b.gy
    mat = m.MAT[gy, gx]
    Uh, Vh = m.U[gy, gx], m.V[gy, gx]
    lum = 0.30 + 0.70 * b.ndl
    sh = b.sombra
    rampa = np.full((SH, SW), RID["hierba"], int)
    tono = np.zeros((SH, SW), np.float32)
    base = (lum - 0.30) * 5.0
    nz1 = fbm(gx * 0.07, gy * 0.14, 3, 11)
    nz2 = fbm(gx * 0.19 + 7, gy * 0.38, 2, 12)
    hh = hash2(gx, gy, 5)

    def poner(mask, ramp, t):
        nonlocal rampa, tono
        rampa = np.where(mask, RID[ramp], rampa)
        tono = np.where(mask, t, tono)

    poner(mat == M_HIERBA, "hierba", 1.2 + base + (nz1 - 0.5) * 2.2)
    poner(mat == M_SECA, "tierra", 2.4 + base * 0.9 + (nz1 - 0.5) * 1.8)
    poner(mat == M_BOSQUE, "hierba", 0.2 + base + (nz1 - 0.5) * 2.0)
    poner(mat == M_PRADO, "hierba", 1.7 + base + (nz1 - 0.5) * 1.6)
    poner(mat == M_TIERRA, "tierra", 2.5 + base * 0.8 + (nz2 - 0.5) * 1.2 + (hh > 0.93) * 0.9 - (hh < 0.05) * 0.9)
    poner(mat == M_ARENA, "tierra", 3.6 + base * 0.7 + (nz2 - 0.5) * 1.0 + (hh > 0.96) * 0.8)
    poner(mat == M_ROCA, "roca", 1.0 + base * 0.8 + (nz2 - 0.5) * 1.5)
    # losas del muelle / muralla
    mk = (mat == M_LOSA)
    if mk.any():
        j, hs_ = _rejilla(Uh, Vh, 8.0, 0.125)
        poner(mk, "piedra", 2.7 + base * 0.8 + (hs_ - 0.5) * 1.1 - j * 1.1)
    # plaza empedrada grande con bordillo
    mk = (mat == M_PLAZA)
    if mk.any():
        j, hs_ = _rejilla(Uh, Vh, 8.0, 0.125)
        poner(mk, "piedra", 2.9 + base * 0.8 + (hs_ - 0.5) * 1.3 - j * 1.2)
    # adoquín de las calles: hiladas desfasadas de 6 px
    mk = (mat == M_ADOQUIN)
    if mk.any():
        fv = np.floor(Vh * 16.0 / 5.0)
        cu = np.floor(Uh * 16.0 / 7.0 + 0.5 * (fv % 2))
        fu = Uh * 16.0 / 7.0 + 0.5 * (fv % 2) - cu
        fvv = Vh * 16.0 / 5.0 - fv
        j = (fu < 0.16) | (fvv < 0.22)
        poner(mk, "tierra", 2.9 + base * 0.8 + (hash2(cu, fv, 23) - 0.5) * 1.5 - j * 1.3)
    # campos: arado, trigo, vid, huerta
    mk = (mat == M_ARADO)
    if mk.any():
        ph = (Vh * 16.0) % 4.0
        poner(mk, "tierra", np.where(ph < 2.0, 2.3, 1.2) + base * 0.7 + (hh > 0.9) * 0.6)
    mk = (mat == M_TRIGO)
    if mk.any():
        ph = (Vh * 16.0) % 4.0
        t = np.where(ph < 1.0, 4.9, np.where(ph < 3.0, 3.9, 2.4)) + base * 0.5
        t = t + np.where(hh > 0.86, 0.9, 0) - np.where(hh < 0.08, 0.9, 0)
        poner(mk, "tierra", t)
    mk = (mat == M_VID)
    if mk.any():
        ph = (Uh * 16.0) % 8.0
        fila = ph < 4.5
        t = np.where(fila, 3.4 + (hash2(gx // 2, gy, 25) - 0.5) * 1.6, 1.5) + base * 0.5
        rampa = np.where(mk & fila, RID["hierba"], np.where(mk, RID["tierra"], rampa))
        tono = np.where(mk, t, tono)
    mk = (mat == M_HUERTA)
    if mk.any():
        ph = (Vh * 16.0) % 6.0
        fila = ph < 3.5
        t = np.where(fila, 3.8 + (hash2(gx // 2, gy // 1, 26) - 0.5) * 1.8, 1.7) + base * 0.5
        rampa = np.where(mk & fila, RID["hierba"], np.where(mk, RID["tierra"], rampa))
        tono = np.where(mk, t, tono)
    poner(mat == M_RASTROJO, "tierra", 3.3 + base * 0.7 + (hh > 0.8) * 0.8 - (hh < 0.15) * 0.8)
    poner(mat == M_OBRA, "tierra", 2.0 + base * 0.8 + (nz2 - 0.5) * 1.4 + (hh > 0.94) * 1.0 - (hh < 0.06))
    # madera de embarcadero: tablas transversales con vetas
    mk = (mat == M_MADERA)
    if mk.any():
        fv = np.floor(Vh * 16.0 / 3.0)
        fr = Vh * 16.0 / 3.0 - fv
        t = 2.5 + base * 0.7 + (hash2(fv, np.floor(Uh * 16 / 15), 27) - 0.5) * 1.3 - (fr < 0.30) * 1.4
        poner(mk, "madera", t)

    # pegatinas del suelo (matas, flores, guijarros)
    if deco is not None:
        d = deco[gy, gx]
        tono = np.where(d == 1, tono + 1.0, tono)
        tono = np.where(d == 2, tono - 1.0, tono)
        tono = np.where(d == 3, tono + 2.0, tono)

    # caras verticales
    cara = b.cara
    fm = m.FMAT[gy, gx]
    alt = b.alt
    if cara.any():
        f_roca = cara & (fm == F_ROCA)
        poner(f_roca, "roca", 0.5 + b.ndl * 3.0 + (nz2 - 0.5) * 1.2 - (alt < 1) * 0.8)
        f_sil = cara & (fm == F_SILLAR)
        fila = np.floor(alt / 3.0).astype(int)
        along = np.where(np.abs(m.Hs[gy, np.clip(gx + 1, 0, GW - 1)] - m.Hs[gy, np.clip(gx - 1, 0, GW - 1)]) > 4,
                         gy * 2, gx)
        pos = (along + (fila % 2) * 5) % 10
        junta = (pos == 0) | ((alt % 3) < 0.5)
        v_bloque = hash2(np.floor((along + (fila % 2) * 5) / 10), fila, 3)
        t_sil = 1.4 + b.ndl * 3.8 + (v_bloque - 0.5) * 1.1 - junta * 1.2 - (alt < 1) * 0.8
        poner(f_sil, "piedra", t_sil)
        f_mad = cara & (fm == F_MADERA)
        poner(f_mad, "madera", 0.6 + b.ndl * 2.8 + np.where((gx % 6) < 2, -1.2, 0))
        f_tie = cara & (fm == F_TIERRA)
        poner(f_tie, "tierra", 1.0 + b.ndl * 3.0)

    # sombra proyectada
    tono = tono - 2.0 * sh
    out = a_indice(rampa, tono)
    if deco is not None:
        d = deco[gy, gx]
        flor = np.zeros((SH, SW), np.uint8)
        flor = np.where(d == 4, c("piedra", 6), flor)
        flor = np.where(d == 5, c("tierra", 6), flor)
        flor = np.where(d == 6, c("teja", 4), flor)
        flor = np.where(d == 7, c("purpura", 2), flor)
        flor = np.where(d == 8, c("piedra", 4), flor)
        out = np.where((d >= 4) & (d <= 8) & ~sh, flor, out)
        out = np.where((d >= 4) & (d <= 8) & sh & (d != 8), LUT[-2][flor], out)
    return out.astype(np.uint8)


# ---------------------------------------------------------------- agua
def pintar_agua(b, k):
    """Agua del fotograma k (0..3): profundidad, olas, destellos y espuma."""
    m = b.m
    gx, gy = SX, b.gy
    d = b.dagua_map[gy, gx]
    rio = m.WH[gy, gx] > 0.5
    ph = 2 * np.pi * k / 4.0
    # tono base por profundidad (el mar se oscurece mar adentro)
    tw = 6.2 - 0.66 * np.sqrt(d)
    tw = tw + 0.30 * np.sin((gx * 0.30 + gy * 0.70) * 0.55 + ph) * (d > 3)
    tw = tw + (fbm(gx * 0.018, gy * 0.036, 3, 77) - 0.5) * 1.7 * (d > 8) + 0.35 * np.sin(gx * 0.011 + gy * 0.021 + ph * 0.25) * (d > 8)
    tw_r = 4.5 - 0.10 * np.minimum(d, 8) + 0.25 * np.sin((m.V[gy, gx] * 16) * 0.35 + ph * 1.0)
    tw = np.where(rio, tw_r, tw)
    # puesta de sol: el agua del oeste se tiñe de cálido-turquesa
    dit = bayer(gx, gy)
    fr = tw - np.floor(tw)
    tono = np.floor(tw) + (smooth(fr, 0.2, 0.8) > dit)
    # rizos claros: trazos horizontales que viajan
    cx, cy = (gx + 3 * k) // 11, gy // 5
    r = hash2(cx, cy, 31)
    ox = (hash2(cx, cy, 32) * 6).astype(int)
    ln = 3 + (hash2(cx, cy, 33) * 4).astype(int)
    lx = (gx + 3 * k) - cx * 11
    ly = gy - cy * 5
    oy = (hash2(cx, cy, 34) * 5).astype(int)
    vis = ((k + (hash2(cx, cy, 35) * 4).astype(int)) % 4) < 2
    rizo = (r < 0.40) & (ly == oy) & (lx >= ox) & (lx < ox + ln) & vis & (d > 2) & ~rio
    sombra_rizo = (r < 0.40) & (ly == oy + 1) & (lx >= ox + 1) & (lx < ox + ln + 1) & vis & (d > 2) & ~rio
    tono = np.where(sombra_rizo, tono - 1, tono)
    tono = np.where(rizo, tono + 1.4, tono)
    # río: hebras en la dirección de la corriente
    cu = np.floor(m.U[gy, gx] * 16 / 3.0)
    vv = m.V[gy, gx] * 16 + 3 * k
    fv = np.floor(vv / 8.0)
    rr = hash2(cu, fv, 41)
    inside = np.mod(vv, 8.0)
    hebra = rio & (rr < 0.40) & (inside < 4.0)
    tono = np.where(hebra, tono + 1.2, tono)
    out_r = np.where(rio, RID["agua"], RID["agua"])
    idx = a_indice(np.full((SH, SW), RID["agua"]), tono)
    # destellos de sol (dorados) que saltan de fotograma en fotograma
    g = hash2(gx // 2, gy, 50 + k * 3)
    env = (0.004 + 0.010 * (1 - gx / float(SW))) * (0.25 + 1.6 * fbm(gx * 0.03, gy * 0.06, 2, 81))
    idx = np.where((g < env) & (d > 3) & ~rio, c("tierra", 5), idx)
    g2 = hash2(gx // 2, gy, 70 + k * 5)
    idx = np.where((g2 < 0.0015) & ~rio, c("piedra", 6), idx)
    # sombra proyectada en el agua
    idx = np.where(b.sombra, TABLA[RID["agua"], np.clip(np.floor(np.floor(tono) - 1.5 + 0.5).astype(int), 0, 6)], idx)
    # espuma de la orilla
    wv = (gx * 0.5 + gy) * 0.20 - ph
    borde = 1.25 + 1.35 * (0.5 + 0.5 * np.sin(wv))
    lado = ~rio
    espuma = lado & (d <= borde)
    espuma_in = lado & (d <= borde - 1.0)
    linea = lado & (d > borde + 1.4) & (d <= borde + 2.4) & (hash2(gx // 3 + k, gy // 2, 60) < 0.38)
    idx = np.where(linea, c("agua", 6), idx)
    idx = np.where(espuma, c("agua", 6), idx)
    idx = np.where(espuma_in, c("piedra", 6), idx)
    # espuma en el río (orillas y cascada de la desembocadura)
    espuma_r = rio & (d <= 1.3)
    idx = np.where(espuma_r, c("agua", 6), idx)
    return idx.astype(np.uint8)


def componer_base(b, tierra_idx, k):
    return np.where(b.agua, pintar_agua(b, k), tierra_idx).astype(np.uint8)
