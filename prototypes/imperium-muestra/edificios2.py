"""Mercado, faro, puente, torre y etapas de obra de la casa."""
import numpy as np
from paleta import c, TRANSP, TINTA
from util import hash2, fbm
from iso import Spr
from render import RID, a_indice
from edificios import caja, fn_sillar, fn_plano, techo_tejas, estuco, casa
from templo import poste, plataforma, bloques_marmol, f_mar, f_mar_top


def f_tablas(tono, seed=1, sep=3.0):
    def fn(s, t, X, Y):
        j = np.mod(s, sep) < 0.8
        v = (hash2(np.floor(s / sep), 1, seed) - 0.5) * 0.8
        return a_indice(np.full(s.shape, RID["madera"]), tono + v - j * 1.0)
    return fn


def f_tablas_top(tono, seed=1):
    def fn(s, t, X, Y):
        j = np.mod(t, 3.0) < 0.8
        v = (hash2(np.floor(t / 3.0), 2, seed) - 0.5) * 0.9
        return a_indice(np.full(s.shape, RID["madera"]), tono + v - j * 1.0)
    return fn


# ------------------------------------------------------------------ mercado
def anfora(s, u, v, z, h=11, col="teja", tono=3):
    x, y = s.P(u, v, z)
    x, y = int(x), int(y)
    perfil = [2, 3, 5, 6, 6, 6, 5, 4, 3, 2, 2, 3]
    perfil = perfil[-h:] if h < len(perfil) else perfil
    for k, w in enumerate(perfil[::-1]):
        yy = y - 1 - k
        for i in range(w):
            xx = x - w // 2 + i
            t = tono + 0.9 - 1.9 * (i / max(1, w - 1))
            s.pset(xx, yy, c(col, int(np.floor(t + 0.5))))
    s.pset(x - 1, y - len(perfil) + 3, c(col, tono - 1)); s.pset(x + 2, y - len(perfil) + 4, c(col, tono - 1))   # asas
    s.pset(x, y - len(perfil) + 6, c("tierra", 4)); s.pset(x + 1, y - len(perfil) + 6, c("tierra", 4))        # cenefa


def fruta(s, u, v, z, tipos=("teja", "tierra", "hierba")):
    for k, (du, dv) in enumerate(((0, 0), (4, 1), (8, 0), (2, 3), (6, 3), (10, 2))):
        x, y = s.P(u + du, v + dv, z)
        col = tipos[k % len(tipos)]
        tt = 4 if col != "hierba" else 4
        s.pset(x, y - 1, c(col, tt)); s.pset(x + 1, y - 1, c(col, tt - 1))
        s.pset(x, y, c(col, tt - 1)); s.pset(x + 1, y, c(col, tt - 2))
        s.pset(x, y - 2, c(col, 5) if col != "tierra" else c("tierra", 6))


def telas(s, u, v, z):
    cols = [("azul", 2), ("carmesi", 2), ("purpura", 2), ("tierra", 5), ("hierba", 3)]
    for k, (cr, tn) in enumerate(cols):
        caja(s, u + (k % 2) * 2, v, z + k * 2, 9, 6, 2,
             fn_plano(cr, tn - 0.0), fn_plano(cr, max(0, tn - 1.8)), fn_plano(cr, tn + 0.6))


def pescado(s, u, v, z):
    for k in range(5):
        x, y = s.P(u + k * 3, v + (k % 2) * 2, z)
        for i in range(5):
            s.pset(x + i, y - 1, c("piedra", 4 if i < 3 else 5))
        s.pset(x + 5, y - 1, c("piedra", 3)); s.pset(x + 5, y - 2, c("piedra", 3)); s.pset(x + 5, y, c("piedra", 3))
        s.pset(x + 1, y - 2, c("azul", 1)); s.pset(x + 1, y - 1, c("piedra", 6))


def ceramica(s, u, v, z):
    for k, (du, dv) in enumerate(((0, 0), (6, 1), (12, 0), (3, 4))):
        x, y = s.P(u + du, v + dv, z)
        for j, w in enumerate((3, 5, 5, 4, 3)):
            for i in range(w):
                s.pset(x - w // 2 + i, y - 1 - j, c("teja", 3 if i < w // 2 + 1 else 2))
        s.pset(x - 1, y - 6, c("teja", 4))


def pan(s, u, v, z):
    for k, (du, dv) in enumerate(((0, 0), (5, 1), (10, 0), (3, 3), (8, 3))):
        x, y = s.P(u + du, v + dv, z)
        for i in range(4):
            s.pset(x + i, y - 1, c("tierra", 3))
            s.pset(x + i, y - 2, c("tierra", 4 if i < 2 else 3))
        s.pset(x + 1, y - 3, c("tierra", 5))


def puesto(color=("teja", 3.4), color2=("piedra", 5.0), bienes="fruta", seed=1, mercancia_suelo=True):
    s = Spr(96, 96, 38, 58)
    W, D = 32, 16
    mad = "madera"
    # postes traseros
    poste(s, 2, 2, 0, 28, 1)
    poste(s, 30, 2, 0, 28, 1)
    # tablón trasero y mesa
    s.cara((2, 2, 8), (1, 0, 0), 28, (0, 0, 1), 18,
           lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["madera"]), 1.0 + (np.mod(ss, 3) < 0.7) * -0.6), fid=60,
           mascara=lambda ss, tt: tt < 14)
    caja(s, 3, 8, 0, 26, 7, 8, f_tablas(3.6, seed), f_tablas(2.0, seed), f_tablas_top(3.8, seed), fid=61)
    if bienes == "fruta":
        fruta(s, 5, 9, 8)
        fruta(s, 17, 10, 8, tipos=("hierba", "teja", "tierra"))
    elif bienes == "telas":
        telas(s, 5, 9, 8)
        telas(s, 18, 9, 8)
    elif bienes == "pescado":
        pescado(s, 5, 9, 8)
        pescado(s, 18, 10, 8)
    elif bienes == "ceramica":
        ceramica(s, 5, 9, 8)
        ceramica(s, 17, 10, 8)
    elif bienes == "pan":
        pan(s, 5, 9, 8)
        pan(s, 17, 10, 8)
    if mercancia_suelo:
        anfora(s, 2, 20, 0, 11, "teja", 3)
        anfora(s, 7, 21, 0, 9, "tierra", 3)
        anfora(s, 30, 20, 0, 11, "teja", 2)
    # postes delanteros
    poste(s, 2, 15, 0, 21, 1)
    poste(s, 30, 15, 0, 21, 1)
    # toldo: plano inclinado con franjas y volante festoneado
    def franjas(ss, tt, X, Y):
        k = np.floor(ss / 4.0).astype(int)
        a = k % 2 == 0
        ca = a_indice(np.full(ss.shape, RID[color[0]]), color[1] + (tt < 0.12) * -0.9 + (tt > 0.85) * 0.5)
        cb = a_indice(np.full(ss.shape, RID[color2[0]]), color2[1] + (tt < 0.12) * -0.9 + (tt > 0.85) * 0.5)
        return np.where(a, ca, cb)
    s.cara((-2, -1, 28), (1, 0, 0), 36, (0, 19, -8), 1.0, franjas, fid=62)
    def volante(ss, tt, X, Y):
        k = np.floor(ss / 4.0).astype(int)
        a = k % 2 == 0
        ca = a_indice(np.full(ss.shape, RID[color[0]]), color[1] - 0.5 + (tt < 0.5) * 0.4)
        cb = a_indice(np.full(ss.shape, RID[color2[0]]), color2[1] - 0.5 + (tt < 0.5) * 0.4)
        return np.where(a, ca, cb)
    s.cara((-2, 18, 20), (1, 0, 0), 36, (0, 0, -1), 5, volante, fid=63,
           mascara=lambda ss, tt: tt < 2.6 + 2.2 * np.abs(np.sin(np.pi * ss / 4.0)))
    s.contorno(-3)
    return s.recortar()


# ------------------------------------------------------------------ faro
def faro(altura=70):
    """Faro de torre troncocónica, galería, linterna encendida y tejado."""
    from arboles import roca
    s = Spr(76, 160, 38, 143)
    cx, by = 38, 148
    r0, r1 = 11.0, 7.0
    # zócalo de roca irregular que asienta la torre en el suelo
    for yy in range(-5, 7):
        for xx in range(-17, 18):
            if (xx / 16.5) ** 2 + (yy / 6.0) ** 2 <= 1.0:
                lu = -(xx / 16.5 * 0.55 + yy / 6.0 * 0.8)
                t = 1.4 + lu * 1.5 + (hash2(xx // 2, yy // 2, 9) - 0.5) * 0.9
                s.pset(cx + xx, by + 3 + yy, c("roca", int(np.floor(t + 0.5))))
    for z in range(altura):
        r = r0 + (r1 - r0) * z / altura
        x0, x1 = cx - r, cx + r
        y = by - z
        for x in range(int(np.floor(x0)), int(np.ceil(x1))):
            u = float(min(1.0, max(0.0, (x + 0.5 - x0) / (x1 - x0))))
            banda = 24 <= z < 38 or 52 <= z < 58
            tono = float(5.5 - 3.5 * (u ** 0.85))
            if banda:
                col = c("teja", int(np.floor(tono * 0.7 + 0.5)))
            else:
                col = c("piedra", int(np.floor(tono + 0.5)))
            # hiladas de sillares
            fila = z // 4
            if z % 4 == 0 and not banda:
                col = c("piedra", max(0, int(np.floor(tono - 1.1 + 0.5))))
            if (x + (fila % 2) * 3) % 7 == 0 and z % 4 != 0:
                col = c("piedra" if not banda else "teja", max(0, int(np.floor((tono - 0.9) * (0.7 if banda else 1) + 0.5))))
            s.pset(x, y, col)
    # ventanas en arco
    for (zz, dx) in ((10, 3), (44, 2), (62, 1)):
        for k in range(6):
            s.pset(cx + dx, by - zz - k, c("agua", 0))
            s.pset(cx + dx + 1, by - zz - k, c("agua", 1))
        s.pset(cx + dx, by - zz - 6, c("agua", 0))
        s.pset(cx + dx - 1, by - zz - 2, c("piedra", 5)); s.pset(cx + dx + 2, by - zz - 2, c("piedra", 2))
    # galería con barandilla
    gz = altura
    for x in range(cx - 12, cx + 12):
        u = (x - (cx - 12)) / 24.0
        s.pset(x, by - gz, c("piedra", int(np.floor(5.2 - 3.0 * u + 0.5))))
        s.pset(x, by - gz - 1, c("piedra", int(np.floor(4.0 - 2.5 * u + 0.5))))
    for x in range(cx - 12, cx + 12, 3):
        s.pset(x, by - gz - 2, c("madera", 2)); s.pset(x, by - gz - 3, c("madera", 3))
    for x in range(cx - 12, cx + 12):
        s.pset(x, by - gz - 4, c("madera", 3 if x < cx else 1))
    # linterna: cristal luminoso con marco oscuro
    for z in range(gz + 2, gz + 14):
        for x in range(cx - 6, cx + 6):
            u = (x - (cx - 6)) / 12.0
            y = by - z
            if x in (cx - 6, cx - 1, cx + 5):
                s.pset(x, y, c("madera", 1))
                continue
            glow = 2.0 + (1 - abs(u - 0.5) * 1.6) * 1.0
            col = c("tierra", 6) if glow > 2.6 else (c("oro", 2) if glow > 2.2 else c("oro", 1))
            s.pset(x, y, col)
    # tejado cónico de tejas con remate dorado y bandera
    for k in range(10):
        w = 10 - k
        y = by - gz - 14 - k
        for x in range(cx - w, cx + w):
            u = (x - (cx - w)) / max(1, 2 * w)
            s.pset(x, y, c("teja", int(np.floor(4.6 - 3.2 * u + (0.4 if k % 2 else -0.2) + 0.5))))
    s.pset(cx, by - gz - 25, c("oro", 2)); s.pset(cx, by - gz - 26, c("oro", 1))
    for k in range(8):
        s.pset(cx, by - gz - 26 - k, c("madera", 3))
    s.contorno(-3)
    # el ancla pasa a ser el centro de la base sobre el suelo
    s.ay = by + 3
    out = s.recortar()
    out.faro_linterna = (cx - 6, by - gz - 14 + 0, 12, 12)
    out.faro_centro_linterna = (cx, by - gz - 8)
    return out


# ------------------------------------------------------------------ puente
def puente(largo=64, ancho=22):
    """Puente de piedra de dos arcos con rampas y pretiles. z=0 es la superficie del agua."""
    s = Spr(largo + ancho + 40, 140, ancho + 14, 70)
    W, D = largo, ancho
    zd = 12            # cota del tablero
    # cara interior lejana en sombra (se ve a través de los arcos)
    s.cara((0, 0, 0), (1, 0, 0), W, (0, 0, 1), zd,
           lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["piedra"]), 1.2 + (np.mod(ss, 9) < 0.7) * -0.5), fid=70)
    # cara frontal con dos arcos
    arcos = [(6, 26), (34, 54)]
    def frente(ss, tt, X, Y):
        base = fn_sillar("piedra", 4.3, 3, bw=10, bh=4, junta=1.3, var=0.9)(ss, tt, X, Y)
        # dovelas de los arcos: anillo más claro
        for (a0, a1) in arcos:
            cxa, r = (a0 + a1) / 2.0, (a1 - a0) / 2.0
            d = np.hypot(ss - cxa, (tt - 0) * 1.0)
            anillo = (np.abs(d - r) < 1.8) & (tt >= 0)
            base = np.where(anillo & (tt > 2), a_indice(np.full(ss.shape, RID["piedra"]), 5.3 + (np.mod(np.floor(np.arctan2(tt, ss - cxa) * 8), 2)) * -0.8), base)
        return base
    def mascara(ss, tt):
        m = tt < zd
        for (a0, a1) in arcos:
            cxa, r = (a0 + a1) / 2.0, (a1 - a0) / 2.0
            d = np.hypot(ss - cxa, tt)
            m &= ~((d < r - 0.5) & (tt >= 0) | ((ss > a0 + 0.5) & (ss < a1 - 0.5) & (tt < 2.5)))
        return m
    s.cara((0, D, 0), (1, 0, 0), W, (0, 0, 1), zd, frente, fid=72, mascara=mascara)
    # tablero de adoquín con rampas en los extremos
    def adoq(ss, tt, X, Y):
        fv = np.floor(tt / 5.0)
        cu = np.floor(ss / 7.0 + 0.5 * (fv % 2))
        fu = ss / 7.0 + 0.5 * (fv % 2) - cu
        fvv = tt / 5.0 - fv
        j = (fu < 0.16) | (fvv < 0.22)
        return a_indice(np.full(ss.shape, RID["tierra"]), 3.3 + (hash2(cu, fv, 23) - 0.5) * 1.4 - j * 1.3)
    s.cara((12, 0, zd), (1, 0, 0), W - 24, (0, 1, 0), D, adoq, fid=73)
    s.cara((0, 0, 4), (1, 0, 0.6667), 12, (0, 1, 0), D, adoq, fid=73)
    s.cara((W, 0, 4), (-1, 0, 0.6667), 12, (0, 1, 0), D, adoq, fid=73)
    # pretiles
    for (v0, tono_i, tono_d) in ((0, 4.2, 2.2), (D - 3, 4.6, 2.4)):
        caja(s, 12, v0, zd, W - 24, 3, 4, fn_sillar("piedra", tono_i, 5, bw=9, bh=2, junta=1.0),
             fn_sillar("piedra", tono_d, 6, bw=9, bh=2), f_mar_top(5.2))
    for k in range(6):
        for (v0) in (0, D - 3):
            zz = 4 + k * 0.6667 * 2
            caja(s, 2 * k, v0, zz, 2, 3, 3, fn_plano("piedra", 4.2), fn_plano("piedra", 2.2), f_mar_top(5.2))
            caja(s, W - 2 - 2 * k, v0, zz, 2, 3, 3, fn_plano("piedra", 4.2), fn_plano("piedra", 2.2), f_mar_top(5.2))
    # espolón de la pila central
    caja(s, 28, D - 1, 0, 6, 3, zd - 3, fn_plano("piedra", 4.8), fn_plano("piedra", 2.6), f_mar_top(5.4))
    s.contorno(-3)
    return s.recortar()


# ------------------------------------------------------------------ torre de la muralla
def torre(h=44):
    s = Spr(80, 110, 30, 78)
    W = D = 26
    fl = fn_sillar("piedra", 4.1, 11, bw=11, bh=5, junta=1.2, var=0.9)
    fr = fn_sillar("piedra", 2.2, 12, bw=11, bh=5, junta=1.0, var=0.7)
    caja(s, 0, 0, 0, W, D, h, fl, fr, f_mar_top(5.0), fid=80)
    # troneras
    for (ss, tt) in ((11, 22), (11, 32)):
        s.cara((0, D, 0), (1, 0, 0), W, (0, 0, 1), h,
               lambda a, b, X, Y: np.full(a.shape, c("agua", 0)), fid=81,
               mascara=lambda a, b, ss_=ss, tt_=tt: (a >= ss_) & (a < ss_ + 2) & (b >= tt_) & (b < tt_ + 6))
    for (ss, tt) in ((11, 22),):
        s.cara((W, 0, 0), (0, 1, 0), D, (0, 0, 1), h,
               lambda a, b, X, Y: np.full(a.shape, c("agua", 0)), fid=82,
               mascara=lambda a, b, ss_=ss, tt_=tt: (a >= ss_) & (a < ss_ + 2) & (b >= tt_) & (b < tt_ + 6))
    # matacanes / voladizo y almenas
    caja(s, -2, -2, h - 4, W + 4, D + 4, 4, fn_sillar("piedra", 4.5, 13, bw=5, bh=4, junta=1.0),
         fn_sillar("piedra", 2.4, 14, bw=5, bh=4), f_mar_top(5.3), fid=83)
    for k in range(4):
        caja(s, -2 + k * 7, D + 2 - 3, h, 5, 3, 5, fn_plano("piedra", 4.5), fn_plano("piedra", 2.3), f_mar_top(5.4))
        caja(s, W + 2 - 3, -2 + k * 7, h, 3, 5, 5, fn_plano("piedra", 4.5), fn_plano("piedra", 2.3), f_mar_top(5.4))
    s.contorno(-3)
    return s.recortar()


# ------------------------------------------------------------------ etapas de la casa
def solar_casa(w=2, d=2):
    s = Spr(110, 80, 48, 22)
    W, D = 16 * w, 16 * d
    def tierra_f(ss, tt, X, Y):
        n = fbm(ss * 0.14, tt * 0.14, 2, 5)
        hh = hash2(np.floor(ss), np.floor(tt), 7)
        return a_indice(np.full(ss.shape, RID["tierra"]), 2.6 + (n - 0.5) * 1.3 + (hh > 0.95) * 0.9 - (hh < 0.05))
    s.cara((-5, -5, 0), (1, 0, 0), W + 10, (0, 1, 0), D + 10, tierra_f, fid=40)
    def zanja(ss, tt, X, Y):
        return a_indice(np.full(ss.shape, RID["tierra"]), np.full(ss.shape, 1.1))
    s.cara((2, 2, 0.1), (1, 0, 0), W - 4, (0, 1, 0), D - 4, zanja, fid=41,
           mascara=lambda ss, tt: ((ss < 3) | (ss > W - 7) | (tt < 3) | (tt > D - 7)))
    for (u, v) in ((0, 0), (W, 0), (W, D), (0, D)):
        poste(s, u, v, 0, 8, 1)
    for i in range(4):
        pts = [(0, 0), (W, 0), (W, D), (0, D)]
        (u0, v0), (u1, v1) = pts[i], pts[(i + 1) % 4]
        s.lineaz((u0, v0, 7), (u1, v1, 7), c("piedra", 5))
    bloques_marmol(s, 6, D + 8, 0, fil=2, col=2, tam=(7, 5, 5), seed=51)
    for k in range(4):
        s.lineaz((W + 8, 4 + k * 3, 1 + k * 0.5), (W + 8, 22 + k * 3, 1 + k * 0.5), c("madera", 3 if k % 2 else 2))
    s.contorno(-3)
    return s.recortar()


def casa_obra(w=2, d=2, hw=20, seed=3):
    """Casa a medio construir: muros hasta la mitad, andamio, cabios al aire y material."""
    s = Spr(130, 130, 56, 70)
    W, D = 16 * w, 16 * d
    # cimientos de piedra
    caja(s, -2, -2, 0, W + 4, D + 4, 3, fn_sillar("piedra", 3.8, 21, bw=8, bh=3), fn_sillar("piedra", 2.0, 22, bw=8, bh=3),
         f_mar_top(4.6), fid=90)
    alto = 9
    def par(ss, lado):
        return alto + np.floor(hash2(np.floor(ss / 5), lado + 9, 5) * 3) * 2
    L_fn = estuco("piedra", 4.5, seed)
    R_fn = estuco("piedra", 2.4, seed + 1)
    def fl(ss, tt, X, Y):
        o = L_fn(ss, tt, X, Y)
        return np.where(tt > par(ss, 0) - 1.5, c("piedra", 6), o)
    def fr(ss, tt, X, Y):
        o = R_fn(ss, tt, X, Y)
        return np.where(tt > par(ss, 1) - 1.5, c("piedra", 4), o)
    s.cara((0, D, 3), (1, 0, 0), W, (0, 0, 1), alto + 6, fl, fid=91, mascara=lambda ss, tt: tt < par(ss, 0))
    s.cara((W, 0, 3), (0, 1, 0), D, (0, 0, 1), alto + 6, fr, fid=92, mascara=lambda ss, tt: tt < par(ss, 1))
    # puerta ya abierta
    s.cara((0, D, 3), (1, 0, 0), W, (0, 0, 1), 13,
           lambda ss, tt, X, Y: np.full(ss.shape, c("madera", 0)), fid=93,
           mascara=lambda ss, tt: (ss >= 4) & (ss < 12) & (tt < 11) & (tt < 8 + 6 * (1 - np.abs((ss - 8) / 4.0) ** 2)))
    # andamio de madera
    for u in (4, 16, 28):
        poste(s, u, D + 6, 0, 30, 1)
    for z in (9, 20):
        plataforma(s, 2, D + 2, z + 3, 28, 7)
    s.lineaz((4, D + 6, 3), (28, D + 6, 20), c("madera", 2))
    s.lineaz((28, D + 6, 3), (4, D + 6, 20), c("madera", 1))
    # cabios del tejado al aire
    for u in (4, 14, 24):
        s.lineaz((u, D / 2 - 14, 22), (u, D / 2 + 1, 33), c("madera", 3))
        s.lineaz((u, D / 2 + 1, 33), (u, D + 2, 22), c("madera", 2))
    s.lineaz((2, D / 2 + 1, 33), (30, D / 2 + 1, 33), c("madera", 4))
    # materiales
    bloques_marmol(s, W + 6, 4, 0, fil=2, col=2, tam=(7, 5, 5), seed=61)
    caja(s, 4, D + 14, 0, 9, 7, 6, f_tablas(3.0, 4), f_tablas(1.8, 4), f_tablas_top(3.4, 4), fid=95)
    s.contorno(-3)
    return s.recortar()
