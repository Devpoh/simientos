"""Marcos 9-slice para los paneles HTML del juego (R70): madera y piedra sumeria, normal y resaltado.

Cada marco es un PNG de 16×16 px con esquinas de 6×6 (corte = 6): el anillo del marco mide 6 px, las esquinas
llevan un remache (oro en madera, lapislázuli en piedra) y la zona central de 4×4 es el relleno del panel.
Los lados repiten con periodo 4 px (`border-image-repeat: round` los reparte sin cortes). Luz única desde la izquierda
y arriba, igual que el resto del arte.

CSS (ampliación entera k = 2, 3, 4…):
    border-image: url(ui/marco-madera.png) 6 fill / calc(6px * k) / 0 round;  image-rendering: pixelated;
Sin `fill` el centro se descarta y se usa el color de fondo propio del panel.
"""
import numpy as np
from paleta import c, TRANSP

TAM, CORTE = 16, 6

# Perfil del anillo de fuera a dentro (d = 0..5): tono por rampa y lado. Lados iluminados = arriba e izquierda.
MATERIALES = {
    "madera": dict(
        rampa="madera", relleno=(0, 1),
        # d = 1..4 (cuerpo de la tabla); d = 0 contorno y d = 5 ranura interior se tratan aparte
        luz=[4, 4, 3, 2], sombra=[3, 2, 2, 1],
        remache=("oro", (2, 1, 1, 0)), ranura=("madera", 0),
    ),
    "piedra": dict(
        rampa="piedra", relleno=(0, 1),
        luz=[5, 5, 4, 3], sombra=[4, 3, 3, 2],
        remache=("azul", (2, 1, 1, 0)), ranura=("piedra", 0),
    ),
}


def _color_borde(material, resaltado, d, lado, a):
    """Color del píxel del anillo a profundidad d (0 = contorno exterior, 5 = ranura) sobre el lado dado.
    `a` es la posición a lo largo del lado (da periodo 4 al grano y a las juntas)."""
    m = MATERIALES[material]
    if d == 0:
        return c("oro", 1) if resaltado else c("tinta", 0)
    if d == 5:
        return c("oro", 0) if resaltado else c(*m["ranura"])
    lit = lado in ("arriba", "izquierda")
    tn = (m["luz"] if lit else m["sombra"])[d - 1] + (1 if resaltado else 0)
    if material == "madera":
        # veta: un tono menos cada 4 px, desfasada entre filas
        if (d == 2 and a % 4 == 1) or (d == 3 and a % 4 == 3):
            tn -= 1
    else:
        # aparejo de ladrillo/sillar: juntas cada 4 px, desfasadas 2 px entre las dos mitades del cuerpo
        junta = (a % 4 == 0) if d in (1, 2) else (a % 4 == 2)
        if junta:
            tn -= 1
    return c(m["rampa"], tn)


def marco(material, resaltado=False):
    """Devuelve un array 16×16 de índices de paleta (TRANSP donde no hay dibujo)."""
    m = MATERIALES[material]
    img = np.full((TAM, TAM), TRANSP, np.uint8)
    fill = c(m["rampa"], m["relleno"][1 if resaltado else 0])
    for y in range(TAM):
        for x in range(TAM):
            d = min(x, y, TAM - 1 - x, TAM - 1 - y)
            if d >= CORTE:
                img[y, x] = fill
                continue
            # lado más cercano; en las esquinas la inglete (diagonal) decide qué lado manda
            dx, dy = min(x, TAM - 1 - x), min(y, TAM - 1 - y)
            if dx < dy:
                lado, a = ("izquierda" if x < TAM // 2 else "derecha"), y
            elif dy < dx:
                lado, a = ("arriba" if y < TAM // 2 else "abajo"), x
            else:   # justo en la diagonal: lo manda el eje horizontal
                lado, a = ("arriba" if y < TAM // 2 else "abajo"), x
            img[y, x] = _color_borde(material, resaltado, d, lado, a)
    # esquinas: se redondea el píxel exterior y se pone el remache (la luz es la misma en las cuatro)
    for x, y in ((0, 0), (TAM - 1, 0), (0, TAM - 1), (TAM - 1, TAM - 1)):
        img[y, x] = TRANSP
    rampa, tonos = m["remache"]
    if resaltado:
        rampa = "oro"                     # al resaltar, el remache (lapislázuli o bronce) pasa a oro brillante
    sube = 1 if (resaltado and material == "madera") else 0
    rem = [[tonos[0], tonos[1]], [tonos[2], tonos[3]]]
    for ox in (0, TAM - CORTE):
        for oy in (0, TAM - CORTE):
            for j in range(2):
                for i in range(2):
                    img[oy + 2 + j, ox + 2 + i] = c(rampa, rem[j][i] + sube)
    return img


def marcos():
    """Todos los marcos para el exportador: nombre -> dict(estados={normal, resaltado}, corte, ...)."""
    out = {}
    for mat in MATERIALES:
        out[f"marco_{mat}"] = {
            "archivos": {"normal": f"ui/marco-{mat}.png", "resaltado": f"ui/marco-{mat}-resaltado.png"},
            "pixeles": {"normal": marco(mat, False), "resaltado": marco(mat, True)},
        }
    return out


def json_ui(datos):
    """Entrada `ui` del atlas.json: archivo por estado y márgenes del 9-slice."""
    return {
        nombre: {
            "ancho": TAM, "alto": TAM,
            "corte": {"arriba": CORTE, "derecha": CORTE, "abajo": CORTE, "izquierda": CORTE},
            "repetir": "round",          # los lados repiten con periodo 4 px (TAM - 2*CORTE)
            "relleno": True,             # el centro 4×4 es el fondo del panel
            "estados": d["archivos"],
            "origen": "propio (generado por código, tools/arte-pixel/ui.py)",
        }
        for nombre, d in datos.items()
    }
