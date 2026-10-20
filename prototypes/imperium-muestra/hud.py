"""Interfaz de IMPERIUM en pixel art (960x540), con textos en español.

Barra de recursos (con ingreso por día), objetivos, minimapa, panel del edificio en construcción,
botones de velocidad y una placa flotante sobre el templo."""
import numpy as np
from paleta import c, TRANSP, TINTA, PALETA_RGB
from util import LUT, _POS
import fuente as FU

NAVY = c("agua", 0)
NAVY2 = c("agua", 1)
BORDE = c("tierra", 3)
BORDE_L = c("tierra", 5)
ORO1, ORO2, ORO0 = c("oro", 1), c("oro", 2), c("oro", 0)
BLANCO = c("piedra", 6)
GRIS = c("piedra", 3)
GRIS_C = c("piedra", 4)
VERDE = c("hierba", 5)
VERDE_O = c("hierba", 3)
OSC = c("agua", 0)


def r(img, x, y, w, h, col):
    x0, y0 = max(0, int(x)), max(0, int(y))
    x1, y1 = min(img.shape[1], int(x + w)), min(img.shape[0], int(y + h))
    if x1 > x0 and y1 > y0:
        img[y0:y1, x0:x1] = col


def pt(img, x, y, col):
    if 0 <= x < img.shape[1] and 0 <= y < img.shape[0]:
        img[int(y), int(x)] = col


def panel(img, x, y, w, h, cabecera=False):
    """Panel azul noche con filete dorado y esquinas."""
    r(img, x, y, w, h, NAVY)
    r(img, x + 1, y + 1, w - 2, 1, NAVY2)
    r(img, x + 1, y + h - 2, w - 2, 1, c("agua", 0))
    # marco dorado
    r(img, x, y, w, 1, BORDE); r(img, x, y + h - 1, w, 1, BORDE)
    r(img, x, y, 1, h, BORDE); r(img, x + w - 1, y, 1, h, BORDE)
    r(img, x + 1, y + 1, w - 2, 1, ORO0) if False else None
    # esquinas
    for (cx, cy) in ((x, y), (x + w - 1, y), (x, y + h - 1), (x + w - 1, y + h - 1)):
        pt(img, cx, cy, ORO2)
        pt(img, cx + (1 if cx == x else -1), cy, ORO1)
        pt(img, cx, cy + (1 if cy == y else -1), ORO1)
    if cabecera:
        r(img, x + 2, y + 12, w - 4, 1, NAVY2)


def circulo(img, cx, cy, rad, col, ry=None):
    ry = rad if ry is None else ry
    for yy in range(int(cy - ry - 1), int(cy + ry + 2)):
        for xx in range(int(cx - rad - 1), int(cx + rad + 2)):
            if ((xx + 0.5 - cx) / rad) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1:
                pt(img, xx, yy, col)


# ---------------------------------------------------------------- iconos 12x12
def icono(img, kind, x, y):
    if kind == "oro":
        circulo(img, x + 6, y + 6, 5.5, ORO0)
        circulo(img, x + 5.6, y + 5.6, 4.7, ORO1)
        circulo(img, x + 5.2, y + 5.2, 3.3, ORO2)
        r(img, x + 5, y + 3, 1, 5, ORO0)
        pt(img, x + 3, y + 2, BLANCO)
    elif kind == "madera":
        for (cx, cy) in ((4, 8), (9, 8), (6.5, 4)):
            circulo(img, x + cx, y + cy, 3.1, c("madera", 1))
            circulo(img, x + cx, y + cy, 2.4, c("madera", 3))
            circulo(img, x + cx, y + cy, 1.1, c("madera", 4))
            pt(img, x + cx, y + cy, c("madera", 2))
    elif kind == "piedra":
        r(img, x + 1, y + 5, 6, 5, c("piedra", 3)); r(img, x + 1, y + 5, 6, 1, c("piedra", 5)); r(img, x + 6, y + 6, 1, 4, c("piedra", 1))
        r(img, x + 5, y + 2, 6, 5, c("piedra", 4)); r(img, x + 5, y + 2, 6, 1, BLANCO); r(img, x + 10, y + 3, 1, 4, c("piedra", 2))
        r(img, x + 6, y + 8, 5, 3, c("piedra", 2)); r(img, x + 6, y + 8, 5, 1, c("piedra", 4))
    elif kind == "comida":
        r(img, x + 6, y + 3, 1, 9, c("hierba", 3))
        for k in range(4):
            pt(img, x + 4, y + 2 + k * 2, ORO2); pt(img, x + 5, y + 3 + k * 2, ORO1)
            pt(img, x + 8, y + 2 + k * 2, ORO2); pt(img, x + 7, y + 3 + k * 2, ORO1)
        pt(img, x + 6, y + 1, ORO2); pt(img, x + 6, y + 2, ORO1)
    elif kind == "poblacion":
        for (cx, col) in ((4, c("piel", 1)), (8, c("piel", 0))):
            circulo(img, x + cx, y + 3.5, 2.1, col)
            r(img, x + cx - 2, y + 6, 5, 5, c("azul", 1) if cx == 4 else c("carmesi", 1))
            r(img, x + cx - 2, y + 6, 1, 5, c("azul", 2) if cx == 4 else c("carmesi", 2))
    elif kind == "laurel":
        for k in range(5):
            pt(img, x + 1 + k, y + 8 - k, VERDE); pt(img, x + 2 + k, y + 8 - k, VERDE_O)
            pt(img, x + 10 - k, y + 8 - k, VERDE); pt(img, x + 9 - k, y + 8 - k, VERDE_O)
    elif kind == "pausa":
        r(img, x + 3, y + 2, 2, 8, BLANCO); r(img, x + 7, y + 2, 2, 8, BLANCO)
    elif kind == "play":
        for k in range(8):
            r(img, x + 3 + k // 2, y + 2 + k, 1, 1, BLANCO) if False else None
        for yy in range(8):
            w = min(yy, 7 - yy) + 1
            r(img, x + 3, y + 2 + yy, w, 1, BLANCO)
    elif kind == "rapido":
        for off in (0, 4):
            for yy in range(8):
                w = min(yy, 7 - yy) // 2 + 1
                r(img, x + 1 + off, y + 2 + yy, w, 1, BLANCO)
    elif kind == "engranaje":
        circulo(img, x + 6, y + 6, 4.2, GRIS_C)
        circulo(img, x + 6, y + 6, 1.8, NAVY)
        for (dx, dy) in ((0, -5), (0, 5), (-5, 0), (5, 0), (-3, -3), (3, -3), (-3, 3), (3, 3)):
            r(img, x + 6 + dx - 1, y + 6 + dy - 1, 2, 2, GRIS_C)
    elif kind == "menu":
        for k in range(3):
            r(img, x + 2, y + 2 + k * 3, 8, 1, GRIS_C)
    elif kind == "templo":
        r(img, x, y + 11, 12, 1, c("piedra", 5)); r(img, x + 1, y + 10, 10, 1, c("piedra", 4))
        for k in range(5):
            r(img, x + 2 + k * 2, y + 5, 1, 5, c("piedra", 6))
        r(img, x + 1, y + 4, 10, 1, c("piedra", 5))
        for k in range(5):
            r(img, x + 1 + k, y + 3 - k // 2 * 0, 1, 1, c("piedra", 6)) if False else None
        for yy in range(3):
            r(img, x + 1 + yy, y + 3 - yy, 10 - 2 * yy, 1, c("teja", 3))


def texto(img, x, y, s, col, sombra=OSC):
    return FU.texto(img, x, y, s, col, sombra)


def derecha(img, xr, y, s, col, sombra=OSC):
    FU.texto(img, xr - FU.ancho(s), y, s, col, sombra)


# ---------------------------------------------------------------- barra superior
def barra_superior(img, f):
    W = img.shape[1]
    r(img, 0, 0, W, 25, NAVY)
    r(img, 0, 1, W, 1, NAVY2)
    r(img, 0, 24, W, 1, BORDE)
    r(img, 0, 25, W, 1, ORO0)
    # logotipo con laureles
    FU.logo(img, 18, 7, "IMPERIUM", ORO2, ORO1, ORO0, TINTA)
    icono(img, "laurel", 4, 7)
    for k in range(5):
        pt(img, 4, 7 + k, VERDE) if False else None
    texto(img, 18, 18, "CONSTRUYE · GOBIERNA · EXPANDE", c("piedra", 3), OSC) if False else None
    # recursos
    recursos = [("oro", "12.483", "+320/DÍA"), ("madera", "8.942", "+210/DÍA"), ("piedra", "6.721", "+180/DÍA"),
                ("comida", "4.306", "+150/DÍA"), ("poblacion", "5.230", "+98/DÍA")]
    x0 = 190
    for i, (k, v, ing) in enumerate(recursos):
        x = x0 + i * 118
        r(img, x - 6, 4, 1, 17, NAVY2)
        icono(img, k, x, 6)
        texto(img, x + 17, 5, v, BLANCO)
        texto(img, x + 17, 13, ing, VERDE if k != "madera" else c("hierba", 4))
    # fecha y velocidad
    r(img, 790, 4, 1, 17, NAVY2)
    texto(img, 800, 9, "AÑO 127 A.C.", c("tierra", 5))
    pulsos = [("pausa", False), ("play", True), ("rapido", False)]
    for i, (k, act) in enumerate(pulsos):
        bx = 880 + i * 18
        r(img, bx, 5, 15, 15, NAVY2 if not act else c("agua", 2))
        r(img, bx, 5, 15, 1, BORDE) if act else None
        icono(img, k, bx + 1, 6)
    icono(img, "engranaje", 940, 6)
    r(img, 937, 4, 1, 17, NAVY2)


# ---------------------------------------------------------------- objetivos
def objetivos(img):
    x, y, w, h = 8, 33, 196, 62
    panel(img, x, y, w, h, True)
    pt(img, x + 6, y + 6, ORO2); pt(img, x + 5, y + 6, ORO1); pt(img, x + 7, y + 6, ORO1); pt(img, x + 6, y + 5, ORO1); pt(img, x + 6, y + 7, ORO1)
    texto(img, x + 13, y + 4, "OBJETIVOS", c("piedra", 6))
    lineas = [("CONSTRUYE UN TEMPLO", "0/1", False), ("ALCANZA 5.000 HAB.", "5.230/5.000", False),
              ("EXPORTA 500 MÁRMOL", "230/500", False), ("CONSTRUYE UN PUERTO", "1/1", True)]
    for i, (t, n, ok) in enumerate(lineas):
        yy = y + 16 + i * 11
        col = VERDE if ok else ORO2
        # rombo
        pt(img, x + 8, yy + 2, col); pt(img, x + 7, yy + 3, col); pt(img, x + 9, yy + 3, col); pt(img, x + 8, yy + 4, col)
        pt(img, x + 8, yy + 3, ORO1 if not ok else VERDE_O)
        texto(img, x + 14, yy, t, BLANCO if not ok else c("piedra", 4))
        derecha(img, x + w - 6, yy, n, c("tierra", 5) if not ok else VERDE)


# ---------------------------------------------------------------- minimapa
def minimapa(img, base, f):
    """Minimapa construido desde la propia escena (cada celda = bloque de píxeles)."""
    x, y, w, h = 8, 436, 134, 96
    panel(img, x, y, w, h)
    iw, ih = w - 8, h - 8
    sx, sy = base.shape[1] / iw, base.shape[0] / ih
    r(img, x + 4, y + 4, iw, ih, c("agua", 1))
    for j in range(ih):
        for i in range(iw):
            x0, y0 = int(i * sx), int(j * sy)
            blk = base[y0:int(y0 + sy), x0:int(x0 + sx)]
            nomb = np.array([_POS.get(int(v), ("?", 0))[0] for v in np.unique(blk)])
            ramps = [_POS.get(int(v), ("?", 0))[0] for v in blk.ravel()[:: max(1, blk.size // 12)]]
            def cuenta(n):
                return sum(1 for q in ramps if q == n)
            if cuenta("teja") >= 2:
                col = c("teja", 3)
            elif cuenta("piedra") >= 5 or cuenta("roca") >= 5:
                col = c("piedra", 4)
            elif cuenta("agua") >= len(ramps) * 0.6:
                col = c("agua", 2) if cuenta("agua") > 0 else c("agua", 1)
            elif cuenta("tierra") >= len(ramps) * 0.5:
                col = c("tierra", 4)
            else:
                col = c("hierba", 3) if cuenta("hierba") else c("hierba", 2)
            pt(img, x + 4 + i, y + 4 + j, col)
    # recuadro de la vista actual
    for k in range(iw - 10):
        pt(img, x + 9 + k, y + 9, BLANCO); pt(img, x + 9 + k, y + ih - 6, BLANCO)
    for k in range(ih - 14):
        pt(img, x + 9, y + 9 + k, BLANCO); pt(img, x + iw - 2, y + 9 + k, BLANCO)
    texto(img, x + w - 12, y + 6, "N", c("tierra", 5))
    for k in range(3):
        pt(img, x + w - 9, y + 13 + k, c("tierra", 5)) if False else None


# ---------------------------------------------------------------- panel del edificio
def panel_edificio(img, f):
    W, H = img.shape[1], img.shape[0]
    x, y, w, h = W - 8 - 224, H - 8 - 76, 224, 76
    panel(img, x, y, w, h)
    # retrato del templo
    r(img, x + 6, y + 6, 54, 54, c("agua", 1))
    r(img, x + 6, y + 6, 54, 1, BORDE); r(img, x + 6, y + 59, 54, 1, BORDE)
    r(img, x + 6, y + 6, 1, 54, BORDE); r(img, x + 59, y + 6, 1, 54, BORDE)
    for yy in range(7, 59):
        t = (yy - 7) / 52.0
        r(img, x + 7, y + yy, 52, 1, c("agua", 3 if t < 0.5 else 4) if t < 0.62 else c("hierba", 3))
    # miniatura del templo (escalones, columnas, frontón y tejado)
    bx, by = x + 12, y + 14
    r(img, bx + 2, by + 34, 40, 3, c("piedra", 4)); r(img, bx + 4, by + 31, 36, 3, c("piedra", 5)); r(img, bx + 6, by + 28, 32, 3, c("piedra", 6))
    for k in range(6):
        r(img, bx + 8 + k * 6, by + 14, 3, 14, c("piedra", 6)); r(img, bx + 10 + k * 6, by + 14, 1, 14, c("piedra", 3))
    r(img, bx + 6, by + 11, 34, 3, c("piedra", 5))
    for yy in range(9):
        r(img, bx + 6 + yy * 2, by + 2 + yy - 0, 34 - yy * 4, 1, c("teja", 3 if yy % 2 else 4)) if False else None
    for yy in range(9):
        wd = 34 - yy * 3
        r(img, bx + 6 + (34 - wd) // 2, by + 11 - yy, max(2, wd), 1, c("piedra", 6 if yy == 8 else 5))
    for yy in range(4):
        r(img, bx + 6 + 4 + yy * 3, by + 2 + yy, 24 - yy * 6, 1, c("teja", 3)) if False else None
    texto(img, x + 66, y + 7, "TEMPLO DE JÚPITER", c("tierra", 5))
    texto(img, x + 66, y + 17, "EDIFICIO RELIGIOSO", c("piedra", 3))
    # barra de progreso al 42 %
    r(img, x + 66, y + 28, 120, 7, c("agua", 1))
    r(img, x + 66, y + 28, 120, 1, TINTA); r(img, x + 66, y + 34, 120, 1, TINTA)
    r(img, x + 66, y + 28, 1, 7, TINTA); r(img, x + 185, y + 28, 1, 7, TINTA)
    ancho = int(118 * 0.42)
    r(img, x + 67, y + 29, ancho, 5, c("hierba", 4)); r(img, x + 67, y + 29, ancho, 1, c("hierba", 6)); r(img, x + 67, y + 33, ancho, 1, c("hierba", 2))
    # brillo que avanza por la barra (animado)
    gx_ = x + 67 + int((f * 0.8) % (ancho + 12)) - 6
    r(img, gx_, y + 29, 3, 5, c("hierba", 6)) if x + 67 <= gx_ < x + 67 + ancho - 2 else None
    derecha(img, x + w - 6, y + 29, "42%", BLANCO)
    # costes
    for i, (k, v) in enumerate((("piedra", "150"), ("madera", "100"), ("oro", "50"))):
        cx = x + 66 + i * 46
        icono(img, k, cx, y + 40)
        texto(img, cx + 15, y + 44, v, BLANCO)
    texto(img, x + 66, y + 62, "EN CONSTRUCCIÓN…", c("tierra", 4))
    r(img, x + w - 24, y + 58, 16, 14, c("agua", 2)); icono(img, "pausa", x + w - 22, y + 58)


# ---------------------------------------------------------------- placa sobre el obra
def placa_obra(img, x, y, f):
    w = 92
    r(img, x - w // 2, y, w, 14, NAVY)
    r(img, x - w // 2, y, w, 1, BORDE); r(img, x - w // 2, y + 13, w, 1, BORDE)
    r(img, x - w // 2, y, 1, 14, BORDE); r(img, x - w // 2 + w - 1, y, 1, 14, BORDE)
    texto(img, x - w // 2 + 4, y + 2, "TEMPLO 42%", BLANCO)
    r(img, x - w // 2 + 4, y + 9, w - 8, 3, c("agua", 1))
    r(img, x - w // 2 + 4, y + 9, int((w - 8) * 0.42), 3, c("hierba", 4))
    # flechita
    for k in range(3):
        r(img, x - 2 + k, y + 14 + k, 5 - 2 * k, 1, BORDE)


def dibujar(img, e, base_estatica, f):
    barra_superior(img, f)
    objetivos(img)
    minimapa(img, base_estatica, f)
    panel_edificio(img, f)
    placa_obra(img, 448, 168, f)
    return img
