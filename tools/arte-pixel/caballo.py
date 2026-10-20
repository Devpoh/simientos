"""Caballo (v3): silueta por polígonos con anatomía real y sombreado que sigue el contorno."""
import numpy as np
from PIL import Image, ImageDraw
from paleta import c, TINTA, TRANSP
from mitologicos import LG, _spr

CAPAS = {
    "castano": ((c("madera", 4), c("madera", 3), c("madera", 2), c("madera", 1)), (c("madera", 0), TINTA, c("madera", 1))),
    "blanco": ((c("piedra", 6), c("piedra", 5), c("piedra", 4), c("piedra", 3)), (c("piedra", 4), c("piedra", 3), c("piedra", 2))),
    "negro": ((c("madera", 2), c("madera", 1), c("madera", 0), TINTA), (TINTA, c("madera", 0), c("madera", 1))),
    "palomino": ((c("tierra", 5), c("tierra", 4), c("tierra", 3), c("tierra", 2)), (c("piedra", 5), c("piedra", 4), c("piedra", 3))),
}


def _runs(m):
    """Longitud de la racha de True hacia arriba/abajo/izquierda/derecha desde cada píxel (incluido)."""
    h, w = m.shape
    up = np.zeros(m.shape, int); dn = np.zeros(m.shape, int); lf = np.zeros(m.shape, int); rt = np.zeros(m.shape, int)
    for y in range(h):
        up[y] = np.where(m[y], (up[y - 1] if y else 0) + 1, 0)
    for y in range(h - 1, -1, -1):
        dn[y] = np.where(m[y], (dn[y + 1] if y < h - 1 else 0) + 1, 0)
    for x in range(w):
        lf[:, x] = np.where(m[:, x], (lf[:, x - 1] if x else 0) + 1, 0)
    for x in range(w - 1, -1, -1):
        rt[:, x] = np.where(m[:, x], (rt[:, x + 1] if x < w - 1 else 0) + 1, 0)
    return up, dn, lf, rt


def parte(L, pts, cols, luz=2, som=2, izq=1, der=2):
    """Rellena un polígono y lo sombrea siguiendo su contorno (luz arriba-izquierda)."""
    im = Image.new("L", (L.w, L.h), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
    m = np.array(im) > 0
    up, dn, lf, rt = _runs(m)
    lz, md, sm, hn = cols
    out = np.full(m.shape, md, np.uint8)
    out = np.where((up <= luz) | (lf <= izq), lz, out)
    out = np.where((dn <= som) | (rt <= der), sm, out)
    out = np.where((dn <= 1) & (up > 2), hn, out)
    L.p[m] = out[m]


def caballo(frame=0, pose="pastar", voltear=False, capa="castano"):
    L = LG(60, 46)
    cu, crin = CAPAS[capa]
    luz, med, som, hon = cu
    osc = (med, som, hon, hon)                   # paleta de las patas lejanas
    mel, mel2, mel3 = crin
    pasos = [(-3, 0), (-1, 0), (3, -2), (1, 0)]
    ph = 0 if pose == "pastar" else frame % 4
    bajar = pose == "pastar" and frame % 2 == 1
    OY = 2     # margen superior
    gy = 39 + OY - 2

    def P(pts):
        return [(x, y + OY) for x, y in pts]

    def pata(x0, lead, delantera, lejana):
        d, lv = (0, 0) if pose == "pastar" else pasos[(ph + lead) % 4]
        cl = osc if lejana else cu
        if delantera:
            x = x0
            parte(L, P([(x, 18), (x + 6, 18), (x + 5, 26), (x + 4 + d // 2, 28), (x + 1 + d // 2, 28), (x, 24)]), cl, 2, 2, 1, 1)     # antebrazo
            parte(L, P([(x + 1 + d // 2, 28), (x + 4 + d // 2, 28), (x + 4 + d, 34 + lv), (x + 2 + d, 34 + lv)]), cl, 1, 1, 1, 1)       # caña
            parte(L, P([(x + 1 + d, 34 + lv), (x + 5 + d, 34 + lv), (x + 6 + d, 36 + lv), (x + d, 36 + lv)]), cl, 1, 1, 1, 1)           # cuartilla
            parte(L, P([(x - 1 + d, 36 + lv), (x + 6 + d, 36 + lv), (x + 7 + d, 38 + lv), (x - 2 + d, 38 + lv)]),
                  (c("madera", 1), c("madera", 0), TINTA, TINTA), 1, 1, 1, 1)                                                      # casco
        else:
            x = x0
            parte(L, P([(x, 16), (x + 8, 16), (x + 7, 24), (x + 5 + d // 2, 28), (x + 1 + d // 2, 28), (x - 1, 22)]), cl, 2, 2, 1, 1)  # muslo/grasa
            parte(L, P([(x + 1 + d // 2, 28), (x + 5 + d // 2, 28), (x + 4 + d, 34 + lv), (x + 2 + d, 34 + lv)]), cl, 1, 1, 1, 1)     # caña (corvejón)
            parte(L, P([(x + 1 + d, 34 + lv), (x + 5 + d, 34 + lv), (x + 6 + d, 36 + lv), (x + d, 36 + lv)]), cl, 1, 1, 1, 1)
            parte(L, P([(x - 1 + d, 36 + lv), (x + 6 + d, 36 + lv), (x + 7 + d, 38 + lv), (x - 2 + d, 38 + lv)]),
                  (c("madera", 1), c("madera", 0), TINTA, TINTA), 1, 1, 1, 1)

    # patas lejanas primero
    pata(12, 3, False, True)
    pata(30, 1, True, True)
    # cola
    parte(L, P([(6, 12), (3, 14), (1, 20), (1, 28), (3, 33), (5, 28), (4, 21), (7, 16)]), (mel2, mel, mel3, mel3), 1, 1, 1, 1)
    for k in range(5):
        L.pt(2 + (k % 2), 16 + k * 3 + OY, mel2)
    # cuerpo: grupa redonda, lomo, pecho profundo
    parte(L, P([(6, 12), (8, 9), (14, 8), (21, 10), (27, 10), (31, 9), (34, 11), (37, 15), (38, 20), (35, 24),
                (29, 25), (22, 24), (15, 24), (9, 23), (5, 19), (4, 15)]), cu, 2, 3, 2, 2)
    # músculos: grupa, paleta, vientre
    parte(L, P([(7, 12), (12, 11), (14, 17), (11, 21), (7, 18)]), (luz, luz, med, med), 1, 1, 1, 1)
    parte(L, P([(29, 12), (34, 12), (36, 17), (33, 21), (29, 18)]), (luz, med, med, som), 1, 1, 1, 1)
    parte(L, P([(15, 22), (28, 22), (27, 25), (16, 25)]), (som, som, hon, hon), 1, 1, 1, 1)
    # patas cercanas
    pata(8, 2, False, False)
    pata(31, 0, True, False)
    ley_cab = None
    if not bajar:
        # cuello grueso que se afina hacia la nuca + cabeza larga
        parte(L, P([(30, 11), (33, 7), (37, 3), (41, 1), (44, 3), (44, 7), (41, 11), (39, 15), (38, 20), (34, 16)]), cu, 2, 3, 2, 2)
        # crin a lo largo de la cresta
        parte(L, P([(29, 11), (32, 6), (36, 2), (41, 0), (42, 2), (38, 4), (35, 8), (32, 12)]), (mel2, mel, mel3, mel3), 1, 1, 1, 1)
        # cabeza
        parte(L, P([(42, 2), (45, 1), (49, 5), (53, 10), (53, 12), (50, 13), (46, 11), (43, 8)]), cu, 2, 2, 1, 1)
        parte(L, P([(44, 2), (45, 2), (49, 7), (52, 10), (50, 11), (47, 8)]), (c("piedra", 6), c("piedra", 5), c("piedra", 4), c("piedra", 4)), 1, 1, 0, 0) \
            if capa != "blanco" else None
        # orejas, ojo, nariz, boca
        parte(L, P([(42, 2), (42, -1), (45, 1)]), cu, 1, 1, 1, 1)
        parte(L, P([(44, 2), (45, -1), (47, 2)]), (med, med, som, som), 1, 1, 1, 1)
        L.pt(46, 5 + OY, TINTA); L.pt(47, 5 + OY, TINTA)
        L.pt(52, 10 + OY, TINTA); L.pt(51, 12 + OY, som)
        L.pt(48, 12 + OY, som)
        # tupé
        L.pt(43, 3 + OY, mel2); L.pt(42, 4 + OY, mel); L.pt(42, 5 + OY, mel)
    else:
        # cuello bajo, pastando
        parte(L, P([(31, 10), (35, 10), (42, 16), (46, 21), (44, 25), (39, 22), (35, 18)]), cu, 2, 3, 2, 2)
        parte(L, P([(30, 10), (34, 9), (41, 14), (46, 19), (44, 21), (39, 17), (33, 13)]), (mel2, mel, mel3, mel3), 1, 1, 1, 1)
        parte(L, P([(43, 22), (47, 20), (50, 25), (50, 31), (47, 33), (45, 30), (43, 26)]), cu, 2, 2, 1, 1)
        parte(L, P([(44, 22), (46, 21), (47, 26), (46, 29)]), (c("piedra", 6), c("piedra", 5), c("piedra", 4), c("piedra", 4)), 1, 1, 0, 0) \
            if capa != "blanco" else None
        parte(L, P([(43, 22), (42, 19), (46, 21)]), cu, 1, 1, 1, 1)
        L.pt(46, 24 + OY, TINTA)
        L.pt(49, 31 + OY, TINTA)
    return _spr(L, 26, gy, voltear=voltear)
