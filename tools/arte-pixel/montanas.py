"""Boceto M1: montañas con piezas de sprite frente al terreno procedural actual.

Cada pieza es un MAPA DE ALTURAS h(u, v) (1 px = 1 unidad; 1 tile = 16 px por lado) que se proyecta como el resto de sprites
(x = u - v ; y = (u + v)/2 - z, origen (0,0,0) en (ax, ay)) con un rayo por píxel. La luz es la única de la muestra (desde la
izquierda: caras +v cálidas, caras +u frías) y sale de la normal del relieve + una sombra proyectada a la derecha. El color sale de
un material por altura y pendiente (hierba, canchal, roca, nieve) cuantizado a la paleta de 59 con tramado solo en los degradados.

Uso (desde tools/arte-pixel):  python montanas.py
Escribe en bocetos/: montanas_comparativa_x2.png (A actual | B piezas) y montanas_piezas_x4.png (cada pieza sola, con huella y ancla).
"""
import os
import sys

sys.dont_write_bytecode = True
import numpy as np
from PIL import Image
from scipy import ndimage

import arboles as AR
import fuente
from iso import Spr
from paleta import PALETA_RGB, TRANSP, c
from util import LUT, a_rgb, fbm, hash2

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, "..", ".."))
EVIDENCIA = os.path.join(RAIZ, "games", "sedimento", "docs", "evidencia", "P2-t3d-montana.png")
SALIDA = os.path.join(AQUI, "bocetos")

LUZ = np.array([-0.30, 0.60, 0.75])
LUZ = LUZ / np.linalg.norm(LUZ)
TILE = 16                      # px de suelo por lado de un tile (el tile se ve 32x16)

NADA, HIERBA, CANCHAL, ROCA, NIEVE, SOMBRA = 0, 1, 2, 3, 4, 5

_B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0 - 0.5


def bayer(x, y):
    """Umbral de tramado ordenado en [-0.5, 0.5) para las coordenadas de pantalla x, y (arrays)."""
    return _B4[np.asarray(y).astype(int) % 4, np.asarray(x).astype(int) % 4]


def cuantizar(t, x, y, amp=0.45):
    """Tono continuo -> entero. El tramado solo actúa cerca del umbral (amp = anchura de la banda de mezcla)."""
    return np.floor(t + 0.5 + bayer(x, y) * amp).astype(int)


def suavizar(x, a, b):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- campos de altura

def _cono(u, v, pu, pv, ru, rv, alto, pot, giro, esp, seed, barr=0.0, k=4):
    """Pico cónico con espolones: distancia deformada al centro, perfil (1-d)^pot."""
    ang = giro
    du, dv = u - pu, v - pv
    a = du * np.cos(ang) + dv * np.sin(ang)
    b = -du * np.sin(ang) + dv * np.cos(ang)
    nu, nv = a / ru, b / rv
    nu = nu + 0.16 * (fbm(u * 0.021, v * 0.021, 3, seed) - 0.5) * 2
    nv = nv + 0.16 * (fbm(u * 0.021 + 40, v * 0.021 + 17, 3, seed + 3) - 0.5) * 2
    r = np.hypot(nu, nv)
    th = np.arctan2(nv, nu)
    r = r * (1 + esp * np.sin(3 * th + seed) + esp * 0.6 * np.sin(5 * th + 2.0 * seed + 1.0))
    perfil = np.clip(1 - r, 0, 1) ** pot
    if barr:
        # barrancos radiales: entre cada par de aristas la ladera se hunde, más cuanto más abajo del pico
        rav = np.abs(np.sin(k * th + 2.4 * (fbm(u * 0.03, v * 0.03, 2, seed + 9) - 0.5) + seed))
        perfil = perfil * (1 - barr * (1 - rav) ** 1.4 * suavizar(r, 0.05, 0.40))
    return alto * perfil


def campo_macizo(W, D, zmax, seed=3):
    v, u = np.mgrid[0:D, 0:W].astype(float) + 0.5
    # picos principales al fondo (u,v pequeños), hombros hacia la cámara (+u,+v)
    h = _cono(u, v, 0.50 * W, 0.42 * D, 0.46 * W, 0.52 * D, zmax, 1.55, 0.0, 0.18, seed, barr=0.55, k=4)
    h = np.maximum(h, _cono(u, v, 0.32 * W, 0.36 * D, 0.30 * W, 0.36 * D, zmax * 0.74, 1.4, 0.5, 0.14, seed + 1, barr=0.5, k=3))
    h = np.maximum(h, _cono(u, v, 0.70 * W, 0.58 * D, 0.30 * W, 0.40 * D, zmax * 0.60, 1.4, -0.4, 0.14, seed + 2, barr=0.5, k=3))
    h = np.maximum(h, _cono(u, v, 0.56 * W, 0.74 * D, 0.34 * W, 0.24 * D, zmax * 0.32, 1.3, 0.0, 0.16, seed + 4))
    # relieve de aristas: ruido "ridged" que deja crestas rectas y barrancos entre ellas
    n = fbm(u * 0.034, v * 0.034, 4, seed + 5)
    rid = 1 - np.abs(2 * n - 1)
    n2 = fbm(u * 0.085 + 9, v * 0.085, 3, seed + 7)
    rid2 = 1 - np.abs(2 * n2 - 1)
    amp = np.clip(h / zmax, 0, 1)
    n3 = fbm(u * 0.17 + 3, v * 0.17 + 5, 2, seed + 13)
    rid3 = 1 - np.abs(2 * n3 - 1)
    h = h * (0.76 + 0.44 * rid ** 1.3) + zmax * 0.10 * amp ** 0.7 * (rid2 ** 1.6 - 0.30) * 2 + zmax * 0.045 * amp ** 0.5 * (rid3 - 0.5)
    # ventana: el campo llega a cero antes del borde del dominio (sin rombo duro)
    vent = suavizar(u, 2, 22) * suavizar(W - u, 2, 22) * suavizar(v, 2, 22) * suavizar(D - v, 2, 22)
    h = ndimage.gaussian_filter(np.clip(h * vent, 0, None), 0.7)
    return h


def campo_cresta(W, D, zmax, seed=11):
    """Estribación alargada en u: línea de cresta ondulada, vertiente en ambos lados."""
    v, u = np.mgrid[0:D, 0:W].astype(float) + 0.5
    eje = D * (0.5 + 0.16 * np.sin(u * 0.045 + seed) + 0.08 * np.sin(u * 0.11 + 2 * seed))
    d = np.abs(v - eje) / (D * 0.5 * (0.55 + 0.40 * fbm(u * 0.05, 0.5, 2, seed)))
    sub = np.clip(u / (W * 0.22), 0, 1) * np.clip((W - u) / (W * 0.30), 0, 1)
    perfil = np.clip(1 - d, 0, 1) ** 1.35
    cima = 0.62 + 0.38 * fbm(u * 0.05, 3.3, 3, seed + 1)
    h = zmax * perfil * sub ** 0.7 * cima
    n = fbm(u * 0.05, v * 0.06, 4, seed + 5)
    rid = 1 - np.abs(2 * n - 1)
    h = h * (0.75 + 0.5 * rid ** 1.5)
    return np.clip(h, 0, None)


def campo_acantilado(W, D, alto, seed=21, plano=0.62):
    """Acantilado/peñasco: meseta de borde irregular con paredes casi verticales y talud al pie."""
    v, u = np.mgrid[0:D, 0:W].astype(float) + 0.5
    nu = (u - W / 2) / (W / 2)
    nv = (v - D / 2) / (D / 2)
    r = (np.abs(nu) ** 2.8 + np.abs(nv) ** 2.8) ** (1 / 2.8)
    r = r + 0.20 * (fbm(u * 0.09, v * 0.09, 3, seed) - 0.5) * 2
    h = alto * suavizar(1 - r, 0.0, 0.14)                    # pared
    h = h * (1 - plano * 0) + alto * 0.10 * (fbm(u * 0.18, v * 0.18, 2, seed + 2) - 0.5)
    h = np.where(1 - r > 0, h + alto * 0.20 * np.clip(1 - r, 0, 1) ** 0.5, h)
    return np.clip(h, 0, None)


def campo_pie(W, D, seed=31):
    """Pie de ladera: pedrera y canchal bajos, con lomas de mata; se desvanece hacia la hierba."""
    v, u = np.mgrid[0:D, 0:W].astype(float) + 0.5
    nu = (u - W / 2) / (W / 2)
    nv = (v - D / 2) / (D / 2)
    r = np.hypot(nu * 0.95, nv)
    r = r + 0.22 * (fbm(u * 0.05, v * 0.05, 3, seed) - 0.5) * 2
    env = np.clip(1 - r, 0, 1)
    n = fbm(u * 0.13, v * 0.13, 3, seed + 3)
    rid = 1 - np.abs(2 * n - 1)
    h = 12 * env ** 0.9 * (0.4 + 0.9 * rid ** 1.3)
    # rocas grandes salpicadas
    for k in range(6):
        cu = W * (0.2 + 0.6 * hash2(k, 1, seed))
        cv = D * (0.25 + 0.5 * hash2(k, 2, seed))
        rr = 5 + 7 * hash2(k, 3, seed)
        d = np.hypot(u - cu, (v - cv) * 1.2) / rr
        h = np.maximum(h, 9 * hash2(k, 4, seed) * env ** 0.4 * np.clip(1 - d * d, 0, 1) ** 0.6 + 4 * env ** 0.3 * np.clip(1 - d, 0, 1))
    return np.clip(h, 0, None)


# ---------------------------------------------------------------- sombreado

def sombra_proyectada(h, paso=1.0, largo=140, ajuste=1.5):
    """Marca las celdas a la sombra de otras: rayo hacia la luz (-u, +v). h rellena de 0 en los bordes."""
    D, W = h.shape
    hx, hy = LUZ[0], LUZ[1]
    hor = np.hypot(hx, hy)
    dx, dy = hx / hor, hy / hor
    pend = LUZ[2] / hor * ajuste           # altura que gana el rayo por unidad horizontal
    v, u = np.mgrid[0:D, 0:W].astype(float)
    sombra = np.zeros(h.shape, bool)
    s = paso
    while s <= largo:
        iu = np.clip((u + dx * s).astype(int), 0, W - 1)
        iv = np.clip((v + dy * s).astype(int), 0, D - 1)
        dentro = ((u + dx * s) >= 0) & ((u + dx * s) < W) & ((v + dy * s) >= 0) & ((v + dy * s) < D)
        sombra |= dentro & (h[iv, iu] > h + s * pend)
        s += paso
    return sombra


def luz_celdas(h):
    """Luminosidad por celda (normal · luz) y componente vertical de la normal."""
    hv, hu = np.gradient(h)
    n = np.sqrt(hu * hu + hv * hv + 1.0)
    nu, nv, nz = -hu / n, -hv / n, 1.0 / n
    return nu * LUZ[0] + nv * LUZ[1] + nz * LUZ[2], nz


# ---------------------------------------------------------------- proyección

def proyectar(h, dibujar, atributos, margen_arriba, margen_abajo=2, paso=0.5):
    """Rayo por píxel. Devuelve (ax, ay, w, h_img, iu, iv, Z, S, golpe) con las celdas golpeadas."""
    D, W = h.shape
    ax = D
    zmax = float(h.max())
    ay = int(zmax) + margen_arriba
    w = W + D
    hh = ay + (W + D) // 2 + margen_abajo
    Y, X = np.mgrid[0:hh, 0:w]
    x = X - ax + 0.5
    y = Y - ay + 0.5
    alto = np.where(dibujar, h, -1.0)
    iu_o = np.zeros((hh, w), np.int32)
    iv_o = np.zeros((hh, w), np.int32)
    Z_o = np.zeros((hh, w))
    S_o = np.zeros((hh, w))
    golpe = np.zeros((hh, w), bool)
    pend = np.flatnonzero(np.ones(hh * w, bool))
    xf, yf = x.ravel(), y.ravel()
    S = float(W + D)
    n = 0
    while S > 0 and pend.size:
        U = (S + xf[pend]) / 2.0
        V = (S - xf[pend]) / 2.0
        Z = S / 2.0 - yf[pend]
        iu = np.floor(U).astype(np.int32)
        iv = np.floor(V).astype(np.int32)
        dentro = (iu >= 0) & (iu < W) & (iv >= 0) & (iv < D)
        iuc, ivc = np.clip(iu, 0, W - 1), np.clip(iv, 0, D - 1)
        impacto = dentro & (Z <= alto[ivc, iuc]) & (Z >= -0.01)
        if impacto.any():
            k = pend[impacto]
            iu_o.ravel()[k] = iu[impacto]
            iv_o.ravel()[k] = iv[impacto]
            Z_o.ravel()[k] = Z[impacto]
            S_o.ravel()[k] = S
            golpe.ravel()[k] = True
            pend = pend[~impacto]
        S -= paso
        n += 1
    return ax, ay, w, hh, iu_o, iv_o, Z_o, S_o, golpe


# ---------------------------------------------------------------- materiales

class Pieza:
    """Sprite resultante: px (índices de paleta, TRANSP fuera), clase por píxel, huella y ancla."""
    def __init__(self, nombre, px, clase, ax, ay, W, D, zmax, S, extra=None):
        self.nombre, self.px, self.clase = nombre, px, clase
        self.ax, self.ay, self.W, self.D, self.zmax = ax, ay, W, D, zmax
        self.S = S
        self.h, self.w = px.shape
        self.extra = extra or {}

    @property
    def huella(self):
        return self.W // TILE, self.D // TILE

    @property
    def ancla(self):
        """Centro de la huella proyectado (convención de estructuras)."""
        return self.ax + (self.W - self.D) / 2, self.ay + (self.W + self.D) / 4


def dibujar_pieza(nombre, h, material, seed, margen_arriba=6, borde_desvanecido=True, sombra_suelo=False, contorno=True,
                  umbral=1.2, ruido_borde=2.6):
    """Convierte un campo de alturas en sprite. `material(ctx) -> (tono_o_indice, clase)` por píxel golpeado."""
    D, W = h.shape
    lum, nz = luz_celdas(h)
    suave = ndimage.gaussian_filter(h, 4.0)
    cav = suave - h                                          # >0 = hondonada (más oscuro), <0 = lomo (más claro)
    sombra = sombra_proyectada(h)
    v, u = np.mgrid[0:D, 0:W].astype(float)
    ruido = hash2(u.astype(int), v.astype(int), seed)
    dibuja = h > umbral + ruido_borde * ruido if borde_desvanecido else h > 0.5
    if sombra_suelo:
        dibuja = dibuja | (sombra & (h < 0.6) & (hash2(u.astype(int) // 1, v.astype(int), seed + 5) > -1))
    ax, ay, w, hh, iu, iv, Z, S, golpe = proyectar(h, dibuja, None, margen_arriba)
    Y, X = np.mgrid[0:hh, 0:w]

    class Ctx:
        pass
    ctx = Ctx()
    ctx.X, ctx.Y = X, Y
    ctx.iu, ctx.iv, ctx.Z = iu, iv, Z
    ctx.U, ctx.V = iu + 0.5, iv + 0.5
    ctx.lum = lum[iv, iu]
    ctx.nz = nz[iv, iu]
    ctx.cav = cav[iv, iu]
    ctx.sombra = sombra[iv, iu]
    ctx.h = h[iv, iu]
    ctx.W, ctx.D = W, D
    ctx.seed = seed
    ctx.golpe = golpe
    px, clase = material(ctx)
    px = np.where(golpe, px, TRANSP).astype(np.uint8)
    clase = np.where(golpe, clase, NADA)
    if contorno:
        px = contornos(px, clase, S, golpe)
    return Pieza(nombre, px, clase, ax, ay, W, D, float(h.max()), S, extra=dict(h=h, ctx=ctx, golpe=golpe))


def contornos(px, clase, S, golpe):
    """Contorno selectivo sin negro: oscurece 1-2 tonos el píxel cercano en los saltos de profundidad (aristas, siluetas)
    y añade un píxel de contorno fuera de la silueta de roca/nieve (arriba y a los lados, nunca en el pie de ladera)."""
    out = px.copy()
    pad = np.pad(S, 1)
    padg = np.pad(golpe, 1)
    h, w = px.shape
    arriba = pad[:-2, 1:-1]
    gap = S - arriba                                         # >0: el de arriba está más lejos (este lo tapa)
    salto = golpe & padg[:-2, 1:-1] & (gap > 5.5)
    izq = pad[1:-1, :-2]
    der = pad[1:-1, 2:]
    salto_lat = golpe & ((padg[1:-1, :-2] & (S - izq > 7)) | (padg[1:-1, 2:] & (S - der > 7)))
    mas = salto | salto_lat
    roca = (clase == ROCA) | (clase == NIEVE) | (clase == CANCHAL)
    out = np.where(mas & roca, LUT[-1][np.where(out == TRANSP, 0, out)], out)
    # silueta exterior (solo sobre roca/nieve): vecino opaco por debajo, a la izquierda o a la derecha
    op = out != TRANSP
    opp = np.pad(op, 1)
    clp = np.pad(clase, 1)
    pxp = np.pad(out, 1, constant_values=TRANSP)
    cand = ~op
    rocoso = lambda cc: (cc == ROCA) | (cc == NIEVE)
    fuera = np.zeros_like(op)
    elegido = np.full(out.shape, TRANSP, np.uint8)
    for dy, dx in ((1, 0), (0, -1), (0, 1)):           # vecino abajo, izquierda, derecha
        vec_op = opp[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        vec_cl = clp[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        vec_px = pxp[1 + dy:1 + dy + h, 1 + dx:1 + dx + w]
        m = cand & vec_op & rocoso(vec_cl) & ~fuera
        elegido = np.where(m, vec_px, elegido)
        fuera |= m
    nuevo = LUT[-3][np.where(elegido == TRANSP, 0, elegido)]
    out = np.where(fuera, nuevo, out).astype(np.uint8)
    return out


def _hierba(ctx, base=0.0):
    luz = ctx.lum - 0.45 * ctx.sombra + 0.9 * ctx.cav * 0.04
    t = 2.0 + (luz - 0.50) * 5.2 + base
    t = t + (hash2(ctx.X // 2, ctx.Y // 2, ctx.seed + 1) - 0.5) * 0.9
    tono = np.clip(cuantizar(t - 0.0, ctx.X, ctx.Y, 0.5), 1, 5)
    return np.array([c("hierba", int(i)) for i in range(7)], np.uint8)[tono]


def _roca_idx(ctx, desplaza=0.0, estratos=True):
    luz = ctx.lum - 0.15 * ctx.sombra - 0.9 * np.clip(ctx.cav, -3, 4) * 0.03
    t = (luz + 0.02) * 3.7 + desplaza
    if estratos:
        t = t + 0.30 * np.sin(ctx.Z * 0.62 + 5.0 * fbm(ctx.U * 0.06, ctx.V * 0.06, 2, ctx.seed + 9))
    t = t + (hash2(ctx.X, ctx.Y, ctx.seed + 4) - 0.5) * 0.25
    tono = np.clip(cuantizar(t, ctx.X, ctx.Y, 0.40), 0, 3)
    return np.array([c("roca", int(i)) for i in range(4)], np.uint8)[tono]


def _nieve_idx(ctx):
    luz = ctx.lum - 0.30 * ctx.sombra + np.clip(ctx.cav, -3, 4) * (-0.02)
    t = (luz - 0.20) * 5.2
    t = t + (hash2(ctx.X, ctx.Y, ctx.seed + 8) - 0.5) * 0.25
    tono = np.clip(cuantizar(t, ctx.X, ctx.Y, 0.40), 0, 4)
    return np.array([c("piedra", 2 + int(i)) for i in range(5)], np.uint8)[tono]


def _tierra_idx(ctx, desplaza=0.0):
    luz = ctx.lum - 0.40 * ctx.sombra
    t = 0.9 + (luz - 0.55) * 4.0 + desplaza
    t = t + (hash2(ctx.X // 2, ctx.Y, ctx.seed + 6) - 0.5) * 0.6
    tono = np.clip(cuantizar(t, ctx.X, ctx.Y, 0.5), 0, 2)
    return np.array([c("tierra", 1 + int(i)) for i in range(5)], np.uint8)[tono]


def mat_macizo(ctx):
    Z = ctx.Z
    sn = fbm(ctx.U * 0.035, ctx.V * 0.035, 3, ctx.seed + 11)
    linea = 30 + 10 * (sn - 0.5) * 2                        # cota de la nieve, irregular
    # la nieve se agarra donde la pendiente lo permite y es más densa cuanto más alto
    exceso = (Z - linea) / 30.0
    umbral = 0.56 - 0.30 * np.clip(exceso, 0, 1)
    nieve = (Z > linea) & (ctx.nz > umbral)
    # manchas de nieve en las vaguadas de la roca
    nieve |= (Z > linea - 10) & (ctx.cav > 2.2) & (ctx.nz > 0.55)
    suave = ctx.nz > 0.74
    verde = (Z < 30 + 10 * (sn - 0.5) * 2) & suave
    # límite del bosque: hierba hasta la cota; entre medias, canchal de tierra
    canchal = (~verde) & (~nieve) & (Z < 44 + 8 * (sn - 0.5) * 2) & (ctx.nz > 0.60)
    px = _roca_idx(ctx)
    clase = np.full(px.shape, ROCA)
    px = np.where(canchal, _tierra_idx(ctx), px)
    clase = np.where(canchal, CANCHAL, clase)
    px = np.where(nieve, _nieve_idx(ctx), px)
    clase = np.where(nieve, NIEVE, clase)
    px = np.where(verde, _hierba(ctx, 0.2), px)
    clase = np.where(verde, HIERBA, clase)
    # degradado en la unión verde/canchal: tramado en una franja corta
    return px, clase


def mat_cresta(ctx):
    Z = ctx.Z
    verde = (Z < 11 + 5 * (fbm(ctx.U * 0.07, ctx.V * 0.07, 2, ctx.seed + 3) - 0.5)) & (ctx.nz > 0.82)
    canchal = (~verde) & (Z < 22) & (ctx.nz > 0.66)
    px = _roca_idx(ctx, 0.1)
    clase = np.full(px.shape, ROCA)
    px = np.where(canchal, _tierra_idx(ctx, -0.2), px)
    clase = np.where(canchal, CANCHAL, clase)
    px = np.where(verde, _hierba(ctx, 0.2), px)
    clase = np.where(verde, HIERBA, clase)
    return px, clase


def mat_acantilado(ctx):
    cima = (ctx.nz > 0.88) & (ctx.Z > ctx.h * 0.55)
    verde = cima | ((ctx.Z < 3) & (ctx.nz > 0.8))
    px = _roca_idx(ctx, 0.0, estratos=True)
    clase = np.full(px.shape, ROCA)
    musgo = (hash2(ctx.X, ctx.Y // 2, ctx.seed + 9) > 0.80) & (ctx.nz > 0.5) & (ctx.nz < 0.88) & (ctx.lum > 0.6)
    px = np.where(musgo, _hierba(ctx, -0.2), px)
    px = np.where(verde, _hierba(ctx, 0.3), px)
    clase = np.where(verde, HIERBA, clase)
    return px, clase


def mat_pie(ctx):
    cent = np.clip(ctx.h / 9.0, 0, 1)
    borde = 1 - cent                                        # hacia el borde, más cerca del color del suelo
    t = hash2(ctx.U.astype(int) // 1, ctx.V.astype(int) // 1, ctx.seed + 12)
    mezcla = t < (0.78 - 0.60 * borde)                      # donde hay piedra
    roc = _roca_idx(ctx, 0.5, estratos=False)
    tie = _tierra_idx(ctx, 0.2)
    gra = _hierba(ctx, 0.3)
    px = np.where(mezcla, np.where(hash2(ctx.U.astype(int), ctx.V.astype(int), ctx.seed + 20) < 0.55, roc, tie), gra)
    clase = np.where(mezcla, CANCHAL, HIERBA)
    grande = (ctx.nz < 0.80) & (ctx.h > 5)
    px = np.where(grande, roc, px)
    clase = np.where(grande, ROCA, clase)
    return px, clase


# ---------------------------------------------------------------- árboles de ladera

def abeto(alto=22, seed=1):
    """Abeto de ladera: copa en pisos cónicos (cara izquierda cálida, derecha fría), tronco corto."""
    rng = np.random.default_rng(seed)
    w = max(9, int(alto * 0.55) | 1)
    s = Spr(w, alto + 2, w // 2, alto + 1)
    cx = w // 2
    n = max(2, alto // 7 + 1)
    tronco = 2
    y_base = alto - tronco
    for i in range(tronco):
        s.pset(cx, alto - i, c("madera", 1))
        s.pset(cx - 1, alto - i, c("madera", 2))
    alto_copa = y_base
    for k in range(n):
        f0, f1 = k / n, (k + 1) / n
        y_top = int(round(alto_copa * f0 * 0.82))
        y_bot = int(round(alto_copa * (f1 * 0.86 + 0.16)))
        y_bot = min(y_bot, y_base)
        ancho_max = (w // 2) * (0.55 + 0.45 * f1)
        for y in range(y_top, y_bot + 1):
            fy = (y - y_top) / max(1, y_bot - y_top)
            hw = max(0.5, fy * ancho_max)
            for x in range(int(cx - hw), int(cx + hw) + 1):
                dx = x - cx
                if abs(dx) > hw:
                    continue
                if dx < -0.5:
                    t = 3 if (hash2(x, y, seed) > 0.55 or fy < 0.25) else 2
                elif dx > 0.5:
                    t = 1
                else:
                    t = 2
                if y == y_bot or (y == y_bot - 1 and abs(dx) > hw - 1.6 and dx > 0):
                    t -= 1
                s.pset(x, y, c("hierba", max(0, t)))
    s.contorno(-3)
    return s


def poner(lienzo, spr, x, y):
    """Pega `spr` con su ancla en (x, y) respetando la transparencia."""
    x0, y0 = int(x - spr.ax), int(y - spr.ay)
    for yy in range(spr.h):
        for xx in range(spr.w):
            v = spr.px[yy, xx]
            if v == TRANSP:
                continue
            X, Y = x0 + xx, y0 + yy
            if 0 <= X < lienzo.shape[1] and 0 <= Y < lienzo.shape[0]:
                lienzo[Y, X] = v


def poner_pieza(lienzo, p, x, y):
    """Coloca una Pieza con su ancla (centro de la huella) en (x, y)."""
    ax, ay = p.ancla
    x0, y0 = int(round(x - ax)), int(round(y - ay))
    h, w = p.px.shape
    ys0, xs0 = max(0, -y0), max(0, -x0)
    ys1, xs1 = min(h, lienzo.shape[0] - y0), min(w, lienzo.shape[1] - x0)
    if ys1 <= ys0 or xs1 <= xs0:
        return
    sub = p.px[ys0:ys1, xs0:xs1]
    dst = lienzo[y0 + ys0:y0 + ys1, x0 + xs0:x0 + xs1]
    lienzo[y0 + ys0:y0 + ys1, x0 + xs0:x0 + xs1] = np.where(sub != TRANSP, sub, dst)
    return x0, y0


def arboles_en(p, x0, y0, lienzo, rng, n, zmin, zmax, nzmin, sep=8, altos=(14, 22), solo=(HIERBA,)):
    """Siembra abetos sobre la superficie visible de la pieza (clase `solo`, cota y pendiente dadas)."""
    ctx = p.extra["ctx"]
    cand = np.argwhere((np.isin(p.clase, solo)) & (ctx.Z > zmin) & (ctx.Z < zmax) & (ctx.nz > nzmin))
    if not len(cand):
        return 0
    rng.shuffle(cand)
    puestos = []
    for yy, xx in cand:
        if len(puestos) >= n:
            break
        if all((xx - a) ** 2 + 1.8 * (yy - b) ** 2 > sep ** 2 for a, b in puestos):
            puestos.append((xx, yy))
    for xx, yy in sorted(puestos, key=lambda t: t[1]):
        alto = int(rng.integers(altos[0], altos[1] + 1))
        poner(lienzo, abeto(alto, int(rng.integers(1, 9999))), x0 + xx, y0 + yy)
    return len(puestos)


# ---------------------------------------------------------------- suelo y escena

def suelo(w, h, seed=2):
    Y, X = np.mgrid[0:h, 0:w]
    n = fbm(X * 0.028, Y * 0.040, 3, seed)
    t = 3.0 + (n - 0.5) * 3.2 + (fbm(X * 0.12, Y * 0.17, 2, seed + 1) - 0.5) * 0.7
    t = 3.0 + (t - 3.0)
    tono = np.clip(cuantizar(t, X, Y, 1.0), 2, 4)
    return np.array([c("hierba", int(i)) for i in range(7)], np.uint8)[tono]


def fuente_caja(lienzo, x, y, s, fondo, color, sombra):
    w = fuente.ancho(s)
    lienzo[y - 3:y + 9, x - 3:x + w + 3] = fondo
    fuente.texto(lienzo, x, y, s, color, sombra)


def piezas():
    return [
        dibujar_pieza("macizo", campo_macizo(272, 176, 140, seed=3), mat_macizo, 3, margen_arriba=4, ruido_borde=2.2),
        dibujar_pieza("cresta", campo_cresta(160, 64, 62, seed=11), mat_cresta, 11, ruido_borde=1.6),
        dibujar_pieza("acantilado_2x2", campo_acantilado(32, 32, 20, seed=21), mat_acantilado, 21, ruido_borde=0.6),
        dibujar_pieza("acantilado_3x2", campo_acantilado(48, 32, 26, seed=22), mat_acantilado, 22, ruido_borde=0.6),
        dibujar_pieza("pie_ladera", campo_pie(64, 48, seed=31), mat_pie, 31, ruido_borde=1.0, contorno=False),
    ]


def componer(P):
    """Escena B: 480x270, llano abajo a la izquierda y macizo arriba a la derecha."""
    W_, H_ = 480, 270
    lienzo = suelo(W_, H_)
    rng = np.random.default_rng(7)
    macizo, cresta, pena_a, pena_b, pie = P
    cols = []

    def poner_p(p, x, y, arboles=None):
        x0, y0 = poner_pieza(lienzo, p, x, y)
        if arboles:
            arboles_en(p, x0, y0, lienzo, rng, **arboles)

    poner_p(cresta, 215, 70, dict(n=8, zmin=1, zmax=13, nzmin=0.85, sep=9, altos=(12, 18)))
    poner_p(macizo, 372, 214, dict(n=60, zmin=2, zmax=28, nzmin=0.80, sep=8, altos=(14, 24)))
    poner_p(pie, 228, 196)
    poner_p(pie, 262, 236)
    poner_p(pena_b, 168, 150)
    poner_p(pena_a, 232, 252)
    # abetos y arbustos sueltos en el llano
    for x, y, a in ((126, 120, 20), (140, 128, 16), (112, 134, 14), (60, 70, 22), (74, 80, 18), (46, 84, 16), (30, 150, 20),
                    (44, 160, 15), (186, 232, 18), (200, 244, 22), (70, 200, 17), (96, 214, 21), (330, 236, 20)):
        poner(lienzo, abeto(a, int(rng.integers(1, 9999))), x, y)
    for x, y in ((100, 160), (152, 196), (88, 240), (24, 210)):
        poner(lienzo, AR.arbusto(int(rng.integers(1, 99)), 0.9), x, y)
    return lienzo


def etiquetas(lienzo, x, y, s):
    fondo = c("tinta", 0)
    w = fuente.ancho(s)
    lienzo[y - 3:y + 9, x - 3:x + w + 3] = fondo
    fuente.texto(lienzo, x, y, s, c("tierra", 6), c("tinta", 0))


def evidencia_a():
    """A: el recorte actual del juego tal cual. La captura está a x2; la lógica es 480x270."""
    rgb = np.array(Image.open(EVIDENCIA).convert("RGB"))
    nat = rgb[::2, ::2]
    assert np.array_equal(np.repeat(np.repeat(nat, 2, 0), 2, 1), rgb), "la evidencia no es x2 exacta"
    tabla = {tuple(int(v) for v in col): i for i, col in enumerate(PALETA_RGB)}
    idx = np.zeros(nat.shape[:2], np.uint8)
    for yy in range(nat.shape[0]):
        for xx in range(nat.shape[1]):
            idx[yy, xx] = tabla[tuple(int(v) for v in nat[yy, xx])]
    return idx


def hoja_comparativa(ruta):
    a = evidencia_a()
    b = componer(piezas_cache())
    etiquetas(a, 8, 8, "A ACTUAL")
    etiquetas(b, 8, 8, "B PIEZAS")
    b[:, 0] = c("tinta", 0)
    img = np.concatenate([a, b], axis=1)
    rgb = np.repeat(np.repeat(a_rgb(img), 2, 0), 2, 1)
    Image.fromarray(rgb).save(ruta)
    return img


def hoja_piezas(ruta, P):
    """Cada pieza sola sobre hierba, con huella (rombo oro), ancla (cruz carmesí) y rótulo; todo en espacio nativo, luego x4."""
    margen, ancho_max = 8, 560
    filas, x, y, alto_f = [], margen, margen, 0
    colocados = []
    for p in P:
        if x + max(p.w, 96) + margen > ancho_max:
            x, y, alto_f = margen, y + alto_f + margen + 24, 0
        colocados.append((p, x, y + 22))
        x += max(p.w, 96) + margen
        alto_f = max(alto_f, p.h + 0)
    total_h = y + alto_f + margen + 24
    lienzo = np.full((total_h, ancho_max), c("hierba", 3), np.uint8)
    for p, x0, y0 in colocados:
        sub = lienzo[y0:y0 + p.h, x0:x0 + p.w]
        lienzo[y0:y0 + p.h, x0:x0 + p.w] = np.where(p.px != TRANSP, p.px, sub)
        ox, oy = x0 + p.ax, y0 + p.ay
        pts = [(ox, oy), (ox + p.W, oy + p.W / 2), (ox + p.W - p.D, oy + (p.W + p.D) / 2), (ox - p.D, oy + p.D / 2)]
        im = Image.fromarray(lienzo)
        from PIL import ImageDraw
        d = ImageDraw.Draw(im)
        d.polygon([(int(a), int(b)) for a, b in pts], outline=int(c("oro", 2)))
        lienzo = np.array(im)
        ax_, ay_ = p.ancla
        cx, cy = int(x0 + ax_), int(y0 + ay_)
        for k in range(-3, 4):
            for (xx, yy) in ((cx + k, cy), (cx, cy + k)):
                if 0 <= yy < lienzo.shape[0] and 0 <= xx < lienzo.shape[1]:
                    lienzo[yy, xx] = c("carmesi", 2)
        wt, dt = p.huella
        nom = p.nombre.upper().replace("_", " ")
        etiquetas(lienzo, x0, y0 - 11, nom)
        etiquetas(lienzo, x0, y0 - 1, f"{wt}X{dt} T  A {int(round(ax_))},{int(round(ay_))}")
    rgb = np.repeat(np.repeat(a_rgb(lienzo), 4, 0), 4, 1)
    Image.fromarray(rgb).save(ruta)


_CACHE = []


def piezas_cache():
    if not _CACHE:
        _CACHE.extend(piezas())
    return _CACHE


if __name__ == "__main__":
    os.makedirs(SALIDA, exist_ok=True)
    hoja_comparativa(os.path.join(SALIDA, "montanas_comparativa_x2.png"))
    hoja_piezas(os.path.join(SALIDA, "montanas_piezas_x4.png"), piezas_cache())
