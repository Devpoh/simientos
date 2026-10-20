"""Animales de granja: vaca, caballo, oveja y gallina. Miran abajo-derecha (se voltean)."""
import numpy as np
from paleta import c, TRANSP, TINTA
from iso import Spr
from mitologicos import LG, _spr


# --------------------------------------------------------------- OVEJA
def oveja(frame=0, pose="pastar", voltear=False, oscura=False):
    L = LG(18, 14)
    lana = (c("piedra", 6), c("piedra", 5), c("piedra", 4), c("piedra", 3))
    if oscura:
        lana = (c("piedra", 4), c("piedra", 3), c("piedra", 2), c("piedra", 1))
    cara = (c("madera", 2), c("madera", 1), c("madera", 0))
    bob = frame % 2 if pose == "pastar" else (0, 1, 0, 1)[frame % 4]
    cab = 1 if pose == "pastar" and frame % 2 == 1 else 0     # baja la cabeza a pastar
    y = 2 + (bob if pose != "pastar" else 0)
    # patas
    def pata(x, d):
        L.r(x, y + 8, 1, 3 + d, cara[1]); L.pt(x, y + 10 + d, cara[2])
    marcha = [0, 0, 0, 0] if pose == "pastar" else [(0, 1), (1, 0), (0, -1), (-1, 0)][frame % 4]
    pata(4, 0 if pose == "pastar" else (1 if frame % 2 == 0 else 0))
    pata(6, 0 if pose == "pastar" else (0 if frame % 2 == 0 else 1))
    pata(10, 0 if pose == "pastar" else (1 if frame % 2 == 0 else 0))
    pata(12, 0 if pose == "pastar" else (0 if frame % 2 == 0 else 1))
    # cuerpo de lana con rizos
    forma = [
        "...llllll.....",
        "..lLLllLLll...",
        ".lLlllllllll..",
        "lLllmllllllll.",
        "llllllmllmlll.",
        "lllmlllllllll.",
        ".mmllmllmllm..",
        "..mmmuummmm...",
    ]
    ley = {"L": lana[0], "l": lana[1], "m": lana[2], "u": lana[3]}
    L.art(1, y, forma, ley)
    for (xx, yy) in ((3, 1), (7, 0), (9, 2), (11, 3), (5, 4)):          # rizos claros
        L.pt(xx, y + yy, lana[0])
    # cabeza
    L.r(13, y + 2 + cab * 2, 4, 4, cara[0]); L.r(13, y + 2 + cab * 2, 1, 4, cara[1] if False else cara[0])
    L.r(14, y + 5 + cab * 2, 3, 1, cara[1]); L.pt(16, y + 5 + cab * 2, cara[2])
    L.pt(15, y + 3 + cab * 2, c("piedra", 6)); L.pt(16, y + 3 + cab * 2, TINTA)
    L.pt(13, y + 2 + cab * 2, cara[1]); L.pt(12, y + 3 + cab * 2, cara[2])            # oreja
    L.r(13, y + 1 + cab * 2, 3, 1, lana[1])                                            # tupé
    return _spr(L, 9, 13, voltear=voltear)


# --------------------------------------------------------------- VACA
def vaca(frame=0, pose="pastar", voltear=False, tipo="pinta"):
    L = LG(30, 22)
    if tipo == "pinta":
        base = (c("piedra", 6), c("piedra", 5), c("piedra", 4), c("piedra", 3))
        mancha = (c("madera", 1), c("madera", 0), TINTA)
    else:  # rojiza
        base = (c("madera", 4), c("madera", 3), c("madera", 2), c("madera", 1))
        mancha = (c("madera", 2), c("madera", 1), c("madera", 0))
    rosa = (c("teja", 5), c("teja", 4), c("teja", 3))
    cab = 1 if pose == "pastar" and frame % 2 == 1 else 0
    pasos = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    ph = 0 if pose == "pastar" else frame % 4
    y = 3
    def pata(x, lead):
        d = 0 if pose == "pastar" else pasos[(ph + lead) % 4][0]
        l = 0 if pose == "pastar" else (-1 if pasos[(ph + lead) % 4][1] < 0 else 0)
        L.r(x + d, y + 10, 3, 5 + l, base[1]); L.r(x + d, y + 10, 1, 5 + l, base[0]); L.r(x + 2 + d, y + 10, 1, 5 + l, base[2])
        L.r(x + d, y + 15 + l, 3, 2, c("madera", 0)); L.pt(x + d, y + 15 + l, c("madera", 1))
    pata(6, 1); pata(10, 3); pata(18, 0); pata(22, 2)       # las lejanas se pintan igual pero antes
    # cuerpo
    for yy in range(0, 11):
        x0 = 3 + (1 if yy in (0, 10) else 0)
        x1 = 25 - (1 if yy in (0, 10) else 0)
        L.r(x0, y + yy, x1 - x0, 1, base[1])
        L.pt(x0, y + yy, base[0]); L.pt(x0 + 1, y + yy, base[0]) if yy < 6 else None
        L.pt(x1 - 1, y + yy, base[3]); L.pt(x1 - 2, y + yy, base[2])
    L.r(4, y, 20, 2, base[0])
    L.r(5, y + 8, 18, 3, base[2])
    # manchas
    for (mx, my, mw, mh) in ((6, 1, 5, 4), (8, 5, 3, 3), (15, 2, 6, 5), (19, 6, 4, 3), (12, 7, 3, 2)):
        if tipo == "pinta":
            L.r(mx, y + my, mw, mh, mancha[0]); L.r(mx, y + my, mw, 1, mancha[0])
            L.pt(mx, y + my, None); L.pt(mx + mw - 1, y + my + mh - 1, None)
            L.r(mx + mw - 2, y + my + 1, 1, mh - 1, mancha[1])
    # ubre y cola
    L.r(12, y + 10, 4, 2, rosa[1]); L.pt(12, y + 12, rosa[2]); L.pt(14, y + 12, rosa[2])
    for k in range(9):
        L.pt(2 - (k > 4), y + 1 + k, mancha[0] if tipo == "pinta" else base[3])
    L.r(1, y + 9, 2, 2, mancha[1])
    # cabeza (más grande, abajo a la derecha)
    hy = y + 2 + cab * 5
    L.r(24, hy, 6, 6, base[1]); L.r(24, hy, 1, 6, base[0]); L.r(29, hy + 1, 1, 5, base[2])
    L.r(26, hy + 4, 4, 3, rosa[1]); L.pt(29, hy + 5, TINTA); L.pt(28, hy + 4, rosa[2])
    L.pt(26, hy + 2, TINTA)
    L.r(24, hy, 2, 2, mancha[0] if tipo == "pinta" else base[2])
    L.pt(23, hy + 1, base[3]); L.pt(22, hy, mancha[1])                                    # oreja
    L.pt(25, hy - 1, c("tierra", 5)); L.pt(24, hy - 2, c("tierra", 6)); L.pt(28, hy - 1, c("tierra", 5)); L.pt(29, hy - 2, c("tierra", 6))  # cuernos
    L.r(22, y + 1, 4, 5, base[1] if cab == 0 else base[1])                                 # cuello
    return _spr(L, 14, 20, voltear=voltear)


from caballo import caballo  # noqa: E402  (v2 con cuello arqueado)


# --------------------------------------------------------------- GALLINA
def gallina(frame=0, pose="picotear", voltear=False, tipo="blanca"):
    L = LG(10, 9)
    pl = (c("piedra", 6), c("piedra", 5), c("piedra", 4)) if tipo == "blanca" else (c("teja", 4), c("teja", 3), c("teja", 1))
    cab = frame % 2
    L.r(1, 3, 6, 4, pl[1]); L.r(1, 3, 6, 1, pl[0]); L.r(5, 4, 2, 3, pl[2]); L.pt(0, 3, pl[1]); L.pt(0, 2, pl[0])
    L.r(6, 1 + cab * 2, 3, 3, pl[1]); L.pt(8, 2 + cab * 2, TINTA); L.pt(9, 3 + cab * 2, c("tierra", 4))
    L.pt(7, 0 + cab * 2, c("teja", 3)); L.pt(8, 0 + cab * 2, c("teja", 3)); L.pt(8, 4 + cab * 2, c("teja", 3))
    L.pt(3, 7, c("tierra", 4)); L.pt(5, 7, c("tierra", 4)); L.pt(3, 8, c("tierra", 3)); L.pt(5, 8, c("tierra", 3))
    return _spr(L, 5, 8, voltear=voltear)


ANIMALES = {"oveja": oveja, "vaca": vaca, "caballo": caballo, "gallina": gallina}
