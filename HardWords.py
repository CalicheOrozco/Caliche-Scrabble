# ============================================================
# Filtro de palabras Scrabble con letras: K, W, X, Y, Z, J, Q, V
# ============================================================

# --- Archivos de entrada ---
ARCHIVO_ESPAÑOL  = "Spanish.txt"
ARCHIVO_INGLES   = "English.txt"

# --- Archivo de salida ---
ARCHIVO_SALIDA   = "palabras_especiales.txt"

# --- Letras a buscar ---
LETRAS_ESPECIALES = set("KWXYZJQV")


def cargar_palabras(ruta: str) -> list[str]:
    """Lee un archivo .txt y devuelve una lista de palabras limpias."""
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            palabras = [linea.strip() for linea in f if linea.strip()]
        print(f"  ✔ '{ruta}' cargado — {len(palabras):,} palabras")
        return palabras
    except FileNotFoundError:
        print(f"  ✘ Archivo no encontrado: '{ruta}' — se omite.")
        return []


def contiene_letra_especial(palabra: str) -> bool:
    """Devuelve True si la palabra contiene al menos una letra especial."""
    return bool(LETRAS_ESPECIALES & set(palabra.upper()))


def main():
    print("\n=== Filtro de palabras Scrabble ===\n")
    print("Cargando archivos...")

    palabras_es = cargar_palabras(ARCHIVO_ESPAÑOL)
    palabras_en = cargar_palabras(ARCHIVO_INGLES)

    # Unir ambas listas eliminando duplicados (case-insensitive)
    todas = {}
    for palabra in palabras_es + palabras_en:
        todas[palabra.upper()] = palabra  # conserva el formato original

    print(f"\n  Total combinado (sin duplicados): {len(todas):,} palabras")

    # Filtrar
    filtradas = sorted(
        [p for p in todas.values() if contiene_letra_especial(p)],
        key=lambda w: w.upper()
    )

    print(f"  Palabras con K/W/X/Y/Z/J/Q/V:    {len(filtradas):,} palabras")

    # Guardar resultado
    with open(ARCHIVO_SALIDA, "w", encoding="utf-8") as f:
        f.write("\n".join(filtradas))

    print(f"\n✅ Archivo generado: '{ARCHIVO_SALIDA}' con {len(filtradas):,} palabras.\n")


if __name__ == "__main__":
    main()