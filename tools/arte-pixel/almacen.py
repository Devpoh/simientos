"""Almacén de era 1 (R77): adobe, techo plano de caña y barro con parapeto bajo, puerta ancha de carga.

Sin teja ni piedra labrada: el zócalo es de cantos de río sin labrar trabados con barro. Huella 2×2 tiles (32×32 px de suelo).
Todo se apoya en el suelo o sobresale como mucho 4 px (1 subcelda) de la huella (ánforas, sacos, escalera).
"""
import sys
sys.dont_write_bytecode = True
import numpy as np
from paleta import c, TRANSP
from util import hash2, fbm, LUT
from iso import Spr
from tablas import RID, a_indice
from edificios import caja, fn_plano, pintar_vano, pared_estuco
from edificios2 import anfora
from templo import poste

W = D = 32            # huella 2x2
HW = 22               # altura de muro
PAR, PGR = 3, 2       # parapeto: alto y grosor
T_LIT, T_SOM = 4.0, 1.9


# ------------------------------------------------------------------ texturas
def fn_cantos(tono_barro, seed):
    """Zócalo de cantos de río: piedras redondeadas, de tamaño y tono distintos, trabadas con barro."""
    def fn(s, t, X, Y):
        fila = np.floor(t / 3.0)
        off = hash2(fila, 1, seed) * 6.0
        cs = np.floor((s + off) / 5.5)
        fs = (s + off) / 5.5 - cs
        ft = t / 3.0 - fila
        # el centro de cada canto se desplaza un poco; así no hay filas rectas ni juntas regulares
        cx = 0.5 + (hash2(cs, fila, seed + 2) - 0.5) * 0.25
        cy = 0.5 + (hash2(cs, fila, seed + 3) - 0.5) * 0.2
        rx = 0.36 + hash2(cs, fila, seed + 4) * 0.12
        q = ((fs - cx) / rx) ** 2 + ((ft - cy) / 0.46) ** 2
        tono = 1.9 + hash2(cs, fila, seed + 5) * 1.3 + (0.55 - ft) * 0.9 - 0.45 * np.clip(fs - 0.6, 0, 1) * 2
        piedra = a_indice(np.full(s.shape, RID["roca"]), tono)
        barro = a_indice(np.full(s.shape, RID["tierra"]), tono_barro + (hash2(np.floor(s), np.floor(t), seed + 6) - 0.5) * 0.7)
        return np.where(q <= 1.0, piedra, barro)
    return fn


def fn_muro(tono, seed, zocalo=6.0):
    """Pared de adobe enlucida con barro (desconchones y vetas de lluvia bajo el borde) sobre zócalo de cantos."""
    base = pared_estuco("tierra", tono, seed)
    cantos = fn_cantos(tono - 1.9, seed + 11)

    def fn(s, t, X, Y):
        pared = base(s, t, X, Y)
        veta = (hash2(np.floor(s / 2.0), 7, seed) > 0.62) & (t > HW - 9) & (t < HW - 1 - 3 * hash2(np.floor(s / 2.0), 8, seed))
        pared = np.where(veta, LUT[-1][pared], pared)
        return np.where(t < zocalo, cantos(s, t, X, Y), pared)
    return fn


def fn_barro(tono, seed):
    def fn(s, t, X, Y):
        n = fbm(s * 0.13 + seed, t * 0.13, 2, seed)
        return a_indice(np.full(s.shape, RID["tierra"]), tono + (n - 0.5) * 0.7)
    return fn


def fn_techo(seed):
    """Azotea: esteras de caña cubiertas de barro, con parches y grietas."""
    def fn(s, t, X, Y):
        n = fbm(s * 0.12 + seed, t * 0.12, 3, seed)
        tn = 3.0 + (n - 0.5) * 1.3
        tn = tn + np.where(np.floor(t / 2.0) % 2 == 0, 0.45, -0.35)           # tiras de caña a lo largo de u
        tn = tn + (fbm(s * 0.07 + 11, t * 0.07, 2, seed + 3) > 0.6) * 0.8     # parche de barro más claro
        hh = hash2(np.floor(s), np.floor(t), seed + 1)
        tn = tn + (hh > 0.94) * 0.8 - (hh < 0.04) * 0.9
        return a_indice(np.full(s.shape, RID["tierra"]), tn)
    return fn


def fn_cana(lado, seed):
    """Haz de caña tumbado a lo largo de u: tallos finos paralelos (cara larga) o sección de tallos (testa)."""
    def fn(s, t, X, Y):
        if lado == "testa":
            tn = 4.5 - 1.0 * ((np.floor(s) + np.floor(t)) % 2) + (hash2(np.floor(s), np.floor(t), seed) - 0.5) * 0.8
        elif lado == "top":
            tn = 5.0 - 0.9 * (np.floor(t * 1.2) % 2) + (hash2(np.floor(s / 3), np.floor(t), seed) - 0.5) * 0.6
        else:
            tn = 4.4 - 0.9 * (np.floor(t * 1.2) % 2) + (hash2(np.floor(s / 3), np.floor(t), seed) - 0.5) * 0.6 - (lado == "der") * 1.6
        return a_indice(np.full(s.shape, RID["tierra"]), tn)
    return fn


# ------------------------------------------------------------------ piezas
def haz_cana(s, u, v, z, largo=16, seed=1):
    """Haz de caña de 3x3 px de sección con dos ligaduras."""
    caja(s, u, v, z, largo, 3, 3, fn_cana("izq", seed), fn_cana("testa", seed + 1), fn_cana("top", seed + 2), fid=60)
    for uu in (u + 4, u + largo - 5):
        s.lineaz((uu, v + 3, z), (uu, v + 3, z + 3), c("madera", 2))


def cabeza_viga(s, u, v, z, sombra=False):
    """Extremo redondo de una viga de madera que asoma bajo el borde de la azotea."""
    x, y = s.P(u, v, z)
    x, y = int(x), int(y)
    tonos = (3, 2, 2, 1) if sombra else (4, 3, 3, 2)
    s.pset(x, y, c("madera", tonos[0])); s.pset(x + 1, y, c("madera", tonos[1]))
    s.pset(x, y + 1, c("madera", tonos[2])); s.pset(x + 1, y + 1, c("madera", tonos[3]))


def hueco_estrecho(s, O, a, la, s0, t0, w, h):
    """Rendija de ventilación: un hueco oscuro con el fondo apenas iluminado."""
    def mk(ss, tt):
        return (ss >= s0) & (ss < s0 + w) & (tt >= t0) & (tt < t0 + h)
    s.cara(O, a, la, (0, 0, 1), t0 + h + 2,
           lambda ss, tt, X, Y: np.where(tt < t0 + 1.5, c("madera", 1), c("madera", 0)).astype(np.uint8), fid=9, mascara=mk)


SACO = [
    "..tt..",
    ".lLLm.",
    "lLLLmd",
    "lLLmmd",
    "lLmmdd",
    ".mmmdd",
    ".dddd.",
]
COL_SACO = {"l": ("piedra", 6), "L": ("piedra", 5), "m": ("piedra", 4), "d": ("piedra", 3), "t": ("madera", 2)}   # lino claro: contrasta con el adobe


def saco_en(s, u, v, z):
    """Saco de grano (6x7 px) con la boca atada, apoyado en (u, v, z)."""
    x, y = s.P(u, v, z)
    x, y = int(round(x)) - 3, int(round(y)) - 7
    for j, fila in enumerate(SACO):
        for i, ch in enumerate(fila):
            if ch != ".":
                s.pset(x + i, y + j, c(*COL_SACO[ch]))


def en_capa(s, dibujar):
    """Dibuja objetos pequeños en una capa propia con contorno (se leen sobre un fondo de su mismo color)."""
    tmp = Spr(s.w, s.h, s.ax, s.ay)
    dibujar(tmp)
    tmp.contorno(-3)
    m = tmp.px != TRANSP
    s.px[m] = tmp.px[m]


def alero_esteras(s):
    """Alero de esteras de caña sobre la puerta, apoyado en dos postes (sobresale 4 px de la huella)."""
    for u in (6.5, 25.5):
        poste(s, u, D + 3.5, 0, 14, 1)

    def estera(ss, tt, X, Y):
        tn = 4.7 - 0.9 * (np.floor(tt * 1.1) % 2) + (hash2(np.floor(ss / 2), np.floor(tt), 4) - 0.5) * 0.6
        tn = np.where(tt > 4.8, tn - 1.5, tn)        # flecos del borde
        return a_indice(np.full(ss.shape, RID["tierra"]), tn)
    s.cara((5, D, 18.5), (1, 0, 0), 22, (0, 0.7071, -0.7071), 5.66, estera, fid=70)
    s.lineaz((5, D, 18.5), (27, D, 18.5), c("madera", 2))


def escalera_mano(s, v, ancho=3):
    """Escalera de troncos apoyada en la pared derecha (u = W), hasta el borde de la azotea."""
    top = HW + PAR
    for k in range(2):
        vv = v + k * ancho
        s.lineaz((W + 4, vv, 0), (W + 0.5, vv, top), c("madera", 3 - k))
    for z in range(2, top, 3):
        uu = W + 4 - 3.5 * z / top
        s.lineaz((uu, v, z), (uu, v + ancho, z), c("madera", 4))


# ------------------------------------------------------------------ almacén
def almacen_adobe(seed=5):
    s = Spr(W + D + 56, HW + (W + D) // 2 + 60, D + 28, HW + PAR + 28)
    # ---- paredes (adobe sobre zócalo de cantos de río)
    s.cara((0, D, 0), (1, 0, 0), W, (0, 0, 1), HW, fn_muro(T_LIT, seed), fid=1)
    s.cara((W, 0, 0), (0, 1, 0), D, (0, 0, 1), HW, fn_muro(T_SOM, seed + 1), fid=2)
    # ---- puerta ancha de carga: hojas de tablones oscuros, entreabierta, con dintel de viga; rendijas de ventilación
    pintar_vano(s, (0, D, 0), (1, 0, 0), (0, 0, 1), W, HW, 9, 0, 14, 14, "puerta", "madera", "madera", 1.4, seed)
    s.cara((0, D, 0), (1, 0, 0), W, (0, 0, 1), 14, lambda ss, tt, X, Y: np.full(ss.shape, c("madera", 0), np.uint8), fid=9,
           mascara=lambda ss, tt: (ss >= 15.5) & (ss < 17.0) & (tt < 12.5))
    for k, tono in enumerate((4, 3, 2)):
        s.lineaz((7, D, 15 + k), (24, D, 15 + k), c("madera", tono))
    for vs in (3, 27):
        hueco_estrecho(s, (0, D, 0), (1, 0, 0), W, vs, 11, 3, 7)
    for vs in (7, 21):
        hueco_estrecho(s, (W, 0, 0), (0, 1, 0), D, vs, 11, 3, 7)
    # ---- cabezas de viga bajo el borde de la azotea
    for u in range(4, W - 2, 6):
        cabeza_viga(s, u, D, HW - 3)
    for v in range(4, D - 2, 6):
        cabeza_viga(s, W, v, HW - 3, sombra=True)
    # ---- azotea y parapeto bajo (los lados traseros primero: se ve su cara interior)
    s.cara((0, 0, HW), (1, 0, 0), W, (0, 1, 0), D, fn_techo(seed + 20), fid=3)
    caja(s, 0, 0, HW, W, PGR, PAR, fn_barro(T_LIT + 0.3, seed), fn_barro(T_SOM + 0.5, seed + 1), fn_barro(T_LIT + 1.0, seed + 2), fid=4)
    caja(s, 0, PGR, HW, PGR, D - PGR, PAR, fn_barro(T_LIT + 0.3, seed + 3), fn_barro(T_SOM + 0.5, seed + 4), fn_barro(T_LIT + 1.0, seed + 5), fid=4)

    def haces(t):   # haces de caña apilados (2 abajo y 1 encima) para techar y reparar
        haz_cana(t, 6, 6, HW, 16, 3)
        haz_cana(t, 6, 9.5, HW, 16, 5)
        haz_cana(t, 7, 7.8, HW + 3, 14, 7)
    en_capa(s, haces)
    # parapeto delantero (continúa las paredes)
    caja(s, W - PGR, PGR, HW, PGR, D - PGR, PAR, fn_barro(T_LIT, seed + 6), fn_barro(T_SOM, seed + 7), fn_barro(T_LIT + 1.0, seed + 8), fid=5)
    caja(s, 0, D - PGR, HW, W - PGR, PGR, PAR, fn_barro(T_LIT, seed + 9), fn_barro(T_SOM, seed + 10), fn_barro(T_LIT + 1.0, seed + 11), fid=5)

    # ---- lo de fuera, en capa propia con contorno; todo a menos de 4 px de la huella
    def fuera(t):
        escalera_mano(t, 22)
        anfora(t, W + 2.5, 9, 0, h=11, col="teja", tono=2)
        anfora(t, W + 2.5, 13.5, 0, h=11, col="teja", tono=2)
        alero_esteras(t)
        anfora(t, 3.0, D + 3.0, 0, h=12, col="teja", tono=3)
        saco_en(t, 26.8, D + 3.0, 0)
        saco_en(t, 31.4, D + 1.8, 0)
        saco_en(t, 29.1, D + 2.4, 4.5)
    en_capa(s, fuera)
    s.contorno(-3)
    return s.recortar()
