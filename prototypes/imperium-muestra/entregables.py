"""Hoja de sprites, paleta (PNG + hexadecimal) y verificación de la muestra."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
import util
import fuente as FU
import personajes as PE
import mitologicos as MY
import animales as AN
import templo as TP
import edificios as E
import edificios2 as E2
from paleta import PALETA_RGB, N_COLORES, COLORES, RAMPAS, RAMPA_IDX, TRANSP, c

AQUI = os.path.dirname(os.path.abspath(__file__))
SAL = os.path.join(AQUI, "salida")
VIS = os.path.join(AQUI, "vista")
os.makedirs(SAL, exist_ok=True)


def lienzo(w, h, fondo=None):
    return np.full((h, w), c("agua", 1) if fondo is None else fondo, np.uint8)


def pegar(dst, spr, x, y):
    m = spr.px != TRANSP
    h, w = spr.px.shape
    y0, x0 = max(0, y), max(0, x)
    y1, x1 = min(dst.shape[0], y + h), min(dst.shape[1], x + w)
    sub = spr.px[y0 - y:y1 - y, x0 - x:x1 - x]
    mm = m[y0 - y:y1 - y, x0 - x:x1 - x]
    dst[y0:y1, x0:x1][mm] = sub[mm]


def hoja_sprites():
    """Ciudadanos (5 oficios x 2 géneros: idle + 6 de caminar), edificios en 3 etapas y animales."""
    tipos = list(PE.TIPOS)
    cols = 9
    celda_w, celda_h = 22, 30
    filas_c = len(tipos) * 2
    # --- zona de ciudadanos
    zona_c_h = filas_c * celda_h + 14
    # --- edificios (templo + casa) en tres etapas
    templos = [TP.templo(1), TP.templo(2), TP.templo(3)]
    casas = [E2.solar_casa(), E2.casa_obra(), E.casa(2, 2, eje="u", seed=3)]
    fila_t_h = max(s.h for s in templos) + 22
    fila_c_h = max(s.h for s in casas) + 22
    ancho = max(cols * celda_w + 10, sum(s.w + 18 for s in templos) + 12, 560)
    # --- animales y criaturas
    ani = [AN.oveja(0), AN.oveja(1), AN.vaca(0), AN.vaca(1), AN.caballo(0), AN.caballo(1), AN.gallina(0)]
    cri = [MY.minotauro(0, "idle"), MY.centauro(0, "idle"), MY.satiro(0, "tocar")]
    fila_a_h = max(s.h for s in ani + cri) + 20
    alto = 16 + zona_c_h + 16 + fila_t_h + fila_c_h + fila_a_h + 6
    img = lienzo(ancho, alto)
    # títulos
    y = 6
    FU.texto(img, 6, y, "CIUDADANOS · IDLE Y CAMINAR (6 FOTOGRAMAS) · HOMBRE Y MUJER", c("tierra", 5), c("agua", 0))
    y += 12
    nombres = {"campesino": "CAMPESINO", "artesano": "ARTESANO", "comerciante": "COMERCIANTE", "soldado": "SOLDADO", "sacerdote": "SACERDOTE"}
    for r, t in enumerate(tipos):
        for g in (False, True):
            fr = [PE.persona(t, 0, "idle", mujer=g)] + [PE.persona(t, k, "caminar", mujer=g) for k in range(6)] + \
                 [PE.persona(t, 0, "idle", espaldas=True, mujer=g), PE.persona(t, 2, "caminar", espaldas=True, mujer=g)]
            for k, s in enumerate(fr):
                pegar(img, s, 4 + k * celda_w, y + 2)
            FU.texto(img, 4 + cols * celda_w + 6, y + 10, nombres[t] + (" (M)" if g else " (H)"), c("piedra", 4), c("agua", 0))
            y += celda_h
    y += 4
    FU.texto(img, 6, y, "TEMPLO DE JÚPITER · 5X5 TILES · TERRENO / OBRA / TERMINADO", c("tierra", 5), c("agua", 0))
    y += 10
    x = 6
    for s in templos:
        pegar(img, s, x, y + fila_t_h - 18 - s.h)
        x += s.w + 18
    y += fila_t_h - 6
    FU.texto(img, 6, y, "VIVIENDA · 2X2 TILES · TERRENO / OBRA / TERMINADA", c("tierra", 5), c("agua", 0))
    y += 10
    x = 6
    for s in casas:
        pegar(img, s, x, y + fila_c_h - 18 - s.h)
        x += s.w + 26
    y += fila_c_h - 6
    FU.texto(img, 6, y, "ANIMALES Y CRIATURAS MITOLÓGICAS", c("tierra", 5), c("agua", 0))
    y += 10
    x = 6
    for s in ani + cri:
        pegar(img, s, x, y + fila_a_h - 12 - s.h)
        x += s.w + 8
    return img


def paleta_png():
    """Paleta agrupada por rampas, con hexadecimal."""
    sw = 22
    filas = list(RAMPAS.items())
    w = 12 + 8 * sw + 150
    h = 14 + len(filas) * (sw + 6)
    img = np.full((h, w), c("agua", 0), np.uint8)
    y = 10
    for nombre, lista in filas:
        FU.texto(img, 4, y + 8, nombre, c("piedra", 5), c("agua", 0))
        for i, col in enumerate(lista):
            idx = RAMPA_IDX[nombre][i]
            img[y:y + sw, 70 + i * sw:70 + (i + 1) * sw - 2] = idx
        y += sw + 6
    return img


def paleta_texto():
    lin = [f"# Paleta de IMPERIUM · {N_COLORES} colores (hex RGB), agrupada por rampa de oscuro a claro"]
    for nombre, lista in RAMPAS.items():
        lin.append(f"{nombre}: " + " ".join(h.upper() for h in lista))
    lin.append("")
    lin.append("# Todos los colores, índice -> hex")
    for i, h in enumerate(COLORES):
        lin.append(f"{i:02d} {h.upper()}")
    return "\n".join(lin)


def verificar(frames_path=None):
    """Comprobaciones: paleta, cuadrícula de píxeles y bordes."""
    info = []
    ok_global = True
    # 1) imagen base y sus ampliaciones
    base_png = os.path.join(SAL, "escena_base_960x540.png")
    if os.path.exists(base_png):
        base = np.array(Image.open(base_png).convert("RGB"))
        pal = {tuple(int(v) for v in rgb) for rgb in PALETA_RGB}
        usados = {tuple(int(v) for v in px) for px in base.reshape(-1, 3)}
        fuera = usados - pal
        info.append(f"Escena base {base.shape[1]}x{base.shape[0]}: {len(usados)} colores usados de {len(pal)} de la paleta; fuera de paleta: {len(fuera)}")
        ok_global &= len(fuera) == 0
        for esc, nom in ((2, "escena_x2_1920x1080.png"), (4, "escena_x4_3840x2160.png")):
            ruta = os.path.join(SAL, nom)
            if os.path.exists(ruta):
                big = np.array(Image.open(ruta).convert("RGB"))
                recon = np.repeat(np.repeat(base, esc, 0), esc, 1)
                igual = bool(np.array_equal(big, recon))
                info.append(f"{nom}: ampliación x{esc} por vecino más cercano exacta (sin mezcla de píxeles): {'SÍ' if igual else 'NO'}")
                ok_global &= igual
    # 2) GIF: cada fotograma solo con colores de la paleta
    gif = os.path.join(SAL, "escena_animada.gif")
    if os.path.exists(gif):
        im = Image.open(gif)
        n = 0
        fuera_gif = 0
        pal = {tuple(int(v) for v in rgb) for rgb in PALETA_RGB}
        try:
            while True:
                rgb = np.array(im.convert("RGB"))
                usados = {tuple(int(v) for v in px) for px in rgb.reshape(-1, 3)}
                fuera_gif += len(usados - pal)
                n += 1
                im.seek(im.tell() + 1)
        except EOFError:
            pass
        info.append(f"GIF: {n} fotogramas, {im.size[0]}x{im.size[1]}, colores fuera de paleta: {fuera_gif}")
        ok_global &= fuera_gif == 0
    # 3) hoja de sprites
    hoja = os.path.join(SAL, "hoja_sprites.png")
    if os.path.exists(hoja):
        hh = np.array(Image.open(hoja).convert("RGB"))
        pal = {tuple(int(v) for v in rgb) for rgb in PALETA_RGB}
        usados = {tuple(int(v) for v in px) for px in hh.reshape(-1, 3)}
        info.append(f"Hoja de sprites: {len(usados)} colores, fuera de paleta: {len(usados - pal)}")
        ok_global &= len(usados - pal) == 0
    info.append("RESULTADO: " + ("TODO CORRECTO" if ok_global else "HAY ERRORES"))
    return info, ok_global


if __name__ == "__main__":
    h = hoja_sprites()
    util.guardar(h, os.path.join(SAL, "hoja_sprites.png"), 1)
    util.guardar(h, os.path.join(SAL, "hoja_sprites_x4.png"), 4)
    util.guardar(h, os.path.join(VIS, "hoja_sprites.png"), 3)
    p = paleta_png()
    util.guardar(p, os.path.join(SAL, "paleta.png"), 1)
    util.guardar(p, os.path.join(SAL, "paleta_x4.png"), 4)
    util.guardar(p, os.path.join(VIS, "paleta.png"), 3)
    open(os.path.join(SAL, "paleta.txt"), "w", encoding="utf-8").write(paleta_texto())
    info, ok = verificar()
    open(os.path.join(SAL, "verificacion.txt"), "w", encoding="utf-8").write("\n".join(info))
    print("\n".join(info))
