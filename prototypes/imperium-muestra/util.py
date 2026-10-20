"""Utilidades: ruido determinista, hash, rampas de sombreado, volcado a PNG."""
import numpy as np
from PIL import Image
from paleta import PALETA_RGB, RAMPA_IDX, TRANSP

# ---------- ruido ----------

def hash2(x, y, seed=0):
    """Hash entero 2D -> [0,1). Acepta arrays o escalares."""
    x = np.asarray(x).astype(np.int64)
    y = np.asarray(y).astype(np.int64)
    h = (x * 374761393 + y * 668265263 + seed * 2246822519 + 1013904223) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF) / float(0x1000000)


def vnoise(x, y, seed=0):
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
    xf = x - xi
    yf = y - yi
    u = xf * xf * (3 - 2 * xf)
    v = yf * yf * (3 - 2 * yf)
    a = hash2(xi, yi, seed)
    b = hash2(xi + 1, yi, seed)
    c = hash2(xi, yi + 1, seed)
    d = hash2(xi + 1, yi + 1, seed)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def fbm(x, y, octs=4, seed=0):
    tot = 0.0
    amp = 1.0
    norm = 0.0
    f = 1.0
    for o in range(octs):
        tot = tot + amp * vnoise(x * f, y * f, seed + o * 17)
        norm += amp
        amp *= 0.5
        f *= 2.0
    return tot / norm


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


# ---------- rampas: oscurecer / aclarar un índice dentro de su rampa ----------

def _tabla_rampas():
    pos = {}
    for nombre, ids in RAMPA_IDX.items():
        for i, idx in enumerate(ids):
            pos.setdefault(idx, (nombre, i))
    return pos

_POS = _tabla_rampas()


def lut_tono(delta: int) -> np.ndarray:
    """Tabla 256 -> índice desplazado `delta` tonos dentro de su rampa."""
    t = np.arange(256, dtype=np.uint8)
    for idx, (nombre, i) in _POS.items():
        ids = RAMPA_IDX[nombre]
        t[idx] = ids[max(0, min(len(ids) - 1, i + delta))]
    return t

LUT = {d: lut_tono(d) for d in range(-4, 5)}


def tono(img: np.ndarray, delta: int) -> np.ndarray:
    return LUT[delta][img]


# ---------- salida ----------

def a_rgb(img: np.ndarray) -> np.ndarray:
    pal = np.zeros((256, 3), np.uint8)
    pal[: len(PALETA_RGB)] = PALETA_RGB
    pal[TRANSP] = (255, 0, 255)
    return pal[img]


def guardar(img: np.ndarray, ruta: str, escala: int = 1):
    rgb = a_rgb(img)
    if escala > 1:
        rgb = np.repeat(np.repeat(rgb, escala, 0), escala, 1)
    Image.fromarray(rgb).save(ruta)
