"""Render por relieve para formas orgánicas (chozas, almacenes de barro, techos de paja).

`iso.py` dibuja por caras planas: sirve para muros rectos y tejas (era 2). Aquí cada cuerpo es un MAPA DE ALTURAS h(u, v) con una
base z0 opcional; un rayo por píxel baja desde la cámara (u+v y z crecen hacia ella) y se queda con la primera superficie.
La luz sale de la normal del relieve (única luz, desde la izquierda: la cara +v recibe, la +u queda en sombra), así que las
esquinas redondeadas, las pendientes de un tejado de paja y el frontón salen solos. Mismo origen y proyección que `iso.Spr`:
x = u - v ; y = (u + v)/2 - z, con (0, 0, 0) en (ax, ay).
"""
import sys
sys.dont_write_bytecode = True
import numpy as np
from iso import Spr

LUZ = np.array([-0.30, 0.60, 0.75])
LUZ = LUZ / np.linalg.norm(LUZ)


class Ctx:
    """Datos de los píxeles que ha tocado un cuerpo (arrays 1D): posición, normal y luz."""
    def __init__(self, U, V, Z, nu, nv, nz):
        self.U, self.V, self.Z = U, V, Z
        self.nu, self.nv, self.nz = nu, nv, nz
        self.lum = nu * LUZ[0] + nv * LUZ[1] + nz * LUZ[2]


class Solido:
    """h(U, V) = altura superior (≤ 0,5 = no hay cuerpo); z0 = altura inferior (número o función); material(ctx) -> índices."""
    def __init__(self, h, material, z0=0.0):
        self.h, self.material, self.z0 = h, material, z0

    def bajo(self, U, V):
        return self.z0(U, V) if callable(self.z0) else np.full(U.shape, float(self.z0))


def renderizar(solidos, w, h, ax, ay, smax, paso=0.5, e=0.7):
    """Devuelve un Spr w×h con el origen (0,0,0) en (ax, ay). smax = mayor u+v que alcanza algún cuerpo."""
    spr = Spr(w, h, ax, ay)
    Y, X = np.mgrid[0:h, 0:w]
    x = X - ax + 0.5
    y = Y - ay + 0.5
    quien = np.full((h, w), -1, np.int16)
    PU = np.zeros((h, w))
    PV = np.zeros((h, w))
    PZ = np.zeros((h, w))
    S = float(smax)
    while S > 0:
        U = (S + x) / 2.0
        V = (S - x) / 2.0
        Z = S / 2.0 - y
        for k, sol in enumerate(solidos):
            alto = sol.h(U, V)
            dentro = (alto > 0.5) & (Z <= alto) & (Z >= sol.bajo(U, V)) & (quien < 0)
            quien[dentro] = k
            PU[dentro], PV[dentro], PZ[dentro] = U[dentro], V[dentro], Z[dentro]
        S -= paso
    for k, sol in enumerate(solidos):
        m = quien == k
        if not m.any():
            continue
        u, v, z = PU[m], PV[m], PZ[m]
        hu = np.clip((sol.h(u + e, v) - sol.h(u - e, v)) / (2 * e), -20, 20)
        hv = np.clip((sol.h(u, v + e) - sol.h(u, v - e)) / (2 * e), -20, 20)
        n = np.sqrt(hu * hu + hv * hv + 1.0)
        ctx = Ctx(u, v, z, -hu / n, -hv / n, 1.0 / n)
        spr.px[m] = sol.material(ctx).astype(np.uint8)
    return spr
