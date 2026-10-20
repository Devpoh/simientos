import re
a = open('animacion.py', encoding='utf-8').read()
def rep(x, y, all_=False):
    global a
    assert x in a, x
    a = a.replace(x, y) if all_ else a.replace(x, y, 1)

rep("FR = 48\nFPS = 12", '''FR = 120
FPS = 30


def ajusta(n, v):
    """Duración (en fotogramas) de cada cuadro de un ciclo de n cuadros que encaja en el bucle de FR."""
    cands = [x for x in range(1, 61) if FR % (n * x) == 0]
    return min(cands, key=lambda x: abs(x - v))''')
rep("wf = (f // anim) % 6", "wf = (f // ajusta(6, anim * 2.5)) % 6")
rep("wf = ((f + fase) // vel) % n", "wf = ((f + fase) // ajusta(n, vel * 2.5)) % n")
rep("PX.arrodillado(mujer, (f // 12) % 2, flip)", "PX.arrodillado(mujer, (f // 30) % 2, flip)")
rep("fr = (f // vel) % n", "fr = (f // ajusta(n, vel * 2.5)) % n", True)
rep("fr = ((f + fase) // vel) % 2", "fr = ((f + fase) // ajusta(2, vel * 2.5)) % 2")
rep("k = (f // 3) % 4\n    t = f / FR", "k = (f // 5) % 4\n    t = f / FR")
rep("MY.satiro(frame=(f // 4) % 2, pose=\"tocar\", voltear=True)", "MY.satiro(frame=(f // 10) % 2, pose=\"tocar\", voltear=True)")
rep("spr = fabrica((f // vel) % n)\n        gx, gy = tp(u, v)", "spr = fabrica((f // ajusta(n, vel * 2.5)) % n)\n        gx, gy = tp(u, v)")
rep("spr = spr_fn((f // vel) % n)", "spr = spr_fn((f // ajusta(n, vel * 2.5)) % n)")
rep("pegar_sobre_agua(img, e, rsp, int(round(gx - rsp.ax)), int(round(gy - rsp.ay)) + 1 + bob, f // 2)", "pegar_sobre_agua(img, e, rsp, int(round(gx - rsp.ax)), int(round(gy - rsp.ay)) + 1 + bob, f // 5)")
rep("g = PX.gaviota((f // 2 + k) % 2, flip)", "g = PX.gaviota((f // 5 + k) % 2, flip)")
rep("col = c(\"piedra\", 6) if (f // 3) % 2 == 0 else c(\"tierra\", 6)", "col = c(\"piedra\", 6) if (f // 8) % 2 == 0 else c(\"tierra\", 6)")
open('animacion.py', 'w', encoding='utf-8').write(a)

h = open('hud.py', encoding='utf-8').read()
h = h.replace("gx_ = x + 67 + int((f * 2) % (ancho + 12)) - 6", "gx_ = x + 67 + int((f * 0.8) % (ancho + 12)) - 6")
open('hud.py', 'w', encoding='utf-8').write(h)

g = open('generar.py', encoding='utf-8').read()
g = g.replace('''    ims = [a_pil_p(fr) for fr in frames]
    ruta_gif = os.path.join(SAL, "escena_animada.gif")
    ims[0].save(ruta_gif, save_all=True, append_images=ims[1:], duration=80, loop=0, optimize=False, disposal=1)
    ims[0].save(os.path.join(VIS, "escena.gif"), save_all=True, append_images=ims[1:], duration=80, loop=0, optimize=False, disposal=1)
    print("GIF", os.path.getsize(ruta_gif) // 1024, "KB", len(ims), "fotogramas", round(time.time() - t0, 1), "s")''', '''    ims = [a_pil_p(fr) for fr in frames]
    # animación fluida a 30 fps (APNG: temporización exacta en el navegador)
    ruta_fluida = os.path.join(SAL, "escena_fluida_30fps.png")
    ims[0].save(ruta_fluida, save_all=True, append_images=ims[1:], duration=1000 // AN.FPS, loop=0, format="PNG")
    ims[0].save(os.path.join(VIS, "escena_fluida.png"), save_all=True, append_images=ims[1:], duration=1000 // AN.FPS, loop=0, format="PNG")
    # GIF (entregable): cada 2.º fotograma a ~14 fps
    g_ = ims[::2]
    ruta_gif = os.path.join(SAL, "escena_animada.gif")
    g_[0].save(ruta_gif, save_all=True, append_images=g_[1:], duration=70, loop=0, optimize=False, disposal=1)
    print("GIF", os.path.getsize(ruta_gif) // 1024, "KB", len(g_), "fotogramas ·  APNG", os.path.getsize(ruta_fluida) // 1024, "KB", len(ims), "fotogramas", round(time.time() - t0, 1), "s")''')
open('generar.py', 'w', encoding='utf-8').write(g)

# servidor con manifiesto de fechas, para recargar solo lo que cambia
s = open('servir.py', encoding='utf-8').read()
s = s.replace('''class H(http.server.SimpleHTTPRequestHandler):''', '''import json


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/manifiesto.json"):
            datos = {f: int(os.path.getmtime(f) * 1000) for f in os.listdir(".") if f.lower().endswith((".png", ".gif", ".html"))}
            cuerpo = json.dumps(datos).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(cuerpo)))
            self.end_headers()
            self.wfile.write(cuerpo)
            return
        return super().do_GET()
''')
open('servir.py', 'w', encoding='utf-8').write(s)

p = open('publicar.py', encoding='utf-8').read()
p = p.replace('("escena.gif", "ESCENA ANIMADA · puerto, mercado, templo en obra", "Agua, barcos, humo, ciudadanos, animales, banderas, fuente, llamas y haz del faro."),',
              '("escena_fluida.png", "ESCENA ANIMADA (30 fps) · puerto, mercado, templo en obra", "Agua, barcos con reflejo, humo, ciudadanos, animales, banderas, fuente, llamas y haz del faro. 4 s en bucle."),')
a_ = p.index("<script>")
b_ = p.index("</script>") + len("</script>")
p = p[:a_] + '''<script>
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
</script>''' + p[b_:]
p = p.replace('<p>Última publicación: <b id="hora">{hora}</b> · el visor recarga las imágenes solo cada 4 s. Pulsa una imagen para verla a tamaño completo.</p>',
              '<p>Última publicación: <b id="hora">{hora}</b> · el visor detecta solo los cambios y recarga únicamente lo que cambió. Pulsa una imagen para verla a tamaño completo.</p>')
p = p.replace("img{{image-rendering:pixelated;display:block;max-width:100%;", "img{{image-rendering:pixelated;display:block;width:100%;max-width:1920px;")
open('publicar.py', 'w', encoding='utf-8').write(p)
print('ok')
