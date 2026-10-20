"""Viviendas de era 0 (R77, R80): choza redonda de ramas y paja (1×1) y choza de troncos y barro (2×2).

Más humildes que el almacén de era 1. Mismo método (`relieve.py`: mapa de alturas + un rayo por píxel; luz única desde la
izquierda). Materiales del entorno sin acabar: paja atada con cuerdas, ramas, troncos sin escuadrar con las puntas asomando en
las esquinas, barro en las juntas, pieles y esteras. NUNCA teja, sillar, enlucido liso, ventana con marco ni puerta de tablas.
La entrada mira a +v (cara iluminada).
"""
import sys
sys.dont_write_bytecode = True
import numpy as np
from paleta import c, TRANSP
from util import hash2, fbm
from iso import Spr
from almacen import idx, en_capa
import relieve as RL

SEED = 5


# ================================================================== 1×1: choza redonda de ramas y paja
W1 = D1 = 16
ALTO1 = 21.0          # altura del vértice del cono
R1 = 9.2              # radio de la base de la paja (sobresale ~1 px de la huella: el borde de paja cuelga)
ANG_PUERTA = float(np.arctan2(0.94, 0.35))


def _ang(U, V):
    return np.arctan2(V - W1 / 2, U - W1 / 2)


def h_cono(U, V):
    """Cono de paja de lados ligeramente cóncavos, base irregular y un penacho de paja atado arriba."""
    du, dv = U - W1 / 2, V - D1 / 2
    a = np.arctan2(dv, du)
    r = np.hypot(du, dv)
    borde = R1 + 0.9 * (hash2(np.floor(a * 7.0), 1, SEED) - 0.5) + 0.4 * np.sin(3 * a + 1.0)
    t = np.clip(1 - r / borde, 0, 1)
    h = ALTO1 * t ** 0.82 + 1.6 * np.exp(-((r / 1.4) ** 2))
    return np.where(r < borde, h, 0.0)


def mat_cono(ctx):
    """Paja en hiladas radiales atadas con cuerdas de fibra; la entrada es un hueco con una piel recogida."""
    U, V, Z = ctx.U, ctx.V, ctx.Z
    a = _ang(U, V)
    r = np.hypot(U - W1 / 2, V - D1 / 2)
    col = np.floor(a * 3.3 + 40.0)                                   # hebras que bajan por la ladera
    cur = Z / 3.1
    hh = hash2(col, np.floor(cur), SEED + 1)
    tn = 3.5 + (hh - 0.5) * 1.5 + (ctx.lum - 0.35) * 3.6
    f = cur - np.floor(cur)
    tn = np.where(f < 0.25, tn - 1.0, np.where(f > 0.84, tn + 0.4, tn))
    tn = tn + (hash2(col * 3, np.floor(cur * 4), SEED + 2) > 0.92) * 0.9
    tn = tn - (hash2(np.floor(a * 2.0 + 20), np.floor(Z / 5), SEED + 3) > 0.84) * 0.9      # paja vieja y mojada
    tn = tn - 0.9 * np.clip((3.0 - Z) / 3.0, 0, 1)                                         # pie húmedo y sucio
    out = idx("tierra", tn)
    # cuerdas: dos anillos que cierran la paja (fibra trenzada, más oscura en sombra)
    anillo = (np.abs(Z - 8.2 - 0.5 * np.sin(a * 3.0)) < 0.6) | (np.abs(Z - 14.6 - 0.4 * np.sin(a * 2.0 + 1)) < 0.55)
    out = np.where(anillo, idx("madera", 2.4 + (ctx.lum - 0.35) * 2.0 + ((col % 2) * 0.7)), out)
    # entrada: arco bajo, jambas de ramas, interior oscuro y una piel recogida a la izquierda
    s = (a - ANG_PUERTA + np.pi) % (2 * np.pi) - np.pi
    ds = np.abs(s)
    arco = 8.2 * np.sqrt(np.clip(1 - (ds / 0.50) ** 2, 0, 1))
    puerta = (ds < 0.50) & (Z < arco) & (ctx.nv > 0.2)
    jamba = puerta & ((ds > 0.42) | (Z > arco - 1.2))
    out = np.where(puerta, c("madera", 0), out)
    piel = puerta & ~jamba & (s < 0.10) & (Z < arco - 0.6)
    pt = 1.7 + (ctx.lum - 0.35) * 2.0 + (hash2(np.floor(U * 0.8), np.floor(Z * 0.8), SEED + 6) - 0.5) * 1.0
    out = np.where(piel, idx("tierra", pt - (Z < 2) * 0.8), out)
    mancha = piel & (hash2(np.floor(U * 0.6), np.floor(Z * 0.6), SEED + 7) > 0.78)
    out = np.where(mancha, idx("piel", 2.3 - (ctx.lum < 0.45)), out)
    out = np.where(jamba, idx("madera", 2.0 + (ctx.lum - 0.35) * 2.2 + (np.mod(Z, 2.4) < 0.7) * -0.8 + 0.6), out)
    return out.astype(np.uint8)


def _ramas_cima(t):
    """Ramas que asoman por el vértice (cruzadas y atadas) y dos estacas contra la pared."""
    cx, cy = t.P(W1 / 2, D1 / 2, ALTO1 + 0.8)
    cx, cy = int(round(cx)), int(round(cy))
    palos = [(-3, -7, 2), (-1, -8, 3), (2, -8, 2), (4, -6, 3), (-4, -5, 1)]
    for dx, dy, tono in palos:
        n = max(abs(dx), abs(dy))
        for k in range(n + 1):
            t.pset(cx + int(round(dx * k / n)), cy + int(round(dy * k / n)), c("madera", tono if k < n - 1 else 4))
    for dx in (0, 1):
        t.pset(cx + dx, cy + 1, c("tierra", 5))                       # atadura de fibra
    # puntas de ramas que asoman por la base, junto a la entrada
    bx, by = t.P(W1 / 2 + 6.5, D1 / 2 + 7.0, 0.5)
    bx, by = int(round(bx)), int(round(by))
    for k in range(3):
        t.pset(bx + k, by - k // 2, c("madera", 3 - (k > 1)))


def choza_redonda():
    ax, ay = D1 + 14, 38
    s = RL.renderizar([RL.Solido(h_cono, mat_cono)], W1 + D1 + 28, 66, ax, ay, smax=W1 + D1 + 4)
    s.contorno(-3)
    en_capa(s, _ramas_cima)
    return s.recortar()


# ================================================================== 2×2: choza de troncos sin escuadrar y barro
W2 = D2 = 32
HW2 = 17              # muros de troncos
R2 = 9               # lo que sube la paja sobre el muro
SKIRT2 = 14.0         # altura del borde de la paja


def h_muro2(U, V):
    """Muro de troncos: planta casi cuadrada, esquinas sin pulir y paredes que no cierran del todo rectas."""
    du = (fbm(V * 0.20 + 5, U * 0.10, 2, 3) - 0.5) * 2.4
    dv = (fbm(U * 0.20 + 9, V * 0.10, 2, 4) - 0.5) * 2.4
    q = (np.abs(U - 16 + du) / 13.2) ** 7 + (np.abs(V - 16 + dv) / 13.2) ** 7
    return HW2 * np.sqrt(np.clip((1 - q) * 9.0, 0, 1))


def h_techo2(U, V):
    """Dos aguas con la cumbrera a lo largo de v. Aleros largos y desiguales: paja echada a mano."""
    fu, fv = np.floor(V), np.floor(U)
    dentro = ((U > 0.2 + 1.8 * hash2(fu, 1, SEED)) & (U < 31.8 - 1.8 * hash2(fu, 2, SEED))
              & (V > 0.4 + 1.6 * hash2(fv, 3, SEED)) & (V < 32.6 - 1.6 * hash2(fv, 4, SEED)))
    # el faldón no es plano: pandea un poco entre las hiladas
    pandeo = 0.9 * np.sin(V * 0.33 + 1.0) * (np.abs(U - 16) / 16.0)
    h = HW2 + R2 * (1 - np.abs(U - 16) / 16.6) + 1.3 * np.exp(-(((U - 16) / 1.7) ** 2)) + pandeo
    return np.where(dentro, h, 0.0)


def z0_techo2(U, V):
    return SKIRT2 + (hash2(np.floor(U * 0.8), np.floor(V * 0.8), SEED + 9) - 0.5) * 2.0


def mat_troncos(ctx):
    """Troncos horizontales de grosor desigual con barro apretado en las juntas; puerta baja con una piel colgada."""
    U, V, Z = ctx.U, ctx.V, ctx.Z
    lateral = np.where(np.abs(ctx.nu) > np.abs(ctx.nv), V, U)
    grosor = 4.3
    # cada tronco ondula un poco (nunca es recto) y tiene su propia altura de junta
    fase = (Z + 1.6 * fbm(lateral * 0.09 + 3, Z * 0.05, 2, SEED) + 0.12 * np.sin(lateral * 0.5)) / grosor
    k = np.floor(fase)
    p = fase - k
    luz = ctx.lum - 0.35
    nudo = (hash2(np.floor(lateral / 4.0), k, SEED + 2) > 0.80) & (p > 0.25) & (p < 0.75)
    corteza = fbm(lateral * 0.5, Z * 0.12, 2, SEED + 3) - 0.5
    tn = 1.9 + luz * 2.2 + (0.5 - p) * 1.4 + corteza * 1.0 + (hash2(k, 7, SEED) - 0.5) * 0.6
    tn = np.where(nudo, tn - 0.6, tn)
    out = idx("madera", tn)
    barro = (p < 0.16)                                                 # junta de barro apretado
    bt = 1.1 + luz * 1.6 + (hash2(np.floor(lateral), k, SEED + 8) - 0.5) * 0.8
    out = np.where(barro, idx("tierra", bt), out)
    sombra_alero = np.clip((Z - (SKIRT2 - 3.2)) / 3.0, 0, 1)
    out = np.where(sombra_alero * 0.7 > hash2(ctx.U, ctx.Z, SEED + 4), idx("madera", tn - 1.3), out)
    out = np.where(Z < 1.6, idx("tierra", 1.2 + luz * 1.5), out)       # base manchada de barro
    # puerta: hueco bajo entre dos postes, con una piel colgada del dintel y cuerda
    puerta = (ctx.nv > 0.55) & (V > 26) & (U > 8.5) & (U < 20.5) & (Z < SKIRT2 - 0.3)
    poste = puerta & ((U < 10.2) | (U > 18.8))
    out = np.where(puerta, c("madera", 0), out)
    dintel = puerta & (Z > SKIRT2 - 2.3)
    pt = 1.9 + luz * 2.0 + (hash2(np.floor(U * 0.9), np.floor(Z * 0.9), SEED + 6) - 0.5) * 1.0
    borde_piel = 14.8 + 1.1 * np.sin(Z * 0.9) + (hash2(np.floor(Z), 5, SEED) - 0.5) * 0.8
    piel = puerta & ~poste & (U < borde_piel) & (Z < SKIRT2 - 0.8)
    out = np.where(piel, idx("tierra", pt), out)
    mancha = piel & (hash2(np.floor(U * 0.55), np.floor(Z * 0.55), SEED + 7) > 0.76)
    out = np.where(mancha, idx("piel", 2.3 - (ctx.lum < 0.45)), out)
    out = np.where(poste | dintel, idx("madera", 1.7 + luz * 2.0 + (np.mod(Z, 2.8) < 0.6) * -0.8 + 0.5), out)
    cuerda = puerta & (np.abs(U - 11.4) < 0.7) & (Z > 2.5) & (Z < SKIRT2 - 1)
    return np.where(cuerda, c("tierra", 5), out).astype(np.uint8)


def mat_paja2(ctx):
    """Paja más burda que la del almacén: hebras largas, mechones sueltos, cuerdas de lastre y una cumbrera de ramas."""
    U, V, Z = ctx.U, ctx.V, ctx.Z
    q = np.abs(U - 16)
    frontal = ctx.nv > 0.6
    col = np.where(frontal, np.floor(U), np.floor(V))
    cur = np.where(frontal, Z / 3.8, q / 4.1)
    hh = hash2(col, np.floor(cur), SEED + 1)
    tn = 3.3 + (hh - 0.5) * 1.6 + (ctx.lum - 0.35) * 3.8
    f = cur - np.floor(cur)
    tn = np.where(f < 0.24, tn - 1.0, np.where(f > 0.82, tn + 0.4, tn))
    tn = tn + (hash2(col * 3, np.floor(cur * 5), SEED + 2) > 0.90) * 1.0
    tn = tn - (hash2(np.floor(V / 3), np.floor(q / 5), SEED + 3) > 0.80) * 1.0
    cumbrera = (q < 2.1) & (ctx.nv < 0.6)
    tn = np.where(cumbrera, tn - 0.9, tn)
    out = idx("tierra", tn)
    # cuerdas de lastre que cruzan el faldón cada 9 px (fibra clara) y ramas atadas en la cumbrera
    cuerda = (~frontal) & (np.abs(np.mod(V + 3.0, 9.0) - 0.5) < 0.55) & (q > 2.2)
    out = np.where(cuerda, idx("tierra", 5.3 - (ctx.lum < 0.45) * 1.2), out)
    rama = cumbrera & (q < 1.0)
    return np.where(rama, idx("madera", 2.6 + (ctx.lum - 0.35) * 1.6), out).astype(np.uint8)


def _esquinas_y_lastre(t):
    """Puntas de troncos que asoman en la esquina frontal, cuernos cruzados del hastial y piedras de lastre colgando."""
    # esquina frontal (U = 32, V = 32): los troncos alternan, asomando 2 px hacia +u y hacia +v
    for k in range(HW2 // 4 + 1):
        z = 2.0 + k * 4.3
        for (u, v, cara) in ((W2 + 1.4, D2 - 1.8, "u"), (W2 - 1.8, D2 + 1.4, "v")) if k % 2 == 0 else \
                            ((W2 - 1.8, D2 + 1.4, "v"), (W2 + 1.4, D2 - 1.8, "u")):
            if (k + (cara == "v")) % 2:
                continue
            x, y = t.P(u, v, z + 1.0)
            x, y = int(round(x)), int(round(y))
            for dy in range(3):
                for dx in range(2):
                    t.pset(x + dx, y + dy - 1, c("madera", 1 if cara == "u" else 3))
            t.pset(x, y, c("madera", 0 if cara == "u" else 4))
    # cuernos cruzados sobre el hastial frontal (V = 32)
    x0, y0 = t.P(W2 / 2, D2 + 0.4, HW2 + R2 + 1.0)
    x0, y0 = int(round(x0)), int(round(y0))
    for k in range(7):
        t.pset(x0 - 1 - k // 2, y0 - 1 - k, c("madera", 3 - (k > 4)))
        t.pset(x0 + 1 + k // 2, y0 - 1 - k, c("madera", 2 - (k > 4) * 0))
    t.pset(x0, y0, c("tierra", 5)); t.pset(x0, y0 - 1, c("tierra", 5))
    # piedras de lastre colgadas del alero (lado +u) con su cuerda
    for v in (6.0, 15.0, 24.0):
        x, y = t.P(W2 + 0.3, v, SKIRT2 - 1.0)
        x, y = int(round(x)), int(round(y))
        t.pset(x, y, c("tierra", 5)); t.pset(x, y + 1, c("tierra", 4))
        for (dx, dy, tn) in ((-1, 2, 3), (0, 2, 3), (-1, 3, 2), (0, 3, 2), (1, 3, 1)):
            t.pset(x + dx, y + dy, c("roca", tn))


def choza_troncos():
    ax, ay = D2 + 14, 44
    s = RL.renderizar([RL.Solido(h_muro2, mat_troncos), RL.Solido(h_techo2, mat_paja2, z0=z0_techo2)],
                      W2 + D2 + 28, 92, ax, ay, smax=W2 + D2 + 4)
    s.contorno(-3)
    en_capa(s, _esquinas_y_lastre)
    return s.recortar()
