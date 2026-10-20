"""Control de calidad de sprites (`npm run arte:verificar`, skill `sprite-qa`).

Uso:  python validar.py [carpeta | archivo.png]
  carpeta  : la del atlas (con atlas.json). Por defecto, games/sedimento/public/recursos/pixel
  archivo  : un PNG suelto (por ejemplo, un sprite o una hoja que acabas de generar)

Comprueba: colores fuera de los 59 de la paleta, alfa limpio (0 o 255), ampliación entera exacta,
píxeles sueltos aislados y, con atlas.json, ancla de pies sobre la fila inferior del dibujo (detecta
sprites flotantes o hundidos), fotogramas dentro del atlas sin solaparse y referencias resueltas.
Escribe una hoja de contacto x4 sobre el color del terreno en tools/arte-pixel/salida/contacto.png
(mírala con Read). Sale con código 1 si hay errores.
"""
import json
import os
import re
import sys

import numpy as np
from PIL import Image

import fuente as FU
from paleta import PALETA_RGB, N_COLORES, RAMPAS, c
import vista as V

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA_JUEGO = os.path.normpath(os.path.join(AQUI, "..", "..", "games", "sedimento", "public", "recursos", "pixel"))
CONTACTO = os.path.join(AQUI, "salida", "contacto.png")
MAX_COLORES = 64
MAX_LADO = 2048
# Tolerancia del ancla de pies: filas del dibujo por debajo (contorno, sombra) y por encima (flota) del ancla
PIES_DEBAJO, PIES_ENCIMA = 3, 1
SIN_ISLAS = ("paleta",)          # hojas que no son sprites (la fuente de texto tiene puntos sueltos)
SIN_PIES = ("ambiente",)         # lo que vuela no se apoya en el suelo
PALETA = {tuple(int(v) for v in rgb) for rgb in PALETA_RGB}
TERRENO_IDX = c("hierba", 3)
TERRENO = tuple(int(v) for v in PALETA_RGB[TERRENO_IDX])


class Informe:
    def __init__(self):
        self.errores, self.lineas = [], []

    def ok(self, cond, msg):
        if not cond:
            self.errores.append(msg)
        return cond

    def info(self, msg):
        self.lineas.append(msg)


def escala_entera(rgba):
    """Mayor k (2..8) tal que la imagen sea una ampliación por bloques uniformes de kxk; 1 si es nativa."""
    h, w = rgba.shape[:2]
    for k in (8, 7, 6, 5, 4, 3, 2):
        if h % k or w % k:
            continue
        bloques = rgba.reshape(h // k, k, w // k, k, 4)
        if (bloques == bloques[:, :1, :, :1, :]).all():
            return k
    return 1


def aislados(opaco):
    pad = np.pad(opaco, 1)
    vecinos = sum(np.roll(np.roll(pad, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy, dx) != (0, 0))
    return opaco & (vecinos[1:-1, 1:-1] == 0)


def validar_png(ruta, inf):
    nombre = os.path.basename(ruta)
    im = Image.open(ruta)
    rgba = np.array(im.convert("RGBA"))
    alfa = rgba[..., 3]
    inf.ok(bool(np.isin(alfa, (0, 255)).all()), f"{nombre}: hay píxeles semitransparentes (antialiasing)")
    opaco = alfa == 255
    usados = {tuple(int(v) for v in px) for px in np.unique(rgba[opaco][:, :3], axis=0)} if opaco.any() else set()
    fuera = usados - PALETA
    inf.ok(not fuera, f"{nombre}: {len(fuera)} colores fuera de la paleta, p. ej. {sorted(fuera)[:3]}")
    k = escala_entera(rgba)
    pedido = re.search(r"[_-]x(\d)(?!\d)", nombre.lower())
    if pedido:
        kk = int(pedido.group(1))
        inf.ok(k >= kk, f"{nombre}: se llama x{kk} pero no es una ampliación entera exacta (detectado x{k})")
    # el motor escala por vecino más cercano: x2 y x4 deben ser exactas
    for kk in (2, 4):
        grande = np.array(im.convert("RGBA").resize((im.width * kk, im.height * kk), Image.NEAREST))
        inf.ok(np.array_equal(grande, np.repeat(np.repeat(rgba, kk, 0), kk, 1)), f"{nombre}: la ampliación x{kk} no es exacta")
    islas = 0
    if not nombre.lower().startswith(SIN_ISLAS) and k == 1:
        sueltos = aislados(opaco)
        islas = int(sueltos.sum())
        if islas:
            ys, xs = np.where(sueltos)
            inf.ok(False, f"{nombre}: {islas} píxeles sueltos aislados, p. ej. en {[(int(x), int(y)) for x, y in zip(xs[:4], ys[:4])]}")
    inf.info(f"{nombre}: {im.width}x{im.height}, {len(usados)} colores usados, {len(fuera)} fuera de paleta, "
             f"escala x{k}, {islas} píxeles sueltos")
    if max(im.size) > MAX_LADO and nombre.startswith("atlas"):
        inf.ok(False, f"{nombre} supera {MAX_LADO}px")
    return rgba


def validar_atlas(carpeta, inf):
    doc = json.load(open(os.path.join(carpeta, "atlas.json"), encoding="utf-8"))
    inf.ok(doc.get("paleta") == N_COLORES, f"atlas.json dice paleta={doc.get('paleta')} y el código tiene {N_COLORES}")
    imgs = []
    for a in doc["atlas"]:
        ruta = os.path.join(carpeta, a["imagen"])
        if not inf.ok(os.path.exists(ruta), f"falta la imagen {a['imagen']}"):
            imgs.append(None)
            continue
        rgba = validar_png(ruta, inf)
        inf.ok(rgba.shape[1] == a["ancho"] and rgba.shape[0] == a["alto"], f"{a['imagen']}: tamaño distinto del JSON")
        imgs.append(rgba)
    ocupado = [np.zeros(i.shape[:2], bool) if i is not None else None for i in imgs]
    vistos = set()
    flotantes = hundidos = 0
    for clave, f in doc["frames"].items():
        img = imgs[f["atlas"]]
        if img is None:
            continue
        x, y, w, h = f["x"], f["y"], f["w"], f["h"]
        if not inf.ok(0 <= x and 0 <= y and x + w <= img.shape[1] and y + h <= img.shape[0], f"{clave}: fuera del atlas"):
            continue
        sub = img[y:y + h, x:x + w, 3] == 255
        rect = (f["atlas"], x, y, w, h)
        if rect not in vistos:      # varios fotogramas comparten dibujo (dedup)
            vistos.add(rect)
            if ocupado[f["atlas"]][y:y + h, x:x + w].any():
                inf.ok(False, f"{clave}: se solapa con otro fotograma")
            ocupado[f["atlas"]][y:y + h, x:x + w] = True
        if not inf.ok(bool(sub.any()), f"{clave}: fotograma vacío"):
            continue
        a = f["ancla"]
        inf.ok(0 <= a["x"] <= w and 0 <= a["y"] <= h, f"{clave}: ancla fuera del fotograma")
        sp = doc["sprites"][clave.split("/")[0]]
        if sp.get("anclaEn") == "pies" and sp["categoria"] not in SIN_PIES:
            inferior = int(np.where(sub.any(axis=1))[0].max())
            d = a["y"] - inferior          # > 0: el ancla está por debajo del dibujo (flota)
            if d > PIES_ENCIMA:
                flotantes += 1
                inf.ok(False, f"{clave}: flotante, el ancla está {d} filas por debajo del dibujo")
            elif d < -PIES_DEBAJO:
                hundidos += 1
                inf.ok(False, f"{clave}: hundido, el dibujo baja {-d} filas por debajo del ancla")
    inf.info(f"{len(doc['frames'])} fotogramas ({len(vistos)} únicos): dentro del atlas, con contenido, sin solaparse; "
             f"{flotantes} flotantes, {hundidos} hundidos")
    for sid, s in doc["sprites"].items():
        for en, e in s["estados"].items():
            for on, lista in e["orientaciones"].items():
                for k in lista:
                    inf.ok(k in doc["frames"], f"{sid}/{en}/{on}: fotograma {k} no existe")
    inf.info(f"{len(doc['sprites'])} sprites con sus referencias resueltas")
    return doc, imgs


# ------------------------------------------------------------------ hoja de contacto
def _pegar(base, sub, x, y):
    m = sub[..., 3] == 255
    base[y:y + sub.shape[0], x:x + sub.shape[1]][m] = sub[..., :3][m]


def _cruz(big, ax, ay):
    for d in range(-6, 7):
        for (xx, yy) in ((ax + d, ay), (ax, ay + d)):
            if 0 <= yy < big.shape[0] and 0 <= xx < big.shape[1]:
                big[yy, xx] = V.MARCA_ANCLA


def contacto_atlas(doc, imgs, ancho=480):
    """Primer fotograma de cada sprite sobre el color del terreno, x4, con el ancla y la huella marcadas."""
    celdas = []
    for sid, sp in sorted(doc["sprites"].items()):
        est = sp["estados"][sp["etapas"][-1]] if sp.get("etapas") else next(iter(sp["estados"].values()))
        clave = next(iter(est["orientaciones"].values()))[0]
        celdas.append((sid, clave, sp))
    pos, x, y, fh = [], 4, 4, 0
    for sid, clave, sp in celdas:
        f = doc["frames"][clave]
        w, h = max(f["w"] + 8, 5 * min(len(sid), 16) + 4), f["h"] + 18
        if x + w > ancho:
            x, y, fh = 4, y + fh + 2, 0
        pos.append((x, y)); x += w + 2; fh = max(fh, h)
    alto = y + fh + 6
    ind = np.full((alto, ancho), TERRENO_IDX, np.uint8)
    for (sid, clave, sp), (cx, cy) in zip(celdas, pos):
        FU.texto(ind, cx, cy + 2, sid.upper().replace("_", " ")[:16], c("piedra", 6), TERRENO_IDX)
    base = PALETA_RGB[ind].copy()
    for (sid, clave, sp), (cx, cy) in zip(celdas, pos):
        f = doc["frames"][clave]
        _pegar(base, imgs[f["atlas"]][f["y"]:f["y"] + f["h"], f["x"]:f["x"] + f["w"]], cx + 4, cy + 14)
    big = np.repeat(np.repeat(base, 4, 0), 4, 1)
    for (sid, clave, sp), (cx, cy) in zip(celdas, pos):
        f = doc["frames"][clave]
        an = {"x": f["ancla"]["x"] + cx + 4, "y": f["ancla"]["y"] + cy + 14}
        if sp.get("anclaEn") == "huella":
            pts = [(px * 4 + 2, py * 4 + 2) for px, py in V._rombo(an, sp["huella"])]
            for i in range(4):
                V._linea(big, pts[i], pts[(i + 1) % 4], V.MARCA_HUELLA)
        _cruz(big, an["x"] * 4 + 2, an["y"] * 4 + 2)
    return big


def contacto_png(rgba):
    h, w = rgba.shape[:2]
    base = np.zeros((h + 8, w + 8, 3), np.uint8)
    base[:] = TERRENO
    _pegar(base, rgba, 4, 4)
    return np.repeat(np.repeat(base, 4, 0), 4, 1)


def guardar_contacto(arr):
    os.makedirs(os.path.dirname(CONTACTO), exist_ok=True)
    Image.fromarray(arr).save(CONTACTO)
    return CONTACTO


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ruta = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else SALIDA_JUEGO)
    inf = Informe()
    inf.ok(N_COLORES <= MAX_COLORES, f"la paleta tiene {N_COLORES} colores (máximo {MAX_COLORES})")
    inf.ok(len(PALETA) == N_COLORES, "la paleta tiene colores repetidos")
    inf.info(f"paleta: {N_COLORES} colores en {len(RAMPAS)} rampas")
    if os.path.isdir(ruta):
        if not inf.ok(os.path.exists(os.path.join(ruta, "atlas.json")), f"falta atlas.json en {ruta} (ejecuta `npm run arte`)"):
            return terminar(inf, None)
        doc, imgs = validar_atlas(ruta, inf)
        for nombre in sorted(os.listdir(ruta)):
            if nombre.endswith(".png") and not nombre.startswith("atlas-"):
                validar_png(os.path.join(ruta, nombre), inf)
        return terminar(inf, contacto_atlas(doc, imgs) if all(i is not None for i in imgs) else None)
    if not inf.ok(os.path.isfile(ruta) and ruta.lower().endswith(".png"), f"{ruta}: no es una carpeta ni un PNG"):
        return terminar(inf, None)
    return terminar(inf, contacto_png(validar_png(ruta, inf)))


def terminar(inf, contacto):
    print("\n".join(inf.lineas))
    if contacto is not None:
        print("hoja de contacto x4:", guardar_contacto(contacto))
    if inf.errores:
        print(f"\nFALLOS ({len(inf.errores)}):")
        print("\n".join("  - " + e for e in inf.errores[:40]))
        sys.exit(1)
    print("\nRESULTADO: TODO CORRECTO")


if __name__ == "__main__":
    main()
