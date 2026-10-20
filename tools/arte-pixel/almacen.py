"""Almacén de era 1 (R77, R80): barro sin enlucir y techo de paja a dos aguas. Huella 2×2 tiles (32×32 px de suelo).

Materiales del entorno, sin acabar: muros de barro amasado a mano (esquinas redondeadas, capas, grietas, marcas de manos),
cubierta de paja atada en hiladas con el borde deshilachado, puerta de esteras de caña entreabierta, ánforas y sacos con la boca
atada. NUNCA teja, sillar, enlucido liso, ventanas con marco ni puerta de tablas. El frontón mira a +v (la cara iluminada).
Se dibuja con `relieve.py` (mapa de alturas); lo pequeño de fuera va en capas con contorno y sobresale como mucho 4 px de la huella.
"""
import sys
sys.dont_write_bytecode = True
import numpy as np
from paleta import c, TRANSP
from util import hash2, fbm
from iso import Spr
from tablas import RID, a_indice
import relieve as RL

W = D = 32
HW = 18               # altura de los muros de barro
R = 13                # lo que sube la cubierta sobre el muro (cumbrera = HW + R)
SKIRT = 14.5          # altura a la que cuelga el borde de la paja
SEED = 7


def idx(ramp, tn):
    return a_indice(np.full(tn.shape, RID[ramp]), tn)


# ------------------------------------------------------------------ cuerpos (mapas de alturas)
def h_muro(U, V):
    """Muro de barro: rectángulo de esquinas muy redondeadas, borde irregular a mano y arista superior blanda."""
    du = (fbm(V * 0.17 + 5, U * 0.09, 2, 3) - 0.5) * 2.2
    dv = (fbm(U * 0.17 + 9, V * 0.09, 2, 4) - 0.5) * 2.2
    q = (np.abs(U - 16 + du) / 13.0) ** 4 + (np.abs(V - 16 + dv) / 13.0) ** 4
    return HW * np.sqrt(np.clip((1 - q) * 5.0, 0, 1))


def h_techo(U, V):
    """Dos aguas con la cumbrera a lo largo de v: faldones a ±u, frontón hacia +v, bordes deshilachados."""
    fu = np.floor(V)
    fv = np.floor(U)
    dentro = ((U > 1.5 + 1.0 * hash2(fu, 1, SEED)) & (U < 30.5 - 1.0 * hash2(fu, 2, SEED))
              & (V > 1.5 + 0.8 * hash2(fv, 3, SEED)) & (V < 30.5 - 0.9 * hash2(fv, 4, SEED)))
    h = HW + R * (1 - np.abs(U - 16) / 14.8) + 1.8 * np.exp(-(((U - 16) / 1.9) ** 2))      # cumbrera con caballete
    return np.where(dentro, h, 0.0)


def z0_techo(U, V):
    """Borde inferior de la paja deshilachado: cuelga más o menos según la hebra."""
    return SKIRT + (hash2(np.floor(U * 0.9), np.floor(V * 0.9), SEED + 9) - 0.5) * 3.0


# ------------------------------------------------------------------ materiales
def mat_barro(ctx):
    """Barro amasado a mano: capas, grietas verticales y marcas de manos; más oscuro junto al suelo y bajo el alero."""
    U, V, Z = ctx.U, ctx.V, ctx.Z
    arriba = ctx.nz > 0.7
    lateral = np.where(np.abs(ctx.nu) > np.abs(ctx.nv), V, U)
    tu = np.where(arriba, U, lateral)
    tv = np.where(arriba, V, Z)
    n = fbm(tu * 0.18 + 3, tv * 0.22, 3, SEED)
    tn = 2.0 + (ctx.lum - 0.35) * 2.4 + (n - 0.5) * 1.2
    tn = tn - 0.9 * np.clip((2.5 - Z) / 2.5, 0, 1)                                   # suelo húmedo
    tn = tn - 0.9 * np.clip((Z - (SKIRT - 4.0)) / 3.5, 0, 1)                                   # sombra del alero
    tn = tn - 0.5 * (np.sin((tv + n * 3) * 1.55) > 0.88)                             # capas de barro
    grieta = np.abs(fbm(tu * 0.33 + 20, tv * 0.08, 2, SEED + 5) - 0.5) < 0.016        # grietas verticales
    tn = np.where(grieta & ~arriba, tn - 1.6, tn)
    cx, cz = np.floor(tu / 9.0), np.floor(tv / 7.0)
    lx, lz = tu - cx * 9.0, tv - cz * 7.0
    mano = (hash2(cx, cz, SEED + 8) > 0.8) & ~arriba
    palma = (((lx - 4) / 1.7) ** 2 + ((lz - 2.2) / 1.3) ** 2 < 1)
    dedos = (np.floor(lz) == 5) & np.isin(np.floor(lx), (2, 3, 5, 6))
    tn = np.where(mano & (palma | dedos), tn - 1.0, tn)
    out = idx("tierra", tn)
    # puerta de esteras de caña, entreabierta, entre dos troncos y bajo el borde de la paja
    puerta = (ctx.nv > 0.55) & (V > 26) & (U > 9.5) & (U < 22.5) & (Z < SKIRT - 0.2)
    poste = puerta & ((U < 10.9) | (U > 21.1))
    out = np.where(poste, idx("madera", 2.4 + (ctx.lum - 0.35) * 2.0 + (np.mod(Z, 3.0) < 0.6) * -0.8 + 0.8), out)
    estera = puerta & ~poste
    teje = ((np.floor(U) + np.floor(Z)) % 2)
    mt = 3.9 - 0.9 * teje - 0.5 * (np.floor(U / 2.0) % 2) + (hash2(np.floor(U), np.floor(Z), SEED) - 0.5) * 0.5
    mt = np.where(Z > SKIRT - 2.4, 4.7 - 0.8 * teje, mt)                                       # estera enrollada arriba
    out = np.where(estera, idx("tierra", mt), out)
    abierta = estera & (U > 15.3) & (U < 16.9) & (Z < SKIRT - 3.0)                            # rendija: se ve el interior
    return np.where(abierta, c("madera", 0), out).astype(np.uint8)


def mat_paja(ctx):
    """Paja atada en hiladas: hebras a lo largo de la bajada del faldón, hilada con borde sombreado, caballete atado."""
    U, V, Z = ctx.U, ctx.V, ctx.Z
    q = np.abs(U - 16)
    frontal = ctx.nv > 0.6                                    # frontón: se ven las hebras de frente
    col = np.where(frontal, np.floor(U), np.floor(V))
    cur = np.where(frontal, Z / 4.2, q / 4.6)
    hh = hash2(col, np.floor(cur), SEED + 1)
    tn = 3.8 + (hh - 0.5) * 1.2 + (ctx.lum - 0.35) * 3.8
    f = cur - np.floor(cur)
    tn = np.where(f < 0.22, tn - 1.0, np.where(f > 0.82, tn + 0.4, tn))               # canto de cada hilada
    tn = tn + (hash2(col * 3, np.floor(cur * 5), SEED + 2) > 0.92) * 0.9              # hebras sueltas
    tn = tn - (hash2(np.floor(V / 3), np.floor(q / 6), SEED + 3) > 0.86) * 0.9        # paja vieja
    cumbrera = (q < 2.3) & (ctx.nv < 0.6)
    atado = cumbrera & (np.mod(V, 6.0) < 1.0)
    tn = np.where(cumbrera, tn - 1.0, tn)
    out = idx("tierra", tn)
    return np.where(atado, c("madera", 2), out).astype(np.uint8)


# ------------------------------------------------------------------ objetos pequeños (capas con contorno)
SACO = [
    "..l.l..",
    "..lLl..",
    "..ttt..",
    ".lLLLm.",
    "lLLLLmd",
    "lLLLmmd",
    "lLLmmdd",
    ".mmmddd",
    "..dddd.",
]
COL_SACO = {"l": ("piedra", 6), "L": ("piedra", 5), "m": ("piedra", 4), "d": ("piedra", 3), "t": ("madera", 2)}


def saco_en(s, u, v, z):
    """Saco de grano de lino con la boca atada con una cuerda (7x9 px)."""
    x, y = s.P(u, v, z)
    x, y = int(round(x)) - 3, int(round(y)) - 9
    for j, fila in enumerate(SACO):
        for i, ch in enumerate(fila):
            if ch != ".":
                s.pset(x + i, y + j, c(*COL_SACO[ch]))


ANFORA = [4, 2, 2, 3, 4, 6, 7, 8, 8, 8, 7, 5, 3]          # de la boca a la base


def anfora_en(s, u, v, z, tono=3):
    """Ánfora de barro cocido (13 px): boca, cuello, dos asas, panza con una banda pintada y base estrecha."""
    x, y = s.P(u, v, z)
    x, y = int(round(x)), int(round(y))
    n = len(ANFORA)
    for j, w in enumerate(ANFORA):
        yy = y - n + 1 + j
        for i in range(w):
            xx = x - w // 2 + i
            t = tono + 0.9 - 2.4 * (i / max(1, w - 1))
            col = c("teja", int(np.floor(t + 0.5)))
            if j in (8, 9):                                    # banda pintada
                col = c("madera", 2 if i < w // 2 else 1)
            s.pset(xx, yy, col)
    s.pset(x - 3, y - n + 5, c("teja", tono - 1)); s.pset(x - 3, y - n + 6, c("teja", tono - 1))                       # asa izquierda
    s.pset(x + 2, y - n + 5, c("teja", tono - 2)); s.pset(x + 2, y - n + 6, c("teja", tono - 2))                       # asa derecha
    s.pset(x - 1, y - n + 1, c("teja", tono + 1)); s.pset(x, y - n + 1, c("teja", tono + 1))                           # borde de la boca


def en_capa(s, dibujar):
    """Dibuja objetos pequeños en una capa propia con contorno (se leen sobre un fondo de su mismo color)."""
    tmp = Spr(s.w, s.h, s.ax, s.ay)
    dibujar(tmp)
    tmp.contorno(-3)
    m = tmp.px != TRANSP
    s.px[m] = tmp.px[m]


# ------------------------------------------------------------------ almacén
def almacen_adobe():
    ax, ay = D + 14, 44
    s = RL.renderizar([RL.Solido(h_muro, mat_barro), RL.Solido(h_techo, mat_paja, z0=z0_techo)],
                      W + D + 28, 96, ax, ay, smax=W + D + 4)
    s.contorno(-3)

    def fuera(t):
        anfora_en(t, 4.0, D + 2.6, 0, tono=3)
        anfora_en(t, 7.4, D + 3.4, 0, tono=4)
        saco_en(t, 25.0, D + 3.0, 0)
        saco_en(t, 29.6, D + 1.8, 0)
        saco_en(t, 27.2, D + 2.4, 4.5)
    en_capa(s, fuera)
    return s.recortar()
