"""Paleta de IMPERIUM (muestra de pixel art).

Todo el arte se dibuja con ÍNDICES de esta paleta. Cada rampa va de sombra fría
(azul/violeta) a luz cálida (dorado). Nada fuera de aquí llega a la imagen final.
"""
import numpy as np

# nombre -> lista de colores, de oscuro a claro
RAMPAS = {
    # agua: abismo -> espuma
    "agua":   ["#0a1736", "#0f2c58", "#144b7c", "#1b6f97", "#2a96a6", "#5cc0b4", "#a6e4d0"],
    # hierba y follaje
    "hierba": ["#132b38", "#1d4a3c", "#2d6a3c", "#4b8640", "#74a043", "#a3b44c", "#d0c86a"],
    # tierra, arena, paja, trigo
    "tierra": ["#46293a", "#7a4a3c", "#a8704c", "#c99a5e", "#e4be7a", "#f4daa0", "#fcefc2"],
    # tejas de terracota y toldos rojos
    "teja":   ["#381e30", "#7a2c30", "#b04a32", "#d36a3c", "#ea904c", "#f7ba76"],
    # piedra tallada, estuco y mármol
    "piedra": ["#2a2840", "#484862", "#6c6b82", "#9a97a4", "#c8c0b4", "#e8dfca", "#fbf5e2"],
    # roca natural (calizas cálidas)
    "roca":   ["#2a2840", "#544f62", "#7f7770", "#aa9b84"],
    # madera
    "madera": ["#2c1c28", "#54352e", "#7e5434", "#a67846", "#cb9d62"],
    # piel
    "piel":   ["#f6d2aa", "#dea276", "#b4724f", "#86492f"],
    # telas
    "azul":   ["#243f7c", "#3b66b0", "#6c9ad2"],
    "purpura": ["#43225e", "#74409a", "#a674c4"],
    "carmesi": ["#7a1c34", "#b8363f", "#e8584a"],
    "oro":    ["#9c6420", "#e0a22e", "#ffd862"],
    # contornos
    "tinta":  ["#130e1e"],
}

NOMBRES = list(RAMPAS)
_vistos: dict[str, int] = {}
COLORES: list[str] = []
INICIO: dict[str, int] = {}     # primer índice de cada rampa
RAMPA_IDX: dict[str, list[int]] = {}


def _hex(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)


for _n, _lista in RAMPAS.items():
    _ids = []
    for _c in _lista:
        _c = _c.lower()
        if _c not in _vistos:
            _vistos[_c] = len(COLORES)
            COLORES.append(_c)
        _ids.append(_vistos[_c])
    RAMPA_IDX[_n] = _ids

PALETA_RGB = np.array([_hex(c) for c in COLORES], dtype=np.uint8)
N_COLORES = len(COLORES)
TRANSP = 255   # índice reservado para "transparente" en sprites


def c(rampa: str, tono: int) -> int:
    """Índice de paleta del tono `tono` de la rampa (se acota al rango)."""
    ids = RAMPA_IDX[rampa]
    return ids[max(0, min(len(ids) - 1, tono))]


def largo(rampa: str) -> int:
    return len(RAMPA_IDX[rampa])


TINTA = c("tinta", 0)

if __name__ == "__main__":
    print(N_COLORES, "colores")
