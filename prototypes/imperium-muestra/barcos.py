"""Barcos antiguos: galera, nave mercante y pesquero. Dibujo paramétrico en iso, píxel a píxel."""
import numpy as np
from PIL import Image, ImageDraw
from paleta import c, TRANSP, TINTA
from util import hash2, fbm
from iso import Spr


class Barco:
    """Dibuja con ejes locales (a = eslora, b = través, z = altura)."""

    def __init__(self, L, orient="u", w=110, h=100):
        self.L = L
        self.orient = orient
        self.s = Spr(w, h, w // 2 - (L // 2 if orient == "u" else -L // 2) // 1 * 0, h - 26)
        self.s.ax = 18 if orient == "u" else w - 18
        self.s.ay = h - 30 - (0 if orient == "u" else 0)

    # proyección de coordenadas del barco a la pantalla del sprite
    def uv(self, a, b):
        return (a, b) if self.orient == "u" else (b, a)

    def P(self, a, b, z):
        u, v = self.uv(a, b)
        return self.s.P(u, v, z)

    # ---- casco ----
    def casco(self, bw=5.5, zs0=7.0, zs_mid=4.0, proa=4.0, popa=3.0, madera=("madera", 3), franja="teja",
              franja_t=2.6, seed=1):
        s, L = self.s, self.L
        def sheer(a):
            f = a / L
            z = zs0 - (zs0 - zs_mid) * np.sin(np.pi * f)
            z += proa * max(0.0, (f - 0.82) / 0.18) ** 2
            z += popa * max(0.0, (0.18 - f) / 0.18) ** 2
            return z
        def beam(a, k=1.0):
            f = a / L
            return bw * k * (np.sin(np.pi * min(max(f, 0.0), 1.0)) ** 0.55)
        N = 60
        aa = np.linspace(0, L, N)
        top_p = [self.P(a, beam(a), sheer(a)) for a in aa]
        bot_p = [self.P(a, beam(a, 0.62), 0.0) for a in aa]
        top_m = [self.P(a, -beam(a), sheer(a)) for a in aa]
        bot_m = [self.P(a, -beam(a, 0.62), 0.0) for a in aa]
        # cubierta: polígono entre los dos bordes de regala
        deck = top_p + top_m[::-1]
        self._poly(deck, lambda m, X, Y: c("madera", 2) + 0 * X, tono_cubierta=True)
        # cara interior de la banda lejana
        lejos = top_m + [(x, y + 3) for x, y in top_m[::-1]]
        self._poly(lejos, lambda m, X, Y: np.full(X.shape, c("madera", 1)))
        # costado visible
        costado = top_p + bot_p[::-1]
        self._costado(costado, madera, franja, franja_t, seed)
        self.sheer = sheer
        self.beam = beam
        # borde (regala) claro
        for i in range(N - 1):
            x0, y0 = top_p[i]
            x1, y1 = top_p[i + 1]
            s.linea((x0, y0 - 1), (x1, y1 - 1), c("madera", 4))

    def _poly(self, pts, fn, tono_cubierta=False):
        s = self.s
        im = Image.new("L", (s.w, s.h), 0)
        ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
        m = np.array(im) > 0
        yy, xx = np.nonzero(m)
        if len(yy) == 0:
            return
        if tono_cubierta:
            tabla = (np.floor((xx + yy * 2) / 3) % 2)
            col = np.where(tabla == 0, c("madera", 3), c("madera", 2))
            col = np.where(((xx + yy * 2) % 3) == 0, c("madera", 1), col)
        else:
            col = fn(m, xx, yy)
        s.px[yy, xx] = col

    def _costado(self, pts, madera, franja, franja_t, seed):
        s = self.s
        im = Image.new("L", (s.w, s.h), 0)
        ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
        m = np.array(im) > 0
        lit = 4.2 if self.orient == "u" else 2.4
        for x in range(s.w):
            ys = np.nonzero(m[:, x])[0]
            if len(ys) == 0:
                continue
            y0, y1 = ys.min(), ys.max()
            n = y1 - y0 + 1
            for y in ys:
                t = (y - y0) / max(1, n - 1)          # 0 arriba, 1 agua
                strake = int(t * 4.0)
                base = lit - 1.2 - t * 1.5 + (hash2(x // 5, strake, seed) - 0.5) * 0.7
                if abs(t * 4.0 - round(t * 4.0)) < 0.13 and 0 < strake < 4:
                    base -= 1.1
                col = c("madera", int(np.floor(base * 0.6 + 0.5)))
                if t < 0.30:
                    col = c(franja, int(np.floor(franja_t * (lit / 3.2) + 0.5)))
                    if t < 0.07:
                        col = c("tierra", 5)
                s.px[y, x] = col

    # ---- piezas ----
    def mastil(self, a, z0, z1, ancho=2):
        for k in range(ancho):
            x0, y0 = self.P(a, 0, z0)
            x1, y1 = self.P(a, 0, z1)
            self.s.linea((x0 + k, y0), (x1 + k, y1), c("madera", 3 if k == 0 else 1))

    def vela_cuadrada(self, a, zy, ancho, alto, franjas, bulto=3.0, seed=1):
        """Vela cuadrada: yarda en z=zy, ancho en b, panel que cuelga con panza hacia +a."""
        s = self.s
        # yarda
        x0, y0 = self.P(a, -ancho / 2 - 2, zy)
        x1, y1 = self.P(a, ancho / 2 + 2, zy)
        s.linea((x0, y0), (x1, y1), c("madera", 3))
        s.linea((x0, y0 - 1), (x1, y1 - 1), c("madera", 4))
        ns, nt = 90, 70
        for i in range(ns):
            u_ = i / (ns - 1)
            b = -ancho / 2 + u_ * ancho
            for j in range(nt):
                v_ = j / (nt - 1)
                z = zy - v_ * alto
                # forma de trapecio: se estrecha abajo
                lim = 1.0 - 0.14 * v_
                if abs(b) > ancho / 2 * lim:
                    continue
                panza = bulto * np.sin(np.pi * v_ ** 0.8) * (1 - (2 * u_ - 1) ** 2 * 0.6)
                aa = a + panza
                # tono: cara hacia +a, inclinada
                pend = bulto * np.cos(np.pi * v_ ** 0.8) * 0.9
                luz = 3.6 + 0.8 * np.cos(u_ * np.pi * 1.2) - max(0.0, pend) * 0.25
                x, y = self.P(aa, b, z)
                banda = franjas[int(u_ * len(franjas) * 1.0) % len(franjas)]
                col = self._tela(banda, luz - (0 if self.orient == "u" else 0.8), u_, v_, seed)
                s.pset(x, y, col)
        # cabo de la base de la vela
        for i in range(0, ns, 1):
            pass

    def _tela(self, banda, luz, u_, v_, seed):
        """Franja limpia: 3 niveles de luz por la panza + costuras horizontales."""
        ramp, off = banda
        t = off + 3.4
        if u_ < 0.30:
            t += 0.9
        elif u_ > 0.68:
            t -= 1.5
        if self.orient != "u":
            t -= 0.8
        if v_ > 0.9:
            t -= 0.8
        if abs(v_ * 4 - round(v_ * 4)) < 0.045 and 0 < v_ < 1:
            t -= 0.9
        if (hash2(int(u_ * 60), int(v_ * 40), seed) > 0.985):
            t -= 0.6
        return c(ramp, int(np.floor(t + 0.5)))

    def vela_latina(self, a, zbase, zalta, largo, seed=1):
        """Vela triangular (latina): borde alto largo inclinado hacia popa."""
        s = self.s
        # antena inclinada
        p0 = self.P(a - largo * 0.5, 0, zbase)
        p1 = self.P(a + largo * 0.5, 0, zalta)
        s.linea(p0, p1, c("madera", 3))
        ns = 70
        for i in range(ns):
            f = i / (ns - 1)
            aa = a - largo * 0.5 + f * largo
            zt = zbase + (zalta - zbase) * f
            zb = zbase - 4 + (1 - f) * 2
            alto = zt - zb
            for j in range(int(alto * 2) + 1):
                z = zt - j * 0.5
                v_ = j / max(1, int(alto * 2))
                panza = 1.8 * np.sin(np.pi * v_) * (1 - abs(2 * f - 1) * 0.5)
                x, y = self.P(aa, panza * 0.3, z)
                luz = 5.0 - v_ * 0.9 - (1.2 if f > 0.62 else 0)
                if abs(v_ * 3 - round(v_ * 3)) < 0.06:
                    luz -= 0.8
                if self.orient != "u":
                    luz -= 1.0
                s.pset(x, y, c("piedra", int(np.floor(luz + 0.5))))

    def remos(self, n, lado=1, largo=14, z=2.5, paso=1.0, fase=0):
        L = self.L
        s = self.s
        for i in range(n):
            a = L * (0.22 + 0.58 * i / max(1, n - 1))
            b0 = self.beam(a) * 0.9 * lado
            x0, y0 = self.P(a, b0, z)
            x1, y1 = self.P(a + (-2 + 3 * np.sin(fase + i * 0.2)) , b0 + lado * largo, -1.0)
            s.linea((x0, y0), (x1, y1), c("madera", 3 if lado > 0 else 1))
            s.pset(x1, y1, c("madera", 4))

    def jarcia(self, a_mast, z_top, a_proa, z_proa, a_popa, z_popa):
        for (a, z) in ((a_proa, z_proa), (a_popa, z_popa)):
            x0, y0 = self.P(a_mast, 0, z_top)
            x1, y1 = self.P(a, 0, z)
            self.s.linea((x0, y0), (x1, y1), c("piedra", 3))

    def ojo(self, a, z=4.0):
        x, y = self.P(a, self.beam(a), z)
        self.s.pset(x, y, c("piedra", 6))
        self.s.pset(x + 1, y, c("agua", 3))

    def ancla_proa(self):
        pass

    def fin(self):
        self.s.contorno(-3)
        return self.s.recortar()


# ---------------------------------------------------------------- tipos
def galera(orient="u", fase=0.0):
    L = 60
    b = Barco(L, orient, 120, 110)
    b.casco(bw=4.6, zs0=5.5, zs_mid=3.2, proa=5.0, popa=5.0, franja="azul", franja_t=2.2, seed=2)
    # espolón de bronce
    x, y = b.P(L, 0, 1.5)
    x2, y2 = b.P(L + 7, 0, 0.5)
    b.s.linea((x, y), (x2, y2), c("oro", 1))
    b.s.pset(x2, y2, c("oro", 2))
    b.remos(7, 1, 12, fase=fase)
    b.mastil(L * 0.48, 4, 40)
    b.vela_cuadrada(L * 0.48, 38, 26, 20, [("piedra", 1.5), ("teja", 0.0), ("piedra", 1.5), ("tierra", 0.0)], bulto=3.4, seed=4)
    b.jarcia(L * 0.48, 40, L * 0.98, 8, L * 0.02, 8)
    b.ojo(L * 0.93, 3.6)
    # castillo de popa con toldillo
    ca = Barco  # noqa
    return b.fin()


def mercante(orient="u"):
    L = 46
    b = Barco(L, orient, 110, 110)
    b.casco(bw=7.0, zs0=8.5, zs_mid=6.0, proa=4.5, popa=5.5, franja="carmesi", franja_t=1.8, madera=("madera", 3), seed=5)
    # ánforas en cubierta
    for (a, bb) in ((14, 1.5), (18, -1.0), (22, 1.0), (26, -1.5)):
        x, y = b.P(a, bb, 7.2)
        for k in range(4):
            b.s.pset(x, y - k, c("teja", 3)) ; b.s.pset(x + 1, y - k, c("teja", 2))
        b.s.pset(x, y - 4, c("teja", 4))
    b.mastil(L * 0.45, 5, 46, 3)
    b.vela_cuadrada(L * 0.45, 44, 30, 26, [("teja", 1.2), ("piedra", 1.0)], bulto=4.0, seed=8)
    b.jarcia(L * 0.45, 46, L * 0.98, 12, L * 0.03, 12)
    b.ojo(L * 0.9, 5.5)
    # remo de gobierno en popa
    x, y = b.P(2, b.beam(2) + 1, 8)
    x2, y2 = b.P(-4, b.beam(2) + 1, -1)
    b.s.linea((x, y), (x2, y2), c("madera", 2))
    return b.fin()


def pesquero(orient="u"):
    L = 30
    b = Barco(L, orient, 90, 90)
    b.casco(bw=4.0, zs0=5.0, zs_mid=3.0, proa=3.5, popa=2.5, franja="piedra", franja_t=4.0, seed=9)
    b.mastil(L * 0.42, 3, 32, 2)
    b.vela_latina(L * 0.45, 6, 34, 34, seed=3)
    b.ojo(L * 0.92, 3.0)
    # redes y cajas
    x, y = b.P(8, 0, 3.5)
    for k in range(5):
        b.s.pset(x + k, y + k // 2, c("tierra", 3))
    return b.fin()
