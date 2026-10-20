"""Criaturas mitológicas de IMPERIUM (v3): minotauro, centauro y sátiro.

Estilo compacto de píxel con contorno y 3-4 tonos por material (como los ciudadanos), pero con
más tamaño, silueta limpia y aire entre las formas: brazos separados del torso, cuernos curvos,
bronce apagado en vez de amarillo. Mirando abajo-derecha (se voltean).
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

    def filas(self, y0, filas, col_med, col_luz, col_som, luz=2, som=2):
        """Forma por filas [(x0, x1)], con luz a la izquierda y sombra a la derecha."""
        for k, (a, b) in enumerate(filas):
            y = y0 + k
            self.r(a, y, b - a, 1, col_med)
            self.r(a, y, min(luz, b - a), 1, col_luz)
            self.r(max(a, b - som), y, min(som, b - a), 1, col_som)


def trazo(L, pts, g0, g1, cols, n=40):
    """Curva gruesa que se afina (cuernos). cols = (luz, medio, sombra, punta)."""
    pts = np.array(pts, float)
    for t in np.linspace(0, len(pts) - 1, n):
        i = min(int(t), len(pts) - 2)
        f = t - i
        x = pts[i, 0] + (pts[i + 1, 0] - pts[i, 0]) * f
        y = pts[i, 1] + (pts[i + 1, 1] - pts[i, 1]) * f
        g = g0 + (g1 - g0) * (t / (len(pts) - 1))
        gi = max(1, int(round(g)))
        for dx in range(gi):
            for dy in range(gi):
                col = cols[0] if (dx == 0 and dy == 0) else (cols[2] if (dx == gi - 1 and dy == gi - 1 and gi > 1) else cols[1])
                if t / (len(pts) - 1) > 0.88:
                    col = cols[3]
                L.pt(x + dx - gi // 2, y + dy - gi // 2, col)


def media_luna(L, cx, cy, R, hacia, ley):
    """Hoja de hacha en media luna (acero con filo claro). hacia = -1 izquierda, +1 derecha."""
    yy, xx = np.mgrid[0:L.h, 0:L.w]
    ext = ((xx - cx) ** 2 + ((yy - cy) * 0.85) ** 2) <= R * R
    interior = ((xx - (cx - hacia * R * 0.7)) ** 2 + ((yy - cy) * 0.85) ** 2) <= (R * 0.78) ** 2
    m = ext & ~interior
    for y, x in zip(*np.nonzero(m)):
        d = np.hypot(x - cx, (y - cy) * 0.85)
        if d > R - 1.5:
            col = ley[0]                      # filo
        elif y < cy - 1:
            col = ley[1]
        else:
            col = ley[2]
        L.pt(x, y, col)


def _spr(L: LG, ax, ay, voltear=False):
    s = Spr(L.w, L.h, ax, ay)
    s.px = L.p.copy()
    s.contorno(-3)
    return s.volteado() if voltear else s   # (no se recorta: así todos los fotogramas comparten ancla)


# paleta de materiales
F3, F2, F1, F0 = c("madera", 3), c("madera", 2), c("madera", 1), c("madera", 0)      # pelaje: luz..hondo
PIEL = (c("piel", 0), c("piel", 1), c("piel", 2), c("piel", 3))
MARF = (c("piedra", 6), c("piedra", 5), c("piedra", 4), c("piedra", 3))
BRZ = (c("tierra", 4), c("tierra", 3), c("oro", 0), c("madera", 1))                     # bronce apagado
ROJO = (c("carmesi", 2), c("carmesi", 1), c("carmesi", 0))
ACERO = (c("piedra", 5), c("piedra", 4), c("piedra", 3), c("piedra", 2))
CUERO = (c("madera", 4), c("madera", 3), c("madera", 2), c("madera", 1))


# =============================================================== SÁTIRO
def satiro(frame=0, pose="tocar", voltear=False):
    """Sátiro de 24x32 tocando la siringa. 'tocar': 2 fotogramas; 'caminar': 6."""
    L = LG(26, 34)
    if pose in ("tocar", "idle"):
        bob, d1, d2, lv = frame % 2, 0, 0, 0
    else:
        tabla = [(0, -2, 2, 0), (1, 0, 0, 1), (0, 2, -2, 0), (1, 0, 0, 1), (0, -2, 2, 0), (1, 0, 0, 1)]
        bob, d1, d2, lv = tabla[frame % 6]
    y0 = 5 + bob

    def pata(x, d, osc, lift):
        a, b, s = (F1, F2, F0) if osc else (F2, F3, F1)
        L.r(x, y0 + 14, 4, 4, a); L.r(x, y0 + 14, 1, 4, b); L.pt(x + 3, y0 + 15, s)
        L.r(x - 1 + d, y0 + 18, 3, 3, a); L.pt(x - 1 + d, y0 + 18, b)
        L.r(x + d, y0 + 21, 2, 3 - lift, a); L.pt(x + d, y0 + 21, b)
        L.r(x - 1 + d, y0 + 24 - lift, 4, 1, F0); L.pt(x - 1 + d, y0 + 24 - lift, F1)
    pata(9, d1, True, 0)
    pata(14, d2, False, lv)
    L.r(7, y0 + 15, 2, 2, F1)
    # taparrabos de hojas
    L.r(9, y0 + 11, 9, 5, c("hierba", 3)); L.r(9, y0 + 11, 2, 5, c("hierba", 4)); L.r(16, y0 + 11, 2, 5, c("hierba", 2))
    for xx in (11, 13, 15):
        L.pt(xx, y0 + 14, c("hierba", 1)); L.pt(xx, y0 + 15, c("hierba", 1))
    L.r(9, y0 + 11, 9, 1, CUERO[1])
    # torso
    L.r(9, y0 + 5, 9, 7, PIEL[1]); L.r(9, y0 + 5, 2, 7, PIEL[0]); L.r(16, y0 + 5, 2, 7, PIEL[2])
    L.pt(12, y0 + 8, PIEL[2]); L.pt(14, y0 + 8, PIEL[2]); L.r(12, y0 + 10, 3, 1, PIEL[2])
    # brazos hacia la boca
    L.r(6, y0 + 6, 3, 2, PIEL[1]); L.r(6, y0 + 4, 2, 3, PIEL[1]); L.pt(6, y0 + 6, PIEL[0])
    L.r(18, y0 + 6, 3, 2, PIEL[2]); L.r(19, y0 + 4, 2, 3, PIEL[2])
    # cabeza
    L.art(7, y0 - 3, [
        "..i....i...",
        "..Ii..iI...",
        "..hHhhHh...",
        ".ghHhHhHgh.",
        "jSSSSSSSSSk",
        ".SSeSSSeSS.",
        ".sSSSSSSSk.",
        "..sSSSSSk..",
        "...hSSSkh..",
    ], {"i": MARF[1], "I": MARF[0], "h": F0, "H": F1, "g": c("hierba", 4), "j": PIEL[1], "S": PIEL[1],
        "s": PIEL[0], "k": PIEL[2], "e": TINTA})
    L.pt(6, y0 + 1, PIEL[1]); L.pt(5, y0 + 1, PIEL[1]); L.pt(4, y0, PIEL[0])
    L.pt(17, y0 + 1, PIEL[2]); L.pt(18, y0 + 1, PIEL[2]); L.pt(19, y0, PIEL[1])
    L.pt(10, y0 - 1, c("hierba", 5)); L.pt(14, y0 - 2, c("hierba", 3))
    # siringa de cañas
    for k, alt in enumerate((3, 4, 5, 6, 7)):
        L.r(9 + k * 2, y0 + 4, 1, alt, c("tierra", 4 if k % 2 == 0 else 3))
        L.pt(9 + k * 2, y0 + 4, c("tierra", 5))
    L.r(9, y0 + 6, 9, 1, CUERO[1])
    return _spr(L, 12, 29, voltear)


# =============================================================== CENTAURO
def centauro(frame=0, pose="idle", voltear=False):
    """Centauro arquero de 64x56. Galope de 4 fotogramas."""
    L = LG(70, 70)
    fases = [(5, 0, -5, 0, 0), (2, 4, -2, 3, -1), (-4, 0, 4, 0, 0), (0, 5, 0, 4, 1)]
    if pose == "idle":
        fd, fa, td, ta, bob = (1, 0, -1, 0, 0)
    else:
        fd, fa, td, ta, bob = fases[frame % 4]
    y0 = 11 + bob
    cast = (c("madera", 4), c("madera", 3), c("madera", 2), c("madera", 1))
    crin = (c("madera", 1), c("madera", 0), TINTA)

    def pata(x, d, alt, claro):
        col = cast[1] if claro else cast[2]
        luz = cast[0] if claro else cast[1]
        som = cast[2] if claro else cast[3]
        L.r(x, y0 + 32, 6, 7, col); L.r(x, y0 + 32, 1, 7, luz); L.r(x + 5, y0 + 32, 1, 7, som)
        L.r(x + 1 + d // 2, y0 + 39, 4, 5, col); L.r(x + 1 + d // 2, y0 + 39, 1, 5, luz)
        L.r(x + 1 + d, y0 + 44 - alt, 3, 4, col); L.pt(x + 1 + d, y0 + 44 - alt, luz)
        L.r(x + d, y0 + 48 - alt, 5, 3, F0); L.pt(x + d, y0 + 48 - alt, F1); L.pt(x + d + 1, y0 + 48 - alt, F1)
    pata(44, fd, fa, False); pata(13, td, ta, False)
    pata(38, fd + 1, fa, True); pata(7, td - 1, ta, True)
    # cola al viento
    for k in range(14):
        L.pt(5 - (k // 4) - (1 if k % 3 == 0 else 0), y0 + 24 + k, crin[0] if k % 2 else crin[1])
        L.pt(6 - (k // 5), y0 + 25 + k, crin[1] if k % 2 else crin[0])
        if k > 6:
            L.pt(4 - (k // 3), y0 + 26 + k, crin[2])
    # cuerpo de caballo
    cuerpo = [(10, 47), (8, 50), (7, 52), (6, 53), (6, 53), (6, 53), (7, 52), (8, 50), (9, 48), (11, 45)]
    L.filas(y0 + 23, cuerpo, cast[1], cast[0], cast[3], luz=3, som=3)
    L.r(12, y0 + 23, 32, 2, cast[0])
    L.r(11, y0 + 30, 36, 3, cast[2])
    L.r(10, y0 + 32, 36, 1, cast[3])
    L.r(10, y0 + 25, 8, 6, cast[0]); L.r(9, y0 + 25, 1, 6, cast[1])
    L.r(40, y0 + 25, 11, 7, cast[1]); L.r(40, y0 + 25, 3, 6, cast[0])
    for (xx, yy) in ((26, 27), (27, 27), (28, 28), (22, 29)):
        L.pt(xx, y0 + yy, cast[2])
    # torso humano
    tx = 42
    L.filas(y0 + 10, [(tx, tx + 11), (tx - 1, tx + 12), (tx - 1, tx + 12), (tx, tx + 11), (tx + 1, tx + 10)] +
            [(tx + 1, tx + 10)] * 3 + [(tx + 2, tx + 9)] * 5 + [(tx + 2, tx + 10)] * 3,
            PIEL[1], PIEL[0], PIEL[2], luz=3, som=2)
    L.r(tx + 1, y0 + 12, 4, 3, PIEL[0]); L.r(tx + 6, y0 + 12, 4, 3, PIEL[1])
    L.r(tx + 2, y0 + 15, 7, 1, PIEL[2]); L.r(tx + 4, y0 + 18, 3, 1, PIEL[2]); L.r(tx + 5, y0 + 15, 1, 6, PIEL[2])
    L.r(tx + 2, y0 + 22, 9, 2, CUERO[1]); L.pt(tx + 5, y0 + 22, BRZ[0]); L.pt(tx + 6, y0 + 22, BRZ[1])
    # carcaj con flechas
    L.r(tx - 4, y0 + 7, 3, 12, CUERO[2]); L.r(tx - 4, y0 + 7, 1, 12, CUERO[1])
    for xx in (tx - 4, tx - 2):
        L.pt(xx, y0 + 6, c("piedra", 5)); L.pt(xx, y0 + 5, c("carmesi", 2)); L.pt(xx, y0 + 4, c("carmesi", 1))
    # brazos
    L.r(tx + 10, y0 + 12, 9, 3, PIEL[1]); L.r(tx + 10, y0 + 12, 9, 1, PIEL[0]); L.r(tx + 18, y0 + 11, 3, 5, PIEL[0])
    L.r(tx - 2, y0 + 14, 3, 7, PIEL[2]); L.r(tx - 1, y0 + 20, 3, 3, PIEL[2])
    bx = tx + 21
    for k in range(24):
        xx = bx + int(round(3.0 * np.sin(np.pi * k / 23.0)))
        L.pt(xx, y0 + 3 + k, CUERO[0] if k % 3 else CUERO[2])
    L.linea(bx, y0 + 3, bx, y0 + 26, c("piedra", 4))
    # cabeza barbuda con melena y laurel
    L.art(tx - 1, y0 - 3, [
        "..gGg.gGg..",
        ".hhhhhhhhh.",
        "hHhSSSSSkhh",
        "hhSSeSSeSkh",
        ".hSSSSSSSSn",
        ".hhhSSSSkn.",
        "..hhhhSkh..",
        "...hhHhhh..",
        "....hhhh...",
    ], {"g": c("hierba", 3), "G": c("hierba", 5), "h": F1, "H": F2, "S": PIEL[1], "k": PIEL[2],
        "e": TINTA, "n": PIEL[0]})
    L.r(tx + 3, y0 + 6, 5, 4, PIEL[1])
    return _spr(L, 32, 63, voltear)


# =============================================================== MINOTAURO
def minotauro(frame=0, pose="idle", carga=False, voltear=False):
    """Minotauro guerrero de 52x66. Idle, 4 fotogramas al caminar, y variante cargando mármol."""
    L = LG(60, 76)
    ciclo = [(-3, 0, 3, 0, 0), (-1, 2, 1, 0, 1), (3, 0, -3, 0, 0), (1, 0, -1, 2, 1)]
    if pose == "idle":
        nx, nl, fx, fl, bob = 0, 0, 0, 0, 0
    else:
        nx, nl, fx, fl, bob = ciclo[frame % 4]
    y0 = 15 + bob
    fur = (F3, F2, F1, F0)

    def pata(x, d, lift, osc):
        a, b, s_ = (F1, F2, F0) if osc else (F2, F3, F1)
        L.r(x, y0 + 36, 7, 8, a); L.r(x, y0 + 36, 2, 8, b); L.r(x + 5, y0 + 36, 2, 8, s_)
        L.r(x + 1 + d // 2, y0 + 44, 5, 6, a); L.r(x + 1 + d // 2, y0 + 44, 1, 6, b)
        L.r(x + d, y0 + 50 - lift, 7, 3, F0); L.r(x + d, y0 + 50 - lift, 2, 1, F1)
        L.pt(x + 3 + d, y0 + 52 - lift, TINTA)
    pata(28, fx, fl, True)
    pata(17, nx, nl, False)
    # faldellín carmesí
    L.filas(y0 + 31, [(16, 40), (15, 41), (15, 41), (14, 42), (14, 42), (14, 42), (14, 42), (13, 43), (13, 43), (13, 43)],
            ROJO[1], ROJO[0], ROJO[2], luz=3, som=3)
    for xx in (19, 23, 27, 31, 35, 39):
        L.r(xx, y0 + 33, 1, 8, ROJO[2])
    L.r(13, y0 + 40, 30, 1, BRZ[2])
    for xx in range(14, 42, 3):
        L.pt(xx, y0 + 40, BRZ[0])
    L.r(16, y0 + 30, 24, 3, CUERO[1]); L.r(16, y0 + 30, 24, 1, CUERO[0]); L.r(25, y0 + 30, 5, 3, BRZ[1]); L.pt(27, y0 + 31, F0)
    # torso
    filas = [(14, 42), (13, 43), (13, 43), (14, 42), (15, 41), (16, 40), (17, 39), (18, 38), (19, 37), (19, 37), (19, 37), (19, 37)]
    L.filas(y0 + 18, filas, fur[1], fur[0], fur[2], luz=3, som=3)
    L.r(18, y0 + 20, 8, 5, fur[0]); L.r(28, y0 + 21, 8, 5, fur[1])
    L.r(18, y0 + 25, 18, 1, fur[2]); L.r(27, y0 + 20, 1, 6, fur[2]); L.r(27, y0 + 26, 1, 4, fur[2])
    for (xx, yy) in ((22, 27), (30, 27), (22, 29), (30, 29)):
        L.r(xx - 2, y0 + yy, 3, 1, fur[2])
    for (xx, yy) in ((20, 22), (32, 23), (24, 23), (30, 24)):
        L.pt(xx, y0 + yy, fur[3])
    # hombreras de bronce
    L.r(11, y0 + 17, 7, 4, BRZ[1]); L.r(11, y0 + 17, 7, 1, BRZ[0]); L.r(11, y0 + 20, 7, 1, BRZ[2])
    L.r(38, y0 + 17, 6, 4, BRZ[2]); L.r(38, y0 + 17, 6, 1, BRZ[1])
    # brazo lejano
    L.r(42, y0 + 21, 5, 9, F1); L.r(42, y0 + 21, 1, 9, F2)
    L.r(42, y0 + 29, 5, 3, BRZ[2]); L.r(42, y0 + 32, 5, 4, F0); L.r(42, y0 + 32, 2, 4, F1)
    if not carga:
        # brazo cercano y labrys
        L.r(6, y0 + 21, 6, 9, fur[1]); L.r(6, y0 + 21, 2, 9, fur[0]); L.r(10, y0 + 21, 2, 9, fur[2])
        L.r(6, y0 + 29, 6, 3, BRZ[1]); L.r(6, y0 + 29, 6, 1, BRZ[0])
        L.r(5, y0 + 32, 7, 5, fur[2]); L.r(5, y0 + 32, 3, 5, fur[1])
        L.r(8, y0 + 2, 2, 56, CUERO[2]); L.r(8, y0 + 2, 1, 56, CUERO[1])
        for yy in range(y0 + 8, y0 + 56, 9):
            L.pt(9, yy, CUERO[3])
        media_luna(L, 4, y0 + 9, 8, -1, (c("piedra", 6), c("piedra", 4), c("piedra", 2)))
        # punta de lanza en lo alto del mango
        L.art(7, y0 - 4, [".ii.", "iIIz", "iIIz", ".iz.", ".iz."], {"i": c("piedra", 6), "I": c("piedra", 4), "z": c("piedra", 2)})
        L.r(7, y0 + 6, 4, 6, BRZ[1]); L.r(7, y0 + 6, 4, 1, BRZ[0]); L.pt(8, y0 + 8, BRZ[2])
    else:
        # bloque de mármol en brazos, delante del vientre
        L.art(15, y0 + 28, [
            "....iiiiiiiiii....",
            "..iiIIIIIIIIIIii..",
            "iiIIIIIIIIIIIIIIii",
            "sIIIIIIIIIIIIIIIIz",
            "ssIIIIIIIIIIIIIzzz",
            "ssssIIIIIIIIIzzzzz",
            "sssssssIIIzzzzzzzz",
            "sssssssszzzzzzzzzz",
            "ssssssssszzzzzzzzz",
            "szsssssssszzzzzzz.",
            ".zzssssssszzzzzz..",
            "...zzzzssszzzz....",
        ], {"i": c("piedra", 6), "I": c("piedra", 5), "s": c("piedra", 4), "z": c("piedra", 2)})
        L.r(6, y0 + 22, 6, 14, fur[1]); L.r(6, y0 + 22, 2, 14, fur[0])
        L.r(8, y0 + 36, 9, 5, fur[2]); L.r(40, y0 + 36, 7, 5, F1)
        L.r(6, y0 + 30, 6, 3, BRZ[1]); L.r(6, y0 + 30, 6, 1, BRZ[0])
    # cuello
    L.filas(y0 + 10, [(21, 38), (20, 39), (19, 40), (19, 40), (19, 40), (20, 39), (21, 38), (22, 37)], F2, F3, F1, luz=3, som=3)
    ley = {"h": F2, "l": F3, "H": F1, "d": F0, "n": c("tierra", 3), "N": c("tierra", 4), "m": c("tierra", 2),
           "e": c("carmesi", 2), "x": TINTA, "r": c("oro", 1), "p": c("teja", 4), "q": c("teja", 3)}
    cabeza = [
        "......llllllh.........",
        "....lllhhhhhhhh.......",
        "..qqhhhhhhhhhhhhh.....",
        ".qppdhhhhhhhhhhhhhh...",
        ".qpdHhhhhdddhhhhhhhNN.",
        "..dHHhhhhxxexhhhhhNNnN",
        "...HHhhhhhhhhhhhhNNNnn",
        "....HHhhhhhhhhhhnNNNnnx",
        ".....HHhhhhhhhdnnnNNnnm",
        "......HHHhdddddnnmmmmmr",
        "........dddHHHHdddmmmrr",
        "..........dddddHHd.xmr.",
    ]
    L.art(15, y0 - 2, cabeza, ley)
    # cuernos de marfil: curvas amplias que suben y se cierran
    cm = (c("piedra", 6), c("piedra", 5), c("piedra", 3), c("piedra", 6))
    trazo(L, [(20, y0 + 1), (17, y0 - 3), (16, y0 - 8), (18, y0 - 12)], 4, 1, cm)
    trazo(L, [(32, y0 - 2), (36, y0 - 5), (38, y0 - 10), (36, y0 - 14)], 4, 1, cm)
    return _spr(L, 25, 68, voltear)


CRIATURAS = {"minotauro": minotauro, "centauro": centauro, "satiro": satiro}
