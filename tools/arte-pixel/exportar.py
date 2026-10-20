"""Exporta el catálogo de sprites a un atlas PNG + atlas.json para el juego (`npm run arte`).

Uso:  python exportar.py [--salida <carpeta>] [--vista <carpeta>]
  --salida  carpeta de destino (por defecto games/sedimento/public/recursos/pixel)
  --vista   además escribe hojas de revisión (x1 y x4, con el ancla marcada) fuera del repositorio

Es determinista: dos ejecuciones producen los mismos bytes.
"""
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image

import catalogo as CAT
import fuente as FU
from paleta import PALETA_RGB, N_COLORES, RAMPAS, RAMPA_IDX, TRANSP, c

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, "..", ".."))
SALIDA = os.path.join(RAIZ, "games", "sedimento", "public", "recursos", "pixel")
MAX_LADO = 2048
PAD = 1
VERSION = 1


def arg(nombre, defecto=None):
    if nombre in sys.argv:
        return sys.argv[sys.argv.index(nombre) + 1]
    return defecto


def _recortar(spr):
    """Recorta al contenido conservando el punto de la chimenea (en coordenadas de suelo)."""
    r = spr.recortar()
    if hasattr(spr, "chimenea"):
        r.chimenea = spr.chimenea
    return r


def _ancla(entrada, spr, ori):
    cen = entrada.centro[ori] if isinstance(entrada.centro, dict) else entrada.centro
    cu, cv = cen
    return int(round(int(spr.ax) + cu - cv)), int(round(int(spr.ay) + (cu + cv) / 2.0))


def recoger(entradas):
    """Devuelve (imagenes únicas, frames por clave, sprites listos para el JSON)."""
    unicas = {}      # hash -> dict(px, claves)
    frames = {}      # clave -> dict(h, ancla, puntos)
    sprites = {}
    for e in entradas:
        if e.id in sprites:
            raise SystemExit(f"id repetido: {e.id}")
        estados = {}
        for nombre, est in e.estados.items():
            ori_json = {}
            for ori, valor in est.orientaciones.items():
                if isinstance(valor, str):
                    continue
                claves = []
                for k, spr in enumerate(valor):
                    s = _recortar(spr) if e.recortar else spr
                    clave = f"{e.id}/{nombre}/{ori}/{k}"
                    ax, ay = _ancla(e, s, ori)
                    pts = {}
                    for pn, fn in e.puntos.items():
                        if hasattr(s, "chimenea"):
                            pts[pn] = dict(zip("xy", fn(s)))
                    h = hashlib.sha1(s.px.tobytes() + bytes(s.px.shape) + f"{ax},{ay},{pts}".encode()).hexdigest()
                    unicas.setdefault(h, {"px": s.px, "claves": []})["claves"].append(clave)
                    frames[clave] = {"hash": h, "w": int(s.w), "h": int(s.h), "ancla": {"x": ax, "y": ay}}
                    if pts:
                        frames[clave]["puntos"] = pts
                    claves.append(clave)
                ori_json[ori] = claves
            for ori, valor in est.orientaciones.items():   # alias
                if isinstance(valor, str):
                    ori_json[ori] = ori_json[valor]
            estados[nombre] = {"fps": est.fps, "orientaciones": dict(sorted(ori_json.items()))}
        sprites[e.id] = {"entrada": e, "estados": estados}
    return unicas, frames, sprites


def empaquetar(unicas):
    """Estantes de izquierda a derecha, de mayor a menor altura. Devuelve (rects, atlas[(ancho, alto)])."""
    orden = sorted(unicas.items(), key=lambda kv: (-kv[1]["px"].shape[0], -kv[1]["px"].shape[1], kv[1]["claves"][0]))
    rects = {}
    atlas = []
    n = 0
    x = y = fila_h = 0
    usado_h = 0
    for h, datos in orden:
        ph, pw = datos["px"].shape
        if x + pw > MAX_LADO:
            x, y, fila_h = 0, y + fila_h + PAD, 0
        if y + ph > MAX_LADO:
            atlas.append((MAX_LADO, usado_h))
            n += 1
            x = y = fila_h = usado_h = 0
        rects[h] = (n, x, y)
        x += pw + PAD
        fila_h = max(fila_h, ph)
        usado_h = max(usado_h, y + ph)
    atlas.append((MAX_LADO, usado_h))
    atlas = [(a, ((al + 15) // 16) * 16) for a, al in atlas]
    return rects, atlas


def a_rgba(idx):
    pal = np.zeros((256, 4), np.uint8)
    pal[:N_COLORES, :3] = PALETA_RGB
    pal[:N_COLORES, 3] = 255
    return pal[idx]


def guardar_png(rgba, ruta):
    Image.fromarray(rgba, "RGBA").save(ruta, optimize=False)


def paleta_png():
    """Paleta agrupada por rampas (indices de paleta)."""
    sw = 22
    filas = list(RAMPAS.items())
    w, h = 12 + 8 * sw + 150, 14 + len(filas) * (sw + 6)
    img = np.full((h, w), c("agua", 0), np.uint8)
    y = 10
    for nombre, lista in filas:
        FU.texto(img, 4, y + 8, nombre, c("piedra", 5), c("agua", 0))
        for i in range(len(lista)):
            img[y:y + sw, 70 + i * sw:70 + (i + 1) * sw - 2] = RAMPA_IDX[nombre][i]
        y += sw + 6
    return img


def paleta_texto():
    from paleta import COLORES
    lin = [f"# Paleta · {N_COLORES} colores (hex RGB), por rampa de oscuro a claro"]
    for nombre, lista in RAMPAS.items():
        lin.append(f"{nombre}: " + " ".join(h.upper() for h in lista))
    lin += ["", "# índice -> hex"] + [f"{i:02d} {h.upper()}" for i, h in enumerate(COLORES)]
    return "\n".join(lin) + "\n"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    salida = os.path.abspath(arg("--salida", SALIDA))
    vista = arg("--vista")
    os.makedirs(salida, exist_ok=True)
    entradas = CAT.todo()
    unicas, frames, sprites = recoger(entradas)
    rects, tam = empaquetar(unicas)
    lienzos = [np.full((al, an), TRANSP, np.uint8) for an, al in tam]
    for h, datos in unicas.items():
        n, x, y = rects[h]
        ph, pw = datos["px"].shape
        lienzos[n][y:y + ph, x:x + pw] = datos["px"]
    nombres = []
    for n, lz in enumerate(lienzos):
        nom = f"atlas-{n}.png"
        guardar_png(a_rgba(lz), os.path.join(salida, nom))
        nombres.append(nom)
    # JSON
    frames_json = {}
    for clave in sorted(frames):
        f = frames[clave]
        n, x, y = rects[f["hash"]]
        fj = {"atlas": n, "x": x, "y": y, "w": f["w"], "h": f["h"], "ancla": f["ancla"]}
        if "puntos" in f:
            fj["puntos"] = f["puntos"]
        frames_json[clave] = fj
    sprites_json = {}
    for sid in sorted(sprites):
        e, estados = sprites[sid]["entrada"], sprites[sid]["estados"]
        primera = next(iter(estados.values()))["orientaciones"]
        k0 = next(iter(primera.values()))[0]
        altura = 0
        for est in estados.values():
            for lista in est["orientaciones"].values():
                for k in lista:
                    px = unicas[frames[k]["hash"]]["px"]
                    filas = np.where((px != TRANSP).any(axis=1))[0]
                    altura = max(altura, frames[k]["ancla"]["y"] - int(filas.min()))
        sj = {
            "categoria": e.categoria,
            "huella": {"w": e.huella[0], "d": e.huella[1]},
            "bloquea": e.bloquea,
            "altura": altura,
            "ancla": frames[k0]["ancla"],
            "anclaEn": "huella" if (e.categoria in ("estructura", "barco") or e.centro != (0, 0)) else "pies",
            "puertas": e.puertas,
            "estados": estados,
        }
        if e.etapas:
            sj["etapas"] = e.etapas
        sprites_json[sid] = sj
    doc = {
        "version": VERSION,
        "origen": "propio (generado por código, tools/arte-pixel)",
        "paleta": N_COLORES,
        "tile": {"ancho": 32, "alto": 16},
        "atlas": [{"imagen": nombres[i], "ancho": tam[i][0], "alto": tam[i][1]} for i in range(len(tam))],
        "sprites": sprites_json,
        "frames": frames_json,
    }
    with open(os.path.join(salida, "atlas.json"), "w", encoding="utf-8", newline="\n") as fh:
        json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        fh.write("\n")
    guardar_png(a_rgba(paleta_png()), os.path.join(salida, "paleta.png"))
    with open(os.path.join(salida, "paleta.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(paleta_texto())
    area = sum(d["px"].size for d in unicas.values())
    print(f"{len(sprites_json)} sprites · {len(frames_json)} fotogramas ({len(unicas)} únicos, {area // 1000}k px) · "
          f"atlas {', '.join(f'{a}x{b}' for a, b in tam)} → {salida}")
    if vista:
        import vista as V
        V.hojas(doc, lienzos, os.path.abspath(vista))


if __name__ == "__main__":
    main()
