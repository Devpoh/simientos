"""Boceto CAM1: caminos de tierra y de roca pintados desde una MÁSCARA DE SUBCELDAS (R85).

El dato es la máscara: una matriz por material con 4×4 subceldas por tile (un tile se ve 32×16 px, una subcelda 8×4 px). El pintor
no usa piezas ni rejilla: interpola la distancia con signo de la máscara a nivel de píxel, le añade ruido y umbraliza, así que los
bordes salen irregulares, las curvas y los cruces son continuos y no se ve la rejilla. Las piezas de marching squares quedan para CAM2.

  tierra : apisonada, con dos rodadas, motas y borde que se funde con la hierba por tramado
  roca   : empedrado de cantos irregulares (Voronoi en el suelo) con juntas oscuras; luz desde la izquierda

Uso (desde tools/arte-pixel):  python caminos.py   → bocetos/caminos_x2.png
"""
import os
import sys

sys.dont_write_bytecode = True
import numpy as np
from PIL import Image
from scipy import ndimage

import catalogo as CAT
import edificios as ED
import fuente
import montanas as MT
from paleta import TRANSP, c
from util import a_rgb, fbm, hash2

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "bocetos")
SUB = 4                      # subceldas por lado de tile
N = 24                       # mundo de N×N tiles
W_PX, H_PX = 480, 270
X0, Y0 = 240.0, -1.0         # píxel de pantalla del tile (0, 0): x = X0 + (u - v)·16 ; y = Y0 + (u + v)·8


# ---------------------------------------------------------------- máscara (el dato)

def _dist_polilinea(pu, pv, puntos):
    d = np.full(pu.shape, 1e9)
    for (u0, v0), (u1, v1) in zip(puntos[:-1], puntos[1:]):
        du, dv = u1 - u0, v1 - v0
        t = np.clip(((pu - u0) * du + (pv - v0) * dv) / (du * du + dv * dv), 0, 1)
        d = np.minimum(d, np.hypot(pu - (u0 + t * du), pv - (v0 + t * dv)))
    return d


def suavizar_trazado(puntos, pasos=12):
    """Catmull-Rom para que las curvas de la calle principal sean suaves."""
    p = [puntos[0]] + list(puntos) + [puntos[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = (np.array(q, float) for q in p[i - 1:i + 3])
        for k in range(pasos):
            t = k / pasos
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(np.array(p[-2], float))
    return [tuple(q) for q in out]


CALLES_ROCA = [  # ancho 2 tiles
    suavizar_trazado([(0.0, 6.5), (5.0, 6.5), (9.0, 6.6), (12.0, 8.5), (13.5, 12.0), (13.5, 24.0)]),
    [(4.0, 13.0), (24.0, 13.0)],
]
SENDAS_TIERRA = [  # ancho 1 tile (también del cruce hacia las puertas)
    [(3.0, 12.2), (3.0, 10.4)], [(8.0, 12.2), (8.0, 11.4)], [(17.0, 12.2), (17.0, 11.4)],
    [(3.0, 5.4), (3.0, 5.0)], [(7.0, 5.4), (7.0, 4.8)], [(11.5, 6.0), (11.5, 3.6)],
    suavizar_trazado([(12.5, 17.0), (10.0, 16.8), (7.5, 18.2), (5.0, 20.5)]),
    suavizar_trazado([(14.5, 9.5), (17.5, 9.0), (20.0, 7.5)]),
]


def mascaras():
    """Devuelve {'roca': bool[N·4, N·4], 'tierra': bool[...]}, índice [subcelda v, subcelda u]."""
    n = N * SUB
    sv, su = np.mgrid[0:n, 0:n]
    pu, pv = (su + 0.5) / SUB, (sv + 0.5) / SUB
    roca = np.zeros((n, n), bool)
    for pts in CALLES_ROCA:
        roca |= _dist_polilinea(pu, pv, pts) <= 1.0
    tierra = np.zeros((n, n), bool)
    for pts in SENDAS_TIERRA:
        tierra |= _dist_polilinea(pu, pv, pts) <= 0.5
    return {"roca": roca, "tierra": tierra & ~roca}


def sdf(m):
    """Distancia con signo en subceldas (>0 dentro)."""
    return ndimage.distance_transform_edt(m) - ndimage.distance_transform_edt(~m)


# ---------------------------------------------------------------- pintor

def muestrear(campo, us, vs):
    return ndimage.map_coordinates(campo, [vs - 0.5, us - 0.5], order=1, mode="nearest")


def pintar(lienzo, mk, semilla=4):
    Y, X = np.mgrid[0:H_PX, 0:W_PX]
    xs, ys = X + 0.5 - X0, Y + 0.5 - Y0
    ut, vt = xs / 32.0 + ys / 16.0, ys / 16.0 - xs / 32.0         # coordenadas de tile
    us, vs = ut * SUB, vt * SUB
    ug, vg = ut * 16.0, vt * 16.0                                    # píxeles de suelo
    ruido = fbm(ug * 0.09, vg * 0.09, 3, semilla)
    ruido2 = fbm(ug * 0.31 + 7, vg * 0.31, 2, semilla + 3)
    s_roca = muestrear(sdf(mk["roca"]), us, vs) + (ruido - 0.5) * 1.5
    s_tierra = muestrear(sdf(mk["tierra"] | ndimage.binary_dilation(mk["roca"], iterations=1)), us, vs) + (ruido - 0.5) * 2.2
    b = MT.bayer(X, Y)
    out = lienzo.copy()

    # ---- tierra apisonada (y hombro de tierra alrededor del empedrado)
    a = np.clip(s_tierra / 1.4, 0, 1)
    es_tierra = (a + b * 0.8 > 0.30) & (s_tierra > -0.2)
    tn = 2.15 + (ruido2 - 0.5) * 1.5 + (ruido - 0.5) * 0.8
    tn = tn - 0.9 * (a < 0.55)                                       # borde más oscuro y húmedo
    rodada = (np.abs(s_tierra - 1.25) < 0.34) & (hash2(np.floor(ug / 3), np.floor(vg / 3), semilla + 5) > 0.15)
    tn = tn - 1.0 * rodada
    cresta = (np.abs(s_tierra - 2.1) < 0.35) & (ruido2 > 0.45)       # lomo central entre las rodadas
    tn = tn + 0.7 * cresta
    mota = hash2(X, Y, semilla + 8)
    tn = tn + (mota > 0.965) * 1.6 - (mota < 0.03) * 1.0
    idx_t = np.array([c("tierra", int(i)) for i in range(7)], np.uint8)[np.clip(np.floor(tn + 0.5).astype(int), 0, 5)]
    out = np.where(es_tierra, idx_t, out)
    # matas de hierba que invaden el borde
    mata = es_tierra & (a < 0.45) & (hash2(X // 2, Y // 2, semilla + 9) > 0.62)
    out = np.where(mata, c("hierba", 4), out)

    # ---- empedrado de cantos: Voronoi en el suelo
    cel = 5.4
    gi, gj = np.floor(ug / cel), np.floor(vg / cel)
    d1 = np.full(ug.shape, 1e9)
    d2 = np.full(ug.shape, 1e9)
    idc = np.zeros(ug.shape)
    cu = np.zeros(ug.shape)
    cv = np.zeros(ug.shape)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            ci, cj = gi + di, gj + dj
            pu = (ci + 0.15 + 0.7 * hash2(ci, cj, semilla + 1)) * cel
            pv = (cj + 0.15 + 0.7 * hash2(ci, cj, semilla + 2)) * cel
            d = np.hypot(ug - pu, vg - pv)
            nuevo = d < d1
            d2 = np.where(nuevo, d1, np.minimum(d2, d))
            idc = np.where(nuevo, hash2(ci, cj, semilla + 3), idc)
            cu = np.where(nuevo, pu, cu)
            cv = np.where(nuevo, pv, cv)
            d1 = np.where(nuevo, d, d1)
    junta = (d2 - d1) < 0.95
    dx, dy = (ug - cu) - (vg - cv), ((ug - cu) + (vg - cv)) / 2          # desplazamiento en pantalla respecto al centro
    luz = np.clip(-(dx * 0.5 + dy * 0.85) / 3.0, -1, 1)
    base = 2.0 + 1.1 * (idc > 0.55) + 0.7 * (idc > 0.88) - 0.6 * (idc < 0.18)
    tp = base + luz * 0.95 + (ruido2 - 0.5) * 0.5
    idx_r = np.array([c("roca", int(i)) for i in range(4)], np.uint8)[np.clip(np.floor(tp + 0.5).astype(int), 0, 3)]
    calido = (idc > 0.9) & ~junta
    idx_r = np.where(calido, np.where(luz > 0, c("tierra", 3), c("tierra", 2)), idx_r)
    idx_r = np.where(junta, np.where(hash2(X, Y, semilla + 11) > 0.8, c("tierra", 1), np.where(ruido2 > 0.5, c("roca", 1), c("roca", 0))), idx_r)
    es_roca = (s_roca > 0.0)
    borde = es_roca & (s_roca < 0.9)                                    # el canto de la calle: cantos más oscuros y a medias
    idx_r = np.where(borde & (hash2(X, Y, semilla + 12) > 0.55), np.where(junta, c("roca", 0), c("roca", 1)), idx_r)
    out = np.where(es_roca, idx_r, out)
    return out


# ---------------------------------------------------------------- escena

def punto(u, v):
    return X0 + (u - v) * 16.0, Y0 + (u + v) * 8.0


def poner_casa(lienzo, spr, u0, v0):
    x, y = punto(u0, v0)
    x0, y0 = int(round(x - spr.ax)), int(round(y - spr.ay))
    h, w = spr.px.shape
    ys0, xs0 = max(0, -y0), max(0, -x0)
    ys1, xs1 = min(h, lienzo.shape[0] - y0), min(w, lienzo.shape[1] - x0)
    if ys1 > ys0 and xs1 > xs0:
        sub = spr.px[ys0:ys1, xs0:xs1]
        dst = lienzo[y0 + ys0:y0 + ys1, x0 + xs0:x0 + xs1]
        lienzo[y0 + ys0:y0 + ys1, x0 + xs0:x0 + xs1] = np.where(sub != TRANSP, sub, dst)


CASAS = [  # (w, d, tabla, variante, u0, v0)
    (2, 2, CAT.CASAS_2X2, "a", 3.0, 8.9), (3, 2, CAT.CASAS_3X2, "a", 6.6, 9.0), (2, 2, CAT.CASAS_2X2, "c", 16.0, 9.0),
    (2, 2, CAT.CASAS_2X2, "b", 2.0, 3.4), (3, 2, CAT.CASAS_3X2, "b", 6.0, 3.0), (2, 2, CAT.CASAS_2X2, "d", 10.6, 1.3),
]


def escena():
    lienzo = MT.suelo(W_PX, H_PX, seed=2)
    mk = mascaras()
    lienzo = pintar(lienzo, mk)
    rng = np.random.default_rng(3)
    casas = sorted(CASAS, key=lambda t: t[4] + t[5] + t[0] + t[1])
    for w, d, tabla, var, u0, v0 in casas:
        spr = ED.casa(w, d, eje="u", **tabla[var])
        poner_casa(lienzo, spr, u0, v0)
    for u, v in ((1.0, 9.5), (1.4, 15.0), (6.0, 20.5), (17.0, 17.0), (19.0, 4.5), (9.0, 0.6)):
        x, y = punto(u, v)
        MT.poner(lienzo, MT.abeto(int(rng.integers(16, 24)), int(rng.integers(1, 99))), x, y)
    return lienzo, mk


def rotular(lienzo, s):
    MT.etiquetas(lienzo, 8, 8, s)


if __name__ == "__main__":
    lienzo, mk = escena()
    rotular(lienzo, "CAMINOS: ROCA 2 TILES, TIERRA 1 TILE")
    os.makedirs(SALIDA, exist_ok=True)
    Image.fromarray(np.repeat(np.repeat(a_rgb(lienzo), 2, 0), 2, 1)).save(os.path.join(SALIDA, "caminos_x2.png"))
    Image.fromarray(a_rgb(lienzo)).save(os.path.join(SALIDA, "caminos_x1.png"))
    np.savez_compressed(os.path.join(SALIDA, "caminos_mascara.npz"), roca=mk["roca"], tierra=mk["tierra"])
    print("máscara", mk["roca"].shape, "subceldas roca", int(mk["roca"].sum()), "tierra", int(mk["tierra"].sum()))
