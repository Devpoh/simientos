import re
s = open('terreno.py', encoding='utf-8').read()

def rep(a, b, count=1):
    global s
    assert a in s, a
    s = s.replace(a, b) if count == 0 else s.replace(a, b, count)

rep("GW, GH = 480, 352        # mapa de suelo\nSW, SH = 480, 270        # pantalla\nOX, OY = 240, 0",
    "GW, GH = 960, 680        # mapa de suelo\nSW, SH = 960, 540        # pantalla (resolución base ampliada a petición del usuario)\nOX, OY = 336, 60\n\n# ---- geografía (en tiles)\nCIUDAD_U1 = 24.8         # extremo este de la ciudad (río a su lado)\nRIO_U = 26.0             # eje base del río")
rep("    return 14.8 + 0.85 * np.sin(0.6 * v + 0.9) + 0.35 * np.sin(1.7 * v)", "    return RIO_U + 0.85 * np.sin(0.6 * v + 0.9) + 0.35 * np.sin(1.7 * v)")
rep("costa = 15.0 + smooth(U, 12.6, 14.8) * (n_a - 0.5) * 3.4", "costa = 15.0 + smooth(U, CIUDAD_U1 - 0.2, CIUDAD_U1 + 2.2) * (n_a - 0.5) * 3.4")
rep("    pier1 = rect(4.6, 5.55, 15.0, 18.4)\n    pier2 = rect(11.0, 11.95, 15.0, 18.9)\n    pier2b = rect(10.2, 12.8, 18.0, 18.9)\n    pier3 = rect(6.3, 7.1, 15.0, 17.0)\n    pier = pier1 | pier2 | pier2b | pier3",
    "    pier1 = rect(4.6, 5.55, 15.0, 18.4)\n    pier2 = rect(11.0, 11.95, 15.0, 18.9)\n    pier2b = rect(10.2, 12.8, 18.0, 18.9)\n    pier3 = rect(6.3, 7.1, 15.0, 17.0)\n    pier4 = rect(15.4, 16.35, 15.0, 19.2)\n    pier4b = rect(14.6, 17.6, 18.4, 19.2)\n    pier5 = rect(20.0, 20.9, 15.0, 17.6)\n    pier = pier1 | pier2 | pier2b | pier3 | pier4 | pier4b | pier5")
rep("    cima = np.exp(-(((U - 9.0) ** 2 + (V + 6.5) ** 2) / 22.0)) * 52.0\n    cima2 = np.exp(-(((U - 19.0) ** 2 + (V + 3.0) ** 2) / 20.0)) * 44.0",
    "    cima = np.exp(-(((U - 15.0) ** 2 + (V + 7.5) ** 2) / 30.0)) * 56.0\n    cima2 = np.exp(-(((U - 38.0) ** 2 + (V + 4.0) ** 2) / 36.0)) * 48.0\n    cima3 = np.exp(-(((U + 4.0) ** 2 + (V - 4.0) ** 2) / 30.0)) * 34.0")
rep("mont = np.maximum(mont, np.maximum(cima, cima2) * (0.55 + 0.7 * n_c))", "mont = np.maximum(mont, np.maximum(np.maximum(cima, cima2), cima3) * (0.55 + 0.7 * n_c))")
rep("    ciudad = rect(0.2, 13.5, 2.4, 15.0)", "    ciudad = rect(0.2, CIUDAD_U1 - 0.3, 2.4, 15.0)")
rep("    huerta = rect(15.6, 40, 2.5, 15.0)", "    huerta = rect(RIO_U + 1.8, 70, 2.5, 15.0)")
rep("    zona_muelle = (U < 13.5) & (V > 12.0)", "    zona_muelle = (U < CIUDAD_U1 - 0.1) & (V > 12.0)")
rep("    muralla = rect(2.0, 12.6, 1.55, 2.05)", "    muralla = rect(2.0, CIUDAD_U1 - 0.6, 1.55, 2.05)")
rep("    abertura = rect(6.1, 7.7, 1.2, 2.4)", "    abertura = rect(8.0, 9.5, 1.2, 2.4)")
rep("    quay_band = (U < 13.7) & (V > 13.0) & (V < 16.0)", "    quay_band = (U < CIUDAD_U1 + 0.1) & (V > 13.0) & (V < 16.0)")
open('terreno.py', 'w', encoding='utf-8').write(s)

# rejilla y render: dimensiones desde terreno
r = open('rejilla.py', encoding='utf-8').read()
r = r.replace("0 <= x < 480 and 0 <= sy < 270", "0 <= x < T.SW and 0 <= sy < T.SH")
r = r.replace("for u in range(-8, 40, paso):\n        for v in range(-12, 30, paso):", "for u in range(-20, 60, paso):\n        for v in range(-20, 50, paso):")
open('rejilla.py', 'w', encoding='utf-8').write(r)
print("ok")
