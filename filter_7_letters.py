import sys

input_file = "Spanish.txt"
output_file = "Spanish_7letters.txt"

with open(input_file, "r", encoding="utf-8") as f:
    all_words = [line.strip() for line in f if line.strip()]

seven_letter_words = [w for w in all_words if len(w) == 7]
removed = len(all_words) - len(seven_letter_words)

with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(seven_letter_words))

print(f"Total original:  {len(all_words):,}")
print(f"Palabras de 7:   {len(seven_letter_words):,}")
print(f"Eliminadas:      {removed:,}")
print(f"Archivo guardado: {output_file}")
