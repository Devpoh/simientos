"""Animación de la escena: 48 fotogramas a 12 fps (4 s) en bucle perfecto."""
import numpy as np
import terreno as T
from terreno import tp, SW, SH
from escena import Objeto
from paleta import c, TRANSP, PALETA_RGB
from util import LUT, hash2
from render import bayer
import personajes as PE
import personajes_extra as PX
import mitologicos as MY
import animales as AN
import props as PR
import barcos as BA
import edificios2 as E2
from iso import Spr

FR = 120
FPS = 30


def ajusta(n, v):
    """Duración (en fotogramas) de cada cuadro de un ciclo de n cuadros que encaja en el bucle de FR."""
    cands = [x for x in range(1, 61) if FR % (n * x) == 0]
    return min(cands, key=lambda x: abs(x - v))

_PERS = {}


def persona(tipo, wf, pose, espaldas, flip, mujer, variante):
    k = (tipo, wf, pose, espaldas, flip, mujer, str(variante))
    if k not in _PERS:
        _PERS[k] = PE.persona(tipo, wf, pose, espaldas=espaldas, voltear=flip, mujer=mujer, variante=variante)
    return _PERS[k]


class Ruta:
    """Camino en coordenadas de tile con altura; se recorre por parámetro s en [0, 1]."""

    def __init__(self, pts):
        self.p = [(tp(u, v)[0], tp(u, v)[1], h) for (u, v, h) in pts]
        sc = [(x, y - h) for x, y, h in self.p]
        self.l = [0.0]
        for a, b in zip(sc[:-1], sc[1:]):
            self.l.append(self.l[-1] + float(np.hypot(b[0] - a[0], b[1] - a[1])))
        self.long = self.l[-1] or 1.0

    def en(self, s):
        d = min(max(s, 0.0), 1.0) * self.long
        for i in range(len(self.p) - 1):
            if d <= self.l[i + 1] or i == len(self.p) - 2:
                seg = max(1e-6, self.l[i + 1] - self.l[i])
                f = (d - self.l[i]) / seg
                a, b = self.p[i], self.p[i + 1]
                return (a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f)
        return self.p[-1]


def vaiven(f, fase=0.0):
    """Parámetro de ida y vuelta (continuo en el bucle) y sentido de marcha."""
    t = (f / FR + fase) % 1.0
    return 1 - abs(2 * t - 1), (1 if t < 0.5 else -1)


def facing(ruta, s, sentido):
    a = ruta.en(s)
    b = ruta.en(min(1.0, max(0.0, s + 0.02 * sentido)))
    dx = b[0] - a[0]
    dy = (b[1] - b[2]) - (a[1] - a[2])
    return dx < 0, dy < 0


# --------------------------------------------------------------------- construcción del reparto
def reparto(e):
    """Devuelve la lista de actores: funciones f -> lista de (Objeto, blob|None)."""
    A = []
    prof_templo = tp(12, 4)[1] + 80

    def blob_pie(gx, gy, h, rx=5, ry=1.8):
        return (gx + 3, gy - h + 1, rx, ry, 2)

    def caminante(tipo, pts, fase=0.0, mujer=False, carga=None, variante=None, prof=None, ztest=True, anim=2):
        ruta = Ruta(pts)

        def f_(f):
            s, sen = vaiven(f, fase)
            gx, gy, h = ruta.en(s)
            flip, esp = facing(ruta, s, sen)
            wf = (f // ajusta(6, anim * 2.5)) % 6
            if carga:
                spr = PX.cargando(tipo, wf, carga, mujer, flip, esp, variante)
            else:
                spr = persona(tipo, wf, "caminar", esp, flip, mujer, variante)
            o = Objeto(spr, gx, gy, h, (gy if prof is None else prof), ztest)
            return [(o, blob_pie(gx, gy, h))]
        A.append(f_)

    def obrero(tipo, u, v, h, pose, n=4, vel=3, mujer=False, esp=False, flip=False, variante=None, prof=None, ztest=True, fase=0):
        gx, gy = tp(u, v)

        def f_(f):
            wf = ((f + fase) // ajusta(n, vel * 2.5)) % n
            spr = persona(tipo, wf, pose, esp, flip, mujer, variante)
            o = Objeto(spr, gx, gy, h, (gy if prof is None else prof), ztest)
            return [(o, blob_pie(gx, gy, h))]
        A.append(f_)

    def rezando(u, v, h, mujer=True, flip=False):
        gx, gy = tp(u, v)

        def f_(f):
            spr = PX.arrodillado(mujer, (f // 30) % 2, flip)
            return [(Objeto(spr, gx, gy, h, gy, True), blob_pie(gx, gy, h))]
        A.append(f_)

    def criatura(fn, pts, fase=0.0, vel=3, n=4, **kw):
        ruta = Ruta(pts)
        cache = {}

        def f_(f):
            s, sen = vaiven(f, fase)
            gx, gy, h = ruta.en(s)
            flip, esp = facing(ruta, s, sen)
            fr = (f // ajusta(n, vel * 2.5)) % n
            k = (fr, flip)
            if k not in cache:
                cache[k] = fn(frame=fr, pose="caminar", voltear=flip, **kw)
            o = Objeto(cache[k], gx, gy, h, gy, True)
            return [(o, blob_pie(gx, gy, h, 9, 2.6))]
        A.append(f_)

    def animal(fn, u, v, h=6.0, fase=0, vel=8, flip=False, pose="pastar", **kw):
        gx, gy = tp(u, v)
        cache = {}

        def f_(f):
            fr = ((f + fase) // ajusta(2, vel * 2.5)) % 2
            k = (fr, flip)
            if k not in cache:
                cache[k] = fn(frame=fr, pose=pose, voltear=flip, **kw)
            o = Objeto(cache[k], gx, gy, h, gy, True)
            return [(o, (gx + 4, gy - h + 1, 9, 2.4, 2))]
        A.append(f_)

    def animal_ruta(fn, pts, fase=0.0, pose="caminar", n=4, vel=3, **kw):
        ruta = Ruta(pts)
        cache = {}

        def f_(f):
            s, sen = vaiven(f, fase)
            gx, gy, h = ruta.en(s)
            flip, esp = facing(ruta, s, sen)
            fr = (f // ajusta(n, vel * 2.5)) % n
            k = (fr, flip)
            if k not in cache:
                cache[k] = fn(frame=fr, pose=pose, voltear=flip, **kw)
            return [(Objeto(cache[k], gx, gy, h, gy, True), (gx + 4, gy - h + 1, 9, 2.4, 2))]
        A.append(f_)

    V = lambda piel, pelo: {"piel": piel, "pelo": pelo}

    # ------------------------------------------------------------ obra del templo (12,4)
    obrero("artesano", 14.94, 8.94, 22, "martillar", esp=True, flip=False, prof=prof_templo + 1, ztest=False)
    obrero("artesano", 15.9, 8.94, 38, "martillar", esp=True, flip=True, fase=2, prof=prof_templo + 1, ztest=False, variante=V("tez", "negro"))
    obrero("artesano", 15.8, 9.5, 6, "martillar", esp=True, flip=True, fase=1, variante=V("claro", "castano"))
    caminante("artesano", [(17.6, 7.4, 6), (16.2, 9.5, 6)], 0.0, carga="saco")
    caminante("campesino", [(17.8, 8.2, 6), (16.6, 10.0, 6)], 0.45, carga="saco", variante=V("tez", "castano"))
    criatura(MY.minotauro, [(17.4, 5.2, 6), (17.4, 7.1, 6)], 0.0, vel=3, n=4, carga=True)
    # altar y oración
    obrero("sacerdote", 11.5, 9.7, 6, "idle", n=1, vel=1, flip=True)
    rezando(10.3, 10.0, 6, True, False)
    rezando(10.9, 10.2, 6, False, False)

    # ------------------------------------------------------------ mercado
    for (u, v, t, mj) in ((10.6, 10.95, "comerciante", False), (16.2, 10.95, "comerciante", True),
                          (11.2, 13.2, "comerciante", True), (13.7, 13.2, "comerciante", False), (16.2, 13.2, "comerciante", True)):
        obrero(t, u, v, 6, "comerciar", vel=6, flip=True, mujer=mj, fase=int(u * 3))
    caminante("campesino", [(10.2, 12.2, 6), (12.0, 12.1, 6)], 0.0, mujer=True, carga="cesta")
    caminante("artesano", [(13.3, 12.3, 6), (15.2, 12.2, 6)], 0.3, variante=V("claro", "rubio"))
    caminante("comerciante", [(16.7, 11.6, 6), (16.7, 13.0, 6)], 0.6, mujer=True, carga="anfora")
    caminante("comerciante", [(9.6, 12.4, 6), (9.5, 11.2, 6)], 0.2)
    A.append(("satiro", 15.5, 12.2))

    # ------------------------------------------------------------ calles
    caminante("campesino", [(3.6, 4.0, 6), (3.8, 6.0, 6)], 0.0, variante=V("tez", "castano"))
    caminante("campesino", [(4.0, 9.2, 6), (4.0, 11.3, 6)], 0.5, mujer=True, carga="cesta")
    caminante("artesano", [(8.4, 4.4, 6), (8.5, 6.6, 6)], 0.1, carga="saco", variante=V("claro", "negro"))
    caminante("comerciante", [(8.5, 9.6, 6), (8.5, 11.8, 6)], 0.4, mujer=True, carga="anfora")
    caminante("comerciante", [(6.2, 8.9, 6), (8.1, 8.7, 6)], 0.7)
    caminante("artesano", [(3.7, 12.5, 6), (3.9, 14.0, 6)], 0.25, mujer=True)
    caminante("campesino", [(8.6, 12.6, 6), (8.5, 14.0, 6)], 0.65, mujer=True, variante=V("claro", "pelirrojo"))
    # patrulla de soldados por la calle este del templo
    for i in range(5):
        caminante("soldado", [(18.4, 3.4, 6), (18.35, 6.2, 6)], 0.0 + i * 0.03, mujer=(i == 2), anim=2)
    caminante("sacerdote", [(18.5, 7.0, 6), (18.5, 9.4, 6)], 0.5)
    # distrito este
    caminante("campesino", [(21.0, 5.6, 6), (23.2, 5.6, 6)], 0.2, mujer=True, carga="anfora")
    caminante("artesano", [(21.2, 9.4, 6), (23.4, 9.5, 6)], 0.55, carga="caja")
    caminante("comerciante", [(20.0, 4.8, 6), (20.0, 6.2, 6)], 0.8)
    # puente: sube a la cubierta (h = 2 + 12)
    prof_puente = tp(24.6, 10.1)[1] + 8 * 5.4
    caminante("campesino", [(24.0, 10.85, 6), (25.3, 10.85, 14), (27.9, 10.85, 14), (29.2, 10.85, 6)], 0.0, mujer=True,
              prof=prof_puente + 1, ztest=False, variante=V("tez", "negro"))
    caminante("comerciante", [(24.0, 10.7, 6), (25.3, 10.7, 14), (27.9, 10.7, 14), (29.2, 10.7, 6)], 0.5, carga="saco",
              prof=prof_puente + 1, ztest=False)

    # ------------------------------------------------------------ puerto
    caminante("artesano", [(11.45, 15.3, 3), (11.45, 18.3, 3)], 0.0, carga="caja", ztest=False)
    caminante("campesino", [(11.5, 15.3, 3), (11.5, 18.3, 3)], 0.5, carga="saco", ztest=False)
    caminante("artesano", [(15.85, 15.3, 3), (15.85, 18.6, 3)], 0.25, carga="caja", ztest=False, mujer=True)
    obrero("campesino", 5.05, 18.0, 3, "idle", n=1, vel=1, flip=True, ztest=False)
    obrero("campesino", 20.45, 17.0, 3, "idle", n=1, vel=1, mujer=True, ztest=False)
    caminante("artesano", [(18.8, 14.5, 6), (20.8, 14.5, 6)], 0.3, carga="caja")
    caminante("comerciante", [(5.0, 14.6, 6), (7.0, 14.5, 6)], 0.1)
    caminante("campesino", [(13.3, 14.5, 6), (15.0, 14.5, 6)], 0.6, mujer=True, carga="cesta")

    # ------------------------------------------------------------ campos y granja
    obrero("campesino", 31.0, 3.0, 6, "cultivar", vel=4, variante=V("tez", "negro"))
    obrero("campesino", 32.6, 3.9, 6, "cultivar", vel=4, fase=5, variante=V("claro", "castano"))
    obrero("campesino", 30.6, 2.4, 6, "cultivar", vel=4, fase=9, mujer=True, variante=V("tez", "negro"))
    caminante("campesino", [(30.0, 5.1, 6), (31.8, 5.2, 6)], 0.3, mujer=True, carga="cesta")
    obrero("campesino", 31.2, 13.2, 6, "cultivar", vel=4, fase=3, variante=V("tez", "castano"))
    obrero("campesino", 32.7, 13.8, 6, "idle", n=1, vel=1, mujer=True)
    caminante("campesino", [(35.0, 9.8, 6), (36.8, 9.9, 6)], 0.2, carga="saco", variante=V("claro", "pelirrojo"))
    # pradera: vacas, caballos, ovejas, gallinas
    animal(AN.vaca, 30.0, 6.9, fase=0)
    animal(AN.vaca, 32.2, 8.3, fase=4, flip=True)
    animal(AN.vaca, 29.8, 8.8, fase=2, tipo="roja")
    animal(AN.caballo, 31.7, 6.4, fase=6)
    animal_ruta(AN.caballo, [(30.4, 8.9, 6), (32.4, 8.7, 6)], 0.0, pose="caminar", vel=3, n=4, capa="blanco")
    for i, (u, v) in enumerate(((29.6, 6.2), (30.5, 7.7), (31.3, 5.9), (32.6, 7.0), (29.9, 7.3))):
        animal(AN.oveja, u, v, fase=i * 3, vel=6, flip=(i % 2 == 0))
    animal_ruta(AN.oveja, [(31.0, 7.4, 6), (32.3, 6.4, 6)], 0.2, vel=4, n=4)
    for i, (u, v) in enumerate(((36.3, 7.5), (37.0, 7.9), (36.6, 8.4))):
        animal(AN.gallina, u, v, fase=i * 2, vel=5, flip=(i == 1), tipo="roja" if i == 2 else "blanca")
    # criaturas mitológicas: centauro de patrulla y sátiro en la plaza
    criatura(MY.centauro, [(28.4, 10.4, 6), (30.4, 10.3, 6)], 0.0, vel=2, n=4)
    return A


# --------------------------------------------------------------------- composición de un fotograma
def smoke(img, e, f):
    yy_, xx_ = np.mgrid[0:SH, 0:SW]
    for i, (sx, sy) in enumerate(e.chimeneas):
        for j in range(5):
            age = ((f / (FR / 2.0)) + j / 5.0 + i * 0.137) % 1.0
            cx = sx + 4.5 * age + 2.0 * np.sin(age * 5 + i)
            cy = sy - 26 * age
            r = 1.3 + 3.2 * age
            alpha = max(0.0, 1.0 - age) * 0.95
            x0, x1 = int(cx - r - 1), int(cx + r + 2)
            y0, y1 = int(cy - r - 1), int(cy + r + 2)
            if x1 <= 0 or y1 <= 0 or x0 >= SW or y0 >= SH:
                continue
            xs = np.arange(max(0, x0), min(SW, x1))
            ys = np.arange(max(0, y0), min(SH, y1))
            X, Y = np.meshgrid(xs, ys)
            m = ((X + 0.5 - cx) ** 2 + (Y + 0.5 - cy) ** 2 <= r * r) & (bayer(X, Y) < alpha)
            col = c("piedra", 5) if age < 0.55 else c("piedra", 4)
            col2 = c("piedra", 6) if age < 0.3 else col
            Xs = X[m]; Ys = Y[m]
            img[Ys, Xs] = np.where(((Xs + Ys) % 3 == 0), col2, col)


def gaviotas(img, e, f):
    gx, gy = e.faro_pos
    for k in range(4):
        ang = 2 * np.pi * ((f / FR) + k * 0.25)
        x = gx + 120 * np.cos(ang) + 20 * k
        y = gy - 110 + 34 * np.sin(ang) + 12 * np.sin(k * 2.0 + ang * 2)
        flip = np.cos(ang + np.pi / 2) < 0
        g = PX.gaviota((f // 5 + k) % 2, flip)
        x0, y0 = int(x - g.ax), int(y - g.ay)
        for yy in range(g.h):
            for xx in range(g.w):
                v = g.px[yy, xx]
                if v != TRANSP and 0 <= x0 + xx < SW and 0 <= y0 + yy < SH:
                    img[y0 + yy, x0 + xx] = v


def faro_luz(img, e, f):
    """Linterna que parpadea, halo y haz que barre el mar."""
    lx, ly = e.linterna
    # parpadeo del cristal
    col = c("piedra", 6) if (f // 8) % 2 == 0 else c("tierra", 6)
    for dy in range(-4, 5):
        for dx in range(-2, 3):
            if 0 <= lx + dx < SW and 0 <= ly + dy < SH and img[ly + dy, lx + dx] in (c("tierra", 6), c("oro", 2), c("oro", 1)):
                img[ly + dy, lx + dx] = col
    yy, xx = np.mgrid[0:SH, 0:SW]
    dx, dy = xx + 0.5 - lx, yy + 0.5 - ly
    dist = np.hypot(dx, dy)
    # halo
    halo = (dist < 14) & (bayer(xx, yy) < (1 - dist / 14.0) * 0.8)
    # haz que oscila hacia el mar (abajo-izquierda)
    th0 = np.radians(135.0)
    th = th0 + np.radians(55.0) * np.sin(2 * np.pi * f / FR)
    gx_, gy_ = dx, dy * 2.0                      # des-comprime el eje vertical (suelo)
    ang = np.arctan2(gy_, gx_)
    dang = np.abs(np.arctan2(np.sin(ang - th), np.cos(ang - th)))
    haz = (dang < np.radians(7)) & (dist > 6) & (dist < 150) & (bayer(xx, yy) < (1 - dist / 150.0) * 0.85 * (1 - dang / np.radians(7)))
    m = halo | haz
    nuevo = np.where(haz & ~halo, LUT[2][img], LUT[2][img])
    img[m] = nuevo[m]


def reflejo(spr, orient):
    """Reflejo oscurecido de un barco sobre el agua (doble sprite invertido respecto a la quilla)."""
    pend = 0.5 if orient == "u" else -0.5
    H, W = spr.px.shape
    out = np.full((H + 40, W), TRANSP, np.uint8)
    for x in range(W):
        yw = spr.ay + pend * (x - spr.ax)
        for y in range(H):
            v = spr.px[y, x]
            if v == TRANSP or y >= yw:
                continue
            ym = int(round(2 * yw - y))
            if 0 <= ym < H + 40 and (x + ym) % 2 == 0 and ym - yw < 26:
                lum = PALETA_RGB[v].astype(int).sum() / 765.0
                out[ym, x] = c("agua", int(min(4, 0.6 + lum * 4.5)))
    s = Spr(W, H + 40, spr.ax, spr.ay)
    s.px = out
    return s


def pegar_sobre_agua(img, e, spr, x0, y0, desp=0):
    h, w = spr.px.shape
    for yy in range(h):
        for xx in range(w):
            v = spr.px[yy, xx]
            if v == TRANSP:
                continue
            sx = x0 + xx + (1 if (yy // 2 + desp) % 3 == 0 else 0)
            sy = y0 + yy
            if 0 <= sx < SW and 0 <= sy < SH:
                gy = e.base.gyh[sy, sx]
                if e.base.agua[sy, sx]:
                    img[sy, sx] = v


def render_frame(e, f, reparto_fns, estaticos):
    k = (f // 5) % 4
    t = f / FR
    objs = []
    blobs = []
    # actores
    for fn in reparto_fns:
        if isinstance(fn, tuple):          # sátiro (marcador)
            _, u, v = fn
            gx, gy = tp(u, v)
            spr = MY.satiro(frame=(f // 10) % 2, pose="tocar", voltear=True)
            objs.append(Objeto(spr, gx, gy, 6, gy, True))
            blobs.append((gx + 3, gy - 6 + 1, 5, 1.8, 2))
            continue
        for (o, bl) in fn(f):
            objs.append(o)
            if bl:
                blobs.append(bl)
    # barcos: vaivén y deriva + reflejo
    barcos_o = []
    refl = []
    for (spr, u0, v0, L, orient, nombre, ph, A_) in e.barcos_anim:
        d = A_ * np.sin(2 * np.pi * (t + ph))
        du, dv = (d / 16.0, 0) if orient == "u" else (0, d / 16.0)
        gx, gy = tp(u0 + du, v0 + dv)
        bob = int(round(1.0 * np.sin(2 * np.pi * (2 * t + ph))))
        o = Objeto(spr, gx, gy + 0, 0.0, gy + L / 2 + 6, False)
        o.dy = bob
        barcos_o.append(o)
        refl.append((e.reflejos[nombre], gx, gy, bob))
    img = e.fondo(k, blobs)
    # reflejos y espuma de los barcos (sobre el agua, bajo los cascos)
    for (rsp, gx, gy, bob) in refl:
        pegar_sobre_agua(img, e, rsp, int(round(gx - rsp.ax)), int(round(gy - rsp.ay)) + 1 + bob, f // 5)
    # objetos estáticos + actores, por profundidad
    todo = estaticos + objs + barcos_o
    todo.sort(key=lambda o: o.prof)
    for o in todo:
        e.pegar(img, o, 0, getattr(o, "dy", 0))
    # animados de ambiente (fuente, braseros, banderas)
    for (fabrica, u, v, h, extra, n, vel) in e.ambiente:
        spr = fabrica((f // ajusta(n, vel * 2.5)) % n)
        gx, gy = tp(u, v)
        o = Objeto(spr, gx, gy, h, gy + extra, True)
        e.pegar(img, o)
    for (spr_fn, sx, sy, n, vel) in e.banderas:
        spr = spr_fn((f // ajusta(n, vel * 2.5)) % n)
        x0, y0 = int(sx - spr.ax), int(sy - spr.ay)
        h_, w_ = spr.px.shape
        for yy in range(h_):
            for xx in range(w_):
                v = spr.px[yy, xx]
                if v != TRANSP and 0 <= x0 + xx < SW and 0 <= y0 + yy < SH:
                    img[y0 + yy, x0 + xx] = v
    smoke(img, e, f)
    faro_luz(img, e, f)
    gaviotas(img, e, f)
    return img
