"""D2: campo de cebada (Sumer) 3x2 tiles en 6 etapas. Boceto para validar estilo (R66).

Usa los modulos de este mismo directorio (paleta, iso, util, tablas, edificios, templo).
Misma huella (W x D = 48 x 32 px de suelo = 3x2 tiles) y mismo ancla en las 6 etapas.
Capas: 'suelo' (tierra, surcos, cabecera) y 'obj' (plantas, gavillas, mojones). Cada planta se
dibuja a mano con su propio tono, altura e inclinacion (nada de relleno plano ni ruido).
"""
import sys
sys.dont_write_bytecode = True
import numpy as np
from paleta import TRANSP, N_COLORES
from util import guardar
from paleta import c, TRANSP
from util import hash2, fbm
from iso import Spr
from tablas import RID, a_indice
from edificios import caja, fn_plano
from templo import f_mar, f_mar_top

W, D = 48, 32
AX, AY, CW, CH = 44, 18, 104, 76
RAD = 5.0
FILAS = [6, 10, 14, 18, 22, 26]          # v de la cresta de cada surco (periodo 4)
U0, U1, PASO = 5.5, 43.0, 2.7            # plantas a lo largo de u


def nuevo():
    return Spr(CW, CH, AX, AY)


def sdf(s, t, seed=7):
    """Distancia con signo al contorno del campo (<0 dentro): rectangulo redondeado e irregular."""
    qx = np.abs(s - W / 2.0) - (W / 2.0 - RAD)
    qy = np.abs(t - D / 2.0) - (D / 2.0 - RAD)
    d = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - RAD
    return d + (fbm(s * 0.28 + seed, t * 0.28, 2, seed + 5) - 0.5) * 3.2


def tono(ramp, t):
    return c(ramp, int(np.floor(t + 0.5)))


# ------------------------------------------------------------------ suelo
def suelo(su, base, seed, surcos=1.0, seco=0.0):
    """Tierra con surcos (cresta clara, talud en sombra, fondo oscuro) y cabecera de tierra pisada."""
    def fn(s, t, X, Y):
        d = -sdf(s, t)
        w = np.clip((d - 3.0) / 1.5, 0, 1)                      # 0 en la cabecera, 1 en la zona de cultivo
        ph = np.mod(t, 4.0)                                      # 0 fondo, 1 talud (sombra), 2 cresta, 3 talud iluminado
        off = np.select([ph < 1, ph < 2, ph < 3], [-1.3, -0.4, 0.9], 0.2)
        n = fbm(s * 0.08 + seed, t * 0.08, 3, seed)
        hh = hash2(np.floor(s), np.floor(t), seed + 1)
        tn = base + off * w * surcos + (n - 0.5) * 1.1 + (hh > 0.94) * 0.8 - (hh < 0.05) * 0.7
        tn = tn + (1 - w) * 0.45 + seco * 0.5                    # la cabecera esta mas pisada y clara
        tn = np.where(d < 1.6, tn - 0.7, tn)                     # lindero: borde algo mas oscuro
        return a_indice(np.full(s.shape, RID["tierra"]), tn)
    su.cara((0, 0, 0), (1, 0, 0), W, (0, 1, 0), D, fn, fid=40, mascara=lambda s, t: sdf(s, t) < 0)
    # matas de hierba en el borde exterior: el campo se funde con el terreno
    op = su.px != TRANSP
    pad = np.pad(op, 1)
    for y in range(su.h):
        for x in range(su.w):
            if op[y, x]:
                continue
            vecino = pad[y, x + 1] | pad[y + 2, x + 1] | pad[y + 1, x] | pad[y + 1, x + 2]
            if vecino and hash2(x, y, seed + 9) > 0.80:
                su.pset(x, y, c("hierba", 1 + int(hash2(x, y, seed + 10) * 2.99)))


def sombra_planta(su, bx, by, n=2):
    for k in range(n):
        su.pset(bx + 1 + k, by, c("tierra", 0 if k == 0 else 1))


# ------------------------------------------------------------------ plantas
def hoja(s, bx, by, dx, h, f_tono, curva=1.7):
    """Una hoja/tallo: sube h px desde la base y se desvia dx; f_tono(t) da el color segun la altura (0..1)."""
    for k in range(int(h) + 1):
        t = k / float(h) if h > 0 else 0.0
        x = bx + int(round(dx * t ** curva))
        s.pset(x, by - k, f_tono(t))


def posiciones(seed):
    """Plantas de cebada: filas sobre las crestas, con desfase y jitter; solo dentro del cultivo."""
    out = []
    for i, v0 in enumerate(FILAS):
        n = int((U1 - U0) / PASO) + 1
        for j in range(n):
            r1, r2, r3 = hash2(i, j, seed), hash2(i, j, seed + 1), hash2(i, j, seed + 2)
            u = U0 + j * PASO + (i % 2) * 1.2 + (r1 - 0.5) * 1.3
            v = v0 + (r2 - 0.5) * 1.0
            if sdf(u, v) > -4.0:
                continue
            vig = float(fbm(u * 0.07 + 3, v * 0.07, 2, 41))
            out.append((u + v, u, v, vig, r1, r2, r3, i))
    out.sort()
    return out


def planta_brote(s, bx, by, vig, r1, r2, r3, fila):
    """Etapa 3: macollas bajas de 2-4 px."""
    h = 2 + int(vig * 2.4 + r1 * 1.1)
    t0 = 3.0 + vig * 0.8 + (r2 - 0.5) * 0.8
    cl = lambda t, d=0: tono("hierba", t0 + 1.4 * t - 0.8 + d)
    hoja(s, bx, by, 0, h, cl)
    if h >= 3:
        hoja(s, bx - 1, by, -1, h - 1, lambda t: cl(t, 0.6))
        hoja(s, bx + 1, by, 1, h - 1, lambda t: cl(t, -0.5))
    else:
        s.pset(bx - 1, by - 1, cl(1, 0.6))


def planta_verde(s, bx, by, u, v, vig, r1, r2, r3, fila):
    """Etapa 4: cebada alta y verde, 6-10 px; hojas arqueadas y balanceo que cambia por zonas."""
    h = 7 + int(round(vig * 3.0 + (r1 - 0.5) * 2.2))
    onda = int(round(np.sin(u * 0.30 + v * 0.17) * 0.9 + (r3 - 0.5) * 0.7))
    t0 = 1.8 + vig * 1.0 + (r2 - 0.5) * 1.3 + (fila % 3 - 1) * 0.2
    cl = lambda t, d=0: tono("hierba", t0 + 1.9 * t + d)
    hoja(s, bx + 1, by, onda, h - 3, lambda t: cl(t, -0.5))
    hoja(s, bx - 1, by, -2 + onda, h - 1, lambda t: cl(t, 0.5))
    hoja(s, bx + 2, by, 2 + onda, h - 3, lambda t: cl(t, -0.8))
    hoja(s, bx, by, onda, h, lambda t: cl(t, 0.1))
    hoja(s, bx, by, -1 + onda, h - 2, lambda t: cl(t, 0.7))
    if r3 > 0.93:                       # punta soleada
        s.pset(bx + onda, by - h, c("hierba", 5))
    if r1 > 0.985:                      # amapola entre la cebada
        s.pset(bx + onda, by - h - 1, c("carmesi", 2))
        s.pset(bx + onda + 1, by - h - 1, c("carmesi", 1))


def espiga(s, tx, ty, caida, r):
    """Espiga de cebada con aristas: 2 px de ancho (izquierda iluminada) y barbas largas."""
    if caida == 2:                      # espiga colgante
        for k in range(3):
            s.pset(tx + 1, ty + k, c("oro", 2 if k == 0 else 1))
        s.pset(tx + 2, ty + 1, c("tierra", 5))
        s.pset(tx + 2, ty + 3, c("tierra", 5))
        return
    dx = 1 if caida == 1 else 0
    for k in range(3):
        s.pset(tx + dx, ty - 1 - k, c("oro", 2))
        s.pset(tx + dx + 1, ty - 1 - k, c("oro", 1 if k < 2 else 0))
    s.pset(tx + dx - 1, ty - 3, c("tierra", 6))
    s.pset(tx + dx, ty - 4, c("tierra", 6))
    s.pset(tx + dx + 2, ty - 3, c("tierra", 5))


def planta_madura(s, bx, by, u, v, vig, r1, r2, r3, fila):
    """Etapa 5: tallos dorados con espigas, 8-10 px."""
    h = 7 + int(round(vig * 2.6 + (r1 - 0.5) * 2.0))
    onda = int(round(np.sin(u * 0.30 + v * 0.17) * 0.8))
    t0 = 1.2 + vig * 0.8 + (r2 - 0.5) * 1.0
    cl = lambda t, d=0: tono("tierra", t0 + 2.9 * t + d)
    o1, o2, o3 = [(hash2(bx, by, 91 + k) - 0.5) * 1.4 for k in range(3)]   # cada tallo con su tono
    hoja(s, bx - 1, by, -1 + onda, h - 3, lambda t: cl(t, -0.5 + o1))
    hoja(s, bx + 1, by, 1 + onda, h - 2, lambda t: cl(t, -0.9 + o2))
    hoja(s, bx, by, onda, h, lambda t: cl(t, 0.2 + o3))
    caida = 2 if r3 > 0.78 else (1 if r3 > 0.38 else 0)
    espiga(s, bx + onda, by - h + 1, caida, r3)
    if r1 > 0.35:                       # segunda espiga en un tallo mas bajo
        espiga(s, bx - 2 + onda, by - h + 3, 1 if r2 > 0.5 else 0, r2)
    if r1 > 0.988:
        s.pset(bx + 2 + onda, by - h + 1, c("carmesi", 2))


def rastrojo(s, bx, by, vig, r1, r2, r3):
    """Etapa 6: pajas cortadas a 1-2 px, con el corte claro."""
    for dx in (-1, 0, 1):
        if hash2(bx + dx, by, 77) > 0.30:
            h = 1 + int(hash2(bx + dx, by, 78) * 1.9)
            for k in range(h):
                s.pset(bx + dx, by - k, c("tierra", 3 if k == 0 else 4))
            s.pset(bx + dx, by - h, c("tierra", 5 + int(r1 > 0.6)))
    if r3 > 0.72:                       # paja suelta sobre el surco
        s.pset(bx + 2, by + 1, c("tierra", 5))
        s.pset(bx + 3, by + 1, c("tierra", 4))


GAV = [
    "..A.A.A..",
    ".AGgGgGA.",
    ".GGgGgdgd",
    "..GgGgg..",
    "...smn...",
    "...ttT...",
    "..smmnn..",
    ".smmmmnn.",
    ".smmmmmnn",
    "smmmmmnnn",
    "smmmmmnnn",
]
GAV_COL = {"A": ("tierra", 6), "G": ("tierra", 6), "g": ("oro", 2), "d": ("oro", 1), "s": ("oro", 2),
           "m": ("oro", 1), "n": ("oro", 0), "t": ("madera", 1), "T": ("madera", 0)}


def gavilla(s, bx, by, lean, seed):
    """Gavilla atada: espigas abiertas arriba, ligadura en la cintura y pie ancho (patron 9x11)."""
    n = len(GAV)
    for fila, linea in enumerate(GAV):
        y = by - (n - 1) + fila
        corr = int(round(lean * max(0, 5 - fila) / 5.0))          # solo se inclinan las espigas
        for col, ch in enumerate(linea):
            if ch == ".":
                continue
            rampa, tn = GAV_COL[ch]
            if ch in "smn" and hash2(col, fila, seed) > 0.72:      # vetas de paja
                tn += 1 if (hash2(col, fila, seed + 1) > 0.5 and tn < 2) else -1 if tn > 0 else 0
            s.pset(bx - 4 + col + corr, y, c(rampa, tn))


def sombra_gavilla(su, bx, by):
    for k in range(5):
        su.pset(bx + 3 + k, by, c("tierra", 1))
    for k in range(4):
        su.pset(bx + 2 + k, by + 1, c("tierra", 1 if k < 3 else 2))


def mojon(s, u, v, seed):
    """Mojon de piedra en una esquina del campo."""
    caja(s, u, v, 0, 3, 2.5, 2, f_mar(3.6, seed, vetas=False), f_mar(1.8, seed + 1, vetas=False),
         f_mar_top(4.6, seed + 2), fid=30)


MOJONES = [(4.0, 4.5, 3), (W - 8.0, 4.0, 5), (W - 9.0, D - 8.0, 7), (4.5, D - 8.5, 9)]
GAVILLAS = [(12, 10, 1), (31, 10, -1), (21, 14, 0), (39, 18, 1), (13, 22, -1), (29, 22, 0)]


# ================================================================== ETAPAS
def con_contorno(ob, dibujar):
    """Dibuja un objeto en una capa temporal, le pone contorno selectivo y lo funde en 'ob'."""
    tmp = nuevo()
    dibujar(tmp)
    tmp.contorno(-3)
    m = tmp.px != TRANSP
    ob.px[m] = tmp.px[m]


def etapa(n):
    su, ob = nuevo(), nuevo()
    bases = {1: 3.1, 2: 2.7, 3: 2.5, 4: 2.1, 5: 2.5, 6: 3.0}
    suelo(su, bases[n], 20 + n, surcos=1.0 if n != 6 else 0.25, seco=0.4 if n == 5 else 0.0)
    cola = [(u + v, ("mojon", u, v, sd)) for (u, v, sd) in MOJONES]
    pl = posiciones(31)
    if n >= 2:
        for (d, u, v, vig, r1, r2, r3, fila) in pl:
            cola.append((d, ("planta", u, v, vig, r1, r2, r3, fila)))
    if n == 6:
        for (u, v, ln) in GAVILLAS:
            cola.append((u + v + 0.5, ("gavilla", u, v, ln)))
    cola.sort(key=lambda x: x[0])
    for _, it in cola:
        tipo = it[0]
        if tipo == "mojon":
            _, u, v, sd = it
            con_contorno(ob, lambda t, u=u, v=v, sd=sd: mojon(t, u, v, sd))
        elif tipo == "gavilla":
            _, u, v, ln = it
            bx, by = (int(round(q)) for q in ob.P(u, v, 0))
            sombra_gavilla(su, bx, by)
            con_contorno(ob, lambda t, bx=bx, by=by, ln=ln, sd=int(u): gavilla(t, bx, by, ln, sd))
        else:
            _, u, v, vig, r1, r2, r3, fila = it
            bx, by = (int(round(q)) for q in ob.P(u, v, 0))
            if n == 2:
                _siembra(su, ob, bx, by, r1, r2, r3)
            elif n == 3:
                sombra_planta(su, bx, by, 1)
                planta_brote(ob, bx, by, vig, r1, r2, r3, fila)
            elif n == 4:
                sombra_planta(su, bx, by, 2)
                planta_verde(ob, bx, by, u, v, vig, r1, r2, r3, fila)
            elif n == 5:
                sombra_planta(su, bx, by, 2)
                planta_madura(ob, bx, by, u, v, vig, r1, r2, r3, fila)
            else:
                rastrojo(ob, bx, by, vig, r1, r2, r3)
    return su, ob


def _siembra(su, ob, bx, by, r1, r2, r3):
    """Etapa 2: granos pálidos en el surco y algun brote que asoma."""
    for k in range(2):
        if hash2(bx, by, 60 + k) > 0.2:
            su.pset(bx - 1 + k * 2, by + 1, c("tierra", 5))
            su.pset(bx + k * 2, by + 1, c("tierra", 4))
    if r1 > 0.62:                       # brote: tallito verde de 2-3 px con dos hojas
        h = 2 + int(r2 * 1.6)
        for k in range(h):
            ob.pset(bx, by - k, c("hierba", 3 + (k == h - 1)))
        ob.pset(bx - 1, by - h + 1, c("hierba", 4))


def componer(su, ob):
    out = su.copiar()
    m = ob.px != TRANSP
    out.px[m] = ob.px[m]
    return out


NOMBRES = ["1 ARADO", "2 SIEMBRA", "3 BROTES", "4 CRECIMIENTO", "5 MADURO", "6 COSECHA"]


def construir():
    res = [componer(*etapa(n)) for n in range(1, 7)]
    ys, xs = [], []
    for s in res:
        yy, xx = np.where(s.px != TRANSP)
        ys += [yy.min(), yy.max()]
        xs += [xx.min(), xx.max()]
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    sal = []
    for s in res:
        r = Spr(x1 - x0, y1 - y0, AX - x0, AY - y0)
        r.px = s.px[y0:y1, x0:x1].copy()
        sal.append(r)
    return sal
