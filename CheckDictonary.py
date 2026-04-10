from collections import Counter

# === CONFIGURACIÓN ===
ARCHIVO_ENTRADA = "Spanish.txt"
ARCHIVO_SALIDA  = "Spanish_limpio.txt"

COMODINES = 2
FICHAS = {
    'A': 9,  'B': 2,  'C': 2,  'D': 3,  'E': 15,
    'F': 2,  'G': 2,  'H': 2,  'I': 8,  'J': 1,
    'K': 1,  'L': 5,  'M': 3,  'N': 6,  'O': 6,
    'P': 3,  'Q': 1,  'R': 6,  'S': 6,  'T': 6,
    'U': 6,  'V': 2,  'W': 1,  'X': 1,  'Y': 1,
    'Z': 1,
}

def palabra_es_posible(palabra, fichas, comodines):
    conteo = Counter(palabra.upper())
    comodines_usados = 0
    for letra, cantidad in conteo.items():
        faltantes = max(0, cantidad - fichas.get(letra, 0))
        comodines_usados += faltantes
        if comodines_usados > comodines:
            return False
    return True

with open(ARCHIVO_ENTRADA, "r", encoding="utf-8") as f:
    palabras = [linea.strip() for linea in f if linea.strip()]

total_original = len(palabras)

duplicados      = []
con_espacios    = []
elim_fichas     = []
validas_set     = set()
validas         = []

for palabra in palabras:
    # Tiene más de un espacio consecutivo o más de una palabra
    if "  " in palabra or palabra.count(" ") > 1:
        con_espacios.append(palabra)
        continue

    # Duplicado (case insensitive)
    if palabra.lower() in validas_set:
        duplicados.append(palabra)
        continue

    # No cabe en las fichas de Scrabble
    if not palabra_es_posible(palabra, FICHAS, COMODINES):
        elim_fichas.append(palabra)
        continue

    validas_set.add(palabra.lower())
    validas.append(palabra)

# === RESUMEN ===
print("=" * 50)
print(f"  📖 Total original:           {total_original}")
print(f"  ❌ Con espacios múltiples:   {len(con_espacios)}")
print(f"  ❌ Duplicados:               {len(duplicados)}")
print(f"  ❌ No caben en fichas:       {len(elim_fichas)}")
print(f"  ✅ Quedaron:                 {len(validas)}")
print("=" * 50)

print(f"\n🔍 CON ESPACIOS MÚLTIPLES — {len(con_espacios)} palabras")
for p in con_espacios:
    print(f"  - '{p}'")

print(f"\n🔍 DUPLICADOS — {len(duplicados)} palabras")
for p in duplicados:
    print(f"  - {p}")

print(f"\n🔍 NO CABEN EN FICHAS — {len(elim_fichas)} palabras")
for p in elim_fichas:
    conteo = Counter(p.upper())
    faltantes = {l: conteo[l] - FICHAS.get(l, 0)
                 for l in conteo if conteo[l] > FICHAS.get(l, 0)}
    print(f"  - {p:25} | le faltan: {faltantes}")

# === GUARDAR ===
try:
    with open(ARCHIVO_SALIDA, "w", encoding="utf-8") as f:
        f.write("\n".join(validas))
    with open(ARCHIVO_SALIDA, "r", encoding="utf-8") as f:
        guardadas = sum(1 for l in f if l.strip())
    print(f"\n✅ Guardado en '{ARCHIVO_SALIDA}' — {guardadas} palabras verificadas")
except Exception as e:
    print(f"\n⚠️  Error al guardar: {e}")

# === RESUMEN ===
print("=" * 50)
print(f"  📖 Total original:           {total_original}")
print(f"  ❌ Con espacios múltiples:   {len(con_espacios)}")
print(f"  ❌ Duplicados:               {len(duplicados)}")
print(f"  ❌ No caben en fichas:       {len(elim_fichas)}")
print(f"  ✅ Quedaron:                 {len(validas)}")
print("=" * 50)