from wordfreq import word_frequency

input_file = "Spanish_7letters.txt"
output_file = "Spanish_7letters_sorted.txt"

with open(input_file, "r", encoding="utf-8") as f:
    words = [line.strip() for line in f if line.strip()]

print(f"Ordenando {len(words):,} palabras por frecuencia...")

sorted_words = sorted(words, key=lambda w: word_frequency(w, "es"), reverse=True)

with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sorted_words))

# Muestra las 20 más y menos frecuentes
print("\nTop 20 más comunes:")
for w in sorted_words[:20]:
    print(f"  {w}  ({word_frequency(w, 'es'):.2e})")

print("\nTop 20 menos comunes (al final):")
for w in sorted_words[-20:]:
    print(f"  {w}  ({word_frequency(w, 'es'):.2e})")

print(f"\nArchivo guardado: {output_file}")
