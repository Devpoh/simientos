"""Primitivas volumétricas para criaturas: elipsoides y cápsulas con luz arriba-izquierda,
sombra fría abajo-derecha y reflejo de rebote. Todo cuantizado a rampas de la paleta."""
import numpy as np
from paleta import c, TRANSP, TINTA
from util import hash2, fbm
from iso import Spr

LUZ = np.array([-0.52, -0.62, 0.59])
LUZ = LUZ / np.linalg.norm(LUZ)


def rampa(nombre_o_lista):
    if isinstance(nombre_o_lista, str):
        from paleta import RAMPA_IDX
        return list(RAMPA_IDX[nombre_o_lista])
    return list(nombre_o_lista)


class Lienzo:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = np.full((h, w), TRANSP, np.uint8)
        self.yy, self.xx = np.mgrid[0:h, 0:w]
        self.xc = self.xx + 0.5
        self.yc = self.yy + 0.5

    # ---- sombreado común ----
    def _pintar(self, mask, nx, ny, nz, rmp, base, rango, tex=0.0, seed=0, borde=None, oscuro=0.0):
        lum = nx * LUZ[0] + ny * LUZ[1] + nz * LUZ[2]
        t = base + (lum - 0.42) * rango - oscuro
        # reflejo de rebote frío-cálido en el borde inferior-derecho
        rim = (nx * 0.55 + ny * 0.7) > 0.78
        t = np.where(rim & (lum < 0.3), t + 0.55, t)
        if tex:
            n = fbm(self.xx * 0.55 + seed, self.yy * 0.9, 2, seed) - 0.5
            t = t + n * tex
        idx = np.clip(np.floor(t + 0.5).astype(int), 0, len(rmp) - 1)
        arr = np.array(rmp, np.uint8)[idx]
        self.p[mask] = arr[mask]

    def elipsoide(self, cx, cy, rx, ry, rmp, base, rango=3.4, ang=0.0, tex=0.0, seed=0, oscuro=0.0):
        rmp = rampa(rmp)
        dx, dy = self.xc - cx, self.yc - cy
        ca, sa = np.cos(ang), np.sin(ang)
        u = (dx * ca + dy * sa) / rx
        v = (-dx * sa + dy * ca) / ry
        d2 = u * u + v * v
        mask = d2 <= 1.0
        nz = np.sqrt(np.clip(1 - d2, 0, 1))
        # normal en coordenadas de pantalla
        nxl, nyl = u, v
        nx = nxl * ca - nyl * sa
        ny = nxl * sa + nyl * ca
        self._pintar(mask, nx, ny, nz, rmp, base, rango, tex, seed, oscuro=oscuro)

    def capsula(self, x0, y0, x1, y1, r0, r1, rmp, base, rango=3.4, tex=0.0, seed=0, oscuro=0.0):
        rmp = rampa(rmp)
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy + 1e-9
        t = np.clip(((self.xc - x0) * dx + (self.yc - y0) * dy) / L2, 0, 1)
        cx = x0 + t * dx
        cy = y0 + t * dy
        r = r0 + t * (r1 - r0)
        ux = (self.xc - cx) / r
        uy = (self.yc - cy) / r
        d2 = ux * ux + uy * uy
        mask = d2 <= 1.0
        nz = np.sqrt(np.clip(1 - d2, 0, 1))
        self._pintar(mask, ux, uy, nz, rmp, base, rango, tex, seed, oscuro=oscuro)

    def poli(self, pts, rmp, base, rango=2.0, grad=(0, 1), tex=0.0, seed=0):
        """Polígono plano con degradado suave según la dirección `grad`."""
        from PIL import Image, ImageDraw
        rmp = rampa(rmp)
        im = Image.new("L", (self.w, self.h), 0)
        ImageDraw.Draw(im).polygon([tuple(p) for p in pts], fill=255)
        mask = np.array(im) > 0
        ys, xs = np.nonzero(mask)
        if len(ys) == 0:
            return
        g = (self.xc * grad[0] + self.yc * grad[1])
        gm = g[mask]
        g = (g - gm.min()) / max(1e-6, gm.max() - gm.min())
        t = base + (0.5 - g) * rango
        if tex:
            t = t + (fbm(self.xx * 0.5 + seed, self.yy * 0.8, 2, seed) - 0.5) * tex
        idx = np.clip(np.floor(t + 0.5).astype(int), 0, len(rmp) - 1)
        arr = np.array(rmp, np.uint8)[idx]
        self.p[mask] = arr[mask]

    def curva(self, pts, r0, r1, rmp, base, rango=3.0, n=24):
        """Cápsula afilada a lo largo de una trayectoria suave (cuernos, colas...)."""
        pts = np.array(pts, float)
        for k in range(len(pts) - 1):
            a, b = pts[k], pts[k + 1]
            fa, fb = k / (len(pts) - 1), (k + 1) / (len(pts) - 1)
            self.capsula(a[0], a[1], b[0], b[1], r0 + (r1 - r0) * fa, r0 + (r1 - r0) * fb, rmp, base, rango)

    def pt(self, x, y, col):
        x, y = int(x), int(y)
        if col is not None and 0 <= x < self.w and 0 <= y < self.h:
            self.p[y, x] = col

    def r(self, x, y, w, h, col):
        for yy in range(int(y), int(y + h)):
            for xx in range(int(x), int(x + w)):
                self.pt(xx, yy, col)

    def linea(self, x0, y0, x1, y1, col):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for k in range(n + 1):
            f = k / max(1, n)
            self.pt(round(x0 + (x1 - x0) * f), round(y0 + (y1 - y0) * f), col)

    def pelaje(self, mask_rampa_idx, claro, oscuro, densidad=0.08, seed=1, largo=2):
        """Mechones: trazos cortos claros/oscuros sobre los píxeles de los colores dados."""
        ids = set(int(i) for i in mask_rampa_idx)
        ys, xs = np.nonzero(self.p != TRANSP)
        for y, x in zip(ys, xs):
            if int(self.p[y, x]) not in ids:
                continue
            h = hash2(x, y, seed)
            if h < densidad:
                for k in range(largo):
                    self.pt(x + k // 2 + 0, y + k, oscuro)
            elif h > 1 - densidad * 0.7:
                self.pt(x, y, claro)

    def a_sprite(self, ax, ay, contorno=True, voltear=False, delta=-3):
        s = Spr(self.w, self.h, ax, ay)
        s.px = self.p.copy()
        if contorno:
            s.contorno(delta)
        if voltear:
            s = s.volteado()
        return s
