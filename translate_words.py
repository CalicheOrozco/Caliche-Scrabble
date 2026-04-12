import json
import time
import os
from deep_translator import GoogleTranslator

INPUT_FILE = "Spanish_7letters_sorted.txt"
OUTPUT_FILE = "words_translated.json"
PROGRESS_FILE = "translate_progress.json"
TOTAL_WORDS = 10_000
BATCH_SIZE = 50  # palabras por request

# Leer las primeras 10,000 palabras
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    words = [line.strip() for line in f if line.strip()][:TOTAL_WORDS]

print(f"Palabras a traducir: {len(words):,}")

# Cargar progreso previo si existe
if os.path.exists(PROGRESS_FILE):
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        results = json.load(f)
    already_done = {item["word"] for item in results}
    words = [w for w in words if w not in already_done]
    print(f"Retomando desde progreso anterior... faltan {len(words):,} palabras")
else:
    results = []

translator = GoogleTranslator(source="es", target="en")
total_batches = (len(words) + BATCH_SIZE - 1) // BATCH_SIZE

for i in range(0, len(words), BATCH_SIZE):
    batch = words[i:i + BATCH_SIZE]
    batch_num = i // BATCH_SIZE + 1

    try:
        # Unimos con salto de línea para traducir en un solo request
        combined = "\n".join(batch)
        translated = translator.translate(combined)
        translations = [t.strip() for t in translated.split("\n")]

        # Si la cantidad no coincide exactamente, rellenar con vacío
        while len(translations) < len(batch):
            translations.append("")

        for word, trans in zip(batch, translations):
            results.append({"word": word, "translate": trans.lower()})

        # Guardar progreso cada batch
        with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False)

        pct = (i + len(batch)) / TOTAL_WORDS * 100
        print(f"[{pct:5.1f}%] Batch {batch_num}/{total_batches} — {batch[0]} → {translations[0]}")

        time.sleep(0.3)  # pausa para no saturar la API

    except Exception as e:
        print(f"Error en batch {batch_num}: {e} — reintentando en 5s...")
        time.sleep(5)
        # Reintentar palabra por palabra
        for word in batch:
            try:
                trans = translator.translate(word)
                results.append({"word": word, "translate": trans.lower()})
            except Exception as e2:
                print(f"  Fallo '{word}': {e2}")
                results.append({"word": word, "translate": ""})
            time.sleep(0.5)

# Guardar resultado final
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

# Limpiar archivo de progreso
if os.path.exists(PROGRESS_FILE):
    os.remove(PROGRESS_FILE)

print(f"\nListo! {len(results):,} palabras guardadas en {OUTPUT_FILE}")
