"""Templo de Júpiter 5x5 tiles: etapa 1 (solar), 2 (obra) y 3 (terminado). Píxel a píxel."""
import numpy as np
from paleta import c, TRANSP, TINTA
from util import hash2, fbm
from iso import Spr
from render import RID, a_indice
from edificios import (caja, fn_sillar, fn_plano, techo_tejas, estuco, pared_estuco)

M = "piedra"


def f_mar(tono, seed=1, vetas=True):
    """Mármol liso con vetas finas."""
    def fn(s, t, X, Y):
        n = fbm(s * 0.07 + seed, t * 0.11, 2, seed)
        tn = tono + (n - 0.5) * 0.6
        if vetas:
            v = np.sin((s * 0.5 + t * 0.9) * 0.8 + n * 6) > 0.93
            tn = np.where(v, tn - 0.7, tn)
        return a_indice(np.full(s.shape, RID[M]), tn)
    return fn


def f_losa(tono, seed=1, cel=10):
    def fn(s, t, X, Y):
        j = (np.mod(s, cel) < 0.9) | (np.mod(t, cel) < 0.9)
        v = (hash2(np.floor(s / cel), np.floor(t / cel), seed) - 0.5) * 0.9
        return a_indice(np.full(s.shape, RID[M]), tono + v - j * 1.1)
    return fn


def f_mar_top(tono, seed=1):
    def fn(s, t, X, Y):
        n = fbm(s * 0.09 + seed, t * 0.09, 2, seed)
        return a_indice(np.full(s.shape, RID[M]), tono + (n - 0.5) * 0.5)
    return fn


# ------------------------------------------------------------------ piezas
def paso(s, u0, u1, v0, v1, z0, dz, seed, losa=False):
    """Escalón de mármol: caras izq (+v) clara, der (+u) en sombra, tapa muy clara."""
    caja(s, u0, v0, z0, u1 - u0, v1 - v0, dz,
         f_mar(4.4, seed), f_mar(2.3, seed + 1), f_losa(5.0, seed + 2) if losa else f_mar_top(5.2, seed + 2), fid=10)


def columna(s, u, v, z0, h, capitel=True, tambores=False, seed=0, base=True):
    """Columna dórica de 6 px de ancho. h = altura del fuste."""
    cx = int(round(s.ax + (u - v)))
    by = int(round(s.ay + (u + v) / 2 - z0))
    if base:
        caja(s, u - 4, v - 4, z0, 8, 8, 2, f_mar(4.2, seed), f_mar(2.2, seed), f_mar_top(5.0, seed))
        z0b = z0 + 2
    else:
        z0b = z0
    by = int(round(s.ay + (u + v) / 2 - z0b))
    tonos = [5.3, 5.8, 4.6, 3.7, 2.8, 2.1]
    for i in range(6):
        x = cx - 3 + i
        for k in range(h):
            y = by - 1 - k
            t = tonos[i]
            # estrías: línea más oscura
            if i == 2 and k % 1 == 0:
                t -= 0.5
            if tambores and k % 9 == 8:
                t -= 1.1
            s.pset(x, y, c(M, int(round(t))))
        # borde inferior redondeado
        if i in (1, 2, 3, 4):
            s.pset(x, by, c(M, int(round(tonos[i] - 0.9))))
    # tapa del fuste (elipse clara) si no hay capitel
    if not capitel:
        ty = by - h
        for i in range(6):
            s.pset(cx - 3 + i, ty - 1, c(M, 6 if i < 4 else 5))
        for i in (1, 2, 3, 4):
            s.pset(cx - 3 + i, ty - 2, c(M, 6))
    if capitel:
        zc = z0b + h
        # equino (7 de ancho) y ábaco (10)
        caja(s, u - 3.5, v - 3.5, zc, 7, 7, 2, f_mar(4.0, seed), f_mar(2.0, seed), f_mar_top(5.0, seed))
        caja(s, u - 5, v - 5, zc + 2, 10, 10, 2, f_mar(4.6, seed), f_mar(2.5, seed), f_mar_top(5.6, seed))


def entablamento_frente(s, u0, u1, v, z, seed=3, hasta=None):
    """Arquitrabe + friso con triglifos + cornisa sobre la fila frontal (a lo largo de u)."""
    u1 = u1 if hasta is None else hasta
    vm = v - 5
    # arquitrabe
    caja(s, u0, vm, z, u1 - u0, 10, 5, f_mar(4.3, seed), f_mar(2.3, seed), f_mar_top(5.5, seed))
    # friso con triglifos (bandas verticales oscuras) y metopas
    def friso(sv, t, X, Y):
        per = np.mod(sv, 12.0)
        trig = (per < 4.0)
        base = a_indice(np.full(sv.shape, RID[M]), np.where(trig, 3.6 + (np.mod(sv, 1.3) < 0.5) * -0.7, 4.8))
        return base
    s.cara((u0, v + 5, z + 5), (1, 0, 0), u1 - u0, (0, 0, 1), 6, friso, fid=11)
    # cara lateral del friso (derecha) en sombra
    s.cara((u1, vm, z + 5), (0, 1, 0), 10, (0, 0, 1), 6, f_mar(2.6, seed), fid=12)
    # cornisa con voladizo
    caja(s, u0 - 2, vm - 2, z + 11, u1 - u0 + 4, 14, 3, f_mar(4.8, seed + 1), f_mar(2.6, seed + 1),
         f_mar_top(5.8, seed + 1))


def entablamento_der(s, v0, v1, u, z, seed=5):
    """Entablamento lateral derecho (a lo largo de v)."""
    um = u - 5
    caja(s, um, v0, z, 10, v1 - v0, 5, f_mar(4.3, seed), f_mar(2.3, seed), f_mar_top(5.5, seed))
    def friso(sv, t, X, Y):
        per = np.mod(sv, 12.0)
        return a_indice(np.full(sv.shape, RID[M]), np.where(per < 4.0, 1.9, 2.8))
    s.cara((u + 5, v0, z + 5), (0, 1, 0), v1 - v0, (0, 0, 1), 6, friso, fid=12)
    caja(s, um - 2, v0 - 2, z + 11, 14, v1 - v0 + 4, 3, f_mar(4.8, seed + 1), f_mar(2.6, seed + 1),
         f_mar_top(5.8, seed + 1))


def friso_triang(s, u0, u1, v, z, alto, seed=4):
    """Frontón triangular con tímpano hundido, cornisa y acróteras."""
    L = u1 - u0
    def mk(ss, tt):
        return tt < alto * (1 - np.abs(2 * ss / L - 1))
    def timp(ss, tt, X, Y):
        n = fbm(ss * 0.1, tt * 0.1, 2, seed)
        base = 3.3 + (n - 0.5) * 0.6
        # relieve: figuras claras en el centro
        cen = np.abs(ss - L / 2)
        fig = (hash2(np.floor(ss / 3), 3, seed) > 0.55) & (cen < L * 0.36) & (tt > 1) & (tt < 4.5 + (1 - cen / (L / 2)) * 4)
        base = np.where(fig, 5.2, base)
        return a_indice(np.full(ss.shape, RID[M]), base)
    s.cara((u0, v, z), (1, 0, 0), L, (0, 0, 1), alto, timp, fid=13, mascara=mk)
    # cornisa inclinada (marco claro) a lo largo de ambas pendientes
    for k in range(3):
        s.lineaz((u0, v + 1, z + k), (u0 + L / 2, v + 1, z + alto + k), c(M, 6 if k == 0 else 5))
        s.lineaz((u0 + L, v + 1, z + k), (u0 + L / 2, v + 1, z + alto + k), c(M, 5 if k == 0 else 4))
    s.lineaz((u0, v + 1, z - 1), (u0 + L, v + 1, z - 1), c(M, 6))
    # acróteras doradas
    for (uu, hh) in ((u0 + L / 2, alto + 2), (u0 + 1, 2), (u0 + L - 1, 2)):
        x, y = s.P(uu, v + 1, z + hh)
        s.pset(x, y - 1, c("oro", 2))
        s.pset(x, y, c("oro", 1))
        s.pset(x - 1, y, c("oro", 2))
        s.pset(x + 1, y, c("oro", 0))


def tejado_templo(s, v0, v1, u_ext, u_cum, z, alto, seed=7):
    """Tejado de dos aguas (cumbrera a lo largo de v): faldón izquierdo en sombra + derecho."""
    ue_izq = 2 * u_cum - u_ext
    techo_tejas(s, (ue_izq, v0, z), (0, 1, 0), v1 - v0, ((u_ext - u_cum), 0, alto), "teja", 0.6, seed=seed + 3,
                ncursos=5, ancho_teja=5, fid=4)
    techo_tejas(s, (u_ext, v0, z), (0, 1, 0), v1 - v0, (-(u_ext - u_cum), 0, alto), "teja", 2.4, seed=seed,
                ncursos=9, ancho_teja=5)
    # cumbrera dorada
    s.lineaz((u_cum, v0, z + alto), (u_cum, v1, z + alto), c("teja", 4))
    s.lineaz((u_cum, v0, z + alto + 1), (u_cum, v1, z + alto + 1), c("tierra", 5))


def cella(s, u0, u1, v0, v1, z0, h, parcial=None, seed=8):
    """Naos de mármol con sillares. parcial: función de altura por columna (obra)."""
    fl = fn_sillar(M, 4.2, seed, bw=14, bh=5, junta=1.2, var=0.8)
    fr = fn_sillar(M, 2.2, seed + 1, bw=14, bh=5, junta=1.0, var=0.7)
    hz = h
    mk_l = None
    mk_r = None
    if parcial is not None:
        mk_l = lambda ss, tt: tt < parcial(ss, 0)
        mk_r = lambda ss, tt: tt < parcial(ss, 1)
        _fl, _fr = fl, fr
        def fl(ss, tt, X, Y):
            o = _fl(ss, tt, X, Y)
            return np.where(tt > parcial(ss, 0) - 1.6, c(M, 6), o)
        def fr(ss, tt, X, Y):
            o = _fr(ss, tt, X, Y)
            return np.where(tt > parcial(ss, 1) - 1.6, c(M, 4), o)
    s.cara((u0, v1, z0), (1, 0, 0), u1 - u0, (0, 0, 1), hz, fl, fid=14, mascara=mk_l)
    s.cara((u1, v0, z0), (0, 1, 0), v1 - v0, (0, 0, 1), hz, fr, fid=15, mascara=mk_r)


def puerta_cella(s, u, v, z0, w=11, h=22):
    s.cara((u, v, z0), (1, 0, 0), w, (0, 0, 1), h,
           lambda ss, tt, X, Y: a_indice(
               np.full(ss.shape, RID["madera"]),
               1.4 + (np.floor(ss) % 3 == 0) * -0.8 + (tt / h) * 0.6 + (np.floor(tt) % 7 == 0) * -0.7),
           fid=16)
    # marco y dintel de mármol
    s.cara((u - 1.5, v, z0), (1, 0, 0), 1.5, (0, 0, 1), h + 3, f_mar(5.5, 5), fid=17)
    s.cara((u + w, v, z0), (1, 0, 0), 1.5, (0, 0, 1), h + 3, f_mar(4.2, 6), fid=17)
    s.cara((u - 1.5, v, z0 + h), (1, 0, 0), w + 3, (0, 0, 1), 3, f_mar(5.8, 7), fid=17)
    # picaporte y bandas de bronce
    x, y = s.P(u + w * 0.5, v, z0 + h * 0.45)
    s.pset(x, y, c("oro", 2))
    s.pset(x - 1, y, c("oro", 1))


# ------------------------------------------------------------------ obra
def poste(s, u, v, z0, z1, ancho=1):
    x0, y0 = s.P(u, v, z0)
    x1, y1 = s.P(u, v, z1)
    for k in range(ancho):
        s.linea((x0 + k, y0), (x1 + k, y1), c("madera", 3 if k == 0 else 2))
    s.linea((x0 + ancho, y0), (x1 + ancho, y1), c("madera", 1))


def viga(s, a, b, tono=3):
    s.lineaz(a, b, c("madera", tono))
    s.lineaz((a[0], a[1], a[2] - 0.0), (b[0], b[1], b[2] - 0.0), c("madera", tono))


def plataforma(s, u, v, z, du, dv, seed=0):
    def tabla(ss, tt, X, Y):
        return a_indice(np.full(ss.shape, RID["madera"]), 3.0 + (np.floor(ss / 3) % 2) * 0.7 - (np.mod(ss, 3) < 0.5) * 1.2)
    caja(s, u, v, z, du, dv, 2,
         lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["madera"]), 2.6 - (tt > 1) * 0.0),
         lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["madera"]), 1.2),
         lambda ss, tt, X, Y: a_indice(np.full(ss.shape, RID["madera"]),
                                       3.2 + (np.floor(ss / 4) % 2) * 0.6 - (np.mod(ss, 4) < 0.5) * 1.3),
         fid=20)


def andamio(s, u0, u1, v, z_top, niveles=(14, 30, 46), seed=1):
    """Andamio de madera paralelo al eje u, delante del plano v."""
    n = int((u1 - u0) // 14) + 1
    us = [u0 + i * (u1 - u0) / max(1, n - 1) for i in range(n)]
    for uu in us:
        poste(s, uu, v + 6, 9, z_top)
        poste(s, uu, v + 12, 9, z_top - 4)
    for z in niveles:
        if z > z_top:
            continue
        for a, b in zip(us[:-1], us[1:]):
            plataforma(s, a, v + 4, z, b - a, 10)
            viga(s, (a, v + 6, z - 1), (b, v + 6, z - 1), 2)
            viga(s, (a, v + 6, z), (b, v + 12, z + 4), 2)
    # riostras en cruz
    for a, b in zip(us[:-1], us[1:]):
        s.lineaz((a, v + 12, 10), (b, v + 12, niveles[1] if niveles[1] <= z_top else z_top), c("madera", 2))
        s.lineaz((b, v + 12, 10), (a, v + 12, niveles[1] if niveles[1] <= z_top else z_top), c("madera", 1))
    # escalera
    uu = us[1] + 2
    for k in range(0, z_top - 8, 4):
        x, y = s.P(uu, v + 11, 9 + k)
        s.linea((x - 2, y), (x + 2, y), c("madera", 4))
    poste(s, uu - 1, v + 11, 9, z_top - 4)
    poste(s, uu + 2, v + 11, 9, z_top - 4)


def bloques_marmol(s, u, v, z, fil=2, col=3, tam=(8, 6, 6), seed=0):
    """Pila de bloques de mármol sin tallar."""
    du, dv, dz = tam
    for k in range(fil):
        for i in range(col - k):
            uu = u + i * (du + 1) + k * 4
            caja(s, uu, v, z + k * dz, du, dv, dz, f_mar(4.4 + (i % 2) * 0.3, seed + i + k),
                 f_mar(2.3, seed + i), f_mar_top(5.5, seed + i), fid=30)


def tambor_tumbado(s, u, v, z, largo=11, diam=6):
    """Tambor de columna tumbado sobre el suelo (eje a lo largo de u)."""
    x0, y0 = s.P(u, v, z)
    for i in range(largo):
        for j in range(diam):
            dy = j - diam / 2
            t = 5.9 - j * 0.65
            x = int(x0 + i + j * 0.0)
            y = int(y0 - diam + j + i * 0.5)
            s.pset(x, y, c(M, int(round(t))))
    for j in range(diam):
        s.pset(int(x0 + largo - 1), int(y0 - diam + j + (largo - 1) * 0.5), c(M, 6 if j < 3 else 4))


def grua(s, u, v, z0, seed=3):
    """Grúa de madera con polea, brazo y bloque colgando."""
    # dos patas inclinadas en A y mástil
    h = 58
    for du in (-7, 7):
        s.lineaz((u + du, v + 4, z0), (u, v, z0 + h), c("madera", 2))
        s.lineaz((u + du + 1, v + 4, z0), (u + 1, v, z0 + h), c("madera", 3))
    s.lineaz((u, v + 9, z0), (u, v, z0 + h), c("madera", 1))
    s.lineaz((u + 1, v + 9, z0), (u + 1, v, z0 + h), c("madera", 2))
    # brazo horizontal
    s.lineaz((u - 2, v, z0 + h - 2), (u - 2, v + 28, z0 + h - 2), c("madera", 3))
    s.lineaz((u - 2, v, z0 + h - 3), (u - 2, v + 28, z0 + h - 3), c("madera", 2))
    s.lineaz((u - 2, v + 28, z0 + h - 2), (u - 2, v + 22, z0 + h - 12), c("madera", 2))
    # cuerda y bloque colgando
    s.lineaz((u - 2, v + 26, z0 + h - 3), (u - 2, v + 26, z0 + h - 24), c("piedra", 4))
    caja(s, u - 6, v + 22, z0 + h - 32, 8, 8, 8, f_mar(5.0, 9), f_mar(2.7, 9), f_mar_top(6, 9), fid=31)
    # rueda de esclavos (tambor) al lado
    cx, cy = s.P(u + 9, v + 4, z0 + 16)
    for ang in np.linspace(0, 2 * np.pi, 28, endpoint=False):
        s.pset(cx + np.cos(ang) * 9, cy + np.sin(ang) * 9, c("madera", 3))
    for ang in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        s.linea((cx, cy), (cx + np.cos(ang) * 9, cy + np.sin(ang) * 9), c("madera", 2))
    s.pset(cx, cy, c("roca", 3))


# ------------------------------------------------------------------ plantilla
def templo(etapa=3):
    s = Spr(230, 250, 108, 150)
    # estilóbato de tres escalones
    paso(s, 0, 80, 0, 80, 0, 3, 1)
    paso(s, 3, 77, 3, 77, 3, 3, 4)
    paso(s, 6, 74, 6, 74, 6, 3, 7, losa=True)
    Z = 9
    ZC = Z + 36 + 5          # cota de la base del arquitrabe
    col_u = [10, 22, 34, 46, 58, 70]
    cvs = [10, 22, 34, 46, 58, 70]
    if etapa == 3:
        # cella alta
        cella(s, 20, 60, 18, 64, Z, 48)
        puerta_cella(s, 34, 64, Z, 11, 22)
        # columnas ordenadas por profundidad
        lista = [(u, 70) for u in col_u] + [(70, v) for v in cvs[:-1]] + [(10, v) for v in cvs[:-1]]
        lista.sort(key=lambda p: p[0] + p[1])
        for (u, v) in lista:
            columna(s, u, v, Z, 36, seed=int(u + v))
        # entablamento derecho (a lo largo de v) y frontal
        entablamento_der(s, 8, 72, 70, ZC)
        entablamento_frente(s, 8, 72, 70, ZC)
        friso_triang(s, 6, 74, 77, ZC + 14, 15)
        tejado_templo(s, -2, 78, 76, 40, ZC + 14, 15)
    elif etapa == 2:
        # cella a medio construir: altura irregular
        def par(ss, lado):
            base = 22 if lado == 0 else 14
            return base + np.floor(hash2(np.floor(ss / 6), lado + 4, 11) * 3) * 2 + np.where(ss > 24, -8, 0) * (lado == 0)
        cella(s, 20, 60, 18, 64, Z, 40, parcial=par)
        puerta_cella(s, 34, 64, Z, 11, 18)
        lista = []
        # fila frontal: 3 completas, 1 a medias, 1 en base, 1 sin empezar
        estado_f = ["full", "full", "full", "tambor", "base", "nada"]
        estado_d = {58: "tambor2", 46: "full", 34: "full", 22: "full", 10: "full"}
        for u, e in zip(col_u, estado_f):
            lista.append((u, 70, e))
        for v in cvs[:-1]:
            lista.append((70, v, "nada" if v > 52 else ("base" if v > 40 else "full")))
        for v in cvs[:-1]:
            lista.append((10, v, "full" if v < 52 else "base"))
        lista.sort(key=lambda p: p[0] + p[1])
        for (u, v, e) in lista:
            if e == "full":
                columna(s, u, v, Z, 36, seed=int(u + v))
            elif e == "tambor":
                columna(s, u, v, Z, 22, capitel=False, tambores=True, seed=int(u + v))
            elif e == "base":
                columna(s, u, v, Z, 9, capitel=False, tambores=True, seed=int(u + v))
            elif e == "nada":
                caja(s, u - 4, v - 4, Z, 8, 8, 2, f_mar(4.6, 1), f_mar(2.5, 1), f_mar_top(5.4, 1))
        # arquitrabe solo sobre las 3 primeras columnas frontales
        entablamento_frente(s, 8, 40, 70, ZC)
        # escalera / rampa de obra a la derecha
        andamio(s, 40, 78, 70, 44, niveles=(14, 30, 44))
        # grúa y materiales
        grua(s, 92, 18, 0)
        bloques_marmol(s, 56, 80, 0, fil=2, col=3, seed=21)
        # vigas del futuro tejado apiladas
        for k in range(4):
            s.lineaz((84, 22, 4 + k * 2), (84, 54, 4 + k * 2), c("madera", 3 if k % 2 else 2))
        # armazón de madera del frontón y cabios del tejado sobre la parte ya levantada
        for v in (76, 64, 52, 40):
            s.lineaz((8, v, ZC + 14), (40, v, ZC + 29), c("madera", 3))
            s.lineaz((8, v, ZC + 13), (40, v, ZC + 28), c("madera", 1))
        s.lineaz((40, 76, ZC + 29), (40, 40, ZC + 29), c("madera", 4))
        s.lineaz((40, 76, ZC + 28), (40, 40, ZC + 28), c("madera", 2))
        for u in (8, 24, 40):
            zz = ZC + 14 + (u - 8) / 32 * 15
            s.lineaz((u, 76, ZC + 14), (u, 76, zz), c("madera", 2))
        s.lineaz((8, 76, ZC + 14), (40, 76, ZC + 14), c("madera", 4))
        # primeras hileras de tejas colocadas en la parte baja
        techo_tejas(s, (8, 40, ZC + 14), (0, 1, 0), 36, (16, 0, 8), "teja", 2.9, seed=3, ncursos=3, ancho_teja=5)
    else:
        solar(s)
    s.contorno(-3)
    return s.recortar()


def solar(s):
    """Etapa 1: solar nivelado, trinchera de cimientos, estacas con cuerda y montones de material."""
    def tierra_f(ramp="tierra", tono=2.6):
        def fn(ss, tt, X, Y):
            n = fbm(ss * 0.13, tt * 0.13, 2, 5)
            hh = hash2(np.floor(ss), np.floor(tt), 7)
            return a_indice(np.full(ss.shape, RID[ramp]), tono + (n - 0.5) * 1.3 + (hh > 0.95) * 0.9 - (hh < 0.05))
        return fn
    s.cara((-6, -6, 0), (1, 0, 0), 92, (0, 1, 0), 92, tierra_f(), fid=40)
    # trinchera de cimientos (marco oscuro hundido)
    def zanja(ss, tt, X, Y):
        borde = (ss < 5) | (ss > 69) | (tt < 5) | (tt > 69)
        return np.where(borde, a_indice(np.full(ss.shape, RID["tierra"]), np.full(ss.shape, 1.1)),
                        a_indice(np.full(ss.shape, RID["tierra"]), 2.4 + (hash2(np.floor(ss / 3), np.floor(tt / 3), 9) > 0.9) * 0.8))
    s.cara((6, 6, 0.1), (1, 0, 0), 74, (0, 1, 0), 74, zanja, fid=41,
           mascara=lambda ss, tt: ((ss < 5) | (ss > 69) | (tt < 5) | (tt > 69)))
    # estacas y cuerda blanca en el perímetro
    pts = [(0, 0), (80, 0), (80, 80), (0, 80)]
    for (u, v) in pts:
        poste(s, u, v, 0, 9, 1)
    for i in range(4):
        (u0, v0), (u1, v1) = pts[i], pts[(i + 1) % 4]
        s.lineaz((u0, v0, 8), (u1, v1, 8), c("piedra", 5))
    for k in range(1, 4):
        for (u0, v0, u1, v1) in ((20 * k, 0, 20 * k, 80), (0, 20 * k, 80, 20 * k)):
            pass
    for (u, v) in ((20, 0), (40, 0), (60, 0), (0, 20), (0, 40), (0, 60), (80, 20), (80, 40), (80, 60), (20, 80), (40, 80), (60, 80)):
        poste(s, u, v, 0, 5, 1)
    # montones de piedra sin tallar y tablones
    bloques_marmol(s, 20, 90, 0, fil=2, col=3, seed=33)
    bloques_marmol(s, 92, 20, 0, fil=1, col=2, seed=35)
    for k in range(5):
        s.lineaz((-14, 14 + k * 3, 1 + k * 0.5), (-14, 44 + k * 3, 1 + k * 0.5), c("madera", 3 if k % 2 else 2))
    # cobertizo de lona para los obreros
    for du in (0, 14):
        poste(s, 92 + du, 54, 0, 12, 1)
    plataforma(s, 90, 52, 12, 18, 14)
