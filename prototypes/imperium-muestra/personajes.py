"""Ciudadanos 16x24 de IMPERIUM: 5 oficios x 2 géneros, con ciclo de 6 fotogramas y poses de trabajo.

Vista 3/4 hacia abajo-derecha (se voltea para abajo-izquierda). De espaldas, la cara pasa a pelo.
Todo píxel a píxel con la paleta. Cada individuo puede variar piel, pelo y color de ropa.
"""
import numpy as np
from paleta import c, TRANSP, TINTA
from iso import Spr

W, H = 16, 24
Y0 = 3            # fila superior de la cabeza (sin rebote)

MARCHA = [
    (0, (-2, 0), (2, 0), 1),
    (1, (-1, 0), (1, 0), 0),
    (0, (0, -1), (0, 0), -1),
    (-1, (1, -2), (-1, 0), -1),
    (0, (2, 0), (-2, 0), 1),
    (1, (1, 0), (-1, 0), 0),
]

PIELES = {
    "claro": (c("piel", 0), c("piel", 1), c("piel", 2)),
    "tez": (c("piel", 1), c("piel", 2), c("piel", 3)),
    "oscuro": (c("piel", 2), c("piel", 3), c("madera", 1)),
}
PELOS = {
    "negro": (c("madera", 0), c("madera", 1), TINTA),
    "castano": (c("madera", 1), c("madera", 2), c("madera", 0)),
    "rubio": (c("tierra", 4), c("tierra", 5), c("tierra", 2)),
    "pelirrojo": (c("teja", 3), c("teja", 4), c("teja", 1)),
    "canoso": (c("piedra", 4), c("piedra", 5), c("piedra", 3)),
    "blanco": (c("piedra", 5), c("piedra", 6), c("piedra", 4)),
}


class Lienzo:
    def __init__(self):
        self.p = np.full((H, W), TRANSP, np.uint8)

    def pt(self, x, y, col):
        if col is not None and 0 <= x < W and 0 <= y < H:
            self.p[int(y), int(x)] = col

    def r(self, x, y, w, h, col):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.pt(xx, yy, col)

    def linea(self, x0, y0, x1, y1, col):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for k in range(n + 1):
            f = k / max(1, n)
            self.pt(round(x0 + (x1 - x0) * f), round(y0 + (y1 - y0) * f), col)

    def art(self, x, y, filas, leyenda):
        """Dibuja un motivo ASCII; '.' = no tocar."""
        for j, fila in enumerate(filas):
            for i, ch in enumerate(fila):
                if ch != "." and ch in leyenda:
                    self.pt(x + i, y + j, leyenda[ch])


def marcha(frame, pose):
    if pose in ("idle", "quieto"):
        return (0, (-1, 0), (1, 0), 0)
    if pose == "martillar":                    # el martillo sube y golpea
        return (0, (-1, 0), (1, 0), [-5, -3, 2, 3][frame % 4])
    if pose == "comerciar":                    # gesticula al ofrecer la mercancía
        return (0, (-1, 0), (1, 0), [0, -2, -1, 0][frame % 4])
    if pose == "cultivar":                     # azada: arriba, medio, abajo, medio
        return ([0, 0, 1, 1][frame % 4], (-1, 0), (1, 0), [-3, 0, 3, 1][frame % 4])
    return MARCHA[frame % 6]


# ----------------------------------------------------------------- cabeza y peinados
def cabeza(L, y, piel, espaldas=False, ojos=True, boca=True):
    """Cabeza 6x6 en x=5..10 con nariz, oreja y mejilla."""
    s0, s1, s2 = piel
    x = 5
    L.r(x + 1, y, 4, 6, s1)
    L.r(x, y + 1, 6, 4, s1)
    L.r(x, y + 1, 1, 4, s0)
    L.r(x + 1, y + 1, 1, 3, s0)
    L.r(x + 5, y + 1, 1, 4, s2)
    L.r(x + 4, y + 4, 1, 2, s2)
    L.r(x + 1, y + 5, 4, 1, s2)
    if not espaldas:
        L.pt(x + 2, y + 3, TINTA)
        L.pt(x + 4, y + 3, TINTA)
        L.pt(x + 6, y + 3, s0)            # nariz (perfil)
        L.pt(x + 6, y + 4, s1) if False else None
        if boca:
            L.pt(x + 4, y + 5, c("teja", 2) if s1 != PIELES["oscuro"][1] else c("teja", 1))
        L.pt(x + 1, y + 4, s0)
        L.pt(x, y + 3, s2)                # oreja


def pelo_corto(L, y, p, espaldas, rizado=False):
    L.r(6, y - 1, 4, 1, p[0])
    L.r(5, y, 6, 1, p[0])
    L.pt(6, y - 1, p[1]); L.pt(7, y - 1, p[1])
    L.pt(5, y + 1, p[0]); L.pt(5, y + 2, p[2])
    L.pt(10, y, p[2])
    L.pt(10, y + 1, p[2])
    if rizado:
        L.pt(8, y - 2, p[0]); L.pt(6, y - 2, p[1]); L.pt(10, y - 1, p[0])
    L.pt(7, y + 1, p[0]) if False else None
    L.pt(8, y + 1, p[0])
    if espaldas:
        L.r(5, y, 6, 5, p[0])
        L.r(6, y + 5, 4, 1, p[0])
        L.r(6, y + 1, 2, 2, p[1])
        L.r(9, y + 3, 2, 2, p[2])


def pelo_calvo(L, y, p, espaldas):
    L.pt(5, y + 1, p[2]); L.pt(10, y + 1, p[2])
    L.pt(5, y + 2, p[2])
    L.pt(7, y, c("piel", 0))              # brillo
    if espaldas:
        L.r(5, y + 3, 6, 2, p[0])


def pelo_largo(L, y, p, espaldas):
    """Melena a los hombros con raya."""
    L.r(6, y - 1, 4, 1, p[0])
    L.r(5, y, 6, 1, p[0])
    L.pt(6, y - 1, p[1]); L.pt(7, y - 1, p[1]); L.pt(8, y, p[1])
    L.r(4, y, 1, 9, p[0])
    L.r(5, y + 1, 1, 8, p[0])
    L.pt(4, y + 8, p[2]); L.pt(5, y + 8, p[2])
    L.r(4, y + 2, 1, 6, p[2])
    L.pt(10, y, p[2]); L.pt(10, y + 1, p[2])
    L.r(11, y + 1, 1, 6, p[2])             # mechón delantero
    L.pt(11, y + 7, p[0])
    if espaldas:
        L.r(4, y, 8, 9, p[0])
        L.r(6, y + 1, 3, 4, p[1])
        L.r(10, y + 2, 2, 6, p[2])


def pelo_mono(L, y, p, espaldas, lazo=None):
    pelo_corto(L, y, p, espaldas)
    L.r(3, y - 1, 3, 3, p[0])
    L.pt(3, y - 1, None)
    L.pt(4, y - 1, p[1])
    L.pt(3, y + 1, p[2]); L.pt(4, y + 1, p[2])
    if lazo is not None:
        L.pt(5, y + 1, lazo)
    L.r(5, y + 3, 1, 3, p[0])
    L.pt(5, y + 5, p[2])


def pelo_trenza(L, y, p, espaldas):
    pelo_corto(L, y, p, espaldas)
    for k in range(8):
        L.pt(4, y + 2 + k, p[1] if k % 2 else p[0])
    L.pt(4, y + 10, c("oro", 2))


def velo(L, y, tela, espaldas, p=None):
    """Velo/chal sobre la cabeza que cae a los hombros."""
    L.r(5, y - 1, 6, 2, tela[1])
    L.r(4, y, 1, 9, tela[1])
    L.r(5, y + 1, 1, 7, tela[0])
    L.r(4, y + 2, 1, 6, tela[2])
    L.r(10, y, 1, 3, tela[2]); L.pt(11, y + 1, tela[2]); L.r(11, y + 2, 1, 6, tela[2])
    L.pt(6, y - 2, tela[0]); L.pt(7, y - 2, tela[0]); L.pt(8, y - 1, tela[0])
    L.pt(4, y + 8, tela[2])
    if p is not None:
        L.pt(6, y + 1, p[0]); L.pt(7, y + 1, p[0]) if False else None
    if espaldas:
        L.r(4, y - 1, 8, 10, tela[1])
        L.r(4, y + 3, 3, 6, tela[2])


def panuelo(L, y, tela, p, espaldas):
    """Pañuelo atado detrás (campesina)."""
    pelo_corto(L, y, p, espaldas)
    L.r(5, y - 1, 6, 2, tela[1])
    L.r(6, y - 2, 4, 1, tela[0])
    L.pt(5, y + 1, tela[2])
    L.pt(4, y, tela[1]); L.pt(3, y + 1, tela[1]); L.pt(4, y + 1, tela[2]); L.pt(3, y + 2, tela[2])
    L.pt(8, y - 1, tela[2])
    L.r(5, y, 6, 1, tela[1]) if espaldas else None


def barba(L, y, col, larga=False):
    L.r(6, y + 4, 5, 2, col[0])
    L.pt(6, y + 3, col[2]) if False else None
    L.pt(10, y + 3, col[2])
    L.pt(7, y + 5, col[1])
    L.pt(9, y + 4, col[1])
    if larga:
        L.r(7, y + 6, 3, 2, col[0]); L.pt(8, y + 8, col[2]); L.pt(7, y + 7, col[1])
    L.pt(8, y + 4, col[2]) if False else None


def cejas(L, y, col):
    L.pt(7, y + 2, col)
    L.pt(9, y + 2, col)


# ----------------------------------------------------------------- tronco y piernas
def torso(L, y, tun, alto=8, ancho=6, x=5):
    L.r(x, y, ancho, alto, tun[1])
    L.r(x, y, 1, alto, tun[0])
    L.r(x + ancho - 1, y, 1, alto, tun[2])
    if ancho >= 6:
        L.r(x + ancho - 2, y + 1, 1, alto - 1, tun[2])


def cuello(L, y, tun, piel):
    L.r(7, y + 5, 2, 1, piel[1])
    L.pt(7, y + 6, piel[2]); L.pt(8, y + 6, piel[1])
    L.pt(6, y + 5, tun[0]); L.pt(9, y + 5, tun[2])


def brazo(L, x, y, manga, piel, largo=6, sombra=False, desnudo=0, brazalete=None):
    s0, s1, s2 = piel
    cm = manga[2] if sombra else manga[1]
    L.r(x, y, 2, largo - 1, cm)
    L.pt(x, y, manga[0] if not sombra else manga[1])
    if desnudo > 0:                       # antebrazo al aire
        L.r(x, y + largo - 1 - desnudo, 2, desnudo, s2 if sombra else s1)
        L.pt(x, y + largo - 1 - desnudo, s0 if not sombra else s1)
    L.r(x, y + largo - 1, 2, 1, s2 if sombra else s1)
    if brazalete is not None:
        L.pt(x, y + largo - 2, brazalete)


def pierna(L, x, dx, dy, pant, calz, claro=True, correa=None, corta=0):
    t0, t1, t2 = pant
    cuerpo = t1 if claro else t2
    luz = t0 if claro else t1
    L.r(x, 16, 2, 3, cuerpo)
    L.pt(x, 16, luz); L.pt(x, 17, luz)
    for yy in range(19, 21 + dy):
        L.r(x + dx, yy, 2, 1, cuerpo)
        L.pt(x + dx, yy, luz)
    if dx != 0:
        L.r(min(x, x + dx), 18, 2 + abs(dx), 1, cuerpo)
    fy = 21 + dy
    L.r(x + dx, fy, 3 if dx >= 0 else 2, 1, calz[0])
    if dx >= 0:
        L.pt(x + dx + 2, fy, calz[1])
    else:
        L.pt(x + dx, fy, calz[1])
    if correa is not None:                # sandalia con correas
        L.pt(x + dx, fy - 1, correa)
        L.pt(x + dx + 1, fy - 2, correa) if False else None


def piernas(L, mar, pant, calz, correa=None):
    (_, (bx, by), (fx, fy), _) = mar
    pierna(L, 5, bx, by, pant, calz, claro=False, correa=correa)
    pierna(L, 8, fx, fy, pant, calz, claro=True, correa=correa)


def falda(L, mar, y_cintura, y_dobladillo, col, borde=None, pies=None, ancho_base=8):
    """Falda/vestido en trapecio. Los pies asoman bajo el borde y siguen el paso."""
    (_, (bx, by), (fx, fy), _) = mar
    alto = y_dobladillo - y_cintura
    for k in range(alto):
        w = 6 + int(round((ancho_base - 6) * k / max(1, alto - 1)))
        x0 = 5 - (w - 6) // 2
        sw = 0
        if k >= alto - 2:
            sw = int(round((bx + fx) / 4.0)) * 0 + (1 if fx > 0 and k == alto - 1 else 0)
        L.r(x0, y_cintura + k, w, 1, col[1])
        L.pt(x0, y_cintura + k, col[0])
        L.r(x0 + w - 2, y_cintura + k, 2, 1, col[2])
        if k % 3 == 2 and w > 6:
            L.pt(x0 + w // 2, y_cintura + k, col[2])
    wb = 6 + (ancho_base - 6)
    x0 = 5 - (ancho_base - 6) // 2
    if borde is not None:
        L.r(x0, y_dobladillo - 1, wb, 1, borde[1])
        L.pt(x0, y_dobladillo - 1, borde[2])
        for xx in range(x0 + 1, x0 + wb, 2):
            L.pt(xx, y_dobladillo - 1, borde[0])
    if pies is not None:
        L.r(5 + bx // 2, y_dobladillo, 2, 1, pies)
        L.r(8 + fx // 2, y_dobladillo + (1 if False else 0), 2, 1, pies)


# ----------------------------------------------------------------- oficios
def _y(mar):
    return Y0 + mar[0]


def campesino(frame=0, pose="idle", espaldas=False, v=None, mujer=False):
    v = v or {}
    piel = PIELES[v.get("piel", "tez")]
    p = PELOS[v.get("pelo", "castano")]
    L = Lienzo()
    mar = marcha(frame, pose)
    bob, ba = mar[0], mar[3]
    y0 = Y0 + bob
    lino = (c("tierra", 6), c("tierra", 5), c("tierra", 3))
    if not mujer:
        chal = (c("hierba", 4), c("hierba", 3), c("hierba", 2))
        pant = (c("madera", 3), c("madera", 2), c("madera", 1))
        piernas(L, mar, pant, (piel[2], piel[2]), correa=c("madera", 1))
        L.r(5, 19, 2, 1, piel[1]) ; L.r(8, 19, 2, 1, piel[1])       # pantalón remangado
        brazo(L, 11, y0 + 6 - ba, lino, piel, 6, sombra=True, desnudo=2)
        torso(L, y0 + 5, lino, 8)
        L.r(5, y0 + 5, 6, 5, chal[1]); L.r(5, y0 + 5, 1, 5, chal[0]); L.r(10, y0 + 5, 1, 5, chal[2])
        L.pt(7, y0 + 5, lino[0]); L.pt(8, y0 + 5, lino[1]); L.r(7, y0 + 6, 1, 4, lino[1])
        L.r(5, y0 + 11, 6, 1, c("madera", 2)); L.pt(8, y0 + 11, c("oro", 1))   # cuerda con nudo
        L.r(6, y0 + 12, 4, 1, lino[1])
        cuello(L, y0, lino, piel)
        cabeza(L, y0, piel, espaldas)
        pelo_corto(L, y0, p, espaldas)
        cejas(L, y0, p[2]) if not espaldas else None
        ala = (c("tierra", 5), c("tierra", 4), c("tierra", 2))
        L.r(3, y0 - 1, 10, 2, ala[1]); L.r(3, y0 - 1, 10, 1, ala[0]); L.r(9, y0, 4, 1, ala[2])
        L.r(5, y0 - 3, 6, 2, ala[1]); L.r(5, y0 - 3, 6, 1, ala[0])
        L.r(5, y0 - 1, 6, 1, c("madera", 2))
        brazo(L, 3, y0 + 6 + ba, lino, piel, 6, desnudo=2)
        if pose == "cultivar":
            ty = y0 + 4 + (ba + 3) * 3                           # la punta baja hasta el suelo
            L.linea(12, y0 + 8, 14, ty, c("madera", 3))
            L.r(13, ty, 3, 2, c("roca", 3)); L.pt(15, ty + 1, c("roca", 1)); L.pt(13, ty, c("roca", 2))
        else:
            for k in range(0, 15):                       # azada al hombro
                L.pt(13 if k > 1 else 12, y0 + 1 + k, c("madera", 3) if k % 4 else c("madera", 2))
            L.r(12, y0 - 1, 3, 2, c("roca", 3)); L.pt(14, y0 + 1, c("roca", 1)); L.pt(12, y0, c("roca", 2))
    else:
        verde = (c("hierba", 4), c("hierba", 3), c("hierba", 2))
        tela = (c("teja", 4), c("teja", 3), c("teja", 1))
        falda(L, mar, y0 + 10, 20, verde, borde=None, pies=piel[2])
        # delantal crema
        L.r(5, y0 + 9, 6, 8, lino[1]); L.r(5, y0 + 9, 1, 8, lino[0]); L.r(10, y0 + 9, 1, 8, lino[2])
        L.r(5, y0 + 16, 6, 1, c("tierra", 3))
        brazo(L, 11, y0 + 6 - ba, lino, piel, 6, sombra=True, desnudo=2)
        torso(L, y0 + 5, lino, 5, ancho=6)
        L.r(5, y0 + 8, 6, 1, c("madera", 2))
        L.pt(8, y0 + 8, c("oro", 1))
        cuello(L, y0, lino, piel)
        cabeza(L, y0, piel, espaldas)
        panuelo(L, y0, tela, p, espaldas)
        cejas(L, y0, p[2]) if not espaldas else None
        brazo(L, 3, y0 + 6 + ba, lino, piel, 5, desnudo=2)
        # cesta de mimbre con espigas a la cadera
        L.r(1, y0 + 10 + ba, 4, 3, c("madera", 3)); L.r(1, y0 + 10 + ba, 4, 1, c("madera", 4))
        L.r(1, y0 + 12 + ba, 4, 1, c("madera", 2)); L.pt(2, y0 + 11 + ba, c("madera", 2)); L.pt(4, y0 + 11 + ba, c("madera", 2))
        for xx in (1, 3):
            L.pt(xx, y0 + 9 + ba, c("tierra", 5)); L.pt(xx, y0 + 8 + ba, c("tierra", 6))
        L.pt(2, y0 + 9 + ba, c("tierra", 4)); L.pt(4, y0 + 9 + ba, c("tierra", 5))
        for k in range(0, 13):                       # hoz
            pass
        L.r(13, y0 + 5, 1, 8, c("madera", 3))
        L.pt(14, y0 + 4, c("roca", 3)); L.pt(15, y0 + 5, c("roca", 3)); L.pt(15, y0 + 6, c("roca", 2))
        L.pt(14, y0 + 7, c("roca", 2))
    return L


def artesano(frame=0, pose="idle", espaldas=False, v=None, mujer=False):
    v = v or {}
    piel = PIELES[v.get("piel", "claro")]
    p = PELOS[v.get("pelo", "negro" if not mujer else "castano")]
    L = Lienzo()
    mar = marcha(frame, pose)
    bob, ba = mar[0], mar[3]
    y0 = Y0 + bob
    azul = (c("azul", 2), c("azul", 1), c("azul", 0))
    cu = (c("madera", 4), c("madera", 3), c("madera", 2))
    if not mujer:
        pant = (c("piedra", 4), c("piedra", 3), c("piedra", 2))
        piernas(L, mar, pant, (c("madera", 1), c("madera", 0)))
        L.r(5, 19, 2, 1, c("madera", 2)); L.r(8, 19, 2, 1, c("madera", 2))   # polainas
        brazo(L, 11, y0 + 6 - ba, azul, piel, 6, sombra=True, desnudo=3, brazalete=c("madera", 2))
        torso(L, y0 + 5, azul, 8)
        L.r(5, y0 + 8, 6, 7, cu[1]); L.r(5, y0 + 8, 1, 7, cu[0]); L.r(10, y0 + 8, 1, 7, cu[2])
        L.r(6, y0 + 6, 1, 2, cu[2]); L.r(9, y0 + 6, 1, 2, cu[2])
        L.r(7, y0 + 10, 2, 2, c("madera", 1)); L.pt(7, y0 + 10, c("roca", 3))
        L.r(5, y0 + 7, 6, 1, c("madera", 2))
        cuello(L, y0, azul, piel)
        cabeza(L, y0, piel, espaldas)
        pelo_corto(L, y0, p, espaldas)
        cejas(L, y0, p[2]) if not espaldas else None
        if not espaldas:
            barba(L, y0, (c("madera", 1), c("madera", 0), TINTA))
        L.r(5, y0 + 1, 6, 1, c("carmesi", 2)); L.pt(10, y0 + 1, c("carmesi", 1))
        brazo(L, 3, y0 + 6 + ba, azul, piel, 6, desnudo=3, brazalete=c("madera", 2))
        L.r(2, y0 + 9 + ba, 1, 5, c("madera", 3))                  # martillo
        L.r(0, y0 + 7 + ba, 5, 3, c("roca", 2)); L.r(0, y0 + 7 + ba, 5, 1, c("roca", 3)); L.pt(4, y0 + 9 + ba, c("roca", 1))
    else:
        tela = (c("azul", 2), c("azul", 1), c("azul", 0))
        falda(L, mar, y0 + 9, 21, azul, borde=(c("oro", 2), c("oro", 1), c("oro", 0)), pies=c("madera", 1))
        torso(L, y0 + 5, azul, 6, ancho=6)
        L.r(5, y0 + 8, 6, 8, cu[1]); L.r(5, y0 + 8, 1, 8, cu[0]); L.r(10, y0 + 8, 1, 8, cu[2])   # delantal
        L.r(6, y0 + 6, 1, 2, cu[2]); L.r(9, y0 + 6, 1, 2, cu[2])
        L.r(5, y0 + 8, 6, 1, c("madera", 2))
        L.pt(7, y0 + 11, c("tierra", 5)); L.pt(8, y0 + 11, c("tierra", 4))
        brazo(L, 11, y0 + 6 - ba, azul, piel, 6, sombra=True, desnudo=3)
        cuello(L, y0, azul, piel)
        cabeza(L, y0, piel, espaldas)
        pelo_mono(L, y0, p, espaldas, lazo=c("azul", 2))
        cejas(L, y0, p[2]) if not espaldas else None
        brazo(L, 3, y0 + 6 + ba, azul, piel, 6, desnudo=3)
        # ánfora de barro bajo el brazo (alfarera)
        L.r(0, y0 + 7 + ba, 4, 7, c("teja", 3)); L.r(0, y0 + 7 + ba, 1, 7, c("teja", 4)); L.r(3, y0 + 7 + ba, 1, 7, c("teja", 1))
        L.r(1, y0 + 6 + ba, 2, 1, c("teja", 2)); L.pt(0, y0 + 7 + ba, None); L.pt(0, y0 + 13 + ba, None)
        L.r(0, y0 + 10 + ba, 4, 1, c("tierra", 4))
    return L


def comerciante(frame=0, pose="idle", espaldas=False, v=None, mujer=False):
    v = v or {}
    piel = PIELES[v.get("piel", "tez" if not mujer else "claro")]
    p = PELOS[v.get("pelo", "canoso" if not mujer else "negro")]
    L = Lienzo()
    mar = marcha(frame, pose)
    bob, ba = mar[0], mar[3]
    y0 = Y0 + bob
    tur = (c("agua", 5), c("agua", 4), c("agua", 2))
    oro = (c("oro", 2), c("oro", 1), c("oro", 0))
    if not mujer:
        pant = (c("tierra", 3), c("tierra", 2), c("tierra", 1))
        piernas(L, mar, pant, (c("madera", 1), c("madera", 0)))
        brazo(L, 11, y0 + 6 - ba, tur, piel, 6, sombra=True)
        torso(L, y0 + 5, tur, 9, cinto=None) if False else torso(L, y0 + 5, tur, 9)
        L.r(5, y0 + 8, 6, 1, c("teja", 3)); L.pt(8, y0 + 8, oro[0])                # faja
        L.r(8, y0 + 5, 1, 3, tur[0]) if False else None
        L.r(5, y0 + 13, 6, 1, oro[1]); L.r(5, y0 + 13, 2, 1, oro[0])               # dobladillo dorado
        for xx in (6, 8, 10):
            L.pt(xx, y0 + 12, oro[1])
        cuello(L, y0, tur, piel)
        cabeza(L, y0, piel, espaldas)
        pelo_corto(L, y0, p, espaldas)
        cejas(L, y0, p[2]) if not espaldas else None
        if not espaldas:
            barba(L, y0, (c("piedra", 4), c("piedra", 3), c("piedra", 2)), larga=True)
        L.r(4, y0 - 1, 7, 2, c("carmesi", 1)); L.r(5, y0 - 2, 5, 1, c("carmesi", 2)); L.r(4, y0 - 1, 2, 1, c("carmesi", 2))
        L.pt(10, y0 - 2, oro[0]); L.pt(11, y0 - 1, oro[1])
        brazo(L, 3, y0 + 6 + ba, tur, piel, 6)
        L.r(10, y0 + 10, 3, 3, c("madera", 3)); L.pt(11, y0 + 10, oro[0]); L.r(10, y0 + 9, 3, 1, c("madera", 1))   # bolsa
        # tablilla de cera / balanza en la mano
        L.r(1, y0 + 11 + ba, 3, 4, c("madera", 4)); L.r(1, y0 + 11 + ba, 3, 1, c("tierra", 5)); L.pt(2, y0 + 13 + ba, c("madera", 2))
    else:
        falda(L, mar, y0 + 9, 21, tur, borde=oro, pies=c("madera", 1))
        torso(L, y0 + 5, tur, 6, ancho=6)
        L.r(5, y0 + 8, 6, 1, c("carmesi", 2)); L.pt(8, y0 + 8, oro[0])
        L.r(6, y0 + 5, 4, 1, oro[1]); L.pt(7, y0 + 6, oro[0]); L.pt(8, y0 + 6, oro[0])  # collar
        brazo(L, 11, y0 + 6 - ba, tur, piel, 6, sombra=True, brazalete=oro[0])
        cuello(L, y0, tur, piel)
        cabeza(L, y0, piel, espaldas)
        pelo_largo(L, y0, p, espaldas)
        cejas(L, y0, p[2]) if not espaldas else None
        # pañuelo carmesí con flecos de monedas
        L.r(5, y0 - 1, 6, 2, c("carmesi", 1)); L.r(6, y0 - 2, 4, 1, c("carmesi", 2))
        for xx in (5, 7, 9):
            L.pt(xx, y0 + 1, oro[0])
        L.pt(10, y0 - 1, c("carmesi", 0))
        brazo(L, 3, y0 + 6 + ba, tur, piel, 6, brazalete=oro[0])
        # cesta con mercancía (telas de colores)
        L.r(0, y0 + 10 + ba, 4, 4, c("tierra", 3)); L.r(0, y0 + 9 + ba, 4, 1, c("carmesi", 2))
        L.pt(1, y0 + 9 + ba, c("azul", 2)); L.pt(2, y0 + 8 + ba, c("oro", 2)); L.pt(3, y0 + 9 + ba, c("hierba", 3))
        L.r(0, y0 + 13 + ba, 4, 1, c("tierra", 2))
    return L


def soldado(frame=0, pose="idle", espaldas=False, v=None, mujer=False):
    v = v or {}
    piel = PIELES[v.get("piel", "claro")]
    p = PELOS[v.get("pelo", "castano" if not mujer else "pelirrojo")]
    L = Lienzo()
    mar = marcha(frame, pose)
    bob, ba = mar[0], mar[3]
    y0 = Y0 + bob
    tun = (c("carmesi", 2), c("carmesi", 1), c("carmesi", 0))
    bron = (c("oro", 2), c("oro", 1), c("oro", 0))
    pant = (piel[0], piel[1], piel[2])
    piernas(L, mar, pant, (c("madera", 1), c("madera", 0)), correa=c("madera", 2))
    L.r(5, 19, 2, 1, bron[1]); L.r(8, 19, 2, 1, bron[1]); L.r(5, 18, 1, 1, bron[2]); L.r(8, 18, 1, 1, bron[2])   # grebas
    brazo(L, 11, y0 + 6 - ba, tun, piel, 6, sombra=True, desnudo=2, brazalete=bron[1])
    torso(L, y0 + 5, tun, 7)
    L.r(5, y0 + 5, 6, 5, bron[1]); L.r(5, y0 + 5, 2, 5, bron[0]); L.r(9, y0 + 5, 2, 5, bron[2])
    L.pt(7, y0 + 7, bron[2]); L.pt(8, y0 + 8, bron[2])
    if mujer:
        L.pt(6, y0 + 7, bron[0]); L.pt(9, y0 + 7, bron[1])
    L.r(5, y0 + 10, 6, 1, c("madera", 3)); L.pt(8, y0 + 10, bron[0])
    L.r(5, y0 + 11, 6, 3, tun[1])
    for xx in (5, 7, 9):
        L.pt(xx, y0 + 12, tun[2]); L.pt(xx, y0 + 13, tun[2])
    L.r(5, y0 + 13, 6, 1, bron[1]) if False else None
    cuello(L, y0, tun, piel)
    cabeza(L, y0, piel, espaldas)
    pelo_corto(L, y0, p, espaldas)
    if mujer:
        for k in range(7):                           # trenza larga cayendo por delante
            L.pt(11, y0 + 4 + k, p[1] if k % 2 else p[0])
        L.pt(11, y0 + 11, c("oro", 2))
        L.pt(4, y0 + 3, p[0]); L.pt(4, y0 + 4, p[2])
    L.r(4, y0 - 1, 7, 4, bron[1]); L.r(4, y0 - 1, 2, 4, bron[0]); L.r(9, y0 - 1, 2, 4, bron[2])
    L.pt(4, y0 - 1, None); L.pt(10, y0 - 1, None)
    L.r(5, y0 - 3, 5, 2, c("carmesi", 2)); L.r(6, y0 - 4, 3, 1, c("carmesi", 2)); L.pt(9, y0 - 3, c("carmesi", 1))
    L.r(6, y0 - 1, 3, 1, bron[0])
    if not espaldas:
        L.r(7, y0 + 2, 1, 2, bron[1]); L.r(5, y0 + 3, 1, 2, bron[1]); L.r(10, y0 + 3, 1, 2, bron[2])
    L.r(13, y0 - 3, 1, 19, c("madera", 3)); L.r(13, y0 - 5, 1, 2, c("roca", 3)); L.pt(13, y0 - 6, c("piedra", 6))
    L.pt(13, y0 + 3, bron[1])
    # escudo redondo con umbo y borde
    r0 = 5 if not mujer else 4
    L.r(1, y0 + 6 + ba, 5, 7, c("carmesi", 1)); L.r(2, y0 + 5 + ba, 3, 9, c("carmesi", 1))
    L.r(1, y0 + 6 + ba, 1, 7, bron[1]); L.r(2, y0 + 5 + ba, 3, 1, bron[1]); L.r(2, y0 + 13 + ba, 3, 1, bron[0])
    L.r(3, y0 + 8 + ba, 1, 3, bron[0]); L.pt(2, y0 + 9 + ba, bron[0])
    return L


def sacerdote(frame=0, pose="idle", espaldas=False, v=None, mujer=False):
    v = v or {}
    piel = PIELES[v.get("piel", "claro")]
    L = Lienzo()
    mar = marcha(frame, pose)
    bob, ba = mar[0], mar[3]
    y0 = Y0 + bob
    tun = (c("piedra", 6), c("piedra", 5), c("piedra", 3))
    pur = (c("purpura", 2), c("purpura", 1), c("purpura", 0))
    oro = (c("oro", 2), c("oro", 1), c("oro", 0))
    if not mujer:
        p = PELOS[v.get("pelo", "blanco")]
        falda(L, mar, y0 + 12, 21, tun, borde=pur, pies=c("madera", 1), ancho_base=8)
        torso(L, y0 + 5, tun, 8)
        L.r(7, y0 + 5, 3, 15 - bob, pur[1]); L.r(7, y0 + 5, 1, 15 - bob, pur[0]); L.r(9, y0 + 5, 1, 15 - bob, pur[2])
        for yy in range(y0 + 8, 21, 3):
            L.pt(8, yy, oro[0])
        L.r(6, y0 + 5, 5, 1, oro[0])
        brazo(L, 11, y0 + 6 - ba, tun, piel, 6, sombra=True)
        cuello(L, y0, tun, piel)
        cabeza(L, y0, piel, espaldas)
        pelo_calvo(L, y0, p, espaldas)
        cejas(L, y0, p[0]) if not espaldas else None
        if not espaldas:
            barba(L, y0, (c("piedra", 6), c("piedra", 4), c("piedra", 3)), larga=True)
        L.r(5, y0, 6, 1, oro[1]); L.pt(5, y0, oro[0]); L.pt(10, y0, oro[2]); L.pt(7, y0 - 1, oro[0])
        brazo(L, 3, y0 + 6 + ba, tun, piel, 6)
        L.r(13, y0 + 1, 1, 20 - bob, c("madera", 3))                 # báculo
        L.r(12, y0, 3, 1, oro[0]); L.pt(13, y0 - 1, oro[0]); L.pt(12, y0 + 1, oro[1]); L.pt(14, y0 + 1, oro[1])
    else:
        p = PELOS[v.get("pelo", "negro")]
        falda(L, mar, y0 + 9, 21, tun, borde=pur, pies=c("madera", 1), ancho_base=8)
        torso(L, y0 + 5, tun, 6, ancho=6)
        L.r(5, y0 + 8, 6, 1, pur[1]); L.pt(8, y0 + 8, oro[0])                  # cíngulo bajo el pecho
        L.r(7, y0 + 9, 1, 12 - bob, pur[1]) if False else None
        L.r(6, y0 + 5, 4, 1, pur[1]); L.pt(7, y0 + 6, oro[0]); L.pt(8, y0 + 6, oro[0])
        brazo(L, 11, y0 + 6 - ba, tun, piel, 6, sombra=True, brazalete=oro[0])
        cuello(L, y0, tun, piel)
        cabeza(L, y0, piel, espaldas)
        pelo_largo(L, y0, p, espaldas)
        cejas(L, y0, p[2]) if not espaldas else None
        # velo traslúcido lila y diadema dorada
        vl = (c("piedra", 6), c("piedra", 5), c("purpura", 2))
        L.r(4, y0 - 1, 8, 2, vl[1]); L.r(5, y0 - 2, 5, 1, vl[0])
        L.pt(11, y0, vl[2]); L.pt(11, y0 + 1, vl[2]); L.pt(4, y0 + 1, vl[2])
        L.r(5, y0, 6, 1, oro[1]); L.pt(8, y0, oro[0])
        brazo(L, 3, y0 + 6 + ba, tun, piel, 5)
        # cuenco de incienso con llama
        L.r(1, y0 + 9 + ba, 5, 2, oro[1]); L.r(1, y0 + 9 + ba, 5, 1, oro[0]); L.pt(3, y0 + 11 + ba, oro[2])
        L.pt(3, y0 + 8 + ba, c("teja", 4)); L.pt(3, y0 + 7 + ba, c("tierra", 5)); L.pt(2, y0 + 8 + ba, c("teja", 3))
    return L


TIPOS = {
    "campesino": campesino, "artesano": artesano, "comerciante": comerciante,
    "soldado": soldado, "sacerdote": sacerdote,
}


def persona(tipo, frame=0, pose="idle", espaldas=False, voltear=False, contorno=True, mujer=False, variante=None) -> Spr:
    L = TIPOS[tipo](frame, pose, espaldas, variante, mujer)
    s = Spr(W, H, 7, 22)
    s.px = L.p.copy()
    if contorno:
        s.contorno(-3)
    if voltear:
        s = s.volteado()
    return s
