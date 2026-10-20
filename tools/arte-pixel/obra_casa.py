"""Etapas de obra de las casas (R22): replanteo, preparación, cimientos, estructura y cubierta (la 6 es la casa).

Una `Obra` dibuja las etapas 1-5 de una casa de w×d tiles con los mismos parámetros que `edificios.casa()`
(pared, tonos, semilla), de modo que la cubierta de la etapa 5 usa EXACTAMENTE las tejas de la casa terminada.
Todas las etapas comparten huella y ancla (esquina trasera = origen del sprite).

Dos capas por etapa: «suelo» (tierra removida, zanja; sin contorno y sin bloquear) y «objetos» (con contorno selectivo).
`huella` de cada etapa = rectángulo en subceldas (1 tile = 4 subceldas = 16 px de suelo) que cubre huella + lo que
sobresale (andamio, material). Se CALCULA con lo que se dibuja: cada pieza que puede sobresalir se registra y el
margen sale de ahí; si algo sobresale más de 1 subcelda, falla.
"""
import math
import sys
sys.dont_write_bytecode = True
import numpy as np
from paleta import c, TRANSP
from util import hash2, fbm
from iso import Spr
from tablas import RID, a_indice
from edificios import caja, fn_sillar, fn_plano, estuco, casa
from edificios2 import f_tablas, f_tablas_top
from templo import f_mar, f_mar_top, poste, plataforma

HW, R, E = 20, 12, 3        # altura de muro, altura del tejado y alero (igual que edificios.casa)
SUB = 4                     # píxeles de suelo por subcelda (1 tile = 16 = 4 subceldas)
MARGEN_MAX = 1              # subceldas máximas que puede sobresalir una obra
NOMBRES = ["1 REPLANTEO", "2 PREPARACION", "3 CIMIENTOS", "4 ESTRUCTURA", "5 CUBIERTA", "6 TERMINADA"]


# ------------------------------------------------------------------ piezas sueltas (sin registro de huella)
def sombra_pie(s, u, v, n=3):
    x, y = s.P(u, v, 0)
    for k in range(n):
        s.pset(int(x) + 2 + k, int(y), c("tierra", 0))


def estaca(s, u, v, h, trapo=False):
    x, y = s.P(u, v, 0)
    x, y = int(round(x)), int(round(y))
    for k in range(h):
        s.pset(x, y - k, c("madera", 3))
        s.pset(x + 1, y - k, c("madera", 1))
    s.pset(x, y - h, c("madera", 4))
    s.pset(x + 1, y - h, c("madera", 3))
    if trapo:   # trapo carmesí: se ve a distancia
        for dx, dy in ((2, -h + 1), (3, -h + 1), (2, -h + 2), (3, -h + 2), (4, -h + 2), (3, -h + 3)):
            s.pset(x + dx, y + dy, c("carmesi", 2 if dy < -h + 2 else 1))
    sombra_pie(s, u, v, 2)


def cordel(s, p0, p1, z, caida=1.5):
    """Cordel tenso entre dos estacas, con un poco de comba en el centro."""
    m = ((p0[0] + p1[0]) / 2.0, (p0[1] + p1[1]) / 2.0)
    s.lineaz((p0[0], p0[1], z), (m[0], m[1], z - caida), c("tierra", 6))
    s.lineaz((m[0], m[1], z - caida), (p1[0], p1[1], z), c("tierra", 6))


def pala(s, u, v, alto):
    """Pala clavada en un montón: mango de madera con empuñadura en T."""
    x, y = s.P(u, v, 0)
    x, y = int(round(x)), int(round(y)) - alto + 2
    for k in range(9):
        s.pset(x, y - k, c("madera", 3))
        s.pset(x + 1, y - k, c("madera", 1))
    for dx in (-1, 0, 1, 2):
        s.pset(x + dx, y - 9, c("madera", 4))


def decal(s, u, v, rx, seed, tono=2.6):
    """Mancha pequeña de tierra pisada (elipse irregular) bajo un montón de material."""
    cx, cy = s.P(u, v, 0)
    ry = rx / 2.0
    for y in range(int(cy - ry - 2), int(cy + ry + 3)):
        for x in range(int(cx - rx - 2), int(cx + rx + 3)):
            q = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + (hash2(x, y, seed) - 0.5) * 0.45
            if q <= 1.0:
                s.pset(x, y, c("tierra", int(np.floor(tono + (hash2(x, y, seed + 1) - 0.5) * 1.3 + 0.5))))


def hueco(s, O, a, b, la, lb, s0, t0, w, h, arco=False, dintel=True):
    """Hueco oscuro en una pared (ventana o puerta sin hoja todavía)."""
    def mk(ss, tt):
        m = (ss >= s0) & (ss < s0 + w) & (tt >= t0) & (tt < t0 + h)
        if arco:
            r = w / 2.0
            cy = t0 + h - r
            m &= ~((tt >= cy) & (((ss - (s0 + r)) ** 2 + (tt - cy) ** 2) > r * r))
        return m

    def fn(ss, tt, X, Y):
        out = np.full(ss.shape, c("madera", 0), np.uint8)
        out = np.where(tt < t0 + 2, c("tierra", 1), out)     # luz rebotada en el fondo
        if dintel:
            out = np.where(tt >= t0 + h - 1.5, c("madera", 3), out)
        return out
    s.cara(O, a, la, b, lb, fn, fid=9, mascara=mk)


def sin_aislados(px, minimo=2):
    """Quita píxeles sueltos del decal de suelo (menos de `minimo` vecinos de 8)."""
    op = px != TRANSP
    pad = np.pad(op, 1)
    n = sum(pad[1 + dy:pad.shape[0] - 1 + dy, 1 + dx:pad.shape[1] - 1 + dx].astype(int)
            for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx, dy) != (0, 0))
    out = px.copy()
    out[op & (n < minimo)] = TRANSP
    return out


# ================================================================== la obra
class Obra:
    def __init__(self, w, d, kw):
        self.w, self.d = w, d
        self.W, self.D = 16 * w, 16 * d
        self.pared = kw.get("pared", "piedra")
        self.t_lit = kw.get("t_lit", 4.6)
        self.t_som = max(1.2, self.t_lit - 2.6)
        self.teja_t = kw.get("teja_t", 3.7)
        self.seed = kw.get("seed", 1)
        self.ps = kw.get("puerta_s") or (4 if w == 2 else 6)       # inicio de la puerta a lo largo de u
        self.ax, self.ay = self.D + 28, 64
        self.cw, self.ch = self.W + self.D + 56, 64 + (self.W + self.D) // 2 + 28
        self.su = self.ob = None
        self.ext = []

    # ---- capas y registro de huella
    def empezar(self):
        self.su = Spr(self.cw, self.ch, self.ax, self.ay)
        self.ob = Spr(self.cw, self.ch, self.ax, self.ay)
        self.ext = []

    def reg(self, u0, v0, u1, v1):
        self.ext.append((u0, v0, u1, v1))

    def caja(self, u0, v0, z0, du, dv, dz, fl, fr, ft, fid=3):
        self.reg(u0, v0, u0 + du, v0 + dv)
        caja(self.ob, u0, v0, z0, du, dv, dz, fl, fr, ft, fid=fid)

    def poste(self, u, v, z1):
        self.reg(u - 0.5, v - 0.5, u + 0.5, v + 0.5)
        poste(self.ob, u, v, 0, z1, 1)
        sombra_pie(self.ob, u, v, 3)

    def monton(self, u, v, rx, alto, ramp, tono, seed=1):
        """Montón en cúpula (mapa de alturas pintado de atrás adelante, luz desde la izquierda)."""
        r = rx / math.sqrt(2.0)
        self.reg(u - r, v - r, u + r, v + r)
        s = self.ob
        cx, cy = s.P(u, v, 0)
        ry = rx / 2.0
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
                q = dx * dx + dy * dy
                if q > 1.0:
                    continue
                z = alto * np.sqrt(1.0 - q)
                tn = tono - 0.8 - 1.7 * dx + 0.9 * np.sqrt(1.0 - q) + (hash2(x, y, seed) - 0.5) * 0.7
                col = c(ramp, int(np.floor(tn + 0.5)))
                for yy in range(int(np.floor(y - z)), y + 1):
                    s.pset(x, yy, col)

    def bloque(self, u, v, z, du, dv, dz, tono=3.7, seed=1):
        self.caja(u, v, z, du, dv, dz, f_mar(tono, seed, vetas=False), f_mar(tono - 2.1, seed + 1, vetas=False),
                  f_mar_top(tono + 0.9, seed + 2), fid=30)

    def pila_bloques(self, u, v, z0, filas, cols, tam, seed):
        du, dv, dz = tam
        for k in range(filas):
            for i in range(cols - k):
                self.bloque(u + i * (du + 1) + k * 4, v, z0 + k * dz, du, dv, dz,
                            3.5 + (hash2(i, k, seed) - 0.5) * 0.9, seed + i + 7 * k)

    def pila_tablones(self, u, v, z0, du, dv, dz, seed=4):
        self.caja(u, v, z0, du, dv, dz, f_tablas(3.0, seed), f_tablas(1.8, seed), f_tablas_top(3.4, seed), fid=95)

    def pila_tejas(self, u, v, z0, du, dv, dz, seed=3):
        """Pila de tejas de barro: cantos con una banda oscura por teja."""
        def lado(t):
            return lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["teja"]),
                                                  t + np.where(np.mod(np.floor(tt), 2) == 0, 0.5, -0.5))

        def top(ss, tt, X, Y):
            return a_indice(np.full(ss.shape, RID["teja"]), 3.2 + np.where(np.mod(np.floor(ss), 3) == 0, -0.8, 0.3))
        self.caja(u, v, z0, du, dv, dz, lado(3.4), lado(1.5), top, fid=96)

    def artesa(self, u, v, du=8, dv=4, dz=3):
        """Artesa de mortero: caja de madera con mezcla clara dentro."""
        self.caja(u, v, 0, du, dv, dz, f_tablas(3.0, 8), f_tablas(1.6, 8), f_tablas_top(3.2, 8), fid=97)
        self.ob.cara((u + 1, v + 1, dz), (1, 0, 0), du - 2, (0, 1, 0), dv - 2,
                     lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["piedra"]),
                                                    4.3 + (hash2(np.floor(ss), np.floor(tt), 5) - 0.5)), fid=98)

    def escalera(self, u, v, zmax, dist=3):
        """Escalera de mano en el plano v-z, apoyada en el suelo."""
        self.reg(u - 0.5, v, u + 0.5, v + dist)
        s = self.ob
        for z in range(2, int(zmax), 3):
            s.lineaz((u, v, z), (u, v + dist, z), c("madera", 4))
        s.lineaz((u, v, 0), (u, v, zmax), c("madera", 3))
        s.lineaz((u, v + dist, 0), (u, v + dist, zmax), c("madera", 1))
        sombra_pie(s, u, v + dist, 2)

    def andamio(self, zdeck, ztop):
        """Andamio de madera pegado a la pared derecha (u = W), la que queda en sombra: deja la puerta a la vista."""
        W, D, s = self.W, self.D, self.ob
        v0, v1 = 3, D - 3
        up = W + 3.5
        pv = (4, D // 2, D - 4)
        self.caja(W, v0, zdeck, 4, v1 - v0, 2, f_tablas(2.6, 12, sep=2.5), f_tablas(1.4, 12), f_tablas(3.1, 13, sep=2.5), fid=20)
        s.lineaz((up, pv[0], 1), (up, pv[1], zdeck - 1), c("madera", 2))
        s.lineaz((up, pv[1], 1), (up, pv[2], zdeck - 1), c("madera", 1))
        s.lineaz((up, v0, zdeck + 7), (up, v1, zdeck + 7), c("madera", 3))
        for v in pv:
            self.poste(up, v, ztop)
        self.escalera(up, pv[1] + 3, zdeck + 2, 3)

    def deposito(self, arena=True, tejas=False):
        """Material delante de la pared frontal, junto a la puerta (la pared izquierda queda libre)."""
        W, D = self.W, self.D
        self.artesa(self.ps + 11, D)
        if arena:
            self.monton(W - 6, D + 1.1, 4, 3, "tierra", 4.1, 9)
        if tejas:
            self.pila_tejas(W - 8, D, 0, 6, 4, 4, 5)

    def muro_cimientos(self, u0, v0, du, dv, h, seed):
        self.caja(u0, v0, 0, du, dv, h, fn_sillar("piedra", 3.7, seed, bw=8, bh=3), fn_sillar("piedra", 1.9, seed + 1, bw=8, bh=3),
                  f_mar_top(4.5, seed + 2), fid=90)

    def muro_sillar(self, u0, v0, du, dv, z0, h, seed, bh=4):
        self.caja(u0, v0, z0, du, dv, h, fn_sillar("piedra", 3.9, seed, bw=8, bh=bh), fn_sillar("piedra", 2.0, seed + 1, bw=8, bh=bh),
                  f_mar_top(4.7, seed + 2), fid=91)

    def umbral(self, dz):
        t = 4
        self.caja(self.ps, self.D - t, 0, 9, t, dz, f_mar(4.2, 9, vetas=False), f_mar(2.2, 10, vetas=False), f_mar_top(5.0, 11), fid=92)

    # ---- suelo
    def parche(self, m, seed, tono=2.7, rastrillo=False, borde=0.30):
        """Tierra removida bajo la obra, con borde irregular (decal del terreno)."""
        W, D = self.W, self.D

        def mk(ss, tt):
            d = np.minimum(np.minimum(ss, W + 2 * m - ss), np.minimum(tt, D + 2 * m - tt))
            return d + (fbm(ss * 0.22 + seed, tt * 0.22, 2, seed + 3) - 0.5) * 2.6 * m > m * borde

        def fn(ss, tt, X, Y):
            n = fbm(ss * 0.14 + seed, tt * 0.14, 2, seed)
            hh = hash2(np.floor(ss), np.floor(tt), seed + 7)
            tn = tono + (n - 0.5) * 1.3 + (hh > 0.95) * 0.9 - (hh < 0.05) * 1.0
            if rastrillo:   # surcos de rastrillo: terreno nivelado
                tn = tn + np.where(np.mod(np.floor(tt), 3) == 0, -0.55, 0.15)
            return a_indice(np.full(ss.shape, RID["tierra"]), tn)
        self.su.cara((-m, -m, 0), (1, 0, 0), W + 2 * m, (0, 1, 0), D + 2 * m, fn, fid=40, mascara=mk)

    def zanja(self, ancho=3, off=1.5):
        """Zanja de cimentación: anillo oscuro con labio claro en el lado que da a la luz."""
        W, D = self.W, self.D
        a0, a1 = off, off + ancho

        def dist(ss, tt):
            return np.minimum(np.minimum(ss, W - ss), np.minimum(tt, D - tt))

        def fn(ss, tt, X, Y):
            lit = (tt >= D - a1) | (ss >= W - a1)
            return a_indice(np.full(ss.shape, RID["tierra"]), np.where(lit, 1.25, 0.9))
        self.su.cara((0, 0, 0.05), (1, 0, 0), W, (0, 1, 0), D, fn, fid=41,
                     mascara=lambda ss, tt: (dist(ss, tt) >= a0) & (dist(ss, tt) < a1))

    def grava(self, u0, v0, du, dv, seed):
        def fn(ss, tt, X, Y):
            n = fbm(ss * 0.2 + seed, tt * 0.2, 2, seed)
            hh = hash2(np.floor(ss / 2), np.floor(tt / 2), seed + 2)
            return a_indice(np.full(ss.shape, RID["tierra"]), 2.0 + (n - 0.5) + (hh > 0.86) * 1.6 - (hh < 0.08) * 0.8)
        self.ob.cara((u0, v0, 0.02), (1, 0, 0), du, (0, 1, 0), dv, fn, fid=42)

    # ================================================================== etapas
    def etapa1(self):
        """1 Replanteo: estacas con trapos, cordel y tierra pisada."""
        W, D = self.W, self.D
        self.empezar()
        self.parche(3, 11, tono=2.6)
        a, b = 0.5, 0.5
        esq = [(a, b), (W - a, b), (W - a, D - b), (a, D - b)]
        for i in range(4):
            cordel(self.ob, esq[i], esq[(i + 1) % 4], 7, 1.5)
        estacas = [(p, 10, True) for p in esq]
        for k in range(1, self.w):
            estacas += [((16 * k, b), 5, False), ((16 * k, D - b), 5, False)]
        for k in range(1, self.d):
            estacas += [((a, 16 * k), 5, False), ((W - a, 16 * k), 5, False)]
        for (u, v), h, trapo in sorted(estacas, key=lambda e: e[0][0] + e[0][1]):
            estaca(self.ob, u, v, h, trapo)
            self.reg(u - 0.5, v - 0.5, u + 0.5, v + 0.5)
        # estacas de repuesto apiladas (2 + 1 encima) y piedras sueltas, dentro de la huella
        for (u, v, z) in ((3, D - 12, 0), (3, D - 8, 0), (3, D - 10, 2)):
            self.caja(u, v, z, 10, 2, 2, fn_plano("madera", 3.1), fn_plano("madera", 1.6), fn_plano("madera", 4.0), fid=93)
        for (u, v, t) in ((W - 8, 10, 3.8), (W - 5, 12, 3.0), (W - 9, 13, 4.2)):
            self.bloque(u, v, 0, 3, 2, 2, t, 40 + int(u))

    def etapa2(self):
        """2 Preparación: terreno nivelado y rastrillado, zanja trazada, montones de material."""
        W, D = self.W, self.D
        self.empezar()
        self.parche(4, 12, tono=3.0, rastrillo=True, borde=0.35)
        self.zanja()
        a, b = 0.5, 0.5
        esq = [(a, b), (W - a, b), (W - a, D - b), (a, D - b)]
        for i in range(4):
            cordel(self.ob, esq[i], esq[(i + 1) % 4], 5, 1.0)
        for p in esq[:2]:
            estaca(self.ob, p[0], p[1], 7)
        self.pila_tablones(int(W * 0.4), 5, 0, 9, 6, 5, 4)
        self.monton(6, D - 12, 8, 6, "tierra", 3.5, 3)
        pala(self.ob, 6, D - 12, 6)
        self.pila_bloques(W - 15, D - 13, 0, 2, 2, (6, 4, 4), 5)
        for p in esq[2:]:
            estaca(self.ob, p[0], p[1], 7)
        for p in esq:
            self.reg(p[0] - 0.5, p[1] - 0.5, p[0] + 0.5, p[1] + 0.5)

    def etapa3(self):
        """3 Cimientos: anillo de piedra con vano de puerta (umbral de losa); interior compactado."""
        W, D, ps = self.W, self.D, self.ps
        self.empezar()
        self.parche(5, 13, tono=2.5, borde=0.35)
        t, h = 4, 5
        self.grava(t, t, W - 2 * t, D - 2 * t, 14)
        self.muro_cimientos(0, 0, W, t, h, 31)
        self.muro_cimientos(0, t, t, D - t, h, 33)
        self.muro_cimientos(W - t, t, t, D - 2 * t, h, 35)
        self.muro_cimientos(ps + 9, D - t, W - ps - 9, t, h, 37)
        self.muro_cimientos(0, D - t, ps, t, h, 38)
        self.umbral(2)
        self.deposito()

    def etapa4(self):
        """4 Estructura: muros de sillar a media altura, vano con puntales, andamio y material."""
        W, D, ps = self.W, self.D, self.ps
        self.empezar()
        self.parche(5, 15, tono=2.7)
        t, h = 4, 11
        self.muro_sillar(0, 0, W, t, 0, h, 41)
        self.muro_sillar(0, t, t, D - t, 0, h, 43)
        self.muro_sillar(W - t, t, t, D - 2 * t, 0, h, 49)
        self.muro_sillar(ps + 9, D - t, W - ps - 9, t, 0, h, 51)
        self.muro_sillar(0, D - t, ps, t, 0, h, 52)
        # tramos más altos: el albañil va por delante en unos sitios
        self.muro_sillar(2, 0, 11, t, h, 4, 45)
        self.muro_sillar(0, 10, t, 8, h, 4, 47)
        self.muro_sillar(14, 0, 6, t, h, 4, 48)
        self.muro_sillar(W - 14, D - t, 9, t, h, 4, 53)
        if W > 40:
            self.muro_sillar(30, 0, 9, t, h, 4, 54)
        self.umbral(1)
        self.poste(ps + 1, D - 1, 14)
        self.poste(ps + 7, D - 1, 14)
        self.ob.lineaz((ps, D - 1, 14), (ps + 8, D - 1, 14), c("madera", 4))     # dintel provisional
        self.ob.lineaz((ps, D - 1, 13), (ps + 8, D - 1, 13), c("madera", 2))
        self.andamio(7, 17)
        self.deposito()
        # bloques sobrantes: dos apilados tras la esquina trasera derecha y uno sobre el piso del andamio
        decal(self.su, W + 2, -2, 6, 77, 2.7)
        self.bloque(W, -4, 0, 4, 4, 3, 3.6, 71)
        self.bloque(W + 0.3, -3.5, 3, 3.5, 3, 3, 3.9, 73)
        self.bloque(W + 0.3, 14, 9, 3, 3, 3, 3.5, 74)

    # ---- etapa 5: cubierta
    def _faldon(self, O, a, la, b, ncursos, visible, base_t, seed):
        """Faldón con armazón: tejas idénticas a `techo_tejas` (mismo seed y base) colocadas desde el alero."""
        ancho_teja = 4

        def tejas(ss, p):
            cur = p * ncursos
            ic = np.floor(cur)
            f = cur - ic
            col_ = np.floor((ss + (ic % 2) * (ancho_teja / 2.0)) / ancho_teja)
            fs = (ss + (ic % 2) * (ancho_teja / 2.0)) / ancho_teja - col_
            base = base_t + (hash2(col_, ic, seed) - 0.5) * 1.1
            tn = np.where(f < 0.34, base + 0.9, np.where(f < 0.67, base, base - 1.1))
            tn = np.where(fs < 0.22, tn - 0.8, tn)
            tn = np.where(hash2(col_, ic, seed + 7) > 0.94, tn + 1.2, tn)
            return a_indice(np.full(ss.shape, RID["teja"]), tn)

        def fn(ss, p, X, Y):
            out = np.where(p < 0.6, c("madera", 1), c("madera", 0)).astype(np.uint8)   # penumbra bajo la cubierta
            r = np.mod(ss, 8.0)
            out = np.where(r < 1.6, np.where(r < 0.8, c("madera", 3), c("madera", 2)), out)   # cabios
            lim = (5.4 if visible else 7.0) / ncursos
            fila = p * 7.0
            fr = fila - np.floor(fila)
            junta = np.mod(ss + hash2(np.floor(fila), 3, seed + 2) * 16, 16.0) < 0.8
            claro = hash2(np.floor(fila), 1, seed + 4) > 0.5
            tablon = np.where(fr < 0.2, np.where(claro, c("madera", 4), c("madera", 3)),
                              np.where(claro, c("madera", 3), c("madera", 2)))
            out = np.where(p < lim, np.where(junta | (fr > 0.8), c("madera", 1), tablon), out).astype(np.uint8)   # entablado
            if visible:   # las tejas llegan hasta donde ha llegado el tejador
                lleno = (p < 2.0 / ncursos) | ((p < 3.0 / ncursos) & (ss < 0.62 * la)) | ((p < 4.0 / ncursos) & (ss < 0.22 * la))
            else:
                lleno = p < 1.0 / ncursos
            return np.where(lleno, tejas(ss, p), out)
        self.ob.cara(O, a, la, b, 1.0, fn, fid=4)

    def etapa5(self, eje="u"):
        """5 Cubierta: muros enlucidos a altura completa, armazón de madera y primeras tejas."""
        W, D, ps, s = self.W, self.D, self.ps, self.ob
        self.empezar()
        s = self.ob
        self.parche(5, 16, tono=2.7)
        sd = self.seed
        s.cara((0, D, 0), (1, 0, 0), W, (0, 0, 1), HW, estuco(self.pared, self.t_lit, sd), fid=1)
        s.cara((W, 0, 0), (0, 1, 0), D, (0, 0, 1), HW, estuco(self.pared, self.t_som, sd + 1, ztono=self.t_som), fid=2)
        hueco(s, (0, D, 0), (1, 0, 0), (0, 0, 1), W, HW, ps, 0, 9, 15, arco=True, dintel=False)
        for vs in ([W - 11] if self.w == 2 else [W - 11, W // 2 - 3]):
            if vs > ps + 11:
                hueco(s, (0, D, 0), (1, 0, 0), (0, 0, 1), W, HW, vs, 8, 7, 9)
        for vs in ([D // 2 - 3] if self.d == 2 else [4, D - 11]):
            hueco(s, (W, 0, 0), (0, 1, 0), (0, 0, 1), D, HW, vs, 8, 7, 9)
        if eje == "u":
            s.cara((W, 0, HW), (0, 1, 0), D, (0, 0, 1), R, estuco(self.pared, self.t_som, sd + 2, zocalo=0), fid=2,
                   mascara=lambda ss, tt: tt < R * (1 - np.abs(2 * ss / D - 1)))
            self._faldon((-E, -E, HW), (1, 0, 0), W + 2 * E, (0, D / 2 + E, R), 4, False, self.teja_t - 2.2, sd + 5)
            self._faldon((-E, D + E, HW), (1, 0, 0), W + 2 * E, (0, -(D / 2 + E), R), 7, True, self.teja_t, sd)
            s.lineaz((-E, D / 2, HW + R), (W + E, D / 2, HW + R), c("madera", 4))                 # cumbrera
            s.lineaz((-E, D / 2, HW + R - 1), (W + E, D / 2, HW + R - 1), c("madera", 2))
            s.lineaz((-E, D + E, HW), (W + E, D + E, HW), c("madera", 3))                         # tabica del alero
            s.lineaz((-E, D + E, HW - 1), (W + E, D + E, HW - 1), c("madera", 1))
            s.lineaz((W + E, D + E, HW), (W + E, D / 2, HW + R), c("madera", 3))                  # borde del hastial
            s.lineaz((W + E, D + E, HW + 1), (W + E, D / 2, HW + R + 1), c("madera", 4))
        else:
            s.cara((0, D, HW), (1, 0, 0), W, (0, 0, 1), R, estuco(self.pared, self.t_lit, sd + 2, zocalo=0), fid=1,
                   mascara=lambda ss, tt: tt < R * (1 - np.abs(2 * ss / W - 1)))
            self._faldon((-E, -E, HW), (0, 1, 0), D + 2 * E, (W / 2 + E, 0, R), 4, False, self.teja_t - 3.0, sd + 5)
            self._faldon((W + E, -E, HW), (0, 1, 0), D + 2 * E, (-(W / 2 + E), 0, R), 7, True, self.teja_t - 1.5, sd)
            s.lineaz((W / 2, -E, HW + R), (W / 2, D + E, HW + R), c("madera", 4))
            s.lineaz((W / 2, -E, HW + R - 1), (W / 2, D + E, HW + R - 1), c("madera", 2))
            s.lineaz((W + E, -E, HW), (W + E, D + E, HW), c("madera", 3))
            s.lineaz((W + E, -E, HW - 1), (W + E, D + E, HW - 1), c("madera", 1))
            s.lineaz((W + E, D + E, HW), (W / 2, D + E, HW + R), c("madera", 3))
            s.lineaz((W + E, D + E, HW + 1), (W / 2, D + E, HW + R + 1), c("madera", 4))
        self.andamio(17, 25)
        self.pila_tejas(W, 5, 19, 4, 6, 3, 7)
        self.deposito(arena=False, tejas=True)

    # ---- resultado
    def huella(self):
        """Rectángulo en subceldas (relativo a la esquina trasera de la huella) que cubre huella + lo que sobresale."""
        W, D = self.W, self.D
        us0 = min([0.0] + [e[0] for e in self.ext])
        vs0 = min([0.0] + [e[1] for e in self.ext])
        us1 = max([float(W)] + [e[2] for e in self.ext])
        vs1 = max([float(D)] + [e[3] for e in self.ext])
        m = lambda x: int(math.ceil(x / SUB - 0.002))
        r = {"u0": -m(-us0), "v0": -m(-vs0), "u1": 4 * self.w + m(us1 - W), "v1": 4 * self.d + m(vs1 - D)}
        for k, extra in (("u0", -r["u0"]), ("v0", -r["v0"]), ("u1", r["u1"] - 4 * self.w), ("v1", r["v1"] - 4 * self.d)):
            if extra > MARGEN_MAX:
                raise SystemExit(f"obra {self.w}x{self.d}: sobresale {extra} subceldas por {k} (máx. {MARGEN_MAX})")
        return r

    def componer(self, contorno=True):
        su = self.su.copiar()
        su.px = sin_aislados(su.px)
        o = self.ob.copiar()
        if contorno:
            o.contorno(-3)
        m = o.px != TRANSP
        su.px[m] = o.px[m]
        return su


def etapas_casa(w, d, kw):
    """Etapas 1-5 de una casa w×d: {n: {"orient": {ori: [Spr] | alias}, "huella": rect}}. La 6 es edificios.casa()."""
    ob = Obra(w, d, kw)
    out = {}
    for n in (1, 2, 3, 4):
        getattr(ob, f"etapa{n}")()
        out[n] = {"orient": {"u": [ob.componer()], "v": "u"}, "huella": ob.huella()}
    ob.etapa5("u")
    su_u = ob.componer()
    h_u = ob.huella()
    ob.etapa5("v")
    out[5] = {"orient": {"u": [su_u], "v": [ob.componer()]}, "huella": {k: max(h_u[k], ob.huella()[k]) if k.endswith("1")
                                                                       else min(h_u[k], ob.huella()[k]) for k in h_u}}
    return out


def hoja_vista(w, d, kw, eje="u"):
    """Las 6 etapas en un lienzo común (para las hojas de revisión x1 / x4). Devuelve lista de Spr con la misma ancla."""
    ob = Obra(w, d, kw)
    res = []
    for n in (1, 2, 3, 4):
        getattr(ob, f"etapa{n}")()
        res.append(ob.componer())
    ob.etapa5(eje)
    res.append(ob.componer())
    k = casa(w, d, eje=eje, **kw)
    t = Spr(ob.cw, ob.ch, ob.ax, ob.ay)
    t.pegar(k, ob.ax - k.ax, ob.ay - k.ay)
    res.append(t)
    ys, xs = [], []
    for s in res:
        yy, xx = np.where(s.px != TRANSP)
        ys += [yy.min(), yy.max()]
        xs += [xx.min(), xx.max()]
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    sal = []
    for s in res:
        r = Spr(x1 - x0, y1 - y0, ob.ax - x0, ob.ay - y0)
        r.px = s.px[y0:y1, x0:x1].copy()
        sal.append(r)
    return sal
