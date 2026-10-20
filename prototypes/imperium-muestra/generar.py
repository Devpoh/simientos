"""Genera todos los entregables de la muestra de pixel art de IMPERIUM en ./salida/ y ./vista/.

Uso:  python generar.py            (todo)
      python generar.py --prueba   (solo 6 fotogramas, para iterar rápido)
"""
import os, sys, time
import numpy as np
from PIL import Image
import escena_final as EF
import animacion as AN
import hud
import util
from paleta import PALETA_RGB, N_COLORES, COLORES, RAMPAS, TRANSP

AQUI = os.path.dirname(os.path.abspath(__file__))
SAL = os.path.join(AQUI, "salida")
VIS = os.path.join(AQUI, "vista")
os.makedirs(SAL, exist_ok=True)
os.makedirs(VIS, exist_ok=True)


def a_pil_p(idx):
    im = Image.fromarray(idx.astype(np.uint8), "P")
    pal = np.zeros((256, 3), np.uint8)
    pal[:N_COLORES] = PALETA_RGB
    im.putpalette(pal.flatten().tolist())
    return im


def main():
    prueba = "--prueba" in sys.argv
    t0 = time.time()
    e = EF.construir()
    e.preparar()
    print("escena lista", round(time.time() - t0, 1), "s")
    rep = AN.reparto(e)
    estaticos = e.obj
    n = 6 if prueba else AN.FR
    frames = []
    base_mm = None
    for f in range(n):
        img = AN.render_frame(e, f, rep, estaticos)
        if base_mm is None:
            base_mm = img.copy()
        hud.dibujar(img, e, base_mm, f)
        frames.append(img)
        if f % 8 == 0:
            print("fotograma", f, round(time.time() - t0, 1), "s")
    principal = frames[0]
    util.guardar(principal, os.path.join(SAL, "escena_base_960x540.png"), 1)
    util.guardar(principal, os.path.join(SAL, "escena_x2_1920x1080.png"), 2)
    util.guardar(principal, os.path.join(SAL, "escena_x4_3840x2160.png"), 4)
    util.guardar(principal, os.path.join(VIS, "escena.png"), 1)
    ims = [a_pil_p(fr) for fr in frames]
    # animación fluida a 30 fps (APNG: temporización exacta en el navegador)
    ruta_fluida = os.path.join(SAL, "escena_fluida_30fps.png")
    ims[0].save(ruta_fluida, save_all=True, append_images=ims[1:], duration=1000 // AN.FPS, loop=0, format="PNG")
    ims[0].save(os.path.join(VIS, "escena_fluida.png"), save_all=True, append_images=ims[1:], duration=1000 // AN.FPS, loop=0, format="PNG")
    # GIF (entregable): cada 2.º fotograma a ~14 fps
    g_ = ims[::2]
    ruta_gif = os.path.join(SAL, "escena_animada.gif")
    g_[0].save(ruta_gif, save_all=True, append_images=g_[1:], duration=70, loop=0, optimize=False, disposal=1)
    print("GIF", os.path.getsize(ruta_gif) // 1024, "KB", len(g_), "fotogramas ·  APNG", os.path.getsize(ruta_fluida) // 1024, "KB", len(ims), "fotogramas", round(time.time() - t0, 1), "s")
    np.save(os.path.join(AQUI, "_frames.npy"), np.array(frames))


if __name__ == "__main__":
    main()
