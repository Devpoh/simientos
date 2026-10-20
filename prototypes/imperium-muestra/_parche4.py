s = open('terreno.py', encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b, 1)

rep("CIUDAD_U1 = 24.8", "COSTA_V = 19.0           # línea del muelle (se amplió 4 tiles para ensanchar la ciudad)\nDV = COSTA_V - 15.0\nCIUDAD_U1 = 24.8")
rep("costa = 15.0 + smooth(U,", "costa = COSTA_V + smooth(U,")
rep("mole = rect(8.7, 9.7, 14.0, 18.2)", "mole = rect(8.7, 9.7, 14.0 + DV, 18.2 + DV)")
rep("roca_faro = ((U - 9.2) / 1.7) ** 2 + ((V - 18.9) / 1.35) ** 2 < 1.0", "roca_faro = ((U - 9.2) / 1.7) ** 2 + ((V - 18.9 - DV) / 1.35) ** 2 < 1.0")
rep("(((U - 9.2) / 1.1) ** 2 + ((V - 18.9) / 0.9) ** 2 < 1)", "(((U - 9.2) / 1.1) ** 2 + ((V - 18.9 - DV) / 0.9) ** 2 < 1)")
rep("isla_a = ((U - 14.5) / 3.2) ** 2 + ((V - 27.0) / 2.1) ** 2", "isla_a = ((U - 14.5) / 3.2) ** 2 + ((V - 27.0 - DV) / 2.1) ** 2")
rep("isla_b = ((U - 24.8) / 2.4) ** 2 + ((V - 25.4) / 1.7) ** 2", "isla_b = ((U - 24.8) / 2.4) ** 2 + ((V - 25.4 - DV) / 1.7) ** 2")
rep("    pier1 = rect(4.6, 5.55, 15.0, 18.4)\n    pier2 = rect(11.0, 11.95, 15.0, 18.9)\n    pier2b = rect(10.2, 12.8, 18.0, 18.9)\n    pier3 = rect(6.3, 7.1, 15.0, 17.0)\n    pier4 = rect(15.4, 16.35, 15.0, 19.2)\n    pier4b = rect(14.6, 17.6, 18.4, 19.2)\n    pier5 = rect(20.0, 20.9, 15.0, 17.6)",
    "    pier1 = rect(4.6, 5.55, 15.0 + DV, 18.4 + DV)\n    pier2 = rect(11.0, 11.95, 15.0 + DV, 18.9 + DV)\n    pier2b = rect(10.2, 12.8, 18.0 + DV, 18.9 + DV)\n    pier3 = rect(6.3, 7.1, 15.0 + DV, 17.0 + DV)\n    pier4 = rect(15.4, 16.35, 15.0 + DV, 19.2 + DV)\n    pier4b = rect(14.6, 17.6, 18.4 + DV, 19.2 + DV)\n    pier5 = rect(20.0, 20.9, 15.0 + DV, 17.6 + DV)")
rep("    ciudad = rect(0.2, CIUDAD_U1 - 0.3, 2.4, 15.0)", "    ciudad = rect(0.2, CIUDAD_U1 - 0.3, 2.4, COSTA_V)")
rep("    huerta = rect(RIO_U + 1.8, 70, 2.5, 15.0)", "    huerta = rect(RIO_U + 1.8, 70, 2.5, COSTA_V)")
rep("    en_rio = (V < 15.4)", "    en_rio = (V < COSTA_V + 0.4)")
rep("    wh_r = np.where(V < 13.4, 2.0, np.clip(2.0 - (V - 13.4) / 1.6 * 2.0, 0.0, 2.0))", "    wh_r = np.where(V < COSTA_V - 1.6, 2.0, np.clip(2.0 - (V - (COSTA_V - 1.6)) / 1.6 * 2.0, 0.0, 2.0))")
rep("    zona_muelle = (U < CIUDAD_U1 - 0.1) & (V > 12.0)", "    zona_muelle = (U < CIUDAD_U1 - 0.1) & (V > COSTA_V - 3.0)")
rep("    quay_band = (U < CIUDAD_U1 + 0.1) & (V > 13.0) & (V < 16.0)", "    quay_band = (U < CIUDAD_U1 + 0.1) & (V > COSTA_V - 2.0) & (V < COSTA_V + 1.0)")
rep("    MAT[quay_band & (V > 14.0) & tierra] = M_LOSA", "    MAT[quay_band & (V > COSTA_V - 1.0) & tierra] = M_LOSA")
open('terreno.py', 'w', encoding='utf-8').write(s)
print('terreno ok')
