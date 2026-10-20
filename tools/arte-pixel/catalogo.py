"""Catálogo de sprites de producción: qué se exporta al atlas y con qué metadatos.

Cada `Entrada` es un sprite lógico del juego (un edificio, un oficio, un árbol…). Sus `estados`
son animaciones o etapas de obra; cada estado tiene fotogramas por orientación.

Orientaciones (convención del juego):
  se, sw, ne, nw : ciudadanos (frente / frente volteado / espaldas / espaldas volteado).
                   Animales y criaturas solo traen se (mira a la derecha) y sw (a la izquierda).
  u, v           : eje del sprite en la rejilla isométrica (cumbrera de la casa, eslora del barco, valla).
  unica          : no hay variantes de orientación.
Una orientación puede ser un alias de otra del mismo estado (se guarda un único fotograma).

Ancla: píxel del sprite que se coloca sobre el suelo. Pies para lo puntual; centro de la huella
para lo que ocupa tiles. Se calcula desde `centro` = (u, v) en píxeles de suelo (1 tile = 16).
"""
from dataclasses import dataclass, field
from typing import Union
import numpy as np

import personajes as PE
import personajes_extra as PX
import mitologicos as MY
import animales as AN
import arboles as AR
import props as PR
import barcos as BA
import edificios as ED
import edificios2 as E2
import obra_casa as OB
import templo as TP
from iso import Spr

TILE = 16  # píxeles de suelo por tile (el tile en pantalla es 32x16)

Orient = dict  # orientación -> lista de Spr, o str (alias de otra orientación)


@dataclass
class Estado:
    fps: int
    orientaciones: dict


@dataclass
class Entrada:
    id: str
    categoria: str                      # ciudadano | criatura | animal | arbol | roca | prop | estructura | barco | ambiente
    huella: tuple                       # (w, d) en tiles
    estados: dict                       # nombre -> Estado
    bloquea: bool = False               # la huella bloquea el paso (R50)
    centro: Union[tuple, dict] = (0, 0)  # (u, v) de suelo del ancla; dict por orientación si cambia
    recortar: bool = False              # recortar al contenido (estructuras, props, barcos)
    puertas: list = field(default_factory=list)
    etapas: list = field(default_factory=list)  # nombres de estado en orden de obra
    huella_obra: dict = field(default_factory=dict)  # etapa -> {u0,v0,u1,v1} en subceldas: huella + lo que sobresale (andamio, material)
    puntos: dict = field(default_factory=dict)  # nombre de punto -> función(Spr) -> (x, y)


def _est(fps, **ori):
    return Estado(fps, ori)


def _cuatro(fn, n):
    """Ciudadano en 4 orientaciones. fn(frame, espaldas, voltear) -> Spr."""
    return {
        "se": [fn(f, False, False) for f in range(n)],
        "sw": [fn(f, False, True) for f in range(n)],
        "ne": [fn(f, True, False) for f in range(n)],
        "nw": [fn(f, True, True) for f in range(n)],
    }


def _dos(fn, n):
    """Animal o criatura: mira a la derecha (se) o a la izquierda (sw)."""
    return {"se": [fn(f, False) for f in range(n)], "sw": [fn(f, True) for f in range(n)]}


# ------------------------------------------------------------------ ciudadanos
GENEROS = {"h": False, "m": True}
TRABAJO = {"campesino": ("cultivar", 4, 6), "artesano": ("martillar", 4, 8), "comerciante": ("comerciar", 4, 4)}
CARGAS = ("saco", "anfora", "cesta", "caja")
CARGAN = ("campesino", "artesano", "comerciante")


def ciudadanos() -> list:
    out = []
    for tipo in PE.TIPOS:
        for g, mujer in GENEROS.items():
            est = {
                "idle": Estado(0, _cuatro(lambda f, e, v: PE.persona(tipo, 0, "idle", espaldas=e, voltear=v, mujer=mujer), 1)),
                "caminar": Estado(10, _cuatro(lambda f, e, v: PE.persona(tipo, f, "caminar", espaldas=e, voltear=v, mujer=mujer), 6)),
            }
            if tipo in TRABAJO:
                pose, n, fps = TRABAJO[tipo]
                est[pose] = Estado(fps, _cuatro(lambda f, e, v: PE.persona(tipo, f, pose, espaldas=e, voltear=v, mujer=mujer), n))
            if tipo in CARGAN:
                for carga in CARGAS:
                    est["cargar_" + carga] = Estado(10, _cuatro(
                        lambda f, e, v: PX.cargando(tipo, f, carga, mujer=mujer, voltear=v, espaldas=e), 6))
            if tipo == "sacerdote":
                est["rezar"] = Estado(2, _dos(lambda f, v: PX.arrodillado(mujer, f, v), 2))
            out.append(Entrada(f"ciudadano_{tipo}_{g}", "ciudadano", (1, 1), est))
    return out


# ------------------------------------------------------------------ criaturas y animales
def criaturas() -> list:
    return [
        Entrada("criatura_minotauro", "criatura", (1, 1), {
            "idle": Estado(0, _dos(lambda f, v: MY.minotauro(0, "idle", voltear=v), 1)),
            "caminar": Estado(8, _dos(lambda f, v: MY.minotauro(f, "caminar", voltear=v), 4)),
            "cargar": Estado(8, _dos(lambda f, v: MY.minotauro(f, "caminar", carga=True, voltear=v), 4)),
        }),
        Entrada("criatura_centauro", "criatura", (1, 1), {
            "idle": Estado(0, _dos(lambda f, v: MY.centauro(0, "idle", voltear=v), 1)),
            "caminar": Estado(8, _dos(lambda f, v: MY.centauro(f, "caminar", voltear=v), 4)),
        }),
        Entrada("criatura_satiro", "criatura", (1, 1), {
            "idle": Estado(0, _dos(lambda f, v: MY.satiro(0, "idle", voltear=v), 1)),
            "tocar": Estado(3, _dos(lambda f, v: MY.satiro(f, "tocar", voltear=v), 2)),
            "caminar": Estado(8, _dos(lambda f, v: MY.satiro(f, "caminar", voltear=v), 6)),
        }),
    ]


def animales() -> list:
    out = []
    for oscura in (False, True):
        out.append(Entrada("animal_oveja" + ("_oscura" if oscura else ""), "animal", (1, 1), {
            "pastar": Estado(2, _dos(lambda f, v: AN.oveja(f, "pastar", voltear=v, oscura=oscura), 2)),
            "caminar": Estado(6, _dos(lambda f, v: AN.oveja(f, "caminar", voltear=v, oscura=oscura), 4)),
        }))
    out.append(Entrada("animal_vaca", "animal", (1, 1), {
        "pastar": Estado(2, _dos(lambda f, v: AN.vaca(f, "pastar", voltear=v), 2)),
        "caminar": Estado(6, _dos(lambda f, v: AN.vaca(f, "caminar", voltear=v), 4)),
    }))
    for capa in ("castano", "blanco", "negro", "palomino"):
        out.append(Entrada("animal_caballo_" + capa, "animal", (1, 1), {
            "pastar": Estado(2, _dos(lambda f, v: AN.caballo(f, "pastar", voltear=v, capa=capa), 2)),
            "caminar": Estado(6, _dos(lambda f, v: AN.caballo(f, "caminar", voltear=v, capa=capa), 4)),
        }))
    for tipo in ("blanca", "parda"):
        out.append(Entrada("animal_gallina_" + tipo, "animal", (1, 1), {
            "picotear": Estado(3, _dos(lambda f, v: AN.gallina(f, "picotear", voltear=v, tipo=tipo), 2)),
        }))
    return out


def ambiente() -> list:
    return [Entrada("ambiente_gaviota", "ambiente", (1, 1), {
        "volar": Estado(6, _dos(lambda f, v: PX.gaviota(f, v), 2)),
    })]


# ------------------------------------------------------------------ vegetación y rocas
def vegetacion() -> list:
    out = []
    arboles = (("cipres", AR.ciprés), ("pino", AR.pino), ("encina", AR.encina), ("olivo", AR.olivo))
    for nombre, fn in arboles:
        for sd in (1, 2, 3, 4):
            out.append(Entrada(f"arbol_{nombre}_{sd}", "arbol", (1, 1),
                               {"base": Estado(0, {"unica": [fn(sd)]})}, bloquea=True, recortar=True))
    for sd in (1, 2, 3):
        out.append(Entrada(f"arbusto_{sd}", "arbusto", (1, 1),
                           {"base": Estado(0, {"unica": [AR.arbusto(sd, 0.9 + 0.2 * sd)]})}, recortar=True))
    for sd in (1, 2, 3, 4):
        out.append(Entrada(f"roca_{sd}", "roca", (1, 1),
                           {"base": Estado(0, {"unica": [AR.roca(sd, 1.0)]})}, bloquea=True, recortar=True))
    for sd in (5, 6):
        out.append(Entrada(f"roca_grande_{sd}", "roca", (2, 1),
                           {"base": Estado(0, {"unica": [AR.roca(sd, 1.7)]})}, bloquea=True, recortar=True))
    return out


# ------------------------------------------------------------------ props
def props() -> list:
    out = []
    for sd in (1, 2, 3, 4):
        out.append(Entrada(f"prop_caja_{sd}", "prop", (1, 1),
                           {"base": Estado(0, {"unica": [PR.caja_madera(sd)]})},
                           bloquea=True, centro=(6, 5), recortar=True))
    out.append(Entrada("prop_barril", "prop", (1, 1), {"base": Estado(0, {"unica": [PR.barril()]})}, bloquea=True, recortar=True))
    out.append(Entrada("prop_saco_trigo", "prop", (1, 1), {"base": Estado(0, {"unica": [PR.saco()]})}, recortar=True))
    out.append(Entrada("prop_saco_harina", "prop", (1, 1),
                       {"base": Estado(0, {"unica": [PR.saco(color=("tierra", 3))]})}, recortar=True))
    out.append(Entrada("prop_fardo", "prop", (1, 1), {"base": Estado(0, {"unica": [PR.fardo()]})},
                       bloquea=True, centro=(7, 5), recortar=True))
    out.append(Entrada("prop_lena", "prop", (1, 1), {"base": Estado(0, {"unica": [PR.lena()]})}, bloquea=True, recortar=True))
    for carga in ("heno", "marmol"):
        out.append(Entrada(f"prop_carreta_{carga}", "prop", (2, 1),
                           {"base": Estado(0, {"unica": [PR.carreta(carga)]})},
                           bloquea=True, centro=(15, 7), recortar=True))
    out.append(Entrada("prop_pozo", "prop", (1, 1), {"base": Estado(0, {"unica": [PR.pozo()]})},
                       bloquea=True, centro=(10, 10), recortar=True,
                       puertas=[{"i": 0, "j": 1, "lado": "v+"}]))
    out.append(Entrada("prop_fuente", "prop", (2, 2),
                       {"agua": Estado(4, {"unica": [PR.fuente(f) for f in range(3)]})},
                       bloquea=True, centro=(17, 17), recortar=True))
    out.append(Entrada("prop_brasero", "prop", (1, 1),
                       {"fuego": Estado(8, {"unica": [PR.brasero(f) for f in range(3)]})}, bloquea=True, recortar=True))
    out.append(Entrada("prop_estandarte", "prop", (1, 1),
                       {"ondear": Estado(6, {"unica": [PR.estandarte(f) for f in range(4)]})}, bloquea=True, recortar=True))
    for largo in (16, 32, 48):
        n = largo // TILE
        out.append(Entrada(f"prop_valla_{n}", "prop", (n, 1),
                           {"base": Estado(0, {"u": [PR.valla(largo, "u").recortar()], "v": [PR.valla(largo, "v").recortar()]})},
                           bloquea=True, centro={"u": (largo / 2, 0), "v": (0, largo / 2)}))
    return out


# ------------------------------------------------------------------ estructuras
CASAS_2X2 = {
    "a": dict(seed=3),
    "b": dict(pared="piedra", t_lit=5.0, seed=11, postigo="teja"),
    "c": dict(pared="tierra", t_lit=3.9, teja_t=3.3, seed=17, postigo="hierba"),
    "d": dict(pared="tierra", t_lit=4.6, seed=13, postigo="azul"),
}
CASAS_3X2 = {
    "a": dict(pared="tierra", t_lit=3.9, teja_t=3.3, seed=41, postigo="hierba"),
    "b": dict(pared="tierra", t_lit=4.0, teja_t=3.2, seed=47, postigo="hierba"),
}


CON_OBRA = {(2, 2, "a")}      # variantes con las 6 etapas de obra (obra_casa.py)


def _casa(w, d, eje, kw):
    return ED.casa(w, d, eje=eje, **kw)


def _punto_chimenea(spr) -> tuple:
    u, v, z = spr.chimenea
    x, y = spr.P(u, v, z)
    return int(round(x)), int(round(y))


def estructuras() -> list:
    out = []
    # Viviendas: las variantes con obra (R22) llevan 6 etapas: 1 replanteo, 2 preparación, 3 cimientos, 4 estructura,
    # 5 cubierta, 6 terminada. Las demás solo la casa terminada (etapa3, pendiente de unificar nombres).
    for w, d, tabla in ((2, 2, CASAS_2X2), (3, 2, CASAS_3X2)):
        for var, kw in tabla.items():
            est = {}
            etapas = []
            huella_obra = {}
            if (w, d, var) in CON_OBRA:
                for n, o in OB.etapas_casa(w, d, kw).items():
                    est[f"etapa{n}"] = Estado(0, o["orient"])
                    huella_obra[f"etapa{n}"] = o["huella"]
                    etapas.append(f"etapa{n}")
                final = "etapa6"
            else:
                final = "etapa3"
            est[final] = Estado(0, {"u": [_casa(w, d, "u", kw)], "v": [_casa(w, d, "v", kw)]})
            etapas.append(final)
            out.append(Entrada(f"casa_{w}x{d}_{var}", "estructura", (w, d), est, bloquea=True,
                               centro=(w * 8, d * 8), recortar=True, etapas=etapas, huella_obra=huella_obra,
                               puertas=[{"i": 0, "j": d, "lado": "v+"}], puntos={"chimenea": _punto_chimenea}))
    # Templo de Júpiter: tres etapas (solar / obra / terminado).
    out.append(Entrada("templo_jupiter", "estructura", (5, 5),
                       {f"etapa{e}": Estado(0, {"unica": [TP.templo(e).recortar()]}) for e in (1, 2, 3)},
                       bloquea=True, centro=(40, 40), recortar=True, etapas=["etapa1", "etapa2", "etapa3"],
                       puertas=[{"i": 2, "j": 5, "lado": "v+"}]))
    # Puestos de mercado (huella 2x1, el mostrador mira a v+).
    puestos = {
        "fruta": dict(color=("teja", 3.4), color2=("piedra", 5.0), bienes="fruta", seed=1),
        "telas": dict(color=("azul", 1.8), color2=("piedra", 5.0), bienes="telas", seed=2),
        "ceramica": dict(color=("hierba", 3.2), color2=("piedra", 5.0), bienes="ceramica", seed=4),
        "pan": dict(color=("tierra", 4.0), color2=("piedra", 5.0), bienes="pan", seed=3),
        "pescado": dict(color=("carmesi", 1.6), color2=("tierra", 5.0), bienes="pescado", seed=5),
    }
    for nombre, kw in puestos.items():
        out.append(Entrada(f"puesto_{nombre}", "estructura", (2, 1),
                           {"base": Estado(0, {"unica": [E2.puesto(**kw).recortar()]})},
                           bloquea=True, centro=(16, 8), recortar=True,
                           puertas=[{"i": 0, "j": 1, "lado": "v+"}, {"i": 1, "j": 1, "lado": "v+"}]))
    out.append(Entrada("torre", "estructura", (2, 2), {"base": Estado(0, {"unica": [E2.torre().recortar()]})},
                       bloquea=True, centro=(16, 16), recortar=True))
    out.append(Entrada("faro", "estructura", (1, 1), {"base": Estado(0, {"unica": [E2.faro().recortar()]})},
                       bloquea=True, recortar=True))
    out.append(Entrada("puente_piedra", "estructura", (4, 2), {"base": Estado(0, {"unica": [E2.puente().recortar()]})},
                       bloquea=False, centro=(32, 11), recortar=True))
    return out


# ------------------------------------------------------------------ barcos
def barcos() -> list:
    def ori(fn, **kw):
        return {"u": [fn("u", **kw)], "v": [fn("v", **kw)]}
    L = {"galera": 60, "mercante": 46, "pesquero": 30}
    cu = lambda eslora: {"u": (eslora / 2, 0), "v": (0, eslora / 2)}  # noqa: E731
    out = []
    out.append(Entrada("barco_galera", "barco", (4, 1), {
        "navegar": Estado(4, {"u": [BA.galera("u", fase=k * np.pi / 2) for k in range(4)],
                              "v": [BA.galera("v", fase=k * np.pi / 2) for k in range(4)]}),
    }, centro=cu(L["galera"]), recortar=True))
    out.append(Entrada("barco_mercante", "barco", (3, 1), {"navegar": Estado(0, ori(BA.mercante))},
                       centro=cu(L["mercante"]), recortar=True))
    out.append(Entrada("barco_pesquero", "barco", (2, 1), {"navegar": Estado(0, ori(BA.pesquero))},
                       centro=cu(L["pesquero"]), recortar=True))
    return out


def todo() -> list:
    return ciudadanos() + criaturas() + animales() + ambiente() + vegetacion() + props() + estructuras() + barcos()
