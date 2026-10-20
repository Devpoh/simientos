"""Escena final de IMPERIUM (960x540): parte estática. Todo lo que se mueve va en animacion.py."""
import numpy as np
import terreno as T
from terreno import tp, SW, SH, GW, GH, rect
from escena import Escena, Objeto
import edificios as E
import edificios2 as E2
import templo as TP
import props as PR
import arboles as A
import plano
import barcos as BA


def suelo(e, spr, u, v, h=6.0, extra=0.0, ztest=True, nombre=""):
    """Sprite con el origen en el punto de suelo (u, v) (coordenadas de tile)."""
    gx, gy = tp(u, v)
    o = Objeto(spr, gx, gy, h, gy + extra, ztest, nombre)
    e.obj.append(o)
    return o


def humo_de(e, o: Objeto, spr):
    """Registra el punto de salida del humo de una casa con chimenea."""
    ch = getattr(spr, "chimenea", None)
    if not ch:
        return
    cu, cv, cz = ch
    sx = o.gx + (cu - cv)
    sy = o.gy + (cu + cv) / 2 - (o.h + cz)
    e.chimeneas.append((sx - spr.ax * 0 , sy))


# ---- barcos: (fabrica, u0, v0, eslora_px, orientación, nombre)
BARCOS = [
    (lambda: BA.galera("v"), 13.3, 15.5, 60, "v", "galera"),
    (lambda: BA.mercante("v"), 18.4, 15.6, 46, "v", "mercante"),
    (lambda: BA.pesquero("u"), 3.8, 19.2, 30, "u", "pesquero1"),
    (lambda: BA.galera("u"), 6.0, 22.2, 60, "u", "galera2"),
    (lambda: BA.pesquero("u"), 22.5, 17.6, 30, "u", "pesquero2"),
]


def agua_valida(m, u0, v0, L, orient, beam=7, margen=1):
    """¿Todo el casco (con holgura de deriva) está sobre agua libre?"""
    for a in np.arange(-2, L + 3, 3):
        for b in np.arange(-beam - margen, beam + margen + 1, 3):
            uu, vv = (u0 + a / 16.0, v0 + b / 16.0) if orient == "u" else (u0 + b / 16.0, v0 + a / 16.0)
            gx, gy = tp(uu, vv)
            gx, gy = int(round(gx)), int(round(gy))
            if not (0 <= gx < GW and 0 <= gy < GH) or not m.agua[gy, gx]:
                return False
    return True


def construir(semilla=5):
    e = Escena()
    m = e.m
    e.chimeneas = []
    rng = np.random.default_rng(semilla)

    def casa(u, v, w=2, d=2, **kw):
        spr = E.casa(w, d, **kw)
        o = e.en_tile(spr, u, v, w, d, alto_sombra=30, nombre="casa")
        humo_de(e, o, spr)
        return o

    # ---------------- templo en obra (centro) y torres de la muralla
    e.en_tile(TP.templo(2), 12, 4, 5, 5, alto_sombra=50, nombre="templo")
    e.en_tile(E2.torre(), 24.0, 0.9, 1.6, 1.6, alto_sombra=42, nombre="torre_e")
    e.en_tile(E2.torre(), 0.9, 0.9, 1.6, 1.6, alto_sombra=42, nombre="torre_o")

    # ---------------- barrio oeste (calles a ambos lados, manzanas separadas)
    casa(0.4, 2.9, eje="u", seed=3)
    e.en_tile(E2.solar_casa(), 0.4, 6.2, 2, 2, nombre="solar")
    casa(0.4, 9.5, eje="u", pared="piedra", t_lit=5.0, seed=11, postigo="teja")
    casa(0.4, 12.6, eje="v", pared="tierra", t_lit=3.9, teja_t=3.3, seed=17, postigo="hierba")
    e.en_tile(E2.casa_obra(), 5.2, 2.9, 2, 2, alto_sombra=26, nombre="casa_obra")
    casa(5.2, 6.2, eje="v", pared="tierra", t_lit=4.2, teja_t=3.5, seed=7, postigo="hierba")
    casa(5.2, 9.5, eje="v", pared="tierra", t_lit=4.6, seed=13, postigo="azul")
    casa(5.2, 12.6, eje="u", pared="piedra", t_lit=4.7, teja_t=3.9, seed=19, postigo="azul")
    # ---------------- barrio este
    casa(19.8, 3.0, eje="v", pared="piedra", t_lit=4.7, teja_t=3.9, seed=23, postigo="teja")
    casa(22.6, 3.0, eje="u", seed=29, postigo="azul")
    casa(19.8, 6.3, eje="u", pared="tierra", t_lit=4.4, seed=31, postigo="hierba")
    casa(22.6, 6.3, eje="v", pared="piedra", t_lit=5.0, seed=37, postigo="azul")
    casa(18.6, 12.2, 3, 2, eje="u", pared="tierra", t_lit=3.9, teja_t=3.3, seed=41, postigo="hierba")
    casa(22.2, 12.2, eje="v", pared="piedra", t_lit=4.5, seed=43, postigo="teja")

    # ---------------- mercado alrededor de la fuente
    e.en_tile(E2.puesto(("teja", 3.4), ("piedra", 5.0), "fruta", seed=1), 9.6, 10.6, 2, 1, alto_sombra=24, nombre="puesto")
    e.en_tile(E2.puesto(("azul", 1.8), ("piedra", 5.0), "telas", seed=2), 15.2, 10.6, 2, 1, alto_sombra=24, nombre="puesto")
    e.en_tile(E2.puesto(("hierba", 3.2), ("piedra", 5.0), "ceramica", seed=4), 10.2, 12.9, 2, 1, alto_sombra=24, nombre="puesto")
    e.en_tile(E2.puesto(("tierra", 4.0), ("piedra", 5.0), "pan", seed=3), 12.7, 12.9, 2, 1, alto_sombra=24, nombre="puesto")
    e.en_tile(E2.puesto(("carmesi", 1.6), ("tierra", 5.0), "pescado", seed=5), 15.2, 12.9, 2, 1, alto_sombra=24, nombre="puesto")

    # ---------------- puente y faro
    e.en_tile(E2.puente(), 24.6, 10.1, 4, 1.4, h=2.0, nombre="puente")
    gx, gy = tp(9.25, 18.45)
    e.obj.append(Objeto(E2.faro(), gx, gy, 5.0, gy + 6, True, "faro"))
    e.occ = np.maximum(e.occ, np.where(((T.U - 9.25) ** 2 + (T.V - 18.45) ** 2) < 0.5, 5 + 72, 0).astype(np.float32))

    for (du, dv, tam, sd) in ((-0.5, 0.2, 1.3, 3), (0.5, 0.5, 1.0, 4), (-0.2, 0.7, 0.9, 5), (0.7, -0.1, 1.2, 6)):
        gx2, gy2 = tp(9.25 + du, 18.45 + dv)
        o = Objeto(A.roca(sd, tam), gx2, gy2, float(m.Hs[int(gy2), int(gx2)]), gy2 + 12, True, "roca_faro")
        e.obj.append(o)
    # ---------------- granja de la orilla este
    e.en_tile(E.casa(3, 2, eje="u", pared="tierra", t_lit=4.0, teja_t=3.2, seed=47, postigo="hierba"), 35.0, 5.2, 3, 2,
              alto_sombra=28, nombre="granero")
    casa(38.8, 5.2, eje="v", pared="piedra", t_lit=4.8, seed=53, postigo="azul")
    # vallas del prado (cuatro lados con puerta al oeste)
    u0, u1, v0, v1 = plano.PRADO
    suelo(e, PR.valla(int((u1 - u0) * 16), "u"), u0, v0, extra=0)
    suelo(e, PR.valla(int((v1 - v0) * 16), "v"), u1, v0, extra=(v1 - v0) * 8)
    suelo(e, PR.valla(int((u1 - u0) * 16), "u"), u0, v1, extra=(u1 - u0) * 8)
    suelo(e, PR.valla(int((v1 - v0) * 16 * 0.35), "v"), u0, v1 - 1.3, extra=10)

    # ---------------- vegetación
    tipos_arbol = [A.ciprés, A.pino, A.encina, A.olivo]
    mat = m.MAT
    malos = np.isin(mat, [T.M_ADOQUIN, T.M_PLAZA, T.M_OBRA, T.M_TRIGO, T.M_VID, T.M_HUERTA, T.M_ARADO, T.M_LOSA,
                          T.M_MADERA, T.M_ARENA, T.M_TIERRA, T.M_PRADO])
    ocupado = np.zeros((GH, GW), bool)
    huellas = [(0.4, 7.4, 3.0, 14.6), (10.4, 18.6, 3.0, 14.6), (18.4, 26.0, 2.4, 14.8), (-3, 0.4, 2.0, 15),
               (23.4, 25.2, 0.0, 3.0), (-0.5, 2.4, 0.0, 2.4), (24.0, 29.5, 8.5, 13.0), (34.5, 41.5, 4.6, 8.0)]
    for (a, b, c_, d) in huellas:
        ocupado |= rect(a, b, c_, d)
    pos = []
    cache = {}

    def libre(gx, gy, minimo):
        for (px, py) in pos:
            if abs(px - gx) < minimo and abs(py - gy) < minimo * 0.6:
                return False
        return True

    def plantar(n, zona, fabricas, pesos, minimo=9, intentos=9000, ztest=True, nombre="arbol", blob=True):
        puestos = 0
        for _ in range(intentos):
            if puestos >= n:
                break
            gx = int(rng.integers(0, GW)); gy = int(rng.integers(0, GH))
            if not zona[gy, gx] or not m.tierra[gy, gx] or m.agua[gy, gx] or malos[gy, gx] or ocupado[gy, gx]:
                continue
            h = float(m.Hs[gy, gx])
            sy = gy - h
            if sy < -6 or sy > SH - 4 or gx < 2 or gx > SW - 3:
                continue
            if m.Hs[min(GH - 1, gy + 3), gx] < h - 3.5:
                continue
            if not libre(gx, gy, minimo):
                continue
            t = rng.choice(len(fabricas), p=pesos)
            clave = (id(fabricas[t]), int(rng.integers(1, 7)))
            if clave not in cache:
                cache[clave] = fabricas[t](clave[1] * 5 + 1)
            spr = cache[clave]
            e.obj.append(Objeto(spr, gx, gy, h, gy, ztest, nombre))
            if blob:
                e.blobs.append((gx + 9, sy, 11 if (nombre == "arbol" and t != 0) else 6, 3.6, 2))
            pos.append((gx, gy))
            puestos += 1
        return puestos

    colina = m.norte > 0.30
    oeste = (T.U < 0.2) & (T.V > 3)
    plantar(220, colina | oeste, tipos_arbol, [0.30, 0.30, 0.32, 0.08], minimo=9)
    zona_pueblo = rect(0.3, 24.0, 2.6, 14.4)
    plantar(26, zona_pueblo, [A.ciprés, A.olivo, A.encina], [0.5, 0.2, 0.3], minimo=18)
    zona_este = rect(T.RIO_U + 1.6, 60, -3, 15) & ~rect(28.6, 33.6, 5.0, 10.0)
    plantar(80, zona_este, [A.olivo, A.encina, A.ciprés, A.pino], [0.3, 0.3, 0.2, 0.2], minimo=11)
    plantar(14, m.islas, [A.pino, A.ciprés, A.olivo], [0.5, 0.3, 0.2], minimo=8)
    plantar(8, m.islas, [lambda s: A.roca(s, 0.8 + 0.8 * rng.random())], [1.0], minimo=7, nombre="deco", blob=False)
    plantar(60, colina | oeste | zona_pueblo | zona_este, [lambda s: A.arbusto(s, 0.9 + 0.5 * rng.random())], [1.0],
            minimo=7, nombre="deco", blob=False)
    plantar(26, (m.norte > 0.15) | (T.U > T.RIO_U + 1.5), [lambda s: A.roca(s, 0.8 + 0.8 * rng.random())], [1.0],
            minimo=10, nombre="deco", blob=False)

    # ---------------- mobiliario del puerto, la obra y la ciudad
    suelo(e, PR.caja_madera(1), 11.3, 14.3, extra=6)
    suelo(e, PR.caja_madera(2), 11.9, 14.0, extra=6)
    suelo(e, PR.barril(), 12.5, 14.4, extra=2)
    suelo(e, PR.barril(), 12.7, 14.75, extra=2)
    suelo(e, PR.saco(), 3.2, 14.4, extra=2)
    suelo(e, PR.saco(color=("tierra", 3)), 3.5, 14.5, extra=2)
    suelo(e, PR.fardo(), 17.6, 14.0, extra=8)
    suelo(e, PR.carreta("heno"), 20.8, 11.0, extra=14)
    suelo(e, PR.carreta("marmol"), 17.2, 7.2, extra=14)
    suelo(e, PR.lena(), 3.0, 8.0, extra=2)
    suelo(e, PR.pozo(), 7.4, 8.1, extra=18)
    suelo(e, PR.caja_madera(3), 19.6, 14.3, extra=6)
    suelo(e, PR.barril(), 20.2, 14.5, extra=2)
    suelo(e, PR.fardo(), 2.6, 11.4, extra=8)
    suelo(e, PR.caja_madera(4), 9.4, 14.3, extra=6)

    # ---------------- ambiente animado: fuente, braseros y estandartes
    import functools
    from animacion import reflejo
    lru = functools.lru_cache(maxsize=None)
    fuente_f = lru(lambda fr: PR.fuente(fr))
    brasero_f = lru(lambda fr: PR.brasero(fr))
    est_rojo = lru(lambda fr: PR.estandarte(fr, ("carmesi", 2), 34))
    est_azul = lru(lambda fr: PR.estandarte(fr, ("azul", 1), 34))
    est_oro = lru(lambda fr: PR.estandarte(fr, ("oro", 1), 30))
    est_torre = lru(lambda fr: PR.estandarte(fr, ("carmesi", 2), 26))
    e.ambiente = [(fuente_f, 12.9, 10.7, 6.0, 17, 3, 2)]
    for (u, v) in ((10.1, 10.0), (17.7, 10.1), (11.3, 3.5), (17.6, 3.4), (4.2, 14.35), (15.0, 14.25), (21.9, 14.4)):
        e.ambiente.append((brasero_f, u, v, 6.0, 6, 3, 2))
    for (fab, u, v, h, extra) in ((est_rojo, 18.0, 3.7, 6.0, 4), (est_rojo, 11.1, 3.7, 6.0, 4), (est_azul, 4.3, 14.6, 6.0, 4),
                                  (est_oro, 9.3, 10.1, 6.0, 4), (est_torre, 24.8, 1.7, 50.0, 40), (est_torre, 1.7, 1.7, 50.0, 40),
                                  (est_azul, 21.4, 14.6, 6.0, 4)):
        e.ambiente.append((fab, u, v, h, extra, 4, 2))
    e.banderas = []
    # faro: posición para la luz y las gaviotas
    gxl, gyl = tp(9.25, 18.45)
    e.faro_pos = (gxl, gyl)
    e.linterna = (int(gxl), int(gyl - 5 - 81))

    # barcos: se comprueba que el casco está en agua libre, incluida la deriva
    amp = {"galera": 0, "mercante": 0, "pesquero1": 10, "galera2": 14, "pesquero2": 8}
    fas = {"galera": 0.0, "mercante": 0.3, "pesquero1": 0.1, "galera2": 0.55, "pesquero2": 0.8}
    e.barcos_anim = []
    e.reflejos = {}
    for (fab, u0, v0, L, orient, nombre) in BARCOS:
        beam = {"galera": 6, "mercante": 8}.get(nombre.rstrip("12"), 5)
        A_ = amp[nombre]
        du = (A_ / 16.0, 0) if orient == "u" else (0, A_ / 16.0)
        for sg in (-1, 0, 1):
            if not agua_valida(m, u0 + sg * du[0], v0 + sg * du[1], L, orient, beam=beam):
                raise RuntimeError(f"barco {nombre} fuera del agua en ({u0},{v0}) con deriva {sg}")
        spr = fab()
        e.barcos_anim.append((spr, u0, v0, L, orient, nombre, fas[nombre], A_))
        e.reflejos[nombre] = reflejo(spr, orient)
    return e
