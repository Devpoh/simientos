"""Regenera vista/index.html con todas las imágenes de vista/ (orden y textos en ORDEN).

El visor recarga cada imagen solo (con un parámetro nuevo cada 4 s) para saltarse la caché,
y muestra la hora de la última publicación."""
import os, time

ORDEN = [
    ("escena_fluida.png", "ESCENA ANIMADA (30 fps) · puerto, mercado, templo en obra", "Agua, barcos con reflejo, humo, ciudadanos, animales, banderas, fuente, llamas y haz del faro. 4 s en bucle."),
    ("escena.png", "Escena (fotograma estático)", "Resolución base 960×540 mostrada ampliada."),
    ("hoja_sprites.png", "HOJA DE SPRITES · ciudadanos (hombre y mujer), templo y casa en 3 etapas, animales y criaturas", "Entregable 2."),
    ("paleta.png", "PALETA · 59 colores en rampas de oscuro a claro", "Entregable 3 (hexadecimal en salida/paleta.txt)."),
    ("templo_etapas.png", "Templo de Júpiter 5×5 · terreno / obra / terminado", "Mismo generador en tres etapas."),
    ("ciudadanos.png", "Ciudadanos 16×24 · 5 oficios, hombres y mujeres", "Idle + 6 fotogramas de caminar + de espaldas."),
    ("edificios2.png", "Mercado, faro, puente, torre y etapas de la casa", "Puestos con toldos, faro con linterna, puente de dos arcos, torre y casa en solar / obra / terminada."),
    ("props.png", "Mobiliario y ambiente", "Cajas, barriles, sacos, heno, carretas, pozo, fuente, brasero, valla, estandarte, leña."),
    ("mitologicos.png", "Criaturas mitológicas · minotauro, centauro, sátiro", "Versión original restaurada a petición del usuario."),
    ("animales.png", "Animales de granja · oveja, vaca, caballo, gallina", "Pastando, caminando y con variantes de pelaje."),
    ("barcos.png", "Barcos · galera, nave mercante, pesquero", "Dos orientaciones isométricas."),
    ("arboles.png", "Vegetación y rocas", "Ciprés, pino parasol, encina, olivo, arbustos y rocas."),
    ("casas.png", "Casas (2×2 y 3×2)", "Tejas individuales, estuco con desconchones, postigos."),
]


def main():
    d = os.path.join(os.path.dirname(__file__), "vista")
    existentes = set(f for f in os.listdir(d) if f.lower().endswith((".png", ".gif")) and not f.startswith("_"))
    items = [o for o in ORDEN if o[0] in existentes]
    resto = sorted(existentes - {o[0] for o in ORDEN})
    items += [(f, f, "") for f in resto]
    bloques = []
    for f, t, n in items:
        bloques.append(f'<section><h2>{t}</h2><p>{n}</p><a href="{f}" target="_blank"><img class="r" data-src="{f}" src="{f}?v={int(time.time())}"></a></section>')
    hora = time.strftime("%H:%M:%S")
    html = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>IMPERIUM · muestra pixel art (en progreso)</title>
<style>
body{{margin:0;background:#0f1424;color:#e8dfca;font:14px system-ui,sans-serif;padding:16px 20px}}
h1{{font-size:18px;color:#e4be7a;margin:0 0 4px}}h2{{font-size:14px;color:#e4be7a;margin:22px 0 2px}}
p{{margin:0 0 8px;color:#9a97a4;max-width:960px}} #hora{{color:#7ad9a0}}
img{{image-rendering:pixelated;display:block;width:100%;max-width:1920px;border:1px solid #2a2840;background:#1b2a44}}
</style></head><body>
<h1>IMPERIUM · muestra de pixel art (trabajo en curso)</h1>
<p>Última publicación: <b id="hora">{hora}</b> · el visor detecta solo los cambios y recarga únicamente lo que cambió. Pulsa una imagen para verla a tamaño completo.</p>
{''.join(bloques)}
<script>
// Recarga SOLO lo que cambió en disco (así las animaciones no se reinician cada pocos segundos).
var versiones = {{}};
function revisar(){{
  fetch('manifiesto.json?x=' + Date.now(), {{cache:'no-store'}}).then(function(r){{return r.json();}}).then(function(m){{
    if (versiones['index.html'] && m['index.html'] !== versiones['index.html']) {{ location.reload(); return; }}
    versiones['index.html'] = m['index.html'];
    document.querySelectorAll('img.r').forEach(function(im){{
      var f = im.dataset.src;
      if (m[f] && versiones[f] !== m[f]) {{ versiones[f] = m[f]; im.src = f + '?m=' + m[f]; }}
    }});
  }}).catch(function(){{}});
}}
setInterval(revisar, 2500); revisar();
</script>
</body></html>"""
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(html)
    print("publicadas:", [i[0] for i in items])


if __name__ == "__main__":
    main()
