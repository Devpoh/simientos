"""Edificios en pixel art isométrico: casas, mercado, almacén, torre..."""
import numpy as np
from paleta import c, TRANSP, TINTA
from util import hash2, fbm, smooth
from iso import Spr, col, tono_ramp
from tablas import RID, a_indice

# luz: viene de la izquierda. cara izquierda (+v) = iluminada, cara derecha (+u) = sombra fría.
V3 = (0.0, 1.0, 0.0)


def _az(arr):
    return arr


# ------------------------------------------------------------------ texturas de pared
def pared_estuco(ramp, t_base, seed, d_suelo=4, parches=True):
    """Devuelve fn(s,t,X,Y) para una pared enlucida con desconchones y zócalo."""
    def fn(s, t, X, Y):
        n = fbm(s * 0.11 + seed, t * 0.19, 2, seed)
        tono = t_base + (n - 0.5) * 1.5
        # sucio hacia el suelo
        tono = tono - np.clip((5 - t) / 5.0, 0, 1) * 0.9
        # desconchones pequeños (muestran mampostería)
        if parches:
            cs, ct = np.floor(s / 9.0), np.floor(t / 7.0)
            hs = hash2(cs, ct, seed + 3)
            ls, lt = s - cs * 9, t - ct * 7
            ox = (hash2(cs, ct, seed + 4) * 5).astype(int)
            oy = (hash2(cs, ct, seed + 5) * 3).astype(int)
            parche = (hs < 0.16) & (ls >= ox) & (ls < ox + 4) & (lt >= oy + 1) & (lt < oy + 3)
            tono = np.where(parche, tono - 1.0, tono)
        return a_indice(np.full(s.shape, RID[ramp]), tono)
    return fn


def aplicar(spr, mask_fn_rect, fn):
    pass


# ------------------------------------------------------------------ vano (puerta / ventana) sobre cara plana
def _en_rect(s, t, s0, t0, w, h):
    return (s >= s0) & (s < s0 + w) & (t >= t0) & (t < t0 + h)


def pintar_vano(spr, O, a, b, la, lb, s0, t0, w, h, kind, ramp_marco, ramp_post, tono_cara, seed=0,
                arco=False):
    """Dibuja puerta/ventana: marco, hoja/postigos y cristal. kind in {'puerta','ventana'}."""
    def mk(s, t):
        m = _en_rect(s, t, s0, t0, w, h)
        if arco:
            r = w / 2.0
            cy = t0 + h - r
            sup = (t >= cy) & (((s - (s0 + r)) ** 2 + (t - cy) ** 2) > r * r)
            m &= ~sup
        return m

    def fn(s, t, X, Y):
        tono = np.full(s.shape, tono_cara, float)
        # marco: 1px de piedra clara alrededor
        borde = ~_en_rect(s, t, s0 + 1, t0, w - 2, h - 1)
        if arco:
            r = (w - 2) / 2.0
            cy = t0 + h - 1 - r
            sup = (t >= cy) & (((s - (s0 + 1 + r)) ** 2 + (t - cy) ** 2) > r * r)
            borde = borde | sup
        out = np.full(s.shape, 0, np.uint8)
        if kind == "puerta":
            # tablones verticales de madera
            tabl = ((np.floor(s - s0)) % 3 == 0)
            tw = 1.6 + tono_cara * 0.45 - tabl * 0.9 + hash2(np.floor((s - s0) / 3), 1, seed) * 0.5
            tw = np.where(t >= t0 + h - 3, tw - 0.0, tw)
            out = a_indice(np.full(s.shape, RID["madera"]), tw)
            # herrajes: dos bandas oscuras
            band = ((np.floor(t - t0) == 3) | (np.floor(t - t0) == 9)) & ~borde
            out = np.where(band, a_indice(np.full(s.shape, RID["madera"]), tw - 1.5), out)
            # picaporte
            pic = (np.floor(s - s0) == w - 3) & (np.floor(t - t0) == 7)
            out = np.where(pic, c("oro", 1), out)
        else:
            # cristal oscuro con reflejo y postigos
            cristal = a_indice(np.full(s.shape, RID["agua"]), 0.6 + (t - t0) / h * 1.2)
            out = cristal
            # reflejo diagonal
            refl = (np.floor(s - s0) + np.floor(t - t0)) % 5 == 0
            out = np.where(refl & (t - t0 > 2), c("agua", 3), out)
            # barra central
            barra = (np.floor(s - s0) == w // 2)
            out = np.where(barra, a_indice(np.full(s.shape, RID[ramp_post]), 1.5 + tono_cara * 0.3), out)
            # postigos a los lados
            lado = (np.floor(s - s0) < 2) | (np.floor(s - s0) >= w - 2)
            tp_ = 1.4 + tono_cara * 0.55 + ((np.floor(t - t0)) % 3 == 0) * -0.7
            out = np.where(lado, a_indice(np.full(s.shape, RID[ramp_post]), tp_), out)
        # marco claro
        mc = a_indice(np.full(s.shape, RID[ramp_marco]), np.full(s.shape, tono_cara + 1.5))
        out = np.where(borde, mc, out)
        # alféizar / dintel: línea de sombra
        if kind == "ventana":
            sill = (np.floor(t - t0) == 0)
            out = np.where(sill, a_indice(np.full(s.shape, RID[ramp_marco]), np.full(s.shape, tono_cara + 0.8)), out)
        return out
    spr.cara(O, a, la, b, lb, fn, fid=9, mascara=mk)


# ------------------------------------------------------------------ techo de tejas
def techo_tejas(spr, O, a, la, b, ramp, t_base, sombra=False, seed=1, ncursos=7, ancho_teja=4, fid=5):
    """Plano de tejado con tejas individuales. b recorre el faldón (t en 0..1)."""
    def fn(s, p, X, Y):
        cur = p * ncursos
        ic = np.floor(cur)
        f = cur - ic
        # desfase de columnas alternas
        col_ = np.floor((s + (ic % 2) * (ancho_teja / 2.0)) / ancho_teja)
        fs = (s + (ic % 2) * (ancho_teja / 2.0)) / ancho_teja - col_
        var = (hash2(col_, ic, seed) - 0.5) * 1.1
        base = t_base + var
        # labio claro abajo, cuerpo, sombra arriba
        tn = np.where(f < 0.34, base + 0.9, np.where(f < 0.67, base, base - 1.1))
        # canal entre tejas (columna oscura)
        tn = np.where(fs < 0.22, tn - 0.8, tn)
        # musgo/tejas pálidas sueltas
        pal = hash2(col_, ic, seed + 7) > 0.94
        tn = np.where(pal, tn + 1.2, tn)
        return a_indice(np.full(s.shape, RID[ramp]), tn)
    spr.cara(O, a, la, b, 1.0, fn, fid=fid)


# ------------------------------------------------------------------ cajas y sillares
def fn_sillar(ramp, tono, seed=1, bw=10, bh=4, junta=1.3, var=1.0):
    """Hiladas de sillares con juntas desfasadas. s horizontal, t vertical."""
    def fn(s, t, X, Y):
        fila = np.floor(t / bh)
        off = (fila % 2) * (bw / 2.0)
        cs = np.floor((s + off) / bw)
        fs = (s + off) / bw - cs
        ft = t / bh - fila
        j = (fs < 1.0 / bw) | (ft < 1.0 / bh)
        v = (hash2(cs, fila, seed) - 0.5) * var
        tn = tono + v - j * junta
        # arista superior del sillar un poco más clara
        tn = np.where((ft > 1 - 1.5 / bh) & ~j, tn + 0.35, tn)
        return a_indice(np.full(s.shape, RID[ramp]), tn)
    return fn


def fn_plano(ramp, tono):
    def fn(s, t, X, Y):
        return a_indice(np.full(s.shape, RID[ramp]), np.full(s.shape, tono, float))
    return fn


def caja(spr, u0, v0, z0, du, dv, dz, fn_izq, fn_der, fn_top, fid=3):
    """Caja alineada a los ejes: cara izquierda (+v), derecha (+u) y superior."""
    spr.cara((u0, v0 + dv, z0), (1, 0, 0), du, (0, 0, 1), dz, fn_izq, fid=fid)
    spr.cara((u0 + du, v0, z0), (0, 1, 0), dv, (0, 0, 1), dz, fn_der, fid=fid + 1)
    spr.cara((u0, v0, z0 + dz), (1, 0, 0), du, (0, 1, 0), dv, fn_top, fid=fid + 2)


def estuco(ramp, tono, seed, zocalo=3, zr="piedra", ztono=None):
    """Pared enlucida con zócalo de piedra, suciedad y desconchones."""
    base = pared_estuco(ramp, tono, seed)
    zt = tono + 0.4 if ztono is None else ztono

    def fn(s, t, X, Y):
        o = base(s, t, X, Y)
        if zocalo > 0:
            bloque = fn_sillar(zr, zt, seed + 9, bw=8, bh=3)(s, t, X, Y)
            o = np.where(t < zocalo, bloque, o)
        return o
    return fn


# ------------------------------------------------------------------ CASA
def casa(w=2, d=2, hw=20, R=12, eje="u", pared="piedra", t_lit=4.6, teja_t=3.7, seed=1, chimenea=True,
         postigo="azul", puerta_s=None, doble=False):
    W, D = 16 * w, 16 * d
    e = 3
    s = Spr(W + D + 60, W + D + 100, D + e + 12, 70)
    t_shade = max(1.2, t_lit - 2.6)
    wallR = pared
    # ---- paredes
    L_fn = estuco(wallR, t_lit, seed)
    R_fn = estuco(wallR, t_shade, seed + 1, ztono=t_shade)
    s.cara((0, D, 0), (1, 0, 0), W, (0, 0, 1), hw, L_fn, fid=1)
    s.cara((W, 0, 0), (0, 1, 0), D, (0, 0, 1), hw, R_fn, fid=2)
    # ---- vanos
    ps = puerta_s if puerta_s is not None else (4 if w == 2 else 6)
    if eje == "u":
        pass
    pintar_vano(s, (0, D, 0), (1, 0, 0), (0, 0, 1), W, hw, ps, 0, 9, 15, "puerta", "piedra", "madera", t_lit,
                seed, arco=True)
    ventanas_L = [W - 11] if w == 2 else [W - 11, W // 2 - 3]
    for vs in ventanas_L:
        if vs > ps + 11:
            pintar_vano(s, (0, D, 0), (1, 0, 0), (0, 0, 1), W, hw, vs, 8, 7, 9, "ventana", "piedra", postigo, t_lit, seed)
    for vs in ([D // 2 - 3] if d == 2 else [4, D - 11]):
        pintar_vano(s, (W, 0, 0), (0, 1, 0), (0, 0, 1), D, hw, vs, 8, 7, 9, "ventana", "piedra", postigo, t_shade, seed)
    # ---- tejado
    if eje == "u":
        # frontón (cara derecha) bajo el tejado
        s.cara((W, 0, hw), (0, 1, 0), D, (0, 0, 1), R, estuco(wallR, t_shade, seed + 2, zocalo=0),
               fid=2, mascara=lambda ss, tt: tt < R * (1 - np.abs(2 * ss / D - 1)))
        techo_tejas(s, (-e, -e, hw), (1, 0, 0), W + 2 * e, (0, D / 2 + e, R), "teja", teja_t - 2.2, seed=seed + 5,
                    ncursos=4, fid=4)
        techo_tejas(s, (-e, D + e, hw), (1, 0, 0), W + 2 * e, (0, -(D / 2 + e), R), "teja", teja_t, seed=seed)
        # borde del tejado a la derecha
        s.lineaz((W + e, D + e, hw), (W + e, D / 2, hw + R), c("teja", 0))
        s.lineaz((W + e, D + e, hw + 1), (W + e, D / 2, hw + R + 1), c("teja", 3))
        # cumbrera
        s.lineaz((-e, D / 2, hw + R), (W + e, D / 2, hw + R), c("teja", 5))
        s.lineaz((-e, D / 2, hw + R - 1), (W + e, D / 2, hw + R - 1), c("teja", 1))
    else:
        s.cara((0, D, hw), (1, 0, 0), W, (0, 0, 1), R, estuco(wallR, t_lit, seed + 2, zocalo=0),
               fid=1, mascara=lambda ss, tt: tt < R * (1 - np.abs(2 * ss / W - 1)))
        techo_tejas(s, (-e, -e, hw), (0, 1, 0), D + 2 * e, (W / 2 + e, 0, R), "teja", teja_t - 3.0, seed=seed + 5,
                    ncursos=4, fid=4)
        techo_tejas(s, (W + e, -e, hw), (0, 1, 0), D + 2 * e, (-(W / 2 + e), 0, R), "teja", teja_t - 1.5, seed=seed)
        s.lineaz((W + e, D + e, hw), (W / 2, D + e, hw + R), c("teja", 1))
        s.lineaz((W + e, D + e, hw + 1), (W / 2, D + e, hw + R + 1), c("teja", 2))
        s.lineaz((W / 2, -e, hw + R), (W / 2, D + e, hw + R), c("teja", 3))
    # ---- chimenea
    chim = None
    if chimenea:
        if eje == "u":
            cu, cv, cz = W * 0.68, D / 2 + 2, hw + R - 3
        else:
            cu, cv, cz = W / 2 + 2, D * 0.62, hw + R - 3
        chim = (cu + 2.5, cv + 2.5, cz + 10)
        caja(s, cu, cv, cz, 5, 5, 10, fn_sillar("piedra", 4.2, seed + 5, bw=5, bh=3),
             fn_sillar("piedra", 1.8, seed + 6, bw=5, bh=3), fn_plano("piedra", 0.5))
        # boca de la chimenea (hollín)
        s.cara((cu, cv, cz + 10), (1, 0, 0), 5, (0, 1, 0), 5, fn_plano("piedra", 0.2), fid=3)
    s.contorno(-3)
    out = s.recortar()
    out.chimenea = chim
    return out
