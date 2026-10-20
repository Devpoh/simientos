"""Criaturas mitológicas de IMPERIUM: minotauro, centauro y sátiro (pixel art, misma paleta).

Versión 1 (la elegida por el usuario). Los intentos v2 (volumétrico) y v3 (compacto grande) están
en `descartados/` como registro de lo que no gustó.
"""
import numpy as np
from paleta import c, TRANSP, TINTA
from iso import Spr


class LG:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = np.full((h, w), TRANSP, np.uint8)

    def pt(self, x, y, col):
        x, y = int(x), int(y)
        if col is not None and 0 <= x < self.w and 0 <= y < self.h:
            self.p[y, x] = col

    def r(self, x, y, w, h, col):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.pt(xx, yy, col)

    def art(self, x, y, filas, ley):
        for j, fila in enumerate(filas):
            for i, ch in enumerate(fila):
                if ch != "." and ch in ley:
                    self.pt(x + i, y + j, ley[ch])

    def linea(self, x0, y0, x1, y1, col):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for k in range(n + 1):
            f = k / max(1, n)
            self.pt(round(x0 + (x1 - x0) * f), round(y0 + (y1 - y0) * f), col)


def _spr(L: LG, ax, ay, contorno=True, voltear=False):
    s = Spr(L.w, L.h, ax, ay)
    s.px = L.p.copy()
    if contorno:
        s.contorno(-3)
    if voltear:
        s = s.volteado()
    return s


# =============================================================== MINOTAURO
def minotauro(frame=0, pose="idle", carga=False, voltear=False):
    """Guerrero toro de 34x40 con labrys. frame 0..3 al caminar."""
    L = LG(36, 42)
    mar = {"idle": (0, 0, 0, 0)}.get(pose)
    ciclo = [(0, -2, 2, 1), (1, -1, 1, 0), (0, 2, -2, -1), (1, 1, -1, 0)]
    bob, bx, fx, brazo = mar if mar else ciclo[frame % 4]
    fur = (c("madera", 3), c("madera", 2), c("madera", 1))       # luz, medio, sombra
    cara = (c("tierra", 4), c("tierra", 3), c("tierra", 2))
    marfil = (c("piedra", 6), c("piedra", 5), c("piedra", 4))
    oro = (c("oro", 2), c("oro", 1), c("oro", 0))
    car = (c("carmesi", 2), c("carmesi", 1), c("carmesi", 0))
    y0 = bob          # el cuerpo sube/baja; los pies no

    # --- patas de toro (la de atrás más oscura)
    def pata(x, dx, claro):
        a, b, d = (fur[1], fur[0], fur[2]) if claro else (fur[2], fur[1], fur[2])
        L.r(x, 29 + y0, 5, 5, a)                               # muslo
        L.r(x, 29 + y0, 1, 5, b)
        L.pt(x + 1, 31 + y0, d)
        L.r(x + 1 + dx, 34, 3, 4, a)                            # caña
        L.r(x + 1 + dx, 34, 1, 4, b)
        L.pt(x + 2 + dx, 35, d)
        L.r(x + dx, 38, 5, 2, c("madera", 0))                   # pezuña hendida
        L.r(x + dx, 38, 2, 1, c("madera", 1))
        L.pt(x + 2 + dx, 39, TINTA)
        L.r(x + 1 + dx - 0, 33, 3, 1, fur[2])                  # menudillo

    pata(10, bx, False)
    pata(17, fx, True)
    # --- faldellín carmesí con cenefa
    L.r(9, 24 + y0, 14, 7, car[1])
    L.r(9, 24 + y0, 3, 7, car[0])
    L.r(20, 24 + y0, 3, 7, car[2])
    for xx in (12, 15, 18, 21):
        L.r(xx, 25 + y0, 1, 6, car[2])
    L.r(9, 30 + y0, 14, 1, oro[1])
    for xx in range(9, 23, 2):
        L.pt(xx, 30 + y0, oro[0])
    L.r(9, 23 + y0, 14, 2, oro[1]); L.r(9, 23 + y0, 14, 1, oro[0])
    L.r(15, 23 + y0, 3, 2, oro[2]); L.pt(16, 24 + y0, oro[0])
    # --- torso de toro, fornido
    for yy in range(13, 23):
        t = (yy - 13) / 9.0
        x0 = int(round(7 + t * 2.5))
        x1 = int(round(24 - t * 2.5))
        L.r(x0, yy + y0, x1 - x0, 1, fur[1])
        L.pt(x0, yy + y0, fur[0]); L.pt(x0 + 1, yy + y0, fur[0])
        L.pt(x1 - 1, yy + y0, fur[2]); L.pt(x1 - 2, yy + y0, fur[2])
    # pectorales y abdominales
    L.r(10, 15 + y0, 5, 4, fur[0]); L.r(16, 15 + y0, 5, 4, fur[1])
    L.r(10, 19 + y0, 11, 1, fur[2]); L.pt(15, 15 + y0, fur[2]); L.pt(15, 16 + y0, fur[2])
    L.r(15, 19 + y0, 1, 4, fur[2])
    L.r(11, 21 + y0, 4, 1, fur[2]); L.r(16, 21 + y0, 4, 1, fur[2])
    for (xx, yy) in ((12, 17), (18, 16), (19, 18), (11, 14), (20, 14)):    # pelo
        L.pt(xx, yy + y0, fur[2])
    # hombreras de bronce
    L.r(6, 13 + y0, 4, 3, oro[1]); L.r(6, 13 + y0, 4, 1, oro[0]); L.pt(9, 15 + y0, oro[2])
    L.r(21, 13 + y0, 4, 3, oro[1]); L.r(21, 13 + y0, 4, 1, oro[0]); L.r(23, 14 + y0, 2, 2, oro[2])
    # --- brazo cercano (izquierda del dibujo): sostiene el labrys / la carga
    L.r(4, 16 + y0 - brazo, 4, 9, fur[1]); L.r(4, 16 + y0 - brazo, 1, 9, fur[0]); L.r(7, 16 + y0 - brazo, 1, 9, fur[2])
    L.r(4, 23 + y0 - brazo, 4, 2, oro[1]); L.r(4, 23 + y0 - brazo, 4, 1, oro[0])           # brazalete
    L.r(3, 25 + y0 - brazo, 5, 4, fur[2]); L.r(3, 25 + y0 - brazo, 2, 4, fur[1])            # mano
    # --- brazo lejano
    L.r(24, 17 + y0 + brazo, 4, 8, fur[2]); L.r(24, 17 + y0 + brazo, 1, 8, fur[1])
    L.r(24, 23 + y0 + brazo, 4, 2, oro[2])
    L.r(24, 25 + y0 + brazo, 4, 3, fur[2])
    if not carga:
        # labrys: mango largo y doble hacha de bronce
        L.r(26, 6 + y0, 2, 34 - y0, c("madera", 3)); L.r(26, 6 + y0, 1, 34 - y0, c("madera", 4))
        for yy in range(9, 38, 5):
            L.pt(27, yy + y0, c("madera", 1))
        L.art(21, 3 + y0, ["..oooo.", ".ooOOo.", "oOOoo..", "oOo....", ".oOo...", "..ooo.."],
              {"o": oro[1], "O": oro[0]})
        L.art(28, 3 + y0, [".oooo..", ".oOOoo.", "..ooOOo", "....oOo", "...oOo.", "...ooo."],
              {"o": oro[1], "O": oro[2]})
        L.pt(26, 7 + y0, oro[0]); L.pt(27, 7 + y0, oro[2])
    else:
        # bloque de mármol sostenido en brazos a la altura del pecho (lejos de los cuernos)
        L.r(9, 21 + y0, 14, 8, c("piedra", 4)); L.r(9, 21 + y0, 14, 2, c("piedra", 6)); L.r(20, 23 + y0, 3, 6, c("piedra", 2))
        L.r(9, 27 + y0, 11, 2, c("piedra", 3)); L.pt(13, 24 + y0, c("piedra", 3)); L.pt(16, 25 + y0, c("piedra", 3))
    # --- cuello y cabeza
    L.r(10, 11 + y0, 9, 4, fur[1]); L.r(10, 11 + y0, 2, 4, fur[0]); L.r(17, 11 + y0, 2, 4, fur[2])
    ley = {"h": fur[1], "l": fur[0], "H": fur[2], "n": cara[1], "N": cara[0], "o": c("madera", 0), "e": car[0],
           "d": TINTA, "m": c("madera", 0), "t": cara[2], "r": oro[0]}
    cab = [
        "...hhhhh....",
        "..hhllhhh...",
        ".Hhhhhhhhh..",
        "HHhhhdddhhh.",
        "HhhhhhedhhNn",
        ".hhhhhhhnNNn",
        "..hhhhhnNNno",
        "...HhhhnnNnr",
        "...HHhhmmmtr",
        "....HHHHHt.r",
    ]
    L.art(8, 4 + y0, cab, ley)
    # cuernos de marfil (curvados hacia arriba y hacia dentro)
    for (x, y) in [(10, 7), (9, 6), (8, 5), (7, 4), (6, 3), (6, 2), (6, 1)]:
        L.pt(x, y + y0, marfil[2] if y > 3 else marfil[0])
    for (x, y) in [(10, 6), (9, 5), (8, 4), (7, 3), (7, 2), (7, 1), (8, 0)]:
        L.pt(x, y + y0, marfil[1])
    for (x, y) in [(17, 6), (18, 5), (19, 4), (20, 3), (20, 2), (20, 1), (19, 0)]:
        L.pt(x, y + y0, marfil[1])
    for (x, y) in [(17, 7), (18, 6), (19, 5), (20, 4), (21, 3), (21, 2), (21, 1)]:
        L.pt(x, y + y0, marfil[2] if y > 3 else marfil[1])
    L.pt(8, 0 + y0, marfil[0]); L.pt(19, 0 + y0, marfil[0])
    return _spr(L, 16, 39, voltear=voltear)


# =============================================================== CENTAURO
def centauro(frame=0, pose="idle", voltear=False):
    """Centauro arquero (46x36). Galope de 4 fotogramas."""
    L = LG(48, 38)
    ciclo = [(0, 0), (1, 1), (0, 2), (-1, 3)]
    if pose == "idle":
        bob, ph = 0, 0
    else:
        bob, ph = ciclo[frame % 4]
    cast = (c("madera", 4), c("madera", 3), c("madera", 2), c("madera", 1))   # luz..sombra
    crin = (c("madera", 1), c("madera", 0), TINTA)
    piel = (c("piel", 0), c("piel", 1), c("piel", 2))
    oro = (c("oro", 2), c("oro", 1), c("oro", 0))
    y0 = bob

    # patas de caballo en 3 tramos. fase del galope desplaza los tramos
    def pata(x, ph_, claro):
        col = cast[1] if claro else cast[2]
        luz = cast[0] if claro else cast[1]
        sh = cast[2] if claro else cast[3]
        sw = [(-3, -1), (-1, 0), (2, 1), (1, 2)][ph_ % 4]
        # muslo (desde el cuerpo)
        L.r(x, 21 + y0, 4, 5, col); L.r(x, 21 + y0, 1, 5, luz)
        # caña
        for k in range(5):
            xx = x + int(round(sw[0] * (k + 1) / 5.0))
            L.r(xx + 1, 26 + k + y0 * 0, 3, 1, col); L.pt(xx + 1, 26 + k, luz)
        xc = x + sw[0]
        # casco
        L.r(xc + 1, 31 + (0 if sw[1] <= 0 else -1) * 0, 4, 2, c("madera", 0))
        L.pt(xc + 1, 31, c("madera", 1))

    # patas traseras (x=8..11) y delanteras (x=29..32); las lejanas más oscuras
    pata(10, ph + 2, False)
    pata(31, ph, False)
    pata(7, ph, True)
    pata(28, ph + 2, True)
    # cola
    for k in range(10):
        L.pt(5 - (k % 3 == 0) - k // 5, 14 + k, crin[0] if k % 2 == 0 else crin[1])
        L.pt(6 - k // 4, 14 + k, crin[1] if k % 2 == 0 else crin[0])
    L.pt(3, 23, crin[2])
    # barril del caballo
    for yy in range(13, 23):
        x0 = 6 + (1 if yy > 20 else 0)
        x1 = 34 - (1 if yy < 15 else 0)
        L.r(x0, yy + y0, x1 - x0, 1, cast[1])
        L.pt(x0, yy + y0, cast[0])
        if yy < 19:
            L.pt(x0 + 1, yy + y0, cast[0])
        L.pt(x1 - 1, yy + y0, cast[3]); L.pt(x1 - 2, yy + y0, cast[2])
    L.r(8, 13 + y0, 24, 2, cast[0])                                     # lomo iluminado
    L.r(10, 21 + y0, 20, 2, cast[2])                                    # vientre en sombra
    L.pt(20, 17 + y0, cast[2]); L.pt(21, 17 + y0, cast[2])
    # grupa y pecho (musculatura)
    L.r(8, 15 + y0, 4, 5, cast[0]); L.r(27, 15 + y0, 5, 6, cast[1]); L.r(27, 15 + y0, 2, 5, cast[0])
    # --- torso humano que emerge del pecho
    L.r(29, 5 + y0, 7, 11, piel[1]); L.r(29, 5 + y0, 2, 11, piel[0]); L.r(34, 5 + y0, 2, 11, piel[2])
    L.r(30, 8 + y0, 3, 2, piel[0]); L.r(33, 8 + y0, 2, 2, piel[1]); L.r(31, 11 + y0, 4, 1, piel[2])
    L.r(29, 14 + y0, 7, 2, c("madera", 3)); L.pt(32, 15 + y0, oro[0])      # cinturón
    # carcaj y flechas a la espalda
    L.r(26, 3 + y0, 3, 10, c("madera", 2)); L.r(26, 3 + y0, 1, 10, c("madera", 3))
    L.pt(26, 2 + y0, c("piedra", 6)); L.pt(28, 1 + y0, c("piedra", 5)); L.pt(27, 2 + y0, c("teja", 3))
    # brazos: el cercano sostiene el arco
    L.r(27, 7 + y0, 2, 8, piel[2])
    L.r(36, 7 + y0, 2, 8, piel[1]); L.r(36, 7 + y0, 1, 8, piel[0]); L.r(37, 14 + y0, 2, 2, piel[1])
    # arco de madera con cuerda
    for k in range(18):
        t = k / 17.0
        xx = 40 + int(round(3.0 * np.sin(np.pi * t)))
        L.pt(xx, 4 + k + y0, c("madera", 3) if k % 3 else c("madera", 4))
    L.linea(40, 4 + y0, 40, 21 + y0, c("piedra", 4))
    # cabeza barbuda con laurel
    L.r(30, 0 + y0, 6, 6, piel[1]); L.r(30, 1 + y0, 1, 4, piel[0]); L.r(35, 1 + y0, 1, 5, piel[2])
    L.r(30, 0 + y0, 6, 1, crin[0]); L.r(30, 1 + y0, 6, 1, crin[1]); L.pt(30, 2 + y0, crin[0]); L.pt(35, 1 + y0, crin[2])
    L.pt(32, 3 + y0, TINTA); L.pt(34, 3 + y0, TINTA); L.pt(36, 3 + y0, piel[0])
    L.r(31, 4 + y0, 5, 2, crin[0]); L.pt(33, 4 + y0, piel[2]); L.pt(31, 6 + y0, crin[1]); L.pt(33, 6 + y0, crin[1])
    L.r(30, 0 + y0, 6, 1, c("hierba", 3)); L.pt(32, 0 + y0, c("hierba", 5)); L.pt(35, 0 + y0, c("hierba", 2))
    # crin del cuello que cae
    L.r(28, 6 + y0, 2, 8, crin[0]); L.pt(28, 14 + y0, crin[2])
    return _spr(L, 22, 34, voltear=voltear)


# =============================================================== SÁTIRO
def satiro(frame=0, pose="idle", voltear=False):
    """Sátiro de 16x24 tocando la siringa. 2 fotogramas al tocar, 6 al caminar."""
    L = LG(18, 24)
    if pose == "idle" or pose == "tocar":
        bob = frame % 2
        pb = fx = 0
    else:
        ciclo = [(0, -1, 1), (1, 0, 0), (0, 1, -1), (-1, 0, 0), (0, -1, 1), (1, 0, 0)]
        bob, pb, fx = ciclo[frame % 6]
    pelaje = (c("madera", 3), c("madera", 2), c("madera", 1))
    piel = (c("piel", 1), c("piel", 2), c("piel", 3))
    y0 = 3 + bob
    ras = c("hierba", 4)

    # patas de cabra (digitígradas)
    def pata(x, dx, claro):
        a = pelaje[1] if claro else pelaje[2]
        b = pelaje[0] if claro else pelaje[1]
        L.r(x, 14 + y0, 3, 4, a); L.pt(x, 14 + y0, b); L.pt(x, 15 + y0, b)
        L.r(x - 1 + dx, 18 + y0, 2, 2, a)                       # corvejón hacia atrás
        L.r(x + dx, 20 + y0, 2, 2, a); L.pt(x + dx, 20 + y0, b)
        L.r(x + dx, 22 + y0 - bob, 3, 1, c("madera", 0)); L.pt(x + dx, 22 + y0 - bob, c("madera", 1))
    pata(5, pb, False)
    pata(8, fx, True)
    # taparrabos de hojas de parra
    L.r(5, 12 + y0, 6, 3, c("hierba", 3)); L.r(5, 12 + y0, 1, 3, c("hierba", 4)); L.r(10, 12 + y0, 1, 3, c("hierba", 2))
    L.pt(7, 14 + y0, c("hierba", 5)); L.pt(9, 14 + y0, c("hierba", 1))
    # torso desnudo
    L.r(5, 6 + y0, 6, 7, piel[1]); L.r(5, 6 + y0, 1, 7, piel[0]); L.r(10, 6 + y0, 1, 7, piel[2])
    L.pt(7, 8 + y0, piel[2]); L.pt(8, 8 + y0, piel[2]); L.pt(8, 10 + y0, piel[2]); L.r(5, 12 + y0, 6, 1, c("madera", 3))
    # brazos que sostienen la siringa
    L.r(3, 7 + y0, 2, 5, piel[1]); L.r(11, 8 + y0, 2, 4, piel[2])
    # siringa: tubos de caña a la boca
    for k, (alt) in enumerate((4, 3, 3, 2, 2)):
        L.r(8 + k, 5 + y0 + (5 - alt) // 1 - 0, 1, alt, c("tierra", 4 if k % 2 else 3))
    L.r(8, 8 + y0, 5, 1, c("madera", 3))
    # cabeza con orejas puntiagudas, cuernitos y barbita
    L.r(5, 1 + y0, 6, 6, piel[1]); L.r(5, 2 + y0, 1, 4, piel[0]); L.r(10, 2 + y0, 1, 4, piel[2])
    L.pt(7, 4 + y0, TINTA); L.pt(9, 4 + y0, TINTA); L.pt(11, 4 + y0, piel[0])
    L.pt(8, 6 + y0, piel[2])
    L.r(5, 0 + y0, 6, 2, c("madera", 0)); L.pt(6, 0 + y0, c("madera", 1)); L.pt(9, 0 + y0, c("madera", 2))
    L.pt(4, 3 + y0, piel[1]); L.pt(3, 2 + y0, piel[1]); L.pt(11, 3 + y0, piel[2]); L.pt(12, 2 + y0, piel[2])
    L.pt(6, 0 + y0, c("piedra", 6)); L.pt(10, 0 + y0, c("piedra", 5))
    L.pt(8, 7 + y0, c("madera", 0))
    # corona de hiedra
    L.r(5, 1 + y0, 6, 1, ras); L.pt(7, 1 + y0, c("hierba", 6)); L.pt(10, 2 + y0, c("hierba", 2))
    return _spr(L, 7, 22, voltear=voltear)


CRIATURAS = {"minotauro": minotauro, "centauro": centauro, "satiro": satiro}
