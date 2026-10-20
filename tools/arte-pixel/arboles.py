"""Árboles mediterráneos, arbustos y rocas en pixel art (luz desde arriba a la izquierda)."""
import numpy as np
from paleta import c, TRANSP, TINTA
from util import hash2, fbm
from iso import Spr


def _disco(s, cx, cy, rx, ry, rampa, base, seed, hoja=0.62, claro=1.0, oscuro=1.0):
    """Mancha de follaje con luz arriba-izquierda y borde inferior oscuro."""
    y0, y1 = int(cy - ry - 1), int(cy + ry + 2)
    x0, x1 = int(cx - rx - 1), int(cx + rx + 2)
    for y in range(y0, y1):
        for x in range(x0, x1):
            dx = (x + 0.5 - cx) / rx
            dy = (y + 0.5 - cy) / ry
            d2 = dx * dx + dy * dy
            if d2 > 1.0:
                continue
            luz = -(dx * 0.60 + dy * 0.80)            # +1 arriba-izquierda
            t = base + luz * 1.55
            n = fbm(x * 0.55 + seed, y * 0.75, 2, seed)
            if n > hoja:
                t += 0.9 * claro
            elif n < 0.30:
                t -= 0.8 * oscuro
            if d2 > 0.70 and luz < -0.1:
                t -= 0.8
            s.pset(x, y, c(rampa, int(np.floor(t + 0.5))))


def _tronco(s, x, y_base, h, ancho=2, tono=2, curva=0):
    for k in range(h):
        xx = x + int(round(curva * k / max(1, h)))
        for i in range(ancho):
            t = tono + 1 if i == 0 else (tono - 1 if i == ancho - 1 else tono)
            s.pset(xx + i, y_base - k, c("madera", t))


def ciprés(seed=1, alto=34):
    w = 14
    s = Spr(w, alto + 6, w // 2, alto + 3)
    cx = w / 2
    _tronco(s, int(cx) - 1, alto + 3, 4, 2, 2)
    # llama alargada: varias elipses apiladas
    n = 6
    for i in range(n):
        f = i / (n - 1)
        cy = alto - 2 - f * (alto - 8)
        rx = 4.8 - abs(f - 0.35) * 5.2 + 0.4
        ry = 5.6 + (1 - f) * 2.0
        _disco(s, cx, cy, max(2.6, rx), ry, "hierba", 1.6 + (1 - f) * 0.6, seed + i, hoja=0.6)
    s.contorno(-3)
    return s.recortar_anclado(w // 2, alto + 3)


def pino(seed=1):
    """Pino piñonero (parasol): tronco curvo y copa plana en varias masas."""
    w, h = 34, 40
    s = Spr(w, h, 17, 37)
    _tronco(s, 16, 36, 22, 3, 2, curva=(seed % 3) - 1)
    rng = np.random.default_rng(seed)
    masas = [(10, 12, 8, 4.6), (22, 11, 9, 4.8), (16, 7, 9.5, 5), (8, 8, 6, 3.8), (25, 8, 6, 3.6)]
    for i, (mx, my, rx, ry) in enumerate(masas):
        _disco(s, mx + (rng.random() - 0.5) * 2, my, rx, ry, "hierba", 2.1, seed + i * 5, hoja=0.58)
    s.contorno(-3)
    return s.recortar_anclado(17, 37)


def encina(seed=1, tam=1.0):
    w, h = int(34 * tam), int(34 * tam)
    s = Spr(w, h, w // 2, h - 3)
    _tronco(s, w // 2 - 1, h - 4, int(9 * tam), 3, 2)
    rng = np.random.default_rng(seed)
    cx = w / 2
    for i, (dx, dy, rx, ry) in enumerate([(-6, 0, 7, 6), (6, 1, 7, 6), (0, -6, 9, 7), (-4, -9, 6, 5), (5, -8, 6, 5), (0, -12, 6, 4.5)]):
        _disco(s, cx + dx * tam + (rng.random() - 0.5), h * 0.52 + dy * tam, rx * tam, ry * tam, "hierba", 2.7, seed + i * 7,
               hoja=0.60)
    s.contorno(-3)
    return s.recortar_anclado(w // 2, h - 3)


def olivo(seed=1):
    """Olivo: tronco retorcido y copa gris-verdosa con destellos claros."""
    w, h = 28, 26
    s = Spr(w, h, 14, 23)
    # tronco nudoso
    for k in range(10):
        xx = 13 + int(round(1.5 * np.sin(k * 0.7 + seed)))
        for i in range(3):
            s.pset(xx + i, 22 - k, c("madera", 2 if i == 1 else (3 if i == 0 else 1)))
    s.pset(11, 22, c("madera", 1)); s.pset(17, 22, c("madera", 1))
    rng = np.random.default_rng(seed + 3)
    for i, (dx, dy, rx, ry) in enumerate([(-5, 0, 6, 5), (5, 1, 6, 5), (0, -4, 8, 6), (-3, -7, 5, 4), (4, -6, 5, 4)]):
        _disco(s, 14 + dx, 10 + dy, rx, ry, "hierba", 3.0, seed + i * 3, hoja=0.55, claro=1.3)
    # puntos plateados
    for _ in range(14):
        x, y = int(rng.integers(5, 23)), int(rng.integers(2, 17))
        if s.px[y, x] != TRANSP:
            s.pset(x, y, c("hierba", 6))
    s.contorno(-3)
    return s.recortar_anclado(14, 23)


def arbusto(seed=1, tam=1.0):
    w, h = int(16 * tam), int(11 * tam)
    s = Spr(w, h, w // 2, h - 1)
    for i, (dx, dy, rx, ry) in enumerate([(-3, 0, 4.5, 3.5), (3, 0, 4.5, 3.5), (0, -2, 5, 3.8)]):
        _disco(s, w / 2 + dx * tam, h * 0.55 + dy * tam, rx * tam, ry * tam, "hierba", 2.3, seed + i, hoja=0.6)
    s.contorno(-3)
    return s.recortar_anclado(w // 2, h - 1)


def roca(seed=1, tam=1.0, musgo=True):
    """Roca facetada: cara superior clara, cara izquierda cálida, cara derecha fría."""
    w, h = int(22 * tam), int(16 * tam)
    s = Spr(w, h, w // 2, h - 2)
    rng = np.random.default_rng(seed)
    cx, cy = w / 2, h - 3
    pts = []
    n = 9
    for i in range(n):
        a = np.pi + i * np.pi / (n - 1)
        r = (9 + rng.random() * 3) * tam
        pts.append((cx + np.cos(a) * r, cy + np.sin(a) * r * 0.95 * (0.8 + rng.random() * 0.25)))
    yy, xx = np.mgrid[0:h, 0:w]
    # relleno por polígono usando PIL
    from PIL import Image, ImageDraw
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).polygon([(x, y) for x, y in pts] + [(cx + 9 * tam, cy), (cx - 9 * tam, cy)], fill=255)
    m = np.array(im) > 0
    # cuerpo bajo (borde inferior plano)
    for y in range(h):
        for x in range(w):
            if not m[y, x]:
                continue
            dx = (x + 0.5 - cx) / (9.5 * tam)
            dy = (y + 0.5 - (cy - 3 * tam)) / (7 * tam)
            luz = -(dx * 0.65 + dy * 0.75)
            t = 1.6 + luz * 1.7 + (hash2(x // 2, y // 2, seed) - 0.5) * 0.7
            if dy > 0.55:
                t -= 0.9
            col = c("roca", int(np.floor(t + 0.5)))
            s.pset(x, y, col)
    # grietas
    for _ in range(2):
        x, y = int(cx + (rng.random() - 0.5) * 8 * tam), int(cy - rng.random() * 6 * tam)
        for k in range(3):
            if s.px[min(h - 1, y + k), min(w - 1, x + k // 2)] != TRANSP:
                s.pset(x + k // 2, y + k, c("roca", 0))
    if musgo:
        for x in range(w):
            for y in range(h):
                if s.px[y, x] != TRANSP and y < cy - 4 * tam and hash2(x, y, seed + 9) > 0.62:
                    s.pset(x, y, c("hierba", 3 if x < cx else 2))
    s.contorno(-3)
    return s.recortar_anclado(w // 2, h - 2)


# recorte que conserva un ancla en coords antiguas
def _rec(self, ax, ay):
    op = self.px != TRANSP
    ys, xs = np.where(op)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    r = Spr(x1 - x0, y1 - y0, ax - x0, ay - y0)
    r.px = self.px[y0:y1, x0:x1].copy()
    r.fid = self.fid[y0:y1, x0:x1].copy()
    return r


Spr.recortar_anclado = _rec
