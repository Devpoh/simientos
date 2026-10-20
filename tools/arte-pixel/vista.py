"""Hojas de revisión del atlas (x1 y x4) con el ancla y la huella marcadas. No se guardan en el repositorio."""
import os

import numpy as np
from PIL import Image

import fuente as FU
from paleta import PALETA_RGB, N_COLORES, TRANSP, c

FONDO = c("agua", 1)
MARCA_ANCLA = (255, 40, 40)
MARCA_HUELLA = (255, 0, 255)
X = 4


def _rgb(idx):
    pal = np.zeros((256, 3), np.uint8)
    pal[:N_COLORES] = PALETA_RGB
    return pal[idx]


def _recorte(lienzos, fr):
    return lienzos[fr["atlas"]][fr["y"]:fr["y"] + fr["h"], fr["x"]:fr["x"] + fr["w"]]


def _rombo(ancla, huella):
    """Vértices en pantalla (x1) de la huella centrada en el ancla."""
    w, d = huella["w"] * 16, huella["d"] * 16
    cu, cv = w / 2, d / 2
    return [((u - v) - (cu - cv) + ancla["x"], (u + v) / 2 - (cu + cv) / 2 + ancla["y"])
            for u, v in ((0, 0), (w, 0), (w, d), (0, d))]


def _linea(img, p, q, col):
    n = int(max(abs(q[0] - p[0]), abs(q[1] - p[1]))) + 1
    for k in range(n + 1):
        t = k / max(1, n)
        x, y = int(round(p[0] + (q[0] - p[0]) * t)), int(round(p[1] + (q[1] - p[1]) * t))
        if 0 <= y < img.shape[0] and 0 <= x < img.shape[1]:
            img[y, x] = col


def hoja_categoria(doc, lienzos, cat, ancho=1100):
    celdas = []
    for sid, sp in sorted(doc["sprites"].items()):
        if sp["categoria"] != cat:
            continue
        for est, e in sp["estados"].items():
            for ori, claves in e["orientaciones"].items():
                celdas.append((f"{sid}/{est}/{ori}", claves[0], sp["huella"]))
    # estantes
    pos, x, y, fh, anchos = [], 4, 4, 0, []
    for etq, clave, huella in celdas:
        fr = doc["frames"][clave]
        w, h = fr["w"] + 14, fr["h"] + 20
        w = max(w, 5 * min(len(etq.split("/", 1)[1]), 14) + 6)
        if x + w > ancho // X:
            x, y, fh = 4, y + fh + 4, 0
        pos.append((x, y)); x += w + 2; fh = max(fh, h)
    alto = y + fh + 8
    base = np.full((alto, ancho // X), FONDO, np.uint8)
    for (etq, clave, huella), (cx, cy) in zip(celdas, pos):
        fr = doc["frames"][clave]
        sub = _recorte(lienzos, fr)
        m = sub != TRANSP
        base[cy + 14:cy + 14 + fr["h"], cx + 4:cx + 4 + fr["w"]][m] = sub[m]
        FU.texto(base, cx, cy + 2, etq.split("/", 1)[1].upper().replace("_", " ")[:14], c("piedra", 4), FONDO)
    img = np.repeat(np.repeat(_rgb(base), X, 0), X, 1)
    for (etq, clave, huella), (cx, cy) in zip(celdas, pos):
        fr = doc["frames"][clave]
        ox, oy = cx + 4, cy + 14
        an = {"x": fr["ancla"]["x"] + ox, "y": fr["ancla"]["y"] + oy}
        pts = [(px * X + X // 2, py * X + X // 2) for px, py in _rombo(an, huella)]
        for i in range(4):
            _linea(img, pts[i], pts[(i + 1) % 4], MARCA_HUELLA)
        ax, ay = an["x"] * X + X // 2, an["y"] * X + X // 2
        for d in range(-6, 7):
            for (xx, yy) in ((ax + d, ay), (ax, ay + d)):
                if 0 <= yy < img.shape[0] and 0 <= xx < img.shape[1]:
                    img[yy, xx] = MARCA_ANCLA
    return img


def hojas(doc, lienzos, carpeta):
    os.makedirs(carpeta, exist_ok=True)
    for n, lz in enumerate(lienzos):
        rgb = _rgb(np.where(lz == TRANSP, FONDO, lz))
        Image.fromarray(rgb).save(os.path.join(carpeta, f"atlas-{n}-x1.png"))
    for cat in sorted({s["categoria"] for s in doc["sprites"].values()}):
        Image.fromarray(hoja_categoria(doc, lienzos, cat)).save(os.path.join(carpeta, f"cat-{cat}-x4.png"))
    print("hojas de revisión →", carpeta)
