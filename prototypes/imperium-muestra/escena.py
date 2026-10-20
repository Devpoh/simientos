"""Composición de la escena: terreno, objetos ordenados por profundidad, personajes, HUD."""
import numpy as np
import terreno as T
import render as R
import plano
from terreno import SW, SH, GW, GH, rect
from paleta import TRANSP, c
from util import LUT


class Objeto:
    def __init__(self, spr, gx, gy, h=6.0, prof=None, ztest=True, nombre=""):
        self.spr, self.gx, self.gy, self.h = spr, gx, gy, h
        self.prof = gy if prof is None else prof
        self.ztest = ztest
        self.nombre = nombre


class Escena:
    def __init__(self):
        self.m = T.construir()
        plano.trazar_suelo(self.m)
        self.deco = plano.decorar(self.m)
        self.occ = np.zeros((GH, GW), np.float32)
        self.obj: list[Objeto] = []
        self.blobs: list[tuple] = []     # sombras elípticas estáticas (cx, cy, rx, ry, nivel) en pantalla
        self.base = None

    # ---- colocación por tiles ----
    def en_tile(self, spr, u0, v0, w, d, h=6.0, ztest=True, alto_sombra=None, nombre=""):
        """Coloca un sprite cuyo (0,0,0) es la esquina trasera de la huella (u0,v0) de w x d tiles."""
        gx, gy = T.tp(u0, v0)
        prof = gy + 8 * (w + d)
        o = Objeto(spr, gx, gy, h, prof, ztest, nombre)
        self.obj.append(o)
        if alto_sombra:
            self.occ = np.maximum(self.occ, np.where(rect(u0, u0 + w, v0, v0 + d), h + alto_sombra, 0).astype(np.float32))
        return o

    def en_suelo(self, spr, gx, gy, h=6.0, ztest=True, nombre=""):
        o = Objeto(spr, gx, gy, h, gy, ztest, nombre)
        self.obj.append(o)
        return o

    def preparar(self):
        self.base = R.preparar(self.m, self.occ)
        self.tierra_idx = R.pintar_tierra(self.base, self.deco)
        self.aguas = [R.pintar_agua(self.base, k) for k in range(4)]
        self._fondos = None

    @staticmethod
    def _blob(img, cx, cy, rx, ry, nivel):
        x0, x1 = max(0, int(cx - rx - 1)), min(SW, int(cx + rx + 2))
        y0, y1 = max(0, int(cy - ry - 1)), min(SH, int(cy + ry + 2))
        if x1 <= x0 or y1 <= y0:
            return
        yy, xx = np.mgrid[y0:y1, x0:x1]
        m = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1.0
        sub = img[y0:y1, x0:x1]
        img[y0:y1, x0:x1] = np.where(m, LUT[-nivel][sub], sub)

    def fondo(self, k, blobs_extra=None):
        if self._fondos is None:
            self._fondos = []
            for kk in range(4):
                img = np.where(self.base.agua, self.aguas[kk], self.tierra_idx).astype(np.uint8)
                for bl in self.blobs:
                    self._blob(img, *bl)
                self._fondos.append(img)
        img = self._fondos[k % 4].copy()
        for bl in blobs_extra or []:
            self._blob(img, *bl)
        return img

    def pegar(self, img, o: Objeto, dx=0, dy=0):
        spr = o.spr
        x0 = int(round(o.gx - spr.ax)) + dx
        y0 = int(round(o.gy - o.h - spr.ay)) + dy
        h, w = spr.px.shape
        sx0, sy0 = max(0, x0), max(0, y0)
        sx1, sy1 = min(SW, x0 + w), min(SH, y0 + h)
        if sx1 <= sx0 or sy1 <= sy0:
            return
        sub = spr.px[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0]
        mask = sub != TRANSP
        if o.ztest:
            gyh = self.base.gyh[sy0:sy1, sx0:sx1]
            mask &= (o.prof + 3 >= gyh)
        reg = img[sy0:sy1, sx0:sx1]
        reg[mask] = sub[mask]

    def dibujar(self, k=0, extra=None, blobs_extra=None):
        img = self.fondo(k, blobs_extra)
        orden = sorted(self.obj + (extra or []), key=lambda o: o.prof)
        for o in orden:
            self.pegar(img, o)
        return img
