"""Poses de trabajo de los ciudadanos: cargar (saco, ánfora, cesta, caja) y rezar (arrodillado)."""
import numpy as np
from paleta import c, TRANSP, TINTA
from iso import Spr
import personajes as P
from personajes import Lienzo, PIELES, PELOS, cabeza, pelo_largo, pelo_calvo, velo, barba, cejas, torso, brazo
from util import LUT


def _pegar(dst: Spr, src: Spr, x, y):
    h, w = src.px.shape
    for yy in range(h):
        for xx in range(w):
            v = src.px[yy, xx]
            if v != TRANSP:
                dst.pset(x + xx, y + yy, v)


_CACHE = {}


def cargando(tipo, frame, carga="saco", mujer=False, voltear=False, espaldas=False, variante=None):
    """Ciudadano caminando con carga. Devuelve un Spr con el ancla en los pies."""
    clave = (tipo, frame % 6, carga, mujer, voltear, espaldas, str(variante))
    if clave in _CACHE:
        return _CACHE[clave]
    base = P.persona(tipo, frame, "caminar", espaldas=espaldas, voltear=False, mujer=mujer, variante=variante)
    W, H = 24, 36
    ox, oy = 4, 12
    s = Spr(W, H, base.ax + ox, base.ay + oy)
    bob = 0 if frame % 3 else 1
    if carga == "anfora":           # ánfora de barro sobre la cabeza, sostenida por las dos manos
        _pegar(s, base, ox, oy)
        x0, y0 = ox + 5, oy - 1 + (1 if frame in (1, 5) else 0)
        perfil = [2, 3, 5, 6, 6, 6, 5, 4, 3, 2, 3]
        for k, w in enumerate(perfil):
            yy = y0 - k
            for i in range(w):
                t = 3.4 + 0.8 - 2.0 * i / max(1, w - 1)
                s.pset(x0 + 2 - w // 2 + i, yy, c("teja", int(np.floor(t + 0.5))))
        s.pset(x0 + 2, y0 - 7, c("tierra", 4)); s.pset(x0 + 3, y0 - 7, c("tierra", 4))
        s.pset(x0, y0 - 6, c("teja", 2)); s.pset(x0 + 6, y0 - 6, c("teja", 2))
        s.pset(ox + 3, oy + 3, c("piel", 1)); s.pset(ox + 12, oy + 3, c("piel", 2))        # manos arriba
    elif carga == "cesta":          # cesta de mimbre con espigas sobre la cabeza
        _pegar(s, base, ox, oy)
        x0, y0 = ox + 4, oy + (1 if frame in (1, 5) else 0)
        for k in range(4):
            for i in range(8):
                s.pset(x0 + i, y0 - k, c("madera", 4 if k == 3 else 3) if (i + k) % 3 else c("madera", 2))
        for i in range(7):
            s.pset(x0 + 1 + i, y0 - 4 - (i % 2), c("tierra", 5 if i % 2 else 6))
            if i % 2 == 0:
                s.pset(x0 + 1 + i, y0 - 6, c("tierra", 4))
        s.pset(ox + 3, oy + 3, c("piel", 1)); s.pset(ox + 12, oy + 3, c("piel", 2))
    elif carga == "saco":           # saco de grano a la espalda
        _pegar(s, base, ox, oy)
        sx, sy = ox + 8, oy - 1 + bob
        filas = [(2, 9), (1, 10), (0, 11), (0, 11), (0, 11), (1, 10), (1, 10), (2, 9)]
        for k, (a, b) in enumerate(filas):
            for x in range(a, b):
                t = 4.6 - 2.4 * (x - a) / max(1, b - a - 1)
                s.pset(sx + x, sy + k, c("tierra", int(np.floor(t + 0.5))))
        s.pset(sx + 4, sy - 1, c("tierra", 3)); s.pset(sx + 5, sy - 1, c("tierra", 4))
    elif carga == "caja":           # caja de madera abrazada al pecho
        _pegar(s, base, ox, oy)
        for k in range(8):
            for i in range(11):
                col = c("madera", 4 if k == 0 else (1 if k == 7 or i in (0, 10) else 3))
                s.pset(ox + 2 + i, oy + 10 + k + bob, col)
        for i in range(11):
            s.pset(ox + 2 + i, oy + 13 + bob, c("madera", 2))
        s.pset(ox + 2, oy + 13 + bob, c("piel", 1)); s.pset(ox + 12, oy + 13 + bob, c("piel", 2))
    s.contorno(-3)
    out = s.volteado() if voltear else s
    _CACHE[clave] = out
    return out


def arrodillado(mujer=True, frame=0, voltear=False):
    """Sacerdote/sacerdotisa de rodillas con las manos juntas; la cabeza se inclina."""
    clave = ("rezar", mujer, frame % 2, voltear)
    if clave in _CACHE:
        return _CACHE[clave]
    L = Lienzo()
    piel = PIELES["claro"]
    tun = (c("piedra", 6), c("piedra", 5), c("piedra", 3))
    pur = (c("purpura", 2), c("purpura", 1), c("purpura", 0))
    oro = (c("oro", 2), c("oro", 1), c("oro", 0))
    y0 = 7 + (frame % 2)
    # montículo de túnica en el suelo
    for k in range(7):
        w = 8 + min(4, k)
        x0 = 8 - w // 2
        L.r(x0, 15 + k, w, 1, tun[1]); L.pt(x0, 15 + k, tun[0]); L.r(x0 + w - 2, 15 + k, 2, 1, tun[2])
    L.r(2, 21, 12, 1, pur[1])
    for xx in range(3, 14, 2):
        L.pt(xx, 21, oro[0])
    # torso inclinado
    torso(L, y0 + 4, tun, 7, ancho=6)
    L.r(7, y0 + 4, 3, 9, pur[1]); L.r(7, y0 + 4, 1, 9, pur[0]); L.r(9, y0 + 4, 1, 9, pur[2])
    for yy in range(y0 + 7, y0 + 13, 3):
        L.pt(8, yy, oro[0])
    # manos juntas al pecho
    L.r(8, y0 + 8, 2, 2, piel[1]); L.pt(8, y0 + 8, piel[0])
    brazo(L, 11, y0 + 5, tun, piel, 4, sombra=True)
    brazo(L, 3, y0 + 5, tun, piel, 4)
    cabeza(L, y0 - 1, piel, False, ojos=False)
    L.pt(7, y0 + 2, piel[2]); L.pt(9, y0 + 2, piel[2])          # ojos cerrados
    if mujer:
        p = PELOS["negro"]
        pelo_largo(L, y0 - 1, p, False)
        L.r(4, y0 - 3, 8, 2, c("piedra", 6)); L.r(5, y0 - 4, 5, 1, c("piedra", 6))
        L.r(5, y0 - 1, 6, 1, oro[1])
    else:
        pelo_calvo(L, y0 - 1, PELOS["blanco"], False)
        barba(L, y0 - 1, (c("piedra", 6), c("piedra", 4), c("piedra", 3)), larga=True)
        L.r(5, y0 - 1, 6, 1, oro[1])
    s = Spr(16, 24, 8, 22)
    s.px = L.p.copy()
    s.contorno(-3)
    out = s.volteado() if voltear else s
    _CACHE[clave] = out
    return out


def gaviota(frame=0, voltear=False):
    arriba = ["x.....x", ".x...x.", "..xxx.."]
    abajo = ["..xxx..", ".x...x.", "x.....x"]
    filas = arriba if frame % 2 == 0 else abajo
    s = Spr(9, 5, 4, 2)
    for j, f in enumerate(filas):
        for i, ch in enumerate(f):
            if ch == "x":
                s.pset(1 + i, 1 + j, c("piedra", 6) if 1 < i < 5 else c("piedra", 4))
    s.pset(4, 2, c("piedra", 6)); s.pset(4, 3, c("piedra", 5))
    return s.volteado() if voltear else s
