"""Motor de sprites isométricos 2:1 (todo en índices de paleta, sin antialiasing).

Coordenadas 3D de sprite: (u, v, z) en píxeles de suelo (un tile = 16). u va hacia abajo-derecha,
v hacia abajo-izquierda, z hacia arriba. Proyección: x = u - v ; y = (u + v)/2 - z.
"""
import numpy as np
from PIL import Image, ImageDraw
from paleta import c, RAMPA_IDX, TRANSP, TINTA, largo
from util import hash2, fbm, LUT, smooth
from tablas import TABLA, RID, a_indice


def col(rampa, t):
    return c(rampa, int(np.floor(t + 0.5)))


def proj(u, v, z):
    return u - v, (u + v) / 2.0 - z


class Spr:
    def __init__(self, w, h, ax=0, ay=0):
        self.w, self.h = int(w), int(h)
        self.px = np.full((self.h, self.w), TRANSP, np.uint8)
        self.fid = np.zeros((self.h, self.w), np.int16)
        self.ax, self.ay = ax, ay          # píxel del sprite que corresponde a (u,v,z) = (0,0,0)

    # --- proyección ---
    def P(self, u, v, z=0.0):
        return self.ax + (u - v), self.ay + (u + v) / 2.0 - z

    # --- primitivas ---
    def pset(self, x, y, color, fid=None):
        x, y = int(x), int(y)
        if 0 <= x < self.w and 0 <= y < self.h:
            self.px[y, x] = color
            if fid is not None:
                self.fid[y, x] = fid

    def rect(self, x, y, w, h, color):
        x0, y0 = max(0, int(x)), max(0, int(y))
        x1, y1 = min(self.w, int(x + w)), min(self.h, int(y + h))
        if x1 > x0 and y1 > y0:
            self.px[y0:y1, x0:x1] = color

    def linea(self, p0, p1, color):
        img = Image.fromarray(self.px)
        ImageDraw.Draw(img).line([tuple(map(int, p0)), tuple(map(int, p1))], fill=int(color), width=1)
        self.px = np.array(img)

    def lineaz(self, a, b, color):
        """Línea entre dos puntos 3D."""
        self.linea(self.P(*a), self.P(*b), color)

    def poligono(self, pts, color):
        img = Image.fromarray(self.px)
        ImageDraw.Draw(img).polygon([tuple(p) for p in pts], fill=int(color))
        self.px = np.array(img)

    def elipse(self, cx, cy, rx, ry, color):
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        m = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1.0
        self.px[m] = color

    # --- cara plana con textura por función ---
    def cara(self, O, a, la, b, lb, fn, fid=1, mascara=None, ztest=None):
        """Parte de un punto 3D O con ejes 3D unitarios a, b y longitudes la, lb.
        fn(s, t, X, Y) devuelve índices de paleta (array). mascara(s, t) opcional."""
        ox, oy = self.P(*O)
        Ax, Ay = a[0] - a[1], (a[0] + a[1]) / 2.0 - a[2]
        Bx, By = b[0] - b[1], (b[0] + b[1]) / 2.0 - b[2]
        det = Ax * By - Ay * Bx
        if abs(det) < 1e-9:
            return
        xs = [ox + s * Ax + t * Bx for s in (0, la) for t in (0, lb)]
        ys = [oy + s * Ay + t * By for s in (0, la) for t in (0, lb)]
        x0, x1 = int(np.floor(min(xs))), int(np.ceil(max(xs)))
        y0, y1 = int(np.floor(min(ys))), int(np.ceil(max(ys)))
        X, Y = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        dx, dy = X + 0.5 - ox, Y + 0.5 - oy
        s = (dx * By - dy * Bx) / det
        t = (Ax * dy - Ay * dx) / det
        m = (s >= 0) & (s < la) & (t >= 0) & (t < lb)
        if mascara is not None:
            m &= mascara(s, t)
        m &= (X >= 0) & (X < self.w) & (Y >= 0) & (Y < self.h)
        if not m.any():
            return
        out = fn(s, t, X, Y)
        yy, xx = Y[m], X[m]
        self.px[yy, xx] = out[m] if hasattr(out, "shape") else out
        self.fid[yy, xx] = fid

    def tri_relleno(self, p0, p1, p2, fn, fid=1):
        """Triángulo en coords de sprite (píxeles). fn(X,Y)->índices."""
        xs = [p0[0], p1[0], p2[0]]
        ys = [p0[1], p1[1], p2[1]]
        x0, x1 = int(np.floor(min(xs))), int(np.ceil(max(xs)))
        y0, y1 = int(np.floor(min(ys))), int(np.ceil(max(ys)))
        X, Y = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        px, py = X + 0.5, Y + 0.5

        def e(a, b):
            return (px - a[0]) * (b[1] - a[1]) - (py - a[1]) * (b[0] - a[0])
        e0, e1, e2 = e(p0, p1), e(p1, p2), e(p2, p0)
        m = ((e0 >= 0) & (e1 >= 0) & (e2 >= 0)) | ((e0 <= 0) & (e1 <= 0) & (e2 <= 0))
        m &= (X >= 0) & (X < self.w) & (Y >= 0) & (Y < self.h)
        if not m.any():
            return
        out = fn(X, Y) if callable(fn) else fn
        self.px[Y[m], X[m]] = out[m] if hasattr(out, "shape") else out
        self.fid[Y[m], X[m]] = fid

    # --- efectos ---
    def contorno(self, delta=-3, solo_inferior=False, color=None):
        """Contorno selectivo: la casilla vacía junto a un píxel toma su color oscurecido."""
        op = self.px != TRANSP
        pad = np.pad(op, 1)
        vec = np.zeros_like(op)
        v0 = pad[1:-1, :-2] | pad[1:-1, 2:] | pad[:-2, 1:-1] | pad[2:, 1:-1]
        cand = (~op) & v0
        # color vecino: el del píxel opaco más 'bajo' (preferencia abajo, izquierda, derecha, arriba)
        pxp = np.pad(self.px, 1, constant_values=TRANSP)
        vecinos = [pxp[2:, 1:-1], pxp[1:-1, :-2], pxp[1:-1, 2:], pxp[:-2, 1:-1]]
        elegido = np.full_like(self.px, TRANSP)
        for vn in vecinos[::-1]:
            elegido = np.where(vn != TRANSP, vn, elegido)
        if color is not None:
            nuevo = np.full_like(self.px, color)
        else:
            nuevo = LUT[delta][np.where(elegido == TRANSP, 0, elegido)]
        self.px = np.where(cand, nuevo, self.px).astype(np.uint8)

    def volteado(self):
        s = Spr(self.w, self.h, self.w - 1 - self.ax, self.ay)
        s.px = self.px[:, ::-1].copy()
        s.fid = self.fid[:, ::-1].copy()
        return s

    def copiar(self):
        s = Spr(self.w, self.h, self.ax, self.ay)
        s.px = self.px.copy()
        s.fid = self.fid.copy()
        return s

    def pegar(self, otro, x, y):
        """Pega otro sprite con su esquina sup-izq en (x, y) del sprite."""
        h, w = otro.px.shape
        for yy in range(h):
            for xx in range(w):
                v = otro.px[yy, xx]
                if v != TRANSP:
                    self.pset(x + xx, y + yy, v)


# ---------------------------------------------------------------- texturas útiles
def tono_ramp(ramp, t):
    """t: array float de tonos -> índices."""
    return a_indice(np.full(t.shape, RID[ramp]), t)


def rampa_arr(ramp, t):
    return tono_ramp(ramp, t)


def _recortar(self):
    """Recorta al contenido y ajusta el ancla."""
    op = self.px != TRANSP
    if not op.any():
        return self
    ys, xs = np.where(op)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    s = Spr(x1 - x0, y1 - y0, self.ax - x0, self.ay - y0)
    s.px = self.px[y0:y1, x0:x1].copy()
    s.fid = self.fid[y0:y1, x0:x1].copy()
    return s


Spr.recortar = _recortar
