s = open('terreno.py', encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b, 1)

rep("OX, OY = 336, 60", "OX, OY = 320, 120")
# islotes rocosos con pinos en el mar vacío
rep("    tierra = tierra | mole | roca_faro",
    "    isla_a = ((U - 14.5) / 3.2) ** 2 + ((V - 27.0) / 2.1) ** 2 < 1.0 + (n_b - 0.5) * 0.6\n"
    "    isla_b = ((U - 24.8) / 2.4) ** 2 + ((V - 25.4) / 1.7) ** 2 < 1.0 + (n_b - 0.5) * 0.6\n"
    "    islas = isla_a | isla_b\n"
    "    tierra = tierra | mole | roca_faro | islas")
rep("    m.mole, m.roca_faro = mole, roca_faro", "    m.mole, m.roca_faro, m.islas = mole, roca_faro, islas")
open('terreno.py', 'w', encoding='utf-8').write(s)

# render: trigo con más color y mar con corrientes de gran escala
r = open('render.py', encoding='utf-8').read()
a = "        t = np.where(ph < 1.0, 5.6, np.where(ph < 3.0, 4.6, 3.1)) + base * 0.55"
assert a in r
r = r.replace(a, "        t = np.where(ph < 1.0, 4.9, np.where(ph < 3.0, 3.9, 2.4)) + base * 0.5")
a = "    tw = tw + 0.30 * np.sin((gx * 0.30 + gy * 0.70) * 0.55 + ph) * (d > 3)"
assert a in r
r = r.replace(a, a + "\n    tw = tw + (fbm(gx * 0.018, gy * 0.036, 3, 77) - 0.5) * 1.7 * (d > 8) + 0.35 * np.sin(gx * 0.011 + gy * 0.021 + ph * 0.25) * (d > 8)")
a = "    env = 0.004 + 0.010 * (1 - gx / float(SW))"
assert a in r
r = r.replace(a, "    env = (0.004 + 0.010 * (1 - gx / float(SW))) * (0.25 + 1.6 * fbm(gx * 0.03, gy * 0.06, 2, 81))")
open('render.py', 'w', encoding='utf-8').write(r)

f = open('escena_final.py', encoding='utf-8').read()
def repf(a, b):
    global f
    assert a in f, a
    f = f.replace(a, b, 1)

# casas del oeste: más separadas para que se vean las calles
repf('''    casa(1.0, 3.5, eje="u", seed=3)
    e.en_tile(E2.solar_casa(), 1.0, 6.5, 2, 2, nombre="solar")
    casa(1.0, 9.6, eje="u", pared="piedra", t_lit=5.0, seed=11, postigo="teja")
    casa(1.0, 12.2, eje="v", pared="tierra", t_lit=3.9, teja_t=3.3, seed=17, postigo="hierba")
    e.en_tile(E2.casa_obra(), 4.9, 3.4, 2, 2, alto_sombra=26, nombre="casa_obra")
    casa(4.9, 6.4, eje="v", pared="tierra", t_lit=4.2, teja_t=3.5, seed=7, postigo="hierba")
    casa(4.9, 9.5, eje="v", pared="tierra", t_lit=4.6, seed=13, postigo="azul")
    casa(4.9, 12.3, eje="u", pared="piedra", t_lit=4.7, teja_t=3.9, seed=19, postigo="azul")''',
'''    casa(0.4, 2.9, eje="u", seed=3)
    e.en_tile(E2.solar_casa(), 0.4, 6.2, 2, 2, nombre="solar")
    casa(0.4, 9.5, eje="u", pared="piedra", t_lit=5.0, seed=11, postigo="teja")
    casa(0.4, 12.6, eje="v", pared="tierra", t_lit=3.9, teja_t=3.3, seed=17, postigo="hierba")
    e.en_tile(E2.casa_obra(), 5.2, 2.9, 2, 2, alto_sombra=26, nombre="casa_obra")
    casa(5.2, 6.2, eje="v", pared="tierra", t_lit=4.2, teja_t=3.5, seed=7, postigo="hierba")
    casa(5.2, 9.5, eje="v", pared="tierra", t_lit=4.6, seed=13, postigo="azul")
    casa(5.2, 12.6, eje="u", pared="piedra", t_lit=4.7, teja_t=3.9, seed=19, postigo="azul")''')

# caché de árboles (antes se creaba cada sprite desde cero)
repf('''            t = rng.choice(len(fabricas), p=pesos)
            spr = fabricas[t](int(rng.integers(1, 40)))''', '''            t = rng.choice(len(fabricas), p=pesos)
            clave = (id(fabricas[t]), int(rng.integers(1, 7)))
            if clave not in cache:
                cache[clave] = fabricas[t](clave[1] * 5 + 1)
            spr = cache[clave]''')
repf("    pos = []\n", "    pos = []\n    cache = {}\n")
# islas: pinos y rocas
repf('''    plantar(60, colina | oeste | zona_pueblo | zona_este,''', '''    plantar(14, m.islas, [A.pino, A.ciprés, A.olivo], [0.5, 0.3, 0.2], minimo=8)
    plantar(8, m.islas, [lambda s: A.roca(s, 0.8 + 0.8 * rng.random())], [1.0], minimo=7, nombre="deco", blob=False)
    plantar(60, colina | oeste | zona_pueblo | zona_este,''')
# rocas al pie del faro
repf("    # ---------------- granja de la orilla este", '''    for (du, dv, tam, sd) in ((-0.5, 0.2, 1.3, 3), (0.5, 0.5, 1.0, 4), (-0.2, 0.7, 0.9, 5), (0.7, -0.1, 1.2, 6)):
        gx2, gy2 = tp(9.25 + du, 18.45 + dv)
        o = Objeto(A.roca(sd, tam), gx2, gy2, float(m.Hs[int(gy2), int(gx2)]), gy2 + 12, True, "roca_faro")
        e.obj.append(o)
    # ---------------- granja de la orilla este''')
open('escena_final.py', 'w', encoding='utf-8').write(f)
print("ok")
