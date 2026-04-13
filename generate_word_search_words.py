import json
import unicodedata

def remove_accents(word):
    return ''.join(
        c for c in unicodedata.normalize('NFD', word)
        if unicodedata.category(c) != 'Mn'
    )

input_file  = "Spanish_5-6-7letters_sorted.txt"
output_file = "public/word_search_words.json"

with open(input_file, "r", encoding="utf-8") as f:
    words = [line.strip() for line in f if line.strip()]

result = {5: [], 6: [], 7: []}
seen   = {5: set(), 6: set(), 7: set()}

for w in words:
    normalized = remove_accents(w.upper())
    l = len(normalized)
    if l in result and normalized not in seen[l]:
        # Only keep words with standard A-Z letters
        if all('A' <= c <= 'Z' for c in normalized):
            seen[l].add(normalized)
            result[l].append(normalized)

output = {str(l): result[l][:1000] for l in [5, 6, 7]}

with open(output_file, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False)

for l in [5, 6, 7]:
    print(f"{l}-letter words: {len(output[str(l)])}")

print(f"\nGuardado en: {output_file}")
