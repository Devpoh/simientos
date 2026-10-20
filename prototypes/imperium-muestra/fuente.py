"""Fuente pixel propia: mayúsculas 4x5 proporcionales + tildes. Sin escalados."""
import numpy as np
from paleta import TRANSP

_G = {
    "A": [".##.", "#..#", "####", "#..#", "#..#"],
    "B": ["###.", "#..#", "###.", "#..#", "###."],
    "C": [".###", "#...", "#...", "#...", ".###"],
    "D": ["###.", "#..#", "#..#", "#..#", "###."],
    "E": ["####", "#...", "###.", "#...", "####"],
    "F": ["####", "#...", "###.", "#...", "#..."],
    "G": [".###", "#...", "#.##", "#..#", ".###"],
    "H": ["#..#", "#..#", "####", "#..#", "#..#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"],
    "J": ["..#", "..#", "..#", "#.#", ".#."],
    "K": ["#..#", "#.#.", "##..", "#.#.", "#..#"],
    "L": ["#...", "#...", "#...", "#...", "####"],
    "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
    "N": ["#..#", "##.#", "#.##", "#..#", "#..#"],
    "O": [".##.", "#..#", "#..#", "#..#", ".##."],
    "P": ["###.", "#..#", "###.", "#...", "#..."],
    "Q": [".##.", "#..#", "#..#", "#.#.", ".#.#"],
    "R": ["###.", "#..#", "###.", "#.#.", "#..#"],
    "S": [".###", "#...", ".##.", "...#", "###."],
    "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "U": ["#..#", "#..#", "#..#", "#..#", ".##."],
    "V": ["#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
    "X": ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    "Y": ["#.#", "#.#", ".#.", ".#.", ".#."],
    "Z": ["####", "...#", ".##.", "#...", "####"],
    "0": ["###", "#.#", "#.#", "#.#", "###"],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    "2": ["###", "..#", "###", "#..", "###"],
    "3": ["###", "..#", ".##", "..#", "###"],
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "###", "..#", "###"],
    "6": ["###", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", ".#.", ".#.", ".#."],
    "8": ["###", "#.#", "###", "#.#", "###"],
    "9": ["###", "#.#", "###", "..#", "###"],
    " ": ["..", "..", "..", "..", ".."],
    ".": [".", ".", ".", ".", "#"],
    ",": [".", ".", ".", "#", "#"],
    ":": [".", "#", ".", "#", "."],
    "/": ["..#", "..#", ".#.", "#..", "#.."],
    "+": ["...", ".#.", "###", ".#.", "..."],
    "-": ["...", "...", "###", "...", "..."],
    "%": ["#..#", "..#.", ".#..", "#..#", "...."],
    "!": ["#", "#", "#", ".", "#"],
    "?": ["###", "..#", ".##", "...", ".#."],
    "(": [".#", "#.", "#.", "#.", ".#"],
    ")": ["#.", ".#", ".#", ".#", "#."],
    "·": [".", ".", "#", ".", "."],
    "…": ["...", "...", "...", "...", "#.#"],
}
_ACENTO = {"Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ñ": "N"}
_ALTO = 5


def _glifo(ch: str):
    """Devuelve (filas, marca) donde marca = 'a' acento, 'n' tilde de ñ, None."""
    if ch in _ACENTO:
        return _G[_ACENTO[ch]], "n" if ch == "Ñ" else "a"
    return _G.get(ch, _G["?"]), None


def ancho(texto: str) -> int:
    texto = texto.upper()
    return sum(len(_glifo(ch)[0][0]) + 1 for ch in texto) - 1 if texto else 0


def texto(lienzo: np.ndarray, x: int, y: int, s: str, color: int,
          sombra: int | None = None) -> int:
    """Escribe `s` en `lienzo` (matriz de índices). (x, y) = esquina sup-izq de las
    mayúsculas. Si hay `sombra`, se dibuja primero desplazada 1 px abajo. Devuelve la x final."""
    s = s.upper()
    for pasada in ((1, 0) if sombra is not None else (0,)):
        col = sombra if pasada == 1 else color
        off = 1 if pasada == 1 else 0
        cx = x
        for ch in s:
            filas, marca = _glifo(ch)
            w = len(filas[0])
            for ry, fila in enumerate(filas):
                for rx, v in enumerate(fila):
                    if v == "#":
                        _p(lienzo, cx + rx, y + ry + off, col)
            if marca == "a":
                _p(lienzo, cx + w // 2 + 1, y - 2 + off, col)
                _p(lienzo, cx + w // 2, y - 1 + off, col)
            elif marca == "n":
                _p(lienzo, cx, y - 2 + off, col)
                _p(lienzo, cx + 2, y - 2 + off, col)
                if w > 3:
                    _p(lienzo, cx + 1, y - 3 + off, col)
            cx += w + 1
    return x + ancho(s)


def _p(lienzo, x, y, v, solo_vacio=False):
    if 0 <= y < lienzo.shape[0] and 0 <= x < lienzo.shape[1]:
        if solo_vacio and lienzo[y, x] != TRANSP:
            return
        lienzo[y, x] = v


# ---- Logotipo grande 7x9 (serif, 1x, sin escalar) ----
_L = {
    "I": ["#####", ".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###.", "#####"],
    "M": ["##...##", "##...##", "###.###", "#######", "##.#.##", "##...##", "##...##", "##...##", "##...##"],
    "P": ["#####.", "##..##", "##..##", "##..##", "#####.", "##....", "##....", "##....", "###..."],
    "E": ["######", "##....", "##....", "#####.", "##....", "##....", "##....", "##....", "######"],
    "R": ["#####.", "##..##", "##..##", "#####.", "###...", "##.##.", "##..##", "##..##", "##..##"],
    "U": ["##..##", "##..##", "##..##", "##..##", "##..##", "##..##", "##..##", "###.##", ".####."],
}


def logo(lienzo: np.ndarray, x: int, y: int, s: str, claro: int, medio: int,
         oscuro: int, contorno: int) -> int:
    """Rotulo grande con relieve dorado y contorno. Devuelve x final."""
    cx = x
    mapa = []
    for ch in s:
        filas = _L[ch]
        mapa.append((cx, filas))
        cx += len(filas[0]) + 1
    # contorno
    for gx, filas in mapa:
        for ry, fila in enumerate(filas):
            for rx, v in enumerate(fila):
                if v == "#":
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            _p(lienzo, gx + rx + dx, y + ry + dy, contorno)
    for gx, filas in mapa:
        for ry, fila in enumerate(filas):
            for rx, v in enumerate(fila):
                if v == "#":
                    col = claro if ry <= 1 else (medio if ry < 7 else oscuro)
                    _p(lienzo, gx + rx, y + ry, col)
    return cx - 1
